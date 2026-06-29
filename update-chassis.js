const { createClient } = require('@supabase/supabase-js')
const XLSX = require('xlsx')

const supabase = createClient(
  'https://dgjkhewkluzdnmvsbfxf.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRnamtoZXdrbHV6ZG5tdnNiZnhmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU4NDc1OTYsImV4cCI6MjA5MTQyMzU5Nn0.QDrcSnFl_UkGKXZpAvUzN2XwXMW-eP8RvM8iFEhvF5g'
)

function normalizePlate(s) {
  if (!s) return ''
  return String(s)
    .replace(/[ً-ٰٟۖ-ۭ]/g, '')
    .replace(/[إأآ]/g, 'ا')
    .replace(/[يى]/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/[ـ\s\-_.]/g, '')
    .toLowerCase()
    .trim()
}

async function main() {
  console.log('📖 قراءة الإكسل...')
  const wb = XLSX.readFile('vehicles_template.xlsx')
  const sheet = wb.Sheets[wb.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 })
  const headers = rows[0]
  const plateIdx = headers.indexOf('plate_number')
  const chassisIdx = headers.indexOf('chassis_number')

  if (plateIdx === -1 || chassisIdx === -1) {
    console.error('❌ الأعمدة plate_number أو chassis_number غير موجودة')
    return
  }

  // Build map: normalized plate -> chassis_number
  const map = new Map()
  for (const r of rows.slice(2)) {
    const plate = r[plateIdx]
    const chassis = r[chassisIdx]
    if (plate && chassis && String(chassis).trim()) {
      map.set(normalizePlate(plate), String(chassis).trim())
    }
  }
  console.log(`✅ ${map.size} مركبة لها رقم هيكل في الإكسل`)

  console.log('⏳ جلب المركبات من قاعدة البيانات...')
  let dbAll = []
  let from = 0
  while (true) {
    const { data, error } = await supabase.from('vehicles').select('id, plate_number, chassis_number').range(from, from + 999)
    if (error) { console.error('❌', error.message); return }
    dbAll = dbAll.concat(data)
    if (!data || data.length < 1000) break
    from += 1000
  }
  console.log(`✅ ${dbAll.length} مركبة في قاعدة البيانات`)

  // Match by normalized plate, find ones that need updating
  const toUpdate = []
  let alreadyOk = 0, notInExcel = 0
  for (const v of dbAll) {
    const norm = normalizePlate(v.plate_number)
    const excelChassis = map.get(norm)
    if (!excelChassis) { notInExcel++; continue }
    if ((v.chassis_number || '').trim() === excelChassis) { alreadyOk++; continue }
    toUpdate.push({ id: v.id, plate: v.plate_number, chassis: excelChassis })
  }

  console.log(`\n📊 ملخص:`)
  console.log(`   ✅ صحيحة بالفعل: ${alreadyOk}`)
  console.log(`   🔄 تحتاج تحديث: ${toUpdate.length}`)
  console.log(`   ❓ ليست في الإكسل: ${notInExcel}`)

  if (toUpdate.length === 0) {
    console.log('\n✅ كل المركبات لها رقم هيكل صحيح. لا حاجة للتحديث.')
    return
  }

  console.log(`\n🚀 جاري تحديث ${toUpdate.length} مركبة...\n`)
  let done = 0, failed = 0
  for (const u of toUpdate) {
    const { error } = await supabase.from('vehicles').update({ chassis_number: u.chassis }).eq('id', u.id)
    if (error) { console.error(`❌ ${u.plate}: ${error.message}`); failed++ }
    else done++
    if (done % 50 === 0) console.log(`   ${done}/${toUpdate.length}`)
  }
  console.log(`\n✅ تم تحديث ${done} مركبة. فشل: ${failed}`)
}

main().catch(e => console.error('❌ فشل:', e))
