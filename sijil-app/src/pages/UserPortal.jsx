import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import {
  getPublicProgram,
  checkRecipient, markGenerated,
  generatePublicCert,
} from '../lib/supabase'
import { generateCertificate, downloadBlob, printDataUrl } from '../lib/certCanvas'

// Format IC automatik: 900215-01-1234
function formatIc(raw) {
  const digits = raw.replace(/[^0-9]/g, '')
  if (digits.length <= 6)  return digits
  if (digits.length <= 8)  return digits.slice(0,6) + '-' + digits.slice(6)
  return digits.slice(0,6) + '-' + digits.slice(6,8) + '-' + digits.slice(8,12)
}

// Sahkan format IC
function validIc(ic) {
  return /^\d{6}-\d{2}-\d{4}$/.test(ic)
}

export default function UserPortal() {
  const { programId } = useParams()

  const [prog, setProg]           = useState(null)
  const [loading, setLoading]     = useState(true)
  const [notFound, setNotFound]   = useState(false)

  const [name, setName]           = useState('')
  const [ic, setIc]               = useState('')
  const [status, setStatus]       = useState(null) // null|'checking'|'generating'|'done'|'err'
  const [errMsg, setErrMsg]       = useState('')

  const [certBlob, setCertBlob]       = useState(null)
  const [certDataUrl, setCertDataUrl] = useState(null)
  const [certName, setCertName]       = useState('')

  useEffect(() => {
    if (!programId) { setNotFound(true); setLoading(false); return }
    getPublicProgram(programId).then(({ data, error }) => {
      if (error || !data) { setNotFound(true) }
      else { setProg(data) }
      setLoading(false)
    })
  }, [programId])

  function handleIcInput(e) {
    setIc(formatIc(e.target.value))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setErrMsg(''); setCertBlob(null); setCertDataUrl(null)

    // Validate IC format
    if (!validIc(ic)) {
      setErrMsg('Format No. IC tidak betul. Contoh: 900215-01-1234')
      return
    }

    setStatus('checking')

    let finalName = name.trim()

    if (prog.access_mode === 'private') {
      // Private: semak IC dalam senarai peserta
      const { data, error } = await checkRecipient(programId, ic)
      if (error || !data?.length || !data[0].found) {
        setStatus('err')
        setErrMsg('No. IC anda tidak dalam senarai peserta program ini. Sila hubungi penganjur.')
        return
      }
      // Guna nama dari database
      finalName = data[0].full_name
      await markGenerated(programId, ic)

    } else {
      // Public: simpan peserta secara automatik
      const { data, error } = await generatePublicCert(programId, finalName, ic)
      if (error || !data?.length || !data[0].success) {
        setStatus('err')
        setErrMsg((data?.[0]?.message) || 'Gagal memproses. Cuba semula.')
        return
      }
      // Guna nama yang disimpan (kalau IC dah pernah digunakan, guna nama asal)
      finalName = data[0].full_name
    }

    setStatus('generating')
    try {
      const blob = await generateCertificate({
        templateUrl:  prog.template_url,
        name:         finalName,
        ic,
        nameX:        prog.name_x     ?? 50,
        nameY:        prog.name_y     ?? 55,
        nameSize:     prog.name_size  ?? 36,
        nameColor:    prog.name_color ?? '#1e3a5f',
        nameFont:     prog.name_font  ?? 'Georgia',
        showIc:       prog.show_ic    ?? true,
        icSize:       prog.ic_size    ?? 20,
        icColor:      prog.ic_color   ?? '#1e3a5f',
        previewWidth: 600,
        output:       'blob',
      })
      const url = URL.createObjectURL(blob)
      setCertBlob(blob)
      setCertDataUrl(url)
      setCertName(finalName)
      setStatus('done')
    } catch(e) {
      setStatus('err')
      setErrMsg('Gagal jana sijil: ' + e.message)
    }
  }

  function handleDownload() {
    const safe = certName.replace(/[^a-zA-Z0-9 ]/g,'').trim().replace(/ +/g,'_')
    downloadBlob(certBlob, `Sijil_${safe}.png`)
  }

  function reset() {
    setName(''); setIc(''); setStatus(null); setErrMsg('')
    setCertBlob(null); setCertDataUrl(null); setCertName('')
  }

  // ── Loading ──
  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', color:'var(--gray-400)', fontSize:14 }}>
      Memuatkan…
    </div>
  )

  // ── Program tidak dijumpai ──
  if (notFound) return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
      height:'100vh', gap:12, color:'var(--gray-600)', textAlign:'center', padding:24 }}>
      <div style={{ fontSize:48 }}>🔗</div>
      <div style={{ fontSize:18, fontWeight:600 }}>Pautan Tidak Sah</div>
      <div style={{ fontSize:14 }}>Program tidak dijumpai atau pautan telah tamat tempoh.</div>
    </div>
  )

  const isPublic  = prog.access_mode === 'public'
  const hasTemplate = !!prog.template_url

  return (
    <div style={{ minHeight:'100vh', background:'linear-gradient(160deg,#f0f6ff 0%,#fff 60%)', paddingBottom:40 }}>
      {/* Header */}
      <div style={{ background:'var(--blue)', padding:'14px 20px', display:'flex', alignItems:'center', gap:10 }}>
        <span style={{ fontSize:22 }}>🎓</span>
        <div>
          <div style={{ color:'#fff', fontWeight:700, fontSize:15 }}>SijilOnline</div>
          <div style={{ color:'rgba(255,255,255,.6)', fontSize:12 }}>
            {isPublic ? '🌐 Akses Awam' : '🔒 Akses Terhad'}
          </div>
        </div>
      </div>

      <div style={{ maxWidth:500, margin:'0 auto', padding:'28px 16px' }}>

        {/* Maklumat program */}
        <div style={{ textAlign:'center', marginBottom:28 }}>
          <div style={{ fontSize:11, color:'var(--gray-400)', textTransform:'uppercase',
            letterSpacing:'.08em', marginBottom:6 }}>
            {isPublic ? '🌐 Program Awam' : '🔒 Program Terhad'}
          </div>
          <div style={{ fontSize:22, fontWeight:700, color:'var(--blue)', marginBottom:4 }}>{prog.name}</div>
          <div style={{ fontSize:13, color:'var(--gray-400)' }}>
            {new Date(prog.date).toLocaleDateString('ms-MY', { day:'numeric', month:'long', year:'numeric' })}
          </div>
        </div>

        {/* Amaran tiada template */}
        {!hasTemplate && (
          <div className="alert alert-err" style={{ textAlign:'center' }}>
            Template sijil belum disediakan. Sila hubungi penganjur program.
          </div>
        )}

        {/* Form input */}
        {!certDataUrl && hasTemplate && (
          <div className="card">
            <form onSubmit={handleSubmit}>

              {/* Nama — hanya untuk public */}
              {isPublic && (
                <div className="field">
                  <label>Nama Penuh</label>
                  <input type="text" value={name} required
                    onChange={e => setName(e.target.value)}
                    placeholder="Ahmad Faris bin Ramli"
                    autoFocus />
                </div>
              )}

              <div className="field">
                <label>No. Kad Pengenalan</label>
                <input type="text" value={ic} required
                  onChange={handleIcInput}
                  placeholder="900215-01-1234"
                  maxLength={14}
                  style={{ fontSize:17, letterSpacing:'.05em', textAlign:'center' }}
                  autoFocus={!isPublic} />
                {ic && !validIc(ic) && (
                  <div style={{ fontSize:12, color:'var(--red)', marginTop:4 }}>
                    Format: 6 digit - 2 digit - 4 digit (contoh: 900215-01-1234)
                  </div>
                )}
              </div>

              {errMsg && <div className="alert alert-err">{errMsg}</div>}

              {(status === 'checking' || status === 'generating') && (
                <div className="alert alert-info" style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <span className="spinner" style={{ borderTopColor:'var(--blue)', width:16, height:16 }} />
                  {status === 'checking' ? 'Mengesahkan maklumat…' : 'Menjana sijil…'}
                </div>
              )}

              <button type="submit" className="btn btn-accent btn-lg"
                disabled={status==='checking' || status==='generating' || !validIc(ic) || (isPublic && !name.trim())}>
                📜 Jana Sijil Saya
              </button>

              {isPublic && (
                <p style={{ fontSize:11, color:'var(--gray-400)', textAlign:'center', marginTop:10 }}>
                  Maklumat anda akan disimpan sebagai rekod penyertaan program ini.
                </p>
              )}
              {!isPublic && (
                <p style={{ fontSize:11, color:'var(--gray-400)', textAlign:'center', marginTop:10 }}>
                  Hanya peserta berdaftar yang boleh jana sijil ini.
                </p>
              )}
            </form>
          </div>
        )}

        {/* Pratonton sijil + butang muat turun */}
        {certDataUrl && (
          <div>
            <div className="alert alert-ok" style={{ textAlign:'center', fontWeight:500 }}>
              ✓ Sijil berjaya dijana untuk <strong>{certName}</strong>
            </div>

            <div style={{ borderRadius:12, overflow:'hidden',
              boxShadow:'0 4px 24px rgba(0,0,0,.12)', marginBottom:16 }}>
              <img src={certDataUrl} alt="Sijil" style={{ width:'100%', display:'block' }} />
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:10 }}>
              <button className="btn btn-primary" style={{ justifyContent:'center', padding:11 }}
                onClick={handleDownload}>
                ⬇ Muat Turun PNG
              </button>
              <button className="btn" style={{ justifyContent:'center', padding:11 }}
                onClick={() => printDataUrl(certDataUrl, `Sijil — ${certName}`)}>
                🖨 Cetak
              </button>
            </div>
            <button className="btn" style={{ width:'100%', justifyContent:'center' }} onClick={reset}>
              Jana sijil lain
            </button>
          </div>
        )}

        <p style={{ textAlign:'center', fontSize:12, color:'var(--gray-400)', marginTop:20 }}>
          Masalah? Hubungi penganjur program.
        </p>
      </div>
    </div>
  )
}
