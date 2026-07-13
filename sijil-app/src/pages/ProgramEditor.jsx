import { useEffect, useRef, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  supabase, updateProgram, uploadTemplate,
  getRecipients, deleteRecipient, bulkAddRecipients,
  getTeachers, addTeacher, deleteTeacher,
} from '../lib/supabase'

const FONTS  = ['Georgia','Times New Roman','Arial','Verdana','Trebuchet MS','Palatino']
const COLORS = ['#1e3a5f','#ffffff','#000000','#1d4ed8','#7c2d12','#14532d','#d97706','#be185d']

function initials(name) {
  return name.split(' ').slice(0,2).map(w=>w[0]).join('').toUpperCase()
}

export default function ProgramEditor() {
  const { id } = useParams()
  const previewRef      = useRef(null)
  const previewWidthRef = useRef(600)

  const [program, setProgram] = useState(null)
  const [cfg, setCfg]         = useState({
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

  const [recipients, setRecipients]     = useState([])
  const [teachers, setTeachers]         = useState([])
  const [ticked, setTicked]             = useState(new Set())
  const [search, setSearch]             = useState('')
  const [addingBulk, setAddingBulk]     = useState(false)
  const [showAddTeacher, setShowAddTeacher] = useState(false)
  const [tForm, setTForm]               = useState({ full_name:'', ic_number:'', email:'', school:'' })
  const [savingTeacher, setSavingTeacher] = useState(false)

  useEffect(() => { loadProgram(); loadRecipients(); loadTeachers() }, [id])

  async function loadProgram() {
    const { data } = await supabase.from('programs').select('*').eq('id',id).single()
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
  async function loadRecipients() { const { data } = await getRecipients(id); setRecipients(data||[]) }
  async function loadTeachers()   { const { data } = await getTeachers();     setTeachers(data||[])   }

  async function handleFileUpload(file) {
    if (!file||!file.type.startsWith('image/')) { alert('Sila pilih PNG atau JPG.'); return }
    setUploading(true)
    try {
      const { uploadTemplate: ut } = await import('../lib/supabase')
      const url = await uploadTemplate(file, id)
      await updateProgram(id, { template_url: url })
      setProgram(prev => ({ ...prev, template_url: url }))
      alert('✓ Template berjaya dimuat naik!')
    } catch(e) { alert(e.message) }
    setUploading(false)
  }

  function handleDrop(e) {
    e.preventDefault(); setDrag(false)
    const file = e.dataTransfer?.files[0] ?? e.target.files[0]
    if (file) handleFileUpload(file)
  }

  async function handleSave() {
    setSaving(true)
    try { await updateProgram(id, cfg); setSaved(true); setTimeout(()=>setSaved(false), 2500) }
    catch(e) { alert('Gagal simpan: '+e.message) }
    setSaving(false)
  }

  async function toggleAccessMode() {
    const newMode = program.access_mode==='public' ? 'private' : 'public'
    const msg = newMode==='public'
      ? 'Tukar ke AWAM? Sesiapa dengan pautan boleh jana sijil.'
      : 'Tukar ke TERHAD? Hanya peserta berdaftar sahaja boleh jana sijil.'
    if (!confirm(msg)) return
    try {
      await updateProgram(id, { access_mode: newMode })
      setProgram(prev => ({ ...prev, access_mode: newMode }))
    } catch(e) { alert(e.message) }
  }

  function toggleTick(tid) {
    setTicked(prev => { const n=new Set(prev); n.has(tid)?n.delete(tid):n.add(tid); return n })
  }
  function tickAll(list) {
    setTicked(prev => { const n=new Set(prev); list.forEach(t=>n.add(t.id)); return n })
  }

  async function handleAddTicked() {
    if (!ticked.size) { alert('Pilih sekurang-kurangnya seorang guru.'); return }
    setAddingBulk(true)
    const ics = new Set(recipients.map(r=>r.ic_number))
    const rows = teachers.filter(t=>ticked.has(t.id)&&!ics.has(t.ic_number))
      .map(t=>({ program_id:id, full_name:t.full_name, ic_number:t.ic_number }))
    if (!rows.length) { alert('Semua guru yang dipilih sudah ada dalam program.'); setAddingBulk(false); return }
    const { error } = await bulkAddRecipients(rows)
    if (error) alert('Ralat: '+error.message)
    else { await loadRecipients(); setTicked(new Set()); alert(`✓ ${rows.length} guru ditambah!`) }
    setAddingBulk(false)
  }

  async function handleAddTeacher(e) {
    e.preventDefault(); setSavingTeacher(true)
    const { error } = await addTeacher(tForm)
    if (error) alert(error.message.includes('unique')?'No. IC sudah ada dalam bank guru.':error.message)
    else { setTForm({full_name:'',ic_number:'',email:'',school:''}); setShowAddTeacher(false); loadTeachers() }
    setSavingTeacher(false)
  }

  const recipientIcs     = new Set(recipients.map(r=>r.ic_number))
  const filteredTeachers = teachers.filter(t =>
    t.full_name.toLowerCase().includes(search.toLowerCase()) ||
    t.ic_number.includes(search) ||
    (t.school||'').toLowerCase().includes(search.toLowerCase())
  )

  if (!program) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', color:'#94a3b8', flexDirection:'column', gap:12 }}>
      <span className="spinner" style={{ borderTopColor:'#3b82f6', width:28, height:28, borderWidth:3 }} />
      <p style={{ fontSize:14 }}>Memuatkan…</p>
    </div>
  )

  const isPublic = program.access_mode === 'public'

  return (
    <>
      <nav className="nav">
        <Link to="/admin/dashboard" className="btn btn-sm"
          style={{ color:'rgba(255,255,255,.9)', borderColor:'rgba(255,255,255,.25)', background:'rgba(255,255,255,.1)', padding:'5px 10px' }}>
          ← Kembali
        </Link>
        <span className="nav-title" style={{ fontSize:13 }}>{program.name}</span>
        <button onClick={toggleAccessMode} className="btn btn-sm"
          style={{ background: isPublic?'rgba(16,185,129,.25)':'rgba(255,255,255,.1)',
            color:'#fff', borderColor: isPublic?'rgba(16,185,129,.5)':'rgba(255,255,255,.25)', marginRight:6 }}>
          {isPublic ? '🌐 Awam' : '🔒 Terhad'}
        </button>
        <button className="btn btn-sm" onClick={handleSave} disabled={saving}
          style={{ background:'rgba(255,255,255,.15)', color:'#fff', borderColor:'rgba(255,255,255,.3)' }}>
          {saving ? <><span className="spinner" />Menyimpan…</> : saved ? '✓ Disimpan' : '💾 Simpan'}
        </button>
      </nav>

      <div className="page">
        {/* Tab bar */}
        <div className="tab-bar">
          {[['template','🖼 Template & Kedudukan'],['teachers','👥 Bank Guru'],['recipients','📋 Peserta Program']].map(([k,l])=>(
            <button key={k} className={`tab-btn ${tab===k?'active':''}`} onClick={()=>setTab(k)}>{l}</button>
          ))}
        </div>

        {/* ── TEMPLATE TAB ── */}
        {tab==='template' && (
          <div className="grid2" style={{ alignItems:'start' }}>
            <div>
              <p style={{ fontSize:12, color:'#94a3b8', marginBottom:10 }}>
                💡 Klik pada pratonton untuk letak kedudukan nama
              </p>
              {/* CSS overlay preview */}
              <div ref={previewRef}
                onClick={e=>{
                  const r=e.currentTarget.getBoundingClientRect()
                  previewWidthRef.current=r.width
                  setCfg(c=>({...c,
                    name_x:Math.round(((e.clientX-r.left)/r.width)*100),
                    name_y:Math.round(((e.clientY-r.top)/r.height)*100),
                  }))
                }}
                style={{ position:'relative', width:'100%', paddingBottom:'70.75%',
                  background:'#e2e8f0', borderRadius:12, overflow:'hidden',
                  cursor:'crosshair', border:'1.5px solid #e2e8f0', boxShadow:'0 4px 16px rgba(0,0,0,.08)' }}>

                {program.template_url ? (
                  <img src={program.template_url} alt="template"
                    style={{ position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'contain' }} />
                ) : (
                  <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column',
                    alignItems:'center', justifyContent:'center', color:'#94a3b8', gap:8 }}>
                    <span style={{ fontSize:36 }}>🖼</span>
                    <span style={{ fontSize:13 }}>Muat naik template untuk pratonton</span>
                  </div>
                )}

                {program.template_url && (
                  <>
                    <div style={{ position:'absolute', left:`${cfg.name_x}%`, top:`${cfg.name_y}%`,
                      transform:'translate(-50%,-50%)', textAlign:'center', pointerEvents:'none', lineHeight:1.5 }}>
                      <div style={{ fontFamily:`"${cfg.name_font}",Georgia,serif`, fontSize:`${cfg.name_size}px`,
                        color:cfg.name_color, fontWeight:'bold', whiteSpace:'nowrap' }}>
                        {previewName.toUpperCase()}
                      </div>
                      {cfg.show_ic && (
                        <div style={{ fontFamily:`"${cfg.name_font}",Georgia,serif`, fontSize:`${cfg.ic_size}px`,
                          color:cfg.ic_color, fontWeight:'bold', whiteSpace:'nowrap' }}>
                          No. IC: 900215-01-1234
                        </div>
                      )}
                    </div>
                    <div style={{ position:'absolute', left:`${cfg.name_x}%`, top:`${cfg.name_y}%`,
                      transform:'translate(-50%,-50%)', width:10, height:10,
                      borderRadius:'50%', background:'rgba(239,68,68,.7)', pointerEvents:'none',
                      boxShadow:'0 0 0 3px rgba(239,68,68,.3)' }} />
                  </>
                )}
              </div>

              <div className="field" style={{ marginTop:14 }}>
                <label>Nama pratonton</label>
                <input type="text" value={previewName} onChange={e=>setPreviewName(e.target.value)} />
              </div>
            </div>

            <div>
              {/* Upload */}
              <div className="card">
                <div className="card-title">Template Sijil</div>
                <label className={`upload-zone ${drag?'drag':''}`}
                  onDragOver={e=>{e.preventDefault();setDrag(true)}}
                  onDragLeave={()=>setDrag(false)} onDrop={handleDrop}>
                  <input type="file" accept="image/png,image/jpeg" onChange={handleDrop} />
                  {uploading
                    ? <><span className="spinner" style={{ borderTopColor:'#3b82f6', width:24, height:24 }} /><span>Memuat naik…</span></>
                    : program.template_url
                      ? <><span style={{ fontSize:32 }}>✅</span><strong style={{ color:'#10b981' }}>Template sudah ada</strong><span style={{ fontSize:12 }}>Klik atau seret untuk tukar</span></>
                      : <><span style={{ fontSize:36 }}>📁</span><strong>Seret atau klik untuk muat naik</strong><span style={{ fontSize:12 }}>PNG atau JPG, maks 10MB</span></>
                  }
                </label>
              </div>

              {/* Kedudukan */}
              <div className="card">
                <div className="card-title">Kedudukan & Gaya Nama</div>
                {[
                  ['Mendatar (X)', 'name_x', 5, 95],
                  ['Menegak (Y)',  'name_y', 5, 95],
                  ['Saiz Nama',   'name_size', 12, 80],
                ].map(([label, key, min, max]) => (
                  <div className="field" key={key}>
                    <label>{label}: <strong>{cfg[key]}{key.includes('size')?'px':'%'}</strong></label>
                    <input type="range" min={min} max={max} value={cfg[key]}
                      style={{ width:'100%', accentColor:'#3b82f6' }}
                      onInput={e=>setCfg(c=>({...c,[key]:+e.target.value}))}
                      onChange={e=>setCfg(c=>({...c,[key]:+e.target.value}))} />
                  </div>
                ))}
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
                        style={{ background:col, border: col==='#ffffff'?'2px solid #e2e8f0':undefined }}
                        onClick={()=>setCfg(c=>({...c,name_color:col}))} />
                    ))}
                    <input type="color" value={cfg.name_color}
                      onChange={e=>setCfg(c=>({...c,name_color:e.target.value}))}
                      style={{ width:30, height:30, border:'none', borderRadius:'50%', cursor:'pointer', padding:0 }} />
                  </div>
                </div>
              </div>

              {/* IC settings */}
              <div className="card">
                <div className="card-title">No. IC di Sijil</div>
                <div className="field">
                  <label style={{ display:'flex', alignItems:'center', gap:10, cursor:'pointer' }}>
                    <input type="checkbox" checked={cfg.show_ic}
                      onChange={e=>setCfg(c=>({...c,show_ic:e.target.checked}))}
                      style={{ width:16, height:16, accentColor:'#3b82f6' }} />
                    Paparkan No. IC di bawah nama
                  </label>
                </div>
                {cfg.show_ic && (
                  <>
                    <div className="field">
                      <label>Saiz IC: <strong>{cfg.ic_size}px</strong></label>
                      <input type="range" min="8" max="40" value={cfg.ic_size}
                        style={{ width:'100%', accentColor:'#3b82f6' }}
                        onInput={e=>setCfg(c=>({...c,ic_size:+e.target.value}))}
                        onChange={e=>setCfg(c=>({...c,ic_size:+e.target.value}))} />
                    </div>
                    <div className="field">
                      <label>Warna IC</label>
                      <div className="color-swatches">
                        {COLORS.map(col=>(
                          <div key={col} className={`swatch ${cfg.ic_color===col?'active':''}`}
                            style={{ background:col, border:col==='#ffffff'?'2px solid #e2e8f0':undefined }}
                            onClick={()=>setCfg(c=>({...c,ic_color:col}))} />
                        ))}
                        <input type="color" value={cfg.ic_color}
                          onChange={e=>setCfg(c=>({...c,ic_color:e.target.value}))}
                          style={{ width:30, height:30, border:'none', borderRadius:'50%', cursor:'pointer', padding:0 }} />
                      </div>
                    </div>
                  </>
                )}
                <div className="alert alert-info" style={{ fontSize:12 }}>
                  💡 IC akan muncul automatik di bawah nama dengan jarak sesuai.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── GURU TAB ── */}
        {tab==='teachers' && (
          <div>
            <div className="card">
              <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16, flexWrap:'wrap' }}>
                <div>
                  <div className="card-title" style={{ margin:0 }}>Bank Data Guru</div>
                  <p style={{ fontSize:12, color:'#94a3b8', marginTop:2 }}>{teachers.length} guru dalam bank</p>
                </div>
                <div style={{ flex:1 }} />
                <button className="btn btn-primary btn-sm" onClick={()=>setShowAddTeacher(true)}>+ Tambah Guru</button>
              </div>

              <div style={{ display:'flex', gap:10, marginBottom:14, flexWrap:'wrap' }}>
                <input type="text" value={search} onChange={e=>setSearch(e.target.value)}
                  placeholder="Cari nama, IC atau sekolah…"
                  style={{ flex:1, minWidth:200 }} />
                <button className="btn btn-sm btn-primary" onClick={()=>tickAll(filteredTeachers)}>
                  Pilih Semua ({filteredTeachers.length})
                </button>
                <button className="btn btn-sm" onClick={()=>setTicked(new Set())}>Nyah Pilih</button>
              </div>

              {ticked.size > 0 && (
                <div className="alert alert-info" style={{ marginBottom:12, justifyContent:'space-between', alignItems:'center' }}>
                  <span>✓ {ticked.size} guru dipilih</span>
                  <button className="btn btn-sm btn-primary" onClick={handleAddTicked} disabled={addingBulk}>
                    {addingBulk ? <><span className="spinner"/>Menambah…</> : `Tambah ke Program →`}
                  </button>
                </div>
              )}

              <div style={{ maxHeight:400, overflowY:'auto', border:'1.5px solid #e2e8f0', borderRadius:10 }}>
                {filteredTeachers.length === 0 ? (
                  <div style={{ padding:32, textAlign:'center', color:'#94a3b8', fontSize:13 }}>
                    {search ? 'Tiada hasil carian.' : 'Tiada guru dalam bank. Tambah guru dulu!'}
                  </div>
                ) : filteredTeachers.map(t => {
                  const alreadyIn = recipientIcs.has(t.ic_number)
                  return (
                    <div key={t.id}
                      className={`teacher-item ${ticked.has(t.id)&&!alreadyIn?'selected':''}`}
                      style={{ opacity:alreadyIn?.6:1, cursor:alreadyIn?'default':'pointer' }}
                      onClick={()=>!alreadyIn&&toggleTick(t.id)}>
                      <input type="checkbox" checked={ticked.has(t.id)} disabled={alreadyIn}
                        onChange={()=>!alreadyIn&&toggleTick(t.id)}
                        style={{ width:16, height:16, accentColor:'#3b82f6', cursor:'pointer', flexShrink:0 }}
                        onClick={e=>e.stopPropagation()} />
                      <div className="teacher-avatar">{initials(t.full_name)}</div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontWeight:600, fontSize:14, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                          {t.full_name}
                        </div>
                        <div style={{ fontSize:12, color:'#94a3b8' }}>
                          {t.ic_number}{t.school&&` · ${t.school}`}
                        </div>
                      </div>
                      {alreadyIn && <span className="badge badge-green">✓ Dah masuk</span>}
                      <button className="btn btn-sm btn-danger"
                        onClick={async e=>{ e.stopPropagation(); if(!confirm(`Padam ${t.full_name}?`)) return; await deleteTeacher(t.id); loadTeachers() }}>
                        ✕
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* ── PESERTA TAB ── */}
        {tab==='recipients' && (
          <div className="card">
            <div style={{ display:'flex', alignItems:'center', marginBottom:16 }}>
              <div>
                <div className="card-title" style={{ margin:0 }}>Peserta Program Ini</div>
                <p style={{ fontSize:12, color:'#94a3b8', marginTop:2 }}>
                  {isPublic ? 'Peserta ditambah automatik bila jana sijil' : 'Peserta berdaftar sahaja'}
                </p>
              </div>
              <div style={{ flex:1 }} />
              <span className="badge badge-blue" style={{ fontSize:13, padding:'4px 12px' }}>
                {recipients.length} peserta
              </span>
            </div>

            {!isPublic && (
              <div className="alert alert-info" style={{ fontSize:12, marginBottom:14 }}>
                💡 Pergi ke tab <strong>Bank Guru</strong> untuk tambah peserta dengan tick.
              </div>
            )}

            {recipients.length===0 ? (
              <div style={{ textAlign:'center', padding:'32px 0', color:'#94a3b8' }}>
                <div style={{ fontSize:36, marginBottom:8 }}>👥</div>
                <p style={{ fontSize:14 }}>Belum ada peserta lagi.</p>
              </div>
            ) : (
              <div className="tbl-wrap">
                <table className="tbl">
                  <thead>
                    <tr><th>#</th><th>Nama Penuh</th><th>No. IC</th><th>Sijil</th><th></th></tr>
                  </thead>
                  <tbody>
                    {recipients.map((r,i)=>(
                      <tr key={r.id}>
                        <td style={{ color:'#94a3b8', fontSize:12 }}>{i+1}</td>
                        <td>
                          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                            <div className="teacher-avatar" style={{ width:28, height:28, fontSize:11 }}>
                              {initials(r.full_name)}
                            </div>
                            <span style={{ fontWeight:500 }}>{r.full_name}</span>
                          </div>
                        </td>
                        <td style={{ fontFamily:'monospace', fontSize:12, color:'#64748b' }}>{r.ic_number}</td>
                        <td>
                          {r.cert_generated
                            ? <span className="badge badge-green">✓ {new Date(r.generated_at).toLocaleDateString('ms-MY')}</span>
                            : <span className="badge badge-gray">Belum</span>}
                        </td>
                        <td>
                          <button className="btn btn-sm btn-danger"
                            onClick={async()=>{ if(!confirm(`Buang ${r.full_name}?`)) return; await deleteRecipient(r.id); loadRecipients() }}>
                            Buang
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal tambah guru */}
      {showAddTeacher && (
        <div className="overlay" onClick={e=>e.target===e.currentTarget&&setShowAddTeacher(false)}>
          <div className="modal">
            <div className="modal-title">👤 Tambah Guru ke Bank Data</div>
            <form onSubmit={handleAddTeacher}>
              {[
                ['full_name','Nama Penuh *','Ahmad Faris bin Ramli','text',true],
                ['ic_number','No. Kad Pengenalan *','900215-01-1234','text',true],
                ['email','Emel','guru@sekolah.edu.my','email',false],
                ['school','Sekolah','SK Taman Maju','text',false],
              ].map(([key,label,ph,type,req])=>(
                <div className="field" key={key}>
                  <label>{label}</label>
                  <input type={type} value={tForm[key]} required={req} placeholder={ph}
                    onChange={e=>setTForm({...tForm,[key]:e.target.value})}
                    autoFocus={key==='full_name'} />
                </div>
              ))}
              <div style={{ display:'flex', gap:10, marginTop:4 }}>
                <button type="submit" className="btn btn-primary" style={{ flex:1 }} disabled={savingTeacher}>
                  {savingTeacher?'Menyimpan…':'Simpan ke Bank'}
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
