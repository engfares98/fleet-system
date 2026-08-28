'use client'
import { useEffect, useMemo, useState } from 'react'

const ACTION_META = {
  create: { label: 'إضافة', icon: '➕', color: '#16a34a' },
  update: { label: 'تعديل', icon: '✏️', color: '#d97706' },
  delete: { label: 'حذف', icon: '🗑️', color: '#dc2626' },
  login: { label: 'دخول', icon: '🔓', color: '#2563eb' },
  logout: { label: 'خروج', icon: '🔒', color: '#6b7280' },
}

const ENTITY_META = {
  vehicle: { label: 'مركبة', icon: '🚛' },
  driver: { label: 'سائق', icon: '👤' },
  maintenance: { label: 'صيانة', icon: '🔧' },
  fuel: { label: 'وقود', icon: '⛽' },
  attachment: { label: 'مرفق', icon: '📎' },
  user: { label: 'مستخدم', icon: '👥' },
}

function timeAgo(dateStr) {
  if (!dateStr) return ''
  const ms = Date.now() - new Date(dateStr).getTime()
  const sec = Math.floor(ms / 1000)
  if (sec < 60) return `قبل ${sec} ثانية`
  const min = Math.floor(sec / 60)
  if (min < 60) return `قبل ${min} دقيقة`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `قبل ${hr} ساعة`
  const days = Math.floor(hr / 24)
  if (days < 7) return `قبل ${days} يوم`
  return new Date(dateStr).toLocaleDateString('ar-EG')
}

export default function AuditLogView({ supabase, isMobile }) {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState({ action: 'all', entity: 'all', user: '' })
  const [expanded, setExpanded] = useState(null)
  const [page, setPage] = useState(0)
  const PAGE_SIZE = 50

  useEffect(() => { fetchLogs() }, [page])

  const fetchLogs = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('audit_log')
      .select('*')
      .order('created_at', { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)
    setLogs(data || [])
    setLoading(false)
  }

  const filtered = useMemo(() => {
    return logs.filter(l => {
      if (filter.action !== 'all' && l.action !== filter.action) return false
      if (filter.entity !== 'all' && l.entity_type !== filter.entity) return false
      if (filter.user && !(l.user_email || '').toLowerCase().includes(filter.user.toLowerCase())) return false
      return true
    })
  }, [logs, filter])

  const card = { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '14px', padding: '20px', marginBottom: '14px' }
  const inp = { padding: '10px', fontSize: '13px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--text)', fontFamily: 'Cairo, sans-serif' }

  return (
    <div>
      <div style={{ marginBottom: '20px' }}>
        <div style={{ fontSize: isMobile ? '17px' : '22px', fontWeight: '900', color: 'var(--text)' }}>📜 سجل النشاط</div>
        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>كل العمليات التي تمت في النظام مع تفاصيل المستخدم والوقت</div>
      </div>

      <div style={card}>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: '10px' }}>
          <select value={filter.action} onChange={e => setFilter({ ...filter, action: e.target.value })} style={inp}>
            <option value="all">⚡ كل الإجراءات</option>
            <option value="create">➕ إضافة</option>
            <option value="update">✏️ تعديل</option>
            <option value="delete">🗑️ حذف</option>
            <option value="login">🔓 دخول</option>
          </select>
          <select value={filter.entity} onChange={e => setFilter({ ...filter, entity: e.target.value })} style={inp}>
            <option value="all">📂 كل الأنواع</option>
            <option value="vehicle">🚛 مركبة</option>
            <option value="driver">👤 سائق</option>
            <option value="maintenance">🔧 صيانة</option>
            <option value="fuel">⛽ وقود</option>
            <option value="attachment">📎 مرفق</option>
            <option value="user">👥 مستخدم</option>
          </select>
          <input value={filter.user} onChange={e => setFilter({ ...filter, user: e.target.value })} placeholder="🔍 بحث بإيميل المستخدم" style={inp} />
        </div>
        <div style={{ marginTop: '12px', fontSize: '11px', color: 'var(--text-muted)' }}>عرض {filtered.length} من {logs.length} سجل</div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>⏳ جاري التحميل...</div>
      ) : filtered.length === 0 ? (
        <div style={{ ...card, textAlign: 'center', padding: '60px 20px' }}>
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>📭</div>
          <div style={{ fontSize: '14px', color: 'var(--text-muted)' }}>لا توجد سجلات تطابق الفلاتر</div>
        </div>
      ) : (
        <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
          {filtered.map((l, i) => {
            const action = ACTION_META[l.action] || { label: l.action, icon: '⚪', color: 'var(--text-muted)' }
            const entity = ENTITY_META[l.entity_type] || { label: l.entity_type, icon: '📄' }
            const isExpanded = expanded === l.id
            return (
              <div key={l.id} style={{ borderBottom: i < filtered.length - 1 ? '1px solid var(--border)' : 'none', cursor: l.changes ? 'pointer' : 'default' }} onClick={() => l.changes && setExpanded(isExpanded ? null : l.id)}>
                <div style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: `${action.color}1a`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', flexShrink: 0 }}>{action.icon}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span style={{ background: `${action.color}1a`, color: action.color, padding: '2px 10px', borderRadius: '20px', fontSize: '10px', fontWeight: '700' }}>{action.label}</span>
                      <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text)' }}>{entity.icon} {entity.label}</span>
                      {l.entity_label && <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>· {l.entity_label}</span>}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                      <span>👤 {l.user_email || 'مجهول'}</span>
                      {l.user_role && <span style={{ marginInlineStart: '8px' }}>· {l.user_role}</span>}
                      <span style={{ marginInlineStart: '8px' }}>· 🕐 {timeAgo(l.created_at)}</span>
                    </div>
                  </div>
                  {l.changes && <span style={{ color: 'var(--text-subtle)', fontSize: '14px', transition: 'transform 0.2s', transform: isExpanded ? 'rotate(180deg)' : '' }}>▼</span>}
                </div>
                {isExpanded && l.changes && (
                  <div style={{ padding: '0 18px 16px 64px', background: 'var(--surface-2)' }}>
                    <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', marginBottom: '8px' }}>التغييرات:</div>
                    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 14px', fontFamily: 'monospace', fontSize: '11px' }}>
                      {Object.entries(l.changes).map(([k, v]) => (
                        <div key={k} style={{ marginBottom: '4px' }}>
                          <strong style={{ color: 'var(--text)' }}>{k}:</strong>{' '}
                          <span style={{ color: '#dc2626', textDecoration: 'line-through' }}>{String(v?.from ?? '∅')}</span>
                          {' → '}
                          <span style={{ color: '#16a34a', fontWeight: '700' }}>{String(v?.to ?? '∅')}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {(page > 0 || logs.length === PAGE_SIZE) && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '16px' }}>
          <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface)', cursor: page === 0 ? 'not-allowed' : 'pointer', opacity: page === 0 ? 0.5 : 1, fontFamily: 'Cairo, sans-serif', fontWeight: '700', fontSize: '13px', color: 'var(--text)' }}>السابق</button>
          <span style={{ padding: '8px 16px', color: 'var(--text-muted)', fontSize: '13px' }}>الصفحة {page + 1}</span>
          <button onClick={() => setPage(p => p + 1)} disabled={logs.length < PAGE_SIZE} style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface)', cursor: logs.length < PAGE_SIZE ? 'not-allowed' : 'pointer', opacity: logs.length < PAGE_SIZE ? 0.5 : 1, fontFamily: 'Cairo, sans-serif', fontWeight: '700', fontSize: '13px', color: 'var(--text)' }}>التالي</button>
        </div>
      )}
    </div>
  )
}
