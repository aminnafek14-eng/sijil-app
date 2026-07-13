import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { getPublicProgram, checkRecipient, markGenerated, generatePublicCert } from '../lib/supabase'
import { generateCertificatePDF, generateCertificatePreview, downloadBlob, openPdfInTab } from '../lib/certCanvas'

function formatIc(raw) {
  const d = raw.replace(/[^0-9]/g,'')
  if (d.length<=6) return d
  if (d.length<=8) return d.slice(0,6)+'-'+d.slice(6)
  return d.slice(0,6)+'-'+d.slice(6,8)+'-'+d.slice(8,12)
}
function validIc(ic) { return /^\d{6}-\d{2}-\d{4}$/.test(ic) }

export default function UserPortal() {
  const { programId } = useParams()
  const [prog, setProg]         = useState(null)
  const [loading, setLoading]   = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [name, setName]         = useState('')
  const [ic, setIc]             = useState('')
  const [status, setStatus]     = useState(null)
  const [errMsg, setErrMsg]     = useState('')
  const [pdfBlob, setPdfBlob]   = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [certName, setCertName] = useState('')
  const [pdfSize, setPdfSize]   = useState(0)

  useEffect(() => {
    if (!programId) { setNotFound(true); setLoading(false); return }
    getPublicProgram(programId).then(({ data, error }) => {
      if (error || !data) setNotFound(true)
      else setProg(data)
      setLoading(false)
    })
  }, [programId])

  const certOpts = (finalName, finalIc) => ({
    templateUrl: prog.template_url,
    name: finalName, ic: finalIc,
    nameX: prog.name_x??50, nameY: prog.name_y??55,
    nameSize: prog.name_size??36, nameColor: prog.name_color??'#1e3a5f',
    nameFont: prog.name_font??'Georgia',
    showIc: prog.show_ic??true, icSize: prog.ic_size??20,
    icColor: prog.ic_color??'#1e3a5f', previewWidth: 600,
  })

  async function handleSubmit(e) {
    e.preventDefault()
    setErrMsg(''); setPdfBlob(null); setPreviewUrl(null)
    if (!validIc(ic)) { setErrMsg('Format IC tidak betul. Contoh: 900215-01-1234'); return }
    setStatus('checking')
    let finalName = name.trim()

    if (prog.access_mode === 'private') {
      const { data, error } = await checkRecipient(programId, ic)
      if (error || !data?.length || !data[0].found) {
        setStatus('err'); setErrMsg('No. IC anda tidak dalam senarai peserta. Hubungi penganjur.'); return
      }
      finalName = data[0].full_name
      await markGenerated(programId, ic)
    } else {
      const { data, error } = await generatePublicCert(programId, finalName, ic)
      if (error || !data?.length || !data[0].success) {
        setStatus('err'); setErrMsg(data?.[0]?.message || 'Gagal memproses. Cuba semula.'); return
      }
      finalName = data[0].full_name
    }

    setStatus('generating')
    try {
      const opts = certOpts(finalName, ic)

      // Jana pratonton dan PDF serentak
      const [blob, preview] = await Promise.all([
        generateCertificatePDF(opts),
        generateCertificatePreview(opts),
      ])

      setPdfBlob(blob)
      setPdfSize(Math.round(blob.size / 1024))
      setPreviewUrl(preview)
      setCertName(finalName)
      setStatus('done')
    } catch(e) {
      setStatus('err'); setErrMsg('Gagal jana sijil: ' + e.message)
    }
  }

  function handleDownload() {
    const safe = certName.replace(/[^a-zA-Z0-9 ]/g,'').trim().replace(/ +/g,'_')
    downloadBlob(pdfBlob, `Sijil_${safe}.pdf`)
  }

  function reset() {
    setName(''); setIc(''); setStatus(null); setErrMsg('')
    setPdfBlob(null); setPreviewUrl(null); setCertName(''); setPdfSize(0)
  }

  if (loading) return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
      height:'100vh', gap:14 }}>
      <span className="spinner" style={{ borderTopColor:'#3b82f6', width:36, height:36, borderWidth:3 }} />
      <p style={{ fontSize:14, color:'#94a3b8' }}>Memuatkan…</p>
    </div>
  )

  if (notFound) return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
      height:'100vh', gap:14, textAlign:'center', padding:24 }}>
      <div style={{ fontSize:60 }}>🔗</div>
      <h2 style={{ fontSize:20, fontWeight:700, color:'#0f2d5e' }}>Pautan Tidak Sah</h2>
      <p style={{ fontSize:14, color:'#64748b', maxWidth:300 }}>
        Program tidak dijumpai atau pautan telah tamat tempoh.
      </p>
    </div>
  )

  const isPublic = prog.access_mode === 'public'
  const busy     = status === 'checking' || status === 'generating'

  return (
    <div style={{ minHeight:'100vh', background:'#f0f6ff' }}>

      {/* Hero */}
      <div className="portal-hero">
        <div className="portal-hero-content">
          <div style={{ display:'inline-flex', alignItems:'center', gap:6,
            background:'rgba(255,255,255,.15)', borderRadius:20, padding:'5px 14px',
            fontSize:12, fontWeight:600, marginBottom:16, border:'1px solid rgba(255,255,255,.2)' }}>
            {isPublic ? '🌐 Program Awam' : '🔒 Program Terhad'}
          </div>
          <h1 style={{ fontSize:'clamp(18px,4vw,26px)', fontWeight:800, margin:'0 0 8px', lineHeight:1.3 }}>
            {prog.name}
          </h1>
          <p style={{ fontSize:14, opacity:.8 }}>
            {new Date(prog.date).toLocaleDateString('ms-MY',{day:'numeric',month:'long',year:'numeric'})}
          </p>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth:500, margin:'0 auto', padding:'0 16px 60px' }}>

        {!pdfBlob ? (
          <div className="portal-card">
            {!prog.template_url ? (
              <div className="alert alert-warn">
                ⚠️ Template sijil belum disediakan. Sila hubungi penganjur.
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <h2 style={{ fontSize:17, fontWeight:700, color:'#0f2d5e', marginBottom:20 }}>
                  {isPublic ? '✏️ Masukkan Maklumat Anda' : '🔐 Sahkan Kehadiran Anda'}
                </h2>

                {isPublic && (
                  <div className="field">
                    <label>Nama Penuh</label>
                    <input type="text" value={name} required autoFocus
                      onChange={e=>setName(e.target.value)}
                      placeholder="Nama penuh seperti dalam IC" />
                  </div>
                )}

                <div className="field">
                  <label>No. Kad Pengenalan</label>
                  <input type="text" value={ic} required
                    onChange={e=>setIc(formatIc(e.target.value))}
                    placeholder="000000-00-0000" maxLength={14}
                    autoFocus={!isPublic}
                    style={{ fontSize:20, letterSpacing:'.1em', textAlign:'center',
                      fontFamily:"'SF Mono','Fira Mono',monospace", fontWeight:600 }} />
                  <div style={{ marginTop:6, fontSize:12, height:18 }}>
                    {ic.length>0 && !validIc(ic) && <span style={{ color:'#ef4444' }}>Format: 6 digit - 2 digit - 4 digit</span>}
                    {validIc(ic) && <span style={{ color:'#10b981' }}>✓ Format betul</span>}
                  </div>
                </div>

                {errMsg && (
                  <div className="alert alert-err">
                    <span>⚠️</span>
                    <span>{errMsg}</span>
                  </div>
                )}

                {busy && (
                  <div className="alert alert-info">
                    <span className="spinner" style={{ borderTopColor:'#2563eb', width:16, height:16 }} />
                    <span>{status==='checking' ? 'Mengesahkan maklumat…' : 'Menjana sijil PDF…'}</span>
                  </div>
                )}

                <button type="submit" className="btn btn-primary btn-lg" style={{ marginTop:8 }}
                  disabled={busy || !validIc(ic) || (isPublic && !name.trim())}>
                  {busy
                    ? <><span className="spinner"/>Sila tunggu…</>
                    : '📄 Jana Sijil PDF'}
                </button>

                <p style={{ fontSize:11, color:'#94a3b8', textAlign:'center', marginTop:12 }}>
                  {isPublic
                    ? '📝 Maklumat anda akan disimpan sebagai rekod penyertaan.'
                    : '🔒 Hanya peserta berdaftar sahaja boleh jana sijil.'}
                </p>
              </form>
            )}
          </div>
        ) : (
          /* Sijil berjaya */
          <div style={{ marginTop:20 }}>
            <div className="alert alert-ok" style={{ justifyContent:'center', fontWeight:600, marginBottom:20 }}>
              🎉 Tahniah! Sijil anda berjaya dijana.
            </div>

            {/* Pratonton sijil */}
            <div className="cert-preview-wrap" style={{ marginBottom:20 }}>
              <img src={previewUrl} alt="Pratonton Sijil"
                style={{ width:'100%', display:'block' }} />
            </div>

            {/* Info saiz PDF */}
            <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8,
              fontSize:12, color:'#64748b', marginBottom:16 }}>
              <span>📄 Fail PDF</span>
              <span style={{ background:'#dbeafe', color:'#1d4ed8', padding:'2px 8px',
                borderRadius:20, fontWeight:600, fontSize:11 }}>
                {pdfSize} KB {pdfSize <= 200 ? '✓' : '⚠️'}
              </span>
            </div>

            {/* Butang */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12 }}>
              <button className="btn btn-primary btn-lg" style={{ fontSize:14 }}
                onClick={handleDownload}>
                ⬇ Muat Turun PDF
              </button>
              <button className="btn btn-lg" style={{ fontSize:14, borderColor:'#bfdbfe', color:'#1d4ed8', background:'#eff6ff' }}
                onClick={() => openPdfInTab(pdfBlob)}>
                👁 Buka PDF
              </button>
            </div>

            <button className="btn" style={{ width:'100%', justifyContent:'center', color:'#64748b' }}
              onClick={reset}>
              ← Jana Sijil Lain
            </button>
          </div>
        )}

        <p style={{ textAlign:'center', fontSize:12, color:'#94a3b8', marginTop:28 }}>
          Ada masalah? Hubungi penganjur program ini.
        </p>
      </div>
    </div>
  )
}
