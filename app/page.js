'use client'
import { useState, useEffect } from 'react'
import { supabase } from './supabase'

const toEmail = (empId) => `${empId.trim()}@fleet.mag.sa`

export default function Home() {
  const [empId, setEmpId]               = useState('')
  const [password, setPassword]         = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe]     = useState(false)
  const [loading, setLoading]           = useState(false)
  const [error, setError]               = useState('')
  const [resetSent, setResetSent]       = useState(false)
  const [isInvite, setIsInvite]         = useState(false)
  const [inviteMsg, setInviteMsg]       = useState('')
  const [mounted, setMounted]           = useState(false)

  useEffect(() => {
    setMounted(true)
    const saved = localStorage.getItem('saved_emp_id')
    if (saved) { setEmpId(saved); setRememberMe(true) }
    const hash = window.location.hash
    const params = new URLSearchParams(hash.replace('#', '?'))
    const type = params.get('type')
    const accessToken = params.get('access_token')
    if ((type === 'invite' || type === 'recovery') && accessToken) {
      setIsInvite(true)
      setInviteMsg('تم التحقق — اختر كلمة مرور جديدة لإكمال التسجيل')
      supabase.auth.setSession({ access_token: accessToken, refresh_token: params.get('refresh_token') || '' })
    }
  }, [])

  const handleLogin = async () => {
    if (!empId.trim()) { setError('الرجاء إدخال الرقم الوظيفي'); return }
    if (!password)     { setError('الرجاء إدخال كلمة المرور'); return }
    setLoading(true); setError('')
    if (isInvite) {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) setError('حدث خطأ أثناء تعيين كلمة المرور')
      else window.location.href = '/dashboard'
      setLoading(false); return
    }
    rememberMe
      ? localStorage.setItem('saved_emp_id', empId.trim())
      : localStorage.removeItem('saved_emp_id')
    const { error } = await supabase.auth.signInWithPassword({ email: toEmail(empId), password })
    if (error) setError('الرقم الوظيفي أو كلمة المرور غير صحيحة')
    else window.location.href = '/dashboard'
    setLoading(false)
  }

  const handleForgotPassword = async () => {
    if (!empId.trim()) { setError('أدخل رقمك الوظيفي أولاً'); return }
    setLoading(true); setError('')
    const { error } = await supabase.auth.resetPasswordForEmail(toEmail(empId), { redirectTo: `${window.location.origin}/` })
    if (error) setError('تعذّر إرسال رابط إعادة التعيين')
    else setResetSent(true)
    setLoading(false)
  }

  const inp = {
    width:'100%', padding:'13px 16px', background:'#fafafa',
    border:'1.5px solid #e8e8e8', borderRadius:'10px', color:'#1a1a1a',
    fontSize:'14px', outline:'none', boxSizing:'border-box',
    fontFamily:'Cairo, sans-serif', transition:'border-color 0.2s, box-shadow 0.2s',
  }

  return (
    <div style={{ minHeight:'100vh', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', fontFamily:'Cairo, sans-serif', direction:'rtl', position:'relative' }}>
      <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;600;700;900&display=swap" rel="stylesheet" />
      <style>{`
        body {
          background-image: url('/bg-login.jpeg') !important;
          background-size: cover !important;
          background-position: center !important;
          background-attachment: fixed !important;
          background-color: #1a1a2e !important;
        }
        @keyframes slideUp    { from{opacity:0;transform:translateY(28px)} to{opacity:1;transform:translateY(0)} }
        @keyframes fadeIn     { from{opacity:0} to{opacity:1} }
        @keyframes slideDown  { from{opacity:0;transform:translateY(-8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes shimmerBg  { 0%,100%{background-position:0% 50%} 50%{background-position:100% 50%} }
        @keyframes spin       { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        .login-card  { animation: slideUp 0.6s cubic-bezier(.16,1,.3,1) both; }
        .login-btn:hover:not(:disabled) { transform:translateY(-1px); box-shadow:0 12px 36px rgba(255,107,0,0.45)!important; }
        .login-btn:active:not(:disabled){ transform:translateY(0); }
        .login-btn   { transition: all 0.25s; }
        .login-input:focus { border-color:#ff6b00!important; box-shadow:0 0 0 3px rgba(255,107,0,0.1)!important; }
        .forgot-btn:hover { opacity:0.75; }
        .forgot-btn  { transition: opacity 0.2s; }
        .eye-btn:hover { color:#ff6b00!important; }
        .eye-btn     { transition: color 0.2s; }
        @media (max-width: 600px) {
          .login-card {
            padding: 20px 18px 18px !important;
            border-radius: 16px !important;
            margin-left: 24px !important;
            margin-right: 24px !important;
            width: calc(100% - 48px) !important;
            margin-top: 80px !important;
          }
          .login-icon { width:44px!important; height:44px!important; font-size:20px!important; border-radius:12px!important; margin-bottom:8px!important; box-shadow:0 6px 16px rgba(255,107,0,0.3)!important; }
          .login-title { font-size:14px!important; margin-bottom:3px!important; }
          .login-subtitle { font-size:10px!important; }
          .login-header { padding:7px 14px!important; }
          .login-header img:first-child { height:38px!important; }
          .login-header img:last-child  { height:30px!important; }
          .login-header-title { font-size:10px!important; }
          .login-header-sub   { display:none!important; }
          .login-field-gap { gap:10px!important; }
          .login-btn { padding:12px!important; font-size:13px!important; }
          .login-input { padding:10px 12px!important; font-size:13px!important; }
          label { font-size:11px!important; margin-bottom:5px!important; }
          .login-divider { margin-bottom:14px!important; }
          .login-footer { margin-top:14px!important; padding-top:12px!important; }
          .login-icon-wrap { margin-bottom:14px!important; }
        }
      `}</style>

      {/* الصورة كـ layer ثابت */}
      <div style={{ position:'fixed', inset:0, zIndex:0 }}>
        <img src="/bg-login.jpeg" alt="" style={{ width:'100%', height:'100%', objectFit:'cover', objectPosition:'center', display:'block' }} />
        <div style={{ position:'absolute', inset:0, background:'linear-gradient(135deg, rgba(10,10,30,0.85) 0%, rgba(10,10,30,0.70) 50%, rgba(255,107,0,0.2) 100%)' }} />
      </div>
      {/* شريط علوي */}
      <div style={{ position:'fixed', top:0, left:0, right:0, height:'4px', background:'linear-gradient(90deg,#1a1a2e,#ff6b00,#1a1a2e)', zIndex:3 }} />

      {/* هيدر رسمي */}
      <div className="login-header" style={{ position:'absolute', top:0, left:0, right:0, background:'linear-gradient(135deg,#1a1a2e 0%,#12122a 100%)', borderBottom:'3px solid #ff6b00', padding:'12px 40px', display:'flex', alignItems:'center', justifyContent:'space-between', boxShadow:'0 4px 24px rgba(0,0,0,0.2)', zIndex:10 }}>
        <img src="/logo-madinah.jpeg" alt="أمانة المدينة المنورة" style={{ height:'58px', objectFit:'contain', filter:'brightness(1.1)' }} />
        <div style={{ textAlign:'center' }}>
          <div className="login-header-title" style={{ fontSize:'13px', color:'#ff6b00', fontWeight:'800', letterSpacing:'0.5px' }}>نظام إدارة مركبات النظافة</div>
          <div className="login-header-sub" style={{ fontSize:'10px', color:'rgba(255,255,255,0.45)', marginTop:'3px', letterSpacing:'1.5px' }}>CLEANING FLEET MANAGEMENT SYSTEM</div>
        </div>
        <img src="/logo-mag.jpeg" alt="MAG" style={{ height:'48px', objectFit:'contain', filter:'brightness(1.1)' }} />
      </div>

      {/* بطاقة الدخول */}
      <div className="login-card" style={{ background:'#fff', borderRadius:'24px', padding:'48px 44px 40px', width:'100%', maxWidth:'430px', boxShadow:'0 24px 80px rgba(0,0,0,0.12), 0 8px 24px rgba(255,107,0,0.08)', border:'1px solid rgba(255,107,0,0.1)', marginTop:'90px', marginBottom:'16px', position:'relative', zIndex:5 }}>
        <div style={{ position:'absolute', top:0, left:'20px', right:'20px', height:'3px', background:'linear-gradient(90deg,transparent,#ff6b00,transparent)', borderRadius:'0 0 3px 3px' }} />

        {/* أيقونة + عنوان */}
        <div style={{ textAlign:'center', marginBottom:'24px' }}>
          <div className="login-icon" style={{ width:'76px', height:'76px', background:'linear-gradient(135deg,#1a1a2e 0%,#ff6b00 100%)', borderRadius:'20px', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'34px', margin:'0 auto 14px', boxShadow:'0 12px 32px rgba(255,107,0,0.35)' }}>🚛</div>
          <h1 className="login-title" style={{ color:'#1a1a2e', fontSize:'20px', fontWeight:'900', margin:'0 0 6px', lineHeight:'1.3' }}>أسطول مشاريع نظافة المدينة المنورة</h1>
          <p className="login-subtitle" style={{ color:'#999', fontSize:'12px', margin:0, letterSpacing:'0.3px' }}>
            {isInvite ? 'أكمل تسجيل حسابك' : 'بوابة الدخول الرسمية — للموظفين المخولين فقط'}
          </p>
        </div>

        {/* فاصل */}
        <div className="login-divider" style={{ display:'flex', alignItems:'center', gap:'12px', marginBottom:'28px' }}>
          <div style={{ flex:1, height:'1px', background:'linear-gradient(90deg,transparent,#e8e8e8)' }} />
          <div style={{ width:'8px', height:'8px', borderRadius:'50%', background:'#ff6b00' }} />
          <div style={{ flex:1, height:'1px', background:'linear-gradient(90deg,#e8e8e8,transparent)' }} />
        </div>

        {isInvite && (
          <div style={{ background:'#f0fdf4', border:'1px solid #bbf7d0', borderRadius:'10px', padding:'12px 16px', color:'#16a34a', fontSize:'13px', marginBottom:'20px', fontWeight:'600', display:'flex', alignItems:'center', gap:'8px' }}>
            <span>✅</span> {inviteMsg}
          </div>
        )}

        {resetSent ? (
          <div style={{ textAlign:'center', padding:'24px 0', animation:'fadeIn 0.4s ease' }}>
            <div style={{ fontSize:'44px', marginBottom:'14px' }}>📧</div>
            <div style={{ color:'#1a1a2e', fontWeight:'800', fontSize:'16px', marginBottom:'8px' }}>تم الإرسال بنجاح</div>
            <div style={{ color:'#777', fontSize:'13px', marginBottom:'28px', lineHeight:'1.7' }}>تم إرسال رابط إعادة تعيين كلمة المرور<br/>إلى البريد المرتبط برقمك الوظيفي</div>
            <button onClick={()=>setResetSent(false)} style={{ background:'none', border:'none', color:'#ff6b00', fontSize:'13px', fontWeight:'700', cursor:'pointer', fontFamily:'Cairo, sans-serif', textDecoration:'underline' }}>
              ← العودة لتسجيل الدخول
            </button>
          </div>
        ) : (
          <div className="login-field-gap" style={{ display:'flex', flexDirection:'column', gap:'20px' }}>

            {/* الرقم الوظيفي */}
            {!isInvite && (
              <div>
                <label style={{ color:'#444', fontSize:'12px', fontWeight:'700', display:'block', marginBottom:'8px' }}>الرقم الوظيفي</label>
                <input className="login-input" type="text" value={empId} onChange={e=>{setEmpId(e.target.value);setError('')}} placeholder="أدخل رقمك الوظيفي" style={inp} />
              </div>
            )}

            {/* كلمة المرور */}
            <div>
              <label style={{ color:'#444', fontSize:'12px', fontWeight:'700', display:'block', marginBottom:'8px' }}>كلمة المرور</label>
              <div style={{ position:'relative' }}>
                <input className="login-input" type={showPassword?'text':'password'} value={password} onChange={e=>{setPassword(e.target.value);setError('')}} placeholder="••••••••" onKeyDown={e=>e.key==='Enter'&&handleLogin()} style={{ ...inp, paddingLeft:'48px' }} />
                <button className="eye-btn" type="button" onClick={()=>setShowPassword(!showPassword)} style={{ position:'absolute', left:'13px', top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', fontSize:'17px', padding:0, lineHeight:1, color:'#bbb' }}>
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            {/* تذكرني + نسيت */}
            {!isInvite && (
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:'-4px' }}>
                <label style={{ display:'flex', alignItems:'center', gap:'8px', cursor:'pointer', fontSize:'13px', color:'#555', userSelect:'none' }}>
                  <input type="checkbox" checked={rememberMe} onChange={e=>setRememberMe(e.target.checked)} style={{ accentColor:'#ff6b00', width:'15px', height:'15px', cursor:'pointer' }} />
                  تذكرني
                </label>
                <button className="forgot-btn" type="button" onClick={handleForgotPassword} disabled={loading} style={{ background:'none', border:'none', color:'#ff6b00', fontSize:'13px', fontWeight:'600', cursor:'pointer', fontFamily:'Cairo, sans-serif', padding:0, textDecoration:'underline', textUnderlineOffset:'3px' }}>
                  نسيت كلمة المرور؟
                </button>
              </div>
            )}

            {/* رسالة الخطأ */}
            {error && (
              <div style={{ background:'#fff5f5', border:'1px solid #fca5a5', borderRadius:'10px', padding:'11px 14px', color:'#dc2626', fontSize:'13px', display:'flex', alignItems:'center', gap:'8px', animation:'slideDown 0.3s ease' }}>
                <span>⚠️</span> {error}
              </div>
            )}

            {/* زر الدخول */}
            <button className="login-btn" onClick={handleLogin} disabled={loading} style={{ background:loading?'#ddd':'linear-gradient(135deg,#1a1a2e 0%,#ff6b00 100%)', color:'#fff', border:'none', borderRadius:'12px', padding:'16px', fontSize:'15px', fontWeight:'800', fontFamily:'Cairo, sans-serif', cursor:loading?'not-allowed':'pointer', marginTop:'4px', boxShadow:loading?'none':'0 8px 24px rgba(255,107,0,0.3)', width:'100%', letterSpacing:'0.5px' }}>
              {loading
                ? <span style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:'10px' }}>
                    <span style={{ display:'inline-block', width:'16px', height:'16px', border:'2px solid rgba(255,255,255,0.35)', borderTopColor:'#fff', borderRadius:'50%', animation:'spin 0.7s linear infinite' }} />
                    جاري التحقق...
                  </span>
                : 'تسجيل الدخول'
              }
            </button>
          </div>
        )}

        <div className="login-footer" style={{ marginTop:'28px', paddingTop:'20px', borderTop:'1px solid #f0f0f0', display:'flex', alignItems:'center', justifyContent:'center', gap:'8px' }}>
          <div style={{ width:'5px', height:'5px', borderRadius:'50%', background:'#ff6b00' }} />
          <span style={{ color:'#bbb', fontSize:'11px' }}>نظام آمن ومشفر</span>
          <div style={{ width:'5px', height:'5px', borderRadius:'50%', background:'#ff6b00' }} />
        </div>
      </div>

      <div style={{ marginTop:'24px', color:'rgba(255,255,255,0.5)', fontSize:'11px', textAlign:'center', position:'relative', zIndex:5 }}>
        جميع الحقوق محفوظة 2026 MAG
      </div>
    </div>
  )
}
