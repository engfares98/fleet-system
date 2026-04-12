'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

export default function Dashboard() {
  const [vehicles, setVehicles] = useState([])
  const [drivers, setDrivers] = useState([])
  const [maintenance, setMaintenance] = useState([])
  const [fuelLogs, setFuelLogs] = useState([])
  const [activeTab, setActiveTab] = useState('dashboard')
  const [uploading, setUploading] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  const [vehicleSearch, setVehicleSearch] = useState('')
  const [driverSearch, setDriverSearch] = useState('')

  const [showVehicleForm, setShowVehicleForm] = useState(false)
  const [vehicleForm, setVehicleForm] = useState({ plate_number: '', vehicle_code: '', type: '', brand: '', model: '', year: '', color: '', status: 'active', fuel_type: '', preparation_status: 'not_ready' })
  const [vehicleImage, setVehicleImage] = useState(null)
  const [istamaraImage, setIstamaraImage] = useState(null)

  const [showDriverForm, setShowDriverForm] = useState(false)
  const [driverForm, setDriverForm] = useState({ full_name: '', national_id: '', passport_number: '', phone: '', license_number: '', license_expiry: '', status: 'active' })
  const [iqamaImage, setIqamaImage] = useState(null)
  const [licenseImage, setLicenseImage] = useState(null)

  const [showMaintenanceForm, setShowMaintenanceForm] = useState(false)
  const [maintenanceForm, setMaintenanceForm] = useState({ vehicle_id: '', type: '', description: '', date: '', cost: '', next_date: '', status: 'pending' })

  const [showFuelForm, setShowFuelForm] = useState(false)
  const [fuelForm, setFuelForm] = useState({ vehicle_id: '', driver_id: '', date: '', liters: '', cost_per_liter: '', odometer: '' })

  const [editItem, setEditItem] = useState(null)
  const [editType, setEditType] = useState(null)
  const [editForm, setEditForm] = useState({})
  const [editVehicleImage, setEditVehicleImage] = useState(null)
  const [editIstamaraImage, setEditIstamaraImage] = useState(null)
  const [editIqamaImage, setEditIqamaImage] = useState(null)
  const [editLicenseImage, setEditLicenseImage] = useState(null)

  const [previewImage, setPreviewImage] = useState(null)

  useEffect(() => {
    checkAuth(); fetchData()
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const checkAuth = async () => {
    const { data } = await supabase.auth.getSession()
    if (!data.session) window.location.href = '/'
  }

  const fetchData = async () => {
    const [v, d, m, f] = await Promise.all([
      supabase.from('vehicles').select('*').order('created_at', { ascending: false }),
      supabase.from('drivers').select('*').order('created_at', { ascending: false }),
      supabase.from('maintenance').select('*, vehicles(plate_number)').order('created_at', { ascending: false }),
      supabase.from('fuel_logs').select('*, vehicles(plate_number), drivers(full_name)').order('created_at', { ascending: false }),
    ])
    setVehicles(v.data || []); setDrivers(d.data || [])
    setMaintenance(m.data || []); setFuelLogs(f.data || [])
  }

  const daysUntil = (dateStr) => {
    if (!dateStr) return null
    const diff = Math.ceil((new Date(dateStr) - new Date()) / (1000 * 60 * 60 * 24))
    return diff
  }

  const getAlerts = () => {
    const alerts = []
    drivers.forEach(d => {
      if (d.license_expiry) {
        const days = daysUntil(d.license_expiry)
        if (days !== null && days <= 60) {
          alerts.push({ id: `lic-${d.id}`, type: days < 0 ? 'expired' : days <= 14 ? 'critical' : days <= 30 ? 'warning' : 'info', icon: '🪪', title: `رخصة قيادة: ${d.full_name}`, detail: days < 0 ? `منتهية منذ ${Math.abs(days)} يوم` : `تنتهي خلال ${days} يوم`, days })
        }
      }
    })
    maintenance.forEach(m => {
      if (m.next_date) {
        const days = daysUntil(m.next_date)
        if (days !== null && days <= 30) {
          alerts.push({ id: `maint-${m.id}`, type: days < 0 ? 'expired' : days <= 7 ? 'critical' : 'warning', icon: '🔧', title: `صيانة: ${m.vehicles?.plate_number || ''}`, detail: days < 0 ? `تأخر ${Math.abs(days)} يوم` : `خلال ${days} يوم`, days })
        }
      }
    })
    return alerts.sort((a, b) => a.days - b.days)
  }

  const alerts = getAlerts()
  const criticalAlerts = alerts.filter(a => a.type === 'expired' || a.type === 'critical')

  // Excel export
  const exportToCSV = (data, filename) => {
    if (!data || data.length === 0) return
    const headers = Object.keys(data[0])
    const csvContent = [
      headers.join(','),
      ...data.map(row => headers.map(h => `"${(row[h] || '').toString().replace(/"/g, '""')}"`).join(','))
    ].join('\n')
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = filename + '.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  const exportVehicles = () => exportToCSV(vehicles.map(v => ({
    'رقم اللوحة': v.plate_number || '', 'كود المركبة': v.vehicle_code || '',
    'النوع': v.type || '', 'الماركة': v.brand || '', 'الموديل': v.model || '',
    'السنة': v.year || '', 'اللون': v.color || '', 'نوع الوقود': v.fuel_type || '',
    'الحالة': v.status === 'active' ? 'نشط' : 'غير نشط',
    'حالة التجهيز': v.preparation_status === 'ready' ? 'جاهزة' : v.preparation_status === 'in_progress' ? 'قيد التجهيز' : 'غير جاهزة'
  })), 'المركبات')

  const exportDrivers = () => exportToCSV(drivers.map(d => ({
    'الاسم': d.full_name || '', 'رقم الهوية': d.national_id || '',
    'رقم الجواز': d.passport_number || '', 'الجوال': d.phone || '',
    'رقم الرخصة': d.license_number || '', 'انتهاء الرخصة': d.license_expiry || '',
    'الحالة': d.status === 'active' ? 'نشط' : 'غير نشط'
  })), 'السائقون')

  const exportMaintenance = () => exportToCSV(maintenance.map(m => ({
    'المركبة': m.vehicles?.plate_number || '', 'النوع': m.type || '',
    'الوصف': m.description || '', 'التاريخ': m.date || '',
    'التكلفة': m.cost || '', 'الموعد القادم': m.next_date || '',
    'الحالة': m.status === 'active' ? 'مكتمل' : m.status === 'pending' ? 'معلق' : 'ملغي'
  })), 'الصيانة')

  const exportFuel = () => exportToCSV(fuelLogs.map(f => ({
    'المركبة': f.vehicles?.plate_number || '', 'السائق': f.drivers?.full_name || '',
    'التاريخ': f.date || '', 'اللترات': f.liters || '',
    'سعر اللتر': f.cost_per_liter || '', 'الإجمالي': f.total_cost || '',
    'قراءة العداد': f.odometer || ''
  })), 'الوقود')

  const uploadFile = async (file, folder) => {
    if (!file) return null
    const ext = file.name.split('.').pop()
    const fileName = `${folder}/${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('fleet-files').upload(fileName, file)
    if (error) return null
    const { data } = supabase.storage.from('fleet-files').getPublicUrl(fileName)
    return data.publicUrl
  }

  const openEdit = (type, item) => {
    setEditType(type); setEditItem(item); setEditForm({ ...item })
    setEditVehicleImage(null); setEditIstamaraImage(null); setEditIqamaImage(null); setEditLicenseImage(null)
  }

  const saveEdit = async () => {
    setUploading(true)
    const table = editType === 'vehicle' ? 'vehicles' : editType === 'driver' ? 'drivers' : editType === 'maintenance' ? 'maintenance' : 'fuel_logs'
    const updateData = { ...editForm }
    delete updateData.id; delete updateData.created_at; delete updateData.vehicles; delete updateData.drivers
    if (editType === 'fuel') updateData.total_cost = updateData.liters * updateData.cost_per_liter
    if (editType === 'vehicle') {
      if (editVehicleImage) updateData.vehicle_image = await uploadFile(editVehicleImage, 'vehicles')
      if (editIstamaraImage) updateData.istimara_image = await uploadFile(editIstamaraImage, 'istimara')
    }
    if (editType === 'driver') {
      if (editIqamaImage) updateData.iqama_image = await uploadFile(editIqamaImage, 'iqama')
      if (editLicenseImage) updateData.license_image = await uploadFile(editLicenseImage, 'licenses')
    }
    await supabase.from(table).update(updateData).eq('id', editItem.id)
    setEditItem(null); setEditType(null); setUploading(false); fetchData()
  }

  const addVehicle = async () => {
    setUploading(true)
    const vehicle_image = await uploadFile(vehicleImage, 'vehicles')
    const istimara_image = await uploadFile(istamaraImage, 'istimara')
    await supabase.from('vehicles').insert([{ ...vehicleForm, vehicle_image, istimara_image }])
    setShowVehicleForm(false)
    setVehicleForm({ plate_number: '', vehicle_code: '', type: '', brand: '', model: '', year: '', color: '', status: 'active', fuel_type: '', preparation_status: 'not_ready' })
    setVehicleImage(null); setIstamaraImage(null); setUploading(false); fetchData()
  }

  const addDriver = async () => {
    setUploading(true)
    const iqama_image = await uploadFile(iqamaImage, 'iqama')
    const license_image = await uploadFile(licenseImage, 'licenses')
    await supabase.from('drivers').insert([{ ...driverForm, iqama_image, license_image }])
    setShowDriverForm(false)
    setDriverForm({ full_name: '', national_id: '', passport_number: '', phone: '', license_number: '', license_expiry: '', status: 'active' })
    setIqamaImage(null); setLicenseImage(null); setUploading(false); fetchData()
  }

  const addMaintenance = async () => {
    await supabase.from('maintenance').insert([maintenanceForm])
    setShowMaintenanceForm(false)
    setMaintenanceForm({ vehicle_id: '', type: '', description: '', date: '', cost: '', next_date: '', status: 'pending' })
    fetchData()
  }

  const addFuel = async () => {
    const total_cost = fuelForm.liters * fuelForm.cost_per_liter
    await supabase.from('fuel_logs').insert([{ ...fuelForm, total_cost }])
    setShowFuelForm(false)
    setFuelForm({ vehicle_id: '', driver_id: '', date: '', liters: '', cost_per_liter: '', odometer: '' })
    fetchData()
  }

  const updatePreparation = async (id, val) => {
    await supabase.from('vehicles').update({ preparation_status: val }).eq('id', id); fetchData()
  }

  const deleteVehicle = async (id) => { await supabase.from('vehicles').delete().eq('id', id); fetchData() }
  const deleteDriver = async (id) => { await supabase.from('drivers').delete().eq('id', id); fetchData() }
  const deleteMaintenance = async (id) => { await supabase.from('maintenance').delete().eq('id', id); fetchData() }
  const deleteFuel = async (id) => { await supabase.from('fuel_logs').delete().eq('id', id); fetchData() }
  const handleLogout = async () => { await supabase.auth.signOut(); window.location.href = '/' }

  const totalFuelCost = fuelLogs.reduce((a, b) => a + (b.total_cost || 0), 0)
  const totalFuelLiters = fuelLogs.reduce((a, b) => a + (Number(b.liters) || 0), 0)
  const totalMaintenanceCost = maintenance.reduce((a, b) => a + (Number(b.cost) || 0), 0)
  const activeVehicles = vehicles.filter(v => v.status === 'active').length
  const readyVehicles = vehicles.filter(v => v.preparation_status === 'ready').length
  const activeDrivers = drivers.filter(d => d.status === 'active').length

  const statusColor = (s) => s === 'active' ? '#16a34a' : s === 'pending' ? '#d97706' : '#dc2626'
  const statusBg = (s) => s === 'active' ? '#f0fdf4' : s === 'pending' ? '#fffbeb' : '#fef2f2'
  const statusLabel = (s) => s === 'active' ? 'نشط' : s === 'pending' ? 'معلق' : 'غير نشط'
  const prepColor = (s) => s === 'ready' ? '#16a34a' : s === 'in_progress' ? '#d97706' : '#dc2626'
  const prepBg = (s) => s === 'ready' ? '#f0fdf4' : s === 'in_progress' ? '#fffbeb' : '#fef2f2'
  const alertColor = (type) => type === 'expired' ? '#dc2626' : type === 'critical' ? '#ea580c' : type === 'warning' ? '#d97706' : '#2563eb'
  const alertBg = (type) => type === 'expired' ? '#fef2f2' : type === 'critical' ? '#fff7ed' : type === 'warning' ? '#fffbeb' : '#eff6ff'

  const filteredVehicles = vehicles.filter(v =>
    (v.plate_number || '').includes(vehicleSearch) || (v.vehicle_code || '').includes(vehicleSearch) ||
    (v.brand || '').includes(vehicleSearch) || (v.model || '').includes(vehicleSearch)
  )
  const filteredDrivers = drivers.filter(d =>
    (d.full_name || '').includes(driverSearch) || (d.national_id || '').includes(driverSearch) ||
    (d.passport_number || '').includes(driverSearch) || (d.phone || '').includes(driverSearch)
  )

  // Vehicle type breakdown
  const vehicleTypes = vehicles.reduce((acc, v) => {
    const key = v.preparation_status || 'not_ready'
    acc[key] = (acc[key] || 0) + 1
    return acc
  }, {})

  // Fuel by vehicle (top 5)
  const fuelByVehicle = fuelLogs.reduce((acc, f) => {
    const key = f.vehicles?.plate_number || 'غير محدد'
    acc[key] = (acc[key] || 0) + (Number(f.total_cost) || 0)
    return acc
  }, {})
  const topFuelVehicles = Object.entries(fuelByVehicle).sort((a, b) => b[1] - a[1]).slice(0, 5)

  const C = { orange: '#ff6b00', orangeLight: '#fff7f2', white: '#fff', gray: '#f8f9fa', text: '#1a1a1a', muted: '#888', border: '#e8e8e8' }
  const navItems = [['dashboard','📊','لوحة التحكم'],['vehicles','🚛','المركبات'],['drivers','👤','السائقون'],['maintenance','🔧','الصيانة'],['fuel','⛽','الوقود'],['reports','📈','التقارير'],['alerts','🔔','التنبيهات']]

  const st = {
    input: { width: '100%', padding: '10px 14px', background: '#fafafa', border: `1.5px solid ${C.border}`, borderRadius: '8px', color: C.text, fontSize: '13px', fontFamily: 'Cairo, sans-serif', outline: 'none', boxSizing: 'border-box' },
    label: { color: '#555', fontSize: '12px', fontWeight: '600', display: 'block', marginBottom: '6px' },
    btn: (c, outline) => ({ background: outline ? C.white : (c || C.orange), color: outline ? (c || C.orange) : C.white, border: `2px solid ${c || C.orange}`, borderRadius: '9px', padding: '9px 18px', fontSize: '13px', fontWeight: '700', fontFamily: 'Cairo, sans-serif', cursor: 'pointer' }),
    badge: (s) => ({ background: statusBg(s), color: statusColor(s), padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '700', display: 'inline-block' }),
    modal: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '16px' },
    modalBox: { background: C.white, borderRadius: '18px', padding: isMobile ? '20px' : '32px', width: '100%', maxWidth: '580px', maxHeight: '90vh', overflowY: 'auto' },
    formGrid: { display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '14px' },
    card: { background: C.white, border: `1px solid ${C.border}`, borderRadius: '14px', padding: isMobile ? '14px' : '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' },
    th: { padding: '10px 12px', textAlign: 'right', color: C.muted, fontSize: '11px', fontWeight: '600', borderBottom: `2px solid ${C.border}`, background: '#fafafa', whiteSpace: 'nowrap' },
    td: { padding: '10px 12px', color: C.text, fontSize: '12px', borderBottom: `1px solid ${C.border}`, whiteSpace: 'nowrap' },
    editBtn: { background: '#fff7f2', border: '1px solid #ffccaa', color: C.orange, borderRadius: '6px', padding: '4px 8px', fontSize: '11px', cursor: 'pointer', fontFamily: 'Cairo, sans-serif', fontWeight: '600' },
    deleteBtn: { background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: '15px' },
    prepSelect: (s) => ({ background: prepBg(s), color: prepColor(s), border: `1.5px solid ${prepColor(s)}`, borderRadius: '8px', padding: '3px 6px', fontSize: '10px', fontWeight: '700', fontFamily: 'Cairo, sans-serif', cursor: 'pointer', outline: 'none' }),
  }

  const FileInput = ({ label, icon, onChange, file }) => (
    <div>
      <label style={st.label}>{icon} {label}</label>
      <label style={{ width: '100%', padding: '10px', background: file ? '#fff7f2' : '#fafafa', border: `2px dashed ${file ? C.orange : C.border}`, borderRadius: '8px', color: file ? C.orange : C.muted, fontSize: '12px', cursor: 'pointer', textAlign: 'center', display: 'block', boxSizing: 'border-box', fontWeight: '600' }}>
        {file ? `✅ ${file.name}` : `📎 ${label}`}
        <input type="file" accept="image/*,.pdf" style={{ display: 'none' }} onChange={e => onChange(e.target.files[0])} />
      </label>
    </div>
  )

  const InputField = ({ label, field, type = 'text' }) => (
    <div>
      <label style={st.label}>{label}</label>
      <input type={type} style={st.input} value={editForm[field] || ''} onChange={e => setEditForm({ ...editForm, [field]: e.target.value })} />
    </div>
  )

  const SelectField = ({ label, field, options }) => (
    <div>
      <label style={st.label}>{label}</label>
      <select style={st.input} value={editForm[field] || ''} onChange={e => setEditForm({ ...editForm, [field]: e.target.value })}>
        {options.map(([val, lbl]) => <option key={val} value={val}>{lbl}</option>)}
      </select>
    </div>
  )

  const BarChart = ({ data, maxVal, color }) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {data.map(([label, val]) => (
        <div key={label}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span style={{ fontSize: '12px', color: C.text }}>{label}</span>
            <span style={{ fontSize: '12px', fontWeight: '700', color }}>{val.toFixed(0)}</span>
          </div>
          <div style={{ height: '8px', background: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${maxVal > 0 ? (val / maxVal) * 100 : 0}%`, background: color, borderRadius: '4px', transition: 'width 1s ease' }} />
          </div>
        </div>
      ))}
    </div>
  )

  const thumb = { width: '34px', height: '34px', borderRadius: '6px', objectFit: 'cover', cursor: 'pointer', border: `1px solid ${C.border}` }
  const imgLink = { color: C.orange, fontSize: '11px', cursor: 'pointer', fontWeight: '600' }

  return (
    <div style={{ minHeight: '100vh', background: '#f8f9fa', fontFamily: 'Cairo, sans-serif', direction: 'rtl' }}>
      <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&display=swap" rel="stylesheet" />

      {previewImage && (
        <div style={{ ...st.modal, zIndex: 200 }} onClick={() => setPreviewImage(null)}>
          <div onClick={e => e.stopPropagation()} style={{ background: C.white, borderRadius: '14px', padding: '16px', maxWidth: '90vw' }}>
            <img src={previewImage} style={{ maxWidth: '80vw', maxHeight: '80vh', borderRadius: '8px' }} alt="preview" />
            <div style={{ textAlign: 'center', marginTop: '12px' }}>
              <button style={st.btn('#888', true)} onClick={() => setPreviewImage(null)}>إغلاق</button>
            </div>
          </div>
        </div>
      )}

      {isMobile && sidebarOpen && <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 30 }} onClick={() => setSidebarOpen(false)} />}

      {/* Top Bar */}
      <div style={{ background: C.white, borderBottom: `3px solid ${C.orange}`, padding: isMobile ? '8px 16px' : '10px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 20, boxShadow: '0 2px 12px rgba(255,107,0,0.08)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {isMobile && <button onClick={() => setSidebarOpen(!sidebarOpen)} style={{ background: 'none', border: 'none', fontSize: '22px', cursor: 'pointer', color: C.orange }}>☰</button>}
          <img src="/logo-madinah.jpeg" alt="" style={{ height: isMobile ? '36px' : '50px', objectFit: 'contain' }} />
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: isMobile ? '11px' : '15px', fontWeight: '900', color: C.orange }}>{isMobile ? 'أسطول نظافة المدينة' : 'أسطول مشاريع نظافة المدينة المنورة'}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {criticalAlerts.length > 0 && (
            <div onClick={() => setActiveTab('alerts')} style={{ position: 'relative', cursor: 'pointer' }}>
              <span style={{ fontSize: '22px' }}>🔔</span>
              <span style={{ position: 'absolute', top: '-4px', right: '-4px', background: '#dc2626', color: '#fff', borderRadius: '50%', width: '18px', height: '18px', fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700' }}>{criticalAlerts.length}</span>
            </div>
          )}
          {!isMobile && <img src="/logo-mag.jpeg" alt="" style={{ height: '40px', objectFit: 'contain' }} />}
          <button onClick={handleLogout} style={{ ...st.btn('#dc2626', true), padding: isMobile ? '6px 10px' : '9px 18px', fontSize: isMobile ? '11px' : '13px' }}>خروج</button>
        </div>
      </div>

      <div style={{ display: 'flex' }}>
        {/* Sidebar */}
        <div style={{ width: '220px', background: C.white, borderLeft: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', padding: '16px 0', position: isMobile ? 'fixed' : 'sticky', right: isMobile ? (sidebarOpen ? 0 : '-220px') : 0, top: isMobile ? 0 : '63px', height: isMobile ? '100vh' : 'calc(100vh - 63px)', overflowY: 'auto', zIndex: isMobile ? 40 : 10, transition: 'right 0.3s ease' }}>
          {isMobile && (
            <div style={{ padding: '16px 20px 8px', borderBottom: `1px solid ${C.border}`, marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '14px', fontWeight: '700', color: C.orange }}>القائمة</div>
              <button onClick={() => setSidebarOpen(false)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer' }}>✕</button>
            </div>
          )}
          {navItems.map(([id, icon, label]) => (
            <div key={id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 20px', cursor: 'pointer', fontSize: '13px', fontWeight: activeTab === id ? '700' : '400', color: activeTab === id ? C.orange : C.muted, background: activeTab === id ? C.orangeLight : 'transparent', borderRight: activeTab === id ? `3px solid ${C.orange}` : '3px solid transparent', position: 'relative' }}
              onClick={() => { setActiveTab(id); if (isMobile) setSidebarOpen(false) }}>
              <span style={{ fontSize: '17px' }}>{icon}</span>
              <span>{label}</span>
              {id === 'alerts' && criticalAlerts.length > 0 && <span style={{ marginRight: 'auto', background: '#dc2626', color: '#fff', borderRadius: '20px', padding: '1px 7px', fontSize: '10px', fontWeight: '700' }}>{criticalAlerts.length}</span>}
            </div>
          ))}
          <div style={{ flex: 1 }} />
          <div style={{ padding: '16px 20px', borderTop: `1px solid ${C.border}` }}>
            <button onClick={handleLogout} style={{ ...st.btn('#dc2626', true), width: '100%' }}>تسجيل الخروج</button>
          </div>
        </div>

        {/* Main */}
        <div style={{ flex: 1, padding: isMobile ? '16px' : '24px', overflowX: 'auto', marginRight: isMobile ? 0 : '220px' }}>

          {/* Dashboard */}
          {activeTab === 'dashboard' && (
            <div>
              <div style={{ fontSize: isMobile ? '16px' : '19px', fontWeight: '800', marginBottom: '20px' }}>📊 لوحة التحكم</div>
              {criticalAlerts.length > 0 && (
                <div onClick={() => setActiveTab('alerts')} style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '12px', padding: '14px 18px', marginBottom: '20px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '24px' }}>🚨</span>
                  <div><div style={{ fontWeight: '700', color: '#dc2626', fontSize: '14px' }}>يوجد {criticalAlerts.length} تنبيه حرج!</div><div style={{ color: '#888', fontSize: '12px' }}>اضغط لعرض التفاصيل</div></div>
                  <div style={{ marginRight: 'auto', color: '#dc2626', fontSize: '20px' }}>←</div>
                </div>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4,1fr)', gap: '12px', marginBottom: '20px' }}>
                {[['🚛','المركبات',vehicles.length,'#ff6b00'],['👤','السائقون',drivers.length,'#16a34a'],['🔧','الصيانة',maintenance.length,'#d97706'],['🔔','تنبيهات',alerts.length,'#dc2626']].map(([icon,label,val,color]) => (
                  <div key={label} style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: '14px', padding: isMobile ? '14px' : '20px', borderTop: `4px solid ${color}` }}>
                    <div style={{ color: C.muted, fontSize: '11px', marginBottom: '6px', fontWeight: '600' }}>{icon} {label}</div>
                    <div style={{ fontSize: isMobile ? '24px' : '30px', fontWeight: '900', color }}>{val}</div>
                  </div>
                ))}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '16px' }}>
                <div style={st.card}>
                  <div style={{ fontWeight: '800', marginBottom: '14px' }}>🚛 آخر المركبات</div>
                  {vehicles.slice(0,5).map(v => (
                    <div key={v.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: `1px solid ${C.border}` }}>
                      <div style={{ fontSize: '13px', fontWeight: '600' }}>{v.plate_number}</div>
                      <span style={st.badge(v.status)}>{statusLabel(v.status)}</span>
                    </div>
                  ))}
                </div>
                <div style={st.card}>
                  <div style={{ fontWeight: '800', marginBottom: '14px' }}>🔔 آخر التنبيهات</div>
                  {alerts.slice(0,5).map(a => (
                    <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 0', borderBottom: `1px solid ${C.border}` }}>
                      <span>{a.icon}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '12px', fontWeight: '600', color: alertColor(a.type) }}>{a.title}</div>
                        <div style={{ fontSize: '11px', color: C.muted }}>{a.detail}</div>
                      </div>
                    </div>
                  ))}
                  {alerts.length === 0 && <div style={{ color: '#16a34a', textAlign: 'center', padding: '20px', fontSize: '13px' }}>✅ لا توجد تنبيهات</div>}
                </div>
              </div>
            </div>
          )}

          {/* Reports */}
          {activeTab === 'reports' && (
            <div>
              <div style={{ fontSize: isMobile ? '16px' : '19px', fontWeight: '800', marginBottom: '20px' }}>📈 التقارير والإحصائيات</div>

              {/* KPI Summary */}
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(3,1fr)', gap: '12px', marginBottom: '20px' }}>
                {[
                  ['🚛', 'إجمالي المركبات', vehicles.length, '#ff6b00'],
                  ['✅', 'مركبات نشطة', activeVehicles, '#16a34a'],
                  ['🟢', 'مركبات جاهزة', readyVehicles, '#16a34a'],
                  ['👤', 'إجمالي السائقين', drivers.length, '#2563eb'],
                  ['👍', 'سائقون نشطون', activeDrivers, '#16a34a'],
                  ['🔔', 'تنبيهات نشطة', alerts.length, '#dc2626'],
                ].map(([icon, label, val, color]) => (
                  <div key={label} style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: '12px', padding: '16px', borderTop: `3px solid ${color}` }}>
                    <div style={{ color: C.muted, fontSize: '11px', marginBottom: '6px' }}>{icon} {label}</div>
                    <div style={{ fontSize: '26px', fontWeight: '900', color }}>{val}</div>
                  </div>
                ))}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                {/* Fuel report */}
                <div style={st.card}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <div style={{ fontWeight: '800', fontSize: '14px' }}>⛽ تقرير الوقود</div>
                    <button onClick={exportFuel} style={{ ...st.btn('#16a34a'), padding: '6px 12px', fontSize: '11px' }}>📥 تصدير</button>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                    <div style={{ background: '#fff7f2', borderRadius: '10px', padding: '12px', textAlign: 'center' }}>
                      <div style={{ fontSize: '20px', fontWeight: '900', color: C.orange }}>{totalFuelCost.toFixed(0)}</div>
                      <div style={{ fontSize: '11px', color: C.muted }}>إجمالي التكلفة (ر.س)</div>
                    </div>
                    <div style={{ background: '#f0fdf4', borderRadius: '10px', padding: '12px', textAlign: 'center' }}>
                      <div style={{ fontSize: '20px', fontWeight: '900', color: '#16a34a' }}>{totalFuelLiters.toFixed(0)}</div>
                      <div style={{ fontSize: '11px', color: C.muted }}>إجمالي اللترات</div>
                    </div>
                  </div>
                  <div style={{ fontWeight: '700', fontSize: '12px', marginBottom: '10px', color: C.muted }}>أعلى 5 مركبات استهلاكاً</div>
                  <BarChart data={topFuelVehicles} maxVal={topFuelVehicles[0]?.[1] || 1} color={C.orange} />
                </div>

                {/* Maintenance report */}
                <div style={st.card}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <div style={{ fontWeight: '800', fontSize: '14px' }}>🔧 تقرير الصيانة</div>
                    <button onClick={exportMaintenance} style={{ ...st.btn('#16a34a'), padding: '6px 12px', fontSize: '11px' }}>📥 تصدير</button>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                    <div style={{ background: '#fffbeb', borderRadius: '10px', padding: '12px', textAlign: 'center' }}>
                      <div style={{ fontSize: '20px', fontWeight: '900', color: '#d97706' }}>{totalMaintenanceCost.toFixed(0)}</div>
                      <div style={{ fontSize: '11px', color: C.muted }}>إجمالي التكلفة (ر.س)</div>
                    </div>
                    <div style={{ background: '#f0fdf4', borderRadius: '10px', padding: '12px', textAlign: 'center' }}>
                      <div style={{ fontSize: '20px', fontWeight: '900', color: '#16a34a' }}>{maintenance.filter(m => m.status === 'active').length}</div>
                      <div style={{ fontSize: '11px', color: C.muted }}>صيانة مكتملة</div>
                    </div>
                  </div>
                  <div style={{ fontWeight: '700', fontSize: '12px', marginBottom: '10px', color: C.muted }}>حالة الصيانة</div>
                  <BarChart
                    data={[
                      ['مكتملة', maintenance.filter(m => m.status === 'active').length],
                      ['معلقة', maintenance.filter(m => m.status === 'pending').length],
                      ['ملغاة', maintenance.filter(m => m.status === 'inactive').length],
                    ]}
                    maxVal={maintenance.length || 1}
                    color="#d97706"
                  />
                </div>
              </div>

              {/* Vehicle status */}
              <div style={st.card}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <div style={{ fontWeight: '800', fontSize: '14px' }}>🚛 تقرير المركبات</div>
                  <button onClick={exportVehicles} style={{ ...st.btn('#16a34a'), padding: '6px 12px', fontSize: '11px' }}>📥 تصدير Excel</button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(3,1fr)', gap: '12px' }}>
                  <div style={{ background: '#f0fdf4', borderRadius: '10px', padding: '14px', textAlign: 'center' }}>
                    <div style={{ fontSize: '28px', fontWeight: '900', color: '#16a34a' }}>{readyVehicles}</div>
                    <div style={{ fontSize: '12px', color: C.muted }}>✅ جاهزة</div>
                    <div style={{ fontSize: '11px', color: '#16a34a', fontWeight: '700' }}>{vehicles.length > 0 ? ((readyVehicles/vehicles.length)*100).toFixed(0) : 0}%</div>
                  </div>
                  <div style={{ background: '#fffbeb', borderRadius: '10px', padding: '14px', textAlign: 'center' }}>
                    <div style={{ fontSize: '28px', fontWeight: '900', color: '#d97706' }}>{vehicleTypes['in_progress'] || 0}</div>
                    <div style={{ fontSize: '12px', color: C.muted }}>🔄 قيد التجهيز</div>
                    <div style={{ fontSize: '11px', color: '#d97706', fontWeight: '700' }}>{vehicles.length > 0 ? (((vehicleTypes['in_progress']||0)/vehicles.length)*100).toFixed(0) : 0}%</div>
                  </div>
                  <div style={{ background: '#fef2f2', borderRadius: '10px', padding: '14px', textAlign: 'center' }}>
                    <div style={{ fontSize: '28px', fontWeight: '900', color: '#dc2626' }}>{vehicleTypes['not_ready'] || 0}</div>
                    <div style={{ fontSize: '12px', color: C.muted }}>❌ غير جاهزة</div>
                    <div style={{ fontSize: '11px', color: '#dc2626', fontWeight: '700' }}>{vehicles.length > 0 ? (((vehicleTypes['not_ready']||0)/vehicles.length)*100).toFixed(0) : 0}%</div>
                  </div>
                </div>
              </div>

              {/* Export all */}
              <div style={{ ...st.card, marginTop: '16px' }}>
                <div style={{ fontWeight: '800', fontSize: '14px', marginBottom: '16px' }}>📥 تصدير البيانات</div>
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4,1fr)', gap: '10px' }}>
                  <button onClick={exportVehicles} style={{ ...st.btn('#ff6b00'), textAlign: 'center', padding: '12px' }}>🚛 المركبات</button>
                  <button onClick={exportDrivers} style={{ ...st.btn('#2563eb'), textAlign: 'center', padding: '12px' }}>👤 السائقون</button>
                  <button onClick={exportMaintenance} style={{ ...st.btn('#d97706'), textAlign: 'center', padding: '12px' }}>🔧 الصيانة</button>
                  <button onClick={exportFuel} style={{ ...st.btn('#16a34a'), textAlign: 'center', padding: '12px' }}>⛽ الوقود</button>
                </div>
              </div>
            </div>
          )}

          {/* Alerts */}
          {activeTab === 'alerts' && (
            <div>
              <div style={{ fontSize: isMobile ? '16px' : '19px', fontWeight: '800', marginBottom: '20px' }}>🔔 التنبيهات ({alerts.length})</div>
              {alerts.length === 0 ? (
                <div style={{ ...st.card, textAlign: 'center', padding: '60px' }}>
                  <div style={{ fontSize: '48px', marginBottom: '16px' }}>✅</div>
                  <div style={{ fontSize: '16px', fontWeight: '700', color: '#16a34a' }}>لا توجد تنبيهات</div>
                  <div style={{ color: C.muted, fontSize: '13px', marginTop: '8px' }}>كل الرخص والمواعيد سليمة</div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {alerts.map(a => (
                    <div key={a.id} style={{ background: alertBg(a.type), border: `1px solid ${alertColor(a.type)}33`, borderRadius: '12px', padding: '16px', display: 'flex', alignItems: 'center', gap: '14px', borderRight: `4px solid ${alertColor(a.type)}` }}>
                      <span style={{ fontSize: '28px' }}>{a.icon}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: '700', color: alertColor(a.type), fontSize: '14px' }}>{a.title}</div>
                        <div style={{ color: C.muted, fontSize: '12px', marginTop: '4px' }}>{a.detail}</div>
                      </div>
                      <div style={{ background: alertColor(a.type), color: '#fff', borderRadius: '20px', padding: '4px 12px', fontSize: '12px', fontWeight: '700', whiteSpace: 'nowrap' }}>
                        {a.type === 'expired' ? 'منتهي' : a.type === 'critical' ? 'حرج' : a.type === 'warning' ? 'تحذير' : 'تنبيه'}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Vehicles */}
          {activeTab === 'vehicles' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <div style={{ fontSize: isMobile ? '16px' : '19px', fontWeight: '800' }}>🚛 المركبات ({filteredVehicles.length})</div>
                <button style={{ ...st.btn(), fontSize: isMobile ? '12px' : '13px', padding: isMobile ? '7px 12px' : '9px 18px' }} onClick={() => setShowVehicleForm(true)}>+ إضافة</button>
              </div>
              <input style={{ ...st.input, marginBottom: '16px' }} placeholder="🔍 بحث برقم اللوحة، الكود، الماركة..." value={vehicleSearch} onChange={e => setVehicleSearch(e.target.value)} />
              <div style={{ ...st.card, padding: 0, overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '600px' }}>
                  <thead><tr>
                    <th style={st.th}>صورة</th><th style={st.th}>اللوحة</th><th style={st.th}>الكود</th>
                    {!isMobile && <><th style={st.th}>الماركة</th><th style={st.th}>الموديل</th><th style={st.th}>السنة</th></>}
                    <th style={st.th}>الحالة</th><th style={st.th}>التجهيز</th>
                    <th style={st.th}>استمارة</th><th style={st.th}>✏️</th><th style={st.th}>🗑️</th>
                  </tr></thead>
                  <tbody>
                    {filteredVehicles.map(v => (
                      <tr key={v.id} onMouseEnter={e => e.currentTarget.style.background='#fff7f2'} onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                        <td style={st.td}>{v.vehicle_image ? <img src={v.vehicle_image} style={thumb} onClick={() => setPreviewImage(v.vehicle_image)} alt="" /> : '—'}</td>
                        <td style={{ ...st.td, fontWeight: '700' }}>{v.plate_number}</td>
                        <td style={st.td}>{v.vehicle_code || '—'}</td>
                        {!isMobile && <><td style={st.td}>{v.brand}</td><td style={st.td}>{v.model}</td><td style={st.td}>{v.year}</td></>}
                        <td style={st.td}><span style={st.badge(v.status)}>{statusLabel(v.status)}</span></td>
                        <td style={st.td}>
                          <select value={v.preparation_status || 'not_ready'} onChange={e => updatePreparation(v.id, e.target.value)} style={st.prepSelect(v.preparation_status || 'not_ready')}>
                            <option value="not_ready">❌</option><option value="in_progress">🔄</option><option value="ready">✅</option>
                          </select>
                        </td>
                        <td style={st.td}>{v.istimara_image ? <span style={imgLink} onClick={() => setPreviewImage(v.istimara_image)}>عرض</span> : '—'}</td>
                        <td style={st.td}><button style={st.editBtn} onClick={() => openEdit('vehicle', v)}>✏️</button></td>
                        <td style={st.td}><button style={st.deleteBtn} onClick={() => deleteVehicle(v.id)}>🗑️</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredVehicles.length === 0 && <div style={{ color: C.muted, textAlign: 'center', padding: '40px' }}>لا توجد نتائج</div>}
              </div>
            </div>
          )}

          {/* Drivers */}
          {activeTab === 'drivers' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <div style={{ fontSize: isMobile ? '16px' : '19px', fontWeight: '800' }}>👤 السائقون ({filteredDrivers.length})</div>
                <button style={{ ...st.btn(), fontSize: isMobile ? '12px' : '13px', padding: isMobile ? '7px 12px' : '9px 18px' }} onClick={() => setShowDriverForm(true)}>+ إضافة</button>
              </div>
              <input style={{ ...st.input, marginBottom: '16px' }} placeholder="🔍 بحث بالاسم، الهوية، الجواز، الجوال..." value={driverSearch} onChange={e => setDriverSearch(e.target.value)} />
              <div style={{ ...st.card, padding: 0, overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '500px' }}>
                  <thead><tr>
                    <th style={st.th}>الاسم</th><th style={st.th}>الهوية</th>
                    {!isMobile && <><th style={st.th}>الجواز</th><th style={st.th}>الجوال</th><th style={st.th}>الرخصة</th><th style={st.th}>الانتهاء</th></>}
                    <th style={st.th}>إقامة</th><th style={st.th}>رخصة</th>
                    <th style={st.th}>الحالة</th><th style={st.th}>✏️</th><th style={st.th}>🗑️</th>
                  </tr></thead>
                  <tbody>
                    {filteredDrivers.map(d => {
                      const days = daysUntil(d.license_expiry)
                      const expiring = days !== null && days <= 30
                      return (
                        <tr key={d.id} style={{ background: expiring ? '#fffbeb' : 'transparent' }} onMouseEnter={e => e.currentTarget.style.background='#fff7f2'} onMouseLeave={e => e.currentTarget.style.background = expiring ? '#fffbeb' : 'transparent'}>
                          <td style={{ ...st.td, fontWeight: '700' }}>{d.full_name}</td>
                          <td style={st.td}>{d.national_id || '—'}</td>
                          {!isMobile && <><td style={st.td}>{d.passport_number || '—'}</td><td style={st.td}>{d.phone || '—'}</td><td style={st.td}>{d.license_number || '—'}</td>
                          <td style={st.td}><span style={{ color: days !== null && days < 0 ? '#dc2626' : days !== null && days <= 14 ? '#ea580c' : days !== null && days <= 30 ? '#d97706' : C.text, fontWeight: expiring ? '700' : '400' }}>{d.license_expiry || '—'}{days !== null && days < 0 && ' ⚠️'}</span></td></>}
                          <td style={st.td}>{d.iqama_image ? <span style={imgLink} onClick={() => setPreviewImage(d.iqama_image)}>عرض</span> : '—'}</td>
                          <td style={st.td}>{d.license_image ? <span style={imgLink} onClick={() => setPreviewImage(d.license_image)}>عرض</span> : '—'}</td>
                          <td style={st.td}><span style={st.badge(d.status)}>{statusLabel(d.status)}</span></td>
                          <td style={st.td}><button style={st.editBtn} onClick={() => openEdit('driver', d)}>✏️</button></td>
                          <td style={st.td}><button style={st.deleteBtn} onClick={() => deleteDriver(d.id)}>🗑️</button></td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
                {filteredDrivers.length === 0 && <div style={{ color: C.muted, textAlign: 'center', padding: '40px' }}>لا توجد نتائج</div>}
              </div>
            </div>
          )}

          {/* Maintenance */}
          {activeTab === 'maintenance' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <div style={{ fontSize: isMobile ? '16px' : '19px', fontWeight: '800' }}>🔧 الصيانة</div>
                <button style={{ ...st.btn(), fontSize: isMobile ? '12px' : '13px', padding: isMobile ? '7px 12px' : '9px 18px' }} onClick={() => setShowMaintenanceForm(true)}>+ إضافة</button>
              </div>
              <div style={{ ...st.card, padding: 0, overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '500px' }}>
                  <thead><tr>
                    <th style={st.th}>المركبة</th><th style={st.th}>النوع</th>
                    {!isMobile && <><th style={st.th}>الوصف</th><th style={st.th}>التاريخ</th></>}
                    <th style={st.th}>التكلفة</th><th style={st.th}>الموعد القادم</th>
                    <th style={st.th}>الحالة</th><th style={st.th}>✏️</th><th style={st.th}>🗑️</th>
                  </tr></thead>
                  <tbody>
                    {maintenance.map(m => {
                      const days = daysUntil(m.next_date)
                      const expiring = days !== null && days <= 7
                      return (
                        <tr key={m.id} style={{ background: expiring ? '#fff7ed' : 'transparent' }} onMouseEnter={e => e.currentTarget.style.background='#fff7f2'} onMouseLeave={e => e.currentTarget.style.background = expiring ? '#fff7ed' : 'transparent'}>
                          <td style={{ ...st.td, fontWeight: '700' }}>{m.vehicles?.plate_number}</td>
                          <td style={st.td}>{m.type}</td>
                          {!isMobile && <><td style={st.td}>{m.description}</td><td style={st.td}>{m.date}</td></>}
                          <td style={st.td}><span style={{ color: C.orange, fontWeight: '700' }}>{m.cost} ر.س</span></td>
                          <td style={st.td}><span style={{ color: expiring ? '#dc2626' : C.text, fontWeight: expiring ? '700' : '400' }}>{m.next_date || '—'}{expiring && ' ⚠️'}</span></td>
                          <td style={st.td}><span style={st.badge(m.status)}>{statusLabel(m.status)}</span></td>
                          <td style={st.td}><button style={st.editBtn} onClick={() => openEdit('maintenance', m)}>✏️</button></td>
                          <td style={st.td}><button style={st.deleteBtn} onClick={() => deleteMaintenance(m.id)}>🗑️</button></td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
                {maintenance.length === 0 && <div style={{ color: C.muted, textAlign: 'center', padding: '40px' }}>لا توجد سجلات</div>}
              </div>
            </div>
          )}

          {/* Fuel */}
          {activeTab === 'fuel' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <div style={{ fontSize: isMobile ? '16px' : '19px', fontWeight: '800' }}>⛽ الوقود</div>
                <button style={{ ...st.btn(), fontSize: isMobile ? '12px' : '13px', padding: isMobile ? '7px 12px' : '9px 18px' }} onClick={() => setShowFuelForm(true)}>+ إضافة</button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: '14px', padding: '16px', borderTop: '4px solid #ff6b00' }}>
                  <div style={{ color: C.muted, fontSize: '11px', fontWeight: '600' }}>⛽ إجمالي التكلفة</div>
                  <div style={{ fontSize: isMobile ? '22px' : '28px', fontWeight: '900', color: '#ff6b00' }}>{totalFuelCost.toFixed(0)} ر.س</div>
                </div>
                <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: '14px', padding: '16px', borderTop: '4px solid #7c3aed' }}>
                  <div style={{ color: C.muted, fontSize: '11px', fontWeight: '600' }}>📋 عدد السجلات</div>
                  <div style={{ fontSize: isMobile ? '22px' : '28px', fontWeight: '900', color: '#7c3aed' }}>{fuelLogs.length}</div>
                </div>
              </div>
              <div style={{ ...st.card, padding: 0, overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '500px' }}>
                  <thead><tr>
                    <th style={st.th}>المركبة</th><th style={st.th}>السائق</th>
                    {!isMobile && <><th style={st.th}>التاريخ</th><th style={st.th}>اللترات</th></>}
                    <th style={st.th}>الإجمالي</th><th style={st.th}>✏️</th><th style={st.th}>🗑️</th>
                  </tr></thead>
                  <tbody>
                    {fuelLogs.map(f => (
                      <tr key={f.id} onMouseEnter={e => e.currentTarget.style.background='#fff7f2'} onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                        <td style={{ ...st.td, fontWeight: '700' }}>{f.vehicles?.plate_number}</td>
                        <td style={st.td}>{f.drivers?.full_name}</td>
                        {!isMobile && <><td style={st.td}>{f.date}</td><td style={st.td}>{f.liters}</td></>}
                        <td style={st.td}><span style={{ color: C.orange, fontWeight: '700' }}>{f.total_cost} ر.س</span></td>
                        <td style={st.td}><button style={st.editBtn} onClick={() => openEdit('fuel', f)}>✏️</button></td>
                        <td style={st.td}><button style={st.deleteBtn} onClick={() => deleteFuel(f.id)}>🗑️</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {fuelLogs.length === 0 && <div style={{ color: C.muted, textAlign: 'center', padding: '40px' }}>لا توجد سجلات</div>}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Edit Modal */}
      {editItem && (
        <div style={st.modal}>
          <div style={st.modalBox}>
            <div style={{ fontSize: '16px', fontWeight: '800', marginBottom: '20px' }}>✏️ تعديل {editType === 'vehicle' ? 'مركبة' : editType === 'driver' ? 'سائق' : editType === 'maintenance' ? 'صيانة' : 'وقود'}</div>
            {editType === 'vehicle' && (<div style={st.formGrid}>
              <InputField label="رقم اللوحة" field="plate_number" /><InputField label="كود المركبة" field="vehicle_code" />
              <InputField label="النوع" field="type" /><InputField label="الماركة" field="brand" />
              <InputField label="الموديل" field="model" /><InputField label="السنة" field="year" />
              <InputField label="اللون" field="color" /><InputField label="نوع الوقود" field="fuel_type" />
              <SelectField label="الحالة" field="status" options={[['active','نشط'],['inactive','غير نشط'],['pending','معلق']]} />
              <SelectField label="حالة التجهيز" field="preparation_status" options={[['not_ready','غير جاهزة ❌'],['in_progress','قيد التجهيز 🔄'],['ready','جاهزة ✅']]} />
              <FileInput label="تغيير صورة المركبة" icon="🚛" onChange={setEditVehicleImage} file={editVehicleImage} />
              <FileInput label="تغيير صورة الاستمارة" icon="📄" onChange={setEditIstamaraImage} file={editIstamaraImage} />
            </div>)}
            {editType === 'driver' && (<div style={st.formGrid}>
              <InputField label="الاسم الكامل" field="full_name" /><InputField label="رقم الهوية" field="national_id" />
              <InputField label="رقم الجواز" field="passport_number" /><InputField label="الجوال" field="phone" />
              <InputField label="رقم الرخصة" field="license_number" /><InputField label="انتهاء الرخصة" field="license_expiry" type="date" />
              <SelectField label="الحالة" field="status" options={[['active','نشط'],['inactive','غير نشط']]} />
              <FileInput label="تغيير صورة الإقامة" icon="🪪" onChange={setEditIqamaImage} file={editIqamaImage} />
              <FileInput label="تغيير صورة الرخصة" icon="🚗" onChange={setEditLicenseImage} file={editLicenseImage} />
            </div>)}
            {editType === 'maintenance' && (<div style={st.formGrid}>
              <div><label style={st.label}>المركبة</label><select style={st.input} value={editForm.vehicle_id||''} onChange={e=>setEditForm({...editForm,vehicle_id:e.target.value})}>{vehicles.map(v=><option key={v.id} value={v.id}>{v.plate_number}</option>)}</select></div>
              <InputField label="النوع" field="type" /><InputField label="الوصف" field="description" />
              <InputField label="التكلفة" field="cost" /><InputField label="التاريخ" field="date" type="date" />
              <InputField label="الموعد القادم" field="next_date" type="date" />
              <SelectField label="الحالة" field="status" options={[['pending','معلق'],['active','مكتمل'],['inactive','ملغي']]} />
            </div>)}
            {editType === 'fuel' && (<div style={st.formGrid}>
              <div><label style={st.label}>المركبة</label><select style={st.input} value={editForm.vehicle_id||''} onChange={e=>setEditForm({...editForm,vehicle_id:e.target.value})}>{vehicles.map(v=><option key={v.id} value={v.id}>{v.plate_number}</option>)}</select></div>
              <div><label style={st.label}>السائق</label><select style={st.input} value={editForm.driver_id||''} onChange={e=>setEditForm({...editForm,driver_id:e.target.value})}>{drivers.map(d=><option key={d.id} value={d.id}>{d.full_name}</option>)}</select></div>
              <InputField label="التاريخ" field="date" type="date" /><InputField label="اللترات" field="liters" type="number" />
              <InputField label="سعر اللتر" field="cost_per_liter" type="number" /><InputField label="العداد" field="odometer" type="number" />
            </div>)}
            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button style={st.btn()} onClick={saveEdit} disabled={uploading}>{uploading ? '⏳ جاري...' : '💾 حفظ'}</button>
              <button style={st.btn('#888', true)} onClick={() => setEditItem(null)}>إلغاء</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Modals */}
      {showVehicleForm && (<div style={st.modal}><div style={st.modalBox}>
        <div style={{ fontSize: '16px', fontWeight: '800', marginBottom: '16px' }}>🚛 إضافة مركبة</div>
        <div style={st.formGrid}>
          {[['plate_number','رقم اللوحة'],['vehicle_code','كود المركبة'],['type','النوع'],['brand','الماركة'],['model','الموديل'],['year','السنة'],['color','اللون'],['fuel_type','نوع الوقود']].map(([key,label]) => (
            <div key={key}><label style={st.label}>{label}</label><input style={st.input} value={vehicleForm[key]} onChange={e => setVehicleForm({...vehicleForm,[key]:e.target.value})} /></div>
          ))}
          <div><label style={st.label}>الحالة</label><select style={st.input} value={vehicleForm.status} onChange={e => setVehicleForm({...vehicleForm,status:e.target.value})}><option value="active">نشط</option><option value="inactive">غير نشط</option><option value="pending">معلق</option></select></div>
          <div><label style={st.label}>حالة التجهيز</label><select style={st.input} value={vehicleForm.preparation_status} onChange={e => setVehicleForm({...vehicleForm,preparation_status:e.target.value})}><option value="not_ready">غير جاهزة ❌</option><option value="in_progress">قيد التجهيز 🔄</option><option value="ready">جاهزة ✅</option></select></div>
          <FileInput label="صورة المركبة" icon="🚛" onChange={setVehicleImage} file={vehicleImage} />
          <FileInput label="صورة الاستمارة" icon="📄" onChange={setIstamaraImage} file={istamaraImage} />
        </div>
        <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
          <button style={st.btn()} onClick={addVehicle} disabled={uploading}>{uploading ? '⏳ جاري الرفع...' : 'حفظ'}</button>
          <button style={st.btn('#888', true)} onClick={() => setShowVehicleForm(false)}>إلغاء</button>
        </div>
      </div></div>)}

      {showDriverForm && (<div style={st.modal}><div style={st.modalBox}>
        <div style={{ fontSize: '16px', fontWeight: '800', marginBottom: '16px' }}>👤 إضافة سائق</div>
        <div style={st.formGrid}>
          {[['full_name','الاسم الكامل'],['national_id','رقم الهوية'],['passport_number','رقم الجواز'],['phone','الجوال'],['license_number','رقم الرخصة']].map(([key,label]) => (
            <div key={key}><label style={st.label}>{label}</label><input style={st.input} value={driverForm[key]} onChange={e => setDriverForm({...driverForm,[key]:e.target.value})} /></div>
          ))}
          <div><label style={st.label}>انتهاء الرخصة</label><input type="date" style={st.input} value={driverForm.license_expiry} onChange={e => setDriverForm({...driverForm,license_expiry:e.target.value})} /></div>
          <div><label style={st.label}>الحالة</label><select style={st.input} value={driverForm.status} onChange={e => setDriverForm({...driverForm,status:e.target.value})}><option value="active">نشط</option><option value="inactive">غير نشط</option></select></div>
          <FileInput label="صورة الإقامة" icon="🪪" onChange={setIqamaImage} file={iqamaImage} />
          <FileInput label="صورة الرخصة" icon="🚗" onChange={setLicenseImage} file={licenseImage} />
        </div>
        <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
          <button style={st.btn()} onClick={addDriver} disabled={uploading}>{uploading ? '⏳ جاري الرفع...' : 'حفظ'}</button>
          <button style={st.btn('#888', true)} onClick={() => setShowDriverForm(false)}>إلغاء</button>
        </div>
      </div></div>)}

      {showMaintenanceForm && (<div style={st.modal}><div style={st.modalBox}>
        <div style={{ fontSize: '16px', fontWeight: '800', marginBottom: '16px' }}>🔧 إضافة صيانة</div>
        <div style={st.formGrid}>
          <div><label style={st.label}>المركبة</label><select style={st.input} value={maintenanceForm.vehicle_id} onChange={e => setMaintenanceForm({...maintenanceForm,vehicle_id:e.target.value})}><option value="">اختر مركبة</option>{vehicles.map(v=><option key={v.id} value={v.id}>{v.plate_number}</option>)}</select></div>
          {[['type','نوع الصيانة'],['description','الوصف'],['cost','التكلفة']].map(([key,label]) => (
            <div key={key}><label style={st.label}>{label}</label><input style={st.input} value={maintenanceForm[key]} onChange={e => setMaintenanceForm({...maintenanceForm,[key]:e.target.value})} /></div>
          ))}
          <div><label style={st.label}>التاريخ</label><input type="date" style={st.input} value={maintenanceForm.date} onChange={e => setMaintenanceForm({...maintenanceForm,date:e.target.value})} /></div>
          <div><label style={st.label}>الموعد القادم</label><input type="date" style={st.input} value={maintenanceForm.next_date} onChange={e => setMaintenanceForm({...maintenanceForm,next_date:e.target.value})} /></div>
          <div><label style={st.label}>الحالة</label><select style={st.input} value={maintenanceForm.status} onChange={e => setMaintenanceForm({...maintenanceForm,status:e.target.value})}><option value="pending">معلق</option><option value="active">مكتمل</option><option value="inactive">ملغي</option></select></div>
        </div>
        <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
          <button style={st.btn()} onClick={addMaintenance}>حفظ</button>
          <button style={st.btn('#888', true)} onClick={() => setShowMaintenanceForm(false)}>إلغاء</button>
        </div>
      </div></div>)}

      {showFuelForm && (<div style={st.modal}><div style={st.modalBox}>
        <div style={{ fontSize: '16px', fontWeight: '800', marginBottom: '16px' }}>⛽ إضافة تزود وقود</div>
        <div style={st.formGrid}>
          <div><label style={st.label}>المركبة</label><select style={st.input} value={fuelForm.vehicle_id} onChange={e => setFuelForm({...fuelForm,vehicle_id:e.target.value})}><option value="">اختر مركبة</option>{vehicles.map(v=><option key={v.id} value={v.id}>{v.plate_number}</option>)}</select></div>
          <div><label style={st.label}>السائق</label><select style={st.input} value={fuelForm.driver_id} onChange={e => setFuelForm({...fuelForm,driver_id:e.target.value})}><option value="">اختر سائق</option>{drivers.map(d=><option key={d.id} value={d.id}>{d.full_name}</option>)}</select></div>
          <div><label style={st.label}>التاريخ</label><input type="date" style={st.input} value={fuelForm.date} onChange={e => setFuelForm({...fuelForm,date:e.target.value})} /></div>
          {[['liters','اللترات'],['cost_per_liter','سعر اللتر'],['odometer','العداد']].map(([key,label]) => (
            <div key={key}><label style={st.label}>{label}</label><input type="number" style={st.input} value={fuelForm[key]} onChange={e => setFuelForm({...fuelForm,[key]:e.target.value})} /></div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
          <button style={st.btn()} onClick={addFuel}>حفظ</button>
          <button style={st.btn('#888', true)} onClick={() => setShowFuelForm(false)}>إلغاء</button>
        </div>
      </div></div>)}

      {/* Mobile bottom nav */}
      {isMobile && (
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: C.white, borderTop: `2px solid ${C.border}`, display: 'flex', justifyContent: 'space-around', padding: '6px 0', zIndex: 15 }}>
          {navItems.map(([id, icon, label]) => (
            <div key={id} onClick={() => setActiveTab(id)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1px', cursor: 'pointer', color: activeTab === id ? C.orange : C.muted, fontSize: '9px', fontWeight: activeTab === id ? '700' : '400', minWidth: '40px', position: 'relative' }}>
              <span style={{ fontSize: '17px' }}>{icon}</span>
              <span>{label.split(' ')[0]}</span>
              {id === 'alerts' && criticalAlerts.length > 0 && <span style={{ position: 'absolute', top: '-2px', right: '2px', background: '#dc2626', color: '#fff', borderRadius: '50%', width: '13px', height: '13px', fontSize: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700' }}>{criticalAlerts.length}</span>}
            </div>
          ))}
        </div>
      )}
      {isMobile && <div style={{ height: '70px' }} />}
    </div>
  )
}
