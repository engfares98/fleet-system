'use client'
import { useState, useEffect } from 'react'
import { supabase } from './supabase'

export default function Home() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [isInvite, setIsInvite] = useState(false)
  const [inviteMsg, setInviteMsg] = useState('')

  useEffect(() => {
    // تحقق من وجود invite token في الـ URL hash
    const hash = window.location.hash
    const params = new URLSearchParams(hash.replace('#', '?'))
    const type = params.get('type')
    const accessToken = params.get('access_token')

    if ((type === 'invite' || type === 'recovery') && accessToken) {
      setIsInvite(true)
      setInviteMsg('تم التحقق من الدعوة — اختر كلمة مرور جديدة لإكمال التسجيل')
      supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: params.get('refresh_token') || ''
      })
    }
  }, [])

  const handleLogin = async () => {
    setLoading(true)
    setError('')

    if (isInvite) {
      // تحديث كلمة المرور للمستخدم المدعو
      const { error } = await supabase.auth.updateUser({ password })
      if (error) {
        setError('حدث خطأ أثناء تعيين كلمة المرور')
      } else {
        window.location.href = '/dashboard'
      }
      setLoading(false)
      return
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError('البريد أو كلمة المرور غلط')
    } else {
      window.location.href = '/dashboard'
    }
    setLoading(false)
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #fff7f2 0%, #fff 60%, #fff3e8 100%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'Cairo, sans-serif',
      direction: 'rtl',
      position: 'relative',
      overflow: 'hidden'
    }}>
      <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;600;700;900&display=swap" rel="stylesheet" />

      {/* Background decoration */}
      <div style={{ position: 'absolute', top: 0, right: 0, width: '400px', height: '400px', background: 'radial-gradient(circle, rgba(255,107,0,0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: 0, left: 0, width: '300px', height: '300px', background: 'radial-gradient(circle, rgba(255,107,0,0.06) 0%, transparent 70%)', pointerEvents: 'none' }} />

      {/* Logos bar */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0,
        background: '#fff',
        borderBottom: '3px solid #ff6b00',
        padding: '12px 40px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: '0 2px 12px rgba(255,107,0,0.1)'
      }}>
        <img src="/logo-madinah.jpeg" alt="أمانة المدينة المنورة" style={{ height: '60px', objectFit: 'contain' }} />
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '13px', color: '#ff6b00', fontWeight: '700' }}>نظام إدارة مركبات النظافة</div>
          <div style={{ fontSize: '11px', color: '#999' }}>Cleaning Fleet Management System</div>
        </div>
        <img src="/logo-mag.jpeg" alt="MAG المجال العربي" style={{ height: '50px', objectFit: 'contain' }} />
      </div>

      {/* Login card */}
      <div style={{
        background: '#fff',
        borderRadius: '20px',
        padding: '48px 44px',
        width: '100%',
        maxWidth: '420px',
        boxShadow: '0 20px 60px rgba(255,107,0,0.12), 0 4px 20px rgba(0,0,0,0.06)',
        border: '1px solid rgba(255,107,0,0.12)',
        marginTop: '80px'
      }}>

        {/* Icon */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{
            width: '70px', height: '70px',
            background: 'linear-gradient(135deg, #ff6b00, #ff9a3c)',
            borderRadius: '18px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '32px',
            margin: '0 auto 14px',
            boxShadow: '0 8px 24px rgba(255,107,0,0.3)'
          }}>🚛</div>
          <h1 style={{ color: '#1a1a1a', fontSize: '20px', fontWeight: '900', margin: '0 0 4px' }}>
            أسطول مشاريع نظافة المدينة المنورة
          </h1>
          <p style={{ color: '#999', fontSize: '12px', margin: 0 }}>{isInvite ? 'أكمل تسجيل حسابك' : 'قم بتسجيل الدخول للمتابعة'}</p>
        </div>

        {/* Divider */}
        <div style={{ height: '2px', background: 'linear-gradient(90deg, transparent, #ff6b00, transparent)', marginBottom: '28px', borderRadius: '2px' }} />

        {isInvite && (
          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '10px 14px', color: '#16a34a', fontSize: '13px', marginBottom: '18px', fontWeight: '600' }}>
            ✅ {inviteMsg}
          </div>
        )}

        {/* Form */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {!isInvite && <div>
            <label style={{ color: '#555', fontSize: '13px', fontWeight: '600', display: 'block', marginBottom: '8px' }}>البريد الإلكتروني</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="example@email.com"
              style={{
                width: '100%', padding: '13px 16px',
                background: '#fafafa', border: '1.5px solid #e8e8e8',
                borderRadius: '10px', color: '#1a1a1a', fontSize: '14px',
                outline: 'none', boxSizing: 'border-box', transition: 'border 0.2s',
                fontFamily: 'Cairo, sans-serif'
              }}
              onFocus={e => e.target.style.borderColor = '#ff6b00'}
              onBlur={e => e.target.style.borderColor = '#e8e8e8'}
            />
          </div>}

          <div>
            <label style={{ color: '#555', fontSize: '13px', fontWeight: '600', display: 'block', marginBottom: '8px' }}>كلمة المرور</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              style={{
                width: '100%', padding: '13px 16px',
                background: '#fafafa', border: '1.5px solid #e8e8e8',
                borderRadius: '10px', color: '#1a1a1a', fontSize: '14px',
                outline: 'none', boxSizing: 'border-box',
                fontFamily: 'Cairo, sans-serif'
              }}
              onFocus={e => e.target.style.borderColor = '#ff6b00'}
              onBlur={e => e.target.style.borderColor = '#e8e8e8'}
            />
          </div>

          {error && (
            <div style={{
              background: '#fff5f5', border: '1px solid #ffcccc',
              borderRadius: '8px', padding: '10px 14px',
              color: '#e53e3e', fontSize: '13px'
            }}>{error}</div>
          )}

          <button
            onClick={handleLogin}
            disabled={loading}
            style={{
              background: loading ? '#ccc' : 'linear-gradient(135deg, #ff6b00, #ff9a3c)',
              color: '#fff', border: 'none', borderRadius: '12px',
              padding: '15px', fontSize: '15px', fontWeight: '700',
              fontFamily: 'Cairo, sans-serif', cursor: loading ? 'not-allowed' : 'pointer',
              marginTop: '4px', boxShadow: loading ? 'none' : '0 6px 20px rgba(255,107,0,0.35)',
              transition: 'all 0.2s'
            }}
          >
            {loading ? '⏳ جاري الحفظ...' : isInvite ? 'تعيين كلمة المرور والدخول →' : 'تسجيل الدخول →'}
          </button>
        </div>
      </div>

      {/* Footer */}
      <div style={{ marginTop: '24px', color: '#bbb', fontSize: '11px', textAlign: 'center' }}>
        جميع الحقوق محفوظة © 2026 — MAG المجال العربي
      </div>
    </div>
  )
}
