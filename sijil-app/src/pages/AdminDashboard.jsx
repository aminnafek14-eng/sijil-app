import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getPrograms, createProgram, deleteProgram, signOut } from '../lib/supabase'

export default function AdminDashboard() {
  const [programs, setPrograms] = useState([])
  const [loading, setLoading]   = useState(true)
  const [showNew, setShowNew]   = useState(false)
  const [form, setForm]         = useState({ name:'', date: new Date().toISOString().split('T')[0] })
  const [saving, setSaving]     = useState(false)
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
    const { data, error } = await createProgram({ name: form.name, date: form.date })
    if (!error && data) {
      navigate(`/admin/program/${data.id}`)
    }
    setSaving(false)
  }

  async function handleDelete(id, name) {
    if (!confirm(`Padam program "${name}"? Semua peserta turut dipadam.`)) return
    await deleteProgram(id)
    load()
  }

  const totalCert = programs.reduce((s) => s, 0) // boleh kira dari recipients nanti

  return (
    <>
      <nav className="nav">
        <span>🎓</span>
        <span className="nav-title">SijilOnline — Dashboard</span>
        <button className="btn btn-sm" style={{ color:'#fff', borderColor:'rgba(255,255,255,.3)', background:'transparent' }}
          onClick={async () => { await signOut(); navigate('/admin') }}>
          Log Keluar
        </button>
      </nav>

      <div className="page">
        <div className="stats">
          <div className="stat">
            <div className="stat-val">{programs.length}</div>
            <div className="stat-lbl">Program</div>
          </div>
          <div className="stat">
            <div className="stat-val">{programs.filter(p=>p.is_active).length}</div>
            <div className="stat-lbl">Aktif</div>
          </div>
          <div className="stat">
            <div className="stat-val">{programs.filter(p=>p.template_url).length}</div>
            <div className="stat-lbl">Ada Template</div>
          </div>
        </div>

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
                <tr>
                  <th>Nama Program</th>
                  <th>Tarikh</th>
                  <th>Template</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {programs.map(p => (
                  <tr key={p.id}>
                    <td style={{ fontWeight:500 }}>{p.name}</td>
                    <td style={{ color:'var(--gray-600)' }}>
                      {new Date(p.date).toLocaleDateString('ms-MY', { day:'numeric', month:'long', year:'numeric' })}
                    </td>
                    <td>
                      {p.template_url
                        ? <span className="badge badge-green">✓ Ada</span>
                        : <span className="badge badge-gray">Tiada</span>}
                    </td>
                    <td>
                      <span className={`badge ${p.is_active ? 'badge-blue' : 'badge-gray'}`}>
                        {p.is_active ? 'Aktif' : 'Tutup'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display:'flex', gap:6 }}>
                        <Link to={`/admin/program/${p.id}`} className="btn btn-sm">Edit</Link>
                        <button className="btn btn-sm btn-danger"
                          onClick={() => handleDelete(p.id, p.name)}>Padam</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pautan untuk dikongsi */}
        <div className="card">
          <div className="card-title">Pautan Portal Pengguna</div>
          <p style={{ fontSize:13, color:'var(--gray-600)', marginBottom:10 }}>
            Kongsi pautan ini kepada peserta. Mereka boleh jana sijil sendiri.
          </p>
          {programs.filter(p=>p.is_active&&p.template_url).map(p => (
            <div key={p.id} className="row-item">
              <span style={{ flex:1, fontSize:13, fontWeight:500 }}>{p.name}</span>
              <code style={{ fontSize:12, background:'var(--gray-100)', padding:'3px 8px', borderRadius:4, color:'var(--gray-600)' }}>
                {window.location.origin}/jana/{p.id}
              </code>
              <button className="btn btn-sm" onClick={() => {
                navigator.clipboard.writeText(`${window.location.origin}/jana/${p.id}`)
                alert('Pautan disalin!')
              }}>Salin</button>
            </div>
          ))}
          {programs.filter(p=>p.is_active&&p.template_url).length === 0 && (
            <p style={{ fontSize:13, color:'var(--gray-400)' }}>Tiada program aktif dengan template lagi.</p>
          )}
        </div>
      </div>

      {/* Modal: Tambah Program */}
      {showNew && (
        <div className="overlay" onClick={e => e.target===e.currentTarget && setShowNew(false)}>
          <div className="modal">
            <div className="modal-title">Program Baharu</div>
            <form onSubmit={handleCreate}>
              <div className="field">
                <label>Nama Program</label>
                <input type="text" value={form.name} required
                  onChange={e => setForm({...form, name:e.target.value})}
                  placeholder="cth: Hari Anugerah Cemerlang 2026" autoFocus />
              </div>
              <div className="field">
                <label>Tarikh Program</label>
                <input type="date" value={form.date} required
                  onChange={e => setForm({...form, date:e.target.value})} />
              </div>
              <div style={{ display:'flex', gap:8, marginTop:4 }}>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? <><span className="spinner" /> Mencipta…</> : 'Cipta & Edit'}
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
