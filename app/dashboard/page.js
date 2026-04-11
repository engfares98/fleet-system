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
  const statusColor = (s) => s === 'active' ? '#00ff88' : s === 'pending' ? '#ffb830' : '#ff3b5c'
  const statusLabel = (s) => s === 'active' ? 'نشط' : s === 'pending' ? 'معلق' : 'غير نشط'

  const st = {
    app: { minHeight: '100vh', background: '#080c14', fontFamily: 'Cairo, sans-serif', direction: 'rtl', display: 'flex' },
    sidebar: { width: '220px', background: '#0d1521', borderLeft: '1px solid #1a2a3f', display: 'flex', flexDirection: 'column', padding: '20px 0', position: 'fixed', right: 0, top: 0, height: '100vh', zIndex: 10 },
    logo: { padding: '0 20px 20px', borderBottom: '1px solid #1a2a3f', marginBottom: '16px' },
    logoIcon: { width: '44px', height: '44px', background: 'linear-gradient(135deg, #00d4ff, #0066ff)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', marginBottom: '8px' },
    navItem: (a) => ({ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 20px', cursor: 'pointer', fontSize: '13px', color: a ? '#00d4ff' : '#4a6a8a', background: a ? 'rgba(0,212,255,0.1)' : 'transparent', borderRight: a ? '3px solid #00d4ff' : '3px solid transparent' }),
    main: { marginRight: '220px', flex: 1, padding: '24px' },
    header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' },
    title: { color: '#e8f4ff', fontSize: '20px', fontWeight: '700' },
    btn: (c) => ({ background: c || '#00d4ff', color: c ? '#fff' : '#080c14', border: 'none', borderRadius: '8px', padding: '9px 16px', fontSize: '13px', fontWeight: '700', fontFamily: 'Cairo, sans-serif', cursor: 'pointer' }),
    card: { background: '#0d1521', border: '1px solid #1a2a3f', borderRadius: '14px', padding: '20px' },
    kpiGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' },
    table: { width: '100%', borderCollapse: 'collapse' },
    th: { padding: '12px', textAlign: 'right', color: '#4a6a8a', fontSize: '12px', borderBottom: '1px solid #1a2a3f' },
    td: { padding: '12px', color: '#e8f4ff', fontSize: '13px', borderBottom: '1px solid #111c2d' },
    badge: (c) => ({ background: c + '20', color: c, padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '600' }),
    modal: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 },
    modalBox: { background: '#0d1521', border: '1px solid #1a2a3f', borderRadius: '16px', padding: '30px', width: '560px', maxHeight: '90vh', overflowY: 'auto' },
    input: { width: '100%', padding: '10px 14px', background: '#111c2d', border: '1px solid #1a2a3f', borderRadius: '8px', color: '#e8f4ff', fontSize: '13px', fontFamily: 'Cairo, sans-serif', outline: 'none', boxSizing: 'border-box' },
    label: { color: '#4a6a8a', fontSize: '12px', display: 'block', marginBottom: '6px' },
    formGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' },
    sectionTitle: { color: '#00d4ff', fontSize: '13px', fontWeight: '700', margin: '16px 0 10px', borderBottom: '1px solid #1a2a3f', paddingBottom: '6px' },
    thumb: { width: '40px', height: '40px', borderRadius: '6px', objectFit: 'cover', cursor: 'pointer', border: '1px solid #1a2a3f' },
    imgLink: { color: '#00d4ff', fontSize: '11px', cursor: 'pointer', textDecoration: 'underline' },
  }

  const FileInput = ({ label, icon, onChange, file }) => (
    <div>
      <label style={st.label}>{icon} {label}</label>
      <label style={{ width: '100%', padding: '10px', background: '#111c2d', border: `2px dashed ${file ? '#00d4ff' : '#1a2a3f'}`, borderRadius: '8px', color: file ? '#00d4ff' : '#4a6a8a', fontSize: '12px', cursor: 'pointer', textAlign: 'center', display: 'block', boxSizing: 'border-box' }}>
        {file ? `✅ ${file.name}` : `اضغط لرفع ${label}`}
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
          <div onClick={e => e.stopPropagation()} style={{ background: '#0d1521', borderRadius: '12px', padding: '16px', maxWidth: '90vw' }}>
            <img src={previewImage} style={{ maxWidth: '80vw', maxHeight: '80vh', borderRadius: '8px' }} alt="preview" />
            <div style={{ textAlign: 'center', marginTop: '12px' }}>
              <button style={st.btn('#4a6a8a')} onClick={() => setPreviewImage(null)}>إغلاق</button>
            </div>
          </div>
        </div>
      )}

      {/* Sidebar */}
      <div style={st.sidebar}>
        <div style={st.logo}>
          <div style={st.logoIcon}>🚛</div>
          <div style={{ color: '#e8f4ff', fontSize: '14px', fontWeight: '700' }}>أسطولي</div>
          <div style={{ color: '#4a6a8a', fontSize: '11px' }}>إدارة المركبات</div>
        </div>
        {[['dashboard','📊','لوحة التحكم'],['vehicles','🚛','المركبات'],['drivers','👤','السائقون'],['maintenance','🔧','الصيانة'],['fuel','⛽','الوقود']].map(([id,icon,label]) => (
          <div key={id} style={st.navItem(activeTab === id)} onClick={() => setActiveTab(id)}>
            <span>{icon}</span><span>{label}</span>
          </div>
        ))}
        <div style={{ flex: 1 }} />
        <div style={{ padding: '16px 20px', borderTop: '1px solid #1a2a3f' }}>
          <button onClick={handleLogout} style={{ ...st.btn('#ff3b5c'), width: '100%' }}>تسجيل الخروج</button>
        </div>
      </div>

      {/* Main */}
      <div style={st.main}>

        {activeTab === 'dashboard' && (
          <div>
            <div style={st.header}><div style={st.title}>📊 لوحة التحكم</div></div>
            <div style={st.kpiGrid}>
              {[['🚛','المركبات',vehicles.length,'#00d4ff'],['👤','السائقون',drivers.length,'#00ff88'],['🔧','الصيانة',maintenance.length,'#ffb830'],['⛽','تكلفة الوقود',totalFuelCost.toFixed(0)+' ر.س','#ff6b35']].map(([icon,label,val,color]) => (
                <div key={label} style={st.card}>
                  <div style={{ color: '#4a6a8a', fontSize: '12px', marginBottom: '8px' }}>{icon} {label}</div>
                  <div style={{ fontFamily: 'monospace', fontSize: '32px', fontWeight: '700', color }}>{val}</div>
                </div>
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div style={st.card}>
                <div style={{ color: '#e8f4ff', fontWeight: '700', marginBottom: '16px' }}>🚛 آخر المركبات</div>
                {vehicles.slice(0,5).map(v => (
                  <div key={v.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #111c2d' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      {v.vehicle_image && <img src={v.vehicle_image} style={st.thumb} onClick={() => setPreviewImage(v.vehicle_image)} alt="" />}
                      <div>
                        <div style={{ color: '#e8f4ff', fontSize: '13px' }}>{v.plate_number}</div>
                        {v.vehicle_code && <div style={{ color: '#4a6a8a', fontSize: '11px' }}>{v.vehicle_code}</div>}
                      </div>
                    </div>
                    <span style={st.badge(statusColor(v.status))}>{statusLabel(v.status)}</span>
                  </div>
                ))}
                {vehicles.length === 0 && <div style={{ color: '#4a6a8a', fontSize: '13px' }}>لا توجد مركبات</div>}
              </div>
              <div style={st.card}>
                <div style={{ color: '#e8f4ff', fontWeight: '700', marginBottom: '16px' }}>👤 آخر السائقين</div>
                {drivers.slice(0,5).map(d => (
                  <div key={d.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #111c2d' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      {d.iqama_image && <img src={d.iqama_image} style={st.thumb} onClick={() => setPreviewImage(d.iqama_image)} alt="" />}
                      <div style={{ color: '#e8f4ff', fontSize: '13px' }}>{d.full_name}</div>
                    </div>
                    <span style={st.badge(statusColor(d.status))}>{statusLabel(d.status)}</span>
                  </div>
                ))}
                {drivers.length === 0 && <div style={{ color: '#4a6a8a', fontSize: '13px' }}>لا يوجد سائقون</div>}
              </div>
            </div>
          </div>
        )}

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
                    <tr key={v.id}>
                      <td style={st.td}>{v.vehicle_image ? <img src={v.vehicle_image} style={st.thumb} onClick={() => setPreviewImage(v.vehicle_image)} alt="" /> : '—'}</td>
                      <td style={st.td}>{v.plate_number}</td>
                      <td style={st.td}>{v.vehicle_code || '—'}</td>
                      <td style={st.td}>{v.brand}</td>
                      <td style={st.td}>{v.model}</td>
                      <td style={st.td}>{v.year}</td>
                      <td style={st.td}><span style={st.badge(statusColor(v.status))}>{statusLabel(v.status)}</span></td>
                      <td style={st.td}>{v.istimara_image ? <span style={st.imgLink} onClick={() => setPreviewImage(v.istimara_image)}>عرض 📄</span> : '—'}</td>
                      <td style={st.td}><button onClick={() => deleteVehicle(v.id)} style={{ background: 'none', border: 'none', color: '#ff3b5c', cursor: 'pointer', fontSize: '16px' }}>🗑️</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {vehicles.length === 0 && <div style={{ color: '#4a6a8a', textAlign: 'center', padding: '40px' }}>لا توجد مركبات</div>}
            </div>
          </div>
        )}

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
                    <tr key={d.id}>
                      <td style={st.td}>{d.full_name}</td>
                      <td style={st.td}>{d.national_id}</td>
                      <td style={st.td}>{d.phone}</td>
                      <td style={st.td}>{d.license_number}</td>
                      <td style={st.td}>{d.license_expiry}</td>
                      <td style={st.td}>{d.iqama_image ? <span style={st.imgLink} onClick={() => setPreviewImage(d.iqama_image)}>عرض 🪪</span> : '—'}</td>
                      <td style={st.td}>{d.license_image ? <span style={st.imgLink} onClick={() => setPreviewImage(d.license_image)}>عرض 🚗</span> : '—'}</td>
                      <td style={st.td}><span style={st.badge(statusColor(d.status))}>{statusLabel(d.status)}</span></td>
                      <td style={st.td}><button onClick={() => deleteDriver(d.id)} style={{ background: 'none', border: 'none', color: '#ff3b5c', cursor: 'pointer', fontSize: '16px' }}>🗑️</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {drivers.length === 0 && <div style={{ color: '#4a6a8a', textAlign: 'center', padding: '40px' }}>لا يوجد سائقون</div>}
            </div>
          </div>
        )}

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
                    <tr key={m.id}>
                      <td style={st.td}>{m.vehicles?.plate_number}</td>
                      <td style={st.td}>{m.type}</td>
                      <td style={st.td}>{m.description}</td>
                      <td style={st.td}>{m.date}</td>
                      <td style={st.td}>{m.cost} ر.س</td>
                      <td style={st.td}>{m.next_date}</td>
                      <td style={st.td}><span style={st.badge(statusColor(m.status))}>{statusLabel(m.status)}</span></td>
                      <td style={st.td}><button onClick={() => deleteMaintenance(m.id)} style={{ background: 'none', border: 'none', color: '#ff3b5c', cursor: 'pointer', fontSize: '16px' }}>🗑️</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {maintenance.length === 0 && <div style={{ color: '#4a6a8a', textAlign: 'center', padding: '40px' }}>لا توجد سجلات صيانة</div>}
            </div>
          </div>
        )}

        {activeTab === 'fuel' && (
          <div>
            <div style={st.header}>
              <div style={st.title}>⛽ الوقود</div>
              <button style={st.btn()} onClick={() => setShowFuelForm(true)}>+ إضافة تزود وقود</button>
            </div>
            <div style={{ ...st.card, marginBottom: '16px', display: 'flex', gap: '32px' }}>
              <div><div style={{ color: '#4a6a8a', fontSize: '12px' }}>إجمالي التكلفة</div><div style={{ color: '#ff6b35', fontSize: '24px', fontWeight: '700' }}>{totalFuelCost.toFixed(2)} ر.س</div></div>
              <div><div style={{ color: '#4a6a8a', fontSize: '12px' }}>عدد السجلات</div><div style={{ color: '#00d4ff', fontSize: '24px', fontWeight: '700' }}>{fuelLogs.length}</div></div>
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
                    <tr key={f.id}>
                      <td style={st.td}>{f.vehicles?.plate_number}</td>
                      <td style={st.td}>{f.drivers?.full_name}</td>
                      <td style={st.td}>{f.date}</td>
                      <td style={st.td}>{f.liters}</td>
                      <td style={st.td}>{f.cost_per_liter}</td>
                      <td style={st.td}>{f.total_cost} ر.س</td>
                      <td style={st.td}>{f.odometer} كم</td>
                      <td style={st.td}><button onClick={() => deleteFuel(f.id)} style={{ background: 'none', border: 'none', color: '#ff3b5c', cursor: 'pointer', fontSize: '16px' }}>🗑️</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {fuelLogs.length === 0 && <div style={{ color: '#4a6a8a', textAlign: 'center', padding: '40px' }}>لا توجد سجلات وقود</div>}
            </div>
          </div>
        )}
      </div>

      {/* Vehicle Modal */}
      {showVehicleForm && (
        <div style={st.modal}>
          <div style={st.modalBox}>
            <div style={{ color: '#e8f4ff', fontSize: '16px', fontWeight: '700', marginBottom: '20px' }}>🚛 إضافة مركبة جديدة</div>
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
              <button style={st.btn()} onClick={addVehicle} disabled={uploading}>{uploading ? 'جاري الرفع...' : 'حفظ'}</button>
              <button style={st.btn('#4a6a8a')} onClick={() => setShowVehicleForm(false)}>إلغاء</button>
            </div>
          </div>
        </div>
      )}

      {/* Driver Modal */}
      {showDriverForm && (
        <div style={st.modal}>
          <div style={st.modalBox}>
            <div style={{ color: '#e8f4ff', fontSize: '16px', fontWeight: '700', marginBottom: '20px' }}>👤 إضافة سائق جديد</div>
            <div style={st.sectionTitle}>📋 البيانات الأساسية</div>
            <div style={st.formGrid}>
              {[['full_name','الاسم الكامل'],['national_id','رقم الهوية'],['phone','رقم الجوال'],['license_number','رقم الرخصة']].map(([key,label]) => (
                <div key={key}>
                  <label style={st.label}>{label}</label>
                  <input style={st.input} value={driverForm[key]} onChange={e => setDriverForm({...driverForm,[key]:e.target.value})} />
                </div>
              ))}
              <div>
                <label style={st.label}>انتهاء الرخصة</label>
                <input type="date" style={st.input} value={driverForm.license_expiry} onChange={e => setDriverForm({...driverForm,license_expiry:e.target.value})} />
              </div>
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
              <button style={st.btn()} onClick={addDriver} disabled={uploading}>{uploading ? 'جاري الرفع...' : 'حفظ'}</button>
              <button style={st.btn('#4a6a8a')} onClick={() => setShowDriverForm(false)}>إلغاء</button>
            </div>
          </div>
        </div>
      )}

      {/* Maintenance Modal */}
      {showMaintenanceForm && (
        <div style={st.modal}>
          <div style={st.modalBox}>
            <div style={{ color: '#e8f4ff', fontSize: '16px', fontWeight: '700', marginBottom: '20px' }}>🔧 إضافة صيانة</div>
            <div style={st.formGrid}>
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
              <button style={st.btn('#4a6a8a')} onClick={() => setShowMaintenanceForm(false)}>إلغاء</button>
            </div>
          </div>
        </div>
      )}

      {/* Fuel Modal */}
      {showFuelForm && (
        <div style={st.modal}>
          <div style={st.modalBox}>
            <div style={{ color: '#e8f4ff', fontSize: '16px', fontWeight: '700', marginBottom: '20px' }}>⛽ إضافة تزود وقود</div>
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
              <button style={st.btn('#4a6a8a')} onClick={() => setShowFuelForm(false)}>إلغاء</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
