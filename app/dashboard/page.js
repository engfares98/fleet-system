'use client'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import jsPDF from 'jspdf'

export default function Dashboard() {
  const supabase = createClient()
  const router = useRouter()
  
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)
  const [userRole, setUserRole] = useState(null)
  const [lang, setLang] = useState('ar')
  
  const [vehicles, setVehicles] = useState([])
  const [drivers, setDrivers] = useState([])
  const [maintenance, setMaintenance] = useState([])
  const [fuelLogs, setFuelLogs] = useState([])
  const [incidents, setIncidents] = useState([])
  const [violations, setViolations] = useState([])
  const [users, setUsers] = useState([])
  
  const [activeTab, setActiveTab] = useState('vehicles')
  const [showAddModal, setShowAddModal] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [editItem, setEditItem] = useState(null)
  
  // البحث الذكي
  const [showDriverPicker, setShowDriverPicker] = useState(false)
  const [showVehiclePicker, setShowVehiclePicker] = useState(false)
  const [pickerSearch, setPickerSearch] = useState('')
  
  // حقول النماذج
  const [formData, setFormData] = useState({})
  
  const t = {
    ar: {
      dashboard: 'لوحة التحكم', vehicles: 'المركبات', drivers: 'السائقين',
      maintenance: 'الصيانة', fuel: 'الوقود', incidents: 'الحوادث',
      violations: 'المخالفات', users: 'المستخدمين', reports: 'التقارير',
      logout: 'تسجيل الخروج', add: 'إضافة', edit: 'تعديل', delete: 'حذف',
      save: 'حفظ', cancel: 'إلغاء', export: 'تصدير Excel', total: 'الإجمالي',
      active: 'نشط', inactive: 'غير نشط', open: 'مفتوح', closed: 'مغلق',
      paid: 'مدفوع', unpaid: 'غير مدفوع', status: 'الحالة',
      plateNumber: 'رقم اللوحة', vehicleType: 'نوع المركبة', model: 'الموديل',
      year: 'السنة', driverName: 'اسم السائق', licenseNumber: 'رقم الرخصة',
      phone: 'الجوال', date: 'التاريخ', type: 'النوع', cost: 'التكلفة',
      notes: 'ملاحظات', driver: 'السائق', vehicle: 'المركبة', quantity: 'الكمية',
      description: 'الوصف', location: 'الموقع', repairCost: 'تكلفة الإصلاح',
      violationNumber: 'رقم المخالفة', fineAmount: 'مبلغ الغرامة',
      email: 'البريد الإلكتروني', password: 'كلمة المرور', role: 'الصلاحية',
      admin: 'مدير', editor: 'محرر', viewer: 'مشاهد',
    },
    en: {
      dashboard: 'Dashboard', vehicles: 'Vehicles', drivers: 'Drivers',
      maintenance: 'Maintenance', fuel: 'Fuel', incidents: 'Incidents',
      violations: 'Violations', users: 'Users', reports: 'Reports',
      logout: 'Logout', add: 'Add', edit: 'Edit', delete: 'Delete',
      save: 'Save', cancel: 'Cancel', export: 'Export Excel', total: 'Total',
      active: 'Active', inactive: 'Inactive', open: 'Open', closed: 'Closed',
      paid: 'Paid', unpaid: 'Unpaid', status: 'Status',
      plateNumber: 'Plate Number', vehicleType: 'Vehicle Type', model: 'Model',
      year: 'Year', driverName: 'Driver Name', licenseNumber: 'License Number',
      phone: 'Phone', date: 'Date', type: 'Type', cost: 'Cost',
      notes: 'Notes', driver: 'Driver', vehicle: 'Vehicle', quantity: 'Quantity',
      description: 'Description', location: 'Location', repairCost: 'Repair Cost',
      violationNumber: 'Violation Number', fineAmount: 'Fine Amount',
      email: 'Email', password: 'Password', role: 'Role',
      admin: 'Admin', editor: 'Editor', viewer: 'Viewer',
    }
  }
  
  useEffect(() => { checkUser() }, [])
  
  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }
    setUser(user)
    const { data: userData } = await supabase.from('users').select('role').eq('email', user.email).single()
    setUserRole(userData?.role || 'viewer')
    fetchData()
    setLoading(false)
  }
  
  const fetchData = async () => {
    const { data: v } = await supabase.from('vehicles').select('*').order('created_at', { ascending: false })
    setVehicles(v || [])
    const { data: d } = await supabase.from('drivers').select('*').order('created_at', { ascending: false })
    setDrivers(d || [])
    const { data: m } = await supabase.from('maintenance').select('*, vehicles(plate_number)').order('maintenance_date', { ascending: false })
    setMaintenance(m || [])
    const { data: f } = await supabase.from('fuel_logs').select('*, vehicles(plate_number), drivers(name)').order('date', { ascending: false })
    setFuelLogs(f || [])
    const { data: i } = await supabase.from('incidents').select('*, vehicles(plate_number), drivers(name)').order('incident_date', { ascending: false })
    setIncidents(i || [])
    const { data: vio } = await supabase.from('violations').select('*, vehicles(plate_number), drivers(name)').order('violation_date', { ascending: false })
    setViolations(vio || [])
    if (userRole === 'admin') {
      const { data: u } = await supabase.from('users').select('*').order('created_at', { ascending: false })
      setUsers(u || [])
    }
  }
  
  const handleLogout = async () => { await supabase.auth.signOut(); router.push('/login') }
  
  const openAddModal = () => { setFormData({}); setEditMode(false); setEditItem(null); setShowAddModal(true) }
  
  const openEditModal = (item) => { setFormData(item); setEditMode(true); setEditItem(item); setShowAddModal(true) }
  
  const closeModal = () => { setShowAddModal(false); setFormData({}); setEditMode(false); setEditItem(null) }
  
  const handleSubmit = async () => {
    let table = ''
    let data = {}
    
    if (activeTab === 'vehicles') {
      if (!formData.plate_number || !formData.type) { alert(t[lang].plateNumber + ' & ' + t[lang].vehicleType + ' required'); return }
      
      let imageUrl = editMode ? editItem?.image : null
      let istimaraUrl = editMode ? editItem?.istimara_pdf : null
      let insuranceUrl = editMode ? editItem?.insurance_pdf : null
      
      if (formData.imageFile) imageUrl = await uploadFile(formData.imageFile, 'vehicles')
      if (formData.istimaraPdfFile) istimaraUrl = await uploadFile(formData.istimaraPdfFile, 'documents')
      if (formData.insurancePdfFile) insuranceUrl = await uploadFile(formData.insurancePdfFile, 'documents')
      
      table = 'vehicles'
      data = { 
        plate_number: formData.plate_number, 
        type: formData.type, 
        model: formData.model || '', 
        year: formData.year ? parseInt(formData.year) : null, 
        status: formData.status || 'active',
        image: imageUrl,
        istimara_pdf: istimaraUrl,
        insurance_pdf: insuranceUrl
      }
    } else if (activeTab === 'drivers') {
      if (!formData.name || !formData.license_number) { alert(t[lang].driverName + ' & ' + t[lang].licenseNumber + ' required'); return }
      
      let imageUrl = editMode ? editItem?.image : null
      let licenseUrl = editMode ? editItem?.license_pdf : null
      let iqamaUrl = editMode ? editItem?.iqama_pdf : null
      
      if (formData.imageFile) imageUrl = await uploadFile(formData.imageFile, 'drivers')
      if (formData.licensePdfFile) licenseUrl = await uploadFile(formData.licensePdfFile, 'documents')
      if (formData.iqamaPdfFile) iqamaUrl = await uploadFile(formData.iqamaPdfFile, 'documents')
      
      table = 'drivers'
      data = { 
        name: formData.name, 
        license_number: formData.license_number, 
        phone: formData.phone || '', 
        status: formData.status || 'active',
        image: imageUrl,
        license_pdf: licenseUrl,
        iqama_pdf: iqamaUrl
      }
    } else if (activeTab === 'maintenance') {
      if (!formData.vehicle_id || !formData.maintenance_type || !formData.maintenance_date) { alert('Required fields missing'); return }
      table = 'maintenance'
      data = { vehicle_id: formData.vehicle_id, maintenance_type: formData.maintenance_type, maintenance_date: formData.maintenance_date, cost: formData.cost ? parseFloat(formData.cost) : 0, notes: formData.notes || '' }
    } else if (activeTab === 'fuel') {
      if (!formData.vehicle_id || !formData.date) { alert('Required fields missing'); return }
      table = 'fuel_logs'
      data = { vehicle_id: formData.vehicle_id, driver_id: formData.driver_id || null, date: formData.date, quantity: formData.quantity ? parseFloat(formData.quantity) : 0, cost: formData.cost ? parseFloat(formData.cost) : 0, notes: formData.notes || '' }
    } else if (activeTab === 'incidents') {
      if (!formData.vehicle_id || !formData.incident_date) { alert('Required fields missing'); return }
      table = 'incidents'
      data = { vehicle_id: formData.vehicle_id, driver_id: formData.driver_id || null, incident_date: formData.incident_date, incident_type: formData.incident_type || 'accident', description: formData.description || '', location: formData.location || '', repair_cost: formData.repair_cost ? parseFloat(formData.repair_cost) : 0, status: formData.status || 'open', notes: formData.notes || '' }
    } else if (activeTab === 'violations') {
      if (!formData.vehicle_id || !formData.violation_date) { alert('Required fields missing'); return }
      table = 'violations'
      data = { vehicle_id: formData.vehicle_id, driver_id: formData.driver_id || null, violation_date: formData.violation_date, violation_number: formData.violation_number || '', violation_type: formData.violation_type || '', location: formData.location || '', fine_amount: formData.fine_amount ? parseFloat(formData.fine_amount) : 0, status: formData.status || 'unpaid', notes: formData.notes || '' }
    } else if (activeTab === 'users') {
      if (!formData.email) { alert('Email required'); return }
      table = 'users'
      data = { email: formData.email, role: formData.role || 'viewer' }
    }
    
    const { error } = editMode 
      ? await supabase.from(table).update(data).eq('id', editItem.id)
      : await supabase.from(table).insert(data)
    
    if (error) { alert(error.message); return }
    closeModal(); fetchData()
  }
  
  const handleDelete = async (id, table) => {
    if (!confirm(t[lang].delete + '?')) return
    const { error } = await supabase.from(table).delete().eq('id', id)
    if (error) { alert(error.message); return }
    fetchData()
  }
  
  const exportToExcel = (data, filename) => {
    if (!data?.length) { alert('No data'); return }
    const csv = [Object.keys(data[0]).join(','), ...data.map(r => Object.values(r).map(v => `"${v}"`).join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `${filename}.csv`; a.click()
  }
  
  const uploadFile = async (file, folder = 'vehicles') => {
    if (!file) return null
    const fileExt = file.name.split('.').pop()
    const fileName = `${Math.random()}.${fileExt}`
    const filePath = `${folder}/${fileName}`
    const { error } = await supabase.storage.from('fleet-files').upload(filePath, file)
    if (error) { console.error('Upload error:', error); return null }
    const { data } = supabase.storage.from('fleet-files').getPublicUrl(filePath)
    return data.publicUrl
  }
  const generatePDF = (type, itemId) => {
  const doc = new jsPDF()
  const w = doc.internal.pageSize.getWidth()
  
  doc.setFillColor(18, 130, 115)
  doc.rect(0, 0, w, 35, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(16)
  doc.text('أمانة المدينة - المجال المرئي', w/2, 20, {align: 'center'})
  
  doc.setTextColor(0, 0, 0)
  doc.setFontSize(12)
  
  if (type === 'vehicle') {
    const item = vehicles.find(v => v.id === itemId)
    if (!item) return
    doc.text('تقرير مركبة: ' + item.plate_number, 15, 50)
  } else if (type === 'driver') {
    const item = drivers.find(d => d.id === itemId)
    if (!item) return
    doc.text('تقرير سائق: ' + item.name, 15, 50)
  } else if (type === 'incident') {
    doc.text('تقرير حادث', 15, 50)
  } else if (type === 'violation') {
    doc.text('تقرير مخالفة', 15, 50)
  }
  
  doc.save(type + '_' + itemId + '.pdf')
}
  const generatePDF = async (type, itemId) => {
    const doc = new jsPDF()
    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()
    
    // روابط الشعارات
    const amanahLogo = 'https://dgjkhewkluzdnmvsbfxf.supabase.co/storage/v1/object/public/fleet-files/logos/WhatsApp%20Image%202026-04-11%20at%208.43.39%20PM.jpeg'
    const magLogo = 'https://dgjkhewkluzdnmvsbfxf.supabase.co/storage/v1/object/public/fleet-files/logos/WhatsApp%20Image%202026-04-11%20at%208.43.00%20PM.jpeg'
    
    // خلفية خضراء في الأعلى (لون الأمانة)
    doc.setFillColor(18, 130, 115)
    doc.rect(0, 0, pageWidth, 50, 'F')
    
    // إضافة الشعارات
    try {
      // شعار الأمانة (يسار)
      doc.addImage(amanahLogo, 'JPEG', 15, 8, 25, 25)
      // شعار المجال المرئي (يمين)
      doc.addImage(magLogo, 'JPEG', pageWidth - 40, 8, 25, 25)
    } catch (e) {
      console.log('Logo loading skipped')
    }
    
    // النصوص في الترويسة
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(16)
    doc.setFont(undefined, 'bold')
    const title1 = lang === 'ar' ? 'أمانة منطقة المدينة المنورة' : 'Madinah Regional Municipality'
    doc.text(title1, pageWidth / 2, 16, { align: 'center' })
    
    doc.setFontSize(13)
    const title2 = lang === 'ar' ? 'المجال المرئي' : 'Visual Field'
    doc.text(title2, pageWidth / 2, 24, { align: 'center' })
    
    doc.setFontSize(11)
    doc.setFont(undefined, 'normal')
    const title3 = lang === 'ar' ? 'نظام إدارة الأسطول' : 'Fleet Management System'
    doc.text(title3, pageWidth / 2, 32, { align: 'center' })
    
    // خط فاصل
    doc.setDrawColor(255, 255, 255)
    doc.setLineWidth(0.5)
    doc.line(10, 50, pageWidth - 10, 50)
    
    // التاريخ والرقم المرجعي
    doc.setFontSize(8)
    doc.setTextColor(255, 255, 255)
    const today = new Date().toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })
    doc.text((lang === 'ar' ? 'التاريخ: ' : 'Date: ') + today, 15, 45)
    const refNum = `REF-${Date.now().toString().slice(-6)}`
    doc.text((lang === 'ar' ? 'المرجع: ' : 'Ref: ') + refNum, pageWidth - 15, 45, { align: 'right' })
    
    doc.setTextColor(0, 0, 0)
    let yPos = 60
    
    if (type === 'vehicle') {
      const vehicle = vehicles.find(v => v.id === itemId)
      if (!vehicle) return
      
      // عنوان التقرير
      doc.setFillColor(240, 245, 243)
      doc.rect(10, yPos - 5, pageWidth - 20, 12, 'F')
      doc.setFontSize(16)
      doc.setFont(undefined, 'bold')
      doc.setTextColor(18, 130, 115)
      doc.text(lang === 'ar' ? 'تقرير مركبة' : 'Vehicle Report', pageWidth / 2, yPos + 2, { align: 'center' })
      yPos += 15
      
      // معلومات المركبة
      doc.setFontSize(11)
      doc.setFont(undefined, 'bold')
      doc.setTextColor(0, 0, 0)
      doc.text(lang === 'ar' ? 'بيانات المركبة:' : 'Vehicle Information:', 15, yPos)
      yPos += 8
      
      doc.setFont(undefined, 'normal')
      doc.setFontSize(10)
      const vehicleInfo = [
        { label: lang === 'ar' ? 'رقم اللوحة' : 'Plate Number', value: vehicle.plate_number },
        { label: lang === 'ar' ? 'نوع المركبة' : 'Type', value: vehicle.type },
        { label: lang === 'ar' ? 'الموديل' : 'Model', value: vehicle.model || '-' },
        { label: lang === 'ar' ? 'سنة الصنع' : 'Year', value: vehicle.year || '-' },
        { label: lang === 'ar' ? 'الحالة' : 'Status', value: lang === 'ar' ? (vehicle.status === 'active' ? 'نشط' : 'غير نشط') : vehicle.status }
      ]
      
      vehicleInfo.forEach(info => {
        doc.setFont(undefined, 'bold')
        doc.text(info.label + ':', 20, yPos)
        doc.setFont(undefined, 'normal')
        doc.text(info.value, 60, yPos)
        yPos += 6
      })
      yPos += 5
      
      // الصيانة
      const vehicleMaintenance = maintenance.filter(m => m.vehicle_id === itemId)
      if (vehicleMaintenance.length > 0) {
        doc.setFillColor(245, 250, 248)
        doc.rect(10, yPos - 3, pageWidth - 20, 8, 'F')
        doc.setFontSize(12)
        doc.setFont(undefined, 'bold')
        doc.setTextColor(18, 130, 115)
        doc.text(lang === 'ar' ? '🔧 سجل الصيانة' : '🔧 Maintenance History', 15, yPos + 2)
        yPos += 10
        
        doc.setFontSize(9)
        doc.setFont(undefined, 'normal')
        doc.setTextColor(0, 0, 0)
        const totalMaintenance = vehicleMaintenance.reduce((sum, m) => sum + (m.cost || 0), 0)
        doc.text(`${lang === 'ar' ? 'إجمالي التكلفة' : 'Total Cost'}: ${totalMaintenance.toFixed(2)} ${lang === 'ar' ? 'ريال' : 'SAR'}`, 20, yPos)
        yPos += 6
        
        vehicleMaintenance.slice(0, 8).forEach(m => {
          doc.text(`• ${m.maintenance_date} - ${m.maintenance_type} (${(m.cost || 0).toFixed(2)} ${lang === 'ar' ? 'ريال' : 'SAR'})`, 20, yPos)
          yPos += 5
        })
        yPos += 5
      }
      
      // الوقود
      const vehicleFuel = fuelLogs.filter(f => f.vehicle_id === itemId)
      if (vehicleFuel.length > 0 && yPos < 240) {
        doc.setFillColor(245, 250, 248)
        doc.rect(10, yPos - 3, pageWidth - 20, 8, 'F')
        doc.setFontSize(12)
        doc.setFont(undefined, 'bold')
        doc.setTextColor(18, 130, 115)
        doc.text(lang === 'ar' ? '⛽ سجل الوقود' : '⛽ Fuel History', 15, yPos + 2)
        yPos += 10
        
        doc.setFontSize(9)
        doc.setFont(undefined, 'normal')
        doc.setTextColor(0, 0, 0)
        const totalFuel = vehicleFuel.reduce((sum, f) => sum + (f.cost || 0), 0)
        const totalQty = vehicleFuel.reduce((sum, f) => sum + (f.quantity || 0), 0)
        doc.text(`${lang === 'ar' ? 'عدد التعبئات' : 'Fill-ups'}: ${vehicleFuel.length} | ${lang === 'ar' ? 'الكمية' : 'Quantity'}: ${totalQty.toFixed(1)} ${lang === 'ar' ? 'لتر' : 'L'} | ${lang === 'ar' ? 'التكلفة' : 'Cost'}: ${totalFuel.toFixed(2)} ${lang === 'ar' ? 'ريال' : 'SAR'}`, 20, yPos)
        yPos += 8
      }
      
      // الحوادث
      const vehicleIncidents = incidents.filter(i => i.vehicle_id === itemId)
      if (vehicleIncidents.length > 0 && yPos < 240) {
        doc.setFillColor(254, 242, 242)
        doc.rect(10, yPos - 3, pageWidth - 20, 8, 'F')
        doc.setFontSize(12)
        doc.setFont(undefined, 'bold')
        doc.setTextColor(220, 38, 38)
        doc.text(lang === 'ar' ? '🚨 الحوادث' : '🚨 Incidents', 15, yPos + 2)
        yPos += 10
        
        doc.setFontSize(9)
        doc.setFont(undefined, 'normal')
        doc.setTextColor(0, 0, 0)
        vehicleIncidents.slice(0, 5).forEach(i => {
          doc.text(`• ${i.incident_date} - ${i.description || '-'} (${(i.repair_cost || 0).toFixed(2)} ${lang === 'ar' ? 'ريال' : 'SAR'})`, 20, yPos)
          yPos += 5
        })
      }
      
    } else if (type === 'driver') {
      const driver = drivers.find(d => d.id === itemId)
      if (!driver) return
      
      doc.setFillColor(240, 245, 243)
      doc.rect(10, yPos - 5, pageWidth - 20, 12, 'F')
      doc.setFontSize(16)
      doc.setFont(undefined, 'bold')
      doc.setTextColor(18, 130, 115)
      doc.text(lang === 'ar' ? 'تقرير سائق' : 'Driver Report', pageWidth / 2, yPos + 2, { align: 'center' })
      yPos += 15
      
      doc.setFontSize(11)
      doc.setFont(undefined, 'bold')
      doc.setTextColor(0, 0, 0)
      doc.text(lang === 'ar' ? 'بيانات السائق:' : 'Driver Information:', 15, yPos)
      yPos += 8
      
      doc.setFont(undefined, 'normal')
      doc.setFontSize(10)
      const driverInfo = [
        { label: lang === 'ar' ? 'الاسم' : 'Name', value: driver.name },
        { label: lang === 'ar' ? 'رقم الرخصة' : 'License', value: driver.license_number },
        { label: lang === 'ar' ? 'الجوال' : 'Phone', value: driver.phone || '-' },
        { label: lang === 'ar' ? 'الحالة' : 'Status', value: lang === 'ar' ? (driver.status === 'active' ? 'نشط' : 'غير نشط') : driver.status }
      ]
      
      driverInfo.forEach(info => {
        doc.setFont(undefined, 'bold')
        doc.text(info.label + ':', 20, yPos)
        doc.setFont(undefined, 'normal')
        doc.text(info.value, 60, yPos)
        yPos += 6
      })
      yPos += 5
      
      const driverFuel = fuelLogs.filter(f => f.driver_id === itemId)
      if (driverFuel.length > 0) {
        doc.setFillColor(245, 250, 248)
        doc.rect(10, yPos - 3, pageWidth - 20, 8, 'F')
        doc.setFontSize(12)
        doc.setFont(undefined, 'bold')
        doc.setTextColor(18, 130, 115)
        doc.text(lang === 'ar' ? '⛽ رحلات الوقود' : '⛽ Fuel Trips', 15, yPos + 2)
        yPos += 10
        
        doc.setFontSize(9)
        doc.setFont(undefined, 'normal')
        doc.setTextColor(0, 0, 0)
        doc.text(`${lang === 'ar' ? 'عدد الرحلات' : 'Total Trips'}: ${driverFuel.length}`, 20, yPos)
        yPos += 8
      }
      
      const driverIncidents = incidents.filter(i => i.driver_id === itemId)
      if (driverIncidents.length > 0) {
        doc.setFillColor(254, 242, 242)
        doc.rect(10, yPos - 3, pageWidth - 20, 8, 'F')
        doc.setFontSize(12)
        doc.setFont(undefined, 'bold')
        doc.setTextColor(220, 38, 38)
        doc.text(lang === 'ar' ? '🚨 الحوادث' : '🚨 Incidents', 15, yPos + 2)
        yPos += 10
        
        doc.setFontSize(9)
        doc.setFont(undefined, 'normal')
        doc.setTextColor(0, 0, 0)
        driverIncidents.slice(0, 8).forEach(i => {
          doc.text(`• ${i.incident_date} - ${i.description || '-'}`, 20, yPos)
          yPos += 5
        })
      }
      
    } else if (type === 'incident') {
      const incident = incidents.find(i => i.id === itemId)
      if (!incident) return
      
      doc.setFillColor(254, 242, 242)
      doc.rect(10, yPos - 5, pageWidth - 20, 12, 'F')
      doc.setFontSize(16)
      doc.setFont(undefined, 'bold')
      doc.setTextColor(220, 38, 38)
      doc.text(lang === 'ar' ? 'تقرير حادث' : 'Incident Report', pageWidth / 2, yPos + 2, { align: 'center' })
      yPos += 15
      
      doc.setFontSize(11)
      doc.setFont(undefined, 'bold')
      doc.setTextColor(0, 0, 0)
      doc.text(lang === 'ar' ? 'تفاصيل الحادث:' : 'Incident Details:', 15, yPos)
      yPos += 8
      
      doc.setFont(undefined, 'normal')
      doc.setFontSize(10)
      const incidentInfo = [
        { label: lang === 'ar' ? 'التاريخ' : 'Date', value: incident.incident_date },
        { label: lang === 'ar' ? 'المركبة' : 'Vehicle', value: incident.vehicles?.plate_number || '-' },
        { label: lang === 'ar' ? 'السائق' : 'Driver', value: incident.drivers?.name || '-' },
        { label: lang === 'ar' ? 'الموقع' : 'Location', value: incident.location || '-' },
        { label: lang === 'ar' ? 'التكلفة' : 'Cost', value: `${(incident.repair_cost || 0).toFixed(2)} ${lang === 'ar' ? 'ريال' : 'SAR'}` },
        { label: lang === 'ar' ? 'الحالة' : 'Status', value: lang === 'ar' ? (incident.status === 'open' ? 'مفتوح' : 'مغلق') : incident.status }
      ]
      
      incidentInfo.forEach(info => {
        doc.setFont(undefined, 'bold')
        doc.text(info.label + ':', 20, yPos)
        doc.setFont(undefined, 'normal')
        doc.text(info.value, 60, yPos)
        yPos += 6
      })
      
      if (incident.description) {
        yPos += 3
        doc.setFont(undefined, 'bold')
        doc.text(lang === 'ar' ? 'الوصف:' : 'Description:', 20, yPos)
        yPos += 5
        doc.setFont(undefined, 'normal')
        const descLines = doc.splitTextToSize(incident.description, pageWidth - 50)
        doc.text(descLines, 25, yPos)
        yPos += (descLines.length * 5)
      }
      
    } else if (type === 'violation') {
      const violation = violations.find(v => v.id === itemId)
      if (!violation) return
      
      doc.setFillColor(254, 242, 242)
      doc.rect(10, yPos - 5, pageWidth - 20, 12, 'F')
      doc.setFontSize(16)
      doc.setFont(undefined, 'bold')
      doc.setTextColor(220, 38, 38)
      doc.text(lang === 'ar' ? 'تقرير مخالفة مرورية' : 'Traffic Violation Report', pageWidth / 2, yPos + 2, { align: 'center' })
      yPos += 15
      
      doc.setFontSize(11)
      doc.setFont(undefined, 'bold')
      doc.setTextColor(0, 0, 0)
      doc.text(lang === 'ar' ? 'تفاصيل المخالفة:' : 'Violation Details:', 15, yPos)
      yPos += 8
      
      doc.setFont(undefined, 'normal')
      doc.setFontSize(10)
      const violationInfo = [
        { label: lang === 'ar' ? 'التاريخ' : 'Date', value: violation.violation_date },
        { label: lang === 'ar' ? 'رقم المخالفة' : 'Number', value: violation.violation_number || '-' },
        { label: lang === 'ar' ? 'المركبة' : 'Vehicle', value: violation.vehicles?.plate_number || '-' },
        { label: lang === 'ar' ? 'السائق' : 'Driver', value: violation.drivers?.name || '-' },
        { label: lang === 'ar' ? 'النوع' : 'Type', value: violation.violation_type || '-' },
        { label: lang === 'ar' ? 'الموقع' : 'Location', value: violation.location || '-' },
        { label: lang === 'ar' ? 'الغرامة' : 'Fine', value: `${(violation.fine_amount || 0).toFixed(2)} ${lang === 'ar' ? 'ريال' : 'SAR'}` },
        { label: lang === 'ar' ? 'الحالة' : 'Status', value: lang === 'ar' ? (violation.status === 'paid' ? 'مدفوع' : 'غير مدفوع') : violation.status }
      ]
      
      violationInfo.forEach(info => {
        doc.setFont(undefined, 'bold')
        doc.text(info.label + ':', 20, yPos)
        doc.setFont(undefined, 'normal')
        doc.text(info.value, 60, yPos)
        yPos += 6
      })
    }
    
    // تذييل رسمي مع الشعارات
    doc.setDrawColor(18, 130, 115)
    doc.setLineWidth(0.8)
    doc.line(10, pageHeight - 25, pageWidth - 10, pageHeight - 25)
    
    // شعارات صغيرة في التذييل
    try {
      doc.addImage(amanahLogo, 'JPEG', 15, pageHeight - 22, 12, 12)
      doc.addImage(magLogo, 'JPEG', pageWidth - 27, pageHeight - 22, 12, 12)
    } catch (e) {
      console.log('Footer logos skipped')
    }
    
    doc.setFontSize(8)
    doc.setTextColor(18, 130, 115)
    doc.setFont(undefined, 'bold')
    doc.text(lang === 'ar' ? 'أمانة منطقة المدينة المنورة - المجال المرئي' : 'Madinah Regional Municipality - Visual Field', pageWidth / 2, pageHeight - 18, { align: 'center' })
    doc.setFont(undefined, 'normal')
    doc.setFontSize(7)
    doc.setTextColor(100, 100, 100)
    doc.text(lang === 'ar' ? 'نظام إدارة الأسطول | وثيقة رسمية' : 'Fleet Management System | Official Document', pageWidth / 2, pageHeight - 13, { align: 'center' })
    
    doc.save(`${type}_${refNum}_${Date.now()}.pdf`)
  }
    
    if (type === 'vehicle') {
      const vehicle = vehicles.find(v => v.id === itemId)
      if (!vehicle) return
      
      // عنوان التقرير مع خط سفلي
      doc.setFillColor(240, 240, 240)
      doc.rect(10, yPos - 5, pageWidth - 20, 12, 'F')
      doc.setFontSize(16)
      doc.setFont(undefined, 'bold')
      doc.setTextColor(18, 130, 115)
      doc.text(lang === 'ar' ? 'تقرير مركبة' : 'Vehicle Report', pageWidth / 2, yPos + 2, { align: 'center' })
      yPos += 15
      
      // معلومات المركبة
      doc.setFontSize(11)
      doc.setFont(undefined, 'bold')
      doc.setTextColor(0, 0, 0)
      doc.text(lang === 'ar' ? 'بيانات المركبة:' : 'Vehicle Information:', 15, yPos)
      yPos += 8
      
      doc.setFont(undefined, 'normal')
      doc.setFontSize(10)
      const vehicleInfo = [
        { label: lang === 'ar' ? 'رقم اللوحة' : 'Plate Number', value: vehicle.plate_number },
        { label: lang === 'ar' ? 'نوع المركبة' : 'Type', value: vehicle.type },
        { label: lang === 'ar' ? 'الموديل' : 'Model', value: vehicle.model || '-' },
        { label: lang === 'ar' ? 'سنة الصنع' : 'Year', value: vehicle.year || '-' },
        { label: lang === 'ar' ? 'الحالة' : 'Status', value: lang === 'ar' ? (vehicle.status === 'active' ? 'نشط' : 'غير نشط') : vehicle.status }
      ]
      
      vehicleInfo.forEach(info => {
        doc.setFont(undefined, 'bold')
        doc.text(info.label + ':', 20, yPos)
        doc.setFont(undefined, 'normal')
        doc.text(info.value, 60, yPos)
        yPos += 6
      })
      yPos += 5
      
      // الصيانة
      const vehicleMaintenance = maintenance.filter(m => m.vehicle_id === itemId)
      if (vehicleMaintenance.length > 0) {
        doc.setFillColor(245, 245, 245)
        doc.rect(10, yPos - 3, pageWidth - 20, 8, 'F')
        doc.setFontSize(12)
        doc.setFont(undefined, 'bold')
        doc.setTextColor(18, 130, 115)
        doc.text(lang === 'ar' ? '📋 سجل الصيانة' : '📋 Maintenance History', 15, yPos + 2)
        yPos += 10
        
        doc.setFontSize(9)
        doc.setFont(undefined, 'normal')
        doc.setTextColor(0, 0, 0)
        const totalMaintenance = vehicleMaintenance.reduce((sum, m) => sum + (m.cost || 0), 0)
        doc.text(`${lang === 'ar' ? 'إجمالي التكلفة' : 'Total Cost'}: ${totalMaintenance.toFixed(2)} ${lang === 'ar' ? 'ريال' : 'SAR'}`, 20, yPos)
        yPos += 6
        
        vehicleMaintenance.slice(0, 8).forEach(m => {
          doc.text(`• ${m.maintenance_date} - ${m.maintenance_type} (${(m.cost || 0).toFixed(2)} ${lang === 'ar' ? 'ريال' : 'SAR'})`, 20, yPos)
          yPos += 5
        })
        yPos += 5
      }
      
      // الوقود
      const vehicleFuel = fuelLogs.filter(f => f.vehicle_id === itemId)
      if (vehicleFuel.length > 0 && yPos < 240) {
        doc.setFillColor(245, 245, 245)
        doc.rect(10, yPos - 3, pageWidth - 20, 8, 'F')
        doc.setFontSize(12)
        doc.setFont(undefined, 'bold')
        doc.setTextColor(18, 130, 115)
        doc.text(lang === 'ar' ? '⛽ سجل الوقود' : '⛽ Fuel History', 15, yPos + 2)
        yPos += 10
        
        doc.setFontSize(9)
        doc.setFont(undefined, 'normal')
        doc.setTextColor(0, 0, 0)
        const totalFuel = vehicleFuel.reduce((sum, f) => sum + (f.cost || 0), 0)
        const totalQty = vehicleFuel.reduce((sum, f) => sum + (f.quantity || 0), 0)
        doc.text(`${lang === 'ar' ? 'عدد التعبئات' : 'Fill-ups'}: ${vehicleFuel.length} | ${lang === 'ar' ? 'الكمية' : 'Quantity'}: ${totalQty.toFixed(1)} ${lang === 'ar' ? 'لتر' : 'L'} | ${lang === 'ar' ? 'التكلفة' : 'Cost'}: ${totalFuel.toFixed(2)} ${lang === 'ar' ? 'ريال' : 'SAR'}`, 20, yPos)
        yPos += 8
      }
      
      // الحوادث
      const vehicleIncidents = incidents.filter(i => i.vehicle_id === itemId)
      if (vehicleIncidents.length > 0 && yPos < 240) {
        doc.setFillColor(245, 245, 245)
        doc.rect(10, yPos - 3, pageWidth - 20, 8, 'F')
        doc.setFontSize(12)
        doc.setFont(undefined, 'bold')
        doc.setTextColor(220, 38, 38)
        doc.text(lang === 'ar' ? '🚨 الحوادث' : '🚨 Incidents', 15, yPos + 2)
        yPos += 10
        
        doc.setFontSize(9)
        doc.setFont(undefined, 'normal')
        doc.setTextColor(0, 0, 0)
        vehicleIncidents.slice(0, 5).forEach(i => {
          doc.text(`• ${i.incident_date} - ${i.description || '-'} (${(i.repair_cost || 0).toFixed(2)} ${lang === 'ar' ? 'ريال' : 'SAR'})`, 20, yPos)
          yPos += 5
        })
      }
      
    } else if (type === 'driver') {
      const driver = drivers.find(d => d.id === itemId)
      if (!driver) return
      
      doc.setFillColor(240, 240, 240)
      doc.rect(10, yPos - 5, pageWidth - 20, 12, 'F')
      doc.setFontSize(16)
      doc.setFont(undefined, 'bold')
      doc.setTextColor(18, 130, 115)
      doc.text(lang === 'ar' ? 'تقرير سائق' : 'Driver Report', pageWidth / 2, yPos + 2, { align: 'center' })
      yPos += 15
      
      doc.setFontSize(11)
      doc.setFont(undefined, 'bold')
      doc.setTextColor(0, 0, 0)
      doc.text(lang === 'ar' ? 'بيانات السائق:' : 'Driver Information:', 15, yPos)
      yPos += 8
      
      doc.setFont(undefined, 'normal')
      doc.setFontSize(10)
      const driverInfo = [
        { label: lang === 'ar' ? 'الاسم' : 'Name', value: driver.name },
        { label: lang === 'ar' ? 'رقم الرخصة' : 'License', value: driver.license_number },
        { label: lang === 'ar' ? 'الجوال' : 'Phone', value: driver.phone || '-' },
        { label: lang === 'ar' ? 'الحالة' : 'Status', value: lang === 'ar' ? (driver.status === 'active' ? 'نشط' : 'غير نشط') : driver.status }
      ]
      
      driverInfo.forEach(info => {
        doc.setFont(undefined, 'bold')
        doc.text(info.label + ':', 20, yPos)
        doc.setFont(undefined, 'normal')
        doc.text(info.value, 60, yPos)
        yPos += 6
      })
      yPos += 5
      
      const driverFuel = fuelLogs.filter(f => f.driver_id === itemId)
      if (driverFuel.length > 0) {
        doc.setFillColor(245, 245, 245)
        doc.rect(10, yPos - 3, pageWidth - 20, 8, 'F')
        doc.setFontSize(12)
        doc.setFont(undefined, 'bold')
        doc.setTextColor(18, 130, 115)
        doc.text(lang === 'ar' ? '⛽ رحلات الوقود' : '⛽ Fuel Trips', 15, yPos + 2)
        yPos += 10
        
        doc.setFontSize(9)
        doc.setFont(undefined, 'normal')
        doc.setTextColor(0, 0, 0)
        doc.text(`${lang === 'ar' ? 'عدد الرحلات' : 'Total Trips'}: ${driverFuel.length}`, 20, yPos)
        yPos += 8
      }
      
      const driverIncidents = incidents.filter(i => i.driver_id === itemId)
      if (driverIncidents.length > 0) {
        doc.setFillColor(245, 245, 245)
        doc.rect(10, yPos - 3, pageWidth - 20, 8, 'F')
        doc.setFontSize(12)
        doc.setFont(undefined, 'bold')
        doc.setTextColor(220, 38, 38)
        doc.text(lang === 'ar' ? '🚨 الحوادث' : '🚨 Incidents', 15, yPos + 2)
        yPos += 10
        
        doc.setFontSize(9)
        doc.setFont(undefined, 'normal')
        doc.setTextColor(0, 0, 0)
        driverIncidents.slice(0, 8).forEach(i => {
          doc.text(`• ${i.incident_date} - ${i.description || '-'}`, 20, yPos)
          yPos += 5
        })
      }
      
    } else if (type === 'incident') {
      const incident = incidents.find(i => i.id === itemId)
      if (!incident) return
      
      doc.setFillColor(240, 240, 240)
      doc.rect(10, yPos - 5, pageWidth - 20, 12, 'F')
      doc.setFontSize(16)
      doc.setFont(undefined, 'bold')
      doc.setTextColor(220, 38, 38)
      doc.text(lang === 'ar' ? 'تقرير حادث' : 'Incident Report', pageWidth / 2, yPos + 2, { align: 'center' })
      yPos += 15
      
      doc.setFontSize(11)
      doc.setFont(undefined, 'bold')
      doc.setTextColor(0, 0, 0)
      doc.text(lang === 'ar' ? 'تفاصيل الحادث:' : 'Incident Details:', 15, yPos)
      yPos += 8
      
      doc.setFont(undefined, 'normal')
      doc.setFontSize(10)
      const incidentInfo = [
        { label: lang === 'ar' ? 'التاريخ' : 'Date', value: incident.incident_date },
        { label: lang === 'ar' ? 'المركبة' : 'Vehicle', value: incident.vehicles?.plate_number || '-' },
        { label: lang === 'ar' ? 'السائق' : 'Driver', value: incident.drivers?.name || '-' },
        { label: lang === 'ar' ? 'الموقع' : 'Location', value: incident.location || '-' },
        { label: lang === 'ar' ? 'التكلفة' : 'Cost', value: `${(incident.repair_cost || 0).toFixed(2)} ${lang === 'ar' ? 'ريال' : 'SAR'}` },
        { label: lang === 'ar' ? 'الحالة' : 'Status', value: lang === 'ar' ? (incident.status === 'open' ? 'مفتوح' : 'مغلق') : incident.status }
      ]
      
      incidentInfo.forEach(info => {
        doc.setFont(undefined, 'bold')
        doc.text(info.label + ':', 20, yPos)
        doc.setFont(undefined, 'normal')
        doc.text(info.value, 60, yPos)
        yPos += 6
      })
      
      if (incident.description) {
        yPos += 3
        doc.setFont(undefined, 'bold')
        doc.text(lang === 'ar' ? 'الوصف:' : 'Description:', 20, yPos)
        yPos += 5
        doc.setFont(undefined, 'normal')
        const descLines = doc.splitTextToSize(incident.description, pageWidth - 50)
        doc.text(descLines, 25, yPos)
        yPos += (descLines.length * 5)
      }
      
    } else if (type === 'violation') {
      const violation = violations.find(v => v.id === itemId)
      if (!violation) return
      
      doc.setFillColor(240, 240, 240)
      doc.rect(10, yPos - 5, pageWidth - 20, 12, 'F')
      doc.setFontSize(16)
      doc.setFont(undefined, 'bold')
      doc.setTextColor(220, 38, 38)
      doc.text(lang === 'ar' ? 'تقرير مخالفة مرورية' : 'Traffic Violation Report', pageWidth / 2, yPos + 2, { align: 'center' })
      yPos += 15
      
      doc.setFontSize(11)
      doc.setFont(undefined, 'bold')
      doc.setTextColor(0, 0, 0)
      doc.text(lang === 'ar' ? 'تفاصيل المخالفة:' : 'Violation Details:', 15, yPos)
      yPos += 8
      
      doc.setFont(undefined, 'normal')
      doc.setFontSize(10)
      const violationInfo = [
        { label: lang === 'ar' ? 'التاريخ' : 'Date', value: violation.violation_date },
        { label: lang === 'ar' ? 'رقم المخالفة' : 'Number', value: violation.violation_number || '-' },
        { label: lang === 'ar' ? 'المركبة' : 'Vehicle', value: violation.vehicles?.plate_number || '-' },
        { label: lang === 'ar' ? 'السائق' : 'Driver', value: violation.drivers?.name || '-' },
        { label: lang === 'ar' ? 'النوع' : 'Type', value: violation.violation_type || '-' },
        { label: lang === 'ar' ? 'الموقع' : 'Location', value: violation.location || '-' },
        { label: lang === 'ar' ? 'الغرامة' : 'Fine', value: `${(violation.fine_amount || 0).toFixed(2)} ${lang === 'ar' ? 'ريال' : 'SAR'}` },
        { label: lang === 'ar' ? 'الحالة' : 'Status', value: lang === 'ar' ? (violation.status === 'paid' ? 'مدفوع' : 'غير مدفوع') : violation.status }
      ]
      
      violationInfo.forEach(info => {
        doc.setFont(undefined, 'bold')
        doc.text(info.label + ':', 20, yPos)
        doc.setFont(undefined, 'normal')
        doc.text(info.value, 60, yPos)
        yPos += 6
      })
    }
    
    // تذييل رسمي
    doc.setDrawColor(18, 130, 115)
    doc.setLineWidth(0.5)
    doc.line(10, pageHeight - 20, pageWidth - 10, pageHeight - 20)
    
    doc.setFontSize(8)
    doc.setTextColor(100, 100, 100)
    doc.setFont(undefined, 'normal')
    doc.text(lang === 'ar' ? 'أمانة منطقة المدينة المنورة - المجال المرئي' : 'Madinah Regional Municipality - Visual Field', pageWidth / 2, pageHeight - 15, { align: 'center' })
    doc.text(lang === 'ar' ? 'نظام إدارة الأسطول' : 'Fleet Management System', pageWidth / 2, pageHeight - 10, { align: 'center' })
    
    doc.save(`${type}_${itemId}_${Date.now()}.pdf`)
  }
  
  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="text-xl">{lang === 'ar' ? 'جاري التحميل...' : 'Loading...'}</div></div>
  
  const renderTable = () => {
    let data = [], columns = [], tableName = ''
    
    if (activeTab === 'vehicles') {
      data = vehicles
      tableName = 'vehicles'
      columns = [
        { key: 'plate_number', label: t[lang].plateNumber },
        { key: 'type', label: t[lang].vehicleType },
        { key: 'model', label: t[lang].model },
        { key: 'year', label: t[lang].year },
        { key: 'status', label: t[lang].status, badge: true },
        { key: 'image', label: lang === 'ar' ? 'الصورة' : 'Image', isImage: true },
        { key: 'pdf', label: 'PDF', isPdf: true }
      ]
    } else if (activeTab === 'drivers') {
      data = drivers
      tableName = 'drivers'
      columns = [
        { key: 'name', label: t[lang].driverName },
        { key: 'license_number', label: t[lang].licenseNumber },
        { key: 'phone', label: t[lang].phone },
        { key: 'status', label: t[lang].status, badge: true },
        { key: 'image', label: lang === 'ar' ? 'الصورة' : 'Image', isImage: true },
        { key: 'pdf', label: 'PDF', isPdf: true }
      ]
    } else if (activeTab === 'maintenance') {
      data = maintenance
      tableName = 'maintenance'
      columns = [
        { key: 'vehicles.plate_number', label: t[lang].vehicle, nested: true },
        { key: 'maintenance_type', label: t[lang].type },
        { key: 'maintenance_date', label: t[lang].date },
        { key: 'cost', label: t[lang].cost }
      ]
    } else if (activeTab === 'fuel') {
      data = fuelLogs
      tableName = 'fuel_logs'
      columns = [
        { key: 'vehicles.plate_number', label: t[lang].vehicle, nested: true },
        { key: 'drivers.name', label: t[lang].driver, nested: true },
        { key: 'date', label: t[lang].date },
        { key: 'quantity', label: t[lang].quantity },
        { key: 'cost', label: t[lang].cost }
      ]
    } else if (activeTab === 'incidents') {
      data = incidents
      tableName = 'incidents'
      columns = [
        { key: 'vehicles.plate_number', label: t[lang].vehicle, nested: true },
        { key: 'drivers.name', label: t[lang].driver, nested: true },
        { key: 'incident_date', label: t[lang].date },
        { key: 'description', label: t[lang].description },
        { key: 'repair_cost', label: t[lang].repairCost },
        { key: 'status', label: t[lang].status, badge: true },
        { key: 'pdf', label: 'PDF', isPdf: true }
      ]
    } else if (activeTab === 'violations') {
      data = violations
      tableName = 'violations'
      columns = [
        { key: 'vehicles.plate_number', label: t[lang].vehicle, nested: true },
        { key: 'drivers.name', label: t[lang].driver, nested: true },
        { key: 'violation_date', label: t[lang].date },
        { key: 'violation_number', label: t[lang].violationNumber },
        { key: 'fine_amount', label: t[lang].fineAmount },
        { key: 'status', label: t[lang].status, badge: true },
        { key: 'pdf', label: 'PDF', isPdf: true }
      ]
    } else if (activeTab === 'users') {
      data = users
      tableName = 'users'
      columns = [
        { key: 'email', label: t[lang].email },
        { key: 'role', label: t[lang].role, badge: true }
      ]
    }
    
    const getValue = (item, key) => {
      if (key.includes('.')) {
        const parts = key.split('.')
        return item[parts[0]]?.[parts[1]] || '-'
      }
      return item[key] || '-'
    }
    
    return (
      <div className="overflow-x-auto border rounded-lg">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              {columns.map(col => (
                <th key={col.key} className="px-4 py-3 text-start text-sm font-semibold text-gray-700">{col.label}</th>
              ))}
              {(userRole === 'admin' || userRole === 'editor') && (
                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700"></th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y">
            {data.map(item => (
              <tr key={item.id} className="hover:bg-gray-50">
                {columns.map(col => (
                  <td key={col.key} className="px-4 py-3 text-sm text-gray-700">
                    {col.isPdf ? (
                      <button
                        onClick={() => generatePDF(activeTab === 'fuel' ? 'fuel' : activeTab === 'maintenance' ? 'maintenance' : activeTab === 'incidents' ? 'incident' : activeTab === 'violations' ? 'violation' : activeTab === 'drivers' ? 'driver' : 'vehicle', item.id)}
                        className="px-3 py-1.5 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition text-xs font-medium"
                        title={lang === 'ar' ? 'تحميل PDF' : 'Download PDF'}
                      >
                        📄 PDF
                      </button>
                    ) : col.isImage ? (
                      getValue(item, col.key) ? (
                        <img src={getValue(item, col.key)} alt="" className="w-14 h-14 object-cover rounded-lg shadow-sm" />
                      ) : (
                        <span className="text-gray-400">-</span>
                      )
                    ) : col.badge ? (
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                        (getValue(item, col.key) === 'active' || getValue(item, col.key) === 'paid' || getValue(item, col.key) === 'closed') ? 'bg-green-100 text-green-700' : 
                        (getValue(item, col.key) === 'admin') ? 'bg-purple-100 text-purple-700' :
                        (getValue(item, col.key) === 'editor') ? 'bg-blue-100 text-blue-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {t[lang][getValue(item, col.key)] || getValue(item, col.key)}
                      </span>
                    ) : getValue(item, col.key)}
                  </td>
                ))}
                {(userRole === 'admin' || userRole === 'editor') && (
                  <td className="px-4 py-3">
                    <div className="flex gap-2 justify-center">
                      <button onClick={() => openEditModal(item)} className="text-blue-600 hover:text-blue-800 text-lg">✏️</button>
                      {userRole === 'admin' && (
                        <button onClick={() => handleDelete(item.id, tableName)} className="text-red-600 hover:text-red-800 text-lg">🗑️</button>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }
  
  const renderForm = () => {
    if (activeTab === 'vehicles') {
      return (
        <>
          <input value={formData.plate_number || ''} onChange={e => setFormData({...formData, plate_number: e.target.value})} placeholder={t[lang].plateNumber} className="w-full px-3 py-2 border rounded-lg" />
          <input value={formData.type || ''} onChange={e => setFormData({...formData, type: e.target.value})} placeholder={t[lang].vehicleType} className="w-full px-3 py-2 border rounded-lg" />
          <input value={formData.model || ''} onChange={e => setFormData({...formData, model: e.target.value})} placeholder={t[lang].model} className="w-full px-3 py-2 border rounded-lg" />
          <input value={formData.year || ''} onChange={e => setFormData({...formData, year: e.target.value})} placeholder={t[lang].year} type="number" className="w-full px-3 py-2 border rounded-lg" />
          <select value={formData.status || 'active'} onChange={e => setFormData({...formData, status: e.target.value})} className="w-full px-3 py-2 border rounded-lg">
            <option value="active">{t[lang].active}</option>
            <option value="inactive">{t[lang].inactive}</option>
          </select>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{lang === 'ar' ? 'صورة المركبة' : 'Vehicle Image'}</label>
            <input type="file" accept="image/*" onChange={e => setFormData({...formData, imageFile: e.target.files[0]})} className="w-full px-3 py-2 border rounded-lg text-sm" />
            {editMode && editItem?.image && !formData.imageFile && (
              <a href={editItem.image} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline mt-1 block">
                {lang === 'ar' ? 'عرض الصورة الحالية' : 'View current image'}
              </a>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{lang === 'ar' ? 'الاستمارة (PDF)' : 'Registration (PDF)'}</label>
            <input type="file" accept=".pdf" onChange={e => setFormData({...formData, istimaraPdfFile: e.target.files[0]})} className="w-full px-3 py-2 border rounded-lg text-sm" />
            {editMode && editItem?.istimara_pdf && !formData.istimaraPdfFile && (
              <a href={editItem.istimara_pdf} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline mt-1 block">
                📄 {lang === 'ar' ? 'عرض PDF الحالي' : 'View current PDF'}
              </a>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{lang === 'ar' ? 'التأمين (PDF)' : 'Insurance (PDF)'}</label>
            <input type="file" accept=".pdf" onChange={e => setFormData({...formData, insurancePdfFile: e.target.files[0]})} className="w-full px-3 py-2 border rounded-lg text-sm" />
            {editMode && editItem?.insurance_pdf && !formData.insurancePdfFile && (
              <a href={editItem.insurance_pdf} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline mt-1 block">
                📄 {lang === 'ar' ? 'عرض PDF الحالي' : 'View current PDF'}
              </a>
            )}
          </div>
        </>
      )
    } else if (activeTab === 'drivers') {
      return (
        <>
          <input value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} placeholder={t[lang].driverName} className="w-full px-3 py-2 border rounded-lg" />
          <input value={formData.license_number || ''} onChange={e => setFormData({...formData, license_number: e.target.value})} placeholder={t[lang].licenseNumber} className="w-full px-3 py-2 border rounded-lg" />
          <input value={formData.phone || ''} onChange={e => setFormData({...formData, phone: e.target.value})} placeholder={t[lang].phone} className="w-full px-3 py-2 border rounded-lg" />
          <select value={formData.status || 'active'} onChange={e => setFormData({...formData, status: e.target.value})} className="w-full px-3 py-2 border rounded-lg">
            <option value="active">{t[lang].active}</option>
            <option value="inactive">{t[lang].inactive}</option>
          </select>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{lang === 'ar' ? 'صورة السائق' : 'Driver Image'}</label>
            <input type="file" accept="image/*" onChange={e => setFormData({...formData, imageFile: e.target.files[0]})} className="w-full px-3 py-2 border rounded-lg text-sm" />
            {editMode && editItem?.image && !formData.imageFile && (
              <a href={editItem.image} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline mt-1 block">
                {lang === 'ar' ? 'عرض الصورة الحالية' : 'View current image'}
              </a>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{lang === 'ar' ? 'الرخصة (PDF)' : 'License (PDF)'}</label>
            <input type="file" accept=".pdf" onChange={e => setFormData({...formData, licensePdfFile: e.target.files[0]})} className="w-full px-3 py-2 border rounded-lg text-sm" />
            {editMode && editItem?.license_pdf && !formData.licensePdfFile && (
              <a href={editItem.license_pdf} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline mt-1 block">
                📄 {lang === 'ar' ? 'عرض PDF الحالي' : 'View current PDF'}
              </a>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{lang === 'ar' ? 'الإقامة (PDF)' : 'Iqama (PDF)'}</label>
            <input type="file" accept=".pdf" onChange={e => setFormData({...formData, iqamaPdfFile: e.target.files[0]})} className="w-full px-3 py-2 border rounded-lg text-sm" />
            {editMode && editItem?.iqama_pdf && !formData.iqamaPdfFile && (
              <a href={editItem.iqama_pdf} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline mt-1 block">
                📄 {lang === 'ar' ? 'عرض PDF الحالي' : 'View current PDF'}
              </a>
            )}
          </div>
        </>
      )
    } else if (activeTab === 'maintenance') {
      return (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{t[lang].vehicle}</label>
            {formData.vehicle_id ? (
              <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex-1">
                  <div className="font-medium text-blue-900 text-sm">
                    {vehicles.find(v => v.id === formData.vehicle_id)?.plate_number}
                  </div>
                  <div className="text-xs text-blue-600">
                    {vehicles.find(v => v.id === formData.vehicle_id)?.type}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowVehiclePicker(true)}
                  className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  {lang === 'ar' ? 'تغيير' : 'Change'}
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowVehiclePicker(true)}
                className="w-full px-3 py-2 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition text-sm text-gray-600"
              >
                {lang === 'ar' ? 'اضغط لاختيار مركبة' : 'Click to select vehicle'}
              </button>
            )}
          </div>
          <input value={formData.maintenance_type || ''} onChange={e => setFormData({...formData, maintenance_type: e.target.value})} placeholder={t[lang].type} className="w-full px-3 py-2 border rounded-lg" />
          <input value={formData.maintenance_date || ''} onChange={e => setFormData({...formData, maintenance_date: e.target.value})} type="date" className="w-full px-3 py-2 border rounded-lg" />
          <input value={formData.cost || ''} onChange={e => setFormData({...formData, cost: e.target.value})} placeholder={t[lang].cost} type="number" className="w-full px-3 py-2 border rounded-lg" />
          <textarea value={formData.notes || ''} onChange={e => setFormData({...formData, notes: e.target.value})} placeholder={t[lang].notes} className="w-full px-3 py-2 border rounded-lg" rows="2"></textarea>
        </>
      )
    } else if (activeTab === 'fuel') {
      return (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{t[lang].vehicle}</label>
            {formData.vehicle_id ? (
              <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex-1">
                  <div className="font-medium text-blue-900 text-sm">
                    {vehicles.find(v => v.id === formData.vehicle_id)?.plate_number}
                  </div>
                </div>
                <button type="button" onClick={() => setShowVehiclePicker(true)} className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700">
                  {lang === 'ar' ? 'تغيير' : 'Change'}
                </button>
              </div>
            ) : (
              <button type="button" onClick={() => setShowVehiclePicker(true)} className="w-full px-3 py-2 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition text-sm text-gray-600">
                {lang === 'ar' ? 'اضغط لاختيار مركبة' : 'Click to select vehicle'}
              </button>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{t[lang].driver} ({lang === 'ar' ? 'اختياري' : 'Optional'})</label>
            {formData.driver_id ? (
              <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex-1">
                  <div className="font-medium text-green-900 text-sm">
                    {drivers.find(d => d.id === formData.driver_id)?.name}
                  </div>
                </div>
                <button type="button" onClick={() => setFormData({...formData, driver_id: ''})} className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200">
                  {lang === 'ar' ? 'إزالة' : 'Remove'}
                </button>
                <button type="button" onClick={() => setShowDriverPicker(true)} className="px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700">
                  {lang === 'ar' ? 'تغيير' : 'Change'}
                </button>
              </div>
            ) : (
              <button type="button" onClick={() => setShowDriverPicker(true)} className="w-full px-3 py-2 border-2 border-dashed border-gray-300 rounded-lg hover:border-green-400 hover:bg-green-50 transition text-sm text-gray-600">
                {lang === 'ar' ? 'اضغط لاختيار سائق (اختياري)' : 'Click to select driver (optional)'}
              </button>
            )}
          </div>
          <input value={formData.date || ''} onChange={e => setFormData({...formData, date: e.target.value})} type="date" className="w-full px-3 py-2 border rounded-lg" />
          <input value={formData.quantity || ''} onChange={e => setFormData({...formData, quantity: e.target.value})} placeholder={t[lang].quantity} type="number" className="w-full px-3 py-2 border rounded-lg" />
          <input value={formData.cost || ''} onChange={e => setFormData({...formData, cost: e.target.value})} placeholder={t[lang].cost} type="number" className="w-full px-3 py-2 border rounded-lg" />
          <textarea value={formData.notes || ''} onChange={e => setFormData({...formData, notes: e.target.value})} placeholder={t[lang].notes} className="w-full px-3 py-2 border rounded-lg" rows="2"></textarea>
        </>
      )
    } else if (activeTab === 'incidents') {
      return (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{t[lang].vehicle}</label>
            {formData.vehicle_id ? (
              <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex-1"><div className="font-medium text-blue-900 text-sm">{vehicles.find(v => v.id === formData.vehicle_id)?.plate_number}</div></div>
                <button type="button" onClick={() => setShowVehiclePicker(true)} className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700">{lang === 'ar' ? 'تغيير' : 'Change'}</button>
              </div>
            ) : (
              <button type="button" onClick={() => setShowVehiclePicker(true)} className="w-full px-3 py-2 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition text-sm text-gray-600">{lang === 'ar' ? 'اضغط لاختيار مركبة' : 'Click to select vehicle'}</button>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{t[lang].driver} ({lang === 'ar' ? 'اختياري' : 'Optional'})</label>
            {formData.driver_id ? (
              <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex-1"><div className="font-medium text-green-900 text-sm">{drivers.find(d => d.id === formData.driver_id)?.name}</div></div>
                <button type="button" onClick={() => setFormData({...formData, driver_id: ''})} className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200">{lang === 'ar' ? 'إزالة' : 'Remove'}</button>
                <button type="button" onClick={() => setShowDriverPicker(true)} className="px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700">{lang === 'ar' ? 'تغيير' : 'Change'}</button>
              </div>
            ) : (
              <button type="button" onClick={() => setShowDriverPicker(true)} className="w-full px-3 py-2 border-2 border-dashed border-gray-300 rounded-lg hover:border-green-400 hover:bg-green-50 transition text-sm text-gray-600">{lang === 'ar' ? 'اضغط لاختيار سائق (اختياري)' : 'Click to select driver (optional)'}</button>
            )}
          </div>
          <input value={formData.incident_date || ''} onChange={e => setFormData({...formData, incident_date: e.target.value})} type="date" className="w-full px-3 py-2 border rounded-lg" />
          <input value={formData.description || ''} onChange={e => setFormData({...formData, description: e.target.value})} placeholder={t[lang].description} className="w-full px-3 py-2 border rounded-lg" />
          <input value={formData.location || ''} onChange={e => setFormData({...formData, location: e.target.value})} placeholder={t[lang].location} className="w-full px-3 py-2 border rounded-lg" />
          <input value={formData.repair_cost || ''} onChange={e => setFormData({...formData, repair_cost: e.target.value})} placeholder={t[lang].repairCost} type="number" className="w-full px-3 py-2 border rounded-lg" />
          <select value={formData.status || 'open'} onChange={e => setFormData({...formData, status: e.target.value})} className="w-full px-3 py-2 border rounded-lg">
            <option value="open">{t[lang].open}</option>
            <option value="closed">{t[lang].closed}</option>
          </select>
          <textarea value={formData.notes || ''} onChange={e => setFormData({...formData, notes: e.target.value})} placeholder={t[lang].notes} className="w-full px-3 py-2 border rounded-lg" rows="2"></textarea>
        </>
      )
    } else if (activeTab === 'violations') {
      return (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{t[lang].vehicle}</label>
            {formData.vehicle_id ? (
              <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex-1"><div className="font-medium text-blue-900 text-sm">{vehicles.find(v => v.id === formData.vehicle_id)?.plate_number}</div></div>
                <button type="button" onClick={() => setShowVehiclePicker(true)} className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700">{lang === 'ar' ? 'تغيير' : 'Change'}</button>
              </div>
            ) : (
              <button type="button" onClick={() => setShowVehiclePicker(true)} className="w-full px-3 py-2 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition text-sm text-gray-600">{lang === 'ar' ? 'اضغط لاختيار مركبة' : 'Click to select vehicle'}</button>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{t[lang].driver} ({lang === 'ar' ? 'اختياري' : 'Optional'})</label>
            {formData.driver_id ? (
              <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex-1"><div className="font-medium text-green-900 text-sm">{drivers.find(d => d.id === formData.driver_id)?.name}</div></div>
                <button type="button" onClick={() => setFormData({...formData, driver_id: ''})} className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200">{lang === 'ar' ? 'إزالة' : 'Remove'}</button>
                <button type="button" onClick={() => setShowDriverPicker(true)} className="px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700">{lang === 'ar' ? 'تغيير' : 'Change'}</button>
              </div>
            ) : (
              <button type="button" onClick={() => setShowDriverPicker(true)} className="w-full px-3 py-2 border-2 border-dashed border-gray-300 rounded-lg hover:border-green-400 hover:bg-green-50 transition text-sm text-gray-600">{lang === 'ar' ? 'اضغط لاختيار سائق (اختياري)' : 'Click to select driver (optional)'}</button>
            )}
          </div>
          <input value={formData.violation_date || ''} onChange={e => setFormData({...formData, violation_date: e.target.value})} type="date" className="w-full px-3 py-2 border rounded-lg" />
          <input value={formData.violation_number || ''} onChange={e => setFormData({...formData, violation_number: e.target.value})} placeholder={t[lang].violationNumber} className="w-full px-3 py-2 border rounded-lg" />
          <input value={formData.violation_type || ''} onChange={e => setFormData({...formData, violation_type: e.target.value})} placeholder={t[lang].type} className="w-full px-3 py-2 border rounded-lg" />
          <input value={formData.location || ''} onChange={e => setFormData({...formData, location: e.target.value})} placeholder={t[lang].location} className="w-full px-3 py-2 border rounded-lg" />
          <input value={formData.fine_amount || ''} onChange={e => setFormData({...formData, fine_amount: e.target.value})} placeholder={t[lang].fineAmount} type="number" className="w-full px-3 py-2 border rounded-lg" />
          <select value={formData.status || 'unpaid'} onChange={e => setFormData({...formData, status: e.target.value})} className="w-full px-3 py-2 border rounded-lg">
            <option value="unpaid">{t[lang].unpaid}</option>
            <option value="paid">{t[lang].paid}</option>
          </select>
          <textarea value={formData.notes || ''} onChange={e => setFormData({...formData, notes: e.target.value})} placeholder={t[lang].notes} className="w-full px-3 py-2 border rounded-lg" rows="2"></textarea>
        </>
      )
    } else if (activeTab === 'users') {
      return (
        <>
          <input value={formData.email || ''} onChange={e => setFormData({...formData, email: e.target.value})} placeholder={t[lang].email} type="email" className="w-full px-3 py-2 border rounded-lg" disabled={editMode} />
          <select value={formData.role || 'viewer'} onChange={e => setFormData({...formData, role: e.target.value})} className="w-full px-3 py-2 border rounded-lg">
            <option value="viewer">{t[lang].viewer}</option>
            <option value="editor">{t[lang].editor}</option>
            <option value="admin">{t[lang].admin}</option>
          </select>
        </>
      )
    }
  }
  
  const getStats = () => {
    if (activeTab === 'vehicles') {
      return [
        { label: t[lang].total, value: vehicles.length, color: 'blue' },
        { label: t[lang].active, value: vehicles.filter(v => v.status === 'active').length, color: 'green' },
        { label: t[lang].inactive, value: vehicles.filter(v => v.status === 'inactive').length, color: 'red' }
      ]
    } else if (activeTab === 'drivers') {
      return [
        { label: t[lang].total, value: drivers.length, color: 'blue' },
        { label: t[lang].active, value: drivers.filter(d => d.status === 'active').length, color: 'green' },
        { label: t[lang].inactive, value: drivers.filter(d => d.status === 'inactive').length, color: 'red' }
      ]
    } else if (activeTab === 'incidents') {
      return [
        { label: t[lang].total, value: incidents.length, color: 'blue' },
        { label: t[lang].open, value: incidents.filter(i => i.status === 'open').length, color: 'yellow' },
        { label: t[lang].closed, value: incidents.filter(i => i.status === 'closed').length, color: 'green' }
      ]
    } else if (activeTab === 'violations') {
      return [
        { label: t[lang].total, value: violations.length, color: 'blue' },
        { label: t[lang].unpaid, value: violations.filter(v => v.status === 'unpaid').length, color: 'red' },
        { label: t[lang].paid, value: violations.filter(v => v.status === 'paid').length, color: 'green' }
      ]
    }
    return []
  }
  
  return (
    <div className={`min-h-screen bg-gray-50 ${lang === 'ar' ? 'rtl' : 'ltr'}`} dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <div className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center text-white font-bold text-xl shadow-lg">F</div>
              <h1 className="text-xl font-bold text-gray-900">{t[lang].dashboard}</h1>
            </div>
            <div className="flex items-center gap-4">
              <button onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')} className="px-3 py-1.5 text-sm bg-gray-100 rounded-lg hover:bg-gray-200 transition font-medium">
                {lang === 'ar' ? 'English' : 'العربية'}
              </button>
              <div className="text-sm text-gray-600">{user?.email}</div>
              <button onClick={handleLogout} className="px-4 py-2 text-sm bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition font-medium">
                {t[lang].logout}
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-6">
          <div className="w-64 flex-shrink-0">
            <div className="bg-white rounded-xl shadow-sm p-4 space-y-1 sticky top-24">
              {['vehicles', 'drivers', 'maintenance', 'fuel', 'incidents', 'violations', ...(userRole === 'admin' ? ['users'] : []), 'reports'].map(tab => {
                const icons = { vehicles: '🚗', drivers: '👤', maintenance: '🔧', fuel: '⛽', incidents: '🚨', violations: '🚦', users: '👥', reports: '📊' }
                return (
                  <button key={tab} onClick={() => setActiveTab(tab)} className={`w-full text-${lang === 'ar' ? 'right' : 'left'} px-4 py-3 rounded-lg transition font-medium ${activeTab === tab ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-50 text-gray-700'}`}>
                    <span className="mr-2">{icons[tab]}</span>{t[lang][tab]}
                  </button>
                )
              })}
            </div>
          </div>
          
          <div className="flex-1">
            {activeTab !== 'reports' ? (
              <div className="bg-white rounded-xl shadow-sm p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">{t[lang][activeTab]}</h2>
                  <div className="flex gap-2">
                    {(userRole === 'admin' || userRole === 'editor') && (
                      <button onClick={openAddModal} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium">
                        + {t[lang].add}
                      </button>
                    )}
                    <button onClick={() => exportToExcel(activeTab === 'vehicles' ? vehicles : activeTab === 'drivers' ? drivers : activeTab === 'maintenance' ? maintenance : activeTab === 'fuel' ? fuelLogs : activeTab === 'incidents' ? incidents : activeTab === 'violations' ? violations : users, activeTab)} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium">
                      {t[lang].export}
                    </button>
                  </div>
                </div>
                
                {getStats().length > 0 && (
                  <div className="grid grid-cols-3 gap-4 mb-6">
                    {getStats().map((stat, i) => (
                      <div key={i} className={`bg-gradient-to-br from-${stat.color}-50 to-${stat.color}-100 rounded-lg p-4 border border-${stat.color}-200`}>
                        <div className={`text-sm text-${stat.color}-600 mb-1 font-medium`}>{stat.label}</div>
                        <div className={`text-3xl font-bold text-${stat.color}-900`}>{stat.value}</div>
                      </div>
                    ))}
                  </div>
                )}
                
                {renderTable()}
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">{t[lang].reports}</h2>
                
                {/* إحصائيات عامة */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
                    <div className="text-sm text-blue-600 mb-1 font-medium">{lang === 'ar' ? 'إجمالي المركبات' : 'Total Vehicles'}</div>
                    <div className="text-3xl font-bold text-blue-900">{vehicles.length}</div>
                  </div>
                  <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
                    <div className="text-sm text-green-600 mb-1 font-medium">{lang === 'ar' ? 'إجمالي السائقين' : 'Total Drivers'}</div>
                    <div className="text-3xl font-bold text-green-900">{drivers.length}</div>
                  </div>
                  <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-4 border border-orange-200">
                    <div className="text-sm text-orange-600 mb-1 font-medium">{lang === 'ar' ? 'الحوادث المفتوحة' : 'Open Incidents'}</div>
                    <div className="text-3xl font-bold text-orange-900">{incidents.filter(i => i.status === 'open').length}</div>
                  </div>
                  <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg p-4 border border-red-200">
                    <div className="text-sm text-red-600 mb-1 font-medium">{lang === 'ar' ? 'مخالفات غير مدفوعة' : 'Unpaid Violations'}</div>
                    <div className="text-3xl font-bold text-red-900">{violations.filter(v => v.status === 'unpaid').length}</div>
                  </div>
                </div>
                
                {/* التكاليف */}
                <div className="grid grid-cols-3 gap-4 mb-8">
                  <div className="bg-white border-2 border-gray-200 rounded-lg p-4">
                    <div className="text-sm text-gray-600 mb-1">{lang === 'ar' ? 'إجمالي الصيانة' : 'Total Maintenance'}</div>
                    <div className="text-2xl font-bold text-gray-900">
                      {maintenance.reduce((sum, m) => sum + (m.cost || 0), 0).toFixed(2)} {lang === 'ar' ? 'ريال' : 'SAR'}
                    </div>
                  </div>
                  <div className="bg-white border-2 border-gray-200 rounded-lg p-4">
                    <div className="text-sm text-gray-600 mb-1">{lang === 'ar' ? 'إجمالي الوقود' : 'Total Fuel'}</div>
                    <div className="text-2xl font-bold text-gray-900">
                      {fuelLogs.reduce((sum, f) => sum + (f.cost || 0), 0).toFixed(2)} {lang === 'ar' ? 'ريال' : 'SAR'}
                    </div>
                  </div>
                  <div className="bg-white border-2 border-gray-200 rounded-lg p-4">
                    <div className="text-sm text-gray-600 mb-1">{lang === 'ar' ? 'إجمالي المخالفات' : 'Total Fines'}</div>
                    <div className="text-2xl font-bold text-gray-900">
                      {violations.reduce((sum, v) => sum + (v.fine_amount || 0), 0).toFixed(2)} {lang === 'ar' ? 'ريال' : 'SAR'}
                    </div>
                  </div>
                </div>
                
                <div className="border-t pt-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">{lang === 'ar' ? 'تصدير التقارير' : 'Export Reports'}</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <button onClick={() => exportToExcel(vehicles, 'vehicles')} className="px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium text-sm">
                      📊 {lang === 'ar' ? 'المركبات' : 'Vehicles'}
                    </button>
                    <button onClick={() => exportToExcel(drivers, 'drivers')} className="px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium text-sm">
                      📊 {lang === 'ar' ? 'السائقين' : 'Drivers'}
                    </button>
                    <button onClick={() => exportToExcel(maintenance, 'maintenance')} className="px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium text-sm">
                      📊 {lang === 'ar' ? 'الصيانة' : 'Maintenance'}
                    </button>
                    <button onClick={() => exportToExcel(fuelLogs, 'fuel')} className="px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium text-sm">
                      📊 {lang === 'ar' ? 'الوقود' : 'Fuel'}
                    </button>
                    <button onClick={() => exportToExcel(incidents, 'incidents')} className="px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium text-sm">
                      📊 {lang === 'ar' ? 'الحوادث' : 'Incidents'}
                    </button>
                    <button onClick={() => exportToExcel(violations, 'violations')} className="px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium text-sm">
                      📊 {lang === 'ar' ? 'المخالفات' : 'Violations'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold mb-4">{editMode ? t[lang].edit : t[lang].add} {t[lang][activeTab]}</h3>
            <div className="space-y-3">
              {renderForm()}
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={handleSubmit} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium">
                {t[lang].save}
              </button>
              <button onClick={closeModal} className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition font-medium">
                {t[lang].cancel}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* نافذة البحث عن مركبة */}
      {showVehiclePicker && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold mb-4">{lang === 'ar' ? 'اختيار مركبة' : 'Select Vehicle'}</h3>
            <input
              type="text"
              value={pickerSearch}
              onChange={e => setPickerSearch(e.target.value)}
              placeholder={lang === 'ar' ? 'ابحث برقم اللوحة أو النوع...' : 'Search by plate or type...'}
              className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg mb-4 focus:border-blue-500 focus:outline-none"
              autoFocus
            />
            <div className="max-h-96 overflow-y-auto space-y-2">
              {vehicles.filter(v => 
                v.plate_number?.toLowerCase().includes(pickerSearch.toLowerCase()) ||
                v.type?.toLowerCase().includes(pickerSearch.toLowerCase())
              ).map(vehicle => (
                <button
                  key={vehicle.id}
                  onClick={() => {
                    setFormData({...formData, vehicle_id: vehicle.id})
                    setShowVehiclePicker(false)
                    setPickerSearch('')
                  }}
                  className="w-full text-start px-4 py-3 bg-gray-50 hover:bg-blue-50 rounded-lg transition border border-gray-200 hover:border-blue-300"
                >
                  <div className="font-medium text-gray-900">{vehicle.plate_number}</div>
                  <div className="text-sm text-gray-600">{vehicle.type} • {vehicle.model || '-'}</div>
                </button>
              ))}
              {vehicles.filter(v => 
                v.plate_number?.toLowerCase().includes(pickerSearch.toLowerCase()) ||
                v.type?.toLowerCase().includes(pickerSearch.toLowerCase())
              ).length === 0 && (
                <div className="text-center py-8 text-gray-500">{lang === 'ar' ? 'لا توجد نتائج' : 'No results'}</div>
              )}
            </div>
            <button
              onClick={() => { setShowVehiclePicker(false); setPickerSearch('') }}
              className="w-full mt-4 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition font-medium"
            >
              {t[lang].cancel}
            </button>
          </div>
        </div>
      )}
      
      {/* نافذة البحث عن سائق */}
      {showDriverPicker && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold mb-4">{lang === 'ar' ? 'اختيار سائق' : 'Select Driver'}</h3>
            <input
              type="text"
              value={pickerSearch}
              onChange={e => setPickerSearch(e.target.value)}
              placeholder={lang === 'ar' ? 'ابحث بالاسم أو رقم الرخصة...' : 'Search by name or license...'}
              className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg mb-4 focus:border-blue-500 focus:outline-none"
              autoFocus
            />
            <div className="max-h-96 overflow-y-auto space-y-2">
              {drivers.filter(d => 
                d.name?.toLowerCase().includes(pickerSearch.toLowerCase()) ||
                d.license_number?.toLowerCase().includes(pickerSearch.toLowerCase())
              ).map(driver => (
                <button
                  key={driver.id}
                  onClick={() => {
                    setFormData({...formData, driver_id: driver.id})
                    setShowDriverPicker(false)
                    setPickerSearch('')
                  }}
                  className="w-full text-start px-4 py-3 bg-gray-50 hover:bg-green-50 rounded-lg transition border border-gray-200 hover:border-green-300"
                >
                  <div className="font-medium text-gray-900">{driver.name}</div>
                  <div className="text-sm text-gray-600">{driver.license_number} • {driver.phone || '-'}</div>
                </button>
              ))}
              {drivers.filter(d => 
                d.name?.toLowerCase().includes(pickerSearch.toLowerCase()) ||
                d.license_number?.toLowerCase().includes(pickerSearch.toLowerCase())
              ).length === 0 && (
                <div className="text-center py-8 text-gray-500">{lang === 'ar' ? 'لا توجد نتائج' : 'No results'}</div>
              )}
            </div>
            <button
              onClick={() => { setShowDriverPicker(false); setPickerSearch('') }}
              className="w-full mt-4 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition font-medium"
            >
              {t[lang].cancel}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
