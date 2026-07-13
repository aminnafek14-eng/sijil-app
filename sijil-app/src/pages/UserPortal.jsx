import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase, checkRecipient, markGenerated } from '../lib/supabase'
import { generateCertificate, downloadBlob, printDataUrl, drawPreview } from '../lib/certCanvas'

export default function UserPortal() {
  const { programId } = useParams()
  const canvasRef = useRef(null)

  const [programs, setPrograms]   = useState([])
  const [selProg, setSelProg]     = useState(programId || '')
  const [progData, setProgData]   = useState(null)

  const [ic, setIc]               = useState('')
  const [status, setStatus]       = useState(null) // null | 'checking' | 'ok' | 'err'
  const [errMsg, setErrMsg]       = useState('')
  const [recipient, setRecipient] = useState(null)

  const [generating, setGenerating] = useState(false)
  const [certBlob, setCertBlob]     = useState(null)
  const [certDataUrl, setCertDataUrl] = useState(null)

  useEffect(() => {
    supabase.from('programs').select('*').eq('is_active', true).order('created_at', { ascending: false })
      .then(({ data }) => {
        setPrograms(data || [])
        if (!selProg && data?.length) setSelProg(data[0].id)
      })
  }, [])

  useEffect(() => {
    if (!selProg || !programs.length) return
    const p = programs.find(x => x.id === selProg)
    setProgData(p || null)
    setCertBlob(null); setCertDataUrl(null); setStatus(null); setRecipient(null)
  }, [selProg, programs])

  // Format IC: auto tambah '-' 
  function handleIcInput(e) {
    let v = e.target.value.replace(/[^0-9-]/g, '')
    // Auto format 6-2-4
    const digits = v.replace(/-/g,'')
    if (digits.length <= 6) v = digits
    else if (digits.length <= 8) v = digits.slice(0,6) + '-' + digits.slice(6)
    else v = digits.slice(0,6) + '-' + digits.slice(6,8) + '-' + digits.slice(8,12)
    setIc(v)
  }

  async function handleCheck(e) {
    e.preventDefault()
    setStatus('checking'); setErrMsg(''); setRecipient(null); setCertBlob(null)

    const { data, error } = await checkRecipient(selProg, ic)

    if (error || !data?.length) {
      setStatus('err'); setErrMsg('No. IC tidak dijumpai dalam senarai peserta program ini. Sila hubungi penganjur.')
      return
    }

    const rec = data[0]
    if (!rec.found) {
      setStatus('err'); setErrMsg('No. IC tidak dijumpai dalam senarai peserta program ini. Sila hubungi penganjur.')
      return
    }

    setRecipient(rec)
    setStatus('ok')
    await handleGenerate(rec)
  }

  async function handleGenerate(rec) {
    if (!progData?.template_url) {
      setErrMsg('Template sijil belum disediakan. Hubungi penganjur.'); setStatus('err'); return
    }
    setGenerating(true)
    try {
      const blob = await generateCertificate({
        templateUrl: progData.template_url,
        name:        rec.full_name,
        ic,
        nameX:        progData.name_x     ?? 50,
        nameY:        progData.name_y     ?? 55,
        nameSize:     progData.name_size  ?? 36,
        nameColor:    progData.name_color ?? '#1e3a5f',
        nameFont:     progData.name_font  ?? 'Georgia',
        showIc:       progData.show_ic    ?? true,
        icSize:       progData.ic_size    ?? 20,
        icColor:      progData.ic_color   ?? '#1e3a5f',
        previewWidth: 600,  // sama dengan lebar pratonton admin
        output:       'blob',
      })
      const url = URL.createObjectURL(blob)
      setCertBlob(blob)
      setCertDataUrl(url)

      // Tandakan dalam database
      await markGenerated(selProg, ic)
    } catch (e) {
      setErrMsg('Gagal jana sijil: ' + e.message)
      setStatus('err')
    }
    setGenerating(false)
  }

  function handleDownload() {
    if (!certBlob || !recipient) return
    const safeName = recipient.full_name.replace(/[^a-zA-Z0-9 ]/g, '').trim().replace(/ +/g, '_')
    downloadBlob(certBlob, `Sijil_${safeName}.png`)
  }

  function handlePrint() {
    if (!certDataUrl) return
    printDataUrl(certDataUrl, `Sijil — ${recipient?.full_name}`)
  }

  function reset() {
    setIc(''); setStatus(null); setErrMsg(''); setRecipient(null)
    setCertBlob(null); setCertDataUrl(null)
  }

  const prog = progData

  return (
    <div style={{ minHeight:'100vh', background:'linear-gradient(160deg, #f0f6ff 0%, #fff 60%)', paddingBottom:40 }}>
      {/* Header */}
      <div style={{ background:'var(--blue)', padding:'16px 20px', display:'flex', alignItems:'center', gap:10 }}>
        <span style={{ fontSize:22 }}>🎓</span>
        <div>
          <div style={{ color:'#fff', fontWeight:700, fontSize:15 }}>SijilOnline</div>
          <div style={{ color:'rgba(255,255,255,.6)', fontSize:12 }}>Portal Jana Sijil</div>
        </div>
      </div>

      <div style={{ maxWidth:520, margin:'0 auto', padding:'32px 16px' }}>

        {/* Pilih program — hanya tunjuk jika tiada programId dalam URL */}
        {!programId && programs.length > 1 && (
          <div className="field">
            <label style={{ fontSize:14, fontWeight:600 }}>Program</label>
            <select value={selProg} onChange={e => setSelProg(e.target.value)}>
              {programs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
        )}

        {prog && (
          <div style={{ textAlign:'center', marginBottom:28 }}>
            <div style={{ fontSize:13, color:'var(--gray-400)', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:4 }}>
              Sijil Untuk
            </div>
            <div style={{ fontSize:22, fontWeight:700, color:'var(--blue)', marginBottom:4 }}>{prog.name}</div>
            <div style={{ fontSize:13, color:'var(--gray-400)' }}>
              {new Date(prog.date).toLocaleDateString('ms-MY', { day:'numeric', month:'long', year:'numeric' })}
            </div>
          </div>
        )}

        {/* Form input */}
        {!certDataUrl && (
          <div className="card">
            <form onSubmit={handleCheck}>
              <div className="field">
                <label>No. Kad Pengenalan</label>
                <input
                  type="text" value={ic} onChange={handleIcInput}
                  placeholder="900215-01-1234"
                  maxLength={14} required autoFocus
                  style={{ fontSize:18, letterSpacing:'.04em', textAlign:'center' }}
                />
              </div>

              {status === 'err' && <div className="alert alert-err">{errMsg}</div>}

              {status === 'checking' && (
                <div className="alert alert-info">Menyemak kelayakan…</div>
              )}

              <button type="submit" className="btn btn-accent btn-lg"
                disabled={status==='checking' || generating || !selProg}>
                {generating
                  ? <><span className="spinner" /> Jana Sijil…</>
                  : status==='checking'
                    ? <><span className="spinner" /> Menyemak…</>
                    : '📜 Jana Sijil Saya'}
              </button>
            </form>
          </div>
        )}

        {/* Pratonton sijil */}
        {certDataUrl && recipient && (
          <div>
            <div className="alert alert-ok" style={{ textAlign:'center', fontSize:14, fontWeight:500 }}>
              ✓ Sijil berjaya dijana untuk <strong>{recipient.full_name}</strong>
            </div>

            <div style={{ borderRadius:12, overflow:'hidden', boxShadow:'0 4px 24px rgba(0,0,0,.12)', marginBottom:16 }}>
              <img src={certDataUrl} alt="Sijil" style={{ width:'100%', display:'block' }} />
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:10 }}>
              <button className="btn btn-primary" style={{ justifyContent:'center', padding:'11px' }}
                onClick={handleDownload}>
                ⬇ Muat Turun PNG
              </button>
              <button className="btn" style={{ justifyContent:'center', padding:'11px' }}
                onClick={handlePrint}>
                🖨 Cetak
              </button>
            </div>
            <button className="btn" style={{ width:'100%', justifyContent:'center' }} onClick={reset}>
              Jana sijil lain
            </button>
          </div>
        )}

        <p style={{ textAlign:'center', fontSize:12, color:'var(--gray-400)', marginTop:20 }}>
          Masalah? Hubungi penganjur program dengan menyertakan No. IC anda.
        </p>
      </div>
    </div>
  )
}
