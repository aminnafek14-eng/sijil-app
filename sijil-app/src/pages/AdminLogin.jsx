import { useState } from 'react'
import { signIn } from '../lib/supabase'

export default function AdminLogin() {
  const [email, setEmail]     = useState('')
  const [pass, setPass]       = useState('')
  const [loading, setLoading] = useState(false)
  const [err, setErr]         = useState('')

  async function handleLogin(e) {
    e.preventDefault()
    setErr('')
    setLoading(true)
    const { error } = await signIn(email, pass)
    if (error) setErr('Emel atau kata laluan tidak tepat.')
    setLoading(false)
  }

  return (
    <div className="page-sm">
      <div style={{ textAlign:'center', marginBottom:28 }}>
        <div style={{ fontSize:36, marginBottom:8 }}>🎓</div>
        <div style={{ fontSize:22, fontWeight:700, color:'var(--blue)' }}>SijilOnline</div>
        <div style={{ fontSize:13, color:'var(--gray-400)', marginTop:4 }}>Panel Pentadbir</div>
      </div>

      <div className="card">
        <form onSubmit={handleLogin}>
          {err && <div className="alert alert-err">{err}</div>}
          <div className="field">
            <label>Emel</label>
            <input type="email" value={email} onChange={e=>setEmail(e.target.value)}
              placeholder="admin@contoh.my" required autoFocus />
          </div>
          <div className="field">
            <label>Kata Laluan</label>
            <input type="password" value={pass} onChange={e=>setPass(e.target.value)}
              placeholder="••••••••" required />
          </div>
          <button type="submit" className="btn btn-primary btn-lg" disabled={loading}>
            {loading ? <><span className="spinner" /> Mengesahkan…</> : 'Log Masuk'}
          </button>
        </form>
      </div>

      <p style={{ textAlign:'center', fontSize:12, color:'var(--gray-400)', marginTop:12 }}>
        Untuk daftar akaun admin, gunakan Supabase Dashboard → Auth → Users
      </p>
    </div>
  )
}
