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
if (!SERVICE_KEY) { console.error('❌ مفقود: SUPABASE_SERVICE_ROLE_KEY في .env.local'); process.exit(1) }

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false, autoRefreshToken: false } })

const CONFIRM = process.argv.includes('--confirm')      // ينفّذ الحذف فعليًا
const WITH_FUEL = process.argv.includes('--with-fuel')  // يحذف سجلات الوقود المرتبطة أيضًا

async function main() {
  // 1) اللوحات الموجودة في الملف (المرجع)
  const wb = XLSX.readFile('vehicles_template.xlsx')
  const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1 })
  const headers = rows[0]
  const plateIdx = headers.indexOf('plate_number')
  const filePlates = new Set(
    rows.slice(2).map(r => r[plateIdx]).filter(Boolean).map(p => String(p).trim())
  )
  console.log(`📄 لوحات في الملف: ${filePlates.size}`)

  // 2) كل المركبات في القاعدة
  const { data: all, error } = await supabase
    .from('vehicles').select('id, plate_number').range(0, 9999)
  if (error) { console.error(`❌ خطأ في القراءة: ${error.message}`); process.exit(1) }
  console.log(`🗄️  مركبات في القاعدة: ${all.length}`)

  // 3) الزيادة = في القاعدة وليست في الملف
  const extra = all.filter(v => !filePlates.has(String(v.plate_number ?? '').trim()))
  console.log(`\n🔎 الزيادة (سيتم حذفها): ${extra.length}`)
  extra.slice(0, 25).forEach(v => console.log(`   - [id ${v.id}] ${v.plate_number}`))
  if (extra.length > 25) console.log(`   ... و ${extra.length - 25} أخرى`)

  if (extra.length === 0) { console.log('\n✅ ما فيه زيادة. لا شي للحذف.'); return }

  // 4) فحص ارتباط الزيادة بسجلات الوقود
  const extraIds = extra.map(v => v.id)
  let blocked = []
  for (let i = 0; i < extraIds.length; i += 200) {
    const batch = extraIds.slice(i, i + 200)
    const { data: fl } = await supabase.from('fuel_logs').select('vehicle_id').in('vehicle_id', batch)
    if (fl) blocked.push(...fl.map(f => f.vehicle_id))
  }
  const blockedIds = [...new Set(blocked)]
  console.log(`\n⛽ منها مرتبط بسجلات وقود: ${blockedIds.length} مركبة (${blocked.length} سجل وقود)`)

  if (!CONFIRM) {
    console.log('\n──────────────────────────────────────')
    console.log('هذا فحص فقط — لم يُحذف شيء.')
    console.log('للحذف الفعلي شغّل:  node delete-extra-vehicles.js --confirm')
    if (blockedIds.length > 0)
      console.log('ولحذف سجلات الوقود المرتبطة أيضًا:  node delete-extra-vehicles.js --confirm --with-fuel')
    console.log('──────────────────────────────────────')
    return
  }

  // 5) التنفيذ
  if (WITH_FUEL) {
    // نحذف الوقود لكل معرّفات الزيادة مباشرة (بدون اعتماد على القراءة المحدودة بسقف 1000)
    console.log('\n🗑️  حذف سجلات الوقود المرتبطة بكل الزيادة...')
    for (let i = 0; i < extraIds.length; i += 200) {
      const batch = extraIds.slice(i, i + 200)
      const { error: e } = await supabase.from('fuel_logs').delete().in('vehicle_id', batch)
      if (e) { console.error(`❌ خطأ حذف وقود: ${e.message}`); process.exit(1) }
    }
    console.log('✅ تم حذف كل سجلات الوقود المرتبطة بالزيادة.')
  }

  console.log('\n🗑️  حذف المركبات الزائدة...')
  let deleted = 0
  for (let i = 0; i < extraIds.length; i += 200) {
    const batch = extraIds.slice(i, i + 200)
    const { error: e } = await supabase.from('vehicles').delete().in('id', batch)
    if (e) { console.error(`❌ خطأ حذف مركبات: ${e.message}`); console.error('   (غالبًا بسبب ارتباط وقود — أعد التشغيل مع --with-fuel)'); process.exit(1) }
    deleted += batch.length
  }

  const { count: after } = await supabase.from('vehicles').select('*', { count: 'exact', head: true })
  console.log('══════════════════════════════════════')
  console.log(`✅ تم حذف ${deleted} مركبة زائدة.`)
  console.log(`📊 المتبقي الآن: ${after}`)
  console.log('══════════════════════════════════════')
}

main().catch(console.error)
