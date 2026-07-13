import { useEffect, useRef, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  supabase, updateProgram, uploadTemplate,
  getRecipients, addRecipient, deleteRecipient, bulkAddRecipients,
  getTeachers, addTeacher, deleteTeacher, updateTeacher,
} from '../lib/supabase'
// certCanvas digunakan untuk jana sijil sebenar (bukan pratonton)

const FONTS  = ['Georgia','Times New Roman','Arial','Verdana','Trebuchet MS','Palatino']
const COLORS = ['#1e3a5f','#7c2d12','#14532d','#1e1b4b','#000000','#ffffff','#d97706','#be185d']

export default function ProgramEditor() {
  const { id } = useParams()
  const canvasRef = useRef(null)

  const [program, setProgram]   = useState(null)
  const [cfg, setCfg]           = useState({
    name_x:50, name_y:55, name_size:36,
    name_color:'#1e3a5f', name_font:'Georgia',
    show_ic:true, ic_size:20, ic_color:'#1e3a5f',
  })
  const [previewName, setPreviewName] = useState('AHMAD FARIS BIN RAMLI')
  const [uploading, setUploading]     = useState(false)
  const [saving, setSaving]           = useState(false)
  const [saved, setSaved]             = useState(false)
  const [drag, setDrag]               = useState(false)
  const [tab, setTab]                 = useState('template')

  // Recipients (untuk program ini)
  const [recipients, setRecipients] = useState([])

  // Bank guru
  const [teachers, setTeachers]     = useState([])
  const [ticked, setTicked]         = useState(new Set())
  const [search, setSearch]         = useState('')
  const [addingBulk, setAddingBulk] = useState(false)

  // Form tambah guru baru ke bank
  const [showAddTeacher, setShowAddTeacher] = useState(false)
  const [tForm, setTForm] = useState({ full_name:'', ic_number:'', email:'', school:'' })
  const [savingTeacher, setSavingTeacher]   = useState(false)

  useEffect(() => { loadProgram(); loadRecipients(); loadTeachers() }, [id])

  async function loadProgram() {
    const { data } = await supabase.from('programs').select('*').eq('id', id).single()
    if (data) {
      setProgram(data)
      setCfg({
        name_x:     data.name_x     ?? 50,
        name_y:     data.name_y     ?? 55,
        name_size:  data.name_size  ?? 36,
        name_color: data.name_color ?? '#1e3a5f',
        name_font:  data.name_font  ?? 'Georgia',
        show_ic:    data.show_ic    ?? true,
        ic_size:    data.ic_size    ?? 20,
        ic_color:   data.ic_color   ?? '#1e3a5f',
      })
    }
  }

  async function loadRecipients() {
    const { data } = await getRecipients(id)
    setRecipients(data || [])
  }

  async function loadTeachers() {
    const { data } = await getTeachers()
    setTeachers(data || [])
  }

  // Upload template
  async function handleFileUpload(file) {
    if (!file || !file.type.startsWith('image/')) { alert('Sila pilih PNG atau JPG.'); return }
    setUploading(true)
    try {
      const url = await uploadTemplate(file, id)
      const { data } = await updateProgram(id, { template_url: url })
      setProgram(data)
    } catch(e) { alert('Gagal muat naik: ' + e.message) }
    setUploading(false)
  }

  function handleDrop(e) {
    e.preventDefault(); setDrag(false)
    const file = e.dataTransfer?.files[0] ?? e.target.files[0]
    if (file) handleFileUpload(file)
  }

  // Klik canvas untuk letak kedudukan nama
  function handleCanvasClick(e) {
    const rect = canvasRef.current.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width)  * 100
    const y = ((e.clientY - rect.top)  / rect.height) * 100
    setCfg(c => ({ ...c, name_x: Math.round(x), name_y: Math.round(y) }))
  }

  // Simpan tetapan
  async function handleSave() {
    setSaving(true)
    await updateProgram(id, cfg)
    setSaving(false); setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  // ── TICK guru ────────────────────────────────────────────────
  function toggleTick(teacherId) {
    setTicked(prev => {
      const next = new Set(prev)
      next.has(teacherId) ? next.delete(teacherId) : next.add(teacherId)
      return next
    })
  }

  function tickAll(filtered) {
    setTicked(prev => {
      const next = new Set(prev)
      filtered.forEach(t => next.add(t.id))
      return next
    })
  }

  function untickAll() { setTicked(new Set()) }

  // Semak guru mana dah ada dalam program ini
  const recipientIcs = new Set(recipients.map(r => r.ic_number))

  // Tambah guru yang di-tick ke program
  async function handleAddTicked() {
    if (ticked.size === 0) { alert('Pilih sekurang-kurangnya seorang guru.'); return }
    setAddingBulk(true)

    const toAdd = teachers
      .filter(t => ticked.has(t.id) && !recipientIcs.has(t.ic_number))
      .map(t => ({ program_id: id, full_name: t.full_name, ic_number: t.ic_number }))

    if (toAdd.length === 0) {
      alert('Semua guru yang dipilih sudah ada dalam program ini.')
      setAddingBulk(false); return
    }

    const { error } = await bulkAddRecipients(toAdd)
    if (error) alert('Ralat: ' + error.message)
    else {
      await loadRecipients()
      setTicked(new Set())
      alert(`${toAdd.length} guru berjaya ditambah ke program ini.`)
    }
    setAddingBulk(false)
  }

  // Tambah guru baharu ke bank
  async function handleAddTeacher(e) {
    e.preventDefault()
    setSavingTeacher(true)
    const { error } = await addTeacher(tForm)
    if (error) alert(error.message.includes('unique') ? 'No. IC sudah ada dalam bank guru.' : error.message)
    else { setTForm({ full_name:'', ic_number:'', email:'', school:'' }); setShowAddTeacher(false); loadTeachers() }
    setSavingTeacher(false)
  }

  const filteredTeachers = teachers.filter(t =>
    t.full_name.toLowerCase().includes(search.toLowerCase()) ||
    t.ic_number.includes(search) ||
    (t.school || '').toLowerCase().includes(search.toLowerCase())
  )

  if (!program) return <div style={{ padding:40, textAlign:'center', color:'var(--gray-400)' }}>Memuatkan…</div>

  return (
    <>
      <nav className="nav">
        <Link to="/admin/dashboard" className="btn btn-sm"
          style={{ color:'rgba(255,255,255,.8)', borderColor:'rgba(255,255,255,.3)', background:'transparent' }}>
          ← Kembali
        </Link>
        <span className="nav-title" style={{ fontSize:14 }}>{program.name}</span>
        <button className="btn btn-sm" style={{ background:'#fff', color:'var(--blue)' }}
          onClick={handleSave} disabled={saving}>
          {saving ? <><span className="spinner" style={{ borderTopColor:'var(--blue)' }} /> Menyimpan…</>
            : saved ? '✓ Disimpan' : 'Simpan Tetapan'}
        </button>
      </nav>

      <div className="page">
        {/* Tab */}
        <div style={{ display:'flex', gap:4, marginBottom:20, borderBottom:'1px solid var(--gray-200)' }}>
          {[['template','🖼 Template'],['teachers','👥 Guru'],['recipients','📋 Peserta Program']].map(([k,l]) => (
            <button key={k} onClick={() => setTab(k)}
              style={{ border:'none', background:'none', padding:'8px 16px',
                fontWeight: tab===k ? 600 : 400,
                color: tab===k ? 'var(--blue)' : 'var(--gray-600)',
                borderBottom: tab===k ? '2px solid var(--blue)' : '2px solid transparent',
                borderRadius:0, marginBottom:'-1px', fontSize:14 }}>
              {l}
            </button>
          ))}
        </div>

        {/* ── TAB: TEMPLATE ── */}
        {tab === 'template' && (
          <div className="grid2" style={{ alignItems:'start' }}>
            <div>
              <div className="card-title">Pratonton Sijil</div>
              <p style={{ fontSize:12, color:'var(--gray-400)', marginBottom:8 }}>
                Klik pada sijil untuk letak kedudukan nama
              </p>

              {/* CSS overlay preview — update masa nyata, tiada CORS */}
              <div
                ref={canvasRef}
                onClick={e => {
                  const rect = e.currentTarget.getBoundingClientRect()
                  const x = Math.round(((e.clientX - rect.left) / rect.width)  * 100)
                  const y = Math.round(((e.clientY - rect.top)  / rect.height) * 100)
                  setCfg(c => ({ ...c, name_x: x, name_y: y }))
                }}
                style={{
                  position: 'relative',
                  width: '100%',
                  paddingBottom: '70.75%', // nisbah A4 landscape
                  background: '#e2e8f0',
                  borderRadius: 8,
                  overflow: 'hidden',
                  cursor: 'crosshair',
                  border: '1px solid var(--gray-200)',
                }}>

                {/* Gambar template */}
                {program.template_url ? (
                  <img src={program.template_url} alt="template"
                    style={{ position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'contain' }} />
                ) : (
                  <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center',
                    justifyContent:'center', color:'var(--gray-400)', fontSize:13, flexDirection:'column', gap:6 }}>
                    <span style={{fontSize:28}}>📄</span>
                    Muat naik template untuk pratonton
                  </div>
                )}

                {/* Overlay nama — kedudukan ikut cfg */}
                {program.template_url && (
                  <div style={{
                    position: 'absolute',
                    left: `${cfg.name_x}%`,
                    top:  `${cfg.name_y}%`,
                    transform: 'translate(-50%, -50%)',
                    textAlign: 'center',
                    pointerEvents: 'none',
                    lineHeight: 1.3,
                  }}>
                    <div style={{
                      fontFamily: `"${cfg.name_font}", Georgia, serif`,
                      fontSize: `${cfg.name_size * 0.55}px`,
                      color: cfg.name_color,
                      fontWeight: 'bold',
                      textShadow: '0 1px 3px rgba(0,0,0,0.15)',
                      whiteSpace: 'nowrap',
                    }}>
                      {previewName.toUpperCase()}
                    </div>
                    {cfg.show_ic && (
                      <div style={{
                        fontFamily: `"${cfg.name_font}", Georgia, serif`,
                        fontSize: `${cfg.ic_size * 0.55}px`,
                        color: cfg.ic_color,
                        textShadow: '0 1px 2px rgba(0,0,0,0.1)',
                        whiteSpace: 'nowrap',
                        marginTop: 2,
                      }}>
                        No. IC: 900215-01-1234
                      </div>
                    )}
                  </div>
                )}

                {/* Crosshair marker */}
                {program.template_url && (
                  <div style={{
                    position: 'absolute',
                    left: `${cfg.name_x}%`,
                    top:  `${cfg.name_y}%`,
                    transform: 'translate(-50%, -50%)',
                    width: 8, height: 8,
                    borderRadius: '50%',
                    background: 'rgba(201,100,66,0.6)',
                    pointerEvents: 'none',
                  }} />
                )}
              </div>

              <div className="field" style={{ marginTop:12 }}>
                <label>Nama pratonton</label>
                <input type="text" value={previewName}
                  onChange={e => setPreviewName(e.target.value)} />
              </div>
            </div>

            <div>
              {/* Upload */}
              <div className="card">
                <div className="card-title">Template Sijil (PNG / JPG)</div>
                <label className={`upload-zone ${drag?'drag':''}`}
                  onDragOver={e=>{e.preventDefault();setDrag(true)}}
                  onDragLeave={()=>setDrag(false)}
                  onDrop={handleDrop}>
                  <input type="file" accept="image/png,image/jpeg" onChange={handleDrop} />
                  {uploading ? <><span className="spinner" style={{borderTopColor:'var(--blue)',width:24,height:24}}/><br/>Memuat naik…</>
                    : program.template_url
                      ? <><div style={{fontSize:24}}>✓</div><strong style={{color:'var(--blue)',fontSize:13}}>Template sudah ada</strong><div style={{fontSize:12,marginTop:4}}>Klik atau seret untuk tukar</div></>
                      : <><div style={{fontSize:28}}>📁</div><strong style={{fontSize:13}}>Seret atau klik untuk muat naik</strong><div style={{fontSize:12,marginTop:4}}>PNG atau JPG</div></>}
                </label>
              </div>

              {/* Kedudukan nama */}
              <div className="card">
                <div className="card-title">Kedudukan & Gaya Nama</div>
                <div className="field">
                  <label>Kedudukan Mendatar (X): {cfg.name_x}%</label>
                  <div className="slider-group">
                    <span style={{fontSize:12,color:'var(--gray-400)'}}>Kiri</span>
                    <input type="range" min="5" max="95" value={cfg.name_x}
                      onInput={e=>setCfg(c=>({...c,name_x:+e.target.value}))}
                      onChange={e=>setCfg(c=>({...c,name_x:+e.target.value}))} />
                    <span style={{fontSize:12,color:'var(--gray-400)'}}>Kanan</span>
                  </div>
                </div>
                <div className="field">
                  <label>Kedudukan Menegak (Y): {cfg.name_y}%</label>
                  <div className="slider-group">
                    <span style={{fontSize:12,color:'var(--gray-400)'}}>Atas</span>
                    <input type="range" min="5" max="95" value={cfg.name_y}
                      onInput={e=>setCfg(c=>({...c,name_y:+e.target.value}))}
                      onChange={e=>setCfg(c=>({...c,name_y:+e.target.value}))} />
                    <span style={{fontSize:12,color:'var(--gray-400)'}}>Bawah</span>
                  </div>
                </div>
                <div className="field">
                  <label>Saiz Nama: {cfg.name_size}px</label>
                  <input type="range" min="12" max="80" value={cfg.name_size}
                    onInput={e=>setCfg(c=>({...c,name_size:+e.target.value}))}
                    onChange={e=>setCfg(c=>({...c,name_size:+e.target.value}))} />
                </div>
                <div className="field">
                  <label>Fon</label>
                  <select value={cfg.name_font} onChange={e=>setCfg(c=>({...c,name_font:e.target.value}))}>
                    {FONTS.map(f=><option key={f} value={f}>{f}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label>Warna Nama</label>
                  <div className="color-swatches">
                    {COLORS.map(col=>(
                      <div key={col} className={`swatch ${cfg.name_color===col?'active':''}`}
                        style={{background:col,border:col==='#ffffff'?'2px solid var(--gray-300)':undefined}}
                        onClick={()=>setCfg(c=>({...c,name_color:col}))} />
                    ))}
                    <input type="color" value={cfg.name_color}
                      onChange={e=>setCfg(c=>({...c,name_color:e.target.value}))}
                      style={{width:28,height:28,padding:0,border:'none',borderRadius:'50%',cursor:'pointer'}} />
                  </div>
                </div>
              </div>

              {/* Tetapan IC */}
              <div className="card">
                <div className="card-title">No. IC di Sijil</div>
                <div className="field">
                  <label style={{display:'flex',alignItems:'center',gap:8,cursor:'pointer'}}>
                    <input type="checkbox" checked={cfg.show_ic}
                      onChange={e=>setCfg(c=>({...c,show_ic:e.target.checked}))}
                      style={{width:16,height:16}} />
                    Paparkan No. IC di bawah nama
                  </label>
                </div>
                {cfg.show_ic && <>
                  <div className="field">
                    <label>Saiz IC: {cfg.ic_size}px</label>
                    <input type="range" min="8" max="40" value={cfg.ic_size}
                      onInput={e=>setCfg(c=>({...c,ic_size:+e.target.value}))}
                      onChange={e=>setCfg(c=>({...c,ic_size:+e.target.value}))} />
                  </div>
                  <div className="field">
                    <label>Warna IC</label>
                    <div className="color-swatches">
                      {COLORS.map(col=>(
                        <div key={col} className={`swatch ${cfg.ic_color===col?'active':''}`}
                          style={{background:col,border:col==='#ffffff'?'2px solid var(--gray-300)':undefined}}
                          onClick={()=>setCfg(c=>({...c,ic_color:col}))} />
                      ))}
                      <input type="color" value={cfg.ic_color}
                        onChange={e=>setCfg(c=>({...c,ic_color:e.target.value}))}
                        style={{width:28,height:28,padding:0,border:'none',borderRadius:'50%',cursor:'pointer'}} />
                    </div>
                  </div>
                </>}
                <div className="alert alert-info" style={{fontSize:12}}>
                  💡 IC akan muncul automatik di bawah nama dengan jarak yang sesuai.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── TAB: GURU (bank) ── */}
        {tab === 'teachers' && (
          <div>
            {/* Header + carian */}
            <div className="card">
              <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:14}}>
                <span className="card-title" style={{margin:0,flex:1}}>Bank Data Guru</span>
                <span className="badge badge-blue">{teachers.length} guru</span>
                <button className="btn btn-primary btn-sm" onClick={()=>setShowAddTeacher(true)}>
                  + Tambah Guru
                </button>
              </div>

              <input type="text" value={search} onChange={e=>setSearch(e.target.value)}
                placeholder="Cari nama, IC, atau sekolah…"
                style={{marginBottom:12}} />

              {/* Butang tick semua / nyah-tick */}
              <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:10}}>
                <button className="btn btn-sm" onClick={()=>tickAll(filteredTeachers)}>
                  Pilih Semua ({filteredTeachers.length})
                </button>
                <button className="btn btn-sm" onClick={untickAll}>Nyah Pilih</button>
                {ticked.size > 0 && (
                  <span style={{fontSize:13,color:'var(--blue)',fontWeight:500}}>
                    {ticked.size} dipilih
                  </span>
                )}
              </div>

              {/* Senarai guru dengan checkbox */}
              <div style={{maxHeight:380,overflowY:'auto',border:'1px solid var(--gray-200)',borderRadius:8}}>
                {filteredTeachers.length === 0 ? (
                  <div style={{padding:24,textAlign:'center',color:'var(--gray-400)',fontSize:13}}>
                    {search ? 'Tiada hasil carian.' : 'Tiada guru dalam bank. Tambah dulu!'}
                  </div>
                ) : filteredTeachers.map(t => {
                  const alreadyIn = recipientIcs.has(t.ic_number)
                  return (
                    <div key={t.id} className="row-item" style={{padding:'10px 14px',
                      background: ticked.has(t.id) ? 'var(--blue-lt)' : 'transparent',
                      cursor: alreadyIn ? 'default' : 'pointer',
                      opacity: alreadyIn ? 0.5 : 1}}
                      onClick={()=>!alreadyIn && toggleTick(t.id)}>
                      <input type="checkbox" checked={ticked.has(t.id)}
                        disabled={alreadyIn}
                        onChange={()=>!alreadyIn && toggleTick(t.id)}
                        style={{width:16,height:16,cursor:'pointer'}}
                        onClick={e=>e.stopPropagation()} />
                      <div style={{flex:1,marginLeft:10}}>
                        <div style={{fontSize:14,fontWeight:500}}>{t.full_name}</div>
                        <div style={{fontSize:12,color:'var(--gray-400)'}}>
                          {t.ic_number}
                          {t.school && <> · {t.school}</>}
                        </div>
                      </div>
                      {alreadyIn && <span className="badge badge-green">Dah masuk</span>}
                      <button className="btn btn-sm btn-danger"
                        style={{marginLeft:6}}
                        onClick={async e=>{
                          e.stopPropagation()
                          if(!confirm(`Padam ${t.full_name} dari bank guru?`)) return
                          await deleteTeacher(t.id); loadTeachers()
                        }}>✕</button>
                    </div>
                  )
                })}
              </div>

              {/* Butang tambah ke program */}
              <div style={{marginTop:14,display:'flex',alignItems:'center',gap:10}}>
                <button className="btn btn-accent" onClick={handleAddTicked} disabled={addingBulk||ticked.size===0}>
                  {addingBulk
                    ? <><span className="spinner"/>Menambah…</>
                    : `✓ Tambah ${ticked.size > 0 ? ticked.size : ''} Guru ke Program Ini`}
                </button>
                <span style={{fontSize:12,color:'var(--gray-400)'}}>
                  Guru bertanda "Dah masuk" sudah ada dalam program ini.
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ── TAB: PESERTA PROGRAM ── */}
        {tab === 'recipients' && (
          <div className="card">
            <div style={{display:'flex',alignItems:'center',marginBottom:14}}>
              <span className="card-title" style={{margin:0,flex:1}}>Peserta Program Ini</span>
              <span className="badge badge-blue">{recipients.length} orang</span>
            </div>
            <div className="alert alert-info" style={{fontSize:12,marginBottom:12}}>
              💡 Untuk tambah peserta, pergi ke tab <strong>Guru</strong> → tick → Tambah ke Program.
            </div>
            {recipients.length === 0 ? (
              <p style={{fontSize:13,color:'var(--gray-400)',textAlign:'center',padding:'20px 0'}}>
                Belum ada peserta. Pergi ke tab Guru untuk tambah.
              </p>
            ) : (
              <table className="tbl">
                <thead>
                  <tr><th>#</th><th>Nama Penuh</th><th>No. IC</th><th>Sijil Jana</th><th></th></tr>
                </thead>
                <tbody>
                  {recipients.map((r,i) => (
                    <tr key={r.id}>
                      <td style={{color:'var(--gray-400)',fontSize:12}}>{i+1}</td>
                      <td style={{fontWeight:500}}>{r.full_name}</td>
                      <td style={{fontFamily:'monospace',fontSize:13}}>{r.ic_number}</td>
                      <td>
                        {r.cert_generated
                          ? <span className="badge badge-green">✓ {new Date(r.generated_at).toLocaleDateString('ms-MY')}</span>
                          : <span className="badge badge-gray">Belum</span>}
                      </td>
                      <td>
                        <button className="btn btn-sm btn-danger"
                          onClick={async()=>{
                            if(!confirm(`Buang ${r.full_name} dari program ini?`)) return
                            await deleteRecipient(r.id); loadRecipients()
                          }}>Buang</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {/* Modal: Tambah Guru ke Bank */}
      {showAddTeacher && (
        <div className="overlay" onClick={e=>e.target===e.currentTarget&&setShowAddTeacher(false)}>
          <div className="modal">
            <div className="modal-title">Tambah Guru ke Bank Data</div>
            <form onSubmit={handleAddTeacher}>
              <div className="field">
                <label>Nama Penuh *</label>
                <input type="text" value={tForm.full_name} required
                  onChange={e=>setTForm({...tForm,full_name:e.target.value})}
                  placeholder="Ahmad Faris bin Ramli" autoFocus />
              </div>
              <div className="field">
                <label>No. Kad Pengenalan *</label>
                <input type="text" value={tForm.ic_number} required
                  onChange={e=>setTForm({...tForm,ic_number:e.target.value})}
                  placeholder="900215-01-1234" />
              </div>
              <div className="field">
                <label>Emel</label>
                <input type="email" value={tForm.email}
                  onChange={e=>setTForm({...tForm,email:e.target.value})}
                  placeholder="guru@sekolah.edu.my" />
              </div>
              <div className="field">
                <label>Sekolah</label>
                <input type="text" value={tForm.school}
                  onChange={e=>setTForm({...tForm,school:e.target.value})}
                  placeholder="SK Taman Maju" />
              </div>
              <div style={{display:'flex',gap:8,marginTop:4}}>
                <button type="submit" className="btn btn-primary" disabled={savingTeacher}>
                  {savingTeacher ? 'Menyimpan…' : 'Simpan ke Bank'}
                </button>
                <button type="button" className="btn" onClick={()=>setShowAddTeacher(false)}>Batal</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
