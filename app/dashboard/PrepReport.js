'use client'
import { useState, useMemo, useRef } from 'react'

const C = { orange: '#ff6b00', orangeLight: '#fff7f2', white: '#fff', gray: '#f8f9fa', text: '#1a1a1a', muted: '#888', border: '#e8e8e8' }

const getRegion = (v) => {
  const code = v.vehicle_code || v.plate_number || ''
  const firstChar = code.trim().toUpperCase()[0]
  const map = { 'N': 'north', 'S': 'south', 'E': 'east', 'W': 'west' }
  return map[firstChar] || 'unknown'
}

export default function PrepReport({ vehicles, drivers, t, isRTL, lang, isMobile, currentUser }) {
  const [region, setRegion] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [selectedIds, setSelectedIds] = useState({}) // { vehicleId: true }
  const [assignedDriver, setAssignedDriver] = useState({}) // { vehicleId: driverId }
  const [showPreview, setShowPreview] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [toast, setToast] = useState(null)
  const previewRef = useRef(null)

  const regionOptions = [
    ['all', t.allRegions],
    ['north', t.north],
    ['south', t.south],
    ['east', t.east],
    ['west', t.west],
    ['unknown', t.unknownRegion],
  ]

  const statusOptions = [
    ['all', t.allStatuses],
    ['ready', t.onlyReady],
    ['in_progress', t.onlyInProgress],
    ['not_ready', t.onlyNotReady],
  ]

  const filteredVehicles = useMemo(() => {
    return vehicles.filter(v => {
      if (region !== 'all' && getRegion(v) !== region) return false
      if (statusFilter !== 'all' && (v.preparation_status || 'not_ready') !== statusFilter) return false
      if (search) {
        const q = search.toLowerCase()
        const hay = [v.plate_number, v.vehicle_code, v.brand, v.model, v.type, v.color].filter(Boolean).join(' ').toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [vehicles, region, statusFilter, search])

  const selectedVehicles = useMemo(() => {
    return filteredVehicles.filter(v => selectedIds[v.id])
  }, [filteredVehicles, selectedIds])

  const allFilteredSelected = filteredVehicles.length > 0 && filteredVehicles.every(v => selectedIds[v.id])

  const toggleAll = () => {
    if (allFilteredSelected) {
      const next = { ...selectedIds }
      filteredVehicles.forEach(v => { delete next[v.id] })
      setSelectedIds(next)
    } else {
      const next = { ...selectedIds }
      filteredVehicles.forEach(v => { next[v.id] = true })
      setSelectedIds(next)
    }
  }

  const toggleOne = (id) => {
    setSelectedIds(prev => {
      const next = { ...prev }
      if (next[id]) delete next[id]
      else next[id] = true
      return next
    })
  }

  const setDriverFor = (vehicleId, driverId) => {
    setAssignedDriver(prev => ({ ...prev, [vehicleId]: driverId }))
  }

  const prepLabel = (s) => s === 'ready' ? t.ready : s === 'in_progress' ? t.inProgress : t.notReady
  const prepBg = (s) => s === 'ready' ? '#f0fdf4' : s === 'in_progress' ? '#fffbeb' : '#fef2f2'
  const prepColor = (s) => s === 'ready' ? '#16a34a' : s === 'in_progress' ? '#d97706' : '#dc2626'
  const regionLabel = (r) => ({ north: t.north, south: t.south, east: t.east, west: t.west, unknown: t.unknownRegion }[r] || t.unknownRegion)

  const todayStr = new Date().toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-GB', { year: 'numeric', month: 'long', day: 'numeric' })
  const reportNo = useMemo(() => `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${Math.floor(Math.random() * 9000 + 1000)}`, [showPreview])

  const summaryStats = useMemo(() => {
    const list = selectedVehicles
    const ready = list.filter(v => v.preparation_status === 'ready').length
    const ip = list.filter(v => v.preparation_status === 'in_progress').length
    const nr = list.filter(v => !v.preparation_status || v.preparation_status === 'not_ready').length
    return { total: list.length, ready, ip, nr }
  }, [selectedVehicles])

  const showToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3500)
  }

  const generatePDF = async (action /* 'download' | 'share' */) => {
    if (selectedVehicles.length === 0) { showToast(t.selectVehiclesFirst); return }
    setShowPreview(true)
    setGenerating(true)
    // wait for the preview to render
    await new Promise(r => setTimeout(r, 350))
    try {
      const html2canvas = (await import('html2canvas')).default
      const { jsPDF } = await import('jspdf')
      const node = previewRef.current
      if (!node) throw new Error('preview node missing')
      const canvas = await html2canvas(node, { scale: 2, backgroundColor: '#ffffff', useCORS: true, logging: false })
      const imgData = canvas.toDataURL('image/jpeg', 0.92)
      const pdf = new jsPDF({ unit: 'pt', format: 'a4', orientation: 'portrait' })
      const pageW = pdf.internal.pageSize.getWidth()
      const pageH = pdf.internal.pageSize.getHeight()
      const ratio = canvas.width / canvas.height
      let imgW = pageW - 40
      let imgH = imgW / ratio
      if (imgH < pageH - 40) {
        // fits on one page
        pdf.addImage(imgData, 'JPEG', 20, 20, imgW, imgH)
      } else {
        // split across multiple pages
        imgH = pageH - 40
        imgW = imgH * ratio
        if (imgW > pageW - 40) imgW = pageW - 40
        // simple multi-page: slice canvas vertically
        const sliceHeight = (canvas.width / (pageW - 40)) * (pageH - 40)
        let y = 0
        let page = 0
        while (y < canvas.height) {
          const sliceCanvas = document.createElement('canvas')
          sliceCanvas.width = canvas.width
          sliceCanvas.height = Math.min(sliceHeight, canvas.height - y)
          const ctx = sliceCanvas.getContext('2d')
          ctx.fillStyle = '#fff'
          ctx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height)
          ctx.drawImage(canvas, 0, y, canvas.width, sliceCanvas.height, 0, 0, canvas.width, sliceCanvas.height)
          const slimg = sliceCanvas.toDataURL('image/jpeg', 0.92)
          if (page > 0) pdf.addPage()
          const sH = (sliceCanvas.height * (pageW - 40)) / canvas.width
          pdf.addImage(slimg, 'JPEG', 20, 20, pageW - 40, sH)
          y += sliceHeight
          page += 1
        }
      }
      const fileName = `${(t.prepReportTitle || 'preparation-report').replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`
      const blob = pdf.output('blob')
      const file = new File([blob], fileName, { type: 'application/pdf' })

      if (action === 'share' && navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: t.prepReportTitle, text: t.reportSubtitle })
          showToast(t.pdfReady)
        } catch (err) {
          // user cancelled or share failed → fall back to download
          pdf.save(fileName)
          showToast(t.pdfReady)
        }
      } else if (action === 'share') {
        pdf.save(fileName)
        showToast(t.shareNotSupported)
      } else {
        pdf.save(fileName)
        showToast(t.pdfReady)
      }
    } catch (e) {
      console.error(e)
      showToast('Error: ' + (e.message || e))
    } finally {
      setGenerating(false)
    }
  }

  const inputStyle = { width: '100%', padding: '10px 14px', background: '#fafafa', border: `1.5px solid ${C.border}`, borderRadius: '8px', color: C.text, fontSize: '13px', fontFamily: 'Cairo, sans-serif', outline: 'none', boxSizing: 'border-box' }
  const labelStyle = { color: '#555', fontSize: '12px', fontWeight: '600', display: 'block', marginBottom: '6px' }
  const card = { background: C.white, border: `1px solid ${C.border}`, borderRadius: '14px', padding: isMobile ? '14px' : '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }
  const btn = (c, outline) => ({ background: outline ? C.white : (c || C.orange), color: outline ? (c || C.orange) : C.white, border: `2px solid ${c || C.orange}`, borderRadius: '9px', padding: '9px 16px', fontSize: '13px', fontWeight: '700', fontFamily: 'Cairo, sans-serif', cursor: 'pointer' })

  return (
    <div style={{ ...card, marginTop: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
        <div>
          <div style={{ fontWeight: '800', fontSize: '15px' }}>📄 {t.prepReportTitle}</div>
          <div style={{ color: C.muted, fontSize: '12px', marginTop: '4px' }}>{t.prepReportDesc}</div>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button onClick={() => generatePDF('download')} disabled={generating || selectedVehicles.length === 0} style={{ ...btn('#16a34a'), opacity: (generating || selectedVehicles.length === 0) ? 0.6 : 1 }}>
            {generating ? t.generating : t.downloadPDF}
          </button>
          <button onClick={() => generatePDF('share')} disabled={generating || selectedVehicles.length === 0} style={{ ...btn(C.orange), opacity: (generating || selectedVehicles.length === 0) ? 0.6 : 1 }}>
            {generating ? t.generating : t.sharePDF}
          </button>
          <button onClick={() => setShowPreview(true)} disabled={selectedVehicles.length === 0} style={{ ...btn('#2563eb', true), opacity: selectedVehicles.length === 0 ? 0.6 : 1 }}>
            {t.previewReport}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div style={{ background: '#fafafa', borderRadius: '10px', padding: '12px', marginTop: '12px' }}>
        <div style={{ fontWeight: '700', fontSize: '12px', color: C.muted, marginBottom: '10px' }}>{t.prepFilters}</div>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr', gap: '12px' }}>
          <div>
            <label style={labelStyle}>{t.region}</label>
            <select style={inputStyle} value={region} onChange={e => setRegion(e.target.value)}>
              {regionOptions.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>{t.statusFilter}</label>
            <select style={inputStyle} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              {statusOptions.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>{t.searchVehicles}</label>
            <input style={inputStyle} value={search} onChange={e => setSearch(e.target.value)} placeholder={t.searchVehicles} />
          </div>
        </div>
      </div>

      {/* Vehicle list */}
      <div style={{ marginTop: '14px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ fontWeight: '700', fontSize: '13px' }}>
            🚛 {t.selectVehicles}
            <span style={{ color: C.muted, fontWeight: '500', marginInlineStart: '8px' }}>
              ({t.selectedCount}: {selectedVehicles.length} / {filteredVehicles.length})
            </span>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={toggleAll} style={{ ...btn(C.orange, true), padding: '6px 12px', fontSize: '11px' }}>
              {allFilteredSelected ? t.deselectAll : t.selectAll}
            </button>
          </div>
        </div>

        <div style={{ maxHeight: '420px', overflowY: 'auto', border: `1px solid ${C.border}`, borderRadius: '10px' }}>
          {filteredVehicles.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: C.muted, fontSize: '13px' }}>{t.noResults}</div>
          ) : (
            filteredVehicles.map((v, i) => {
              const checked = !!selectedIds[v.id]
              const status = v.preparation_status || 'not_ready'
              return (
                <div key={v.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderBottom: i < filteredVehicles.length - 1 ? `1px solid ${C.border}` : 'none', background: checked ? '#fff7f2' : '#fff', flexWrap: 'wrap' }}>
                  <input type="checkbox" checked={checked} onChange={() => toggleOne(v.id)} style={{ width: '18px', height: '18px', accentColor: C.orange, cursor: 'pointer' }} />
                  <div style={{ flex: '1 1 200px', minWidth: 0 }}>
                    <div style={{ fontWeight: '700', fontSize: '13px', color: C.text }}>
                      {v.plate_number || '—'} {v.vehicle_code && <span style={{ color: C.muted, fontWeight: '500', fontSize: '11px' }}>· {v.vehicle_code}</span>}
                    </div>
                    <div style={{ fontSize: '11px', color: C.muted, marginTop: '2px' }}>
                      {[v.brand, v.model, v.type].filter(Boolean).join(' · ')} {v.year ? `· ${v.year}` : ''}
                    </div>
                  </div>
                  <span style={{ background: '#eff6ff', color: '#2563eb', padding: '3px 8px', borderRadius: '20px', fontSize: '10px', fontWeight: '700' }}>
                    {regionLabel(getRegion(v))}
                  </span>
                  <span style={{ background: prepBg(status), color: prepColor(status), padding: '3px 10px', borderRadius: '20px', fontSize: '10px', fontWeight: '700' }}>
                    {prepLabel(status)}
                  </span>
                  {checked && (
                    <select
                      style={{ ...inputStyle, width: 'auto', minWidth: '160px', padding: '6px 10px', fontSize: '12px' }}
                      value={assignedDriver[v.id] || ''}
                      onChange={e => setDriverFor(v.id, e.target.value)}
                    >
                      <option value="">{t.noDriver}</option>
                      {drivers.map(d => (
                        <option key={d.id} value={d.id}>{d.full_name}{d.file_number ? ` (${d.file_number})` : ''}</option>
                      ))}
                    </select>
                  )}
                </div>
              )
            })
          )}
        </div>
      </div>

      {toast && (
        <div style={{ position: 'fixed', bottom: '20px', left: '50%', transform: 'translateX(-50%)', background: '#1a1a1a', color: '#fff', padding: '10px 18px', borderRadius: '10px', fontSize: '13px', zIndex: 300, boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}>
          {toast}
        </div>
      )}

      {/* Preview Modal */}
      {showPreview && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: '16px' }}>
          <div style={{ background: '#fff', borderRadius: '14px', maxWidth: '900px', width: '100%', maxHeight: '92vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '14px 20px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <div style={{ fontWeight: '800' }}>👁️ {t.previewReport}</div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button onClick={() => generatePDF('download')} disabled={generating} style={{ ...btn('#16a34a'), padding: '7px 12px', fontSize: '12px' }}>{generating ? t.generating : t.downloadPDF}</button>
                <button onClick={() => generatePDF('share')} disabled={generating} style={{ ...btn(C.orange), padding: '7px 12px', fontSize: '12px' }}>{generating ? t.generating : t.sharePDF}</button>
                <button onClick={() => setShowPreview(false)} style={{ ...btn('#888', true), padding: '7px 12px', fontSize: '12px' }}>{t.closePreview}</button>
              </div>
            </div>
            <div style={{ overflow: 'auto', padding: '20px', background: '#f1f3f5' }}>
              {/* The actual rendered report — what gets captured to PDF */}
              <div ref={previewRef} dir={isRTL ? 'rtl' : 'ltr'} style={{ width: '794px', minHeight: '1123px', margin: '0 auto', background: '#fff', padding: '36px 40px', fontFamily: 'Cairo, sans-serif', color: '#1a1a1a', fontSize: '12px', lineHeight: '1.55', boxShadow: '0 4px 16px rgba(0,0,0,0.12)' }}>
                {/* Header */}
                <div style={{ borderBottom: `3px solid ${C.orange}`, paddingBottom: '16px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: '20px', fontWeight: '900', color: C.orange }}>{t.prepReportTitle}</div>
                    <div style={{ fontSize: '12px', color: '#555', marginTop: '4px' }}>{t.reportSubtitle}</div>
                  </div>
                  <div style={{ textAlign: isRTL ? 'left' : 'right', fontSize: '11px', color: '#555' }}>
                    <div><strong>{t.reportNumber}:</strong> {reportNo}</div>
                    <div><strong>{t.reportDate}:</strong> {todayStr}</div>
                    {currentUser?.email && <div><strong>{t.preparedBy}:</strong> {currentUser.email}</div>}
                  </div>
                </div>

                {/* Filter info */}
                <div style={{ background: '#fafafa', border: `1px solid ${C.border}`, borderRadius: '10px', padding: '12px 16px', marginBottom: '20px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', fontSize: '11px' }}>
                  <div><span style={{ color: '#777' }}>{t.region}: </span><strong>{region === 'all' ? t.allRegions : regionLabel(region)}</strong></div>
                  <div><span style={{ color: '#777' }}>{t.statusFilter}: </span><strong>{statusFilter === 'all' ? t.allStatuses : statusFilter === 'ready' ? t.ready : statusFilter === 'in_progress' ? t.inProgress : t.notReady}</strong></div>
                  <div><span style={{ color: '#777' }}>{t.totalSelected}: </span><strong>{summaryStats.total}</strong></div>
                </div>

                {/* Summary cards */}
                <div style={{ fontWeight: '800', fontSize: '13px', marginBottom: '10px' }}>{t.summary}</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '24px' }}>
                  {[
                    [t.totalSelected, summaryStats.total, '#2563eb'],
                    [t.ready, summaryStats.ready, '#16a34a'],
                    [t.inProgress, summaryStats.ip, '#d97706'],
                    [t.notReady, summaryStats.nr, '#dc2626'],
                  ].map(([label, val, color]) => (
                    <div key={label} style={{ background: '#fff', border: `1px solid ${C.border}`, borderTop: `3px solid ${color}`, borderRadius: '8px', padding: '10px 12px' }}>
                      <div style={{ fontSize: '10px', color: '#777' }}>{label}</div>
                      <div style={{ fontSize: '20px', fontWeight: '900', color }}>{val}</div>
                    </div>
                  ))}
                </div>

                {/* Details table */}
                <div style={{ fontWeight: '800', fontSize: '13px', marginBottom: '10px' }}>{t.detailsTable}</div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                  <thead>
                    <tr style={{ background: C.orange, color: '#fff' }}>
                      <th style={{ padding: '8px 6px', textAlign: 'center', border: '1px solid #e5751c', width: '32px' }}>{t.no}</th>
                      <th style={{ padding: '8px 6px', textAlign: isRTL ? 'right' : 'left', border: '1px solid #e5751c' }}>{t.plateNumber}</th>
                      <th style={{ padding: '8px 6px', textAlign: isRTL ? 'right' : 'left', border: '1px solid #e5751c' }}>{t.vehicleCode}</th>
                      <th style={{ padding: '8px 6px', textAlign: isRTL ? 'right' : 'left', border: '1px solid #e5751c' }}>{t.type}</th>
                      <th style={{ padding: '8px 6px', textAlign: isRTL ? 'right' : 'left', border: '1px solid #e5751c' }}>{t.region}</th>
                      <th style={{ padding: '8px 6px', textAlign: isRTL ? 'right' : 'left', border: '1px solid #e5751c' }}>{t.preparationStatus}</th>
                      <th style={{ padding: '8px 6px', textAlign: isRTL ? 'right' : 'left', border: '1px solid #e5751c' }}>{t.assignDriver}</th>
                      <th style={{ padding: '8px 6px', textAlign: isRTL ? 'right' : 'left', border: '1px solid #e5751c' }}>{t.notesField}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedVehicles.length === 0 ? (
                      <tr><td colSpan={8} style={{ padding: '20px', textAlign: 'center', border: `1px solid ${C.border}`, color: C.muted }}>{t.noVehicleSelected}</td></tr>
                    ) : selectedVehicles.map((v, i) => {
                      const drv = drivers.find(d => d.id === assignedDriver[v.id])
                      const status = v.preparation_status || 'not_ready'
                      return (
                        <tr key={v.id} style={{ background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                          <td style={{ padding: '7px 6px', textAlign: 'center', border: `1px solid ${C.border}`, fontWeight: '700' }}>{i + 1}</td>
                          <td style={{ padding: '7px 6px', border: `1px solid ${C.border}`, fontWeight: '700' }}>{v.plate_number || '—'}</td>
                          <td style={{ padding: '7px 6px', border: `1px solid ${C.border}` }}>{v.vehicle_code || '—'}</td>
                          <td style={{ padding: '7px 6px', border: `1px solid ${C.border}` }}>{[v.brand, v.model, v.type].filter(Boolean).join(' ') || '—'}</td>
                          <td style={{ padding: '7px 6px', border: `1px solid ${C.border}` }}>{regionLabel(getRegion(v))}</td>
                          <td style={{ padding: '7px 6px', border: `1px solid ${C.border}` }}>
                            <span style={{ background: prepBg(status), color: prepColor(status), padding: '2px 8px', borderRadius: '12px', fontSize: '10px', fontWeight: '700' }}>{prepLabel(status)}</span>
                          </td>
                          <td style={{ padding: '7px 6px', border: `1px solid ${C.border}` }}>
                            {drv ? (<><strong>{drv.full_name}</strong>{drv.phone && <div style={{ fontSize: '10px', color: '#777' }}>{drv.phone}</div>}</>) : <span style={{ color: '#aaa' }}>—</span>}
                          </td>
                          <td style={{ padding: '7px 6px', border: `1px solid ${C.border}`, color: '#aaa' }}>—</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>

                {/* Footer / signature area */}
                <div style={{ marginTop: '40px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px', paddingTop: '20px', borderTop: `1px dashed ${C.border}`, fontSize: '11px' }}>
                  <div>
                    <div style={{ color: '#777', marginBottom: '40px' }}>{t.preparedBy}:</div>
                    <div style={{ borderTop: `1px solid #1a1a1a`, paddingTop: '4px', fontWeight: '700' }}>{currentUser?.email || '—'}</div>
                  </div>
                  <div>
                    <div style={{ color: '#777', marginBottom: '40px' }}>{isRTL ? 'التوقيع' : 'Signature'}:</div>
                    <div style={{ borderTop: `1px solid #1a1a1a`, paddingTop: '4px' }}>&nbsp;</div>
                  </div>
                </div>

                <div style={{ textAlign: 'center', color: '#aaa', fontSize: '10px', marginTop: '24px' }}>
                  {isRTL ? 'أسطول مشاريع نظافة المدينة المنورة' : 'Madinah Cleaning Fleet Management'} · {todayStr}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
