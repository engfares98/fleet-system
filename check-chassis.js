const XLSX = require('xlsx')

const wb = XLSX.readFile('vehicles_template.xlsx')
const sheet = wb.Sheets[wb.SheetNames[0]]
const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 })

const headers = rows[0]
console.log('📋 الأعمدة الموجودة:')
headers.forEach((h, i) => console.log(`   ${i + 1}. "${h}"`))

const chassisIdx = headers.findIndex(h => h && String(h).toLowerCase().includes('chassis'))
const plateIdx = headers.findIndex(h => h === 'plate_number')

if (chassisIdx === -1) {
  console.log('\n❌ عمود chassis_number غير موجود في الإكسل!')
  console.log('   تأكد من أن أحد الأعمدة اسمه بالضبط: chassis_number')
  return
}

console.log(`\n✅ عمود رقم الهيكل في الموضع: ${chassisIdx + 1} (${headers[chassisIdx]})`)

const dataRows = rows.slice(2).filter(r => r[plateIdx])
const filled = dataRows.filter(r => r[chassisIdx] && String(r[chassisIdx]).trim()).length
const empty = dataRows.length - filled

console.log(`\n📊 إحصائيات رقم الهيكل في الإكسل:`)
console.log(`   إجمالي المركبات: ${dataRows.length}`)
console.log(`   ✅ معبأ: ${filled}`)
console.log(`   ⬜ فاضي: ${empty}`)

if (empty > 0) {
  console.log(`\n📝 أول 20 مركبة بدون رقم هيكل في الإكسل:`)
  let n = 0
  for (const r of dataRows) {
    if (!r[chassisIdx] || !String(r[chassisIdx]).trim()) {
      console.log(`   - ${r[plateIdx]}`)
      if (++n >= 20) break
    }
  }
}
