import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getPrograms, createProgram, deleteProgram, signOut } from '../lib/supabase'

export default function AdminDashboard() {
  const [programs, setPrograms] = useState([])
  const [loading, setLoading]   = useState(true)
  const [showNew, setShowNew]   = useState(false)
  const [form, setForm]         = useState({
    name: '', date: new Date().toISOString().split('T')[0], access_mode: 'private'
  })
  const [saving, setSaving]   = useState(false)
  const [copied, setCopied]   = useState('')
  const navigate = useNavigate()

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data } = await getPrograms()
    setPrograms(data || [])
    setLoading(false)
  }

  async function handleCreate(e) {
    e.preventDefault()
    setSaving(true)
    const { data, error } = await createProgram({
      name: form.name, date: form.date, access_mode: form.access_mode
    })
    if (!error && data) navigate(`/admin/program/${data.id}`)
    setSaving(false)
  }

  async function handleDelete(id, name) {
    if (!confirm(`Padam program "${name}"?`)) return
    await deleteProgram(id); load()
  }

  function copyLink(url, key) {
    navigator.clipboard.writeText(url)
    setCopied(key)
    setTimeout(() => setCopied(''), 2000)
  }

  const base = window.location.origin

  return (
    <>
      <nav className="nav">
        <span>🎓</span>
        <span className="nav-title">SijilOnline — Dashboard</span>
        <button className="btn btn-sm"
          style={{ color:'#fff', borderColor:'rgba(255,255,255,.3)', background:'transparent' }}
          onClick={async () => { await signOut(); navigate('/admin') }}>
          Log Keluar
        </button>
      </nav>

      <div className="page">
        {/* Stat */}
        <div className="stats">
          <div className="stat">
            <div className="stat-val">{programs.length}</div>
            <div className="stat-lbl">Program</div>
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

        {/* Senarai program */}
        <div className="card">
          <div style={{ display:'flex', alignItems:'center', marginBottom:16 }}>
            <span className="card-title" style={{ margin:0, flex:1 }}>Senarai Program</span>
            <button className="btn btn-primary btn-sm" onClick={() => setShowNew(true)}>
              + Program Baharu
            </button>
          </div>

          {loading ? (
            <p style={{ color:'var(--gray-400)', fontSize:13 }}>Memuatkan…</p>
          ) : programs.length === 0 ? (
            <div style={{ textAlign:'center', padding:'32px 0', color:'var(--gray-400)' }}>
              <div style={{ fontSize:32, marginBottom:8 }}>📋</div>
              <p style={{ fontSize:14 }}>Tiada program lagi. Cipta yang pertama!</p>
            </div>
          ) : (
            <table className="tbl">
              <thead>
                <tr><th>Nama Program</th><th>Tarikh</th><th>Mod</th><th>Template</th><th></th></tr>
              </thead>
              <tbody>
                {programs.map(p => (
                  <tr key={p.id}>
                    <td style={{ fontWeight:500 }}>{p.name}</td>
                    <td style={{ color:'var(--gray-600)', fontSize:13 }}>
                      {new Date(p.date).toLocaleDateString('ms-MY',{day:'numeric',month:'short',year:'numeric'})}
                    </td>
                    <td>
                      <span className={`badge ${p.access_mode==='public' ? 'badge-blue' : 'badge-gray'}`}>
                        {p.access_mode === 'public' ? '🌐 Awam' : '🔒 Terhad'}
                      </span>
                    </td>
                    <td>
                      {p.template_url
                        ? <span className="badge badge-green">✓ Ada</span>
                        : <span className="badge badge-gray">Tiada</span>}
                    </td>
                    <td>
                      <div style={{ display:'flex', gap:6 }}>
                        <Link to={`/admin/program/${p.id}`} className="btn btn-sm">Edit</Link>
                        <button className="btn btn-sm btn-danger" onClick={() => handleDelete(p.id, p.name)}>Padam</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pautan program */}
        <div className="card">
          <div className="card-title">Pautan Untuk Dikongsi</div>
          <p style={{ fontSize:13, color:'var(--gray-600)', marginBottom:14 }}>
            Kongsi pautan ini kepada peserta mengikut jenis program.
          </p>

          {programs.filter(p => p.template_url && p.is_active).length === 0 && (
            <p style={{ fontSize:13, color:'var(--gray-400)' }}>
              Tiada program aktif dengan template lagi.
            </p>
          )}

          {programs.filter(p => p.template_url && p.is_active).map(p => {
            const link = `${base}/jana/${p.id}`
            const keyC = `copy-${p.id}`
            return (
              <div key={p.id} style={{ marginBottom:16, padding:'14px 16px',
                border:'1px solid var(--gray-200)', borderRadius:10, background:'var(--gray-50)' }}>

                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
                  <span style={{ fontWeight:600, fontSize:14, flex:1 }}>{p.name}</span>
                  <span className={`badge ${p.access_mode==='public'?'badge-blue':'badge-gray'}`}>
                    {p.access_mode === 'public' ? '🌐 Awam' : '🔒 Terhad'}
                  </span>
                </div>

                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <code style={{ flex:1, fontSize:12, background:'#fff', padding:'6px 10px',
                    borderRadius:6, border:'1px solid var(--gray-200)', color:'var(--gray-600)',
                    overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                    {link}
                  </code>
                  <button className="btn btn-sm btn-primary"
                    onClick={() => copyLink(link, keyC)}>
                    {copied === keyC ? '✓ Disalin' : 'Salin'}
                  </button>
                </div>

                {p.access_mode === 'public' && (
                  <p style={{ fontSize:11, color:'var(--gray-400)', marginTop:6 }}>
                    Sesiapa boleh jana sijil. Nama dan IC peserta akan disimpan secara automatik.
                  </p>
                )}
                {p.access_mode === 'private' && (
                  <p style={{ fontSize:11, color:'var(--gray-400)', marginTop:6 }}>
                    Hanya peserta dalam senarai (tab Guru) sahaja yang boleh jana sijil.
                  </p>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Modal: Program baharu */}
      {showNew && (
        <div className="overlay" onClick={e => e.target===e.currentTarget && setShowNew(false)}>
          <div className="modal">
            <div className="modal-title">Program Baharu</div>
            <form onSubmit={handleCreate}>
              <div className="field">
                <label>Nama Program</label>
                <input type="text" value={form.name} required autoFocus
                  onChange={e => setForm({...form, name:e.target.value})}
                  placeholder="cth: Bengkel STEM 2026" />
              </div>
              <div className="field">
                <label>Tarikh</label>
                <input type="date" value={form.date} required
                  onChange={e => setForm({...form, date:e.target.value})} />
              </div>
              <div className="field">
                <label>Jenis Akses</label>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginTop:6 }}>
                  {[
                    ['private','🔒 Terhad','Hanya peserta berdaftar'],
                    ['public', '🌐 Awam',  'Sesiapa boleh jana'],
                  ].map(([val, label, desc]) => (
                    <div key={val}
                      onClick={() => setForm({...form, access_mode:val})}
                      style={{
                        border: `2px solid ${form.access_mode===val ? 'var(--blue)' : 'var(--gray-200)'}`,
                        borderRadius:10, padding:'12px 14px', cursor:'pointer',
                        background: form.access_mode===val ? 'var(--blue-lt)' : '#fff',
                      }}>
                      <div style={{ fontWeight:600, fontSize:14, marginBottom:4 }}>{label}</div>
                      <div style={{ fontSize:12, color:'var(--gray-400)' }}>{desc}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ display:'flex', gap:8, marginTop:4 }}>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Mencipta…' : 'Cipta & Edit'}
                </button>
                <button type="button" className="btn" onClick={() => setShowNew(false)}>Batal</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
