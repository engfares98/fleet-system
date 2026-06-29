const { createClient } = require('@supabase/supabase-js')
const XLSX = require('xlsx')

const SUPABASE_URL = 'https://dgjkhewkluzdnmvsbfxf.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRnamtoZXdrbHV6ZG5tdnNiZnhmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU4NDc1OTYsImV4cCI6MjA5MTQyMzU5Nn0.QDrcSnFl_UkGKXZpAvUzN2XwXMW-eP8RvM8iFEhvF5g'

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

;(async () => {
  const { data: vehicles } = await supabase.from('vehicles').select('plate_number, vehicle_code').limit(20)
  console.log('عينة من المركبات في قاعدة البيانات (أول 20):')
  vehicles.forEach((v, i) => console.log(`  ${i+1}. plate="${v.plate_number}" | code="${v.vehicle_code}"`))

  const wb = XLSX.readFile('fuel_template.xlsx')
  const sheet = wb.Sheets[wb.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 })
  console.log('\nرؤوس أعمدة ملف الوقود:')
  console.log(' ', rows[0])
  console.log('\nأول 5 صفوف من ملف الوقود:')
  rows.slice(2, 7).forEach((r, i) => console.log(`  ${i+1}.`, r))
})().catch(e => console.error(e))
