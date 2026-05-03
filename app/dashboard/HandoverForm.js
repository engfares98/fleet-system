'use client'
import { useState, useRef } from 'react'

const C = { orange: '#ff6b00', white: '#fff', text: '#1a1a1a', muted: '#888', border: '#e8e8e8' }

const initialData = {
  // Driver
  driverName: '', driverPosition: '', employeeNumber: '', iqamaNumber: '', iqamaExpiry: '',
  licenseNumber: '', licenseExpiry: '', dob: '', recipientSignature: '',
  // Work site
  company: '', sector: '', project: '', city: '', directManager: '', contactNumber: '',
  // Vehicle
  vehicleType: '', vehicleModel: '', color: '', year: '', plateNumber: '', vehicleExpiry: '',
  accessories: '', odometer: '',
  // Notes
  note1: '', note2: '', note3: '', note4: '', note5: '',
  // Issuer
  issuerName: '', issuerFile: '', issuerSignature: '',
  // Approvals
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

  const set = (k, v) => setData(p => ({ ...p, [k]: v }))
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

  const inputStyle = { width: '100%', padding: '8px 10px', background: '#fafafa', border: `1px solid ${C.border}`, borderRadius: '6px', color: C.text, fontSize: '12px', fontFamily: 'Cairo, sans-serif', outline: 'none', boxSizing: 'border-box' }
  const labelStyle = { color: '#555', fontSize: '11px', fontWeight: '600', display: 'block', marginBottom: '4px' }
  const card = { background: C.white, border: `1px solid ${C.border}`, borderRadius: '14px', padding: isMobile ? '14px' : '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', marginBottom: '14px' }
  const btn = (c, outline) => ({ background: outline ? C.white : (c || C.orange), color: outline ? (c || C.orange) : C.white, border: `2px solid ${c || C.orange}`, borderRadius: '9px', padding: '10px 16px', fontSize: '13px', fontWeight: '700', fontFamily: 'Cairo, sans-serif', cursor: 'pointer' })
  const sectionTitle = { fontWeight: '800', fontSize: '14px', color: C.orange, marginBottom: '12px', borderBottom: `2px solid ${C.orange}`, paddingBottom: '4px' }

  const Field = ({ label, k, type = 'text' }) => (
    <div>
      <label style={labelStyle}>{label}</label>
      <input type={type} style={inputStyle} value={data[k]} onChange={e => set(k, e.target.value)} />
    </div>
  )

  // Print styles
  const tCell = { border: '1.5px solid #333', padding: '5px 8px', fontSize: '11px', verticalAlign: 'middle' }
  const tValue = { ...tCell, height: '22px', fontWeight: '700' }
  const tLabelAr = { ...tCell, background: '#fef3c7', fontWeight: '700', textAlign: 'right', whiteSpace: 'nowrap' }
  const tLabelEn = { ...tCell, background: '#fef3c7', fontWeight: '700', textAlign: 'left', fontSize: '10px', color: '#555', whiteSpace: 'nowrap' }
  const tSide = { ...tCell, background: C.orange, color: '#fff', fontWeight: '900', writingMode: 'vertical-rl', textAlign: 'center', whiteSpace: 'nowrap', width: '36px' }
  const tSection = { background: C.orange, color: '#fff', fontWeight: '900', textAlign: 'center', padding: '6px 8px', fontSize: '12px', border: '1.5px solid #333' }

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
        <div style={sectionTitle}>👤 بيانات السائق</div>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(3, 1fr)', gap: '10px' }}>
          <Field label="الاسم" k="driverName" />
          <Field label="الوظيفة" k="driverPosition" />
          <Field label="الرقم الوظيفي" k="employeeNumber" />
          <Field label="رقم البطاقة / الإقامة" k="iqamaNumber" />
          <Field label="تاريخ انتهاء الإقامة" k="iqamaExpiry" />
          <Field label="رقم رخصة القيادة" k="licenseNumber" />
          <Field label="تاريخ انتهاء الرخصة" k="licenseExpiry" />
          <Field label="تاريخ الميلاد" k="dob" />
          <Field label="توقيع المستلم" k="recipientSignature" />
        </div>
      </div>

      {/* Work site */}
      <div style={card}>
        <div style={sectionTitle}>🏢 بيانات موقع العمل</div>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(3, 1fr)', gap: '10px' }}>
          <Field label="الشركة" k="company" />
          <Field label="القطاع" k="sector" />
          <Field label="المشروع" k="project" />
          <Field label="المدينة" k="city" />
          <Field label="المدير المباشر" k="directManager" />
          <Field label="رقم الاتصال" k="contactNumber" />
        </div>
      </div>

      {/* Vehicle */}
      <div style={card}>
        <div style={sectionTitle}>🚛 بيانات المركبة</div>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(3, 1fr)', gap: '10px' }}>
          <Field label="نوع المركبة" k="vehicleType" />
          <Field label="طراز المركبة" k="vehicleModel" />
          <Field label="اللون" k="color" />
          <Field label="الموديل" k="year" />
          <Field label="رقم اللوحة" k="plateNumber" />
          <Field label="تاريخ انتهاء الاستمارة" k="vehicleExpiry" />
          <Field label="الملحقات" k="accessories" />
          <Field label="عداد السيارة" k="odometer" />
        </div>
      </div>

      {/* Notes */}
      <div style={card}>
        <div style={sectionTitle}>📝 ملاحظات المركبة</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '8px' }}>
          {[1, 2, 3, 4, 5].map(n => <Field key={n} label={`ملاحظة ${n}`} k={`note${n}`} />)}
        </div>
      </div>

      {/* Issuer */}
      <div style={card}>
        <div style={sectionTitle}>🖋️ بيانات المسلم</div>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(3, 1fr)', gap: '10px' }}>
          <Field label="اسم المسلم" k="issuerName" />
          <Field label="رقم الملف" k="issuerFile" />
          <Field label="التوقيع" k="issuerSignature" />
        </div>
      </div>

      {/* Approvals */}
      <div style={card}>
        <div style={sectionTitle}>✍️ التوقيعات</div>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(2, 1fr)', gap: '14px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ fontWeight: '700', fontSize: '12px', color: '#555' }}>مدير المنطقة</div>
            <Field label="الاسم" k="areaManagerName" />
            <Field label="التوقيع" k="areaManagerSig" />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ fontWeight: '700', fontSize: '12px', color: '#555' }}>مسؤول الحركة</div>
            <Field label="الاسم" k="movementOfficerName" />
            <Field label="التوقيع" k="movementOfficerSig" />
          </div>
        </div>
        <div style={{ marginTop: '12px' }}>
          <Field label="تاريخ الحركة المركزية" k="centralDate" />
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
              <div ref={previewRef} dir="rtl" style={{ width: '794px', minHeight: '1123px', margin: '0 auto', background: '#fff', padding: '20px 24px', fontFamily: 'Cairo, sans-serif', color: '#1a1a1a', fontSize: '11px', lineHeight: '1.4', boxShadow: '0 4px 16px rgba(0,0,0,0.12)' }}>
                {/* Header — MAG logo only */}
                <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '8px' }}>
                  <tbody>
                    <tr>
                      <td style={{ ...tSection, fontSize: '15px', padding: '14px 8px', width: 'auto' }}>
                        نموذج استلام وتسليم مركبة
                        <div style={{ fontSize: '11px', fontWeight: '700', marginTop: '4px' }}>Receiving and Issuing Vehicle Form</div>
                      </td>
                      <td style={{ width: '100px', textAlign: 'center', border: '1.5px solid #333', padding: '4px' }}>
                        <img src="/logo-mag.jpeg" alt="" crossOrigin="anonymous" style={{ width: '80px', height: '80px', objectFit: 'contain' }} />
                      </td>
                    </tr>
                  </tbody>
                </table>

                {/* Driver Information */}
                <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '6px' }}>
                  <tbody>
                    <tr>
                      <td rowSpan={9} style={tSide}>بيانات السائق<br/>DRIVER&apos;S<br/>INFORMATION</td>
                      <td style={tLabelAr}>الاسم</td><td style={tValue}>{data.driverName}</td><td style={tLabelEn}>NAME</td>
                    </tr>
                    <tr>
                      <td style={tLabelAr}>الوظيفة</td><td style={tValue}>{data.driverPosition}</td><td style={tLabelEn}>POSITION</td>
                    </tr>
                    <tr>
                      <td style={tLabelAr}>الرقم الوظيفي</td><td style={tValue}>{data.employeeNumber}</td><td style={tLabelEn}>EMPLOYMENT #</td>
                    </tr>
                    <tr>
                      <td style={tLabelAr}>رقم البطاقة / الإقامة</td><td style={tValue}>{data.iqamaNumber}</td><td style={tLabelEn}>ID / IQAMA #</td>
                    </tr>
                    <tr>
                      <td style={tLabelAr}>تاريخ الانتهاء</td><td style={tValue}>{data.iqamaExpiry}</td><td style={tLabelEn}>EXPIRY DATE</td>
                    </tr>
                    <tr>
                      <td style={tLabelAr}>رقم رخصة القيادة</td><td style={tValue}>{data.licenseNumber}</td><td style={tLabelEn}>DRIVING LICENSE #</td>
                    </tr>
                    <tr>
                      <td style={tLabelAr}>تاريخ الانتهاء</td><td style={tValue}>{data.licenseExpiry}</td><td style={tLabelEn}>EXPIRY DATE</td>
                    </tr>
                    <tr>
                      <td style={tLabelAr}>تاريخ الميلاد</td><td style={tValue}>{data.dob}</td><td style={tLabelEn}>DATE OF BIRTH</td>
                    </tr>
                    <tr>
                      <td style={tLabelAr}>توقيع المستلم</td><td style={tValue}>{data.recipientSignature}</td><td style={tLabelEn}>SIGNATURE</td>
                    </tr>
                  </tbody>
                </table>

                {/* Work site */}
                <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '6px' }}>
                  <tbody>
                    <tr><td colSpan={4} style={tSection}>بيانات موقع العمل</td></tr>
                    <tr>
                      <td style={{ ...tLabelAr, width: '20%' }}>الشركة</td>
                      <td style={{ ...tValue, width: '30%' }}>{data.company}</td>
                      <td style={{ ...tLabelAr, width: '20%' }}>القطاع</td>
                      <td style={{ ...tValue, width: '30%' }}>{data.sector}</td>
                    </tr>
                    <tr>
                      <td style={tLabelAr}>المشروع</td><td style={tValue}>{data.project}</td>
                      <td style={tLabelAr}>المدينة</td><td style={tValue}>{data.city}</td>
                    </tr>
                    <tr>
                      <td style={tLabelAr}>المدير المباشر</td><td style={tValue}>{data.directManager}</td>
                      <td style={tLabelAr}>رقم الاتصال</td><td style={tValue}>{data.contactNumber}</td>
                    </tr>
                  </tbody>
                </table>

                {/* Vehicle Information */}
                <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '6px' }}>
                  <tbody>
                    <tr><td colSpan={4} style={tSection}>بيانات المركبة</td></tr>
                    <tr>
                      <td style={{ ...tLabelAr, width: '20%' }}>نوع المركبة</td>
                      <td style={{ ...tValue, width: '30%' }}>{data.vehicleType}</td>
                      <td style={{ ...tLabelAr, width: '20%' }}>طراز المركبة</td>
                      <td style={{ ...tValue, width: '30%' }}>{data.vehicleModel}</td>
                    </tr>
                    <tr>
                      <td style={tLabelAr}>اللون</td><td style={tValue}>{data.color}</td>
                      <td style={tLabelAr}>الموديل</td><td style={tValue}>{data.year}</td>
                    </tr>
                    <tr>
                      <td style={tLabelAr}>رقم اللوحة</td><td style={tValue}>{data.plateNumber}</td>
                      <td style={tLabelAr}>تاريخ الانتهاء</td><td style={tValue}>{data.vehicleExpiry}</td>
                    </tr>
                    <tr>
                      <td style={tLabelAr}>الملحقات</td><td style={tValue}>{data.accessories}</td>
                      <td style={tLabelAr}>الملحقات</td><td style={tValue}>{data.accessories}</td>
                      <td style={tLabelAr}>عداد السيارة</td><td style={tValue}>{data.odometer}</td>
                    </tr>
                  </tbody>
                </table>

                {/* Photos */}
                <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '6px' }}>
                  <tbody>
                    <tr><td colSpan={5} style={tSection}>صور السيارة</td></tr>
                    <tr>
                      <td style={{ ...tLabelAr, textAlign: 'center', width: '20%' }}>الصورة الأمامية</td>
                      <td style={{ ...tLabelAr, textAlign: 'center', width: '20%' }}>الصورة الخلفية</td>
                      <td style={{ ...tLabelAr, textAlign: 'center', width: '20%' }}>صورة الجانب الأيمن</td>
                      <td style={{ ...tLabelAr, textAlign: 'center', width: '20%' }}>صورة الجانب الأيسر</td>
                      <td style={{ ...tLabelAr, textAlign: 'center', width: '20%' }}>صورة العداد</td>
                    </tr>
                    <tr>
                      <td style={{ ...tCell, height: '90px' }}></td>
                      <td style={{ ...tCell, height: '90px' }}></td>
                      <td style={{ ...tCell, height: '90px' }}></td>
                      <td style={{ ...tCell, height: '90px' }}></td>
                      <td style={{ ...tCell, height: '90px' }}></td>
                    </tr>
                  </tbody>
                </table>

                {/* Notes */}
                <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '6px' }}>
                  <tbody>
                    <tr><td colSpan={3} style={tSection}>ملاحظات المركبة</td></tr>
                    {[1, 2, 3, 4, 5].map((n, idx) => (
                      <tr key={n}>
                        {idx === 0 && <td rowSpan={5} style={tSide}>ملاحظات</td>}
                        <td style={{ ...tLabelAr, textAlign: 'center', width: '36px' }}>{n}</td>
                        <td style={{ ...tValue, height: '24px' }}>{data['note' + n]}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Issuer */}
                <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '6px' }}>
                  <tbody>
                    <tr>
                      <td style={{ ...tLabelAr, width: '15%' }}>اسم المسلم</td>
                      <td style={{ ...tValue, width: '30%' }}>{data.issuerName}</td>
                      <td style={{ ...tLabelAr, width: '15%' }}>رقم الملف</td>
                      <td style={{ ...tValue, width: '20%' }}>{data.issuerFile}</td>
                      <td style={{ ...tLabelAr, width: '10%' }}>التوقيع</td>
                      <td style={{ ...tValue, width: '10%' }}>{data.issuerSignature}</td>
                    </tr>
                  </tbody>
                </table>

                {/* Approvals */}
                <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '6px' }}>
                  <tbody>
                    <tr>
                      <td colSpan={2} style={tSection}>مدير المنطقة</td>
                      <td colSpan={2} style={tSection}>مسؤول الحركة</td>
                    </tr>
                    <tr>
                      <td style={{ ...tLabelAr, width: '15%' }}>الاسم</td>
                      <td style={{ ...tValue, width: '35%' }}>{data.areaManagerName}</td>
                      <td style={{ ...tLabelAr, width: '15%' }}>الاسم</td>
                      <td style={{ ...tValue, width: '35%' }}>{data.movementOfficerName}</td>
                    </tr>
                    <tr>
                      <td style={tLabelAr}>التوقيع</td>
                      <td style={{ ...tValue, height: '40px' }}>{data.areaManagerSig}</td>
                      <td style={tLabelAr}>التوقيع</td>
                      <td style={{ ...tValue, height: '40px' }}>{data.movementOfficerSig}</td>
                    </tr>
                  </tbody>
                </table>

                {/* Central Movement */}
                <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '6px' }}>
                  <tbody>
                    <tr><td colSpan={2} style={tSection}>لاستخدام قسم الحركة المركزية</td></tr>
                    <tr>
                      <td style={{ ...tLabelAr, width: '20%' }}>التاريخ</td>
                      <td style={tValue}>{data.centralDate}</td>
                    </tr>
                  </tbody>
                </table>

                {/* Footer */}
                <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '4px' }}>
                  <tbody>
                    <tr>
                      <td style={{ ...tSection, width: '34%', fontSize: '11px' }}>الأصل لقسم الحركة المركزية</td>
                      <td style={{ ...tSection, width: '33%', fontSize: '11px' }}>صورة للحسابات المركزية</td>
                      <td style={{ ...tSection, width: '33%', fontSize: '11px' }}>صورة لمالية القطاع</td>
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
