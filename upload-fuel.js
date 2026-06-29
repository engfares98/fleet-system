const { createClient } = require('@supabase/supabase-js')
const XLSX = require('xlsx')

const SUPABASE_URL = 'https://dgjkhewkluzdnmvsbfxf.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRnamtoZXdrbHV6ZG5tdnNiZnhmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU4NDc1OTYsImV4cCI6MjA5MTQyMzU5Nn0.QDrcSnFl_UkGKXZpAvUzN2XwXMW-eP8RvM8iFEhvF5g'

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// Saudi license plate official Latin↔Arabic transliteration
const AR_TO_EN_LETTER = {
  'ا': 'A', 'أ': 'A', 'إ': 'A', 'آ': 'A',
  'ب': 'B', 'ج': 'J', 'د': 'D', 'ر': 'R',
  'س': 'S', 'ص': 'X', 'ط': 'T', 'ع': 'E',
  'ق': 'G', 'ك': 'K', 'ل': 'L', 'م': 'Z',
  'ن': 'N', 'ه': 'H', 'ة': 'H',
  'و': 'U', 'ي': 'V', 'ى': 'V',
}
const AR_DIGITS = '٠١٢٣٤٥٦٧٨٩'

// Convert any plate (Arabic or English form) to a canonical form: "<digits><ENG_LETTERS>"
// Arabic plates like "ا ط ع 4292" are read RTL, so letters are reversed before transliteration.
// Result: "4292ETA" — matches the Latin form on fuel docs.
function normalizePlate(s) {
  if (!s) return ''
  const raw = String(s)
    .replace(/[ً-ٰٟۖ-ۭ]/g, '')
    .replace(/[ـ\s\-_.]/g, '')
    .toUpperCase()
  let digits = ''
  let arabic = ''
  let english = ''
  for (const ch of raw) {
    if (ch >= '0' && ch <= '9') digits += ch
    else if (AR_DIGITS.includes(ch)) digits += String(AR_DIGITS.indexOf(ch))
    else if (AR_TO_EN_LETTER[ch]) arabic += ch
    else if (ch >= 'A' && ch <= 'Z') english += ch
  }
  let letters
  if (arabic) {
    // Arabic plate letters are stored LTR but read RTL — reverse, then transliterate
    letters = arabic.split('').reverse().map(c => AR_TO_EN_LETTER[c] || '').join('')
  } else {
    letters = english
  }
  return digits + letters
}

async function uploadFuel() {
  console.log('📖 قراءة fuel_template.xlsx...')
  const wb = XLSX.readFile('fuel_template.xlsx')
  const sheet = wb.Sheets[wb.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 })
  const headers = rows[0]
  const dataRows = rows.slice(2).filter(r => r[0] || r[2])  // need plate or date
  console.log(`✅ ${dataRows.length} صف وُجد للقراءة`)

  console.log('⏳ جلب المركبات والسائقين...')
  const [{ data: vehicles }, { data: drivers }] = await Promise.all([
    supabase.from('vehicles').select('id, plate_number'),
    supabase.from('drivers').select('id, full_name'),
  ])
  console.log(`   ${vehicles?.length || 0} مركبة، ${drivers?.length || 0} سائق`)

  // Build lookup maps with normalized keys
  const vehicleMap = new Map()
  for (const v of (vehicles || [])) vehicleMap.set(normalizePlate(v.plate_number), v.id)
  const driverMap = new Map()
  for (const d of (drivers || [])) driverMap.set((d.full_name || '').trim().toLowerCase(), d.id)

  // Build records
  const records = []
  const skipped = []
  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i]
    const rec = {}
    headers.forEach((h, idx) => {
      if (h && row[idx] !== undefined && row[idx] !== '') rec[h] = row[idx]
    })

    const plate = rec.plate_number
    if (!plate) { skipped.push({ line: i + 3, reason: 'لا يوجد رقم لوحة' }); continue }
    const vehicleId = vehicleMap.get(normalizePlate(plate))
    if (!vehicleId) { skipped.push({ line: i + 3, plate, reason: 'مركبة غير موجودة' }); continue }

    let driverId = null
    if (rec.driver_name) {
      driverId = driverMap.get(String(rec.driver_name).trim().toLowerCase()) || null
    }

    const liters = Number(rec.liters) || 0
    const costPerLiter = Number(rec.cost_per_liter) || 0
    const totalCost = Number(rec.total_cost) || (liters * costPerLiter)

    // Format date if needed — accepts Date object, Excel serial, or string
    let date = rec.date
    const originalDate = date
    if (date instanceof Date) {
      date = date.toISOString().slice(0, 10)
    } else if (typeof date === 'number') {
      // Excel serial date (epoch = 1899-12-30)
      const d = new Date(Date.UTC(1899, 11, 30) + Math.floor(date) * 86400000)
      date = d.toISOString().slice(0, 10)
    } else if (typeof date === 'string') {
      const s = date.trim()
      // ISO format YYYY-MM-DD or YYYY/MM/DD
      let m = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/)
      if (m) {
        date = `${m[1]}-${m[2].padStart(2,'0')}-${m[3].padStart(2,'0')}`
      } else {
        // DD-MM-YYYY or DD/MM/YYYY (assume day-first when 4-digit year is last)
        m = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/)
        if (m) {
          date = `${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`
        } else {
          const parsed = new Date(s)
          if (!isNaN(parsed.getTime())) date = parsed.toISOString().slice(0, 10)
        }
      }
    }
    // Log first 3 to verify parsing
    if (records.length < 3) {
      console.log(`   📅 سطر ${i + 3}: "${originalDate}" → ${date}`)
    }

    records.push({
      vehicle_id: vehicleId,
      driver_id: driverId,
      date: date || null,
      liters: liters || null,
      cost_per_liter: costPerLiter || null,
      total_cost: totalCost || null,
      odometer: rec.odometer ? Number(rec.odometer) : null,
    })
  }

  console.log(`\n📊 جاهز للرفع: ${records.length} سجل صحيح`)
  if (skipped.length > 0) {
    console.log(`⚠️  متخطى: ${skipped.length} سجل`)
    skipped.slice(0, 15).forEach(s => console.log(`   - سطر ${s.line}: ${s.reason}${s.plate ? ` (${s.plate})` : ''}`))
    if (skipped.length > 15) console.log(`   ... و ${skipped.length - 15} أخرى`)
  }

  if (records.length === 0) { console.log('🚫 لا يوجد سجلات للرفع.'); return }

  console.log('\n🚀 بدء الرفع...')
  let success = 0, failed = 0
  for (let i = 0; i < records.length; i += 100) {
    const batch = records.slice(i, i + 100)
    const { error } = await supabase.from('fuel_logs').insert(batch)
    if (error) {
      console.error(`❌ خطأ في الدفعة ${i}-${i + batch.length}: ${error.message}`)
      failed += batch.length
    } else {
      success += batch.length
      console.log(`✅ تم رفع ${success}/${records.length}`)
    }
  }

  console.log('\n══════════════════════════════════════')
  console.log(`✅ نجح: ${success}`)
  console.log(`❌ فشل: ${failed}`)
  console.log(`⏭️  متخطى: ${skipped.length}`)
  console.log('══════════════════════════════════════')
}

uploadFuel().catch(e => console.error('فشل:', e))
