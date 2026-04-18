/**
 * سكريبت رفع صور الاستمارات دفعة واحدة
 * ==========================================
 * يقرأ صور الاستمارات من مجلد ويرفعها لـ Supabase Storage
 * ثم يربط كل صورة بالمركبة المطابقة حسب رقم اللوحة
 */

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// إعدادات Supabase
const SUPABASE_URL = 'https://dgjkhewkluzdnmvsbfxf.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRnamtoZXdrbHV6ZG5tdnNiZnhmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU4NDc1OTYsImV4cCI6MjA5MTQyMzU5Nn0.QDrcSnFl_UkGKXZpAvUzN2XwXMW-eP8RvM8iFEhvF5g'

// مسار المجلد
const IMAGES_FOLDER = 'C:\\Users\\faris\\fleet-system\\استمارات'

// اتصال بـ Supabase
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

async function uploadIstimaraImages() {
  console.log('='.repeat(60))
  console.log('🚀 بدء رفع صور الاستمارات...')
  console.log('='.repeat(60))

  // التحقق من وجود المجلد
  if (!fs.existsSync(IMAGES_FOLDER)) {
    console.log(`❌ المجلد غير موجود: ${IMAGES_FOLDER}`)
    return
  }

  // جلب كل المركبات من قاعدة البيانات
  console.log('\n📊 جلب بيانات المركبات من قاعدة البيانات...')
  const { data: vehicles, error } = await supabase
    .from('vehicles')
    .select('id, plate_numbers, plate_number')

  if (error) {
    console.log('❌ خطأ في جلب البيانات:', error.message)
    return
  }

  // تحويل المركبات لـ Map للبحث السريع
  const vehiclesMap = new Map()
  vehicles.forEach(v => {
    if (v.plate_numbers) {
      vehiclesMap.set(v.plate_numbers, v)
    }
  })

  console.log(`✅ تم جلب ${vehiclesMap.size} مركبة`)

  // قراءة الصور من المجلد
  const imageFiles = fs.readdirSync(IMAGES_FOLDER)
    .filter(f => f.toLowerCase().endsWith('.jpg'))

  console.log(`\n📁 عدد الصور في المجلد: ${imageFiles.length}`)

  // عدادات
  let successCount = 0
  let skippedCount = 0
  let errorCount = 0

  console.log('\n' + '='.repeat(60))
  console.log('🔄 بدء الرفع...')
  console.log('='.repeat(60) + '\n')

  // رفع الصور واحدة تلو الأخرى
  for (let idx = 0; idx < imageFiles.length; idx++) {
    const filename = imageFiles[idx]
    const plateNumber = path.parse(filename).name

    // البحث عن المركبة المطابقة
    const vehicle = vehiclesMap.get(plateNumber)

    if (!vehicle) {
      console.log(`⚠️  [${idx + 1}/${imageFiles.length}] تخطي ${filename} - لا توجد مركبة برقم ${plateNumber}`)
      skippedCount++
      continue
    }

    try {
      // قراءة الصورة
      const imagePath = path.join(IMAGES_FOLDER, filename)
      const imageBuffer = fs.readFileSync(imagePath)

      // رفع الصورة لـ Supabase Storage
      const storagePath = `istimara/${vehicle.id}/${filename}`

      const { error: uploadError } = await supabase.storage
        .from('fleet-files')
        .upload(storagePath, imageBuffer, {
          contentType: 'image/jpeg',
          upsert: true
        })

      if (uploadError) throw uploadError

      // الحصول على الرابط العام
      const { data: { publicUrl } } = supabase.storage
        .from('fleet-files')
        .getPublicUrl(storagePath)

      // تحديث قاعدة البيانات
      const { error: updateError } = await supabase
        .from('vehicles')
        .update({ istimara_image: publicUrl })
        .eq('id', vehicle.id)

      if (updateError) throw updateError

      console.log(`✅ [${idx + 1}/${imageFiles.length}] ${filename} → مركبة ${vehicle.plate_number}`)
      successCount++

    } catch (err) {
      console.log(`❌ [${idx + 1}/${imageFiles.length}] خطأ في ${filename}: ${err.message}`)
      errorCount++
    }

    // تأخير صغير لتجنب rate limiting
    await new Promise(resolve => setTimeout(resolve, 100))
  }

  // النتائج النهائية
  console.log('\n' + '='.repeat(60))
  console.log('📊 النتائج النهائية:')
  console.log('='.repeat(60))
  console.log(`✅ نجح: ${successCount}`)
  console.log(`⚠️  تخطي: ${skippedCount}`)
  console.log(`❌ فشل: ${errorCount}`)
  console.log(`📁 الإجمالي: ${imageFiles.length}`)
  console.log('='.repeat(60))
  console.log('\n🎉 انتهى الرفع!')
}

// تشغيل السكريبت
uploadIstimaraImages().catch(err => {
  console.error('\n❌ خطأ عام:', err.message)
  process.exit(1)
})
