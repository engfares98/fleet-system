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

  const [showVehicleForm, setShowVehicleForm] = useState(false)
  const [vehicleForm, setVehicleForm] = useState({ plate_number: '', vehicle_code: '', type: '', brand: '', model: '', year: '', color: '', status: 'active', fuel_type: '' })
  const [vehicleImage, setVehicleImage] = useState(null)
  const [istamaraImage, setIstamaraImage] = useState(null)

  const [showDriverForm, setShowDriverForm] = useState(false)
  const [driverForm, setDriverForm] = useState({ full_name: '', national_id: '', phone: '', license_number: '', license_expiry: '', status: 'active' })
  const [iqamaImage, setIqamaImage] = useState(null)
  const [licenseImage, setLicenseImage] = useState(null)

  const [showMaintenanceForm, setShowMaintenanceForm] = useState(false)
  const [maintenanceForm, setMaintenanceForm] = useState({ vehicle_id: '', type: '', description: '', date: '', cost: '', next_date: '', status: 'pending' })

  const [showFuelForm, setShowFuelForm] = useState(false)
  const [fuelForm, setFuelForm] = useState({ vehicle_id: '', driver_id: '', date: '', liters: '', cost_per_liter: '', odometer: '' })

  const [previewImage, setPreviewImage] = useState(null)

  useEffect(() => { checkAuth(); fetchData() }, [])

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
    setVehicles(v.data || [])
    setDrivers(d.data || [])
    setMaintenance(m.data || [])
    setFuelLogs(f.data || [])
  }

  const uploadFile = async (file, folder) => {
    if (!file) return null
    const ext = file.name.split('.').pop()
    const fileName = `${folder}/${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('fleet-files').upload(fileName, file)
    if (error) return null
    const { data } = supabase.storage.from('fleet-files').getPublicUrl(fileName)
    return data.publicUrl
  }

  const addVehicle = async () => {
    setUploading(true)
    const vehicle_image = await uploadFile(vehicleImage, 'vehicles')
    const istimara_image = await uploadFile(istamaraImage, 'istimara')
    await supabase.from('vehicles').insert([{ ...vehicleForm, vehicle_image, istimara_image }])
    setShowVehicleForm(false)
    setVehicleForm({ plate_number: '', vehicle_code: '', type: '', brand: '', model: '', year: '', color: '', status: 'active', fuel_type: '' })
    setVehicleImage(null); setIstamaraImage(null)
    setUploading(false); fetchData()
  }

  const addDriver = async () => {
    setUploading(true)
    const iqama_image = await uploadFile(iqamaImage, 'iqama')
    const license_image = await uploadFile(licenseImage, 'licenses')
    await supabase.from('drivers').insert([{ ...driverForm, iqama_image, license_image }])
    setShowDriverForm(false)
    setDriverForm({ full_name: '', national_id: '', phone: '', license_number: '', license_expiry: '', status: 'active' })
    setIqamaImage(null); setLicenseImage(null)
    setUploading(false); fetchData()
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

  const deleteVehicle = async (id) => { await supabase.from('vehicles').delete().eq('id', id); fetchData() }
  const deleteDriver = async (id) => { await supabase.from('drivers').delete().eq('id', id); fetchData() }
  const deleteMaintenance = async (id) => { await supabase.from('maintenance').delete().eq('id', id); fetchData() }
  const deleteFuel = async (id) => { await supabase.from('fuel_logs').delete().eq('id', id); fetchData() }
  const handleLogout = async () => { await supabase.auth.signOut(); window.location.href = '/' }

  const totalFuelCost = fuelLogs.reduce((a, b) => a + (b.total_cost || 0), 0)
  const statusColor = (s) => s === 'active' ? '#16a34a' : s === 'pending' ? '#d97706' : '#dc2626'
  const statusBg = (s) => s === 'active' ? '#f0fdf4' : s === 'pending' ? '#fffbeb' : '#fef2f2'
  const statusLabel = (s) => s === 'active' ? 'نشط' : s === 'pending' ? 'معلق' : 'غير نشط'

  const C = {
    orange: '#ff6b00',
    orangeLight: '#fff7f2',
    orangeBorder: 'rgba(255,107,0,0.15)',
    white: '#fff',
    gray: '#f8f9fa',
    text: '#1a1a1a',
    muted: '#888',
    border: '#e8e8e8',
  }

  const st = {
    app: { minHeight: '100vh', background: C.gray, fontFamily: 'Cairo, sans-serif', direction: 'rtl', display: 'flex', flexDirection: 'column' },
    topbar: { background: C.white, borderBottom: `3px solid ${C.orange}`, padding: '10px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 2px 12px rgba(255,107,0,0.08)', position: 'sticky', top: 0, zIndex: 20 },
    body: { display: 'flex', flex: 1 },
    sidebar: { width: '220px', background: C.white, borderLeft: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', padding: '16px 0', position: 'sticky', top: '63px', height: 'calc(100vh - 63px)', overflowY: 'auto' },
    navItem: (a) => ({ display: 'flex', alignItems: 'center', gap: '10px', padding: '11px 20px', cursor: 'pointer', fontSize: '13px', fontWeight: a ? '700' : '400', color: a ? C.orange : C.muted, background: a ? C.orangeLight : 'transparent', borderRight: a ? `3px solid ${C.orange}` : '3px solid transparent', transition: 'all 0.15s' }),
    main: { flex: 1, padding: '24px', overflowX: 'auto' },
    header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' },
    title: { color: C.text, fontSize: '19px', fontWeight: '800' },
    btn: (c, outline) => ({ background: outline ? C.white : (c || C.orange), color: outline ? (c || C.orange) : C.white, border: `2px solid ${c || C.orange}`, borderRadius: '9px', padding: '9px 18px', fontSize: '13px', fontWeight: '700', fontFamily: 'Cairo, sans-serif', cursor: 'pointer', transition: 'all 0.15s' }),
    card: { background: C.white, border: `1px solid ${C.border}`, borderRadius: '14px', padding: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' },
    kpiGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '20px' },
    kpiCard: (c) => ({ background: C.white, border: `1px solid ${C.border}`, borderRadius: '14px', padding: '20px', borderTop: `4px solid ${c}`, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }),
    table: { width: '100%', borderCollapse: 'collapse' },
    th: { padding: '12px 14px', textAlign: 'right', color: C.muted, fontSize: '12px', fontWeight: '600', borderBottom: `2px solid ${C.border}`, background: '#fafafa' },
    td: { padding: '12px 14px', color: C.text, fontSize: '13px', borderBottom: `1px solid ${C.border}` },
    badge: (s) => ({ background: statusBg(s), color: statusColor(s), padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '700', display: 'inline-block' }),
    modal: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 },
    modalBox: { background: C.white, borderRadius: '18px', padding: '32px', width: '580px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 24px 60px rgba(0,0,0,0.15)' },
    input: { width: '100%', padding: '10px 14px', background: '#fafafa', border: `1.5px solid ${C.border}`, borderRadius: '8px', color: C.text, fontSize: '13px', fontFamily: 'Cairo, sans-serif', outline: 'none', boxSizing: 'border-box' },
    label: { color: '#555', fontSize: '12px', fontWeight: '600', display: 'block', marginBottom: '6px' },
    formGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' },
    sectionTitle: { color: C.orange, fontSize: '13px', fontWeight: '700', margin: '18px 0 10px', borderBottom: `2px solid ${C.orangeBorder}`, paddingBottom: '6px' },
    thumb: { width: '38px', height: '38px', borderRadius: '8px', objectFit: 'cover', cursor: 'pointer', border: `1px solid ${C.border}` },
    imgLink: { color: C.orange, fontSize: '12px', cursor: 'pointer', fontWeight: '600' },
  }

  const FileInput = ({ label, icon, onChange, file }) => (
    <div>
      <label style={st.label}>{icon} {label}</label>
      <label style={{ width: '100%', padding: '12px', background: file ? '#fff7f2' : '#fafafa', border: `2px dashed ${file ? C.orange : C.border}`, borderRadius: '8px', color: file ? C.orange : C.muted, fontSize: '12px', cursor: 'pointer', textAlign: 'center', display: 'block', boxSizing: 'border-box', fontWeight: '600' }}>
        {file ? `✅ ${file.name}` : `📎 اضغط لرفع ${label}`}
        <input type="file" accept="image/*,.pdf" style={{ display: 'none' }} onChange={e => onChange(e.target.files[0])} />
      </label>
    </div>
  )

  return (
    <div style={st.app}>
      <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&display=swap" rel="stylesheet" />

      {/* Image Preview */}
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

      {/* Top Bar */}
      <div style={st.topbar}>
        <img src="/logo-madinah.jpeg" alt="أمانة المدينة المنورة" style={{ height: '50px', objectFit: 'contain' }} />
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '15px', fontWeight: '900', color: C.orange }}>أسطول مشاريع نظافة المدينة المنورة</div>
          <div style={{ fontSize: '11px', color: C.muted }}>Cleaning Fleet Management System</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <img src="/logo-mag.jpeg" alt="MAG" style={{ height: '40px', objectFit: 'contain' }} />
          <button onClick={handleLogout} style={st.btn('#dc2626', true)}>خروج</button>
        </div>
      </div>

      <div style={st.body}>
        {/* Sidebar */}
        <div style={st.sidebar}>
          {[['dashboard','📊','لوحة التحكم'],['vehicles','🚛','المركبات'],['drivers','👤','السائقون'],['maintenance','🔧','الصيانة'],['fuel','⛽','الوقود']].map(([id,icon,label]) => (
            <div key={id} style={st.navItem(activeTab === id)} onClick={() => setActiveTab(id)}>
              <span style={{ fontSize: '17px' }}>{icon}</span><span>{label}</span>
            </div>
          ))}
        </div>

        {/* Main */}
        <div style={st.main}>

          {/* Dashboard */}
          {activeTab === 'dashboard' && (
            <div>
              <div style={st.header}><div style={st.title}>📊 لوحة التحكم</div></div>
              <div style={st.kpiGrid}>
                {[['🚛','المركبات',vehicles.length,'#ff6b00'],['👤','السائقون',drivers.length,'#16a34a'],['🔧','الصيانة',maintenance.length,'#d97706'],['⛽','تكلفة الوقود',totalFuelCost.toFixed(0)+' ر.س','#7c3aed']].map(([icon,label,val,color]) => (
                  <div key={label} style={st.kpiCard(color)}>
                    <div style={{ color: C.muted, fontSize: '12px', marginBottom: '8px', fontWeight: '600' }}>{icon} {label}</div>
                    <div style={{ fontSize: '32px', fontWeight: '900', color }}>{val}</div>
                  </div>
                ))}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div style={st.card}>
                  <div style={{ color: C.text, fontWeight: '800', marginBottom: '16px', fontSize: '14px' }}>🚛 آخر المركبات</div>
                  {vehicles.slice(0,5).map(v => (
                    <div key={v.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: `1px solid ${C.border}` }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {v.vehicle_image && <img src={v.vehicle_image} style={st.thumb} onClick={() => setPreviewImage(v.vehicle_image)} alt="" />}
                        <div>
                          <div style={{ color: C.text, fontSize: '13px', fontWeight: '600' }}>{v.plate_number}</div>
                          {v.vehicle_code && <div style={{ color: C.muted, fontSize: '11px' }}>{v.vehicle_code}</div>}
                        </div>
                      </div>
                      <span style={st.badge(v.status)}>{statusLabel(v.status)}</span>
                    </div>
                  ))}
                  {vehicles.length === 0 && <div style={{ color: C.muted, fontSize: '13px', textAlign: 'center', padding: '20px' }}>لا توجد مركبات</div>}
                </div>
                <div style={st.card}>
                  <div style={{ color: C.text, fontWeight: '800', marginBottom: '16px', fontSize: '14px' }}>👤 آخر السائقين</div>
                  {drivers.slice(0,5).map(d => (
                    <div key={d.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: `1px solid ${C.border}` }}>
                      <div style={{ color: C.text, fontSize: '13px', fontWeight: '600' }}>{d.full_name}</div>
                      <span style={st.badge(d.status)}>{statusLabel(d.status)}</span>
                    </div>
                  ))}
                  {drivers.length === 0 && <div style={{ color: C.muted, fontSize: '13px', textAlign: 'center', padding: '20px' }}>لا يوجد سائقون</div>}
                </div>
              </div>
            </div>
          )}

          {/* Vehicles */}
          {activeTab === 'vehicles' && (
            <div>
              <div style={st.header}>
                <div style={st.title}>🚛 المركبات</div>
                <button style={st.btn()} onClick={() => setShowVehicleForm(true)}>+ إضافة مركبة</button>
              </div>
              <div style={st.card}>
                <table style={st.table}>
                  <thead><tr>
                    <th style={st.th}>صورة</th><th style={st.th}>رقم اللوحة</th><th style={st.th}>كود المركبة</th>
                    <th style={st.th}>الماركة</th><th style={st.th}>الموديل</th><th style={st.th}>السنة</th>
                    <th style={st.th}>الحالة</th><th style={st.th}>الاستمارة</th><th style={st.th}>حذف</th>
                  </tr></thead>
                  <tbody>
                    {vehicles.map(v => (
                      <tr key={v.id} style={{ transition: 'background 0.1s' }} onMouseEnter={e => e.currentTarget.style.background='#fff7f2'} onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                        <td style={st.td}>{v.vehicle_image ? <img src={v.vehicle_image} style={st.thumb} onClick={() => setPreviewImage(v.vehicle_image)} alt="" /> : '—'}</td>
                        <td style={{ ...st.td, fontWeight: '700' }}>{v.plate_number}</td>
                        <td style={st.td}>{v.vehicle_code || '—'}</td>
                        <td style={st.td}>{v.brand}</td>
                        <td style={st.td}>{v.model}</td>
                        <td style={st.td}>{v.year}</td>
                        <td style={st.td}><span style={st.badge(v.status)}>{statusLabel(v.status)}</span></td>
                        <td style={st.td}>{v.istimara_image ? <span style={st.imgLink} onClick={() => setPreviewImage(v.istimara_image)}>عرض 📄</span> : '—'}</td>
                        <td style={st.td}><button onClick={() => deleteVehicle(v.id)} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: '16px' }}>🗑️</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {vehicles.length === 0 && <div style={{ color: C.muted, textAlign: 'center', padding: '40px' }}>لا توجد مركبات — اضغط إضافة مركبة</div>}
              </div>
            </div>
          )}

          {/* Drivers */}
          {activeTab === 'drivers' && (
            <div>
              <div style={st.header}>
                <div style={st.title}>👤 السائقون</div>
                <button style={st.btn()} onClick={() => setShowDriverForm(true)}>+ إضافة سائق</button>
              </div>
              <div style={st.card}>
                <table style={st.table}>
                  <thead><tr>
                    <th style={st.th}>الاسم</th><th style={st.th}>الهوية</th><th style={st.th}>الجوال</th>
                    <th style={st.th}>رقم الرخصة</th><th style={st.th}>انتهاء الرخصة</th>
                    <th style={st.th}>الإقامة</th><th style={st.th}>الرخصة</th>
                    <th style={st.th}>الحالة</th><th style={st.th}>حذف</th>
                  </tr></thead>
                  <tbody>
                    {drivers.map(d => (
                      <tr key={d.id} onMouseEnter={e => e.currentTarget.style.background='#fff7f2'} onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                        <td style={{ ...st.td, fontWeight: '700' }}>{d.full_name}</td>
                        <td style={st.td}>{d.national_id}</td>
                        <td style={st.td}>{d.phone}</td>
                        <td style={st.td}>{d.license_number}</td>
                        <td style={st.td}>{d.license_expiry}</td>
                        <td style={st.td}>{d.iqama_image ? <span style={st.imgLink} onClick={() => setPreviewImage(d.iqama_image)}>عرض 🪪</span> : '—'}</td>
                        <td style={st.td}>{d.license_image ? <span style={st.imgLink} onClick={() => setPreviewImage(d.license_image)}>عرض 🚗</span> : '—'}</td>
                        <td style={st.td}><span style={st.badge(d.status)}>{statusLabel(d.status)}</span></td>
                        <td style={st.td}><button onClick={() => deleteDriver(d.id)} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: '16px' }}>🗑️</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {drivers.length === 0 && <div style={{ color: C.muted, textAlign: 'center', padding: '40px' }}>لا يوجد سائقون</div>}
              </div>
            </div>
          )}

          {/* Maintenance */}
          {activeTab === 'maintenance' && (
            <div>
              <div style={st.header}>
                <div style={st.title}>🔧 الصيانة</div>
                <button style={st.btn()} onClick={() => setShowMaintenanceForm(true)}>+ إضافة صيانة</button>
              </div>
              <div style={st.card}>
                <table style={st.table}>
                  <thead><tr>
                    <th style={st.th}>المركبة</th><th style={st.th}>النوع</th><th style={st.th}>الوصف</th>
                    <th style={st.th}>التاريخ</th><th style={st.th}>التكلفة</th><th style={st.th}>الموعد القادم</th>
                    <th style={st.th}>الحالة</th><th style={st.th}>حذف</th>
                  </tr></thead>
                  <tbody>
                    {maintenance.map(m => (
                      <tr key={m.id} onMouseEnter={e => e.currentTarget.style.background='#fff7f2'} onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                        <td style={{ ...st.td, fontWeight: '700' }}>{m.vehicles?.plate_number}</td>
                        <td style={st.td}>{m.type}</td>
                        <td style={st.td}>{m.description}</td>
                        <td style={st.td}>{m.date}</td>
                        <td style={st.td}><span style={{ color: C.orange, fontWeight: '700' }}>{m.cost} ر.س</span></td>
                        <td style={st.td}>{m.next_date}</td>
                        <td style={st.td}><span style={st.badge(m.status)}>{statusLabel(m.status)}</span></td>
                        <td style={st.td}><button onClick={() => deleteMaintenance(m.id)} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: '16px' }}>🗑️</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {maintenance.length === 0 && <div style={{ color: C.muted, textAlign: 'center', padding: '40px' }}>لا توجد سجلات صيانة</div>}
              </div>
            </div>
          )}

          {/* Fuel */}
          {activeTab === 'fuel' && (
            <div>
              <div style={st.header}>
                <div style={st.title}>⛽ الوقود</div>
                <button style={st.btn()} onClick={() => setShowFuelForm(true)}>+ إضافة تزود وقود</button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div style={st.kpiCard('#ff6b00')}>
                  <div style={{ color: C.muted, fontSize: '12px', fontWeight: '600' }}>⛽ إجمالي التكلفة</div>
                  <div style={{ fontSize: '28px', fontWeight: '900', color: '#ff6b00' }}>{totalFuelCost.toFixed(2)} ر.س</div>
                </div>
                <div style={st.kpiCard('#7c3aed')}>
                  <div style={{ color: C.muted, fontSize: '12px', fontWeight: '600' }}>📋 عدد السجلات</div>
                  <div style={{ fontSize: '28px', fontWeight: '900', color: '#7c3aed' }}>{fuelLogs.length}</div>
                </div>
              </div>
              <div style={st.card}>
                <table style={st.table}>
                  <thead><tr>
                    <th style={st.th}>المركبة</th><th style={st.th}>السائق</th><th style={st.th}>التاريخ</th>
                    <th style={st.th}>اللترات</th><th style={st.th}>سعر اللتر</th><th style={st.th}>الإجمالي</th>
                    <th style={st.th}>العداد</th><th style={st.th}>حذف</th>
                  </tr></thead>
                  <tbody>
                    {fuelLogs.map(f => (
                      <tr key={f.id} onMouseEnter={e => e.currentTarget.style.background='#fff7f2'} onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                        <td style={{ ...st.td, fontWeight: '700' }}>{f.vehicles?.plate_number}</td>
                        <td style={st.td}>{f.drivers?.full_name}</td>
                        <td style={st.td}>{f.date}</td>
                        <td style={st.td}>{f.liters}</td>
                        <td style={st.td}>{f.cost_per_liter}</td>
                        <td style={st.td}><span style={{ color: C.orange, fontWeight: '700' }}>{f.total_cost} ر.س</span></td>
                        <td style={st.td}>{f.odometer} كم</td>
                        <td style={st.td}><button onClick={() => deleteFuel(f.id)} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: '16px' }}>🗑️</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {fuelLogs.length === 0 && <div style={{ color: C.muted, textAlign: 'center', padding: '40px' }}>لا توجد سجلات وقود</div>}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Vehicle Modal */}
      {showVehicleForm && (
        <div style={st.modal}>
          <div style={st.modalBox}>
            <div style={{ color: C.text, fontSize: '17px', fontWeight: '800', marginBottom: '4px' }}>🚛 إضافة مركبة جديدة</div>
            <div style={st.sectionTitle}>📋 البيانات الأساسية</div>
            <div style={st.formGrid}>
              {[['plate_number','رقم اللوحة'],['vehicle_code','كود المركبة'],['type','النوع'],['brand','الماركة'],['model','الموديل'],['year','السنة'],['color','اللون'],['fuel_type','نوع الوقود']].map(([key,label]) => (
                <div key={key}>
                  <label style={st.label}>{label}</label>
                  <input style={st.input} value={vehicleForm[key]} onChange={e => setVehicleForm({...vehicleForm,[key]:e.target.value})} />
                </div>
              ))}
              <div>
                <label style={st.label}>الحالة</label>
                <select style={st.input} value={vehicleForm.status} onChange={e => setVehicleForm({...vehicleForm,status:e.target.value})}>
                  <option value="active">نشط</option><option value="inactive">غير نشط</option><option value="pending">معلق</option>
                </select>
              </div>
            </div>
            <div style={st.sectionTitle}>📸 الصور والمستندات</div>
            <div style={st.formGrid}>
              <FileInput label="صورة المركبة" icon="🚛" onChange={setVehicleImage} file={vehicleImage} />
              <FileInput label="صورة الاستمارة" icon="📄" onChange={setIstamaraImage} file={istamaraImage} />
            </div>
            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button style={st.btn()} onClick={addVehicle} disabled={uploading}>{uploading ? '⏳ جاري الرفع...' : 'حفظ'}</button>
              <button style={st.btn('#888', true)} onClick={() => setShowVehicleForm(false)}>إلغاء</button>
            </div>
          </div>
        </div>
      )}

      {/* Driver Modal */}
      {showDriverForm && (
        <div style={st.modal}>
          <div style={st.modalBox}>
            <div style={{ color: C.text, fontSize: '17px', fontWeight: '800', marginBottom: '4px' }}>👤 إضافة سائق جديد</div>
            <div style={st.sectionTitle}>📋 البيانات الأساسية</div>
            <div style={st.formGrid}>
              {[['full_name','الاسم الكامل'],['national_id','رقم الهوية'],['phone','رقم الجوال'],['license_number','رقم الرخصة']].map(([key,label]) => (
                <div key={key}><label style={st.label}>{label}</label><input style={st.input} value={driverForm[key]} onChange={e => setDriverForm({...driverForm,[key]:e.target.value})} /></div>
              ))}
              <div><label style={st.label}>انتهاء الرخصة</label><input type="date" style={st.input} value={driverForm.license_expiry} onChange={e => setDriverForm({...driverForm,license_expiry:e.target.value})} /></div>
              <div>
                <label style={st.label}>الحالة</label>
                <select style={st.input} value={driverForm.status} onChange={e => setDriverForm({...driverForm,status:e.target.value})}>
                  <option value="active">نشط</option><option value="inactive">غير نشط</option>
                </select>
              </div>
            </div>
            <div style={st.sectionTitle}>📸 المستندات</div>
            <div style={st.formGrid}>
              <FileInput label="صورة الإقامة" icon="🪪" onChange={setIqamaImage} file={iqamaImage} />
              <FileInput label="صورة الرخصة" icon="🚗" onChange={setLicenseImage} file={licenseImage} />
            </div>
            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button style={st.btn()} onClick={addDriver} disabled={uploading}>{uploading ? '⏳ جاري الرفع...' : 'حفظ'}</button>
              <button style={st.btn('#888', true)} onClick={() => setShowDriverForm(false)}>إلغاء</button>
            </div>
          </div>
        </div>
      )}

      {/* Maintenance Modal */}
      {showMaintenanceForm && (
        <div style={st.modal}>
          <div style={st.modalBox}>
            <div style={{ color: C.text, fontSize: '17px', fontWeight: '800', marginBottom: '4px' }}>🔧 إضافة صيانة</div>
            <div style={st.formGrid} style={{ marginTop: '16px' }}>
              <div>
                <label style={st.label}>المركبة</label>
                <select style={st.input} value={maintenanceForm.vehicle_id} onChange={e => setMaintenanceForm({...maintenanceForm,vehicle_id:e.target.value})}>
                  <option value="">اختر مركبة</option>
                  {vehicles.map(v => <option key={v.id} value={v.id}>{v.plate_number}</option>)}
                </select>
              </div>
              {[['type','نوع الصيانة'],['description','الوصف'],['cost','التكلفة']].map(([key,label]) => (
                <div key={key}><label style={st.label}>{label}</label><input style={st.input} value={maintenanceForm[key]} onChange={e => setMaintenanceForm({...maintenanceForm,[key]:e.target.value})} /></div>
              ))}
              <div><label style={st.label}>التاريخ</label><input type="date" style={st.input} value={maintenanceForm.date} onChange={e => setMaintenanceForm({...maintenanceForm,date:e.target.value})} /></div>
              <div><label style={st.label}>الموعد القادم</label><input type="date" style={st.input} value={maintenanceForm.next_date} onChange={e => setMaintenanceForm({...maintenanceForm,next_date:e.target.value})} /></div>
              <div>
                <label style={st.label}>الحالة</label>
                <select style={st.input} value={maintenanceForm.status} onChange={e => setMaintenanceForm({...maintenanceForm,status:e.target.value})}>
                  <option value="pending">معلق</option><option value="active">مكتمل</option><option value="inactive">ملغي</option>
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button style={st.btn()} onClick={addMaintenance}>حفظ</button>
              <button style={st.btn('#888', true)} onClick={() => setShowMaintenanceForm(false)}>إلغاء</button>
            </div>
          </div>
        </div>
      )}

      {/* Fuel Modal */}
      {showFuelForm && (
        <div style={st.modal}>
          <div style={st.modalBox}>
            <div style={{ color: C.text, fontSize: '17px', fontWeight: '800', marginBottom: '16px' }}>⛽ إضافة تزود وقود</div>
            <div style={st.formGrid}>
              <div>
                <label style={st.label}>المركبة</label>
                <select style={st.input} value={fuelForm.vehicle_id} onChange={e => setFuelForm({...fuelForm,vehicle_id:e.target.value})}>
                  <option value="">اختر مركبة</option>
                  {vehicles.map(v => <option key={v.id} value={v.id}>{v.plate_number}</option>)}
                </select>
              </div>
              <div>
                <label style={st.label}>السائق</label>
                <select style={st.input} value={fuelForm.driver_id} onChange={e => setFuelForm({...fuelForm,driver_id:e.target.value})}>
                  <option value="">اختر سائق</option>
                  {drivers.map(d => <option key={d.id} value={d.id}>{d.full_name}</option>)}
                </select>
              </div>
              <div><label style={st.label}>التاريخ</label><input type="date" style={st.input} value={fuelForm.date} onChange={e => setFuelForm({...fuelForm,date:e.target.value})} /></div>
              {[['liters','اللترات'],['cost_per_liter','سعر اللتر'],['odometer','قراءة العداد']].map(([key,label]) => (
                <div key={key}><label style={st.label}>{label}</label><input type="number" style={st.input} value={fuelForm[key]} onChange={e => setFuelForm({...fuelForm,[key]:e.target.value})} /></div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button style={st.btn()} onClick={addFuel}>حفظ</button>
              <button style={st.btn('#888', true)} onClick={() => setShowFuelForm(false)}>إلغاء</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
