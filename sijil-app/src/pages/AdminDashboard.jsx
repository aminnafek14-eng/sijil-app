import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getPrograms, createProgram, deleteProgram, signOut } from '../lib/supabase'

export default function AdminDashboard() {
  const [programs, setPrograms] = useState([])
  const [loading, setLoading]   = useState(true)
  const [showNew, setShowNew]   = useState(false)
  const [form, setForm]         = useState({ name:'', date:new Date().toISOString().split('T')[0], access_mode:'private' })
  const [saving, setSaving]     = useState(false)
  const [copied, setCopied]     = useState('')
  const navigate = useNavigate()

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data } = await getPrograms()
    setPrograms(data || [])
    setLoading(false)
  }

  async function handleCreate(e) {
    e.preventDefault(); setSaving(true)
    const { data, error } = await createProgram({ name:form.name, date:form.date, access_mode:form.access_mode })
    if (!error && data) navigate(`/admin/program/${data.id}`)
    setSaving(false)
  }

  function copyLink(url, key) {
    navigator.clipboard.writeText(url)
    setCopied(key); setTimeout(() => setCopied(''), 2000)
  }

  const base = window.location.origin
  const activeWithTemplate = programs.filter(p => p.template_url && p.is_active)

  return (
    <>
      <nav className="nav">
        <div style={{ width:34, height:34, borderRadius:10, background:'rgba(255,255,255,.15)',
          display:'flex', alignItems:'center', justifyContent:'center', fontSize:18 }}>🎓</div>
        <span className="nav-title">SijilOnline</span>
        <button className="btn btn-sm"
          style={{ color:'#fff', borderColor:'rgba(255,255,255,.3)', background:'rgba(255,255,255,.1)' }}
          onClick={async () => { await signOut(); navigate('/admin') }}>
          Log Keluar
        </button>
      </nav>

      <div className="page">
        {/* Welcome */}
        <div style={{ marginBottom:24 }}>
          <h1 style={{ fontSize:22, fontWeight:800, color:'#0f2d5e', marginBottom:4 }}>Dashboard</h1>
          <p style={{ fontSize:14, color:'#94a3b8' }}>Urus program dan jana sijil peserta</p>
        </div>

        {/* Stats */}
        <div className="stats">
          <div className="stat">
            <div className="stat-val">{programs.length}</div>
            <div className="stat-lbl">Jumlah Program</div>
          </div>
          <div className="stat">
            <div className="stat-val">{programs.filter(p=>p.access_mode==='public').length}</div>
            <div className="stat-lbl">🌐 Awam</div>
          </div>
          <div className="stat">
            <div className="stat-val">{programs.filter(p=>p.access_mode==='private').length}</div>
            <div className="stat-lbl">🔒 Terhad</div>
          </div>
        </div>

        {/* Program list */}
        <div className="card">
          <div style={{ display:'flex', alignItems:'center', marginBottom:18 }}>
            <div>
              <div className="card-title" style={{ margin:0 }}>Senarai Program</div>
            </div>
            <div style={{ flex:1 }} />
            <button className="btn btn-primary btn-sm" onClick={() => setShowNew(true)}>
              + Program Baharu
            </button>
          </div>

          {loading ? (
            <div style={{ textAlign:'center', padding:'32px 0', color:'#94a3b8' }}>
              <span className="spinner" style={{ borderTopColor:'#3b82f6', width:24, height:24, margin:'0 auto' }} />
              <p style={{ marginTop:10, fontSize:13 }}>Memuatkan…</p>
            </div>
          ) : programs.length === 0 ? (
            <div style={{ textAlign:'center', padding:'40px 0', color:'#94a3b8' }}>
              <div style={{ fontSize:40, marginBottom:10 }}>📋</div>
              <p style={{ fontSize:15, fontWeight:600, color:'#475569', marginBottom:6 }}>Tiada program lagi</p>
              <p style={{ fontSize:13 }}>Klik "Program Baharu" untuk mula</p>
            </div>
          ) : (
            <div className="tbl-wrap">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Nama Program</th>
                    <th>Tarikh</th>
                    <th className="hide-mobile">Mod</th>
                    <th>Template</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {programs.map(p => (
                    <tr key={p.id}>
                      <td>
                        <div style={{ fontWeight:600, fontSize:14 }}>{p.name}</div>
                      </td>
                      <td style={{ color:'#64748b', fontSize:13 }}>
                        {new Date(p.date).toLocaleDateString('ms-MY',{day:'numeric',month:'short',year:'numeric'})}
                      </td>
                      <td className="hide-mobile">
                        <span className={`badge ${p.access_mode==='public'?'badge-public':'badge-private'}`}>
                          {p.access_mode==='public'?'🌐 Awam':'🔒 Terhad'}
                        </span>
                      </td>
                      <td>
                        {p.template_url
                          ? <span className="badge badge-green">✓ Ada</span>
                          : <span className="badge badge-gray">Tiada</span>}
                      </td>
                      <td>
                        <div style={{ display:'flex', gap:6 }}>
                          <Link to={`/admin/program/${p.id}`} className="btn btn-sm btn-primary">Edit</Link>
                          <button className="btn btn-sm btn-danger"
                            onClick={async()=>{ if(!confirm(`Padam "${p.name}"?`)) return; await deleteProgram(p.id); load() }}>
                            Padam
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pautan */}
        {activeWithTemplate.length > 0 && (
          <div className="card">
            <div className="card-title">Pautan Untuk Dikongsi</div>
            {activeWithTemplate.map(p => {
              const link = `${base}/jana/${p.id}`
              const key  = `c-${p.id}`
              return (
                <div key={p.id} className="link-box">
                  <div className="link-box-header">
                    <span style={{ fontWeight:700, fontSize:14, flex:1, color:'#0f2d5e' }}>{p.name}</span>
                    <span className={`badge ${p.access_mode==='public'?'badge-public':'badge-private'}`}>
                      {p.access_mode==='public'?'🌐 Awam':'🔒 Terhad'}
                    </span>
                  </div>
                  <div className="link-url">
                    <code>{link}</code>
                    <button className={`btn btn-sm ${copied===key?'btn-success':'btn-primary'}`}
                      onClick={()=>copyLink(link,key)} style={{ flexShrink:0 }}>
                      {copied===key ? '✓ Disalin' : 'Salin'}
                    </button>
                  </div>
                  <p style={{ fontSize:11, color:'#94a3b8', marginTop:8 }}>
                    {p.access_mode==='public'
                      ? '🌐 Sesiapa boleh jana sijil. Nama & IC disimpan automatik.'
                      : '🔒 Hanya peserta berdaftar sahaja boleh jana sijil.'}
                  </p>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Modal */}
      {showNew && (
        <div className="overlay" onClick={e=>e.target===e.currentTarget&&setShowNew(false)}>
          <div className="modal">
            <div className="modal-title">✨ Program Baharu</div>
            <form onSubmit={handleCreate}>
              <div className="field">
                <label>Nama Program</label>
                <input type="text" value={form.name} required autoFocus
                  onChange={e=>setForm({...form,name:e.target.value})}
                  placeholder="cth: Bengkel STEM 2026" />
              </div>
              <div className="field">
                <label>Tarikh Program</label>
                <input type="date" value={form.date} required
                  onChange={e=>setForm({...form,date:e.target.value})} />
              </div>
              <div className="field">
                <label>Jenis Akses</label>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginTop:8 }}>
                  {[
                    ['private','🔒','Terhad','Hanya peserta berdaftar'],
                    ['public', '🌐','Awam',  'Sesiapa boleh jana'],
                  ].map(([val,icon,label,desc])=>(
                    <div key={val} className={`access-card ${form.access_mode===val?'selected':''}`}
                      onClick={()=>setForm({...form,access_mode:val})}>
                      <div style={{ fontSize:20, marginBottom:6 }}>{icon}</div>
                      <div style={{ fontWeight:700, fontSize:14, marginBottom:3 }}>{label}</div>
                      <div style={{ fontSize:12, color:'#94a3b8' }}>{desc}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ display:'flex', gap:10, marginTop:8 }}>
                <button type="submit" className="btn btn-primary" style={{ flex:1 }} disabled={saving}>
                  {saving?<><span className="spinner"/>Mencipta…</>:'Cipta & Edit →'}
                </button>
                <button type="button" className="btn" onClick={()=>setShowNew(false)}>Batal</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
