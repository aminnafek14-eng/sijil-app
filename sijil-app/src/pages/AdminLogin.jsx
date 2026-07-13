import { useState } from 'react'
import { signIn } from '../lib/supabase'

export default function AdminLogin() {
  const [email, setEmail]     = useState('')
  const [pass, setPass]       = useState('')
  const [loading, setLoading] = useState(false)
  const [err, setErr]         = useState('')
  const [show, setShow]       = useState(false)

  async function handleLogin(e) {
    e.preventDefault()
    setErr(''); setLoading(true)
    const { error } = await signIn(email, pass)
    if (error) setErr('Emel atau kata laluan tidak tepat.')
    setLoading(false)
  }

  return (
    <div className="login-page">
      <div className="login-card">
        {/* Logo */}
        <div style={{ textAlign:'center', marginBottom:28 }}>
          <div style={{
            width:64, height:64, borderRadius:18,
            background:'linear-gradient(135deg,#1d4ed8,#3b82f6)',
            display:'flex', alignItems:'center', justifyContent:'center',
            fontSize:28, margin:'0 auto 14px', boxShadow:'0 4px 16px rgba(37,99,235,.35)'
          }}>🎓</div>
          <h1 style={{ fontSize:22, fontWeight:800, color:'#0f2d5e', marginBottom:4 }}>SijilOnline</h1>
          <p style={{ fontSize:13, color:'#94a3b8' }}>Panel Pentadbir Sistem</p>
        </div>

        <form onSubmit={handleLogin}>
          {err && (
            <div className="alert alert-err">
              <span>⚠️</span> {err}
            </div>
          )}
          <div className="field">
            <label>Emel</label>
            <input type="email" value={email}
              onChange={e=>setEmail(e.target.value)}
              placeholder="admin@contoh.my" required autoFocus />
          </div>
          <div className="field">
            <label>Kata Laluan</label>
            <div style={{ position:'relative' }}>
              <input type={show?'text':'password'} value={pass}
                onChange={e=>setPass(e.target.value)}
                placeholder="••••••••" required
                style={{ paddingRight:44 }} />
              <button type="button"
                onClick={()=>setShow(s=>!s)}
                style={{
                  position:'absolute', right:10, top:'50%', transform:'translateY(-50%)',
                  border:'none', background:'none', color:'#94a3b8', fontSize:16,
                  cursor:'pointer', padding:'0 4px',
                }}>
                {show ? '🙈' : '👁'}
              </button>
            </div>
          </div>
          <button type="submit" className="btn btn-primary btn-lg"
            disabled={loading} style={{ marginTop:8 }}>
            {loading
              ? <><span className="spinner" /> Mengesahkan…</>
              : 'Log Masuk →'}
          </button>
        </form>

        <p style={{ textAlign:'center', fontSize:12, color:'#94a3b8', marginTop:20 }}>
          Daftar akaun melalui Supabase Dashboard → Auth → Users
        </p>
      </div>
    </div>
  )
}
