const { createClient } = require('@supabase/supabase-js')
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
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
})

async function deleteAll() {
  const { count: before } = await supabase
    .from('vehicles')
    .select('*', { count: 'exact', head: true })
  console.log(`📊 عدد المركبات قبل الحذف: ${before}`)

  console.log('🗑️  جاري حذف كل المركبات...')
  const { error } = await supabase
    .from('vehicles')
    .delete()
    .not('plate_number', 'is', null)

  if (error) {
    console.error(`❌ خطأ في الحذف: ${error.message}`)
    process.exit(1)
  }

  const { count: after } = await supabase
    .from('vehicles')
    .select('*', { count: 'exact', head: true })

  console.log('══════════════════════════════════════')
  console.log(`✅ تم الحذف. المتبقي الآن: ${after}`)
  console.log('══════════════════════════════════════')
  if (after > 0) console.log('⚠️  ملاحظة: بقي صفوف (ربما بدون رقم لوحة). راجع لو لزم.')
}

deleteAll().catch(console.error)
