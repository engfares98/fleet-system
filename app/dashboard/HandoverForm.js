'use client'
import { useState, useRef } from 'react'

const C = { orange: '#ff6b00', white: '#fff', text: '#1a1a1a', muted: '#888', border: '#e8e8e8' }

const initialData = {
  driverName: '', driverPosition: '', employeeNumber: '', iqamaNumber: '', iqamaExpiry: '',
  licenseNumber: '', licenseExpiry: '', dob: '', mobile: '', recipientSignature: '',
  company: '', sector: '', project: '', city: '', directManager: '', contactNumber: '',
  vehicleType: '', vehicleModel: '', color: '', year: '', plateNumber: '', vehicleExpiry: '',
  accessories: '', odometer: '',
  note1: '', note2: '', note3: '', note4: '', note5: '',
  issuerName: '', issuerFile: '', issuerSignature: '',
  areaManagerName: '', areaManagerSig: '',
  movementOfficerName: '', movementOfficerSig: '',
  centralDate: '',
}

export default function HandoverForm({ isMobile }) {
  const [data, setData] = useState(initialData)
  const [showPreview, setShowPreview] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [toast, setToast] = useState('')
  const previewRef = useRef(null)

  const set = (k) => (e) => setData(p => ({ ...p, [k]: e.target.value }))
  const reset = () => setData(initialData)
  const showToast = (m) => { setToast(m); setTimeout(() => setToast(''), 3000) }

  const generatePDF = async (action) => {
    setShowPreview(true)
    setGenerating(true)
    await new Promise(r => setTimeout(r, 350))
    try {
      const htmlToImage = await import('html-to-image')
      const { jsPDF } = await import('jspdf')
      const node = previewRef.current
      if (!node) throw new Error('preview node missing')
      const imgs = Array.from(node.querySelectorAll('img'))
      await Promise.all(imgs.map(img => (img.complete && img.naturalWidth > 0)
        ? Promise.resolve()
        : new Promise(res => { img.onload = res; img.onerror = res; setTimeout(res, 2500) })
      ))
      const dataUrl = await htmlToImage.toPng(node, { pixelRatio: 2, backgroundColor: '#ffffff', cacheBust: true, style: { fontFamily: 'Cairo, sans-serif' } })
      const tmpImg = new Image()
      tmpImg.src = dataUrl
      await new Promise(r => { tmpImg.onload = r; tmpImg.onerror = r; setTimeout(r, 3000) })
      const cw = tmpImg.naturalWidth || tmpImg.width
      const ch = tmpImg.naturalHeight || tmpImg.height
      const pdf = new jsPDF({ unit: 'pt', format: 'a4', orientation: 'portrait' })
      const pageW = pdf.internal.pageSize.getWidth()
      const pageH = pdf.internal.pageSize.getHeight()
      const ratio = cw / ch
      const imgW = pageW - 30
      const imgH = imgW / ratio
      if (imgH < pageH - 30) {
        pdf.addImage(dataUrl, 'PNG', 15, 15, imgW, imgH)
      } else {
        const sliceHpx = (cw / (pageW - 30)) * (pageH - 30)
        let y = 0, page = 0
        while (y < ch) {
          const slc = document.createElement('canvas')
          slc.width = cw
          slc.height = Math.min(sliceHpx, ch - y)
          const ctx = slc.getContext('2d')
          ctx.fillStyle = '#fff'
          ctx.fillRect(0, 0, slc.width, slc.height)
          ctx.drawImage(tmpImg, 0, y, cw, slc.height, 0, 0, cw, slc.height)
          const slimg = slc.toDataURL('image/png')
          if (page > 0) pdf.addPage()
          const sH = (slc.height * (pageW - 30)) / cw
          pdf.addImage(slimg, 'PNG', 15, 15, pageW - 30, sH)
          y += sliceHpx
          page += 1
        }
      }
      const plate = (data.plateNumber || 'vehicle').replace(/\s+/g, '_')
      const fileName = `Vehicle_Handover - ${plate} - ${new Date().toISOString().slice(0, 10)}.pdf`.replace(/[\\/:*?"<>|]/g, '')
      const blob = pdf.output('blob')
      if (action === 'print') {
        const url = URL.createObjectURL(blob)
        const w = window.open(url, '_blank')
        if (w) w.addEventListener('load', () => { try { w.print() } catch {} })
        showToast('🖨️ جاهز للطباعة')
      } else if (action === 'share') {
        const file = new File([blob], fileName, { type: 'application/pdf' })
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          try { await navigator.share({ files: [file], title: 'نموذج استلام مركبة' }); showToast('✅ تم') }
          catch { pdf.save(fileName); showToast('✅ تم التحميل') }
        } else { pdf.save(fileName); showToast('✅ تم التحميل') }
      } else {
        pdf.save(fileName)
        showToast('✅ تم التحميل')
      }
    } catch (e) {
      console.error(e)
      showToast('Error: ' + (e.message || e))
    } finally {
      setGenerating(false)
    }
  }

  const inp = { width: '100%', padding: '8px 10px', background: '#fafafa', border: `1px solid ${C.border}`, borderRadius: '6px', color: C.text, fontSize: '12px', fontFamily: 'Cairo, sans-serif', outline: 'none', boxSizing: 'border-box' }
  const lbl = { color: '#555', fontSize: '11px', fontWeight: '600', display: 'block', marginBottom: '4px' }
  const card = { background: C.white, border: `1px solid ${C.border}`, borderRadius: '14px', padding: isMobile ? '14px' : '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', marginBottom: '14px' }
  const btn = (c, outline) => ({ background: outline ? C.white : (c || C.orange), color: outline ? (c || C.orange) : C.white, border: `2px solid ${c || C.orange}`, borderRadius: '9px', padding: '10px 16px', fontSize: '13px', fontWeight: '700', fontFamily: 'Cairo, sans-serif', cursor: 'pointer' })
  const secT = { fontWeight: '800', fontSize: '14px', color: C.orange, marginBottom: '12px', borderBottom: `2px solid ${C.orange}`, paddingBottom: '4px' }
  const grid3 = { display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(3, 1fr)', gap: '10px' }

  // Print styles - matches the original template (monochrome: black on white/gray)
  const tCell = { border: '1px solid #000', padding: '5px 8px', fontSize: '11px', verticalAlign: 'middle', color: '#000' }
  const tVal = { ...tCell, background: '#fff', height: '22px', fontWeight: '700' }
  const tLabAr = { ...tCell, background: '#F2F2F2', fontWeight: '700', textAlign: 'right', whiteSpace: 'nowrap' }
  const tLabEn = { ...tCell, background: '#F2F2F2', fontWeight: '700', textAlign: 'left', fontSize: '10px', whiteSpace: 'nowrap' }
  const tSideAr = { border: '1px solid #000', background: '#F2F2F2', color: '#000', fontWeight: '900', textAlign: 'center', whiteSpace: 'nowrap', width: '32px', writingMode: 'vertical-rl', padding: '6px 4px' }
  const tSideEn = { border: '1px solid #000', background: '#F2F2F2', color: '#000', fontWeight: '900', textAlign: 'center', whiteSpace: 'nowrap', width: '32px', writingMode: 'vertical-rl', padding: '6px 4px', fontSize: '10px' }
  const tSec = { background: '#F2F2F2', color: '#000', fontWeight: '900', textAlign: 'center', padding: '6px 8px', fontSize: '12px', border: '1px solid #000' }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <div style={{ fontSize: isMobile ? '16px' : '19px', fontWeight: '800' }}>📋 نموذج استلام / تسليم مركبة</div>
          <div style={{ color: C.muted, fontSize: '12px', marginTop: '4px' }}>عبئ البيانات يدوياً ثم اطبع أو حمّل النموذج</div>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button onClick={() => setShowPreview(true)} style={btn('#2563eb', true)}>👁️ معاينة</button>
          <button onClick={() => generatePDF('print')} disabled={generating} style={btn('#7c3aed')}>🖨️ طباعة</button>
          <button onClick={() => generatePDF('download')} disabled={generating} style={btn('#16a34a')}>⬇️ تحميل PDF</button>
          <button onClick={() => generatePDF('share')} disabled={generating} style={btn(C.orange)}>📤 مشاركة</button>
          <button onClick={reset} style={btn('#888', true)}>🗑️ مسح الكل</button>
        </div>
      </div>

      {/* Driver section */}
      <div style={card}>
        <div style={secT}>👤 بيانات السائق</div>
        <div style={grid3}>
          <div><label style={lbl}>الاسم</label><input style={inp} value={data.driverName} onChange={set('driverName')} /></div>
          <div><label style={lbl}>الوظيفة</label><input style={inp} value={data.driverPosition} onChange={set('driverPosition')} /></div>
          <div><label style={lbl}>الرقم الوظيفي</label><input style={inp} value={data.employeeNumber} onChange={set('employeeNumber')} /></div>
          <div><label style={lbl}>رقم البطاقة / الإقامة</label><input style={inp} value={data.iqamaNumber} onChange={set('iqamaNumber')} /></div>
          <div><label style={lbl}>تاريخ انتهاء الإقامة</label><input style={inp} value={data.iqamaExpiry} onChange={set('iqamaExpiry')} /></div>
          <div><label style={lbl}>رقم رخصة القيادة</label><input style={inp} value={data.licenseNumber} onChange={set('licenseNumber')} /></div>
          <div><label style={lbl}>تاريخ انتهاء الرخصة</label><input style={inp} value={data.licenseExpiry} onChange={set('licenseExpiry')} /></div>
          <div><label style={lbl}>تاريخ الميلاد</label><input style={inp} value={data.dob} onChange={set('dob')} /></div>
          <div><label style={lbl}>رقم الجوال</label><input style={inp} value={data.mobile} onChange={set('mobile')} /></div>
        </div>
      </div>

      {/* Work site */}
      <div style={card}>
        <div style={secT}>🏢 بيانات موقع العمل</div>
        <div style={grid3}>
          <div><label style={lbl}>الشركة</label><input style={inp} value={data.company} onChange={set('company')} /></div>
          <div><label style={lbl}>القطاع</label><input style={inp} value={data.sector} onChange={set('sector')} /></div>
          <div><label style={lbl}>المشروع</label><input style={inp} value={data.project} onChange={set('project')} /></div>
          <div><label style={lbl}>المدينة</label><input style={inp} value={data.city} onChange={set('city')} /></div>
          <div><label style={lbl}>المدير المباشر</label><input style={inp} value={data.directManager} onChange={set('directManager')} /></div>
          <div><label style={lbl}>رقم الاتصال</label><input style={inp} value={data.contactNumber} onChange={set('contactNumber')} /></div>
        </div>
      </div>

      {/* Vehicle */}
      <div style={card}>
        <div style={secT}>🚛 بيانات المركبة</div>
        <div style={grid3}>
          <div><label style={lbl}>نوع المركبة</label><input style={inp} value={data.vehicleType} onChange={set('vehicleType')} /></div>
          <div><label style={lbl}>طراز المركبة</label><input style={inp} value={data.vehicleModel} onChange={set('vehicleModel')} /></div>
          <div><label style={lbl}>اللون</label><input style={inp} value={data.color} onChange={set('color')} /></div>
          <div><label style={lbl}>الموديل</label><input style={inp} value={data.year} onChange={set('year')} /></div>
          <div><label style={lbl}>رقم اللوحة</label><input style={inp} value={data.plateNumber} onChange={set('plateNumber')} /></div>
          <div><label style={lbl}>تاريخ انتهاء الاستمارة</label><input style={inp} value={data.vehicleExpiry} onChange={set('vehicleExpiry')} /></div>
          <div><label style={lbl}>الملحقات</label><input style={inp} value={data.accessories} onChange={set('accessories')} /></div>
          <div><label style={lbl}>عداد السيارة</label><input style={inp} value={data.odometer} onChange={set('odometer')} /></div>
        </div>
      </div>

      {/* Notes */}
      <div style={card}>
        <div style={secT}>📝 ملاحظات المركبة</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '8px' }}>
          {[1, 2, 3, 4, 5].map(n => (
            <div key={n}><label style={lbl}>ملاحظة {n}</label><input style={inp} value={data['note' + n]} onChange={set('note' + n)} /></div>
          ))}
        </div>
      </div>

      {/* Issuer */}
      <div style={card}>
        <div style={secT}>🖋️ بيانات المسلم</div>
        <div style={grid3}>
          <div><label style={lbl}>اسم المسلم</label><input style={inp} value={data.issuerName} onChange={set('issuerName')} /></div>
          <div><label style={lbl}>رقم الملف</label><input style={inp} value={data.issuerFile} onChange={set('issuerFile')} /></div>
          <div><label style={lbl}>التوقيع</label><input style={inp} value={data.issuerSignature} onChange={set('issuerSignature')} /></div>
        </div>
      </div>

      {/* Approvals */}
      <div style={card}>
        <div style={secT}>✍️ التوقيعات</div>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(2, 1fr)', gap: '14px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ fontWeight: '700', fontSize: '12px', color: '#555' }}>مدير المنطقة</div>
            <div><label style={lbl}>الاسم</label><input style={inp} value={data.areaManagerName} onChange={set('areaManagerName')} /></div>
            <div><label style={lbl}>التوقيع</label><input style={inp} value={data.areaManagerSig} onChange={set('areaManagerSig')} /></div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ fontWeight: '700', fontSize: '12px', color: '#555' }}>مسؤول الحركة</div>
            <div><label style={lbl}>الاسم</label><input style={inp} value={data.movementOfficerName} onChange={set('movementOfficerName')} /></div>
            <div><label style={lbl}>التوقيع</label><input style={inp} value={data.movementOfficerSig} onChange={set('movementOfficerSig')} /></div>
          </div>
        </div>
        <div style={{ marginTop: '12px' }}>
          <label style={lbl}>تاريخ الحركة المركزية</label><input style={inp} value={data.centralDate} onChange={set('centralDate')} />
        </div>
      </div>

      {toast && <div style={{ position: 'fixed', bottom: '20px', left: '50%', transform: 'translateX(-50%)', background: '#1a1a1a', color: '#fff', padding: '10px 18px', borderRadius: '10px', fontSize: '13px', zIndex: 300 }}>{toast}</div>}

      {showPreview && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: '16px' }}>
          <div style={{ background: '#fff', borderRadius: '14px', maxWidth: '900px', width: '100%', maxHeight: '92vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '14px 20px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <div style={{ fontWeight: '800' }}>👁️ معاينة النموذج</div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button onClick={() => generatePDF('print')} disabled={generating} style={{ ...btn('#7c3aed'), padding: '7px 12px', fontSize: '12px' }}>🖨️ طباعة</button>
                <button onClick={() => generatePDF('download')} disabled={generating} style={{ ...btn('#16a34a'), padding: '7px 12px', fontSize: '12px' }}>⬇️ تحميل</button>
                <button onClick={() => generatePDF('share')} disabled={generating} style={{ ...btn(C.orange), padding: '7px 12px', fontSize: '12px' }}>📤 مشاركة</button>
                <button onClick={() => setShowPreview(false)} style={{ ...btn('#888', true), padding: '7px 12px', fontSize: '12px' }}>إغلاق</button>
              </div>
            </div>
            <div style={{ overflow: 'auto', padding: '20px', background: '#f1f3f5' }}>
              <div ref={previewRef} dir="rtl" style={{ width: '794px', minHeight: '1123px', margin: '0 auto', background: '#fff', padding: '18px 22px', fontFamily: 'Cairo, sans-serif', color: '#1a1a1a', fontSize: '11px', lineHeight: '1.4', boxShadow: '0 4px 16px rgba(0,0,0,0.12)' }}>
                {/* Title */}
                <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '6px' }}>
                  <tbody>
                    <tr>
                      <td style={{ ...tSec, fontSize: '14px', padding: '8px' }}>
                        نموذج استلام وتسليم مركبة
                      </td>
                      <td style={{ width: '85px', textAlign: 'center', border: '1.2px solid #333', padding: '4px', background: '#fff' }}>
                        <img src="/logo-mag.jpeg" alt="" crossOrigin="anonymous" style={{ width: '70px', height: '70px', objectFit: 'contain' }} />
                      </td>
                      <td style={{ ...tSec, fontSize: '11px', padding: '8px', width: '180px' }}>
                        Receiving and Issuing Vehicle Form
                      </td>
                    </tr>
                  </tbody>
                </table>

                {/* Driver Information — mirrors the original template structure with two side headers */}
                <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '6px' }}>
                  <tbody>
                    <tr>
                      <td rowSpan={9} style={tSideAr}>بيانات السائق</td>
                      <td style={tLabAr}>الاسم</td><td style={tVal}>{data.driverName}</td><td style={tLabEn}>NAME</td>
                      <td rowSpan={9} style={tSideEn}>DRIVER&apos;S INFORMATION</td>
                    </tr>
                    <tr>
                      <td style={tLabAr}>الوظيفة</td><td style={tVal}>{data.driverPosition}</td><td style={tLabEn}>POSITION</td>
                    </tr>
                    <tr>
                      <td style={tLabAr}>الرقم الوظيفي</td><td style={tVal}>{data.employeeNumber}</td><td style={tLabEn}>EMPLOYMENT #</td>
                    </tr>
                    <tr>
                      <td style={tLabAr}>رقم البطاقة / الإقامة</td><td style={tVal}>{data.iqamaNumber}</td><td style={tLabEn}>ID / IQAMA #</td>
                    </tr>
                    <tr>
                      <td style={tLabAr}>تاريخ الانتهاء</td><td style={tVal}>{data.iqamaExpiry}</td><td style={tLabEn}>EXPIRY DATE</td>
                    </tr>
                    <tr>
                      <td style={tLabAr}>رقم رخصة القيادة</td><td style={tVal}>{data.licenseNumber}</td><td style={tLabEn}>DRIVING LICENSE #</td>
                    </tr>
                    <tr>
                      <td style={tLabAr}>تاريخ الانتهاء</td><td style={tVal}>{data.licenseExpiry}</td><td style={tLabEn}>EXPIRY DATE</td>
                    </tr>
                    <tr>
                      <td style={tLabAr}>تاريخ الميلاد</td><td style={tVal}>{data.dob}</td><td style={tLabEn}>DATE OF BIRTH</td>
                    </tr>
                    <tr>
                      <td style={tLabAr}>رقم الجوال</td><td style={tVal}>{data.mobile}</td><td style={tLabEn}>MOBILE NUMBER</td>
                    </tr>
                  </tbody>
                </table>

                {/* Work site */}
                <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '6px' }}>
                  <tbody>
                    <tr><td colSpan={4} style={tSec}>بيانات موقع العمل</td></tr>
                    <tr>
                      <td style={{ ...tLabAr, width: '20%' }}>الشركة</td>
                      <td style={{ ...tVal, width: '30%' }}>{data.company}</td>
                      <td style={{ ...tLabAr, width: '20%' }}>القطاع</td>
                      <td style={{ ...tVal, width: '30%' }}>{data.sector}</td>
                    </tr>
                    <tr>
                      <td style={tLabAr}>المشروع</td><td style={tVal}>{data.project}</td>
                      <td style={tLabAr}>المدينة</td><td style={tVal}>{data.city}</td>
                    </tr>
                    <tr>
                      <td style={tLabAr}>المدير المباشر</td><td style={tVal}>{data.directManager}</td>
                      <td style={tLabAr}>رقم الاتصال</td><td style={tVal}>{data.contactNumber}</td>
                    </tr>
                  </tbody>
                </table>

                {/* Vehicle Information */}
                <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '6px' }}>
                  <tbody>
                    <tr><td colSpan={4} style={tSec}>بيانات المركبة</td></tr>
                    <tr>
                      <td style={{ ...tLabAr, width: '20%' }}>نوع المركبة</td>
                      <td style={{ ...tVal, width: '30%' }}>{data.vehicleType}</td>
                      <td style={{ ...tLabAr, width: '20%' }}>طراز المركبة</td>
                      <td style={{ ...tVal, width: '30%' }}>{data.vehicleModel}</td>
                    </tr>
                    <tr>
                      <td style={tLabAr}>اللون</td><td style={tVal}>{data.color}</td>
                      <td style={tLabAr}>الموديل</td><td style={tVal}>{data.year}</td>
                    </tr>
                    <tr>
                      <td style={tLabAr}>رقم اللوحة</td><td style={tVal}>{data.plateNumber}</td>
                      <td style={tLabAr}>تاريخ الانتهاء</td><td style={tVal}>{data.vehicleExpiry}</td>
                    </tr>
                    <tr>
                      <td style={tLabAr}>الملحقات</td><td style={tVal}>{data.accessories}</td>
                      <td style={tLabAr}>عداد السيارة</td><td style={tVal}>{data.odometer}</td>
                    </tr>
                  </tbody>
                </table>

                {/* Photos - matches original: 4 photos only */}
                <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '6px' }}>
                  <tbody>
                    <tr>
                      <td style={{ ...tLabAr, textAlign: 'center', width: '20%' }}>صور السيارة</td>
                      <td style={{ ...tLabAr, textAlign: 'center', width: '20%' }}>الصورة الأمامية</td>
                      <td style={{ ...tLabAr, textAlign: 'center', width: '20%' }}>الصورة الخلفية</td>
                      <td style={{ ...tLabAr, textAlign: 'center', width: '20%' }}>صورة الجانب الأيمن</td>
                      <td style={{ ...tLabAr, textAlign: 'center', width: '20%' }}>صورة الجانب الأيسر</td>
                    </tr>
                    <tr>
                      <td style={{ ...tCell, height: '90px', background: '#F2F2F2' }}></td>
                      <td style={{ ...tCell, height: '90px', background: '#fff' }}></td>
                      <td style={{ ...tCell, height: '90px', background: '#fff' }}></td>
                      <td style={{ ...tCell, height: '90px', background: '#fff' }}></td>
                      <td style={{ ...tCell, height: '90px', background: '#fff' }}></td>
                    </tr>
                  </tbody>
                </table>

                {/* Notes */}
                <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '6px' }}>
                  <tbody>
                    {[1, 2, 3, 4, 5].map((n, idx) => (
                      <tr key={n}>
                        {idx === 0 && <td rowSpan={5} style={tSideAr}>ملاحظات المركبة</td>}
                        <td style={{ ...tLabAr, textAlign: 'center', width: '36px' }}>{n}</td>
                        <td style={{ ...tVal, height: '24px' }}>{data['note' + n]}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Issuer */}
                <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '6px' }}>
                  <tbody>
                    <tr>
                      <td style={{ ...tLabAr, width: '15%' }}>اسم المسلم</td>
                      <td style={{ ...tVal, width: '30%' }}>{data.issuerName}</td>
                      <td style={{ ...tLabAr, width: '15%' }}>رقم الملف</td>
                      <td style={{ ...tVal, width: '20%' }}>{data.issuerFile}</td>
                      <td style={{ ...tLabAr, width: '10%' }}>التوقيع</td>
                      <td style={{ ...tVal, width: '10%' }}>{data.issuerSignature}</td>
                    </tr>
                  </tbody>
                </table>

                {/* Approvals */}
                <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '6px' }}>
                  <tbody>
                    <tr>
                      <td colSpan={2} style={tSec}>مدير المنطقة</td>
                      <td colSpan={2} style={tSec}>مدير المنطقة</td>
                      <td colSpan={2} style={tSec}>مسؤول الحركة</td>
                    </tr>
                    <tr>
                      <td style={{ ...tLabAr, width: '15%' }}>الاسم</td>
                      <td style={{ ...tVal, width: '35%' }}>{data.areaManagerName}</td>
                      <td style={{ ...tLabAr, width: '15%' }}>الاسم</td>
                      <td style={{ ...tVal, width: '35%' }}>{data.movementOfficerName}</td>
                    </tr>
                    <tr>
                      <td style={tLabAr}>التوقيع</td>
                      <td style={{ ...tVal, height: '40px' }}>{data.areaManagerSig}</td>
                      <td style={tLabAr}>التوقيع</td>
                      <td style={{ ...tVal, height: '40px' }}>{data.movementOfficerSig}</td>
                    </tr>
                  </tbody>
                </table>

                {/* Central Movement */}
                <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '6px' }}>
                  <tbody>
                    <tr><td colSpan={2} style={tSec}>لاستخدام قسم الحركة المركزية</td></tr>
                    <tr>
                      <td style={{ ...tLabAr, width: '20%' }}>التاريخ</td>
                      <td style={tVal}>{data.centralDate}</td>
                    </tr>
                  </tbody>
                </table>

                {/* Footer */}
                <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '4px' }}>
                  <tbody>
                    <tr>
                      <td style={{ ...tSec, width: '34%', fontSize: '11px' }}>الأصل لقسم الحركة المركزية</td>
                      <td style={{ ...tSec, width: '33%', fontSize: '11px' }}>صورة للحسابات المركزية</td>
                      <td style={{ ...tSec, width: '33%', fontSize: '11px' }}>صورة لمالية القطاع</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
