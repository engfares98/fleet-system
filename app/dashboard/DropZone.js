'use client'
import { useState, useRef } from 'react'

export default function DropZone({ onFiles, accept = 'image/*,.pdf', multiple = true, disabled = false, children, label }) {
  const [dragOver, setDragOver] = useState(false)
  const [hover, setHover] = useState(false)
  const inputRef = useRef(null)

  const handleFiles = (fileList) => {
    if (!fileList || fileList.length === 0) return
    const files = multiple ? Array.from(fileList) : [fileList[0]]
    onFiles && onFiles(files)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    if (disabled) return
    handleFiles(e.dataTransfer.files)
  }

  if (children) {
    // Wrap mode — render children with drag handlers
    return (
      <div
        onDragEnter={e => { e.preventDefault(); !disabled && setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDragOver={e => e.preventDefault()}
        onDrop={handleDrop}
        style={{ position: 'relative', borderRadius: 'inherit' }}
      >
        {children}
        {dragOver && (
          <div style={{ position: 'absolute', inset: 0, background: 'var(--accent-soft-strong)', border: '2.5px dashed var(--accent)', borderRadius: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', zIndex: 10, fontWeight: '700', color: 'var(--accent)', fontSize: '14px' }}>
            📥 أفلت الملف هنا
          </div>
        )}
      </div>
    )
  }

  // Standalone mode — show a drop area
  const active = dragOver || hover
  return (
    <label
      onDragEnter={e => { e.preventDefault(); !disabled && setDragOver(true) }}
      onDragLeave={() => setDragOver(false)}
      onDragOver={e => e.preventDefault()}
      onDrop={handleDrop}
      onMouseEnter={() => !disabled && setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'block',
        width: '100%',
        padding: '24px 16px',
        border: `2.5px dashed ${active ? 'var(--accent)' : 'var(--border)'}`,
        background: active ? 'var(--accent-soft)' : 'var(--surface-2)',
        borderRadius: '12px',
        textAlign: 'center',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        transition: 'all 0.2s',
        fontFamily: 'Cairo, sans-serif',
      }}
    >
      <div style={{ fontSize: '28px', marginBottom: '8px' }}>{active ? '📥' : '📎'}</div>
      <div style={{ fontWeight: '700', fontSize: '13px', color: active ? 'var(--accent)' : 'var(--text)' }}>
        {active ? 'أفلت الملف هنا' : (label || 'اسحب الملف وأفلته أو اضغط للاختيار')}
      </div>
      <div style={{ fontSize: '11px', color: 'var(--text-subtle)', marginTop: '4px' }}>
        صور أو PDF · {multiple ? 'يمكن اختيار عدة ملفات' : 'ملف واحد'}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        disabled={disabled}
        style={{ display: 'none' }}
        onChange={e => { handleFiles(e.target.files); e.target.value = '' }}
      />
    </label>
  )
}
