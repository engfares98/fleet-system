const { createClient } = require('@supabase/supabase-js')
const readline = require('readline')

const supabase = createClient(
  'https://dgjkhewkluzdnmvsbfxf.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRnamtoZXdrbHV6ZG5tdnNiZnhmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU4NDc1OTYsImV4cCI6MjA5MTQyMzU5Nn0.QDrcSnFl_UkGKXZpAvUzN2XwXMW-eP8RvM8iFEhvF5g'
)

// Normalize Arabic plate number — strips spaces, diacritics, normalizes letter variations
function normalizePlate(s) {
  if (!s) return ''
  return String(s)
    .replace(/[ً-ٰٟۖ-ۭ]/g, '') // remove Arabic diacritics
    .replace(/[إأآ]/g, 'ا')                              // normalize alef
    .replace(/[يى]/g, 'ي')                                // normalize yaa
    .replace(/ة/g, 'ه')                                   // taa marbuta -> haa
    .replace(/[ـ\s\-_.]/g, '')                            // remove spaces, dashes, underscores, dots
    .toLowerCase()
    .trim()
}

// Score a record by completeness — more filled fields & attachments = higher score (kept)
function score(v) {
  let s = 0
  const fields = ['vehicle_code', 'type', 'brand', 'model', 'year', 'chassis_number', 'color', 'fuel_type']
  for (const f of fields) if (v[f]) s += 1
  const attachments = ['istimara_image', 'vehicle_image', 'operation_card_image', 'periodic_inspection_image', 'barrier_seal_image', 'handover_receipt_image']
  for (const a of attachments) if (v[a]) s += 5  // attachments weighted more heavily
  if (v.preparation_status === 'ready') s += 2
  if (v.status === 'active') s += 1
  return s
}

async function fetchAll() {
  let all = []
  let from = 0
  const pageSize = 1000
  while (true) {
    const { data, error } = await supabase
      .from('vehicles')
      .select('*')
      .order('created_at', { ascending: true })
      .range(from, from + pageSize - 1)
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
  console.log('⏳ جاري جلب كل المركبات...')
  const all = await fetchAll()
  console.log(`✅ تم جلب ${all.length} مركبة`)

  // Group by normalized plate
  const groups = new Map()
  for (const v of all) {
    const key = normalizePlate(v.plate_number)
    if (!key) continue
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(v)
  }

  // Find duplicates
  const dupGroups = []
  for (const [key, list] of groups.entries()) {
    if (list.length > 1) dupGroups.push({ key, list })
  }

  if (dupGroups.length === 0) {
    console.log('✅ لا توجد مكررات. كل المركبات فريدة.')
    return
  }

  console.log(`\n⚠️  وجدت ${dupGroups.length} مجموعة مكررة (${dupGroups.reduce((n, g) => n + g.list.length - 1, 0)} مركبة سيتم حذفها)\n`)

  const toDelete = []
  for (const { list } of dupGroups) {
    // Sort by score (highest first), keep first, delete rest
    list.sort((a, b) => score(b) - score(a))
    const keep = list[0]
    const remove = list.slice(1)
    console.log(`🔁 ${keep.plate_number}  (${list.length} نسخ)`)
    console.log(`   ✅ سيُبقى: ID=${keep.id.slice(0, 8)}  بيانات=${score(keep)}`)
    for (const r of remove) {
      console.log(`   ❌ سيُحذف: ID=${r.id.slice(0, 8)}  بيانات=${score(r)}  لوحة="${r.plate_number}"`)
      toDelete.push(r.id)
    }
  }

  console.log(`\n📊 ملخص: حذف ${toDelete.length} نسخة مكررة، الإبقاء على ${dupGroups.length}`)
  const ans = await ask('\n❓ هل تريد المتابعة بالحذف؟ اكتب نعم للتأكيد: ')

  if (ans !== 'نعم' && ans.toLowerCase() !== 'yes' && ans.toLowerCase() !== 'y') {
    console.log('🚫 تم الإلغاء. لم يُحذف شيء.')
    return
  }

  console.log('\n🗑️  جاري الحذف...')
  let deleted = 0
  for (let i = 0; i < toDelete.length; i += 100) {
    const chunk = toDelete.slice(i, i + 100)
    const { error } = await supabase.from('vehicles').delete().in('id', chunk)
    if (error) { console.error('❌ خطأ:', error.message); continue }
    deleted += chunk.length
    console.log(`   حُذف: ${deleted}/${toDelete.length}`)
  }
  console.log(`\n✅ تم حذف ${deleted} نسخة مكررة بنجاح.`)
}

main().catch(e => console.error('❌ فشل:', e))
