'use client'
import { useMemo } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
  BarChart, Bar,
  LineChart, Line,
} from 'recharts'

const monthLabel = (d) => {
  const months = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر']
  return months[d.getMonth()] + ' ' + d.getFullYear()
}

function StatCard({ icon, label, value, trend, color = '#ff6b00', subtitle }) {
  return (
    <div className="dash-card" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '18px', boxShadow: 'var(--shadow-sm)', position: 'relative' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
        <div style={{ width: '36px', height: '36px', borderRadius: '9px', background: `${color}1a`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>{icon}</div>
        {trend !== undefined && trend !== null && (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '11px', fontWeight: '700', color: trend >= 0 ? 'var(--success)' : 'var(--danger)', background: trend >= 0 ? 'var(--success-soft)' : 'var(--danger-soft)', padding: '3px 9px', borderRadius: '20px' }}>
            <span>{trend >= 0 ? '▲' : '▼'}</span>
            <span>{Math.abs(trend)}%</span>
          </div>
        )}
      </div>
      <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600', marginBottom: '4px' }}>{label}</div>
      <div style={{ fontSize: '26px', fontWeight: '800', color: 'var(--text)', letterSpacing: '-0.02em' }}>{value}</div>
      {subtitle && <div style={{ fontSize: '10px', color: 'var(--text-subtle)', marginTop: '4px' }}>{subtitle}</div>}
    </div>
  )
}

function ChartCard({ title, subtitle, children, action }) {
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '14px', padding: '20px', boxShadow: 'var(--shadow-sm)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
        <div>
          <div style={{ fontWeight: '800', fontSize: '14px', color: 'var(--text)' }}>{title}</div>
          {subtitle && <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{subtitle}</div>}
        </div>
        {action}
      </div>
      {children}
    </div>
  )
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', padding: '8px 12px', boxShadow: 'var(--shadow-md)', fontSize: '12px', fontFamily: 'Cairo, sans-serif' }}>
      <div style={{ fontWeight: '700', color: 'var(--text)', marginBottom: '4px' }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color, fontWeight: '600' }}>
          {p.name}: <strong>{Number(p.value).toLocaleString('ar')}</strong>
        </div>
      ))}
    </div>
  )
}

