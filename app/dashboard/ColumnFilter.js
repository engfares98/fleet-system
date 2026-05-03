'use client'
import { useState, useRef, useEffect } from 'react'

export default function ColumnFilter({ type = 'text', value, onChange, options, label, isRTL }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const isActive = type === 'date-range'
    ? !!(value && (value.from || value.to))
    : type === 'select'
      ? value && value !== 'all'
      : !!value

  const clear = () => {
    if (type === 'select') onChange('all')
    else if (type === 'date-range') onChange({ from: '', to: '' })
    else onChange('')
    setOpen(false)
  }

  const inputStyle = { width: '100%', padding: '6px 8px', fontSize: '12px', border: '1px solid #e8e8e8', borderRadius: '6px', boxSizing: 'border-box', fontFamily: 'Cairo, sans-serif' }

  return (
    <span ref={ref} style={{ position: 'relative', display: 'inline-block', marginInlineStart: '4px' }}>
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(o => !o) }}
        title={label}
        style={{ background: isActive ? '#ff6b00' : 'transparent', border: 'none', cursor: 'pointer', padding: '2px 5px', fontSize: '10px', color: isActive ? '#fff' : '#bbb', borderRadius: '4px', lineHeight: 1 }}
      >
        ▼
      </button>
      {open && (
        <div
          onClick={e => e.stopPropagation()}
          style={{
            position: 'absolute',
            top: '100%',
            [isRTL ? 'right' : 'left']: 0,
            marginTop: '4px',
            background: '#fff',
            border: '1px solid #e8e8e8',
            borderRadius: '8px',
            boxShadow: '0 6px 18px rgba(0,0,0,0.15)',
            padding: '10px',
            minWidth: '200px',
            zIndex: 80,
            fontFamily: 'Cairo, sans-serif',
            textAlign: isRTL ? 'right' : 'left',
          }}
        >
          <div style={{ fontSize: '11px', fontWeight: '700', marginBottom: '6px', color: '#555' }}>{label}</div>
          {type === 'text' && (
            <input
              value={value || ''}
              onChange={e => onChange(e.target.value)}
              placeholder="بحث..."
              style={inputStyle}
              autoFocus
            />
          )}
          {type === 'select' && (
            <select value={value || 'all'} onChange={e => onChange(e.target.value)} style={inputStyle} autoFocus>
              {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          )}
          {type === 'date-range' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '10px', color: '#888' }}>من</label>
              <input type="date" value={value?.from || ''} onChange={e => onChange({ ...(value || {}), from: e.target.value })} style={inputStyle} />
              <label style={{ fontSize: '10px', color: '#888' }}>إلى</label>
              <input type="date" value={value?.to || ''} onChange={e => onChange({ ...(value || {}), to: e.target.value })} style={inputStyle} />
            </div>
          )}
          <div style={{ display: 'flex', gap: '6px', marginTop: '10px', justifyContent: 'space-between' }}>
            <button onClick={clear} style={{ background: '#fff', color: '#888', border: '1px solid #ddd', padding: '5px 12px', fontSize: '11px', fontWeight: '700', borderRadius: '5px', cursor: 'pointer', fontFamily: 'Cairo, sans-serif' }}>مسح</button>
            <button onClick={() => setOpen(false)} style={{ background: '#ff6b00', color: '#fff', border: 'none', padding: '5px 12px', fontSize: '11px', fontWeight: '700', borderRadius: '5px', cursor: 'pointer', fontFamily: 'Cairo, sans-serif' }}>تم</button>
          </div>
        </div>
      )}
    </span>
  )
}
