const { createClient } = require('@supabase/supabase-js')
const XLSX = require('xlsx')
const fs = require('fs')

// تحميل المتغيرات من .env.local
try {
  fs.readFileSync('.env.local', 'utf8').split('\n').forEach(line => {
    const m = line.match(/^\s*([\w.-]+)\s*=\s*(.*)\s*$/)
    if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
  })
} catch (_) {}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://dgjkhewkluzdnmvsbfxf.supabase.co'
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SERVICE_KEY) {
  console.error('❌ مفقود: SUPABASE_SERVICE_ROLE_KEY في .env.local')
  console.error('   احصل عليه من Supabase Dashboard ← Project Settings ← API ← service_role')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
})

async function uploadVehicles() {
  const workbook = XLSX.readFile('vehicles_template.xlsx')
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 })
  const headers = rows[0]
  const dataRows = rows.slice(2).filter(row => row[0])
  console.log(`📋 إجمالي الصفوف: ${dataRows.length}`)

  // Build vehicle objects + normalize plate_number
  const allVehicles = dataRows.map(row => {
    const v = {}
    headers.forEach((h, idx) => {
      if (h && row[idx] !== undefined) {
        const val = String(row[idx]).trim()
        if (val !== '') v[h] = val
      }
    })
    // تحويل الحالة وحالة التجهيز من العربي إلى enum الإنجليزي المتوقّع في التطبيق
    const STATUS_MAP = { 'نشط': 'active', 'غير نشط': 'inactive', 'قيد الانتظار': 'pending' }
    const PREP_MAP = { 'جاهزة': 'ready', 'جاهز': 'ready', 'غير جاهزة': 'not_ready', 'غير جاهز': 'not_ready', 'قيد التجهيز': 'in_progress' }
    if (v.status) v.status = STATUS_MAP[v.status] || v.status
    v.preparation_status = v.preparation_status ? (PREP_MAP[v.preparation_status] || v.preparation_status) : 'not_ready'
    return v
  }).filter(v => v.chassis_number)

  // Deduplicate by chassis_number (keep last occurrence — closest to bottom of sheet)
  const map = new Map()
  const duplicates = []
  for (const v of allVehicles) {
    const key = String(v.chassis_number).trim()
    if (map.has(key)) duplicates.push(key)
    map.set(key, v)
  }
  const vehicles = Array.from(map.values())

  if (duplicates.length > 0) {
    console.log(`⚠️  تم اكتشاف ${duplicates.length} رقم لوحة مكرر — سيُستخدم آخر صف لكل رقم:`)
    const unique = [...new Set(duplicates)]
    unique.slice(0, 20).forEach(p => console.log(`   - ${p}`))
    if (unique.length > 20) console.log(`   ... و ${unique.length - 20} أخرى`)
    console.log('')
  }

  console.log(`🚀 سيتم رفع ${vehicles.length} مركبة فريدة...\n`)

  let success = 0, failed = 0
  const failedPlates = []
  for (let i = 0; i < vehicles.length; i += 50) {
    const batch = vehicles.slice(i, i + 50)
    const { error } = await supabase.from('vehicles').upsert(batch, { onConflict: 'chassis_number' })
    if (error) {
      console.error(`❌ خطأ في الدفعة ${i}-${i + batch.length}: ${error.message}`)
      failed += batch.length
      batch.forEach(v => failedPlates.push(v.plate_number))
    } else {
      success += batch.length
      console.log(`✅ تم الرفع: ${success}/${vehicles.length}`)
    }
  }

  console.log('\n══════════════════════════════════════')
  console.log(`✅ نجح: ${success}`)
  console.log(`❌ فشل: ${failed}`)
  if (duplicates.length > 0) console.log(`⚠️  مكررات تم تجاهلها: ${duplicates.length}`)
  if (failedPlates.length > 0) {
    console.log('\nاللوحات الفاشلة:')
    failedPlates.slice(0, 20).forEach(p => console.log(`   - ${p}`))
  }
  console.log('══════════════════════════════════════')
}

uploadVehicles().catch(console.error)