export default function InteractiveDashboard({ vehicles, drivers, maintenance, fuelLogs, alerts, t, isMobile }) {
  // Compute stats
  const stats = useMemo(() => {
    const activeVehicles = vehicles.filter(v => v.status === 'active').length
    const readyVehicles = vehicles.filter(v => v.preparation_status === 'ready').length
    const inProgress = vehicles.filter(v => v.preparation_status === 'in_progress').length
    const notReady = vehicles.filter(v => v.preparation_status === 'not_ready' || !v.preparation_status).length
    const activeDrivers = drivers.filter(d => d.status === 'active').length
    const totalFuelCost = fuelLogs.reduce((a, b) => a + (Number(b.total_cost) || 0), 0)
    const totalLiters = fuelLogs.reduce((a, b) => a + (Number(b.liters) || 0), 0)
    const totalMaintenance = maintenance.reduce((a, b) => a + (Number(b.cost) || 0), 0)

    // Last 6 months data
    const now = new Date()
    const months = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      months.push({ key, label: monthLabel(d), date: d })
    }

    const fuelByMonth = months.map(m => {
      const total = fuelLogs.filter(f => (f.date || '').startsWith(m.key)).reduce((a, b) => a + (Number(b.total_cost) || 0), 0)
      const liters = fuelLogs.filter(f => (f.date || '').startsWith(m.key)).reduce((a, b) => a + (Number(b.liters) || 0), 0)
      return { name: m.label.split(' ')[0], 'التكلفة': Math.round(total), 'اللترات': Math.round(liters) }
    })
    const maintByMonth = months.map(m => {
      const total = maintenance.filter(x => (x.date || '').startsWith(m.key)).reduce((a, b) => a + (Number(b.cost) || 0), 0)
      const count = maintenance.filter(x => (x.date || '').startsWith(m.key)).length
      return { name: m.label.split(' ')[0], 'التكلفة': Math.round(total), 'العدد': count }
    })

    // Trend: last month vs prior
    const lastMonth = fuelByMonth[fuelByMonth.length - 1]?.['التكلفة'] || 0
    const priorMonth = fuelByMonth[fuelByMonth.length - 2]?.['التكلفة'] || 0
    const fuelTrend = priorMonth ? Math.round(((lastMonth - priorMonth) / priorMonth) * 100) : null

    // Top 5 fuel consumers
    const fuelByVehicle = {}
    fuelLogs.forEach(f => {
      const key = f.vehicles?.plate_number || '?'
      fuelByVehicle[key] = (fuelByVehicle[key] || 0) + (Number(f.total_cost) || 0)
    })
    const topFuel = Object.entries(fuelByVehicle).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, value]) => ({ name, value: Math.round(value) }))

    // Region distribution
    const regionMap = { N: 'الشمال', S: 'الجنوب', E: 'الشرق', W: 'الغرب' }
    const byRegion = {}
    vehicles.forEach(v => {
      const code = (v.vehicle_code || '').toUpperCase()
      const r = regionMap[code[0]] || 'غير محدد'
      byRegion[r] = (byRegion[r] || 0) + 1
    })
    const regionData = Object.entries(byRegion).map(([name, value]) => ({ name, value }))

    // Status distribution
    const statusData = [
      { name: '✅ جاهزة', value: readyVehicles, color: '#16a34a' },
      { name: '🔄 قيد التجهيز', value: inProgress, color: '#d97706' },
      { name: '❌ غير جاهزة', value: notReady, color: '#dc2626' },
    ].filter(d => d.value > 0)

    // Insights
    const insights = []
    if (topFuel[0]) insights.push({ icon: '⛽', text: `أعلى مركبة استهلاكاً: <strong>${topFuel[0].name}</strong> بتكلفة <strong>${topFuel[0].value.toLocaleString('ar')} ر.س</strong>` })
    if (fuelTrend !== null && Math.abs(fuelTrend) > 5) {
      const dir = fuelTrend > 0 ? 'ارتفع' : 'انخفض'
      insights.push({ icon: fuelTrend > 0 ? '📈' : '📉', text: `استهلاك الوقود ${dir} <strong>${Math.abs(fuelTrend)}%</strong> مقارنة بالشهر السابق` })
    }
    const expiredLicenses = drivers.filter(d => {
      if (!d.license_expiry) return false
      return new Date(d.license_expiry) < new Date()
    }).length
    if (expiredLicenses > 0) insights.push({ icon: '⚠️', text: `<strong>${expiredLicenses}</strong> سائق برخصة منتهية الصلاحية` })
    const unreadyVehicles = notReady
    if (unreadyVehicles > 0) insights.push({ icon: '🔧', text: `<strong>${unreadyVehicles}</strong> مركبة غير جاهزة للتشغيل` })
    if (insights.length === 0) insights.push({ icon: '✨', text: 'كل الأنظمة تعمل بشكل ممتاز!' })

    return {
      activeVehicles, readyVehicles, totalVehicles: vehicles.length,
      activeDrivers, totalDrivers: drivers.length,
      totalFuelCost, totalLiters, totalMaintenance,
      alertsCount: alerts.length,
      fuelByMonth, maintByMonth,
      fuelTrend, lastMonth,
      topFuel, regionData, statusData,
      insights,
    }
  }, [vehicles, drivers, maintenance, fuelLogs, alerts])

  const PIE_COLORS = ['#ff6b00', '#2563eb', '#16a34a', '#7c3aed', '#d97706', '#dc2626']

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
      {/* Hero — clean overview panel */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-xl)', padding: isMobile ? '20px' : '26px 28px', boxShadow: 'var(--shadow-sm)', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '20px', borderLeft: '3px solid var(--accent)' }}>
        <div>
          <div style={{ display: 'inline-block', background: 'var(--accent-soft)', color: 'var(--accent)', padding: '4px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: '700', marginBottom: '12px' }}>نظام إدارة الأسطول</div>
          <div style={{ fontSize: isMobile ? '20px' : '26px', fontWeight: '800', color: 'var(--text)', marginBottom: '6px', letterSpacing: '-0.02em' }}>
            أهلاً بك في <span style={{ color: 'var(--accent)' }}>أسطولك الذكي</span>
          </div>
          <div style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.7' }}>
            {stats.totalVehicles.toLocaleString('ar')} مركبة · {stats.totalDrivers.toLocaleString('ar')} سائق · {stats.alertsCount.toLocaleString('ar')} تنبيه نشط
          </div>
        </div>
        <div style={{ display: 'flex', gap: '28px', flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '2px' }}>حالة الأسطول</div>
            <div style={{ fontSize: '22px', fontWeight: '800', color: 'var(--success)' }}>{Math.round((stats.readyVehicles / Math.max(stats.totalVehicles, 1)) * 100)}% جاهز</div>
          </div>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '2px' }}>تكلفة الشهر</div>
            <div style={{ fontSize: '22px', fontWeight: '800', color: 'var(--accent)' }}>{(stats.lastMonth || 0).toLocaleString('ar')} ر.س</div>
          </div>
        </div>
      </div>

      {/* Insights bar */}
      <div style={{ background: 'linear-gradient(135deg, var(--accent-soft), var(--surface))', border: '1px solid var(--border)', borderRadius: '14px', padding: '16px 20px', display: 'flex', flexWrap: 'wrap', gap: '14px', alignItems: 'center' }}>
        <div style={{ fontSize: '20px' }}>💡</div>
        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px' }}>
          {stats.insights.slice(0, 4).map((ins, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--text)' }}>
              <span>{ins.icon}</span>
              <span dangerouslySetInnerHTML={{ __html: ins.text }} />
            </div>
          ))}
        </div>
      </div>

      {/* Stats grid */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)', gap: '14px' }}>
        <StatCard icon="🚛" label="إجمالي المركبات" value={stats.totalVehicles.toLocaleString('ar')} color="#ff6b00" subtitle={`${stats.activeVehicles} نشطة · ${stats.readyVehicles} جاهزة`} />
        <StatCard icon="👤" label="السائقون" value={stats.totalDrivers.toLocaleString('ar')} color="#2563eb" subtitle={`${stats.activeDrivers} نشطون`} />
        <StatCard icon="⛽" label="تكلفة الوقود الشهر" value={`${(stats.lastMonth || 0).toLocaleString('ar')} ر.س`} color="#16a34a" trend={stats.fuelTrend} />
        <StatCard icon="🔔" label="التنبيهات النشطة" value={stats.alertsCount.toLocaleString('ar')} color="#dc2626" subtitle={stats.alertsCount === 0 ? 'لا توجد تنبيهات' : 'تحتاج مراجعة'} />
      </div>

      {/* Charts grid */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '2fr 1fr', gap: '14px' }}>
        {/* Fuel trend */}
        <ChartCard title="📈 استهلاك الوقود — آخر 6 أشهر" subtitle="التكلفة بالريال السعودي">
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={stats.fuelByMonth}>
              <defs>
                <linearGradient id="fuelGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ff6b00" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#ff6b00" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} stroke="var(--border)" />
              <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} stroke="var(--border)" />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="التكلفة" stroke="#ff6b00" strokeWidth={2.5} fill="url(#fuelGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Vehicles status pie */}
        <ChartCard title="🎯 جاهزية المركبات" subtitle="حالة التجهيز">
          {stats.statusData.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)', fontSize: '12px' }}>لا توجد بيانات</div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={stats.statusData} dataKey="value" nameKey="name" cx="50%" cy="45%" innerRadius={50} outerRadius={85} paddingAngle={3}>
                  {stats.statusData.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11, fontFamily: 'Cairo, sans-serif' }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '14px' }}>
        {/* Top 5 vehicles by fuel */}
        <ChartCard title="🥇 أعلى 5 مركبات استهلاكاً للوقود" subtitle="التكلفة الكلية">
          {stats.topFuel.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)', fontSize: '12px' }}>لا توجد بيانات</div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={stats.topFuel} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis type="number" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} stroke="var(--border)" />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} width={80} stroke="var(--border)" />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" fill="#ff6b00" radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        {/* Maintenance trend */}
        <ChartCard title="🔧 تكلفة الصيانة الشهرية" subtitle="آخر 6 أشهر">
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={stats.maintByMonth}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} stroke="var(--border)" />
              <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} stroke="var(--border)" />
              <Tooltip content={<CustomTooltip />} />
              <Line type="monotone" dataKey="التكلفة" stroke="#d97706" strokeWidth={2.5} dot={{ r: 4, fill: '#d97706' }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Region distribution */}
      {stats.regionData.length > 0 && (
        <ChartCard title="🗺️ توزيع المركبات حسب المنطقة" subtitle="حسب أول حرف من كود المركبة">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={stats.regionData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} stroke="var(--border)" />
              <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} stroke="var(--border)" />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                {stats.regionData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      )}
    </div>
  )
}
