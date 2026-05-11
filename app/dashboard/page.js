'use client'
import { useState, useEffect, useRef } from 'react'
import { supabase } from '../supabase'
import { translations } from './translations'
import PrepReport from './PrepReport'
import AttachmentMenu, { ATTACHMENT_TYPES } from './AttachmentMenu'
import ColumnFilter from './ColumnFilter'
import KeyboardShortcuts from './KeyboardShortcuts'
import OnboardingTour from './OnboardingTour'
import GlobalSearch from './GlobalSearch'
import InteractiveDashboard from './InteractiveDashboard'
import AuditLogView from './AuditLogView'
import LoginHistoryView from './LoginHistoryView'
import { setAuditUser, logAction, logLogin, diffChanges } from './auditLog'
import TiltCard from './TiltCard'
import AnimatedBackground from './AnimatedBackground'
import PermissionsManager from './PermissionsManager'
import { ROLE_TEMPLATES } from './permissions'

// ── مكوّن الأرقام المتحركة (خارج الـ component الرئيسي لتجنب مشاكل React hooks)
function CountUp({ target, duration = 1000 }) {
  const [count, setCount] = useState(0)
  useEffect(() => {
    if (!target) { setCount(0); return }
    let raf
    const startTime = performance.now()
    const tick = (now) => {
      const progress = Math.min((now - startTime) / duration, 1)
      const ease = 1 - Math.pow(1 - progress, 3)
      setCount(Math.floor(ease * target))
      if (progress < 1) raf = requestAnimationFrame(tick)
      else setCount(target)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, duration])
  return <span>{count.toLocaleString('ar-SA')}</span>
}

// ── مكوّن Skeleton
function Skeleton({ w = '100%', h = '18px', r = '8px' }) {
  return <div className="skeleton" style={{ width: w, height: h, borderRadius: r }} />
}

export default function Dashboard() {
  const [lang, setLang] = useState('ar')
  const t = translations[lang]
  const isRTL = lang === 'ar'
  const langLabel = lang === 'ar' ? 'EN' : lang === 'en' ? 'বাং' : 'ع'

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
  // Vehicle filters
  const [vehicleStatusFilter, setVehicleStatusFilter] = useState('all')
  const [vehiclePrepFilter, setVehiclePrepFilter] = useState('all')
  const [vehicleBrandFilter, setVehicleBrandFilter] = useState('all')
  const [vehicleAttachFilter, setVehicleAttachFilter] = useState('all')
  // Driver filters
  const [driverStatusFilter, setDriverStatusFilter] = useState('all')
  const [driverLicenseFilter, setDriverLicenseFilter] = useState('all')
  // Maintenance filters
  const [maintenanceSearch, setMaintenanceSearch] = useState('')
  const [maintenanceStatusFilter, setMaintenanceStatusFilter] = useState('all')
  const [maintenanceVehicleFilter, setMaintenanceVehicleFilter] = useState('all')
  const [maintenanceDateFrom, setMaintenanceDateFrom] = useState('')
  const [maintenanceDateTo, setMaintenanceDateTo] = useState('')
  // Fuel filters
  const [fuelSearch, setFuelSearch] = useState('')
  const [fuelVehicleFilter, setFuelVehicleFilter] = useState('all')
  const [fuelDriverFilter, setFuelDriverFilter] = useState('all')
  const [fuelDateFrom, setFuelDateFrom] = useState('')
  const [fuelDateTo, setFuelDateTo] = useState('')
  // Per-column filters
  const [vehicleColFilters, setVehicleColFilters] = useState({ plate: '', code: '', brand: '', model: '', equipmentType: '', chassisNumber: '' })
  const [driverColFilters, setDriverColFilters] = useState({ name: '', nationalId: '', passport: '', phone: '', license: '' })
  const [maintenanceColFilters, setMaintenanceColFilters] = useState({ type: '', description: '', cost: '' })
  const [fuelColFilters, setFuelColFilters] = useState({ liters: '', cost: '' })
  const setVCF = (k, v) => setVehicleColFilters(p => ({ ...p, [k]: v }))
  const setDCF = (k, v) => setDriverColFilters(p => ({ ...p, [k]: v }))
  const setMCF = (k, v) => setMaintenanceColFilters(p => ({ ...p, [k]: v }))
  const setFCF = (k, v) => setFuelColFilters(p => ({ ...p, [k]: v }))
  const matches = (val, q) => !q || (val || '').toString().toLowerCase().includes(q.toLowerCase())

  const [showVehicleForm, setShowVehicleForm] = useState(false)
  const [vehicleForm, setVehicleForm] = useState({ plate_number: '', vehicle_code: '', type: '', brand: '', model: '', year: '', chassis_number: '', color: '', status: 'active', fuel_type: '', preparation_status: 'not_ready' })
  const [vehicleImage, setVehicleImage] = useState(null)
  const [istamaraImage, setIstamaraImage] = useState(null)

  const [showDriverForm, setShowDriverForm] = useState(false)
  const [driverForm, setDriverForm] = useState({ file_number: '', full_name: '', national_id: '', passport_number: '', phone: '', license_number: '', license_expiry: '', status: 'active' })
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
  const [showBulkUpload, setShowBulkUpload] = useState(false)
  const [bulkAttachmentType, setBulkAttachmentType] = useState('istimara_image')
  const [bulkMenuOpen, setBulkMenuOpen] = useState(false)
  const [bulkFiles, setBulkFiles] = useState([])
  const [bulkResults, setBulkResults] = useState([])
  const [bulkUploading, setBulkUploading] = useState(false)
  const [toasts, setToasts] = useState([])
  const [dataLoading, setDataLoading] = useState(true)
  const [statsKey, setStatsKey] = useState(0)
  const [theme, setTheme] = useState('dark')
  const [searchOpen, setSearchOpen] = useState(false)
  const [showAddUser, setShowAddUser] = useState(false)
  const [newUser, setNewUser] = useState({ email: '', password: '', role: 'viewer', full_name: '', permissions: null })
  const [addingUser, setAddingUser] = useState(false)
  const [addUserResult, setAddUserResult] = useState(null)
  const [showAdvancedPerms, setShowAdvancedPerms] = useState(false)
  const [editPermsFor, setEditPermsFor] = useState(null)

  const generatePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%'
    let p = ''
    for (let i = 0; i < 12; i++) p += chars[Math.floor(Math.random() * chars.length)]
    return p
  }

  const handleAddUser = async () => {
    if (!newUser.email || !newUser.password) return
    setAddingUser(true)
    setAddUserResult(null)
    try {
      // Save current admin session
      const { data: { session: adminSession } } = await supabase.auth.getSession()

      // Sign up the new user
      const { data, error } = await supabase.auth.signUp({
        email: newUser.email.trim(),
        password: newUser.password,
        options: { data: { full_name: newUser.full_name } }
      })
      if (error) throw error

      // Insert role + permissions
      const newUserId = data?.user?.id
      if (newUserId) {
        await supabase.from('user_roles').insert({
          user_id: newUserId,
          role: newUser.role,
          full_name: newUser.full_name || null,
          is_active: true,
          permissions: newUser.permissions || {},
        })
      }

      // Restore admin session if it was switched
      if (adminSession) {
        await supabase.auth.setSession({
          access_token: adminSession.access_token,
          refresh_token: adminSession.refresh_token,
        })
      }

      logAction(supabase, { action: 'create', entity_type: 'user', entity_id: newUserId, entity_label: newUser.email })
      setAddUserResult({ success: true, email: newUser.email, password: newUser.password, role: newUser.role })
      showToast('✅ تم إضافة المستخدم بنجاح')
      fetchData()
    } catch (e) {
      setAddUserResult({ success: false, error: e.message || 'حدث خطأ' })
      showToast('❌ ' + (e.message || 'فشل الإضافة'), 'error')
    } finally {
      setAddingUser(false)
    }
  }

  const closeAddUser = () => {
    setShowAddUser(false)
    setNewUser({ email: '', password: '', role: 'viewer', full_name: '', permissions: null })
    setAddUserResult(null)
    setShowAdvancedPerms(false)
  }

  const saveUserPermissions = async (userId, payload) => {
    try {
      await supabase.from('user_roles').update({ role: payload.role, permissions: payload.permissions }).eq('user_id', userId)
      logAction(supabase, { action: 'update', entity_type: 'user', entity_id: userId, entity_label: 'permissions update', changes: { role: { from: null, to: payload.role } } })
      showToast('✅ تم حفظ الصلاحيات')
      setEditPermsFor(null)
      fetchData()
    } catch (e) {
      showToast('❌ ' + (e.message || 'فشل الحفظ'), 'error')
    }
  }

  useEffect(() => {
    const savedLang = localStorage.getItem('lang') || 'ar'
    setLang(savedLang)
    const savedTheme = localStorage.getItem('theme') || 'dark'
    setTheme(savedTheme)
    document.documentElement.setAttribute('data-theme', savedTheme)
    checkAuth(); fetchData()
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark'
    setTheme(newTheme)
    document.documentElement.setAttribute('data-theme', newTheme)
    localStorage.setItem('theme', newTheme)
  }

  const switchLang = () => {
    const newLang = lang === 'ar' ? 'en' : lang === 'en' ? 'bn' : 'ar'
    setLang(newLang)
    localStorage.setItem('lang', newLang)
  }

  const checkAuth = async () => {
    const { data } = await supabase.auth.getSession()
    if (!data.session) { window.location.href = '/'; return }
    setCurrentUser(data.session.user)
    const { data: roleData } = await supabase.from('user_roles').select('*').eq('user_id', data.session.user.id).single()
    const role = roleData?.role || 'viewer'
    setCurrentRole(role)
    setAuditUser(data.session.user, role)
    // Log this login (once per session)
    if (!sessionStorage.getItem('loginLogged')) {
      sessionStorage.setItem('loginLogged', '1')
      logLogin(supabase, data.session.user, true)
      logAction(supabase, { action: 'login', entity_type: 'user', entity_id: data.session.user.id, entity_label: data.session.user.email })
    }
  }

  const fetchData = async () => {
    setDataLoading(true)
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
    setDataLoading(false)
    setStatsKey(k => k + 1)
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
          alerts.push({ id: `lic-${d.id}`, type: days < 0 ? 'expired' : days <= 14 ? 'critical' : days <= 30 ? 'warning' : 'info', icon: '🪪', title: `${t.licenseAlert}: ${d.full_name}`, detail, days })
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
          alerts.push({ id: `maint-${m.id}`, type: days < 0 ? 'expired' : days <= 7 ? 'critical' : 'warning', icon: '🔧', title: `${t.maintenanceAlert}: ${m.vehicles?.plate_number || ''}`, detail, days })
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

  const exportVehicles = () => exportToCSV(vehicles.map(v => ({ [t.plateNumber]: v.plate_number || '', [t.vehicleCode]: v.vehicle_code || '', [t.type]: v.type || '', [t.brand]: v.brand || '', [t.model]: v.model || '', [t.year]: v.year || '', [t.chassisNumber]: v.chassis_number || '', [t.color]: v.color || '', [t.fuelType]: v.fuel_type || '', [t.status]: v.status === 'active' ? t.active : t.inactive })), t.vehicles)
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

  const bulkUploadAttachments = async () => {
    if (!bulkFiles.length) return
    const conf = ATTACHMENT_TYPES.find(a => a.key === bulkAttachmentType)
    if (!conf) return
    setBulkUploading(true)
    const results = []
    for (const file of bulkFiles) {
      // استخرج الأرقام من اسم الملف فقط
      const numMatch = file.name.replace(/\.[^.]+$/, '').match(/\d+/)
      const fileNum = numMatch ? numMatch[0] : null
      if (!fileNum) { results.push({ file: file.name, status: 'error', msg: 'لا يوجد رقم في الاسم' }); continue }
      // ابحث عن مركبة رقم لوحتها يحتوي على هذا الرقم
      const matched = vehicles.find(v => (v.plate_number || '').replace(/\s/g, '').includes(fileNum))
      if (!matched) { results.push({ file: file.name, status: 'notfound', msg: `لم يتم العثور على مركبة: ${fileNum}` }); continue }
      const ext = file.name.split('.').pop()
      const fileName = `${conf.folder}/${matched.id}_${Date.now()}.${ext}`
      const { error } = await supabase.storage.from('fleet-files').upload(fileName, file)
      if (error) { results.push({ file: file.name, status: 'error', msg: 'فشل الرفع' }); continue }
      const { data } = supabase.storage.from('fleet-files').getPublicUrl(fileName)
      await supabase.from('vehicles').update({ [bulkAttachmentType]: data.publicUrl }).eq('id', matched.id)
      results.push({ file: file.name, status: 'success', msg: `✅ ${matched.plate_number}` })
    }
    setBulkResults(results)
    setBulkUploading(false)
    fetchData()
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
    const changes = diffChanges(editItem, updateData)
    logAction(supabase, { action: 'update', entity_type: editType, entity_id: editItem.id, entity_label: editItem.plate_number || editItem.full_name || editItem.type || '', changes })
    setEditItem(null); setEditType(null); setUploading(false); fetchData()
    showToast('✅ تم الحفظ بنجاح')
  }

  const addVehicle = async () => {
    setUploading(true)
    const vehicle_image = await uploadFile(vehicleImage, 'vehicles')
    const istimara_image = await uploadFile(istamaraImage, 'istimara')
    const { data: inserted } = await supabase.from('vehicles').insert([{ ...vehicleForm, vehicle_image, istimara_image }]).select().single()
    logAction(supabase, { action: 'create', entity_type: 'vehicle', entity_id: inserted?.id, entity_label: vehicleForm.plate_number })
    setShowVehicleForm(false)
    setVehicleForm({ plate_number: '', vehicle_code: '', type: '', brand: '', model: '', year: '', chassis_number: '', color: '', status: 'active', fuel_type: '', preparation_status: 'not_ready' })
    setVehicleImage(null); setIstamaraImage(null); setUploading(false); fetchData()
    showToast('✅ تم إضافة المركبة بنجاح')
  }

  const addDriver = async () => {
    setUploading(true)
    const iqama_image = await uploadFile(iqamaImage, 'iqama')
    const license_image = await uploadFile(licenseImage, 'licenses')
    const { data: inserted } = await supabase.from('drivers').insert([{ ...driverForm, iqama_image, license_image }]).select().single()
    logAction(supabase, { action: 'create', entity_type: 'driver', entity_id: inserted?.id, entity_label: driverForm.full_name })
    setShowDriverForm(false)
    setDriverForm({ file_number: '', full_name: '', national_id: '', passport_number: '', phone: '', license_number: '', license_expiry: '', status: 'active' })
    setIqamaImage(null); setLicenseImage(null); setUploading(false); fetchData()
    showToast('✅ تم إضافة السائق بنجاح')
  }

  const addMaintenance = async () => {
    const { data: inserted } = await supabase.from('maintenance').insert([maintenanceForm]).select().single()
    logAction(supabase, { action: 'create', entity_type: 'maintenance', entity_id: inserted?.id, entity_label: maintenanceForm.type })
    setShowMaintenanceForm(false)
    setMaintenanceForm({ vehicle_id: '', type: '', description: '', date: '', cost: '', next_date: '', status: 'pending' })
    fetchData()
    showToast('✅ تم إضافة سجل الصيانة')
  }

  const addFuel = async () => {
    const total_cost = fuelForm.liters * fuelForm.cost_per_liter
    const { data: inserted } = await supabase.from('fuel_logs').insert([{ ...fuelForm, total_cost }]).select().single()
    logAction(supabase, { action: 'create', entity_type: 'fuel', entity_id: inserted?.id, entity_label: `${total_cost} ر.س` })
    setShowFuelForm(false)
    setFuelForm({ vehicle_id: '', driver_id: '', date: '', liters: '', cost_per_liter: '', odometer: '' })
    fetchData()
    showToast('✅ تم إضافة سجل الوقود')
  }

  const updatePreparation = async (id, val) => {
    await supabase.from('vehicles').update({ preparation_status: val }).eq('id', id); fetchData()
  }

  const updateUserRole = async (userId, newRole) => {
    await supabase.from('user_roles').update({ role: newRole }).eq('user_id', userId); fetchData()
  }

  const deleteUserRole = async (userId) => {
    if (!confirm(lang === 'ar' ? 'هل أنت متأكد؟' : lang === 'bn' ? 'আপনি কি নিশ্চিত?' : 'Are you sure?')) return
    await supabase.from('user_roles').delete().eq('user_id', userId); fetchData()
  }

  const canEdit = currentRole === 'admin' || currentRole === 'editor'
  const canDelete = currentRole === 'admin'

  const deleteVehicle = async (id) => { if (!canDelete) return; const v = vehicles.find(x => x.id === id); await supabase.from('vehicles').delete().eq('id', id); logAction(supabase, { action: 'delete', entity_type: 'vehicle', entity_id: id, entity_label: v?.plate_number }); fetchData(); showToast('🗑️ تم حذف المركبة', 'warning') }
  const deleteDriver = async (id) => { if (!canDelete) return; const d = drivers.find(x => x.id === id); await supabase.from('drivers').delete().eq('id', id); logAction(supabase, { action: 'delete', entity_type: 'driver', entity_id: id, entity_label: d?.full_name }); fetchData(); showToast('🗑️ تم حذف السائق', 'warning') }
  const deleteMaintenance = async (id) => { if (!canDelete) return; const m = maintenance.find(x => x.id === id); await supabase.from('maintenance').delete().eq('id', id); logAction(supabase, { action: 'delete', entity_type: 'maintenance', entity_id: id, entity_label: m?.type }); fetchData(); showToast('🗑️ تم حذف سجل الصيانة', 'warning') }
  const deleteFuel = async (id) => { if (!canDelete) return; const f = fuelLogs.find(x => x.id === id); await supabase.from('fuel_logs').delete().eq('id', id); logAction(supabase, { action: 'delete', entity_type: 'fuel', entity_id: id, entity_label: f?.vehicles?.plate_number }); fetchData(); showToast('🗑️ تم حذف سجل الوقود', 'warning') }
  const handleLogout = async () => { await supabase.auth.signOut(); window.location.href = '/' }

  const showToast = (msg, type = 'success') => {
    const id = Date.now()
    setToasts(prev => [...prev, { id, msg, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3200)
  }

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

  const getRegion = (v) => { const code = v.vehicle_code || v.plate_number || ''; const firstChar = code.trim().toUpperCase()[0]; const map = { 'N': 'north', 'S': 'south', 'E': 'east', 'W': 'west' }; return map[firstChar] || 'unknown' }
  const ATTACHMENT_KEYS = ['istimara_image', 'operation_card_image', 'periodic_inspection_image', 'barrier_seal_image', 'vehicle_image', 'handover_receipt_image']
  const countAttachments = (v) => ATTACHMENT_KEYS.reduce((n, k) => n + (v[k] ? 1 : 0), 0)
  const vehicleBrands = Array.from(new Set(vehicles.map(v => v.brand).filter(Boolean))).sort()

  const filteredVehicles = vehicles.filter(v => {
    if (regionFilter !== 'all' && getRegion(v) !== regionFilter) return false
    if (vehicleStatusFilter !== 'all' && (v.status || '') !== vehicleStatusFilter) return false
    if (vehiclePrepFilter !== 'all' && (v.preparation_status || 'not_ready') !== vehiclePrepFilter) return false
    if (vehicleBrandFilter !== 'all' && v.brand !== vehicleBrandFilter) return false
    if (vehicleAttachFilter !== 'all') {
      const cnt = countAttachments(v)
      if (vehicleAttachFilter === 'complete' && cnt !== ATTACHMENT_KEYS.length) return false
      else if (vehicleAttachFilter === 'partial' && (cnt === 0 || cnt === ATTACHMENT_KEYS.length)) return false
      else if (vehicleAttachFilter === 'empty' && cnt !== 0) return false
      else if (vehicleAttachFilter.startsWith('has:')) {
        const k = vehicleAttachFilter.slice(4)
        if (!v[k]) return false
      } else if (vehicleAttachFilter.startsWith('missing:')) {
        const k = vehicleAttachFilter.slice(8)
        if (v[k]) return false
      }
    }
    if (vehicleSearch) {
      const q = vehicleSearch.toLowerCase()
      const hay = [v.plate_number, v.vehicle_code, v.brand, v.model, v.type, v.color, v.year, v.chassis_number].filter(Boolean).join(' ').toLowerCase()
      if (!hay.includes(q)) return false
    }
    // Per-column filters
    if (!matches(v.plate_number, vehicleColFilters.plate)) return false
    if (!matches(v.vehicle_code, vehicleColFilters.code)) return false
    if (!matches(v.brand, vehicleColFilters.brand)) return false
    if (!matches(v.model, vehicleColFilters.model)) return false
    if (!matches(v.year, vehicleColFilters.equipmentType)) return false
    if (!matches(v.chassis_number, vehicleColFilters.chassisNumber)) return false
    return true
  })

  const filteredDrivers = drivers.filter(d => {
    if (driverStatusFilter !== 'all' && (d.status || '') !== driverStatusFilter) return false
    if (driverLicenseFilter !== 'all') {
      const days = daysUntil(d.license_expiry)
      if (driverLicenseFilter === 'valid' && (days === null || days <= 30)) return false
      if (driverLicenseFilter === 'expiring' && (days === null || days < 0 || days > 30)) return false
      if (driverLicenseFilter === 'expired' && (days === null || days >= 0)) return false
    }
    if (driverSearch) {
      const q = driverSearch.toLowerCase()
      const hay = [d.full_name, d.national_id, d.passport_number, d.phone, d.license_number, d.file_number].filter(Boolean).join(' ').toLowerCase()
      if (!hay.includes(q)) return false
    }
    if (!matches(d.full_name, driverColFilters.name)) return false
    if (!matches(d.national_id, driverColFilters.nationalId)) return false
    if (!matches(d.passport_number, driverColFilters.passport)) return false
    if (!matches(d.phone, driverColFilters.phone)) return false
    if (!matches(d.license_number, driverColFilters.license)) return false
    return true
  })

  const filteredMaintenance = maintenance.filter(m => {
    if (maintenanceStatusFilter !== 'all' && (m.status || '') !== maintenanceStatusFilter) return false
    if (maintenanceVehicleFilter !== 'all' && m.vehicle_id !== maintenanceVehicleFilter) return false
    if (maintenanceDateFrom && (!m.date || m.date < maintenanceDateFrom)) return false
    if (maintenanceDateTo && (!m.date || m.date > maintenanceDateTo)) return false
    if (maintenanceSearch) {
      const q = maintenanceSearch.toLowerCase()
      const hay = [m.type, m.description, m.vehicles?.plate_number].filter(Boolean).join(' ').toLowerCase()
      if (!hay.includes(q)) return false
    }
    if (!matches(m.type, maintenanceColFilters.type)) return false
    if (!matches(m.description, maintenanceColFilters.description)) return false
    if (maintenanceColFilters.cost && !(m.cost || '').toString().includes(maintenanceColFilters.cost)) return false
    return true
  })

  const filteredFuel = fuelLogs.filter(f => {
    if (fuelVehicleFilter !== 'all' && f.vehicle_id !== fuelVehicleFilter) return false
    if (fuelDriverFilter !== 'all' && f.driver_id !== fuelDriverFilter) return false
    if (fuelDateFrom && (!f.date || f.date < fuelDateFrom)) return false
    if (fuelDateTo && (!f.date || f.date > fuelDateTo)) return false
    if (fuelSearch) {
      const q = fuelSearch.toLowerCase()
      const hay = [f.vehicles?.plate_number, f.drivers?.full_name].filter(Boolean).join(' ').toLowerCase()
      if (!hay.includes(q)) return false
    }
    if (fuelColFilters.liters && !(f.liters || '').toString().includes(fuelColFilters.liters)) return false
    if (fuelColFilters.cost && !(f.total_cost || '').toString().includes(fuelColFilters.cost)) return false
    return true
  })

  const vehicleTypes = vehicles.reduce((acc, v) => { const key = v.preparation_status || 'not_ready'; acc[key] = (acc[key] || 0) + 1; return acc }, {})
  const fuelByVehicle = fuelLogs.reduce((acc, f) => { const key = f.vehicles?.plate_number || '?'; acc[key] = (acc[key] || 0) + (Number(f.total_cost) || 0); return acc }, {})
  const topFuelVehicles = Object.entries(fuelByVehicle).sort((a, b) => b[1] - a[1]).slice(0, 5)

  const C = { orange: 'var(--accent)', orangeLight: 'var(--accent-soft)', white: 'var(--surface)', gray: 'var(--bg)', text: 'var(--text)', muted: 'var(--text-muted)', border: 'var(--border)', navy: 'var(--sidebar-bg)', navyDark: 'var(--sidebar-bg)', navyLight: 'var(--surface-2)' }
  const navItems = [['dashboard','dashboard',t.dashboard],['vehicles','vehicles',t.vehicles],['drivers','drivers',t.drivers],['maintenance','maintenance',t.maintenance],['fuel','fuel',t.fuel],['reports','reports',t.reports],['alerts','alerts',t.alerts],['users','users',t.users],['audit','audit','سجل النشاط'],['logins','logins','سجل الدخول']]
  const NavIcon = ({ name }) => {
    const p = { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' }
    if (name === 'dashboard') return <svg {...p}><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/></svg>
    if (name === 'vehicles') return <svg {...p}><path d="M16 16H8m13 0h2v-3.15a1 1 0 00-.84-.99L17 11l-2.7-3.6a1 1 0 00-.8-.4H5.24a2 2 0 00-1.8 1.1l-.8 1.63A6 6 0 002 12.42V16h2"/><circle cx="6.5" cy="16.5" r="2.5"/><circle cx="16.5" cy="16.5" r="2.5"/></svg>
    if (name === 'drivers') return <svg {...p}><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
    if (name === 'maintenance') return <svg {...p}><path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/></svg>
    if (name === 'fuel') return <svg {...p}><line x1="3" y1="22" x2="15" y2="22"/><line x1="4" y1="9" x2="14" y2="9"/><path d="M14 22V4a2 2 0 00-2-2H6a2 2 0 00-2 2v18"/><path d="M14 13h2a2 2 0 012 2v2a2 2 0 002 2v-7l-3-3"/></svg>
    if (name === 'reports') return <svg {...p}><path d="M3 3v18h18"/><polyline points="18,9 13,14 11,12 7,16"/></svg>
    if (name === 'alerts') return <svg {...p}><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>
    if (name === 'users') return <svg {...p}><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>
    if (name === 'audit') return <svg {...p}><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
    if (name === 'logins') return <svg {...p}><path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>
    return null
  }

  const st = {
    input: { width: '100%', padding: '10px 14px', background: '#fafafa', border: `1.5px solid ${C.border}`, borderRadius: '8px', color: C.text, fontSize: '13px', fontFamily: 'Cairo, sans-serif', outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.2s, box-shadow 0.2s' },
    label: { color: '#444', fontSize: '12px', fontWeight: '700', display: 'block', marginBottom: '6px', letterSpacing: '0.2px' },
    btn: (c, outline) => ({ background: outline ? C.white : (c || C.orange), color: outline ? (c || C.orange) : C.white, border: `2px solid ${c || C.orange}`, borderRadius: '9px', padding: '9px 18px', fontSize: '13px', fontWeight: '700', fontFamily: 'Cairo, sans-serif', cursor: 'pointer', transition: 'all 0.2s' }),
    badge: (s) => ({ background: statusBg(s), color: statusColor(s), padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '700', display: 'inline-block' }),
    modal: { position: 'fixed', inset: 0, background: 'rgba(10,10,20,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '16px', backdropFilter: 'blur(4px)' },
    modalBox: { background: C.white, borderRadius: '20px', padding: isMobile ? '20px' : '36px', width: '100%', maxWidth: '580px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 24px 80px rgba(0,0,0,0.2)', border: `1px solid ${C.border}` },
    formGrid: { display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '16px' },
    card: { background: C.white, border: `1px solid ${C.border}`, borderRadius: '16px', padding: isMobile ? '16px' : '24px', boxShadow: '0 4px 16px rgba(0,0,0,0.05)', transition: 'box-shadow 0.2s' },
    th: { padding: '12px 14px', textAlign: isRTL ? 'right' : 'left', color: '#666', fontSize: '11px', fontWeight: '700', borderBottom: `2px solid ${C.border}`, background: '#fafbfc', whiteSpace: 'nowrap', letterSpacing: '0.3px' },
    td: { padding: '11px 14px', color: C.text, fontSize: '12px', borderBottom: `1px solid #f0f0f0`, whiteSpace: 'nowrap' },
    editBtn: { background: '#fff7f2', border: '1px solid #ffccaa', color: C.orange, borderRadius: '7px', padding: '5px 10px', fontSize: '11px', cursor: 'pointer', fontFamily: 'Cairo, sans-serif', fontWeight: '700', transition: 'all 0.15s' },
    deleteBtn: { background: '#fff5f5', border: '1px solid #ffcccc', color: '#dc2626', cursor: 'pointer', fontSize: '12px', borderRadius: '7px', padding: '5px 8px', fontFamily: 'Cairo, sans-serif', fontWeight: '700', transition: 'all 0.15s' },
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
    <div style={{ minHeight: '100vh', background: 'var(--bg)', fontFamily: 'Cairo, sans-serif', direction: isRTL ? 'rtl' : 'ltr', position: 'relative' }}>
      <AnimatedBackground variant="mesh" intensity={0.7} fixed={true} />
      <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&display=swap" rel="stylesheet" />
      <style>{`
        @keyframes toastSlideIn { from{opacity:0;transform:translateX(80px)} to{opacity:1;transform:translateX(0)} }
        @keyframes slideUp      { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        @keyframes fadeIn       { from{opacity:0} to{opacity:1} }
        @keyframes spin         { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes statPop      { 0%{transform:scale(0.85);opacity:0} 60%{transform:scale(1.04)} 100%{transform:scale(1);opacity:1} }
        @keyframes shimmer      { 0%{background-position:-600px 0} 100%{background-position:600px 0} }
        .skeleton { background:linear-gradient(90deg,#f0f0f0 25%,#e8e8e8 50%,#f0f0f0 75%); background-size:600px 100%; animation:shimmer 1.4s infinite linear; border-radius:8px; }
        .nav-item  { transition: all 0.2s !important; }
        .nav-item:hover { background: rgba(255,107,0,0.08) !important; color: #ff6b00 !important; }
        .dash-card { transition: box-shadow 0.2s, transform 0.2s; }
        .dash-card:hover { box-shadow: 0 8px 32px rgba(0,0,0,0.1) !important; transform: translateY(-2px); }
        .action-btn:hover { opacity: 0.85; transform: translateY(-1px); }
        .action-btn { transition: all 0.15s; }
        tr.data-row:hover td { background: #fff7f2 !important; }
        ::-webkit-scrollbar { width:5px; height:5px; }
        ::-webkit-scrollbar-thumb { background:#e0e0e0; border-radius:3px; }
        ::-webkit-scrollbar-thumb:hover { background:#ff6b00; }
      `}</style>

      {/* Toast Notifications */}
      <div style={{ position:'fixed', top:'80px', [isRTL?'left':'right']:'20px', zIndex:999, display:'flex', flexDirection:'column', gap:'10px', maxWidth:'320px' }}>
        {toasts.map(toast => (
          <div key={toast.id} style={{
            background: toast.type === 'error' ? '#fff5f5' : toast.type === 'warning' ? '#fffbeb' : '#f0fdf4',
            border: `1px solid ${toast.type === 'error' ? '#fca5a5' : toast.type === 'warning' ? '#fcd34d' : '#86efac'}`,
            color: toast.type === 'error' ? '#dc2626' : toast.type === 'warning' ? '#d97706' : '#16a34a',
            borderRadius:'12px', padding:'14px 18px', fontSize:'13px', fontWeight:'700',
            boxShadow:'0 8px 24px rgba(0,0,0,0.12)',
            animation:'toastSlideIn 0.35s cubic-bezier(.16,1,.3,1)',
            display:'flex', alignItems:'center', gap:'10px',
            borderRight: `4px solid ${toast.type === 'error' ? '#dc2626' : toast.type === 'warning' ? '#d97706' : '#16a34a'}`,
          }}>
            {toast.msg}
          </div>
        ))}
      </div>

      {previewImage && (
        <div style={{ ...st.modal, zIndex: 200 }} onClick={() => setPreviewImage(null)}>
          <div onClick={e => e.stopPropagation()} style={{ background: C.white, borderRadius: '14px', padding: '16px', maxWidth: '90vw', width: (previewImage || '').toLowerCase().includes('.pdf') ? '90vw' : 'auto' }}>
            {(previewImage || '').toLowerCase().includes('.pdf') ? (
              <iframe src={previewImage} style={{ width: '85vw', height: '80vh', border: 'none', borderRadius: '8px' }} title="pdf preview" />
            ) : (
              <img src={previewImage} style={{ maxWidth: '80vw', maxHeight: '80vh', borderRadius: '8px' }} alt="preview" />
            )}
            <div style={{ textAlign: 'center', marginTop: '12px', display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <a href={previewImage} target="_blank" rel="noopener noreferrer" style={{ ...st.btn('#2563eb', true), textDecoration: 'none', display: 'inline-block' }}>↗️ فتح في تبويب جديد</a>
              <button style={st.btn('#16a34a', true)} onClick={async () => {
                try {
                  const r = await fetch(previewImage); const b = await r.blob(); const u = URL.createObjectURL(b);
                  const a = document.createElement('a'); a.href = u; a.download = (previewImage.split('/').pop().split('?')[0]) || 'file';
                  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 2000)
                } catch (e) { window.open(previewImage, '_blank') }
              }}>⬇️ تحميل</button>
              <button style={st.btn('#888', true)} onClick={() => setPreviewImage(null)}>{t.close}</button>
            </div>
          </div>
        </div>
      )}

      {isMobile && sidebarOpen && <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 30 }} onClick={() => setSidebarOpen(false)} />}

      {/* Top Bar */}
      <div style={{ background: `linear-gradient(135deg, ${C.navy} 0%, ${C.navyDark} 100%)`, borderBottom: `3px solid ${C.orange}`, padding: isMobile ? '8px 16px' : '10px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 20, boxShadow: '0 4px 20px rgba(0,0,0,0.25)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {isMobile && <button onClick={() => setSidebarOpen(!sidebarOpen)} style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', padding: '6px 9px', fontSize: '18px', cursor: 'pointer', color: '#fff' }}>☰</button>}
          <img src="/logo-madinah.jpeg" alt="" style={{ height: isMobile ? '36px' : '50px', objectFit: 'contain', filter: 'brightness(1.1)' }} />
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: isMobile ? '11px' : '15px', fontWeight: '900', color: '#fff', letterSpacing: '0.3px' }}>
            {isMobile ? (isRTL ? 'أسطول نظافة المدينة' : 'Cleaning Fleet') : (isRTL ? 'أسطول مشاريع نظافة المدينة المنورة' : 'Madinah Cleaning Fleet Management')}
          </div>
          {!isMobile && <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginTop: '2px' }}>{t.yourPermission}: <span style={{ color: C.orange, fontWeight: '700' }}>{roleLabel(currentRole)}</span></div>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button onClick={() => setSearchOpen(true)} title="بحث عام (Ctrl+K)" aria-label="search" style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', padding: '6px 12px', cursor: 'pointer', color: 'rgba(255,255,255,0.7)', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', fontFamily: 'Cairo, sans-serif', minWidth: isMobile ? 'auto' : '140px', transition: 'all 0.2s' }} onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.12)'; e.currentTarget.style.color = '#fff' }} onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = 'rgba(255,255,255,0.7)' }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            {!isMobile && <><span style={{ flex: 1, textAlign: 'right' }}>بحث...</span><kbd style={{ background: 'rgba(255,255,255,0.12)', borderRadius: '3px', padding: '1px 6px', fontSize: '10px', fontFamily: 'monospace' }}>⌘K</kbd></>}
          </button>
          <button onClick={toggleTheme} title={theme === 'dark' ? 'فاتح' : 'داكن'} aria-label="toggle theme" style={{ background: 'rgba(255,107,0,0.15)', border: `1px solid rgba(255,107,0,0.3)`, borderRadius: '8px', padding: '6px 10px', cursor: 'pointer', color: C.orange, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }} onMouseEnter={e=>e.currentTarget.style.background='rgba(255,107,0,0.25)'} onMouseLeave={e=>e.currentTarget.style.background='rgba(255,107,0,0.15)'}>
            {theme === 'dark' ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
            )}
          </button>
          <button onClick={switchLang} style={{ background: 'rgba(255,107,0,0.15)', border: `1px solid rgba(255,107,0,0.3)`, borderRadius: '8px', padding: '6px 10px', fontSize: '12px', fontWeight: '700', cursor: 'pointer', color: C.orange, fontFamily: 'Cairo, sans-serif', transition: 'all 0.2s' }} onMouseEnter={e=>e.currentTarget.style.background='rgba(255,107,0,0.25)'} onMouseLeave={e=>e.currentTarget.style.background='rgba(255,107,0,0.15)'}>
            {lang === 'ar' ? '🇬🇧 EN' : lang === 'en' ? '🇧🇩 বাং' : '🇸🇦 ع'}
          </button>
          {criticalAlerts.length > 0 && (
            <div onClick={() => setActiveTab('alerts')} style={{ position: 'relative', cursor: 'pointer', background: 'rgba(220,38,38,0.15)', border: '1px solid rgba(220,38,38,0.3)', borderRadius: '8px', padding: '6px 10px' }}>
              <span style={{ fontSize: '18px' }}>🔔</span>
              <span style={{ position: 'absolute', top: '-6px', [isRTL?'left':'right']: '-6px', background: '#dc2626', color: '#fff', borderRadius: '50%', width: '18px', height: '18px', fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700' }}>{criticalAlerts.length}</span>
            </div>
          )}
          {!isMobile && <img src="/logo-mag.jpeg" alt="" style={{ height: '40px', objectFit: 'contain', filter: 'brightness(1.1)' }} />}
          <button className="action-btn" onClick={handleLogout} style={{ background: 'rgba(220,38,38,0.15)', border: '1px solid rgba(220,38,38,0.3)', borderRadius: '9px', padding: isMobile ? '6px 10px' : '8px 16px', fontSize: isMobile ? '11px' : '13px', fontWeight: '700', cursor: 'pointer', color: '#ff6b6b', fontFamily: 'Cairo, sans-serif' }}>{t.logout}</button>
        </div>
      </div>

      <div style={{ display: 'flex' }}>
        {/* Sidebar */}
        <div style={{ width: '230px', background: `linear-gradient(180deg, ${C.navy} 0%, ${C.navyDark} 100%)`, display: 'flex', flexDirection: 'column', padding: '12px 0', position: isMobile ? 'fixed' : 'sticky', [isRTL ? 'right' : 'left']: isMobile ? (sidebarOpen ? 0 : '-230px') : 0, top: isMobile ? 0 : '67px', height: isMobile ? '100vh' : 'calc(100vh - 67px)', overflowY: 'auto', zIndex: isMobile ? 40 : 10, transition: `${isRTL ? 'right' : 'left'} 0.3s cubic-bezier(.16,1,.3,1)`, boxShadow: isMobile ? '4px 0 20px rgba(0,0,0,0.3)' : 'none' }}>
          {isMobile && (
            <div style={{ padding: '16px 20px 12px', borderBottom: '1px solid rgba(255,255,255,0.1)', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '14px', fontWeight: '800', color: C.orange }}>{t.menu}</div>
              <button onClick={() => setSidebarOpen(false)} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '6px', width: '28px', height: '28px', fontSize: '14px', cursor: 'pointer', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
            </div>
          )}
          <div style={{ padding: '8px 12px', marginBottom: '8px' }}>
            {navItems.map(([id, icon, label]) => (
              (!['users','audit','logins'].includes(id) || currentRole === 'admin') && (
                <div key={id} className="nav-item" style={{ display: 'flex', alignItems: 'center', gap: '11px', padding: '11px 14px', cursor: 'pointer', fontSize: '13px', fontWeight: activeTab === id ? '700' : '500', color: activeTab === id ? '#fff' : 'rgba(255,255,255,0.55)', background: activeTab === id ? `rgba(255,107,0,0.2)` : 'transparent', borderRadius: '10px', marginBottom: '3px', borderRight: isRTL && activeTab === id ? `3px solid ${C.orange}` : isRTL ? '3px solid transparent' : 'none', borderLeft: !isRTL && activeTab === id ? `3px solid ${C.orange}` : !isRTL ? '3px solid transparent' : 'none', position: 'relative', transition: 'all 0.2s' }}
                  onClick={() => { setActiveTab(id); if (id === 'dashboard') setStatsKey(k=>k+1); if (isMobile) setSidebarOpen(false) }}>
                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '20px' }}><NavIcon name={icon} /></span>
                  <span>{label}</span>
                  {id === 'alerts' && criticalAlerts.length > 0 && <span style={{ marginRight: isRTL ? 'auto' : 0, marginLeft: isRTL ? 0 : 'auto', background: '#dc2626', color: '#fff', borderRadius: '20px', padding: '2px 8px', fontSize: '10px', fontWeight: '700' }}>{criticalAlerts.length}</span>}
                </div>
              )
            ))}
          </div>
          <div style={{ flex: 1 }} />
          <div style={{ padding: '12px 12px 16px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', marginBottom: '10px', textAlign: 'center', letterSpacing: '0.5px' }}>
              MAG © 2026 — نظام مرخّص
            </div>
            <button className="action-btn" onClick={handleLogout} style={{ background: 'rgba(220,38,38,0.15)', border: '1px solid rgba(220,38,38,0.3)', borderRadius: '10px', padding: '10px', fontSize: '13px', fontWeight: '700', cursor: 'pointer', color: '#ff8888', fontFamily: 'Cairo, sans-serif', width: '100%', transition: 'all 0.2s' }}>{t.logout} 🚪</button>
          </div>
        </div>

        {/* Main */}
        <div style={{ flex: 1, padding: isMobile ? '16px' : '28px', overflowX: 'auto', [isRTL ? 'marginRight' : 'marginLeft']: isMobile ? 0 : '230px', minWidth: 0 }}>

          {/* Dashboard */}
          {activeTab === 'dashboard' && (
            <div>
              <div style={{ marginBottom: '20px', animation: 'fadeIn 0.4s ease' }}>
                <div style={{ fontSize: isMobile ? '17px' : '22px', fontWeight: '900', color: 'var(--text)' }}>{t.dashboardTitle}</div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>آخر تحديث: {new Date().toLocaleDateString('ar-SA', { weekday:'long', year:'numeric', month:'long', day:'numeric' })}</div>
              </div>
              {criticalAlerts.length > 0 && (
                <div onClick={() => setActiveTab('alerts')} style={{ background: 'var(--danger-soft)', border: '1px solid rgba(220,38,38,0.3)', borderRadius: '12px', padding: '14px 18px', marginBottom: '20px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '24px' }}>🚨</span>
                  <div><div style={{ fontWeight: '700', color: '#dc2626', fontSize: '14px' }}>{t.criticalAlert.replace('{n}', criticalAlerts.length)}</div><div style={{ color: 'var(--text-muted)', fontSize: '12px' }}>{t.clickToView}</div></div>
                  <div style={{ marginRight: isRTL ? 'auto' : 0, marginLeft: isRTL ? 0 : 'auto', color: '#dc2626', fontSize: '20px' }}>{isRTL ? '←' : '→'}</div>
                </div>
              )}
              {/* New Interactive Dashboard with charts */}
              <InteractiveDashboard
                vehicles={vehicles}
                drivers={drivers}
                maintenance={maintenance}
                fuelLogs={fuelLogs}
                alerts={alerts}
                t={t}
                isMobile={isMobile}
              />
              <div style={{ display: 'none' }}>{/* hide old stats section below */}
              {/* بطاقات الإحصائيات المتحركة */}
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4,1fr)', gap: '14px', marginBottom: '24px' }}>
                {[
                  { icon:'🚛', label: t.vehicles,    val: vehicles.length,    color:'#ff6b00', bg:'linear-gradient(135deg,#fff7f2,#fff)', sub: `${activeVehicles} نشط • ${readyVehicles} جاهز` },
                  { icon:'👤', label: t.drivers,     val: drivers.length,     color:'#16a34a', bg:'linear-gradient(135deg,#f0fdf4,#fff)', sub: `${activeDrivers} سائق نشط` },
                  { icon:'🔧', label: t.maintenance, val: maintenance.length, color:'#d97706', bg:'linear-gradient(135deg,#fffbeb,#fff)', sub: `إجمالي ${totalMaintenanceCost.toLocaleString('ar-SA')} ر.س` },
                  { icon:'🔔', label: t.alerts,      val: alerts.length,      color:'#dc2626', bg:'linear-gradient(135deg,#fff5f5,#fff)', sub: `${criticalAlerts.length} حرجة` },
                ].map(({ icon, label, val, color, bg, sub }, i) => (
                  <div key={label} className="dash-card" style={{ background: bg, border: `1px solid ${color}22`, borderRadius: '18px', padding: isMobile ? '16px' : '22px', borderTop: `4px solid ${color}`, boxShadow: `0 4px 20px ${color}15`, animation: `statPop 0.5s cubic-bezier(.16,1,.3,1) ${i*0.08}s both` }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                      <span style={{ fontSize: '11px', fontWeight: '700', color: '#666', letterSpacing: '0.3px' }}>{label}</span>
                      <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>{icon}</div>
                    </div>
                    <div style={{ fontSize: isMobile ? '28px' : '36px', fontWeight: '900', color, lineHeight: 1 }}>
                      {dataLoading ? <div className="skeleton" style={{ height: '36px', width: '60px', borderRadius: '8px' }} /> : <CountUp key={statsKey} target={val} />}
                    </div>
                    {!isMobile && <div style={{ fontSize: '11px', color: '#999', marginTop: '6px', fontWeight: '500' }}>{sub}</div>}
                  </div>
                ))}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '16px' }}>
                <div style={{ ...st.card, animation: 'slideUp 0.5s ease 0.3s both' }}>
                  <div style={{ fontWeight: '800', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
                    <span style={{ width: '28px', height: '28px', background: '#fff7f2', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🚛</span>
                    {t.latestVehicles}
                  </div>
                  {dataLoading ? Array.from({length:4}).map((_,i)=><div key={i} className="skeleton" style={{ height:'32px', marginBottom:'8px' }} />) : vehicles.slice(0,5).map(v => (
                    <div key={v.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderBottom: `1px solid #f5f5f5` }}>
                      <div style={{ fontSize: '13px', fontWeight: '700' }}>{v.plate_number}</div>
                      <span style={st.badge(v.status)}>{statusLabel(v.status)}</span>
                    </div>
                  ))}
                </div>
                <div style={{ ...st.card, animation: 'slideUp 0.5s ease 0.4s both' }}>
                  <div style={{ fontWeight: '800', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
                    <span style={{ width: '28px', height: '28px', background: '#fff5f5', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🔔</span>
                    {t.latestAlerts}
                  </div>
                  {dataLoading ? Array.from({length:4}).map((_,i)=><div key={i} className="skeleton" style={{ height:'36px', marginBottom:'8px' }} />) : alerts.slice(0,5).map(a => (
                    <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 0', borderBottom: `1px solid #f5f5f5` }}>
                      <div style={{ width: '30px', height: '30px', borderRadius: '8px', background: alertBg(a.type), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '15px', flexShrink: 0 }}>{a.icon}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '12px', fontWeight: '600', color: alertColor(a.type), overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.title}</div>
                        <div style={{ fontSize: '11px', color: C.muted }}>{a.detail}</div>
                      </div>
                    </div>
                  ))}
                  {alerts.length === 0 && <div style={{ color: '#16a34a', textAlign: 'center', padding: '20px', fontSize: '13px', fontWeight: '600' }}>✅ {t.noAlerts}</div>}
                </div>
              </div>
              </div>
            </div>
          )}

          {/* Vehicles */}
          {activeTab === 'vehicles' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <div style={{ fontSize: isMobile ? '16px' : '19px', fontWeight: '800' }}>🚛 {t.vehiclesTitle} ({filteredVehicles.length})</div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {canEdit && (
                    <div style={{ position: 'relative', display: 'inline-block' }}>
                      <button
                        style={{ ...st.btn('#16a34a'), fontSize: isMobile ? '12px' : '13px', padding: isMobile ? '7px 12px' : '9px 18px' }}
                        onClick={() => setBulkMenuOpen(o => !o)}
                      >
                        📂 رفع المرفقات ▾
                      </button>
                      {bulkMenuOpen && (
                        <>
                          <div onClick={() => setBulkMenuOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 60 }} />
                          <div style={{ position: 'absolute', top: '100%', [isRTL ? 'right' : 'left']: 0, marginTop: '4px', background: '#fff', border: `1px solid ${C.border}`, borderRadius: '10px', boxShadow: '0 8px 24px rgba(0,0,0,0.15)', minWidth: '220px', zIndex: 70, padding: '6px', fontFamily: 'Cairo, sans-serif' }}>
                            {ATTACHMENT_TYPES.map(at => (
                              <div
                                key={at.key}
                                onClick={() => { setBulkAttachmentType(at.key); setShowBulkUpload(true); setBulkFiles([]); setBulkResults([]); setBulkMenuOpen(false) }}
                                style={{ padding: '9px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '600', color: C.text, display: 'flex', alignItems: 'center', gap: '8px' }}
                                onMouseEnter={e => e.currentTarget.style.background = '#fff7f2'}
                                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                              >
                                📎 {t[at.labelKey]}
                              </div>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  )}
                  {canEdit && <button style={{ ...st.btn(), fontSize: isMobile ? '12px' : '13px', padding: isMobile ? '7px 12px' : '9px 18px' }} onClick={() => setShowVehicleForm(true)}>{t.addVehicle}</button>}
                </div>
              </div>
              <input style={{ ...st.input, marginBottom: '16px' }} placeholder={t.searchVehicles} value={vehicleSearch} onChange={e => setVehicleSearch(e.target.value)} />
              <div style={{ display: "flex", gap: "8px", marginBottom: "12px", flexWrap: "wrap" }}>
                {[["all","🗺️ الكل"],["north","⬆️ شمال"],["south","⬇️ جنوب"],["east","➡️ شرق"],["west","⬅️ غرب"]].map(([r, label]) => (
                  <button key={r} onClick={() => setRegionFilter(r)} style={{ padding: "7px 16px", borderRadius: "20px", border: `2px solid ${regionFilter === r ? "#ff6b00" : "#e8e8e8"}`, background: regionFilter === r ? "#ff6b00" : "#fff", color: regionFilter === r ? "#fff" : "#888", fontWeight: "700", fontSize: "12px", cursor: "pointer", fontFamily: "Cairo, sans-serif" }}>
                    {label} {r !== "all" && `(${vehicles.filter(v => getRegion(v) === r).length})`}
                  </button>
                ))}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)', gap: '8px', marginBottom: '16px' }}>
                <select style={{ ...st.input, padding: '8px 10px', fontSize: '12px' }} value={vehiclePrepFilter} onChange={e => setVehiclePrepFilter(e.target.value)}>
                  <option value="all">🔧 حالة التجهيز: الكل</option>
                  <option value="ready">✅ جاهزة</option>
                  <option value="in_progress">🔄 قيد التجهيز</option>
                  <option value="not_ready">❌ غير جاهزة</option>
                </select>
                <select style={{ ...st.input, padding: '8px 10px', fontSize: '12px' }} value={vehicleStatusFilter} onChange={e => setVehicleStatusFilter(e.target.value)}>
                  <option value="all">📌 الحالة: الكل</option>
                  <option value="active">{t.active}</option>
                  <option value="pending">{t.pending}</option>
                  <option value="inactive">{t.inactive}</option>
                </select>
                <select style={{ ...st.input, padding: '8px 10px', fontSize: '12px' }} value={vehicleBrandFilter} onChange={e => setVehicleBrandFilter(e.target.value)}>
                  <option value="all">🏭 الماركة: الكل</option>
                  {vehicleBrands.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
                <select style={{ ...st.input, padding: '8px 10px', fontSize: '12px' }} value={vehicleAttachFilter} onChange={e => setVehicleAttachFilter(e.target.value)}>
                  <option value="all">📎 المرفقات: الكل</option>
                  <option value="complete">✅ مكتملة</option>
                  <option value="partial">⚠️ ناقصة</option>
                  <option value="empty">❌ فارغة</option>
                  {ATTACHMENT_TYPES.map(at => (
                    <optgroup key={at.key} label={`📎 ${t[at.labelKey]}`}>
                      <option value={`has:${at.key}`}>✅ {t[at.labelKey]} — موجودة</option>
                      <option value={`missing:${at.key}`}>❌ {t[at.labelKey]} — مفقودة</option>
                    </optgroup>
                  ))}
                </select>
              </div>
              <div style={{ ...st.card, padding: 0, overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '600px' }}>
                  <thead><tr>
                    <th style={{ ...st.th, width: '40px' }}>#</th>
                    <th style={st.th}>{t.plateNumber}<ColumnFilter type="text" value={vehicleColFilters.plate} onChange={v => setVCF('plate', v)} label={t.plateNumber} isRTL={isRTL} /></th>
                    <th style={st.th}>{t.code}<ColumnFilter type="text" value={vehicleColFilters.code} onChange={v => setVCF('code', v)} label={t.code} isRTL={isRTL} /></th>
                    {!isMobile && <>
                      <th style={st.th}>{t.brand}<ColumnFilter type="select" value={vehicleBrandFilter} onChange={setVehicleBrandFilter} options={[['all','الكل'], ...vehicleBrands.map(b=>[b,b])]} label={t.brand} isRTL={isRTL} /></th>
                      <th style={st.th}>{t.model}<ColumnFilter type="text" value={vehicleColFilters.model} onChange={v => setVCF('model', v)} label={t.model} isRTL={isRTL} /></th>
                      <th style={st.th}>{t.equipmentType}<ColumnFilter type="text" value={vehicleColFilters.equipmentType} onChange={v => setVCF('equipmentType', v)} label={t.equipmentType} isRTL={isRTL} /></th>
                      <th style={st.th}>{t.chassisNumber}<ColumnFilter type="text" value={vehicleColFilters.chassisNumber || ''} onChange={v => setVCF('chassisNumber', v)} label={t.chassisNumber} isRTL={isRTL} /></th>
                    </>}
                    <th style={st.th}>{t.status}<ColumnFilter type="select" value={vehicleStatusFilter} onChange={setVehicleStatusFilter} options={[['all','الكل'],['active',t.active],['pending',t.pending],['inactive',t.inactive]]} label={t.status} isRTL={isRTL} /></th>
                    <th style={st.th}>{t.preparationStatus}<ColumnFilter type="select" value={vehiclePrepFilter} onChange={setVehiclePrepFilter} options={[['all','الكل'],['ready','✅ جاهزة'],['in_progress','🔄 قيد التجهيز'],['not_ready','❌ غير جاهزة']]} label={t.preparationStatus} isRTL={isRTL} /></th>
                    <th style={st.th}>{t.attachments}<ColumnFilter type="select" value={vehicleAttachFilter} onChange={setVehicleAttachFilter} options={[
                      ['all','الكل'],
                      ['complete','✅ مكتملة'],
                      ['partial','⚠️ ناقصة'],
                      ['empty','❌ فارغة'],
                      ...ATTACHMENT_TYPES.flatMap(at => [
                        [`has:${at.key}`, `✅ ${t[at.labelKey]} موجودة`],
                        [`missing:${at.key}`, `❌ ${t[at.labelKey]} مفقودة`],
                      ])
                    ]} label={t.attachments} isRTL={isRTL} /></th>
                    {canEdit && <th style={st.th}>{t.edit}</th>}
                    {canDelete && <th style={st.th}>🗑️</th>}
                  </tr></thead>
                  <tbody>
                    {filteredVehicles.map((v, idx) => (
                      <tr key={v.id} onMouseEnter={e => e.currentTarget.style.background='#fff7f2'} onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                        <td style={{ ...st.td, color: C.muted, fontWeight: '700', textAlign: 'center' }}>{idx + 1}</td>
                        <td style={{ ...st.td, fontWeight: '700' }}>{v.plate_number}</td>
                        <td style={st.td}>{v.vehicle_code || '—'}</td>
                        {!isMobile && <><td style={st.td}>{v.brand}</td><td style={st.td}>{v.model}</td><td style={st.td}>{v.year || '—'}</td><td style={st.td}>{v.chassis_number || '—'}</td></>}
                        <td style={st.td}><span style={st.badge(v.status)}>{statusLabel(v.status)}</span></td>
                        <td style={st.td}>
                          {canEdit ? (
                            <select value={v.preparation_status || 'not_ready'} onChange={e => updatePreparation(v.id, e.target.value)} style={st.prepSelect(v.preparation_status || 'not_ready')}>
                              <option value="not_ready">❌</option><option value="in_progress">🔄</option><option value="ready">✅</option>
                            </select>
                          ) : <span>{v.preparation_status === 'ready' ? '✅' : v.preparation_status === 'in_progress' ? '🔄' : '❌'}</span>}
                        </td>
                        <td style={st.td}>
                          <AttachmentMenu
                            vehicle={v}
                            t={t}
                            isRTL={isRTL}
                            supabase={supabase}
                            canEdit={canEdit}
                            onUpdate={fetchData}
                            onPreview={setPreviewImage}
                          />
                        </td>
                        {canEdit && <td style={st.td}><button style={st.editBtn} onClick={() => openEdit('vehicle', v)}>✏️</button></td>}
                        {canDelete && <td style={st.td}><button style={st.deleteBtn} onClick={() => deleteVehicle(v.id)}>🗑️</button></td>}
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
                <div style={{ fontSize: isMobile ? '16px' : '19px', fontWeight: '800' }}>👤 {t.driversTitle} ({filteredDrivers.length})</div>
                {canEdit && <button style={{ ...st.btn(), fontSize: isMobile ? '12px' : '13px', padding: isMobile ? '7px 12px' : '9px 18px' }} onClick={() => setShowDriverForm(true)}>{t.addDriver}</button>}
              </div>
              <input style={{ ...st.input, marginBottom: '12px' }} placeholder={t.searchDrivers} value={driverSearch} onChange={e => setDriverSearch(e.target.value)} />
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(2, 1fr)', gap: '8px', marginBottom: '16px' }}>
                <select style={{ ...st.input, padding: '8px 10px', fontSize: '12px' }} value={driverStatusFilter} onChange={e => setDriverStatusFilter(e.target.value)}>
                  <option value="all">📌 الحالة: الكل</option>
                  <option value="active">{t.active}</option>
                  <option value="inactive">{t.inactive}</option>
                </select>
                <select style={{ ...st.input, padding: '8px 10px', fontSize: '12px' }} value={driverLicenseFilter} onChange={e => setDriverLicenseFilter(e.target.value)}>
                  <option value="all">🪪 الرخصة: الكل</option>
                  <option value="valid">✅ سارية</option>
                  <option value="expiring">⚠️ تنتهي خلال 30 يوم</option>
                  <option value="expired">❌ منتهية</option>
                </select>
              </div>
              <div style={{ ...st.card, padding: 0, overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '500px' }}>
                  <thead><tr>
                    <th style={{ ...st.th, width: '40px' }}>#</th>
                    <th style={st.th}>رقم الملف</th>
                    <th style={st.th}>{t.fullName}<ColumnFilter type="text" value={driverColFilters.name} onChange={v => setDCF('name', v)} label={t.fullName} isRTL={isRTL} /></th>
                    <th style={st.th}>{t.nationalId}<ColumnFilter type="text" value={driverColFilters.nationalId} onChange={v => setDCF('nationalId', v)} label={t.nationalId} isRTL={isRTL} /></th>
                    {!isMobile && <>
                      <th style={st.th}>{t.passport}<ColumnFilter type="text" value={driverColFilters.passport} onChange={v => setDCF('passport', v)} label={t.passport} isRTL={isRTL} /></th>
                      <th style={st.th}>{t.phone}<ColumnFilter type="text" value={driverColFilters.phone} onChange={v => setDCF('phone', v)} label={t.phone} isRTL={isRTL} /></th>
                      <th style={st.th}>{t.license}<ColumnFilter type="text" value={driverColFilters.license} onChange={v => setDCF('license', v)} label={t.license} isRTL={isRTL} /></th>
                      <th style={st.th}>{t.expiry}<ColumnFilter type="select" value={driverLicenseFilter} onChange={setDriverLicenseFilter} options={[['all','الكل'],['valid','✅ سارية'],['expiring','⚠️ تنتهي خلال 30 يوم'],['expired','❌ منتهية']]} label={t.expiry} isRTL={isRTL} /></th>
                    </>}
                    <th style={st.th}>{t.iqama}</th><th style={st.th}>{t.license}</th>
                    <th style={st.th}>{t.status}<ColumnFilter type="select" value={driverStatusFilter} onChange={setDriverStatusFilter} options={[['all','الكل'],['active',t.active],['inactive',t.inactive]]} label={t.status} isRTL={isRTL} /></th>
                    {canEdit && <th style={st.th}>{t.edit}</th>}
                    {canDelete && <th style={st.th}>🗑️</th>}
                  </tr></thead>
                  <tbody>
                    {filteredDrivers.map((d, idx) => {
                      const days = daysUntil(d.license_expiry)
                      const expiring = days !== null && days <= 30
                      return (
                        <tr key={d.id} style={{ background: expiring ? '#fffbeb' : 'transparent' }} onMouseEnter={e => e.currentTarget.style.background='#fff7f2'} onMouseLeave={e => e.currentTarget.style.background = expiring ? '#fffbeb' : 'transparent'}>
                          <td style={{ ...st.td, color: C.muted, fontWeight: '700', textAlign: 'center' }}>{idx + 1}</td>
                          <td style={st.td}>{d.file_number || '—'}</td>
                          <td style={{ ...st.td, fontWeight: '700' }}>{d.full_name}</td>
                          <td style={st.td}>{d.national_id || '—'}</td>
                          {!isMobile && <><td style={st.td}>{d.passport_number || '—'}</td><td style={st.td}>{d.phone || '—'}</td><td style={st.td}>{d.license_number || '—'}</td>
                          <td style={st.td}><span style={{ color: days !== null && days < 0 ? '#dc2626' : days !== null && days <= 14 ? '#ea580c' : days !== null && days <= 30 ? '#d97706' : C.text, fontWeight: expiring ? '700' : '400' }}>{d.license_expiry || '—'}{days !== null && days < 0 && ' ⚠️'}</span></td></>}
                          <td style={st.td}>{d.iqama_image ? <span style={imgLink} onClick={() => setPreviewImage(d.iqama_image)}>{t.view}</span> : '—'}</td>
                          <td style={st.td}>{d.license_image ? <span style={imgLink} onClick={() => setPreviewImage(d.license_image)}>{t.view}</span> : '—'}</td>
                          <td style={st.td}><span style={st.badge(d.status)}>{statusLabel(d.status)}</span></td>
                          {canEdit && <td style={st.td}><button style={st.editBtn} onClick={() => openEdit('driver', d)}>✏️</button></td>}
                          {canDelete && <td style={st.td}><button style={st.deleteBtn} onClick={() => deleteDriver(d.id)}>🗑️</button></td>}
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
                <div style={{ fontSize: isMobile ? '16px' : '19px', fontWeight: '800' }}>🔧 {t.maintenanceTitle} ({filteredMaintenance.length})</div>
                {canEdit && <button style={{ ...st.btn(), fontSize: isMobile ? '12px' : '13px', padding: isMobile ? '7px 12px' : '9px 18px' }} onClick={() => setShowMaintenanceForm(true)}>{t.addMaintenance}</button>}
              </div>
              <input style={{ ...st.input, marginBottom: '8px' }} placeholder="🔍 بحث في الوصف، النوع، رقم اللوحة..." value={maintenanceSearch} onChange={e => setMaintenanceSearch(e.target.value)} />
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)', gap: '8px', marginBottom: '16px' }}>
                <select style={{ ...st.input, padding: '8px 10px', fontSize: '12px' }} value={maintenanceStatusFilter} onChange={e => setMaintenanceStatusFilter(e.target.value)}>
                  <option value="all">📌 الحالة: الكل</option>
                  <option value="active">{t.completedLabel}</option>
                  <option value="pending">{t.pendingLabel}</option>
                  <option value="inactive">{t.cancelledLabel}</option>
                </select>
                <select style={{ ...st.input, padding: '8px 10px', fontSize: '12px' }} value={maintenanceVehicleFilter} onChange={e => setMaintenanceVehicleFilter(e.target.value)}>
                  <option value="all">🚛 المركبة: الكل</option>
                  {vehicles.map(v => <option key={v.id} value={v.id}>{v.plate_number}</option>)}
                </select>
                <input type="date" style={{ ...st.input, padding: '8px 10px', fontSize: '12px' }} value={maintenanceDateFrom} onChange={e => setMaintenanceDateFrom(e.target.value)} placeholder="من" />
                <input type="date" style={{ ...st.input, padding: '8px 10px', fontSize: '12px' }} value={maintenanceDateTo} onChange={e => setMaintenanceDateTo(e.target.value)} placeholder="إلى" />
              </div>
              <div style={{ ...st.card, padding: 0, overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '500px' }}>
                  <thead><tr>
                    <th style={{ ...st.th, width: '40px' }}>#</th>
                    <th style={st.th}>{t.vehicle}<ColumnFilter type="select" value={maintenanceVehicleFilter} onChange={setMaintenanceVehicleFilter} options={[['all','الكل'], ...vehicles.map(v=>[v.id, v.plate_number])]} label={t.vehicle} isRTL={isRTL} /></th>
                    <th style={st.th}>{t.type}<ColumnFilter type="text" value={maintenanceColFilters.type} onChange={v => setMCF('type', v)} label={t.type} isRTL={isRTL} /></th>
                    {!isMobile && <>
                      <th style={st.th}>{t.description}<ColumnFilter type="text" value={maintenanceColFilters.description} onChange={v => setMCF('description', v)} label={t.description} isRTL={isRTL} /></th>
                      <th style={st.th}>{t.date}<ColumnFilter type="date-range" value={{ from: maintenanceDateFrom, to: maintenanceDateTo }} onChange={(r) => { setMaintenanceDateFrom(r.from || ''); setMaintenanceDateTo(r.to || '') }} label={t.date} isRTL={isRTL} /></th>
                    </>}
                    <th style={st.th}>{t.cost}<ColumnFilter type="text" value={maintenanceColFilters.cost} onChange={v => setMCF('cost', v)} label={t.cost} isRTL={isRTL} /></th>
                    <th style={st.th}>{t.nextDate}</th>
                    <th style={st.th}>{t.status}<ColumnFilter type="select" value={maintenanceStatusFilter} onChange={setMaintenanceStatusFilter} options={[['all','الكل'],['active',t.completedLabel],['pending',t.pendingLabel],['inactive',t.cancelledLabel]]} label={t.status} isRTL={isRTL} /></th>
                    {canEdit && <th style={st.th}>{t.edit}</th>}
                    {canDelete && <th style={st.th}>🗑️</th>}
                  </tr></thead>
                  <tbody>
                    {filteredMaintenance.map((m, idx) => {
                      const days = daysUntil(m.next_date)
                      const expiring = days !== null && days <= 7
                      return (
                        <tr key={m.id} style={{ background: expiring ? '#fff7ed' : 'transparent' }} onMouseEnter={e => e.currentTarget.style.background='#fff7f2'} onMouseLeave={e => e.currentTarget.style.background = expiring ? '#fff7ed' : 'transparent'}>
                          <td style={{ ...st.td, color: C.muted, fontWeight: '700', textAlign: 'center' }}>{idx + 1}</td>
                          <td style={{ ...st.td, fontWeight: '700' }}>{m.vehicles?.plate_number}</td>
                          <td style={st.td}>{m.type}</td>
                          {!isMobile && <><td style={st.td}>{m.description}</td><td style={st.td}>{m.date}</td></>}
                          <td style={st.td}><span style={{ color: C.orange, fontWeight: '700' }}>{m.cost} {t.sar}</span></td>
                          <td style={st.td}><span style={{ color: expiring ? '#dc2626' : C.text, fontWeight: expiring ? '700' : '400' }}>{m.next_date || '—'}{expiring && ' ⚠️'}</span></td>
                          <td style={st.td}><span style={st.badge(m.status)}>{statusLabel(m.status)}</span></td>
                          {canEdit && <td style={st.td}><button style={st.editBtn} onClick={() => openEdit('maintenance', m)}>✏️</button></td>}
                          {canDelete && <td style={st.td}><button style={st.deleteBtn} onClick={() => deleteMaintenance(m.id)}>🗑️</button></td>}
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
                <div style={{ fontSize: isMobile ? '16px' : '19px', fontWeight: '800' }}>⛽ {t.fuelTitle} ({filteredFuel.length})</div>
                {canEdit && <button style={{ ...st.btn(), fontSize: isMobile ? '12px' : '13px', padding: isMobile ? '7px 12px' : '9px 18px' }} onClick={() => setShowFuelForm(true)}>{t.addFuel}</button>}
              </div>
              <input style={{ ...st.input, marginBottom: '8px' }} placeholder="🔍 بحث برقم اللوحة أو اسم السائق..." value={fuelSearch} onChange={e => setFuelSearch(e.target.value)} />
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)', gap: '8px', marginBottom: '16px' }}>
                <select style={{ ...st.input, padding: '8px 10px', fontSize: '12px' }} value={fuelVehicleFilter} onChange={e => setFuelVehicleFilter(e.target.value)}>
                  <option value="all">🚛 المركبة: الكل</option>
                  {vehicles.map(v => <option key={v.id} value={v.id}>{v.plate_number}</option>)}
                </select>
                <select style={{ ...st.input, padding: '8px 10px', fontSize: '12px' }} value={fuelDriverFilter} onChange={e => setFuelDriverFilter(e.target.value)}>
                  <option value="all">👤 السائق: الكل</option>
                  {drivers.map(d => <option key={d.id} value={d.id}>{d.full_name}</option>)}
                </select>
                <input type="date" style={{ ...st.input, padding: '8px 10px', fontSize: '12px' }} value={fuelDateFrom} onChange={e => setFuelDateFrom(e.target.value)} placeholder="من" />
                <input type="date" style={{ ...st.input, padding: '8px 10px', fontSize: '12px' }} value={fuelDateTo} onChange={e => setFuelDateTo(e.target.value)} placeholder="إلى" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: '14px', padding: '16px', borderTop: '4px solid #ff6b00' }}>
                  <div style={{ color: C.muted, fontSize: '11px', fontWeight: '600' }}>⛽ {t.totalCost}</div>
                  <div style={{ fontSize: isMobile ? '22px' : '28px', fontWeight: '900', color: '#ff6b00' }}>{totalFuelCost.toFixed(0)} {t.sar}</div>
                </div>
                <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: '14px', padding: '16px', borderTop: '4px solid #7c3aed' }}>
                  <div style={{ color: C.muted, fontSize: '11px', fontWeight: '600' }}>📋 {t.totalRecords}</div>
                  <div style={{ fontSize: isMobile ? '22px' : '28px', fontWeight: '900', color: '#7c3aed' }}>{fuelLogs.length}</div>
                </div>
              </div>
              <div style={{ ...st.card, padding: 0, overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '500px' }}>
                  <thead><tr>
                    <th style={{ ...st.th, width: '40px' }}>#</th>
                    <th style={st.th}>{t.vehicle}<ColumnFilter type="select" value={fuelVehicleFilter} onChange={setFuelVehicleFilter} options={[['all','الكل'], ...vehicles.map(v=>[v.id, v.plate_number])]} label={t.vehicle} isRTL={isRTL} /></th>
                    <th style={st.th}>{t.driver}<ColumnFilter type="select" value={fuelDriverFilter} onChange={setFuelDriverFilter} options={[['all','الكل'], ...drivers.map(d=>[d.id, d.full_name])]} label={t.driver} isRTL={isRTL} /></th>
                    {!isMobile && <>
                      <th style={st.th}>{t.date}<ColumnFilter type="date-range" value={{ from: fuelDateFrom, to: fuelDateTo }} onChange={(r) => { setFuelDateFrom(r.from || ''); setFuelDateTo(r.to || '') }} label={t.date} isRTL={isRTL} /></th>
                      <th style={st.th}>{t.liters}<ColumnFilter type="text" value={fuelColFilters.liters} onChange={v => setFCF('liters', v)} label={t.liters} isRTL={isRTL} /></th>
                    </>}
                    <th style={st.th}>{t.total}<ColumnFilter type="text" value={fuelColFilters.cost} onChange={v => setFCF('cost', v)} label={t.total} isRTL={isRTL} /></th>
                    {canEdit && <th style={st.th}>{t.edit}</th>}
                    {canDelete && <th style={st.th}>🗑️</th>}
                  </tr></thead>
                  <tbody>
                    {filteredFuel.map((f, idx) => (
                      <tr key={f.id} onMouseEnter={e => e.currentTarget.style.background='#fff7f2'} onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                        <td style={{ ...st.td, color: C.muted, fontWeight: '700', textAlign: 'center' }}>{idx + 1}</td>
                        <td style={{ ...st.td, fontWeight: '700' }}>{f.vehicles?.plate_number}</td>
                        <td style={st.td}>{f.drivers?.full_name}</td>
                        {!isMobile && <><td style={st.td}>{f.date}</td><td style={st.td}>{f.liters}</td></>}
                        <td style={st.td}><span style={{ color: C.orange, fontWeight: '700' }}>{f.total_cost} {t.sar}</span></td>
                        {canEdit && <td style={st.td}><button style={st.editBtn} onClick={() => openEdit('fuel', f)}>✏️</button></td>}
                        {canDelete && <td style={st.td}><button style={st.deleteBtn} onClick={() => deleteFuel(f.id)}>🗑️</button></td>}
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
              <div style={{ fontSize: isMobile ? '16px' : '19px', fontWeight: '800', marginBottom: '20px' }}>📈 {t.reportsTitle}</div>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(3,1fr)', gap: '12px', marginBottom: '20px' }}>
                {[[`🚛`,t.totalVehicles,vehicles.length,'#ff6b00'],[`✅`,t.activeVehicles,activeVehicles,'#16a34a'],[`🟢`,t.readyVehicles,readyVehicles,'#16a34a'],[`👤`,t.totalDrivers,drivers.length,'#2563eb'],[`👍`,t.activeDrivers,activeDrivers,'#16a34a'],[`🔔`,t.activeAlerts,alerts.length,'#dc2626']].map(([icon,label,val,color]) => (
                  <div key={label} style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: '12px', padding: '16px', borderTop: `3px solid ${color}` }}>
                    <div style={{ color: C.muted, fontSize: '11px', marginBottom: '6px' }}>{icon} {label}</div>
                    <div style={{ fontSize: '26px', fontWeight: '900', color }}>{val}</div>
                  </div>
                ))}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div style={st.card}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <div style={{ fontWeight: '800' }}>⛽ {t.fuelReport}</div>
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
                    <div style={{ fontWeight: '800' }}>🔧 {t.maintenanceReport}</div>
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
                  <div style={{ fontWeight: '800' }}>🚛 {t.vehiclesReport}</div>
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
                <div style={{ fontWeight: '800', marginBottom: '16px' }}>📥 {t.exportData}</div>
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4,1fr)', gap: '10px' }}>
                  <button onClick={exportVehicles} style={{ ...st.btn('#ff6b00'), padding: '12px' }}>🚛 {t.vehicles}</button>
                  <button onClick={exportDrivers} style={{ ...st.btn('#2563eb'), padding: '12px' }}>👤 {t.drivers}</button>
                  <button onClick={exportMaintenance} style={{ ...st.btn('#d97706'), padding: '12px' }}>🔧 {t.maintenance}</button>
                  <button onClick={exportFuel} style={{ ...st.btn('#16a34a'), padding: '12px' }}>⛽ {t.fuel}</button>
                </div>
              </div>

              {/* Equipment Preparation PDF Report */}
              <PrepReport
                vehicles={vehicles}
                drivers={drivers}
                t={t}
                isRTL={isRTL}
                lang={lang}
                isMobile={isMobile}
                currentUser={currentUser}
              />
            </div>
          )}

          {/* Alerts */}
          {activeTab === 'alerts' && (
            <div>
              <div style={{ fontSize: isMobile ? '16px' : '19px', fontWeight: '800', marginBottom: '20px' }}>🔔 {t.alertsTitle} ({alerts.length})</div>
              {alerts.length === 0 ? (
                <div style={{ ...st.card, textAlign: 'center', padding: '60px' }}>
                  <div style={{ fontSize: '48px', marginBottom: '16px' }}>✅</div>
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
          {activeTab === 'audit' && currentRole === 'admin' && (
            <AuditLogView supabase={supabase} isMobile={isMobile} />
          )}

          {activeTab === 'logins' && currentRole === 'admin' && (
            <LoginHistoryView supabase={supabase} isMobile={isMobile} isAdmin={true} />
          )}

          {activeTab === 'users' && currentRole === 'admin' && (
            <div>
              <div style={{ fontSize: isMobile ? '16px' : '19px', fontWeight: '800', marginBottom: '20px' }}>👥 {t.usersTitle}</div>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3,1fr)', gap: '12px', marginBottom: '20px' }}>
                {[['admin',t.adminRole,t.adminDesc,'#7c3aed'],['editor',t.editorRole,t.editorDesc,'#ff6b00'],['viewer',t.viewerRole,t.viewerDesc,'#16a34a']].map(([role,label,desc,color]) => (
                  <div key={role} style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: '12px', padding: '16px', borderTop: `3px solid ${color}` }}>
                    <div style={{ fontWeight: '700', color, marginBottom: '4px' }}>{label}</div>
                    <div style={{ fontSize: '12px', color: C.muted }}>{desc}</div>
                    <div style={{ fontSize: '20px', fontWeight: '900', color, marginTop: '8px' }}>{userRoles.filter(u => u.role === role).length}</div>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', gap: '12px', flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontWeight: '700', color: 'var(--text)', fontSize: '14px' }}>قائمة المستخدمين</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>أضف مستخدمين جدد مع تحديد صلاحياتهم</div>
                </div>
                <button onClick={() => setShowAddUser(true)} style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-2))', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '10px', cursor: 'pointer', fontFamily: 'Cairo, sans-serif', fontWeight: '700', fontSize: '13px', boxShadow: 'var(--shadow-accent)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="7" r="4"/><path d="M3 21v-2a4 4 0 014-4h4a4 4 0 014 4v2"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>
                  إضافة مستخدم جديد
                </button>
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
                          <div style={{ fontWeight: '700' }}>{u.email || u.user_id?.substring(0, 16) + '...'}</div>
                          <div style={{ fontSize: '11px', color: C.muted }}>{u.user_id?.substring(0, 16)}...</div>
                        </td>
                        <td style={st.td}><span style={{ background: roleBg(u.role), color: roleColor(u.role), padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '700' }}>{roleLabel(u.role)}</span></td>
                        <td style={st.td}>
                          {u.user_id === currentUser?.id ? (
                            <span style={{ color: C.muted, fontSize: '12px' }}>{t.you}</span>
                          ) : currentUser?.email === 'eng.fares98@gmail.com' ? (
                            <select value={u.role} onChange={e => updateUserRole(u.user_id, e.target.value)} style={{ ...st.input, width: 'auto', padding: '6px 10px', fontSize: '12px' }}>
                              <option value="admin">{t.adminRole}</option>
                              <option value="editor">{t.editorRole}</option>
                              <option value="viewer">{t.viewerRole}</option>
                            </select>
                          ) : <span style={{ color: C.muted, fontSize: '12px' }}>—</span>}
                        </td>
                        <td style={st.td}>
                          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                            <button onClick={() => setEditPermsFor(u)} title="تعديل الصلاحيات التفصيلية" style={{ background: 'var(--accent-soft)', border: '1px solid var(--accent)', color: 'var(--accent)', padding: '4px 10px', borderRadius: '6px', fontSize: '11px', cursor: 'pointer', fontFamily: 'Cairo, sans-serif', fontWeight: '700' }}>⚙️</button>
                            {u.user_id !== currentUser?.id && currentUser?.email === 'eng.fares98@gmail.com' && (
                              <button onClick={() => deleteUserRole(u.user_id)} style={st.deleteBtn}>🗑️</button>
                            )}
                          </div>
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
            <div style={{ fontSize: '16px', fontWeight: '800', marginBottom: '20px' }}>✏️ {t.edit} {editType === 'vehicle' ? t.vehicles : editType === 'driver' ? t.drivers : editType === 'maintenance' ? t.maintenance : t.fuel}</div>
            {editType === 'vehicle' && (<div style={st.formGrid}>
              <div><label style={st.label}>{t.plateNumber}</label><input style={st.input} value={editForm.plate_number||''} onChange={e=>setEditForm({...editForm,plate_number:e.target.value})} /></div>
              <div><label style={st.label}>{t.vehicleCode}</label><input style={st.input} value={editForm.vehicle_code||''} onChange={e=>setEditForm({...editForm,vehicle_code:e.target.value})} /></div>
              <div><label style={st.label}>{t.type}</label><input style={st.input} value={editForm.type||''} onChange={e=>setEditForm({...editForm,type:e.target.value})} /></div>
              <div><label style={st.label}>{t.brand}</label><input style={st.input} value={editForm.brand||''} onChange={e=>setEditForm({...editForm,brand:e.target.value})} /></div>
              <div><label style={st.label}>{t.model}</label><input style={st.input} value={editForm.model||''} onChange={e=>setEditForm({...editForm,model:e.target.value})} /></div>
              <div><label style={st.label}>{t.year}</label><input style={st.input} value={editForm.year||''} onChange={e=>setEditForm({...editForm,year:e.target.value})} /></div>
              <div><label style={st.label}>{t.chassisNumber}</label><input style={st.input} value={editForm.chassis_number||''} onChange={e=>setEditForm({...editForm,chassis_number:e.target.value})} /></div>
              <div><label style={st.label}>{t.color}</label><input style={st.input} value={editForm.color||''} onChange={e=>setEditForm({...editForm,color:e.target.value})} /></div>
              <div><label style={st.label}>{t.fuelType}</label><input style={st.input} value={editForm.fuel_type||''} onChange={e=>setEditForm({...editForm,fuel_type:e.target.value})} /></div>
              <div><label style={st.label}>{t.status}</label><select style={st.input} value={editForm.status||''} onChange={e=>setEditForm({...editForm,status:e.target.value})}><option value="active">{t.active}</option><option value="inactive">{t.inactive}</option><option value="pending">{t.pending}</option></select></div>
              <div><label style={st.label}>{t.preparationStatus}</label><select style={st.input} value={editForm.preparation_status||''} onChange={e=>setEditForm({...editForm,preparation_status:e.target.value})}><option value="not_ready">{t.notReady}</option><option value="in_progress">{t.inProgress}</option><option value="ready">{t.ready}</option></select></div>
              <FileInput label={t.vehicleImage} icon="🚛" onChange={setEditVehicleImage} file={editVehicleImage} />
              <FileInput label={t.istamaraImage} icon="📄" onChange={setEditIstamaraImage} file={editIstamaraImage} />
            </div>)}
            {editType === 'driver' && (<div style={st.formGrid}>
              <div><label style={st.label}>رقم الملف</label><input style={st.input} value={editForm.file_number||''} onChange={e=>setEditForm({...editForm,file_number:e.target.value})} /></div>
              <div><label style={st.label}>{t.fullName}</label><input style={st.input} value={editForm.full_name||''} onChange={e=>setEditForm({...editForm,full_name:e.target.value})} /></div>
              <div><label style={st.label}>{t.nationalId}</label><input style={st.input} value={editForm.national_id||''} onChange={e=>setEditForm({...editForm,national_id:e.target.value})} /></div>
              <div><label style={st.label}>{t.passportNumber}</label><input style={st.input} value={editForm.passport_number||''} onChange={e=>setEditForm({...editForm,passport_number:e.target.value})} /></div>
              <div><label style={st.label}>{t.phone}</label><input style={st.input} value={editForm.phone||''} onChange={e=>setEditForm({...editForm,phone:e.target.value})} /></div>
              <div><label style={st.label}>{t.licenseNumber}</label><input style={st.input} value={editForm.license_number||''} onChange={e=>setEditForm({...editForm,license_number:e.target.value})} /></div>
              <div><label style={st.label}>{t.licenseExpiry}</label><input type="date" style={st.input} value={editForm.license_expiry||''} onChange={e=>setEditForm({...editForm,license_expiry:e.target.value})} /></div>
              <div><label style={st.label}>{t.status}</label><select style={st.input} value={editForm.status||''} onChange={e=>setEditForm({...editForm,status:e.target.value})}><option value="active">{t.active}</option><option value="inactive">{t.inactive}</option></select></div>
              <FileInput label={t.iqamaImage} icon="🪪" onChange={setEditIqamaImage} file={editIqamaImage} />
              <FileInput label={t.licenseImage} icon="🚗" onChange={setEditLicenseImage} file={editLicenseImage} />
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
              <button style={st.btn()} onClick={saveEdit} disabled={uploading}>{uploading ? t.saving : `💾 ${t.save}`}</button>
              <button style={st.btn('#888', true)} onClick={() => setEditItem(null)}>{t.cancel}</button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Upload Attachments Modal */}
      {showBulkUpload && (
        <div style={st.modal}>
          <div style={{ ...st.modalBox, maxWidth: '620px' }}>
            <div style={{ fontSize: '16px', fontWeight: '800', marginBottom: '16px' }}>📂 رفع جماعي — {t[(ATTACHMENT_TYPES.find(a => a.key === bulkAttachmentType) || {}).labelKey] || ''}</div>
            <div style={{ fontSize: '12px', color: '#888', marginBottom: '14px', background: '#f8f9fa', padding: '10px 14px', borderRadius: '8px' }}>
              ⚠️ يجب أن يحتوي اسم كل ملف على رقم اللوحة — مثال: <strong>2122.jpg</strong> أو <strong>2122.pdf</strong>
            </div>
            <label style={{ width: '100%', padding: '20px', background: bulkFiles.length ? '#fff7f2' : '#fafafa', border: `2px dashed ${bulkFiles.length ? '#ff6b00' : '#e8e8e8'}`, borderRadius: '10px', color: bulkFiles.length ? '#ff6b00' : '#888', fontSize: '13px', cursor: 'pointer', textAlign: 'center', display: 'block', boxSizing: 'border-box', fontWeight: '600', marginBottom: '16px' }}>
              {bulkFiles.length ? `✅ تم اختيار ${bulkFiles.length} ملف` : '📎 اضغط هنا لاختيار الملفات (صور أو PDF)'}
              <input type="file" accept="image/*,application/pdf,.pdf" multiple style={{ display: 'none' }} onChange={e => { setBulkFiles(Array.from(e.target.files)); setBulkResults([]) }} />
            </label>

            {bulkFiles.length > 0 && !bulkResults.length && (
              <div style={{ maxHeight: '180px', overflowY: 'auto', marginBottom: '16px', border: `1px solid #e8e8e8`, borderRadius: '8px' }}>
                {bulkFiles.map((f, i) => (
                  <div key={i} style={{ padding: '8px 14px', borderBottom: '1px solid #f1f1f1', fontSize: '12px', color: '#444' }}>
                    {(f.type || '').includes('pdf') || f.name.toLowerCase().endsWith('.pdf') ? '📄' : '🖼️'} {f.name}
                  </div>
                ))}
              </div>
            )}

            {bulkResults.length > 0 && (
              <div style={{ maxHeight: '220px', overflowY: 'auto', marginBottom: '16px', border: `1px solid #e8e8e8`, borderRadius: '8px' }}>
                <div style={{ padding: '8px 14px', background: '#f8f9fa', fontSize: '11px', fontWeight: '700', color: '#555', borderBottom: '1px solid #e8e8e8' }}>
                  ✅ {bulkResults.filter(r => r.status === 'success').length} نجح &nbsp;|&nbsp;
                  ❌ {bulkResults.filter(r => r.status !== 'success').length} فشل
                </div>
                {bulkResults.map((r, i) => (
                  <div key={i} style={{ padding: '7px 14px', borderBottom: '1px solid #f1f1f1', fontSize: '12px', display: 'flex', justifyContent: 'space-between', color: r.status === 'success' ? '#16a34a' : '#dc2626' }}>
                    <span>{r.file}</span>
                    <span>{r.msg}</span>
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px' }}>
              <button style={st.btn()} onClick={bulkUploadAttachments} disabled={bulkUploading || !bulkFiles.length}>
                {bulkUploading ? '⏳ جاري الرفع...' : '🚀 ابدأ الرفع'}
              </button>
              <button style={st.btn('#888', true)} onClick={() => { setShowBulkUpload(false); setBulkFiles([]); setBulkResults([]) }}>إغلاق</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Vehicle Modal */}
      {showVehicleForm && (<div style={st.modal}><div style={st.modalBox}>
        <div style={{ fontSize: '16px', fontWeight: '800', marginBottom: '16px' }}>🚛 {t.addVehicleTitle}</div>
        <div style={st.formGrid}>
          {[[`plate_number`,t.plateNumber],[`vehicle_code`,t.vehicleCode],[`type`,t.type],[`brand`,t.brand],[`model`,t.model],[`year`,t.year],[`chassis_number`,t.chassisNumber],[`color`,t.color],[`fuel_type`,t.fuelType]].map(([key,label]) => (
            <div key={key}><label style={st.label}>{label}</label><input style={st.input} value={vehicleForm[key]} onChange={e => setVehicleForm({...vehicleForm,[key]:e.target.value})} /></div>
          ))}
          <div><label style={st.label}>{t.status}</label><select style={st.input} value={vehicleForm.status} onChange={e => setVehicleForm({...vehicleForm,status:e.target.value})}><option value="active">{t.active}</option><option value="inactive">{t.inactive}</option><option value="pending">{t.pending}</option></select></div>
          <div><label style={st.label}>{t.preparationStatus}</label><select style={st.input} value={vehicleForm.preparation_status} onChange={e => setVehicleForm({...vehicleForm,preparation_status:e.target.value})}><option value="not_ready">{t.notReady}</option><option value="in_progress">{t.inProgress}</option><option value="ready">{t.ready}</option></select></div>
          <FileInput label={t.vehicleImage} icon="🚛" onChange={setVehicleImage} file={vehicleImage} />
          <FileInput label={t.istamaraImage} icon="📄" onChange={setIstamaraImage} file={istamaraImage} />
        </div>
        <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
          <button style={st.btn()} onClick={addVehicle} disabled={uploading}>{uploading ? t.uploading : t.save}</button>
          <button style={st.btn('#888', true)} onClick={() => setShowVehicleForm(false)}>{t.cancel}</button>
        </div>
      </div></div>)}

      {/* Add Driver Modal */}
      {showDriverForm && (<div style={st.modal}><div style={st.modalBox}>
        <div style={{ fontSize: '16px', fontWeight: '800', marginBottom: '16px' }}>👤 {t.addDriverTitle}</div>
        <div style={st.formGrid}>
          {[[`file_number`,`رقم الملف`],[`full_name`,t.fullName],[`national_id`,t.nationalId],[`passport_number`,t.passportNumber],[`phone`,t.phone],[`license_number`,t.licenseNumber]].map(([key,label]) => (
            <div key={key}><label style={st.label}>{label}</label><input style={st.input} value={driverForm[key]} onChange={e => setDriverForm({...driverForm,[key]:e.target.value})} /></div>
          ))}
          <div><label style={st.label}>{t.licenseExpiry}</label><input type="date" style={st.input} value={driverForm.license_expiry} onChange={e => setDriverForm({...driverForm,license_expiry:e.target.value})} /></div>
          <div><label style={st.label}>{t.status}</label><select style={st.input} value={driverForm.status} onChange={e => setDriverForm({...driverForm,status:e.target.value})}><option value="active">{t.active}</option><option value="inactive">{t.inactive}</option></select></div>
          <FileInput label={t.iqamaImage} icon="🪪" onChange={setIqamaImage} file={iqamaImage} />
          <FileInput label={t.licenseImage} icon="🚗" onChange={setLicenseImage} file={licenseImage} />
        </div>
        <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
          <button style={st.btn()} onClick={addDriver} disabled={uploading}>{uploading ? t.uploading : t.save}</button>
          <button style={st.btn('#888', true)} onClick={() => setShowDriverForm(false)}>{t.cancel}</button>
        </div>
      </div></div>)}

      {/* Add Maintenance Modal */}
      {showMaintenanceForm && (<div style={st.modal}><div style={st.modalBox}>
        <div style={{ fontSize: '16px', fontWeight: '800', marginBottom: '16px' }}>🔧 {t.addMaintenanceTitle}</div>
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
        <div style={{ fontSize: '16px', fontWeight: '800', marginBottom: '16px' }}>⛽ {t.addFuelTitle}</div>
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

      {/* Keyboard Shortcuts Handler */}
      {/* Edit User Permissions Modal */}
      {editPermsFor && (
        <div onClick={() => setEditPermsFor(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 350, padding: '16px', backdropFilter: 'blur(8px)' }}>
          <div onClick={e => e.stopPropagation()} dir="rtl" style={{ background: 'var(--surface)', borderRadius: '18px', maxWidth: '640px', width: '100%', maxHeight: '90vh', overflow: 'auto', boxShadow: 'var(--shadow-xl)', fontFamily: 'Cairo, sans-serif', animation: 'scaleIn 0.25s' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: 'var(--surface)', zIndex: 1 }}>
              <div>
                <div style={{ fontWeight: '900', fontSize: '16px', color: 'var(--text)' }}>⚙️ صلاحيات المستخدم</div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>{editPermsFor.email || editPermsFor.user_id?.substring(0,8)}</div>
              </div>
              <button onClick={() => setEditPermsFor(null)} style={{ background: 'var(--surface-2)', border: 'none', width: '30px', height: '30px', borderRadius: '8px', cursor: 'pointer', color: 'var(--text-muted)' }}>✕</button>
            </div>
            <div style={{ padding: '20px 24px' }}>
              <PermissionsManager
                user={editPermsFor}
                onSave={(p) => saveUserPermissions(editPermsFor.user_id, p)}
                onClose={() => setEditPermsFor(null)}
                isMobile={isMobile}
              />
            </div>
          </div>
        </div>
      )}

      {/* Add User Modal */}
      {showAddUser && (
        <div onClick={!addingUser ? closeAddUser : undefined} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 350, padding: '16px', backdropFilter: 'blur(8px)' }}>
          <div onClick={e => e.stopPropagation()} dir="rtl" style={{ background: 'var(--surface)', borderRadius: '18px', maxWidth: '500px', width: '100%', boxShadow: 'var(--shadow-xl)', overflow: 'hidden', fontFamily: 'Cairo, sans-serif', animation: 'scaleIn 0.25s' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontWeight: '900', fontSize: '16px', color: 'var(--text)' }}>➕ إضافة مستخدم جديد</div>
              <button onClick={closeAddUser} disabled={addingUser} style={{ background: 'var(--surface-2)', border: 'none', width: '30px', height: '30px', borderRadius: '8px', cursor: 'pointer', color: 'var(--text-muted)' }}>✕</button>
            </div>
            <div style={{ padding: '20px 24px' }}>
              {addUserResult?.success ? (
                <div>
                  <div style={{ background: 'var(--success-soft)', border: '1px solid var(--success)', borderRadius: '12px', padding: '16px', marginBottom: '16px', textAlign: 'center' }}>
                    <div style={{ fontSize: '32px', marginBottom: '8px' }}>✅</div>
                    <div style={{ fontWeight: '800', color: 'var(--success)', fontSize: '14px' }}>تم إنشاء الحساب بنجاح</div>
                  </div>
                  <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: '10px', padding: '14px', marginBottom: '12px' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '6px' }}>📧 الإيميل</div>
                    <div style={{ fontWeight: '700', color: 'var(--text)', fontSize: '14px' }}>{addUserResult.email}</div>
                  </div>
                  <div style={{ background: 'var(--accent-soft)', border: '1px solid var(--accent)', borderRadius: '10px', padding: '14px', marginBottom: '16px' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '6px' }}>🔑 كلمة المرور المؤقتة</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                      <div style={{ fontFamily: 'monospace', fontWeight: '700', color: 'var(--accent)', fontSize: '15px' }}>{addUserResult.password}</div>
                      <button onClick={() => { navigator.clipboard.writeText(addUserResult.password); showToast('📋 تم نسخ كلمة المرور') }} style={{ background: 'var(--accent)', color: '#fff', border: 'none', padding: '6px 14px', borderRadius: '6px', fontSize: '11px', fontWeight: '700', cursor: 'pointer', fontFamily: 'Cairo, sans-serif' }}>نسخ</button>
                    </div>
                  </div>
                  <div style={{ background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: '10px', padding: '12px', fontSize: '12px', color: '#92400e', marginBottom: '14px' }}>
                    ⚠️ <strong>مهم:</strong> أرسل هذه البيانات للمستخدم. لن تظهر مرة أخرى. قد يحتاج تأكيد إيميله أولاً قبل الدخول.
                  </div>
                  <button onClick={closeAddUser} style={{ width: '100%', background: 'linear-gradient(135deg, var(--accent), var(--accent-2))', color: '#fff', border: 'none', padding: '12px', borderRadius: '10px', cursor: 'pointer', fontFamily: 'Cairo, sans-serif', fontWeight: '700', fontSize: '14px' }}>تم</button>
                </div>
              ) : (
                <div>
                  <div style={{ marginBottom: '14px' }}>
                    <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)', marginBottom: '6px', display: 'block' }}>الاسم الكامل (اختياري)</label>
                    <input value={newUser.full_name} onChange={e => setNewUser({ ...newUser, full_name: e.target.value })} placeholder="مثل: محمد أحمد" style={{ width: '100%', padding: '10px 14px', fontSize: '13px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--text)', fontFamily: 'Cairo, sans-serif' }} />
                  </div>
                  <div style={{ marginBottom: '14px' }}>
                    <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)', marginBottom: '6px', display: 'block' }}>📧 الإيميل *</label>
                    <input type="email" value={newUser.email} onChange={e => setNewUser({ ...newUser, email: e.target.value })} placeholder="user@example.com" style={{ width: '100%', padding: '10px 14px', fontSize: '13px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--text)', fontFamily: 'Cairo, sans-serif' }} />
                  </div>
                  <div style={{ marginBottom: '14px' }}>
                    <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)', marginBottom: '6px', display: 'block' }}>🔑 كلمة المرور *</label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input type="text" value={newUser.password} onChange={e => setNewUser({ ...newUser, password: e.target.value })} placeholder="8 أحرف على الأقل" style={{ flex: 1, padding: '10px 14px', fontSize: '13px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--text)', fontFamily: 'monospace' }} />
                      <button onClick={() => setNewUser({ ...newUser, password: generatePassword() })} type="button" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', padding: '0 14px', borderRadius: '8px', cursor: 'pointer', fontFamily: 'Cairo, sans-serif', fontWeight: '700', fontSize: '12px', color: 'var(--text)', whiteSpace: 'nowrap' }}>🎲 توليد</button>
                    </div>
                  </div>
                  <div style={{ marginBottom: '14px' }}>
                    <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)', marginBottom: '6px', display: 'block' }}>🛡️ الصلاحية *</label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '8px' }}>
                      {[['admin', '🛡️ مدير', '#7c3aed'], ['editor', '📝 محرر', '#ff6b00'], ['viewer', '🔍 مشاهد', '#16a34a']].map(([r, label, c]) => (
                        <button key={r} type="button" onClick={() => setNewUser({ ...newUser, role: r, permissions: showAdvancedPerms ? (ROLE_TEMPLATES[r] || {}) : null })} style={{ padding: '12px 8px', borderRadius: '10px', border: `2px solid ${newUser.role === r ? c : 'var(--border)'}`, background: newUser.role === r ? `${c}15` : 'var(--surface)', color: newUser.role === r ? c : 'var(--text)', cursor: 'pointer', fontFamily: 'Cairo, sans-serif', fontWeight: '700', fontSize: '12px' }}>{label}</button>
                      ))}
                    </div>
                  </div>

                  {/* Advanced permissions toggle */}
                  <div style={{ marginBottom: '16px', background: showAdvancedPerms ? 'var(--accent-soft)' : 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: '10px', overflow: 'hidden', transition: 'all 0.2s' }}>
                    <button type="button" onClick={() => { setShowAdvancedPerms(s => { const newS = !s; setNewUser(u => ({ ...u, permissions: newS ? (ROLE_TEMPLATES[u.role] || {}) : null })); return newS }) }} style={{ width: '100%', background: 'transparent', border: 'none', padding: '12px 14px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontFamily: 'Cairo, sans-serif', color: 'var(--text)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '16px' }}>⚙️</span>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontWeight: '700', fontSize: '13px' }}>تخصيص متقدم للصلاحيات</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '500' }}>تحديد دقيق لكل قسم وإجراء (40 صلاحية)</div>
                        </div>
                      </div>
                      <span style={{ fontSize: '14px', color: 'var(--text-muted)', transition: 'transform 0.2s', transform: showAdvancedPerms ? 'rotate(180deg)' : '' }}>▼</span>
                    </button>
                    {showAdvancedPerms && (
                      <div style={{ padding: '12px', borderTop: '1px solid var(--border)', background: 'var(--surface)' }}>
                        <PermissionsManager
                          user={{ role: newUser.role, permissions: newUser.permissions || ROLE_TEMPLATES[newUser.role] || {} }}
                          onSave={(p) => { setNewUser({ ...newUser, role: p.role, permissions: p.permissions }); showToast('✅ تم تطبيق الصلاحيات على النموذج') }}
                          isMobile={isMobile}
                        />
                      </div>
                    )}
                  </div>
                  {addUserResult?.error && (
                    <div style={{ background: 'var(--danger-soft)', border: '1px solid var(--danger)', borderRadius: '8px', padding: '10px', marginBottom: '14px', fontSize: '12px', color: 'var(--danger)' }}>❌ {addUserResult.error}</div>
                  )}
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={closeAddUser} disabled={addingUser} style={{ flex: 1, background: 'var(--surface-2)', color: 'var(--text)', border: '1px solid var(--border)', padding: '12px', borderRadius: '10px', cursor: 'pointer', fontFamily: 'Cairo, sans-serif', fontWeight: '700', fontSize: '13px' }}>إلغاء</button>
                    <button onClick={handleAddUser} disabled={addingUser || !newUser.email || !newUser.password || newUser.password.length < 6} style={{ flex: 2, background: 'linear-gradient(135deg, var(--accent), var(--accent-2))', color: '#fff', border: 'none', padding: '12px', borderRadius: '10px', cursor: 'pointer', fontFamily: 'Cairo, sans-serif', fontWeight: '700', fontSize: '13px', boxShadow: 'var(--shadow-accent)', opacity: (addingUser || !newUser.email || !newUser.password || newUser.password.length < 6) ? 0.5 : 1 }}>
                      {addingUser ? '⏳ جاري الإضافة...' : '✓ إنشاء الحساب'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <KeyboardShortcuts
        onSearch={() => setSearchOpen(true)}
        onNewVehicle={() => { setActiveTab('vehicles'); setShowVehicleForm(true) }}
        onSwitchTab={(tab) => setActiveTab(tab)}
        onToggleLang={switchLang}
        onToggleTheme={toggleTheme}
      />

      {/* Global Search */}
      <GlobalSearch
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        vehicles={vehicles}
        drivers={drivers}
        maintenance={maintenance}
        fuelLogs={fuelLogs}
        onNavigate={(tab) => setActiveTab(tab)}
      />

      {/* Onboarding Tour (first visit) */}
      <OnboardingTour />

      {/* Floating Scroll Buttons */}
      <div style={{ position: 'fixed', [isRTL ? 'left' : 'right']: '16px', bottom: isMobile ? '80px' : '24px', display: 'flex', flexDirection: 'column', gap: '8px', zIndex: 50 }}>
        <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} title="إلى الأعلى" aria-label="scroll to top" style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#fff', border: `1.5px solid ${C.orange}`, color: C.orange, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 10px rgba(0,0,0,0.12)', transition: 'all 0.2s' }} onMouseEnter={e => { e.currentTarget.style.background = C.orange; e.currentTarget.style.color = '#fff' }} onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.color = C.orange }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15"/></svg>
        </button>
        <button onClick={() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })} title="إلى الأسفل" aria-label="scroll to bottom" style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#fff', border: `1.5px solid ${C.orange}`, color: C.orange, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 10px rgba(0,0,0,0.12)', transition: 'all 0.2s' }} onMouseEnter={e => { e.currentTarget.style.background = C.orange; e.currentTarget.style.color = '#fff' }} onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.color = C.orange }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
        </button>
      </div>

      {/* Mobile bottom nav */}
      {isMobile && (
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: C.white, borderTop: `2px solid ${C.border}`, display: 'flex', justifyContent: 'space-around', padding: '6px 0', zIndex: 15 }}>
          {navItems.filter(([id]) => !['users','audit','logins'].includes(id) || currentRole === 'admin').map(([id, icon, label]) => (
            <div key={id} onClick={() => setActiveTab(id)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1px', cursor: 'pointer', color: activeTab === id ? C.orange : C.muted, fontSize: '9px', fontWeight: activeTab === id ? '700' : '400', minWidth: '36px', position: 'relative' }}>
              <NavIcon name={icon} />
              <span>{label.split(' ')[0]}</span>
              {id === 'alerts' && criticalAlerts.length > 0 && <span style={{ position: 'absolute', top: '-2px', right: '2px', background: '#dc2626', color: '#fff', borderRadius: '50%', width: '13px', height: '13px', fontSize: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700' }}>{criticalAlerts.length}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
