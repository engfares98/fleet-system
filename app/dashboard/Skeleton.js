'use client'

export function Skeleton({ width = '100%', height = '14px', radius = '6px', style = {} }) {
  return <div className="skeleton" style={{ width, height, borderRadius: radius, ...style }} />
}

export function SkeletonText({ lines = 3, gap = '8px' }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap }}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} height="12px" width={i === lines - 1 ? '60%' : '100%'} />
      ))}
    </div>
  )
}

export function SkeletonCard({ count = 1 }) {
  return (
    <div style={{ display: 'grid', gap: '14px', gridTemplateColumns: `repeat(${count}, 1fr)` }}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '14px', padding: '20px' }}>
          <Skeleton width="40%" height="11px" style={{ marginBottom: '14px' }} />
          <Skeleton width="65%" height="28px" style={{ marginBottom: '8px' }} />
          <Skeleton width="30%" height="10px" />
        </div>
      ))}
    </div>
  )
}

export function SkeletonTable({ rows = 8, cols = 6 }) {
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '14px', padding: 0, overflow: 'hidden' }}>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: '12px', padding: '14px 20px', background: 'var(--surface-2)', borderBottom: '1px solid var(--border)' }}>
        {Array.from({ length: cols }).map((_, i) => <Skeleton key={i} height="11px" width="60%" />)}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: '12px', padding: '14px 20px', borderBottom: '1px solid var(--border)' }}>
          {Array.from({ length: cols }).map((_, c) => <Skeleton key={c} height="12px" width={c === 0 ? '40%' : c === cols - 1 ? '60%' : '80%'} />)}
        </div>
      ))}
    </div>
  )
}

export function SkeletonStats({ count = 6 }) {
  return (
    <div style={{ display: 'grid', gap: '12px', gridTemplateColumns: `repeat(${Math.min(count, 3)}, 1fr)` }}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '14px', padding: '18px', borderTop: '3px solid var(--border)' }}>
          <Skeleton width="50%" height="10px" style={{ marginBottom: '12px' }} />
          <Skeleton width="40%" height="32px" />
        </div>
      ))}
    </div>
  )
}
