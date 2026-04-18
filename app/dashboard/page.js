'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { translations } from './translations'

export default function Dashboard() {
  const [lang, setLang] = useState('ar')
  const t = translations[lang]
  const isRTL = lang === 'ar'

  const [vehicles, setVehicles] = useState([])
  const [drivers, setDrivers] = useState([])
  const [maintenance, setMaintenance] = useState([])
  const [fuelLogs, setFuelLogs] = useState([])
  const [activeTab, setActiveTab] = useState('dashboard')
  const [uploading, setUploading] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [currentRole, setCurrentRole] = useState('viewer')
  const [currentUser, setCurrentUser] = useState(null)
  const [userRoles, setUserRoles] = useState([])

  const [vehicleSearch, setVehicleSearch] = useState('')
  const [driverSearch, setDriverSearch] = useState('')
  const [regionFilter, setRegionFilter] = useState('all')

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
    const savedLang = localStorage.getItem('lang') || 'ar'
    setLang(savedLang)
    checkAuth(); fetchData()
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const switchLang = () => {
    const newLang = lang === 'ar' ? 'en' : 'ar'
    setLang(newLang)
    localStorage.setItem('lang', newLang)
  }

  const checkAuth = async () => {
    const { data } = await supabase.auth.getSession()
    if (!data.session) { window.location.href = '/'; return }
    setCurrentUser(data.session.user)
    const { data: roleData } = await supabase.from('user_roles').select('*').eq('user_id', data.session.user.id).single()
    setCurrentRole(roleData?.role || 'admin')
  }

  const fetchData = async () => {
    const [v, d, m, f, ur] = await Promise.all([
      supabase.from('vehicles').select('*').order('created_at', { ascending: false }),
      supabase.from('drivers').select('*').order('created_at', { ascending: false }),
      supabase.from('maintenance').select('*, vehicles(plate_number)').order('created_at', { ascending: false }),
      supabase.from('fuel_logs').select('*, vehicles(plate_number), drivers(full_name)').order('created_at', { ascending: false }),
      supabase.from('user_roles').select('*').order('created_at', { ascending: false }),
    ])
    setVehicles(v.data || []); setDrivers(d.data || [])
    setMaintenance(m.data || []); setFuelLogs(f.data || [])
    setUserRoles(ur.data || [])
  }

  const daysUntil = (dateStr) => {
    if (!dateStr) return null
    return Math.ceil((new Date(dateStr) - new Date()) / (1000 * 60 * 60 * 24))
  }

  const getAlerts = () => {
    const alerts = []
    drivers.forEach(d => {
      if (d.license_expiry) {
        const days = daysUntil(d.license_expiry)
        if (days !== null && days <= 60) {
          const detail = days < 0
            ? t.expiredDays.replace('{n}', Math.abs(days))
            : t.expiresIn.replace('{n}', days)
          alerts.push({ id: `lic-${d.id}`, type: days < 0 ? 'expired' : days <= 14 ? 'critical' : days <= 30 ? 'warning' : 'info', icon: 'ðŸªª', title: `${t.licenseAlert}: ${d.full_name}`, detail, days })
        }
      }
    })
    maintenance.forEach(m => {
      if (m.next_date) {
        const days = daysUntil(m.next_date)
        if (days !== null && days <= 30) {
          const detail = days < 0
            ? t.maintenanceLate.replace('{n}', Math.abs(days))
            : t.maintenanceIn.replace('{n}', days)
          alerts.push({ id: `maint-${m.id}`, type: days < 0 ? 'expired' : days <= 7 ? 'critical' : 'warning', icon: 'ðŸ”§', title: `${t.maintenanceAlert}: ${m.vehicles?.plate_number || ''}`, detail, days })
        }
      }
    })
    return alerts.sort((a, b) => a.days - b.days)
  }

  const alerts = getAlerts()
  const criticalAlerts = alerts.filter(a => a.type === 'expired' || a.type === 'critical')

  const exportToCSV = (data, filename) => {
    if (!data || data.length === 0) return
    const headers = Object.keys(data[0])
    const csvContent = [headers.join(','), ...data.map(row => headers.map(h => `"${(row[h] || '').toString().replace(/"/g, '""')}"`).join(','))].join('\n')
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = filename + '.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  const exportVehicles = () => exportToCSV(vehicles.map(v => ({ [t.plateNumber]: v.plate_number || '', [t.vehicleCode]: v.vehicle_code || '', [t.type]: v.type || '', [t.brand]: v.brand || '', [t.model]: v.model || '', [t.year]: v.year || '', [t.color]: v.color || '', [t.fuelType]: v.fuel_type || '', [t.status]: v.status === 'active' ? t.active : t.inactive })), t.vehicles)
  const exportDrivers = () => exportToCSV(drivers.map(d => ({ [t.fullName]: d.full_name || '', [t.nationalId]: d.national_id || '', [t.passportNumber]: d.passport_number || '', [t.phone]: d.phone || '', [t.licenseNumber]: d.license_number || '', [t.licenseExpiry]: d.license_expiry || '', [t.status]: d.status === 'active' ? t.active : t.inactive })), t.drivers)
  const exportMaintenance = () => exportToCSV(maintenance.map(m => ({ [t.vehicle]: m.vehicles?.plate_number || '', [t.type]: m.type || '', [t.description]: m.description || '', [t.date]: m.date || '', [t.cost]: m.cost || '', [t.nextDate]: m.next_date || '' })), t.maintenance)
  const exportFuel = () => exportToCSV(fuelLogs.map(f => ({ [t.vehicle]: f.vehicles?.plate_number || '', [t.driver]: f.drivers?.full_name || '', [t.date]: f.date || '', [t.liters]: f.liters || '', [t.pricePerLiter]: f.cost_per_liter || '', [t.total]: f.total_cost || '' })), t.fuel)

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

  const updateUserRole = async (userId, newRole) => {
    await supabase.from('user_roles').update({ role: newRole }).eq('user_id', userId); fetchData()
  }

  const deleteUserRole = async (userId) => {
    if (!confirm(lang === 'ar' ? 'Ù‡Ù„ Ø£Ù†Øª Ù…ØªØ£ÙƒØ¯ØŸ' : 'Are you sure?')) return
    await supabase.from('user_roles').delete().eq('user_id', userId); fetchData()
  }

  const canEdit = currentRole === 'admin' || currentRole === 'editor'
  const canDelete = currentRole === 'admin'

  const deleteVehicle = async (id) => { if (!canDelete) return; await supabase.from('vehicles').delete().eq('id', id); fetchData() }
  const deleteDriver = async (id) => { if (!canDelete) return; await supabase.from('drivers').delete().eq('id', id); fetchData() }
  const deleteMaintenance = async (id) => { if (!canDelete) return; await supabase.from('maintenance').delete().eq('id', id); fetchData() }
  const deleteFuel = async (id) => { if (!canDelete) return; await supabase.from('fuel_logs').delete().eq('id', id); fetchData() }
  const handleLogout = async () => { await supabase.auth.signOut(); window.location.href = '/' }

  const totalFuelCost = fuelLogs.reduce((a, b) => a + (b.total_cost || 0), 0)
  const totalFuelLiters = fuelLogs.reduce((a, b) => a + (Number(b.liters) || 0), 0)
  const totalMaintenanceCost = maintenance.reduce((a, b) => a + (Number(b.cost) || 0), 0)
  const activeVehicles = vehicles.filter(v => v.status === 'active').length
  const readyVehicles = vehicles.filter(v => v.preparation_status === 'ready').length
  const activeDrivers = drivers.filter(d => d.status === 'active').length

  const statusColor = (s) => s === 'active' ? '#16a34a' : s === 'pending' ? '#d97706' : '#dc2626'
  const statusBg = (s) => s === 'active' ? '#f0fdf4' : s === 'pending' ? '#fffbeb' : '#fef2f2'
  const statusLabel = (s) => s === 'active' ? t.active : s === 'pending' ? t.pending : t.inactive
  const prepColor = (s) => s === 'ready' ? '#16a34a' : s === 'in_progress' ? '#d97706' : '#dc2626'
  const prepBg = (s) => s === 'ready' ? '#f0fdf4' : s === 'in_progress' ? '#fffbeb' : '#fef2f2'
  const alertColor = (tp) => tp === 'expired' ? '#dc2626' : tp === 'critical' ? '#ea580c' : tp === 'warning' ? '#d97706' : '#2563eb'
  const alertBg = (tp) => tp === 'expired' ? '#fef2f2' : tp === 'critical' ? '#fff7ed' : tp === 'warning' ? '#fffbeb' : '#eff6ff'
  const alertLabel = (tp) => tp === 'expired' ? t.expiredLabel : tp === 'critical' ? t.criticalLabel : tp === 'warning' ? t.warningLabel : t.infoLabel
  const roleLabel = (r) => r === 'admin' ? t.adminRole : r === 'editor' ? t.editorRole : t.viewerRole
  const roleColor = (r) => r === 'admin' ? '#7c3aed' : r === 'editor' ? '#ff6b00' : '#16a34a'
  const roleBg = (r) => r === 'admin' ? '#f5f3ff' : r === 'editor' ? '#fff7f2' : '#f0fdf4'

  const getRegion = (v) => {
    const code = v.vehicle_code || v.plate_number || ''
    const firstChar = code.trim()[0]
    const map = { 'N': 'شمال', 'S': 'جنوب', 'E': 'شرق', 'W': 'غرب' }
    return map[firstChar] || 'غير محدد'
  }
  const filteredVehicles = vehicles.filter(v => regionFilter === 'all' || getRegion(v) === regionFilter).filter(v => (v.plate_number || '').includes(vehicleSearch) || (v.vehicle_code || '').includes(vehicleSearch) || (v.brand || '').includes(vehicleSearch) || (v.model || '').includes(vehicleSearch))
  const filteredDrivers = drivers.filter(d => (d.full_name || '').includes(driverSearch) || (d.national_id || '').includes(driverSearch) || (d.passport_number || '').includes(driverSearch) || (d.phone || '').includes(driverSearch))

  const vehicleTypes = vehicles.reduce((acc, v) => { const key = v.preparation_status || 'not_ready'; acc[key] = (acc[key] || 0) + 1; return acc }, {})
  const fuelByVehicle = fuelLogs.reduce((acc, f) => { const key = f.vehicles?.plate_number || '?'; acc[key] = (acc[key] || 0) + (Number(f.total_cost) || 0); return acc }, {})
  const topFuelVehicles = Object.entries(fuelByVehicle).sort((a, b) => b[1] - a[1]).slice(0, 5)

  const C = { orange: '#ff6b00', orangeLight: '#fff7f2', white: '#fff', gray: '#f8f9fa', text: '#1a1a1a', muted: '#888', border: '#e8e8e8' }
  const navItems = [['dashboard','ðŸ“Š',t.dashboard],['vehicles','ðŸš›',t.vehicles],['drivers','ðŸ‘¤',t.drivers],['maintenance','ðŸ”§',t.maintenance],['fuel','â›½',t.fuel],['reports','ðŸ“ˆ',t.reports],['alerts','ðŸ””',t.alerts],['users','ðŸ‘¥',t.users]]

  const st = {
    input: { width: '100%', padding: '10px 14px', background: '#fafafa', border: `1.5px solid ${C.border}`, borderRadius: '8px', color: C.text, fontSize: '13px', fontFamily: 'Cairo, sans-serif', outline: 'none', boxSizing: 'border-box' },
    label: { color: '#555', fontSize: '12px', fontWeight: '600', display: 'block', marginBottom: '6px' },
    btn: (c, outline) => ({ background: outline ? C.white : (c || C.orange), color: outline ? (c || C.orange) : C.white, border: `2px solid ${c || C.orange}`, borderRadius: '9px', padding: '9px 18px', fontSize: '13px', fontWeight: '700', fontFamily: 'Cairo, sans-serif', cursor: 'pointer' }),
    badge: (s) => ({ background: statusBg(s), color: statusColor(s), padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '700', display: 'inline-block' }),
    modal: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '16px' },
    modalBox: { background: C.white, borderRadius: '18px', padding: isMobile ? '20px' : '32px', width: '100%', maxWidth: '580px', maxHeight: '90vh', overflowY: 'auto' },
    formGrid: { display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '14px' },
    card: { background: C.white, border: `1px solid ${C.border}`, borderRadius: '14px', padding: isMobile ? '14px' : '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' },
    th: { padding: '10px 12px', textAlign: isRTL ? 'right' : 'left', color: C.muted, fontSize: '11px', fontWeight: '600', borderBottom: `2px solid ${C.border}`, background: '#fafafa', whiteSpace: 'nowrap' },
    td: { padding: '10px 12px', color: C.text, fontSize: '12px', borderBottom: `1px solid ${C.border}`, whiteSpace: 'nowrap' },
    editBtn: { background: '#fff7f2', border: '1px solid #ffccaa', color: C.orange, borderRadius: '6px', padding: '4px 8px', fontSize: '11px', cursor: 'pointer', fontFamily: 'Cairo, sans-serif', fontWeight: '600' },
    deleteBtn: { background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: '15px' },
    prepSelect: (s) => ({ background: prepBg(s), color: prepColor(s), border: `1.5px solid ${prepColor(s)}`, borderRadius: '8px', padding: '3px 6px', fontSize: '10px', fontWeight: '700', fontFamily: 'Cairo, sans-serif', cursor: 'pointer', outline: 'none' }),
  }

  const FileInput = ({ label, icon, onChange, file }) => (
    <div>
      <label style={st.label}>{icon} {label}</label>
      <label style={{ width: '100%', padding: '10px', background: file ? '#fff7f2' : '#fafafa', border: `2px dashed ${file ? C.orange : C.border}`, borderRadius: '8px', color: file ? C.orange : C.muted, fontSize: '12px', cursor: 'pointer', textAlign: 'center', display: 'block', boxSizing: 'border-box', fontWeight: '600' }}>
        {file ? `${t.fileSelected} ${file.name}` : `${t.uploadFile} ${label}`}
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
            <div style={{ height: '100%', width: `${maxVal > 0 ? (val / maxVal) * 100 : 0}%`, background: color, borderRadius: '4px' }} />
          </div>
        </div>
      ))}
    </div>
  )

  const thumb = { width: '34px', height: '34px', borderRadius: '6px', objectFit: 'cover', cursor: 'pointer', border: `1px solid ${C.border}` }
  const imgLink = { color: C.orange, fontSize: '11px', cursor: 'pointer', fontWeight: '600' }

  return (
    <div style={{ minHeight: '100vh', background: '#f8f9fa', fontFamily: 'Cairo, sans-serif', direction: isRTL ? 'rtl' : 'ltr' }}>
      <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&display=swap" rel="stylesheet" />

      {previewImage && (
        <div style={{ ...st.modal, zIndex: 200 }} onClick={() => setPreviewImage(null)}>
          <div onClick={e => e.stopPropagation()} style={{ background: C.white, borderRadius: '14px', padding: '16px', maxWidth: '90vw' }}>
            <img src={previewImage} style={{ maxWidth: '80vw', maxHeight: '80vh', borderRadius: '8px' }} alt="preview" />
            <div style={{ textAlign: 'center', marginTop: '12px' }}><button style={st.btn('#888', true)} onClick={() => setPreviewImage(null)}>{t.close}</button></div>
          </div>
        </div>
      )}

      {isMobile && sidebarOpen && <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 30 }} onClick={() => setSidebarOpen(false)} />}

      {/* Top Bar */}
      <div style={{ background: C.white, borderBottom: `3px solid ${C.orange}`, padding: isMobile ? '8px 16px' : '10px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 20, boxShadow: '0 2px 12px rgba(255,107,0,0.08)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {isMobile && <button onClick={() => setSidebarOpen(!sidebarOpen)} style={{ background: 'none', border: 'none', fontSize: '22px', cursor: 'pointer', color: C.orange }}>â˜°</button>}
          <img src="/logo-madinah.jpeg" alt="" style={{ height: isMobile ? '36px' : '50px', objectFit: 'contain' }} />
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: isMobile ? '11px' : '15px', fontWeight: '900', color: C.orange }}>
            {isMobile ? (isRTL ? 'Ø£Ø³Ø·ÙˆÙ„ Ù†Ø¸Ø§ÙØ© Ø§Ù„Ù…Ø¯ÙŠÙ†Ø©' : 'Cleaning Fleet') : (isRTL ? 'Ø£Ø³Ø·ÙˆÙ„ Ù…Ø´Ø§Ø±ÙŠØ¹ Ù†Ø¸Ø§ÙØ© Ø§Ù„Ù…Ø¯ÙŠÙ†Ø© Ø§Ù„Ù…Ù†ÙˆØ±Ø©' : 'Madinah Cleaning Fleet Management')}
          </div>
          {!isMobile && <div style={{ fontSize: '11px', color: C.muted }}>{t.yourPermission}: <span style={{ color: roleColor(currentRole), fontWeight: '700' }}>{roleLabel(currentRole)}</span></div>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Language Switch */}
          <button onClick={switchLang} style={{ background: C.orangeLight, border: `1.5px solid ${C.orange}`, borderRadius: '8px', padding: '6px 10px', fontSize: '12px', fontWeight: '700', cursor: 'pointer', color: C.orange, fontFamily: 'Cairo, sans-serif' }}>
            {lang === 'ar' ? 'ðŸ‡¬ðŸ‡§ EN' : 'ðŸ‡¸ðŸ‡¦ AR'}
          </button>
          {criticalAlerts.length > 0 && (
            <div onClick={() => setActiveTab('alerts')} style={{ position: 'relative', cursor: 'pointer' }}>
              <span style={{ fontSize: '22px' }}>ðŸ””</span>
              <span style={{ position: 'absolute', top: '-4px', right: '-4px', background: '#dc2626', color: '#fff', borderRadius: '50%', width: '18px', height: '18px', fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700' }}>{criticalAlerts.length}</span>
            </div>
          )}
          {!isMobile && <img src="/logo-mag.jpeg" alt="" style={{ height: '40px', objectFit: 'contain' }} />}
          <button onClick={handleLogout} style={{ ...st.btn('#dc2626', true), padding: isMobile ? '6px 10px' : '9px 18px', fontSize: isMobile ? '11px' : '13px' }}>{t.logout}</button>
        </div>
      </div>

      <div style={{ display: 'flex' }}>
        {/* Sidebar */}
        <div style={{ width: '220px', background: C.white, borderLeft: isRTL ? `1px solid ${C.border}` : 'none', borderRight: isRTL ? 'none' : `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', padding: '16px 0', position: isMobile ? 'fixed' : 'sticky', [isRTL ? 'right' : 'left']: isMobile ? (sidebarOpen ? 0 : (isRTL ? '-220px' : '-220px')) : 0, top: isMobile ? 0 : '63px', height: isMobile ? '100vh' : 'calc(100vh - 63px)', overflowY: 'auto', zIndex: isMobile ? 40 : 10, transition: `${isRTL ? 'right' : 'left'} 0.3s ease` }}>
          {isMobile && (
            <div style={{ padding: '16px 20px 8px', borderBottom: `1px solid ${C.border}`, marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '14px', fontWeight: '700', color: C.orange }}>{t.menu}</div>
              <button onClick={() => setSidebarOpen(false)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer' }}>âœ•</button>
            </div>
          )}
          {navItems.map(([id, icon, label]) => (
            (!['users'].includes(id) || currentRole === 'admin') && (
              <div key={id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 20px', cursor: 'pointer', fontSize: '13px', fontWeight: activeTab === id ? '700' : '400', color: activeTab === id ? C.orange : C.muted, background: activeTab === id ? C.orangeLight : 'transparent', borderRight: isRTL && activeTab === id ? `3px solid ${C.orange}` : isRTL ? '3px solid transparent' : 'none', borderLeft: !isRTL && activeTab === id ? `3px solid ${C.orange}` : !isRTL ? '3px solid transparent' : 'none', position: 'relative' }}
                onClick={() => { setActiveTab(id); if (isMobile) setSidebarOpen(false) }}>
                <span style={{ fontSize: '17px' }}>{icon}</span>
                <span>{label}</span>
                {id === 'alerts' && criticalAlerts.length > 0 && <span style={{ marginRight: isRTL ? 'auto' : 0, marginLeft: isRTL ? 0 : 'auto', background: '#dc2626', color: '#fff', borderRadius: '20px', padding: '1px 7px', fontSize: '10px', fontWeight: '700' }}>{criticalAlerts.length}</span>}
              </div>
            )
          ))}
          <div style={{ flex: 1 }} />
          <div style={{ padding: '16px 20px', borderTop: `1px solid ${C.border}` }}>
            <button onClick={handleLogout} style={{ ...st.btn('#dc2626', true), width: '100%' }}>{t.logout}</button>
          </div>
        </div>

        {/* Main */}
        <div style={{ flex: 1, padding: isMobile ? '16px' : '24px', overflowX: 'auto', [isRTL ? 'marginRight' : 'marginLeft']: isMobile ? 0 : '220px' }}>

          {/* Dashboard */}
          {activeTab === 'dashboard' && (
            <div>
              <div style={{ fontSize: isMobile ? '16px' : '19px', fontWeight: '800', marginBottom: '20px' }}>ðŸ“Š {t.dashboardTitle}</div>
              {criticalAlerts.length > 0 && (
                <div onClick={() => setActiveTab('alerts')} style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '12px', padding: '14px 18px', marginBottom: '20px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '24px' }}>ðŸš¨</span>
                  <div><div style={{ fontWeight: '700', color: '#dc2626', fontSize: '14px' }}>{t.criticalAlert.replace('{n}', criticalAlerts.length)}</div><div style={{ color: '#888', fontSize: '12px' }}>{t.clickToView}</div></div>
                  <div style={{ marginRight: isRTL ? 'auto' : 0, marginLeft: isRTL ? 0 : 'auto', color: '#dc2626', fontSize: '20px' }}>{isRTL ? 'â†' : 'â†’'}</div>
                </div>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4,1fr)', gap: '12px', marginBottom: '20px' }}>
                {[['ðŸš›',t.vehicles,vehicles.length,'#ff6b00'],['ðŸ‘¤',t.drivers,drivers.length,'#16a34a'],['ðŸ”§',t.maintenance,maintenance.length,'#d97706'],['ðŸ””',t.alerts,alerts.length,'#dc2626']].map(([icon,label,val,color]) => (
                  <div key={label} style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: '14px', padding: isMobile ? '14px' : '20px', borderTop: `4px solid ${color}` }}>
                    <div style={{ color: C.muted, fontSize: '11px', marginBottom: '6px', fontWeight: '600' }}>{icon} {label}</div>
                    <div style={{ fontSize: isMobile ? '24px' : '30px', fontWeight: '900', color }}>{val}</div>
                  </div>
                ))}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '16px' }}>
                <div style={st.card}>
                  <div style={{ fontWeight: '800', marginBottom: '14px' }}>ðŸš› {t.latestVehicles}</div>
                  {vehicles.slice(0,5).map(v => (
                    <div key={v.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: `1px solid ${C.border}` }}>
                      <div style={{ fontSize: '13px', fontWeight: '600' }}>{v.plate_number}</div>
                      <span style={st.badge(v.status)}>{statusLabel(v.status)}</span>
                    </div>
                  ))}
                </div>
                <div style={st.card}>
                  <div style={{ fontWeight: '800', marginBottom: '14px' }}>ðŸ”” {t.latestAlerts}</div>
                  {alerts.slice(0,5).map(a => (
                    <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 0', borderBottom: `1px solid ${C.border}` }}>
                      <span>{a.icon}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '12px', fontWeight: '600', color: alertColor(a.type) }}>{a.title}</div>
                        <div style={{ fontSize: '11px', color: C.muted }}>{a.detail}</div>
                      </div>
                    </div>
                  ))}
                  {alerts.length === 0 && <div style={{ color: '#16a34a', textAlign: 'center', padding: '20px', fontSize: '13px' }}>{t.noAlerts}</div>}
                </div>
              </div>
            </div>
          )}

          {/* Vehicles */}
          {activeTab === 'vehicles' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <div style={{ fontSize: isMobile ? '16px' : '19px', fontWeight: '800' }}>ðŸš› {t.vehiclesTitle} ({filteredVehicles.length})</div>
                {canEdit && <button style={{ ...st.btn(), fontSize: isMobile ? '12px' : '13px', padding: isMobile ? '7px 12px' : '9px 18px' }} onClick={() => setShowVehicleForm(true)}>{t.addVehicle}</button>}
              </div>
              <input style={{ ...st.input, marginBottom: '16px' }} placeholder={t.searchVehicles} value={vehicleSearch} onChange={e => setVehicleSearch(e.target.value)} />
              <div style={{ display: "flex", gap: "8px", marginBottom: "16px", flexWrap: "wrap" }}>
                {[["all","ðŸ—ºï¸ Ø§Ù„ÙƒÙ„"],["Ø´Ù…Ø§Ù„","â¬†ï¸ Ø´Ù…Ø§Ù„"],["Ø¬Ù†ÙˆØ¨","â¬‡ï¸ Ø¬Ù†ÙˆØ¨"],["Ø´Ø±Ù‚","âž¡ï¸ Ø´Ø±Ù‚"],["ØºØ±Ø¨","â¬…ï¸ ØºØ±Ø¨"]].map(([r, label]) => (
                  <button key={r} onClick={() => setRegionFilter(r)} style={{ padding: "7px 16px", borderRadius: "20px", border: `2px solid ${regionFilter === r ? "#ff6b00" : "#e8e8e8"}`, background: regionFilter === r ? "#ff6b00" : "#fff", color: regionFilter === r ? "#fff" : "#888", fontWeight: "700", fontSize: "12px", cursor: "pointer", fontFamily: "Cairo, sans-serif" }}>
                    {label} {r !== "all" && `(${vehicles.filter(v => getRegion(v) === r).length})`}
                  </button>
                ))}
              </div>
              <div style={{ ...st.card, padding: 0, overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '600px' }}>
                  <thead><tr>
                    <th style={st.th}>{t.image}</th><th style={st.th}>{t.plateNumber}</th><th style={st.th}>{t.code}</th>
                    {!isMobile && <><th style={st.th}>{t.brand}</th><th style={st.th}>{t.model}</th><th style={st.th}>{t.year}</th></>}
                    <th style={st.th}>{t.status}</th><th style={st.th}>{t.preparationStatus}</th>
                    <th style={st.th}>{t.istimara}</th>
                    {canEdit && <th style={st.th}>{t.edit}</th>}
                    {canDelete && <th style={st.th}>ðŸ—‘ï¸</th>}
                  </tr></thead>
                  <tbody>
                    {filteredVehicles.map(v => (
                      <tr key={v.id} onMouseEnter={e => e.currentTarget.style.background='#fff7f2'} onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                        <td style={st.td}>{v.vehicle_image ? <img src={v.vehicle_image} style={thumb} onClick={() => setPreviewImage(v.vehicle_image)} alt="" /> : 'â€”'}</td>
                        <td style={{ ...st.td, fontWeight: '700' }}>{v.plate_number}</td>
                        <td style={st.td}>{v.vehicle_code || 'â€”'}</td>
                        {!isMobile && <><td style={st.td}>{v.brand}</td><td style={st.td}>{v.model}</td><td style={st.td}>{v.year}</td></>}
                        <td style={st.td}><span style={st.badge(v.status)}>{statusLabel(v.status)}</span></td>
                        <td style={st.td}>
                          {canEdit ? (
                            <select value={v.preparation_status || 'not_ready'} onChange={e => updatePreparation(v.id, e.target.value)} style={st.prepSelect(v.preparation_status || 'not_ready')}>
                              <option value="not_ready">âŒ</option><option value="in_progress">ðŸ”„</option><option value="ready">âœ…</option>
                            </select>
                          ) : <span>{v.preparation_status === 'ready' ? 'âœ…' : v.preparation_status === 'in_progress' ? 'ðŸ”„' : 'âŒ'}</span>}
                        </td>
                        <td style={st.td}>{v.istimara_image ? <span style={imgLink} onClick={() => setPreviewImage(v.istimara_image)}>{t.view}</span> : 'â€”'}</td>
                        {canEdit && <td style={st.td}><button style={st.editBtn} onClick={() => openEdit('vehicle', v)}>âœï¸</button></td>}
                        {canDelete && <td style={st.td}><button style={st.deleteBtn} onClick={() => deleteVehicle(v.id)}>ðŸ—‘ï¸</button></td>}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredVehicles.length === 0 && <div style={{ color: C.muted, textAlign: 'center', padding: '40px' }}>{t.noResults}</div>}
              </div>
            </div>
          )}

          {/* Drivers */}
          {activeTab === 'drivers' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <div style={{ fontSize: isMobile ? '16px' : '19px', fontWeight: '800' }}>ðŸ‘¤ {t.driversTitle} ({filteredDrivers.length})</div>
                {canEdit && <button style={{ ...st.btn(), fontSize: isMobile ? '12px' : '13px', padding: isMobile ? '7px 12px' : '9px 18px' }} onClick={() => setShowDriverForm(true)}>{t.addDriver}</button>}
              </div>
              <input style={{ ...st.input, marginBottom: '16px' }} placeholder={t.searchDrivers} value={driverSearch} onChange={e => setDriverSearch(e.target.value)} />
              <div style={{ ...st.card, padding: 0, overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '500px' }}>
                  <thead><tr>
                    <th style={st.th}>{t.fullName}</th><th style={st.th}>{t.nationalId}</th>
                    {!isMobile && <><th style={st.th}>{t.passport}</th><th style={st.th}>{t.phone}</th><th style={st.th}>{t.license}</th><th style={st.th}>{t.expiry}</th></>}
                    <th style={st.th}>{t.iqama}</th><th style={st.th}>{t.license}</th>
                    <th style={st.th}>{t.status}</th>
                    {canEdit && <th style={st.th}>{t.edit}</th>}
                    {canDelete && <th style={st.th}>ðŸ—‘ï¸</th>}
                  </tr></thead>
                  <tbody>
                    {filteredDrivers.map(d => {
                      const days = daysUntil(d.license_expiry)
                      const expiring = days !== null && days <= 30
                      return (
                        <tr key={d.id} style={{ background: expiring ? '#fffbeb' : 'transparent' }} onMouseEnter={e => e.currentTarget.style.background='#fff7f2'} onMouseLeave={e => e.currentTarget.style.background = expiring ? '#fffbeb' : 'transparent'}>
                          <td style={{ ...st.td, fontWeight: '700' }}>{d.full_name}</td>
                          <td style={st.td}>{d.national_id || 'â€”'}</td>
                          {!isMobile && <><td style={st.td}>{d.passport_number || 'â€”'}</td><td style={st.td}>{d.phone || 'â€”'}</td><td style={st.td}>{d.license_number || 'â€”'}</td>
                          <td style={st.td}><span style={{ color: days !== null && days < 0 ? '#dc2626' : days !== null && days <= 14 ? '#ea580c' : days !== null && days <= 30 ? '#d97706' : C.text, fontWeight: expiring ? '700' : '400' }}>{d.license_expiry || 'â€”'}{days !== null && days < 0 && ' âš ï¸'}</span></td></>}
                          <td style={st.td}>{d.iqama_image ? <span style={imgLink} onClick={() => setPreviewImage(d.iqama_image)}>{t.view}</span> : 'â€”'}</td>
                          <td style={st.td}>{d.license_image ? <span style={imgLink} onClick={() => setPreviewImage(d.license_image)}>{t.view}</span> : 'â€”'}</td>
                          <td style={st.td}><span style={st.badge(d.status)}>{statusLabel(d.status)}</span></td>
                          {canEdit && <td style={st.td}><button style={st.editBtn} onClick={() => openEdit('driver', d)}>âœï¸</button></td>}
                          {canDelete && <td style={st.td}><button style={st.deleteBtn} onClick={() => deleteDriver(d.id)}>ðŸ—‘ï¸</button></td>}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
                {filteredDrivers.length === 0 && <div style={{ color: C.muted, textAlign: 'center', padding: '40px' }}>{t.noResults}</div>}
              </div>
            </div>
          )}

          {/* Maintenance */}
          {activeTab === 'maintenance' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <div style={{ fontSize: isMobile ? '16px' : '19px', fontWeight: '800' }}>ðŸ”§ {t.maintenanceTitle}</div>
                {canEdit && <button style={{ ...st.btn(), fontSize: isMobile ? '12px' : '13px', padding: isMobile ? '7px 12px' : '9px 18px' }} onClick={() => setShowMaintenanceForm(true)}>{t.addMaintenance}</button>}
              </div>
              <div style={{ ...st.card, padding: 0, overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '500px' }}>
                  <thead><tr>
                    <th style={st.th}>{t.vehicle}</th><th style={st.th}>{t.type}</th>
                    {!isMobile && <><th style={st.th}>{t.description}</th><th style={st.th}>{t.date}</th></>}
                    <th style={st.th}>{t.cost}</th><th style={st.th}>{t.nextDate}</th>
                    <th style={st.th}>{t.status}</th>
                    {canEdit && <th style={st.th}>{t.edit}</th>}
                    {canDelete && <th style={st.th}>ðŸ—‘ï¸</th>}
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
                          <td style={st.td}><span style={{ color: C.orange, fontWeight: '700' }}>{m.cost} {t.sar}</span></td>
                          <td style={st.td}><span style={{ color: expiring ? '#dc2626' : C.text, fontWeight: expiring ? '700' : '400' }}>{m.next_date || 'â€”'}{expiring && ' âš ï¸'}</span></td>
                          <td style={st.td}><span style={st.badge(m.status)}>{statusLabel(m.status)}</span></td>
                          {canEdit && <td style={st.td}><button style={st.editBtn} onClick={() => openEdit('maintenance', m)}>âœï¸</button></td>}
                          {canDelete && <td style={st.td}><button style={st.deleteBtn} onClick={() => deleteMaintenance(m.id)}>ðŸ—‘ï¸</button></td>}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
                {maintenance.length === 0 && <div style={{ color: C.muted, textAlign: 'center', padding: '40px' }}>{t.noMaintenance}</div>}
              </div>
            </div>
          )}

          {/* Fuel */}
          {activeTab === 'fuel' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <div style={{ fontSize: isMobile ? '16px' : '19px', fontWeight: '800' }}>â›½ {t.fuelTitle}</div>
                {canEdit && <button style={{ ...st.btn(), fontSize: isMobile ? '12px' : '13px', padding: isMobile ? '7px 12px' : '9px 18px' }} onClick={() => setShowFuelForm(true)}>{t.addFuel}</button>}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: '14px', padding: '16px', borderTop: '4px solid #ff6b00' }}>
                  <div style={{ color: C.muted, fontSize: '11px', fontWeight: '600' }}>â›½ {t.totalCost}</div>
                  <div style={{ fontSize: isMobile ? '22px' : '28px', fontWeight: '900', color: '#ff6b00' }}>{totalFuelCost.toFixed(0)} {t.sar}</div>
                </div>
                <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: '14px', padding: '16px', borderTop: '4px solid #7c3aed' }}>
                  <div style={{ color: C.muted, fontSize: '11px', fontWeight: '600' }}>ðŸ“‹ {t.totalRecords}</div>
                  <div style={{ fontSize: isMobile ? '22px' : '28px', fontWeight: '900', color: '#7c3aed' }}>{fuelLogs.length}</div>
                </div>
              </div>
              <div style={{ ...st.card, padding: 0, overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '500px' }}>
                  <thead><tr>
                    <th style={st.th}>{t.vehicle}</th><th style={st.th}>{t.driver}</th>
                    {!isMobile && <><th style={st.th}>{t.date}</th><th style={st.th}>{t.liters}</th></>}
                    <th style={st.th}>{t.total}</th>
                    {canEdit && <th style={st.th}>{t.edit}</th>}
                    {canDelete && <th style={st.th}>ðŸ—‘ï¸</th>}
                  </tr></thead>
                  <tbody>
                    {fuelLogs.map(f => (
                      <tr key={f.id} onMouseEnter={e => e.currentTarget.style.background='#fff7f2'} onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                        <td style={{ ...st.td, fontWeight: '700' }}>{f.vehicles?.plate_number}</td>
                        <td style={st.td}>{f.drivers?.full_name}</td>
                        {!isMobile && <><td style={st.td}>{f.date}</td><td style={st.td}>{f.liters}</td></>}
                        <td style={st.td}><span style={{ color: C.orange, fontWeight: '700' }}>{f.total_cost} {t.sar}</span></td>
                        {canEdit && <td style={st.td}><button style={st.editBtn} onClick={() => openEdit('fuel', f)}>âœï¸</button></td>}
                        {canDelete && <td style={st.td}><button style={st.deleteBtn} onClick={() => deleteFuel(f.id)}>ðŸ—‘ï¸</button></td>}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {fuelLogs.length === 0 && <div style={{ color: C.muted, textAlign: 'center', padding: '40px' }}>{t.noFuel}</div>}
              </div>
            </div>
          )}

          {/* Reports */}
          {activeTab === 'reports' && (
            <div>
              <div style={{ fontSize: isMobile ? '16px' : '19px', fontWeight: '800', marginBottom: '20px' }}>ðŸ“ˆ {t.reportsTitle}</div>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(3,1fr)', gap: '12px', marginBottom: '20px' }}>
                {[[`ðŸš›`,t.totalVehicles,vehicles.length,'#ff6b00'],[`âœ…`,t.activeVehicles,activeVehicles,'#16a34a'],[`ðŸŸ¢`,t.readyVehicles,readyVehicles,'#16a34a'],[`ðŸ‘¤`,t.totalDrivers,drivers.length,'#2563eb'],[`ðŸ‘`,t.activeDrivers,activeDrivers,'#16a34a'],[`ðŸ””`,t.activeAlerts,alerts.length,'#dc2626']].map(([icon,label,val,color]) => (
                  <div key={label} style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: '12px', padding: '16px', borderTop: `3px solid ${color}` }}>
                    <div style={{ color: C.muted, fontSize: '11px', marginBottom: '6px' }}>{icon} {label}</div>
                    <div style={{ fontSize: '26px', fontWeight: '900', color }}>{val}</div>
                  </div>
                ))}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div style={st.card}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <div style={{ fontWeight: '800' }}>â›½ {t.fuelReport}</div>
                    <button onClick={exportFuel} style={{ ...st.btn('#16a34a'), padding: '6px 12px', fontSize: '11px' }}>{t.export}</button>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                    <div style={{ background: '#fff7f2', borderRadius: '10px', padding: '12px', textAlign: 'center' }}>
                      <div style={{ fontSize: '20px', fontWeight: '900', color: C.orange }}>{totalFuelCost.toFixed(0)}</div>
                      <div style={{ fontSize: '11px', color: C.muted }}>{t.totalFuelCost}</div>
                    </div>
                    <div style={{ background: '#f0fdf4', borderRadius: '10px', padding: '12px', textAlign: 'center' }}>
                      <div style={{ fontSize: '20px', fontWeight: '900', color: '#16a34a' }}>{totalFuelLiters.toFixed(0)}</div>
                      <div style={{ fontSize: '11px', color: C.muted }}>{t.totalLiters}</div>
                    </div>
                  </div>
                  <div style={{ fontWeight: '700', fontSize: '12px', marginBottom: '10px', color: C.muted }}>{t.top5Fuel}</div>
                  <BarChart data={topFuelVehicles} maxVal={topFuelVehicles[0]?.[1] || 1} color={C.orange} />
                </div>
                <div style={st.card}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <div style={{ fontWeight: '800' }}>ðŸ”§ {t.maintenanceReport}</div>
                    <button onClick={exportMaintenance} style={{ ...st.btn('#16a34a'), padding: '6px 12px', fontSize: '11px' }}>{t.export}</button>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                    <div style={{ background: '#fffbeb', borderRadius: '10px', padding: '12px', textAlign: 'center' }}>
                      <div style={{ fontSize: '20px', fontWeight: '900', color: '#d97706' }}>{totalMaintenanceCost.toFixed(0)}</div>
                      <div style={{ fontSize: '11px', color: C.muted }}>{t.totalFuelCost}</div>
                    </div>
                    <div style={{ background: '#f0fdf4', borderRadius: '10px', padding: '12px', textAlign: 'center' }}>
                      <div style={{ fontSize: '20px', fontWeight: '900', color: '#16a34a' }}>{maintenance.filter(m => m.status === 'active').length}</div>
                      <div style={{ fontSize: '11px', color: C.muted }}>{t.completedMaintenance}</div>
                    </div>
                  </div>
                  <BarChart data={[[t.completedLabel,maintenance.filter(m=>m.status==='active').length],[t.pendingLabel,maintenance.filter(m=>m.status==='pending').length],[t.cancelledLabel,maintenance.filter(m=>m.status==='inactive').length]]} maxVal={maintenance.length||1} color="#d97706" />
                </div>
              </div>
              <div style={st.card}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <div style={{ fontWeight: '800' }}>ðŸš› {t.vehiclesReport}</div>
                  <button onClick={exportVehicles} style={{ ...st.btn('#16a34a'), padding: '6px 12px', fontSize: '11px' }}>{t.export}</button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(3,1fr)', gap: '12px', marginBottom: '20px' }}>
                  {[[t.ready,readyVehicles,'#16a34a'],[t.inProgress,vehicleTypes['in_progress']||0,'#d97706'],[t.notReady,vehicleTypes['not_ready']||0,'#dc2626']].map(([label,val,color]) => (
                    <div key={label} style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: '10px', padding: '14px', textAlign: 'center' }}>
                      <div style={{ fontSize: '26px', fontWeight: '900', color }}>{val}</div>
                      <div style={{ fontSize: '12px', color: C.muted }}>{label}</div>
                      <div style={{ fontSize: '11px', color, fontWeight: '700' }}>{vehicles.length > 0 ? ((val/vehicles.length)*100).toFixed(0) : 0}%</div>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ ...st.card, marginTop: '16px' }}>
                <div style={{ fontWeight: '800', marginBottom: '16px' }}>ðŸ“¥ {t.exportData}</div>
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4,1fr)', gap: '10px' }}>
                  <button onClick={exportVehicles} style={{ ...st.btn('#ff6b00'), padding: '12px' }}>ðŸš› {t.vehicles}</button>
                  <button onClick={exportDrivers} style={{ ...st.btn('#2563eb'), padding: '12px' }}>ðŸ‘¤ {t.drivers}</button>
                  <button onClick={exportMaintenance} style={{ ...st.btn('#d97706'), padding: '12px' }}>ðŸ”§ {t.maintenance}</button>
                  <button onClick={exportFuel} style={{ ...st.btn('#16a34a'), padding: '12px' }}>â›½ {t.fuel}</button>
                </div>
              </div>
            </div>
          )}

          {/* Alerts */}
          {activeTab === 'alerts' && (
            <div>
              <div style={{ fontSize: isMobile ? '16px' : '19px', fontWeight: '800', marginBottom: '20px' }}>ðŸ”” {t.alertsTitle} ({alerts.length})</div>
              {alerts.length === 0 ? (
                <div style={{ ...st.card, textAlign: 'center', padding: '60px' }}>
                  <div style={{ fontSize: '48px', marginBottom: '16px' }}>âœ…</div>
                  <div style={{ fontSize: '16px', fontWeight: '700', color: '#16a34a' }}>{t.noAlertsTitle}</div>
                  <div style={{ color: C.muted, fontSize: '13px', marginTop: '8px' }}>{t.noAlertsDesc}</div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {alerts.map(a => (
                    <div key={a.id} style={{ background: alertBg(a.type), border: `1px solid ${alertColor(a.type)}33`, borderRadius: '12px', padding: '16px', display: 'flex', alignItems: 'center', gap: '14px', [isRTL ? 'borderRight' : 'borderLeft']: `4px solid ${alertColor(a.type)}` }}>
                      <span style={{ fontSize: '28px' }}>{a.icon}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: '700', color: alertColor(a.type), fontSize: '14px' }}>{a.title}</div>
                        <div style={{ color: C.muted, fontSize: '12px', marginTop: '4px' }}>{a.detail}</div>
                      </div>
                      <div style={{ background: alertColor(a.type), color: '#fff', borderRadius: '20px', padding: '4px 12px', fontSize: '12px', fontWeight: '700' }}>{alertLabel(a.type)}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Users */}
          {activeTab === 'users' && currentRole === 'admin' && (
            <div>
              <div style={{ fontSize: isMobile ? '16px' : '19px', fontWeight: '800', marginBottom: '20px' }}>ðŸ‘¥ {t.usersTitle}</div>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3,1fr)', gap: '12px', marginBottom: '20px' }}>
                {[['admin',t.adminRole,t.adminDesc,'#7c3aed'],['editor',t.editorRole,t.editorDesc,'#ff6b00'],['viewer',t.viewerRole,t.viewerDesc,'#16a34a']].map(([role,label,desc,color]) => (
                  <div key={role} style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: '12px', padding: '16px', borderTop: `3px solid ${color}` }}>
                    <div style={{ fontWeight: '700', color, marginBottom: '4px' }}>{label}</div>
                    <div style={{ fontSize: '12px', color: C.muted }}>{desc}</div>
                    <div style={{ fontSize: '20px', fontWeight: '900', color, marginTop: '8px' }}>{userRoles.filter(u => u.role === role).length}</div>
                  </div>
                ))}
              </div>
              <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '12px', padding: '16px', marginBottom: '20px' }}>
                <div style={{ fontWeight: '700', color: '#1d4ed8', marginBottom: '8px' }}>{t.howToAdd}</div>
                <div style={{ fontSize: '13px', color: '#1e40af' }}>{t.howToAddDesc}</div>
              </div>
              <div style={{ ...st.card, padding: 0, overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead><tr>
                    <th style={st.th}>{t.user}</th>
                    <th style={st.th}>{t.currentRole}</th>
                    <th style={st.th}>{t.changeRole}</th>
                    <th style={st.th}>{t.delete}</th>
                  </tr></thead>
                  <tbody>
                    {userRoles.map(u => (
                      <tr key={u.id} onMouseEnter={e => e.currentTarget.style.background='#fff7f2'} onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                        <td style={st.td}>
                          <div style={{ fontWeight: '700' }}>{u.full_name || t.user}</div>
                          <div style={{ fontSize: '11px', color: C.muted }}>{u.user_id?.substring(0, 16)}...</div>
                        </td>
                        <td style={st.td}><span style={{ background: roleBg(u.role), color: roleColor(u.role), padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '700' }}>{roleLabel(u.role)}</span></td>
                        <td style={st.td}>
                          {u.user_id !== currentUser?.id ? (
                            <select value={u.role} onChange={e => updateUserRole(u.user_id, e.target.value)} style={{ ...st.input, width: 'auto', padding: '6px 10px', fontSize: '12px' }}>
                              <option value="admin">{t.adminRole}</option>
                              <option value="editor">{t.editorRole}</option>
                              <option value="viewer">{t.viewerRole}</option>
                            </select>
                          ) : <span style={{ color: C.muted, fontSize: '12px' }}>{t.you}</span>}
                        </td>
                        <td style={st.td}>
                          {u.user_id !== currentUser?.id ? <button onClick={() => deleteUserRole(u.user_id)} style={st.deleteBtn}>ðŸ—‘ï¸</button> : 'â€”'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {userRoles.length === 0 && <div style={{ color: C.muted, textAlign: 'center', padding: '40px' }}>{t.noUsers}</div>}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Edit Modal */}
      {editItem && (
        <div style={st.modal}>
          <div style={st.modalBox}>
            <div style={{ fontSize: '16px', fontWeight: '800', marginBottom: '20px' }}>âœï¸ {t.edit} {editType === 'vehicle' ? t.vehicles : editType === 'driver' ? t.drivers : editType === 'maintenance' ? t.maintenance : t.fuel}</div>
            {editType === 'vehicle' && (<div style={st.formGrid}>
              <div><label style={st.label}>{t.plateNumber}</label><input style={st.input} value={editForm.plate_number||''} onChange={e=>setEditForm({...editForm,plate_number:e.target.value})} /></div>
              <div><label style={st.label}>{t.vehicleCode}</label><input style={st.input} value={editForm.vehicle_code||''} onChange={e=>setEditForm({...editForm,vehicle_code:e.target.value})} /></div>
              <div><label style={st.label}>{t.type}</label><input style={st.input} value={editForm.type||''} onChange={e=>setEditForm({...editForm,type:e.target.value})} /></div>
              <div><label style={st.label}>{t.brand}</label><input style={st.input} value={editForm.brand||''} onChange={e=>setEditForm({...editForm,brand:e.target.value})} /></div>
              <div><label style={st.label}>{t.model}</label><input style={st.input} value={editForm.model||''} onChange={e=>setEditForm({...editForm,model:e.target.value})} /></div>
              <div><label style={st.label}>{t.year}</label><input style={st.input} value={editForm.year||''} onChange={e=>setEditForm({...editForm,year:e.target.value})} /></div>
              <div><label style={st.label}>{t.color}</label><input style={st.input} value={editForm.color||''} onChange={e=>setEditForm({...editForm,color:e.target.value})} /></div>
              <div><label style={st.label}>{t.fuelType}</label><input style={st.input} value={editForm.fuel_type||''} onChange={e=>setEditForm({...editForm,fuel_type:e.target.value})} /></div>
              <div><label style={st.label}>{t.status}</label><select style={st.input} value={editForm.status||''} onChange={e=>setEditForm({...editForm,status:e.target.value})}><option value="active">{t.active}</option><option value="inactive">{t.inactive}</option><option value="pending">{t.pending}</option></select></div>
              <div><label style={st.label}>{t.preparationStatus}</label><select style={st.input} value={editForm.preparation_status||''} onChange={e=>setEditForm({...editForm,preparation_status:e.target.value})}><option value="not_ready">{t.notReady}</option><option value="in_progress">{t.inProgress}</option><option value="ready">{t.ready}</option></select></div>
              <FileInput label={t.vehicleImage} icon="ðŸš›" onChange={setEditVehicleImage} file={editVehicleImage} />
              <FileInput label={t.istamaraImage} icon="ðŸ“„" onChange={setEditIstamaraImage} file={editIstamaraImage} />
            </div>)}
            {editType === 'driver' && (<div style={st.formGrid}>
              <div><label style={st.label}>{t.fullName}</label><input style={st.input} value={editForm.full_name||''} onChange={e=>setEditForm({...editForm,full_name:e.target.value})} /></div>
              <div><label style={st.label}>{t.nationalId}</label><input style={st.input} value={editForm.national_id||''} onChange={e=>setEditForm({...editForm,national_id:e.target.value})} /></div>
              <div><label style={st.label}>{t.passportNumber}</label><input style={st.input} value={editForm.passport_number||''} onChange={e=>setEditForm({...editForm,passport_number:e.target.value})} /></div>
              <div><label style={st.label}>{t.phone}</label><input style={st.input} value={editForm.phone||''} onChange={e=>setEditForm({...editForm,phone:e.target.value})} /></div>
              <div><label style={st.label}>{t.licenseNumber}</label><input style={st.input} value={editForm.license_number||''} onChange={e=>setEditForm({...editForm,license_number:e.target.value})} /></div>
              <div><label style={st.label}>{t.licenseExpiry}</label><input type="date" style={st.input} value={editForm.license_expiry||''} onChange={e=>setEditForm({...editForm,license_expiry:e.target.value})} /></div>
              <div><label style={st.label}>{t.status}</label><select style={st.input} value={editForm.status||''} onChange={e=>setEditForm({...editForm,status:e.target.value})}><option value="active">{t.active}</option><option value="inactive">{t.inactive}</option></select></div>
              <FileInput label={t.iqamaImage} icon="ðŸªª" onChange={setEditIqamaImage} file={editIqamaImage} />
              <FileInput label={t.licenseImage} icon="ðŸš—" onChange={setEditLicenseImage} file={editLicenseImage} />
            </div>)}
            {editType === 'maintenance' && (<div style={st.formGrid}>
              <div><label style={st.label}>{t.vehicle}</label><select style={st.input} value={editForm.vehicle_id||''} onChange={e=>setEditForm({...editForm,vehicle_id:e.target.value})}>{vehicles.map(v=><option key={v.id} value={v.id}>{v.plate_number}</option>)}</select></div>
              <div><label style={st.label}>{t.type}</label><input style={st.input} value={editForm.type||''} onChange={e=>setEditForm({...editForm,type:e.target.value})} /></div>
              <div><label style={st.label}>{t.description}</label><input style={st.input} value={editForm.description||''} onChange={e=>setEditForm({...editForm,description:e.target.value})} /></div>
              <div><label style={st.label}>{t.cost}</label><input style={st.input} value={editForm.cost||''} onChange={e=>setEditForm({...editForm,cost:e.target.value})} /></div>
              <div><label style={st.label}>{t.date}</label><input type="date" style={st.input} value={editForm.date||''} onChange={e=>setEditForm({...editForm,date:e.target.value})} /></div>
              <div><label style={st.label}>{t.nextDate}</label><input type="date" style={st.input} value={editForm.next_date||''} onChange={e=>setEditForm({...editForm,next_date:e.target.value})} /></div>
              <div><label style={st.label}>{t.status}</label><select style={st.input} value={editForm.status||''} onChange={e=>setEditForm({...editForm,status:e.target.value})}><option value="pending">{t.pending}</option><option value="active">{t.completed}</option><option value="inactive">{t.cancelled}</option></select></div>
            </div>)}
            {editType === 'fuel' && (<div style={st.formGrid}>
              <div><label style={st.label}>{t.vehicle}</label><select style={st.input} value={editForm.vehicle_id||''} onChange={e=>setEditForm({...editForm,vehicle_id:e.target.value})}>{vehicles.map(v=><option key={v.id} value={v.id}>{v.plate_number}</option>)}</select></div>
              <div><label style={st.label}>{t.driver}</label><select style={st.input} value={editForm.driver_id||''} onChange={e=>setEditForm({...editForm,driver_id:e.target.value})}>{drivers.map(d=><option key={d.id} value={d.id}>{d.full_name}</option>)}</select></div>
              <div><label style={st.label}>{t.date}</label><input type="date" style={st.input} value={editForm.date||''} onChange={e=>setEditForm({...editForm,date:e.target.value})} /></div>
              <div><label style={st.label}>{t.liters}</label><input type="number" style={st.input} value={editForm.liters||''} onChange={e=>setEditForm({...editForm,liters:e.target.value})} /></div>
              <div><label style={st.label}>{t.pricePerLiter}</label><input type="number" style={st.input} value={editForm.cost_per_liter||''} onChange={e=>setEditForm({...editForm,cost_per_liter:e.target.value})} /></div>
              <div><label style={st.label}>{t.odometer}</label><input type="number" style={st.input} value={editForm.odometer||''} onChange={e=>setEditForm({...editForm,odometer:e.target.value})} /></div>
            </div>)}
            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button style={st.btn()} onClick={saveEdit} disabled={uploading}>{uploading ? t.saving : `ðŸ’¾ ${t.save}`}</button>
              <button style={st.btn('#888', true)} onClick={() => setEditItem(null)}>{t.cancel}</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Vehicle Modal */}
      {showVehicleForm && (<div style={st.modal}><div style={st.modalBox}>
        <div style={{ fontSize: '16px', fontWeight: '800', marginBottom: '16px' }}>ðŸš› {t.addVehicleTitle}</div>
        <div style={st.formGrid}>
          {[[`plate_number`,t.plateNumber],[`vehicle_code`,t.vehicleCode],[`type`,t.type],[`brand`,t.brand],[`model`,t.model],[`year`,t.year],[`color`,t.color],[`fuel_type`,t.fuelType]].map(([key,label]) => (
            <div key={key}><label style={st.label}>{label}</label><input style={st.input} value={vehicleForm[key]} onChange={e => setVehicleForm({...vehicleForm,[key]:e.target.value})} /></div>
          ))}
          <div><label style={st.label}>{t.status}</label><select style={st.input} value={vehicleForm.status} onChange={e => setVehicleForm({...vehicleForm,status:e.target.value})}><option value="active">{t.active}</option><option value="inactive">{t.inactive}</option><option value="pending">{t.pending}</option></select></div>
          <div><label style={st.label}>{t.preparationStatus}</label><select style={st.input} value={vehicleForm.preparation_status} onChange={e => setVehicleForm({...vehicleForm,preparation_status:e.target.value})}><option value="not_ready">{t.notReady}</option><option value="in_progress">{t.inProgress}</option><option value="ready">{t.ready}</option></select></div>
          <FileInput label={t.vehicleImage} icon="ðŸš›" onChange={setVehicleImage} file={vehicleImage} />
          <FileInput label={t.istamaraImage} icon="ðŸ“„" onChange={setIstamaraImage} file={istamaraImage} />
        </div>
        <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
          <button style={st.btn()} onClick={addVehicle} disabled={uploading}>{uploading ? t.uploading : t.save}</button>
          <button style={st.btn('#888', true)} onClick={() => setShowVehicleForm(false)}>{t.cancel}</button>
        </div>
      </div></div>)}

      {/* Add Driver Modal */}
      {showDriverForm && (<div style={st.modal}><div style={st.modalBox}>
        <div style={{ fontSize: '16px', fontWeight: '800', marginBottom: '16px' }}>ðŸ‘¤ {t.addDriverTitle}</div>
        <div style={st.formGrid}>
          {[[`full_name`,t.fullName],[`national_id`,t.nationalId],[`passport_number`,t.passportNumber],[`phone`,t.phone],[`license_number`,t.licenseNumber]].map(([key,label]) => (
            <div key={key}><label style={st.label}>{label}</label><input style={st.input} value={driverForm[key]} onChange={e => setDriverForm({...driverForm,[key]:e.target.value})} /></div>
          ))}
          <div><label style={st.label}>{t.licenseExpiry}</label><input type="date" style={st.input} value={driverForm.license_expiry} onChange={e => setDriverForm({...driverForm,license_expiry:e.target.value})} /></div>
          <div><label style={st.label}>{t.status}</label><select style={st.input} value={driverForm.status} onChange={e => setDriverForm({...driverForm,status:e.target.value})}><option value="active">{t.active}</option><option value="inactive">{t.inactive}</option></select></div>
          <FileInput label={t.iqamaImage} icon="ðŸªª" onChange={setIqamaImage} file={iqamaImage} />
          <FileInput label={t.licenseImage} icon="ðŸš—" onChange={setLicenseImage} file={licenseImage} />
        </div>
        <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
          <button style={st.btn()} onClick={addDriver} disabled={uploading}>{uploading ? t.uploading : t.save}</button>
          <button style={st.btn('#888', true)} onClick={() => setShowDriverForm(false)}>{t.cancel}</button>
        </div>
      </div></div>)}

      {/* Add Maintenance Modal */}
      {showMaintenanceForm && (<div style={st.modal}><div style={st.modalBox}>
        <div style={{ fontSize: '16px', fontWeight: '800', marginBottom: '16px' }}>ðŸ”§ {t.addMaintenanceTitle}</div>
        <div style={st.formGrid}>
          <div><label style={st.label}>{t.vehicle}</label><select style={st.input} value={maintenanceForm.vehicle_id} onChange={e => setMaintenanceForm({...maintenanceForm,vehicle_id:e.target.value})}><option value="">{t.selectVehicle}</option>{vehicles.map(v=><option key={v.id} value={v.id}>{v.plate_number}</option>)}</select></div>
          <div><label style={st.label}>{t.type}</label><input style={st.input} value={maintenanceForm.type} onChange={e => setMaintenanceForm({...maintenanceForm,type:e.target.value})} /></div>
          <div><label style={st.label}>{t.description}</label><input style={st.input} value={maintenanceForm.description} onChange={e => setMaintenanceForm({...maintenanceForm,description:e.target.value})} /></div>
          <div><label style={st.label}>{t.cost}</label><input style={st.input} value={maintenanceForm.cost} onChange={e => setMaintenanceForm({...maintenanceForm,cost:e.target.value})} /></div>
          <div><label style={st.label}>{t.date}</label><input type="date" style={st.input} value={maintenanceForm.date} onChange={e => setMaintenanceForm({...maintenanceForm,date:e.target.value})} /></div>
          <div><label style={st.label}>{t.nextDate}</label><input type="date" style={st.input} value={maintenanceForm.next_date} onChange={e => setMaintenanceForm({...maintenanceForm,next_date:e.target.value})} /></div>
          <div><label style={st.label}>{t.status}</label><select style={st.input} value={maintenanceForm.status} onChange={e => setMaintenanceForm({...maintenanceForm,status:e.target.value})}><option value="pending">{t.pending}</option><option value="active">{t.completed}</option><option value="inactive">{t.cancelled}</option></select></div>
        </div>
        <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
          <button style={st.btn()} onClick={addMaintenance}>{t.save}</button>
          <button style={st.btn('#888', true)} onClick={() => setShowMaintenanceForm(false)}>{t.cancel}</button>
        </div>
      </div></div>)}

      {/* Add Fuel Modal */}
      {showFuelForm && (<div style={st.modal}><div style={st.modalBox}>
        <div style={{ fontSize: '16px', fontWeight: '800', marginBottom: '16px' }}>â›½ {t.addFuelTitle}</div>
        <div style={st.formGrid}>
          <div><label style={st.label}>{t.vehicle}</label><select style={st.input} value={fuelForm.vehicle_id} onChange={e => setFuelForm({...fuelForm,vehicle_id:e.target.value})}><option value="">{t.selectVehicle}</option>{vehicles.map(v=><option key={v.id} value={v.id}>{v.plate_number}</option>)}</select></div>
          <div><label style={st.label}>{t.driver}</label><select style={st.input} value={fuelForm.driver_id} onChange={e => setFuelForm({...fuelForm,driver_id:e.target.value})}><option value="">{t.selectDriver}</option>{drivers.map(d=><option key={d.id} value={d.id}>{d.full_name}</option>)}</select></div>
          <div><label style={st.label}>{t.date}</label><input type="date" style={st.input} value={fuelForm.date} onChange={e => setFuelForm({...fuelForm,date:e.target.value})} /></div>
          <div><label style={st.label}>{t.liters}</label><input type="number" style={st.input} value={fuelForm.liters} onChange={e => setFuelForm({...fuelForm,liters:e.target.value})} /></div>
          <div><label style={st.label}>{t.pricePerLiter}</label><input type="number" style={st.input} value={fuelForm.cost_per_liter} onChange={e => setFuelForm({...fuelForm,cost_per_liter:e.target.value})} /></div>
          <div><label style={st.label}>{t.odometer}</label><input type="number" style={st.input} value={fuelForm.odometer} onChange={e => setFuelForm({...fuelForm,odometer:e.target.value})} /></div>
        </div>
        <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
          <button style={st.btn()} onClick={addFuel}>{t.save}</button>
          <button style={st.btn('#888', true)} onClick={() => setShowFuelForm(false)}>{t.cancel}</button>
        </div>
      </div></div>)}

      {/* Mobile bottom nav */}
      {isMobile && (
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: C.white, borderTop: `2px solid ${C.border}`, display: 'flex', justifyContent: 'space-around', padding: '6px 0', zIndex: 15 }}>
          {navItems.filter(([id]) => id !== 'users' || currentRole === 'admin').map(([id, icon, label]) => (
            <div key={id} onClick={() => setActiveTab(id)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1px', cursor: 'pointer', color: activeTab === id ? C.orange : C.muted, fontSize: '9px', fontWeight: activeTab === id ? '700' : '400', minWidth: '36px', position: 'relative' }}>
              <span style={{ fontSize: '16px' }}>{icon}</span>
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

