'use client'
import { useState } from 'react'
import { supabase } from './supabase'

export default function Home() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async () => {
    setLoading(true)
    setError('')
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError('البريد أو كلمة المرور غلط: ' + error.message)
    } else {
      window.location.href = '/dashboard'
    }
    setLoading(false)
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#080c14',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'Cairo, sans-serif',
      direction: 'rtl'
    }}>
      <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap" rel="stylesheet" />
      
      <div style={{
        background: '#0d1521',
        border: '1px solid #1a2a3f',
        borderRadius: '16px',
        padding: '40px',
        width: '100%',
        maxWidth: '400px',
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            width: '60px', height: '60px',
            background: 'linear-gradient(135deg, #00d4ff, #0066ff)',
            borderRadius: '16px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '28px',
            margin: '0 auto 16px',
            boxShadow: '0 0 30px rgba(0,212,255,0.3)'
          }}>🚛</div>
          <h1 style={{ color: '#e8f4ff', fontSize: '22px', fontWeight: '700', margin: 0 }}>أسطولي</h1>
          <p style={{ color: '#4a6a8a', fontSize: '13px', marginTop: '6px' }}>نظام إدارة المركبات</p>
        </div>

        {/* Form */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ color: '#e8f4ff', fontSize: '13px', display: 'block', marginBottom: '8px' }}>البريد الإلكتروني</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="example@email.com"
              style={{
                width: '100%',
                padding: '12px 16px',
                background: '#111c2d',
                border: '1px solid #1a2a3f',
                borderRadius: '10px',
                color: '#e8f4ff',
                fontSize: '14px',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div>
            <label style={{ color: '#e8f4ff', fontSize: '13px', display: 'block', marginBottom: '8px' }}>كلمة المرور</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              style={{
                width: '100%',
                padding: '12px 16px',
                background: '#111c2d',
                border: '1px solid #1a2a3f',
                borderRadius: '10px',
                color: '#e8f4ff',
                fontSize: '14px',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {error && (
            <div style={{
              background: 'rgba(255,59,92,0.1)',
              border: '1px solid rgba(255,59,92,0.3)',
              borderRadius: '8px',
              padding: '10px 14px',
              color: '#ff3b5c',
              fontSize: '13px'
            }}>{error}</div>
          )}

          <button
            onClick={handleLogin}
            disabled={loading}
            style={{
              background: '#00d4ff',
              color: '#080c14',
              border: 'none',
              borderRadius: '10px',
              padding: '14px',
              fontSize: '15px',
              fontWeight: '700',
              fontFamily: 'Cairo, sans-serif',
              cursor: 'pointer',
              marginTop: '8px'
            }}
          >
            {loading ? 'جاري الدخول...' : 'تسجيل الدخول'}
          </button>
        </div>
      </div>
    </div>
  )
}
