'use client'
import { useState, useRef } from 'react'

export const ATTACHMENT_TYPES = [
  { key: 'istimara_image', labelKey: 'istimara', folder: 'istimara' },
  { key: 'operation_card_image', labelKey: 'operationCard', folder: 'operation_cards' },
  { key: 'periodic_inspection_image', labelKey: 'periodicInspection', folder: 'inspections' },
  { key: 'barrier_seal_image', labelKey: 'barrierSeal', folder: 'barrier_seals' },
  { key: 'vehicle_image', labelKey: 'vehicleImageLabel', folder: 'vehicles' },
  { key: 'handover_receipt_image', labelKey: 'handoverReceipt', folder: 'handover_receipts' },
]

export default function AttachmentMenu({ vehicle, t, isRTL, supabase, canEdit, onUpdate, onPreview }) {
  const [open, setOpen] = useState(null) // attachment key currently being viewed/uploaded
  const [uploading, setUploading] = useState(false)
  const [toast, setToast] = useState('')
  const fileRef = useRef(null)

  const uploadedCount = ATTACHMENT_TYPES.filter(a => vehicle[a.key]).length

  const handlePick = (key) => {
    if (!key) { setOpen(null); return }
    setOpen(key)
  }

  const handleUpload = async (file) => {
    if (!file || !open) return
    const conf = ATTACHMENT_TYPES.find(a => a.key === open)
    if (!conf) return
    setUploading(true)
    try {
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
      const path = `${conf.folder}/${vehicle.id}_${Date.now()}.${ext}`
      const { error: upErr } = await supabase.storage.from('fleet-files').upload(path, file, { upsert: false })
      if (upErr) throw upErr
      const { data: pub } = supabase.storage.from('fleet-files').getPublicUrl(path)
      const { error: dbErr } = await supabase.from('vehicles').update({ [open]: pub.publicUrl }).eq('id', vehicle.id)
      if (dbErr) throw dbErr
      setToast(t.attachmentSaved)
      onUpdate && onUpdate()
      setTimeout(() => { setToast(''); setOpen(null) }, 1200)
    } catch (e) {
      setToast('Error: ' + (e.message || e))
      setTimeout(() => setToast(''), 3000)
    } finally {
      setUploading(false)
    }
  }

  const currentUrl = open ? vehicle[open] : null
  const currentLabel = open ? t[(ATTACHMENT_TYPES.find(a => a.key === open) || {}).labelKey] : ''

  const handleDownload = async () => {
    if (!currentUrl) return
    const ext = (currentUrl.split('.').pop() || 'file').split('?')[0].toLowerCase()
    const safeLabel = (currentLabel || 'attachment').replace(/[\\/:*?"<>|]/g, '')
    const plate = (vehicle.plate_number || vehicle.vehicle_code || vehicle.id).toString().replace(/\s+/g, '_')
    const fname = `${safeLabel}_${plate}.${ext}`
    try {
      const res = await fetch(currentUrl)
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = fname
      document.body.appendChild(a); a.click(); a.remove()
      setTimeout(() => URL.revokeObjectURL(url), 2000)
    } catch (e) {
      // fallback: open in new tab
      window.open(currentUrl, '_blank')
    }
  }

  const selectStyle = { padding: '4px 8px', fontSize: '11px', borderRadius: '6px', border: '1px solid #e8e8e8', background: '#fafafa', fontFamily: 'Cairo, sans-serif', cursor: 'pointer', maxWidth: '140px' }
  const btn = (color, outline) => ({ background: outline ? '#fff' : color, color: outline ? color : '#fff', border: `1.5px solid ${color}`, borderRadius: '6px', padding: '5px 10px', fontSize: '11px', fontWeight: '700', cursor: 'pointer', fontFamily: 'Cairo, sans-serif' })

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <select value="" onChange={e => handlePick(e.target.value)} style={selectStyle}>
        <option value="">📎 {t.attachments} ({uploadedCount}/{ATTACHMENT_TYPES.length})</option>
        {ATTACHMENT_TYPES.map(at => (
          <option key={at.key} value={at.key}>
            {vehicle[at.key] ? '✅' : '⬆️'} {t[at.labelKey]}
          </option>
        ))}
      </select>

      {open && (
        <div onClick={() => !uploading && setOpen(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 250, padding: '16px' }}>
          <div onClick={e => e.stopPropagation()} dir={isRTL ? 'rtl' : 'ltr'} style={{ background: '#fff', borderRadius: '14px', padding: '20px', minWidth: '280px', maxWidth: '420px', boxShadow: '0 8px 24px rgba(0,0,0,0.2)', fontFamily: 'Cairo, sans-serif' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div style={{ fontWeight: '800', fontSize: '14px' }}>📎 {currentLabel}</div>
              <button onClick={() => setOpen(null)} disabled={uploading} style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: '#888' }}>✕</button>
            </div>

            {currentUrl ? (
              <div>
                {(currentUrl || '').toLowerCase().includes('.pdf') ? (
                  <div onClick={() => onPreview && onPreview(currentUrl)} style={{ width: '100%', height: '180px', borderRadius: '8px', border: '1px solid #e8e8e8', background: '#fafafa', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', gap: '8px' }}>
                    <div style={{ fontSize: '48px' }}>📄</div>
                    <div style={{ fontSize: '12px', fontWeight: '700', color: '#555' }}>PDF</div>
                    <div style={{ fontSize: '11px', color: '#888' }}>اضغط للعرض</div>
                  </div>
                ) : (
                  <img src={currentUrl} alt="" style={{ width: '100%', maxHeight: '260px', objectFit: 'contain', borderRadius: '8px', border: '1px solid #e8e8e8', cursor: 'pointer', background: '#fafafa' }} onClick={() => onPreview && onPreview(currentUrl)} />
                )}
                <div style={{ display: 'flex', gap: '8px', marginTop: '12px', flexWrap: 'wrap' }}>
                  <button onClick={() => onPreview && onPreview(currentUrl)} style={btn('#2563eb', true)}>👁️ {t.view}</button>
                  <button onClick={handleDownload} style={btn('#16a34a', true)}>⬇️ تحميل</button>
                  {canEdit && <button onClick={() => fileRef.current?.click()} disabled={uploading} style={btn('#ff6b00')}>{uploading ? t.uploading : `🔄 ${t.replace}`}</button>}
                </div>
              </div>
            ) : (
              <div>
                <div style={{ background: '#fafafa', border: '2px dashed #e8e8e8', borderRadius: '8px', padding: '24px', textAlign: 'center', color: '#888', fontSize: '13px' }}>{t.notUploadedYet}</div>
                {canEdit && (
                  <button onClick={() => fileRef.current?.click()} disabled={uploading} style={{ ...btn('#16a34a'), width: '100%', marginTop: '12px', padding: '10px' }}>
                    {uploading ? t.uploading : `📤 ${t.upload}`}
                  </button>
                )}
              </div>
            )}

            <input ref={fileRef} type="file" accept="image/*,.pdf" style={{ display: 'none' }} onChange={e => { const f = e.target.files[0]; if (f) handleUpload(f); e.target.value = '' }} />
            {toast && <div style={{ marginTop: '12px', textAlign: 'center', color: toast.startsWith('Error') ? '#dc2626' : '#16a34a', fontSize: '12px', fontWeight: '700' }}>{toast}</div>}
          </div>
        </div>
      )}
    </div>
  )
}
