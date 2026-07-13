import { useEffect, useRef, useState, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  supabase, updateProgram, uploadTemplate,
  getRecipients, addRecipient, deleteRecipient, bulkAddRecipients,
} from '../lib/supabase'
import { drawPreview } from '../lib/certCanvas'

const FONTS   = ['Georgia', 'Times New Roman', 'Arial', 'Verdana', 'Trebuchet MS', 'Palatino']
const COLORS  = ['#1e3a5f','#7c2d12','#14532d','#1e1b4b','#000000','#ffffff','#d97706','#be185d']

export default function ProgramEditor() {
  const { id } = useParams()
  const canvasRef = useRef(null)

  const [program, setProgram] = useState(null)
  const [cfg, setCfg]         = useState({
    name_x: 50, name_y: 55, name_size: 36,
    name_color: '#1e3a5f', name_font: 'Georgia',
  })
  const [previewName, setPreviewName] = useState('AHMAD FARIS BIN RAMLI')
  const [drag, setDrag]     = useState(false)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved]   = useState(false)
  const [tab, setTab]       = useState('template') // 'template' | 'recipients'

  const [recipients, setRecipients] = useState([])
  const [newName, setNewName] = useState('')
  const [newIc, setNewIc]     = useState('')
  const [addingRec, setAddingRec] = useState(false)
  const [csvError, setCsvError]   = useState('')

  useEffect(() => {
    loadProgram()
    loadRecipients()
  }, [id])

  async function loadProgram() {
    const { data } = await supabase.from('programs').select('*').eq('id', id).single()
    if (data) {
      setProgram(data)
      setCfg({
        name_x:     data.name_x    ?? 50,
        name_y:     data.name_y    ?? 55,
        name_size:  data.name_size ?? 36,
        name_color: data.name_color ?? '#1e3a5f',
        name_font:  data.name_font  ?? 'Georgia',
      })
    }
  }

  async function loadRecipients() {
    const { data } = await getRecipients(id)
    setRecipients(data || [])
  }

  // Lukis pratonton bila cfg atau template berubah
  const redraw = useCallback(() => {
    if (!canvasRef.current) return
    drawPreview(canvasRef.current, {
      templateUrl: program?.template_url ?? null,
      name: previewName,
      ...cfg,
    })
  }, [program, cfg, previewName])

  useEffect(() => { redraw() }, [redraw])

  // ── Upload template ──────────────────────────────
  async function handleFileUpload(file) {
    if (!file || !file.type.startsWith('image/')) {
      alert('Sila pilih fail imej (PNG atau JPG).')
      return
    }
    setUploading(true)
    try {
      const url = await uploadTemplate(file, id)
      const { data } = await updateProgram(id, { template_url: url })
      setProgram(data)
    } catch (e) {
      alert('Gagal muat naik: ' + e.message)
    }
    setUploading(false)
  }

  function handleDropzone(e) {
    e.preventDefault()
    setDrag(false)
    const file = e.dataTransfer?.files[0] ?? e.target.files[0]
    if (file) handleFileUpload(file)
  }

  // ── Klik pada canvas untuk letak kedudukan nama ──
  function handleCanvasClick(e) {
    const rect = canvasRef.current.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width)  * 100
    const y = ((e.clientY - rect.top)  / rect.height) * 100
    setCfg(c => ({ ...c, name_x: Math.round(x), name_y: Math.round(y) }))
  }

  // ── Simpan tetapan program ───────────────────────
  async function handleSave() {
    setSaving(true)
    await updateProgram(id, cfg)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  // ── Tambah peserta seorang ───────────────────────
  async function handleAddRecipient(e) {
    e.preventDefault()
    if (!newName || !newIc) return
    setAddingRec(true)
    const { error } = await addRecipient({ program_id: id, full_name: newName, ic_number: newIc })
    if (error) alert('Ralat: ' + (error.message.includes('unique') ? 'No. IC sudah wujud dalam program ini.' : error.message))
    else { setNewName(''); setNewIc(''); loadRecipients() }
    setAddingRec(false)
  }

  // ── Muat naik CSV peserta ────────────────────────
  async function handleCsv(e) {
    const file = e.target.files[0]
    if (!file) return
    setCsvError('')
    const text = await file.text()
    const lines = text.trim().split('\n').slice(1) // skip header
    const rows = []
    const errors = []

    lines.forEach((line, i) => {
      const [name, ic] = line.split(',').map(s => s.trim().replace(/^"|"$/g, ''))
      if (!name || !ic) { errors.push(`Baris ${i+2}: format salah`); return }
      rows.push({ program_id: id, full_name: name, ic_number: ic })
    })

    if (errors.length) { setCsvError(errors.slice(0,3).join(', ')); return }

    const { error } = await bulkAddRecipients(rows)
    if (error) setCsvError('Ralat simpan: ' + error.message)
    else { loadRecipients(); alert(`${rows.length} peserta berjaya ditambah.`) }
    e.target.value = ''
  }

  if (!program) return <div style={{ padding:40, textAlign:'center', color:'var(--gray-400)' }}>Memuatkan…</div>

  return (
    <>
      <nav className="nav">
        <Link to="/admin/dashboard" className="btn btn-sm" style={{ color:'rgba(255,255,255,.8)', borderColor:'rgba(255,255,255,.3)', background:'transparent' }}>
          ← Kembali
        </Link>
        <span className="nav-title" style={{ fontSize:14 }}>{program.name}</span>
        <button className="btn btn-sm" style={{ background:'#fff', color:'var(--blue)' }}
          onClick={handleSave} disabled={saving}>
          {saving ? <><span className="spinner" style={{borderTopColor:'var(--blue)'}} /> Menyimpan…</>
            : saved ? '✓ Disimpan' : 'Simpan Tetapan'}
        </button>
      </nav>

      <div className="page">
        {/* Tab */}
        <div style={{ display:'flex', gap:4, marginBottom:20, borderBottom:'1px solid var(--gray-200)', paddingBottom:0 }}>
          {[['template','🖼 Template & Kedudukan'],['recipients','👥 Peserta']].map(([k,l]) => (
            <button key={k} onClick={() => setTab(k)}
              style={{ border:'none', background:'none', padding:'8px 16px', fontWeight:tab===k?600:400,
                color:tab===k?'var(--blue)':'var(--gray-600)',
                borderBottom:tab===k?'2px solid var(--blue)':'2px solid transparent',
                borderRadius:0, marginBottom:'-1px', fontSize:14 }}>
              {l}
            </button>
          ))}
        </div>

        {tab === 'template' && (
          <div className="grid2" style={{ alignItems:'start' }}>
            {/* Kiri: Pratonton canvas */}
            <div>
              <div className="card-title">Pratonton Sijil</div>
              <p style={{ fontSize:12, color:'var(--gray-400)', marginBottom:8 }}>
                Klik pada sijil untuk letak kedudukan nama
              </p>
              <div className="canvas-wrap" style={{ cursor:'crosshair' }}>
                <canvas ref={canvasRef} width={800} height={566}
                  onClick={handleCanvasClick}
                  style={{ display:'block', width:'100%', height:'auto' }} />
              </div>
              <div className="field" style={{ marginTop:12 }}>
                <label>Nama pratonton</label>
                <input type="text" value={previewName}
                  onChange={e => setPreviewName(e.target.value)}
                  placeholder="Nama untuk pratonton..." />
              </div>
            </div>

            {/* Kanan: Kawalan */}
            <div>
              {/* Upload template */}
              <div className="card">
                <div className="card-title">Template Sijil (PNG / JPG)</div>
                <label
                  className={`upload-zone ${drag ? 'drag' : ''}`}
                  onDragOver={e => { e.preventDefault(); setDrag(true) }}
                  onDragLeave={() => setDrag(false)}
                  onDrop={handleDropzone}>
                  <input type="file" accept="image/png,image/jpeg" onChange={handleDropzone} />
                  {uploading ? (
                    <><span className="spinner" style={{ borderTopColor:'var(--blue)', width:24, height:24 }} /><br />Memuat naik…</>
                  ) : program.template_url ? (
                    <>
                      <div style={{ fontSize:24, marginBottom:4 }}>✓</div>
                      <strong style={{ color:'var(--blue)', fontSize:13 }}>Template sudah ada</strong>
                      <div style={{ fontSize:12, marginTop:4 }}>Klik atau seret untuk tukar</div>
                    </>
                  ) : (
                    <>
                      <div style={{ fontSize:28, marginBottom:4 }}>📁</div>
                      <strong style={{ fontSize:13 }}>Seret atau klik untuk muat naik</strong>
                      <div style={{ fontSize:12, marginTop:4 }}>PNG atau JPG — saiz maks 10 MB</div>
                    </>
                  )}
                </label>
              </div>

              {/* Kedudukan & gaya */}
              <div className="card">
                <div className="card-title">Kedudukan & Gaya Nama</div>

                <div className="field">
                  <label>Kedudukan Mendatar (X): {cfg.name_x}%</label>
                  <div className="slider-group">
                    <span style={{ fontSize:12, color:'var(--gray-400)' }}>Kiri</span>
                    <input type="range" min="5" max="95" value={cfg.name_x}
                      onChange={e => setCfg(c=>({...c,name_x:+e.target.value}))} />
                    <span style={{ fontSize:12, color:'var(--gray-400)' }}>Kanan</span>
                  </div>
                </div>

                <div className="field">
                  <label>Kedudukan Menegak (Y): {cfg.name_y}%</label>
                  <div className="slider-group">
                    <span style={{ fontSize:12, color:'var(--gray-400)' }}>Atas</span>
                    <input type="range" min="5" max="95" value={cfg.name_y}
                      onChange={e => setCfg(c=>({...c,name_y:+e.target.value}))} />
                    <span style={{ fontSize:12, color:'var(--gray-400)' }}>Bawah</span>
                  </div>
                </div>

                <div className="field">
                  <label>Saiz Teks: {cfg.name_size}px</label>
                  <div className="slider-group">
                    <input type="range" min="12" max="80" value={cfg.name_size}
                      onChange={e => setCfg(c=>({...c,name_size:+e.target.value}))} />
                    <span className="slider-val">{cfg.name_size}</span>
                  </div>
                </div>

                <div className="field">
                  <label>Fon</label>
                  <select value={cfg.name_font}
                    onChange={e => setCfg(c=>({...c,name_font:e.target.value}))}>
                    {FONTS.map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                </div>

                <div className="field">
                  <label>Warna Teks</label>
                  <div className="color-swatches">
                    {COLORS.map(col => (
                      <div key={col} className={`swatch ${cfg.name_color===col?'active':''}`}
                        style={{ background:col, border:col==='#ffffff'?'2px solid var(--gray-300)':undefined }}
                        onClick={() => setCfg(c=>({...c,name_color:col}))} />
                    ))}
                    <input type="color" value={cfg.name_color}
                      onChange={e => setCfg(c=>({...c,name_color:e.target.value}))}
                      style={{ width:28, height:28, padding:0, border:'none', borderRadius:'50%', cursor:'pointer' }} />
                  </div>
                </div>

                <div className="alert alert-info" style={{ fontSize:12 }}>
                  💡 Tip: Klik terus pada pratonton sijil untuk letak kedudukan nama secara tepat.
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === 'recipients' && (
          <div>
            <div className="card">
              <div className="card-title">Tambah Peserta Seorang</div>
              <form onSubmit={handleAddRecipient}>
                <div className="grid2">
                  <div className="field" style={{ marginBottom:0 }}>
                    <label>Nama Penuh</label>
                    <input type="text" value={newName} required
                      onChange={e => setNewName(e.target.value)}
                      placeholder="Ahmad Faris bin Ramli" />
                  </div>
                  <div className="field" style={{ marginBottom:0 }}>
                    <label>No. Kad Pengenalan</label>
                    <input type="text" value={newIc} required
                      onChange={e => setNewIc(e.target.value)}
                      placeholder="900215-01-1234" />
                  </div>
                </div>
                <button type="submit" className="btn btn-primary" style={{ marginTop:10 }} disabled={addingRec}>
                  {addingRec ? 'Menambah…' : '+ Tambah Peserta'}
                </button>
              </form>
            </div>

            <div className="card">
              <div className="card-title">Muat Naik CSV (Ramai Sekaligus)</div>
              <p style={{ fontSize:13, color:'var(--gray-600)', marginBottom:10 }}>
                Format CSV: <code style={{ background:'var(--gray-100)', padding:'2px 6px', borderRadius:4 }}>nama,no_ic</code>
                &nbsp;(baris pertama = tajuk)
              </p>
              <label className="btn">
                📂 Pilih Fail CSV
                <input type="file" accept=".csv" onChange={handleCsv} style={{ display:'none' }} />
              </label>
              {csvError && <div className="alert alert-err" style={{ marginTop:10 }}>{csvError}</div>}
              <a href="data:text/csv;charset=utf-8,nama,no_ic%0AAhmad%20Faris,900215-01-1234"
                download="contoh-peserta.csv"
                style={{ fontSize:12, color:'var(--gray-400)', display:'block', marginTop:8 }}>
                Muat turun contoh CSV
              </a>
            </div>

            <div className="card">
              <div style={{ display:'flex', alignItems:'center', marginBottom:14 }}>
                <span className="card-title" style={{ margin:0, flex:1 }}>Senarai Peserta</span>
                <span className="badge badge-blue">{recipients.length} orang</span>
              </div>
              {recipients.length === 0 ? (
                <p style={{ fontSize:13, color:'var(--gray-400)', textAlign:'center', padding:'20px 0' }}>
                  Tiada peserta lagi. Tambah di atas.
                </p>
              ) : (
                <table className="tbl">
                  <thead>
                    <tr><th>Nama Penuh</th><th>No. IC</th><th>Sijil Jana</th><th></th></tr>
                  </thead>
                  <tbody>
                    {recipients.map(r => (
                      <tr key={r.id}>
                        <td>{r.full_name}</td>
                        <td style={{ fontFamily:'monospace', fontSize:13 }}>{r.ic_number}</td>
                        <td>
                          {r.cert_generated
                            ? <span className="badge badge-green">✓ {new Date(r.generated_at).toLocaleDateString('ms-MY')}</span>
                            : <span className="badge badge-gray">Belum</span>}
                        </td>
                        <td>
                          <button className="btn btn-sm btn-danger"
                            onClick={async () => {
                              if (!confirm(`Padam ${r.full_name}?`)) return
                              await deleteRecipient(r.id)
                              loadRecipients()
                            }}>Padam</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  )
}
