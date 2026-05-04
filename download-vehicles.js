const { createClient } = require('@supabase/supabase-js')
const XLSX = require('xlsx')

const SUPABASE_URL = 'https://dgjkhewkluzdnmvsbfxf.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRnamtoZXdrbHV6ZG5tdnNiZnhmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU4NDc1OTYsImV4cCI6MjA5MTQyMzU5Nn0.QDrcSnFl_UkGKXZpAvUzN2XwXMW-eP8RvM8iFEhvF5g'

const COLUMNS = ['plate_number', 'vehicle_code', 'type', 'brand', 'model', 'year', 'chassis_number', 'color', 'fuel_type', 'status', 'preparation_status']
const AR_LABELS = ['رقم اللوحة', 'كود المركبة', 'النوع', 'الماركة', 'الموديل', 'نوع التجهيزة', 'رقم الهيكل', 'اللون', 'نوع الوقود', 'الحالة', 'حالة التجهيز']

async function downloadVehicles() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
  console.log('⏳ جاري جلب المركبات من Supabase...')

  let all = []
  let from = 0
  const pageSize = 1000
  while (true) {
    const { data, error } = await supabase
      .from('vehicles')
      .select(COLUMNS.join(','))
      .order('plate_number', { ascending: true })
      .range(from, from + pageSize - 1)
    if (error) { console.error('خطأ:', error.message); return }
    all = all.concat(data)
    if (!data || data.length < pageSize) break
    from += pageSize
  }

  console.log(`✅ تم جلب ${all.length} مركبة`)

  // Build sheet rows
  const rows = [COLUMNS, AR_LABELS]
  for (const v of all) {
    rows.push(COLUMNS.map(c => (v[c] === null || v[c] === undefined) ? '' : String(v[c])))
  }

  const ws = XLSX.utils.aoa_to_sheet(rows)
  // RTL view
  if (!ws['!views']) ws['!views'] = []
  ws['!views'].push({ RTL: true })
  // Column widths
  ws['!cols'] = [
    { wch: 16 }, { wch: 14 }, { wch: 14 }, { wch: 16 }, { wch: 14 },
    { wch: 16 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 16 },
  ]
  ws['!freeze'] = { xSplit: 0, ySplit: 2, topLeftCell: 'A3', activePane: 'bottomLeft', state: 'frozen' }

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'vehicles')

  const fileName = 'vehicles_template.xlsx'
  XLSX.writeFile(wb, fileName)
  console.log(`📄 تم حفظ الملف: ${fileName}`)
  console.log('')
  console.log('📝 الخطوات التالية:')
  console.log('  1) افتح vehicles_template.xlsx')
  console.log('  2) أضف المركبات الجديدة في صفوف جديدة (بعد الموجود)')
  console.log('  3) احفظ الملف')
  console.log('  4) شغّل: node upload-vehicles.js')
  console.log('     راح يضيف الجديد ويحدّث القديم تلقائياً (بناءً على رقم اللوحة)')
}

downloadVehicles().catch(e => console.error('فشل:', e))
