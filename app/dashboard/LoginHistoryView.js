'use client'
import { useEffect, useState, useMemo } from 'react'

function timeAgo(dateStr) {
  if (!dateStr) return ''
  const ms = Date.now() - new Date(dateStr).getTime()
  const sec = Math.floor(ms / 1000)
  if (sec < 60) return `قبل ${sec} ث`
  const min = Math.floor(sec / 60)
  if (min < 60) return `قبل ${min} د`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `قبل ${hr} س`
  const days = Math.floor(hr / 24)
  if (days < 7) return `قبل ${days} يوم`
  return new Date(dateStr).toLocaleDateString('ar-EG')
}

const DEVICE_ICON = { desktop: '🖥️', mobile: '📱', tablet: '📱' }
const OS_ICON = { Windows: '🪟', macOS: '🍎', Linux: '🐧', Android: '🤖', iOS: '📱', Other: '💻' }

export default function LoginHistoryView({ supabase, isMobile, isAdmin }) {
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => { fetchHistory() }, [])

  const fetchHistory = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('login_history')
      .select('*')
      .order('login_at', { ascending: false })
      .limit(200)
    setHistory(data || [])
    setLoading(false)
  }

  const filtered = useMemo(() => {
    if (!search) return history
    const q = search.toLowerCase()
    return history.filter(h =>
      (h.email || '').toLowerCase().includes(q) ||
      (h.browser || '').toLowerCase().includes(q) ||
      (h.os || '').toLowerCase().includes(q)
    )
  }, [history, search])

  const stats = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10)
    const todayCount = history.filter(h => (h.login_at || '').startsWith(today)).length
    const uniqueUsers = new Set(history.map(h => h.email)).size
    const failed = history.filter(h => h.success === false).length
    return { todayCount, uniqueUsers, failed, total: history.length }
  }, [history])

  const card = { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '14px', padding: '20px', marginBottom: '14px' }

  return (
    <div>
      <div style={{ marginBottom: '20px' }}>
        <div style={{ fontSize: isMobile ? '17px' : '22px', fontWeight: '900', color: 'var(--text)' }}>🔐 سجل تسجيل الدخول</div>
        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>{isAdmin ? 'كل عمليات الدخول للنظام' : 'عمليات دخولك للنظام'}</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2,1fr)' : 'repeat(4,1fr)', gap: '12px', marginBottom: '14px' }}>
        {[
          ['📊', 'الإجمالي', stats.total, '#2563eb'],
          ['📅', 'اليوم', stats.todayCount, '#16a34a'],
          ['👥', 'مستخدمون فريدون', stats.uniqueUsers, '#ff6b00'],
          ['⚠️', 'محاولات فاشلة', stats.failed, '#dc2626'],
        ].map(([icon, label, val, color]) => (
          <div key={label} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '14px', padding: '14px', borderTop: `3px solid ${color}` }}>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '6px' }}>{icon} {label}</div>
            <div style={{ fontSize: '24px', fontWeight: '900', color }}>{val}</div>
          </div>
        ))}
      </div>

      <div style={card}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 بحث بالإيميل أو المتصفح أو نظام التشغيل..." style={{ width: '100%', padding: '10px 14px', fontSize: '13px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--text)', fontFamily: 'Cairo, sans-serif' }} />
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>⏳ جاري التحميل...</div>
      ) : filtered.length === 0 ? (
        <div style={{ ...card, textAlign: 'center', padding: '60px 20px' }}>
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>📭</div>
          <div style={{ fontSize: '14px', color: 'var(--text-muted)' }}>لا توجد سجلات</div>
        </div>
      ) : (
        <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
          {filtered.map((h, i) => (
            <div key={h.id} style={{ padding: '14px 18px', borderBottom: i < filtered.length - 1 ? '1px solid var(--border)' : 'none', display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: h.success === false ? '#fef2f2' : 'var(--accent-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0 }}>
                {h.success === false ? '❌' : (DEVICE_ICON[h.device_type] || '💻')}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text)' }}>{h.email || 'مجهول'}</span>
                  {h.success === false && <span style={{ background: '#fef2f2', color: '#dc2626', padding: '1px 8px', borderRadius: '12px', fontSize: '10px', fontWeight: '700' }}>فشل</span>}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '3px' }}>
                  <span>{OS_ICON[h.os] || '💻'} {h.os || '?'}</span>
                  <span style={{ marginInlineStart: '8px' }}>· {h.browser || '?'}</span>
                  {h.ip_address && <span style={{ marginInlineStart: '8px' }}>· 🌐 {h.ip_address}</span>}
                </div>
              </div>
              <div style={{ textAlign: 'left', fontSize: '11px', color: 'var(--text-muted)', flexShrink: 0 }}>
                <div style={{ fontWeight: '600' }}>{timeAgo(h.login_at)}</div>
                <div>{new Date(h.login_at).toLocaleString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
