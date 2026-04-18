const { createClient } = require('@supabase/supabase-js')
const XLSX = require('xlsx')

const supabase = createClient('https://dgjkhewkluzdnmvsbfxf.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRnamtoZXdrbHV6ZG5tdnNiZnhmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU4NDc1OTYsImV4cCI6MjA5MTQyMzU5Nn0.QDrcSnFl_UkGKXZpAvUzN2XwXMW-eP8RvM8iFEhvF5g')

async function uploadVehicles() {
  const workbook = XLSX.readFile('vehicles_template.xlsx')
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 })
  const headers = rows[0]
  const dataRows = rows.slice(2).filter(row => row[0])
  console.log('Found: ' + dataRows.length + ' vehicles')
  let success = 0, failed = 0
  for (let i = 0; i < dataRows.length; i += 50) {
    const batch = dataRows.slice(i, i + 50)
    const vehicles = batch.map(row => {
      const v = {}
      headers.forEach((h, idx) => { if (h && row[idx] !== undefined && row[idx] !== '') v[h] = String(row[idx]) })
      return v
    })
    const { error } = await supabase.from('vehicles').upsert(vehicles, { onConflict: 'plate_number' })
    if (error) { console.error('Error:', error.message); failed += batch.length }
    else { success += batch.length; console.log('Uploaded: ' + success + '/' + dataRows.length) }
  }
  console.log('Done! Success=' + success + ' Failed=' + failed)
}

uploadVehicles().catch(console.error)
