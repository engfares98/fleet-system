const { createClient } = require('@supabase/supabase-js')
const XLSX = require('xlsx')
const readline = require('readline')

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

async function fetchAll() {
  let all = []
  let from = 0
  const pageSize = 1000
  while (true) {
    const { data, error } = await supabase.from('vehicles').select('*').order('created_at', { ascending: true }).range(from, from + pageSize - 1)
    if (error) throw error
    all = all.concat(data)
    if (!data || data.length < pageSize) break
    from += pageSize
  }
  return all
}

function ask(q) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  return new Promise(res => rl.question(q, ans => { rl.close(); res(ans.trim()) }))
}

async function main() {
  // 1. Read Excel
  console.log('📖 قراءة ملف vehicles_template.xlsx...')
  const wb = XLSX.readFile('vehicles_template.xlsx')
  const sheet = wb.Sheets[wb.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 })
  const dataRows = rows.slice(2).filter(row => row[0])  // skip 2 header rows
  const excelPlatesNorm = new Set(dataRows.map(r => normalizePlate(r[0])).filter(Boolean))
  console.log(`✅ الإكسل فيه ${excelPlatesNorm.size} مركبة فريدة`)

  // 2. Fetch DB
  console.log('⏳ جلب المركبات من قاعدة البيانات...')
  const dbAll = await fetchAll()
  console.log(`✅ قاعدة البيانات فيها ${dbAll.length} مركبة`)

  // 3. Find vehicles in DB NOT in Excel
  const orphans = []
  for (const v of dbAll) {
    const norm = normalizePlate(v.plate_number)
    if (!excelPlatesNorm.has(norm)) {
      orphans.push(v)
    }
  }

  if (orphans.length === 0) {
    console.log('\n✅ كل المركبات في قاعدة البيانات موجودة في الإكسل. لا حاجة للحذف.')
    return
  }

  console.log(`\n⚠️  وجدت ${orphans.length} مركبة في قاعدة البيانات لكن مش موجودة في الإكسل:\n`)
  orphans.forEach((v, i) => {
    const hasFiles = ['istimara_image', 'vehicle_image', 'operation_card_image', 'periodic_inspection_image', 'barrier_seal_image', 'handover_receipt_image'].some(k => v[k])
    const flag = hasFiles ? '⚠️  فيها مرفقات!' : ''
    console.log(`${(i + 1).toString().padStart(3, ' ')}. ${v.plate_number}${v.vehicle_code ? ` · ${v.vehicle_code}` : ''}  ${flag}`)
  })

  const withFiles = orphans.filter(v => ['istimara_image', 'vehicle_image', 'operation_card_image', 'periodic_inspection_image', 'barrier_seal_image', 'handover_receipt_image'].some(k => v[k]))
  if (withFiles.length > 0) {
    console.log(`\n⚠️  تنبيه: ${withFiles.length} منها فيها مرفقات أو صور! حذفها يحذف الروابط.`)
  }

  console.log(`\n📊 ملخص:`)
  console.log(`   قاعدة البيانات: ${dbAll.length}`)
  console.log(`   الإكسل: ${excelPlatesNorm.size}`)
  console.log(`   سيتم حذف: ${orphans.length}`)
  console.log(`   النتيجة: ${dbAll.length - orphans.length} مركبة`)

  const ans = await ask('\n❓ هل تريد المتابعة بحذف هذه المركبات؟ اكتب نعم للتأكيد: ')
  if (ans !== 'نعم' && ans.toLowerCase() !== 'yes' && ans.toLowerCase() !== 'y') {
    console.log('🚫 تم الإلغاء.')
    return
  }

  console.log('\n🗑️  جاري الحذف...')
  const ids = orphans.map(v => v.id)
  let deleted = 0
  for (let i = 0; i < ids.length; i += 100) {
    const chunk = ids.slice(i, i + 100)
    const { error } = await supabase.from('vehicles').delete().in('id', chunk)
    if (error) { console.error('❌ خطأ:', error.message); continue }
    deleted += chunk.length
    console.log(`   حُذف: ${deleted}/${ids.length}`)
  }
  console.log(`\n✅ تم حذف ${deleted} مركبة. قاعدة البيانات تطابق الإكسل الآن.`)
}

main().catch(e => console.error('❌ فشل:', e))
