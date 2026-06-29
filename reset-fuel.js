const { createClient } = require('@supabase/supabase-js')

const SUPABASE_URL = 'https://dgjkhewkluzdnmvsbfxf.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRnamtoZXdrbHV6ZG5tdnNiZnhmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU4NDc1OTYsImV4cCI6MjA5MTQyMzU5Nn0.QDrcSnFl_UkGKXZpAvUzN2XwXMW-eP8RvM8iFEhvF5g'

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

;(async () => {
  const { count: before } = await supabase.from('fuel_logs').select('*', { count: 'exact', head: true })
  console.log(`📊 السجلات قبل الحذف: ${before}`)

  console.log('🗑️  جارٍ حذف جميع سجلات fuel_logs...')
  const { error } = await supabase.from('fuel_logs').delete().not('id', 'is', null)
  if (error) { console.error('❌ فشل الحذف:', error.message); process.exit(1) }

  const { count: after } = await supabase.from('fuel_logs').select('*', { count: 'exact', head: true })
  console.log(`✅ السجلات بعد الحذف: ${after}`)
})().catch(e => { console.error(e); process.exit(1) })
