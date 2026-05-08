'use client'
import { useState, useEffect, useMemo, useRef } from 'react'

export default function GlobalSearch({ open, onClose, vehicles, drivers, maintenance, fuelLogs, onNavigate }) {
  const [q, setQ] = useState('')
  const [activeIdx, setActiveIdx] = useState(0)
  const inputRef = useRef(null)
  const listRef = useRef(null)

  useEffect(() => {
    if (open) {
      setQ('')
      setActiveIdx(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  const results = useMemo(() => {
    if (!q.trim()) return []
    const ql = q.toLowerCase()
    const items = []

    vehicles.forEach(v => {
      const hay = [v.plate_number, v.vehicle_code, v.brand, v.model, v.type, v.year, v.color, v.chassis_number].filter(Boolean).join(' ').toLowerCase()
      if (hay.includes(ql)) items.push({
        kind: 'vehicle',
        icon: '🚛',
        title: v.plate_number || v.vehicle_code,
        subtitle: [v.brand, v.model, v.year, v.chassis_number].filter(Boolean).join(' · '),
        tag: 'مركبة',
        tagColor: '#ff6b00',
        action: () => onNavigate('vehicles'),
      })
    })

    drivers.forEach(d => {
      const hay = [d.full_name, d.national_id, d.passport_number, d.phone, d.license_number, d.file_number].filter(Boolean).join(' ').toLowerCase()
      if (hay.includes(ql)) items.push({
        kind: 'driver',
        icon: '👤',
        title: d.full_name,
        subtitle: [d.national_id || d.passport_number, d.phone].filter(Boolean).join(' · '),
        tag: 'سائق',
        tagColor: '#2563eb',
        action: () => onNavigate('drivers'),
      })
    })

    maintenance.forEach(m => {
      const hay = [m.type, m.description, m.vehicles?.plate_number].filter(Boolean).join(' ').toLowerCase()
      if (hay.includes(ql)) items.push({
        kind: 'maintenance',
        icon: '🔧',
        title: m.type || 'صيانة',
        subtitle: [m.vehicles?.plate_number, m.date, m.cost ? `${m.cost} ر.س` : ''].filter(Boolean).join(' · '),
        tag: 'صيانة',
        tagColor: '#d97706',
        action: () => onNavigate('maintenance'),
      })
    })

    fuelLogs.forEach(f => {
      const hay = [f.vehicles?.plate_number, f.drivers?.full_name].filter(Boolean).join(' ').toLowerCase()
      if (hay.includes(ql)) items.push({
        kind: 'fuel',
        icon: '⛽',
        title: f.vehicles?.plate_number || 'وقود',
        subtitle: [f.drivers?.full_name, f.date, f.total_cost ? `${f.total_cost} ر.س` : ''].filter(Boolean).join(' · '),
        tag: 'وقود',
        tagColor: '#16a34a',
        action: () => onNavigate('fuel'),
      })
    })

    return items.slice(0, 60)
  }, [q, vehicles, drivers, maintenance, fuelLogs, onNavigate])

  useEffect(() => { setActiveIdx(0) }, [q])

  useEffect(() => {
    if (!open) return
    const handler = (e) => {
      if (e.key === 'Escape') { e.preventDefault(); onClose() }
      else if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx(i => Math.min(i + 1, results.length - 1)) }
      else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIdx(i => Math.max(i - 1, 0)) }
      else if (e.key === 'Enter') {
        e.preventDefault()
        const r = results[activeIdx]
        if (r) { r.action(); onClose() }
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, results, activeIdx, onClose])

  useEffect(() => {
    const el = listRef.current?.children[activeIdx]
    if (el) el.scrollIntoView({ block: 'nearest' })
  }, [activeIdx])

  if (!open) return null

  const groupCounts = results.reduce((acc, r) => { acc[r.kind] = (acc[r.kind] || 0) + 1; return acc }, {})

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(8px)', zIndex: 450, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '80px 16px 16px', animation: 'fadeIn 0.2s' }}>
      <div onClick={e => e.stopPropagation()} dir="rtl" style={{ background: 'var(--surface)', borderRadius: '16px', maxWidth: '640px', width: '100%', maxHeight: '70vh', display: 'flex', flexDirection: 'column', boxShadow: 'var(--shadow-xl)', overflow: 'hidden', fontFamily: 'Cairo, sans-serif', animation: 'scaleIn 0.2s' }}>
        {/* Search input */}
        <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input
            ref={inputRef}
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="ابحث في المركبات، السائقين، الصيانة، الوقود..."
            style={{ flex: 1, background: 'transparent !important', border: 'none', outline: 'none', fontSize: '15px', color: 'var(--text)', fontFamily: 'Cairo, sans-serif' }}
          />
          <kbd style={{ background: 'var(--surface-3)', border: '1px solid var(--border)', borderRadius: '4px', padding: '2px 8px', fontSize: '10px', fontWeight: '700', fontFamily: 'monospace', color: 'var(--text-muted)' }}>ESC</kbd>
        </div>

        {/* Results count by kind */}
        {q && results.length > 0 && (
          <div style={{ padding: '8px 18px', display: 'flex', gap: '8px', flexWrap: 'wrap', borderBottom: '1px solid var(--border)', fontSize: '11px', color: 'var(--text-muted)', background: 'var(--surface-2)' }}>
            <span>{results.length} نتيجة:</span>
            {groupCounts.vehicle && <span>🚛 {groupCounts.vehicle} مركبة</span>}
            {groupCounts.driver && <span>👤 {groupCounts.driver} سائق</span>}
            {groupCounts.maintenance && <span>🔧 {groupCounts.maintenance} صيانة</span>}
            {groupCounts.fuel && <span>⛽ {groupCounts.fuel} وقود</span>}
          </div>
        )}

        {/* Results */}
        <div ref={listRef} style={{ flex: 1, overflowY: 'auto', padding: '6px' }}>
          {!q && (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: '36px', marginBottom: '12px' }}>🔍</div>
              <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '4px' }}>ابدأ الكتابة للبحث في كل البيانات</div>
              <div style={{ fontSize: '11px', marginTop: '12px' }}>
                استخدم <kbd style={{ background: 'var(--surface-3)', padding: '1px 6px', borderRadius: '3px', fontFamily: 'monospace' }}>↑</kbd> <kbd style={{ background: 'var(--surface-3)', padding: '1px 6px', borderRadius: '3px', fontFamily: 'monospace' }}>↓</kbd> للتنقل و <kbd style={{ background: 'var(--surface-3)', padding: '1px 6px', borderRadius: '3px', fontFamily: 'monospace' }}>Enter</kbd> للفتح
              </div>
            </div>
          )}
          {q && results.length === 0 && (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: '36px', marginBottom: '12px' }}>🤷</div>
              <div style={{ fontSize: '14px' }}>لا توجد نتائج لـ &quot;{q}&quot;</div>
            </div>
          )}
          {results.map((r, i) => (
            <div
              key={i}
              onClick={() => { r.action(); onClose() }}
              onMouseEnter={() => setActiveIdx(i)}
              style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', borderRadius: '8px', cursor: 'pointer', background: i === activeIdx ? 'var(--accent-soft)' : 'transparent', margin: '2px 0', transition: 'background 0.1s' }}
            >
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', flexShrink: 0 }}>{r.icon}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: '700', fontSize: '13px', color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.title || '—'}</div>
                {r.subtitle && <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.subtitle}</div>}
              </div>
              <span style={{ background: `${r.tagColor}1a`, color: r.tagColor, padding: '2px 10px', borderRadius: '20px', fontSize: '10px', fontWeight: '700', flexShrink: 0 }}>{r.tag}</span>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{ padding: '8px 14px', borderTop: '1px solid var(--border)', background: 'var(--surface-2)', fontSize: '10px', color: 'var(--text-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: '12px' }}>
            <span><kbd style={{ background: 'var(--surface-3)', padding: '1px 6px', borderRadius: '3px', fontFamily: 'monospace' }}>↵</kbd> فتح</span>
            <span><kbd style={{ background: 'var(--surface-3)', padding: '1px 6px', borderRadius: '3px', fontFamily: 'monospace' }}>↑↓</kbd> تنقل</span>
          </div>
          <span>بحث ذكي في كل النظام</span>
        </div>
      </div>
    </div>
  )
}
