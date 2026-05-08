'use client'
import { useEffect } from 'react'

export default function SidePanel({ open, onClose, title, children, width = '480px', isRTL = true }) {
  useEffect(() => {
    if (!open) return
    const handler = (e) => { if (e.key === 'Escape') onClose && onClose() }
    document.addEventListener('keydown', handler)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handler)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null

  const side = isRTL ? 'left' : 'right'
  const transform = open ? 'translateX(0)' : `translateX(${isRTL ? '-' : ''}100%)`

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.45)',
          backdropFilter: 'blur(6px)',
          zIndex: 300,
          animation: 'fadeIn 0.2s ease',
        }}
      />
      {/* Panel */}
      <div
        dir={isRTL ? 'rtl' : 'ltr'}
        style={{
          position: 'fixed',
          top: 0,
          [side]: 0,
          width: '100%',
          maxWidth: width,
          height: '100vh',
          background: 'var(--surface)',
          borderLeft: !isRTL ? '1px solid var(--border)' : 'none',
          borderRight: isRTL ? '1px solid var(--border)' : 'none',
          boxShadow: 'var(--shadow-xl)',
          zIndex: 301,
          display: 'flex',
          flexDirection: 'column',
          fontFamily: 'Cairo, sans-serif',
          animation: `${isRTL ? 'slideInLeft' : 'slideInRight'} 0.25s cubic-bezier(.16,1,.3,1)`,
        }}
      >
        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <div style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text)' }}>{title}</div>
          <button
            onClick={onClose}
            aria-label="إغلاق"
            style={{ background: 'var(--surface-2)', border: 'none', width: '32px', height: '32px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
          {children}
        </div>
      </div>

      <style jsx global>{`
        @keyframes slideInLeft {
          from { transform: translateX(-100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </>
  )
}
