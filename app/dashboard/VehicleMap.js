'use client'
import { useEffect, useRef, useState, useMemo } from 'react'

// Madinah Al-Munawwarah center coordinates
const MADINAH_CENTER = [24.4709, 39.6122]
const DEFAULT_ZOOM = 11

// Predefined locations (city + surrounding villages)
const FAMOUS_PLACES = [
  { name: 'الحرم النبوي', lat: 24.4672, lng: 39.6112, type: 'landmark' },
  { name: 'جبل أحد', lat: 24.5022, lng: 39.6097, type: 'landmark' },
  { name: 'مسجد قباء', lat: 24.4400, lng: 39.6172, type: 'landmark' },
  { name: 'الجامعة الإسلامية', lat: 24.4825, lng: 39.5897, type: 'landmark' },
  { name: 'مطار الأمير محمد بن عبدالعزيز', lat: 24.5536, lng: 39.7050, type: 'landmark' },
  { name: 'العوالي', lat: 24.4153, lng: 39.6669, type: 'village' },
  { name: 'قباء', lat: 24.4400, lng: 39.6172, type: 'village' },
  { name: 'الحرة الشرقية', lat: 24.4920, lng: 39.6420, type: 'village' },
  { name: 'الحرة الغربية', lat: 24.4920, lng: 39.5820, type: 'village' },
  { name: 'بدر', lat: 23.7783, lng: 38.7903, type: 'village' },
]

// Region colors
const REGION_STYLE = {
  north: { color: '#2563eb', label: 'الشمال', icon: '⬆️' },
  south: { color: '#16a34a', label: 'الجنوب', icon: '⬇️' },
  east: { color: '#d97706', label: 'الشرق', icon: '➡️' },
  west: { color: '#7c3aed', label: 'الغرب', icon: '⬅️' },
  unknown: { color: '#6b7280', label: 'غير محدد', icon: '📍' },
}

const STATUS_STYLE = {
  ready: { color: '#16a34a', label: 'جاهزة', icon: '✅' },
  in_progress: { color: '#d97706', label: 'قيد التجهيز', icon: '🔄' },
  not_ready: { color: '#dc2626', label: 'غير جاهزة', icon: '❌' },
}

const getRegion = (v) => {
  const code = (v.vehicle_code || v.plate_number || '').trim().toUpperCase()
  const c = code[0]
  return c === 'N' ? 'north' : c === 'S' ? 'south' : c === 'E' ? 'east' : c === 'W' ? 'west' : 'unknown'
}

export default function VehicleMap({ vehicles, supabase, isMobile, canEdit, showToast }) {
  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const markersRef = useRef({})
  const draggedVehicle = useRef(null)
  const [LMod, setLMod] = useState(null)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState({ status: 'all', region: 'all', placed: 'all' })
  const [colorBy, setColorBy] = useState('region') // 'region' | 'status'
  const [selected, setSelected] = useState(null)
  const [unsavedChanges, setUnsavedChanges] = useState(new Map())
  const [saving, setSaving] = useState(false)
  const [showSidebar, setShowSidebar] = useState(true)
  const [tileLayer, setTileLayer] = useState('streets') // streets | satellite
  const [routeMode, setRouteMode] = useState(null) // { vehicleId, points: [[lat,lng],...] } | null
  const [routesUnsaved, setRoutesUnsaved] = useState(new Map())
  const routeLayersRef = useRef({})
  const tempRouteLayerRef = useRef(null)

  // Filtered list
  const filteredList = useMemo(() => {
    return vehicles.filter(v => {
      if (filter.status !== 'all' && (v.preparation_status || 'not_ready') !== filter.status) return false
      if (filter.region !== 'all' && getRegion(v) !== filter.region) return false
      const placed = v.lat != null && v.lng != null
      if (filter.placed === 'placed' && !placed) return false
      if (filter.placed === 'unplaced' && placed) return false
      if (search) {
        const q = search.toLowerCase()
        const hay = [v.plate_number, v.vehicle_code, v.brand, v.model].filter(Boolean).join(' ').toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [vehicles, filter, search])

  const placedVehicles = vehicles.filter(v => v.lat != null && v.lng != null)
  const unplacedCount = vehicles.length - placedVehicles.length

  // Load Leaflet
  useEffect(() => {
    let mounted = true
    ;(async () => {
      const L = (await import('leaflet')).default
      // Load CSS
      if (!document.querySelector('link[href*="leaflet"]')) {
        const link = document.createElement('link')
        link.rel = 'stylesheet'
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
        document.head.appendChild(link)
      }
      if (mounted) setLMod(L)
    })()
    return () => { mounted = false }
  }, [])

  // Init map
  useEffect(() => {
    if (!LMod || !mapRef.current || mapInstanceRef.current) return
    const L = LMod

    const map = L.map(mapRef.current, {
      center: MADINAH_CENTER,
      zoom: DEFAULT_ZOOM,
      zoomControl: false,
    })
    L.control.zoom({ position: 'topleft' }).addTo(map)

    // Default streets layer
    const streets = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap',
      maxZoom: 19,
    })
    const satellite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      attribution: '© Esri',
      maxZoom: 19,
    })
    streets.addTo(map)
    mapInstanceRef.current = { map, streets, satellite, L }

    // Add famous places
    FAMOUS_PLACES.forEach(p => {
      const icon = L.divIcon({
        className: 'famous-place',
        html: `<div style="background:rgba(255,107,0,0.9);color:#fff;padding:2px 8px;border-radius:12px;font-size:10px;font-weight:700;font-family:Cairo;white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,0.3);">${p.type === 'landmark' ? '🕌' : '📍'} ${p.name}</div>`,
        iconSize: null,
        iconAnchor: [0, 0],
      })
      L.marker([p.lat, p.lng], { icon, interactive: false, opacity: 0.85 }).addTo(map)
    })

    // Handle map clicks
    let pendingDrop = null
    map.on('click', (e) => {
      if (pendingDrop) {
        placeVehicleOnMap(pendingDrop, e.latlng.lat, e.latlng.lng)
        pendingDrop = null
        document.body.style.cursor = ''
      }
    })

    mapInstanceRef.current.setPendingDrop = (v) => {
      pendingDrop = v
      document.body.style.cursor = 'crosshair'
      showToast && showToast('🎯 اضغط على الخريطة لوضع المركبة')
    }

    return () => {
      map.remove()
      mapInstanceRef.current = null
    }
  }, [LMod])

  // Switch tile layer
  useEffect(() => {
    if (!mapInstanceRef.current) return
    const { map, streets, satellite } = mapInstanceRef.current
    if (tileLayer === 'streets') {
      if (map.hasLayer(satellite)) map.removeLayer(satellite)
      if (!map.hasLayer(streets)) streets.addTo(map)
    } else {
      if (map.hasLayer(streets)) map.removeLayer(streets)
      if (!map.hasLayer(satellite)) satellite.addTo(map)
    }
  }, [tileLayer])

  // Sync markers
  useEffect(() => {
    if (!mapInstanceRef.current) return
    const { map, L } = mapInstanceRef.current

    // Remove old markers no longer present
    Object.keys(markersRef.current).forEach(id => {
      const stillExists = placedVehicles.find(v => v.id === id)
      if (!stillExists) {
        map.removeLayer(markersRef.current[id])
        delete markersRef.current[id]
      }
    })

    // Add/update markers
    placedVehicles.forEach(v => {
      const region = getRegion(v)
      const status = v.preparation_status || 'not_ready'
      const color = colorBy === 'region' ? REGION_STYLE[region].color : STATUS_STYLE[status].color
      const equipType = v.year || ''
      const plateText = v.vehicle_code || v.plate_number || '—'
      const icon = L.divIcon({
        className: 'vehicle-marker',
        html: `<div style="display:flex;flex-direction:column;align-items:center;cursor:pointer;font-family:'Cairo',sans-serif;">
          <div style="background:${color};color:#fff;width:42px;height:42px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);box-shadow:0 4px 14px rgba(0,0,0,0.4);border:3px solid #fff;display:flex;align-items:center;justify-content:center;font-size:18px;">
            <span style="transform:rotate(45deg);">🚛</span>
          </div>
          <div style="margin-top:4px;background:rgba(255,255,255,0.97);color:#1a1a1a;padding:2px 8px;border-radius:6px;font-size:10px;font-weight:800;white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,0.25);border:1px solid ${color};">${plateText}</div>
          ${equipType ? `<div style="margin-top:2px;background:${color};color:#fff;padding:1px 6px;border-radius:4px;font-size:9px;font-weight:700;white-space:nowrap;">${equipType}</div>` : ''}
        </div>`,
        iconSize: [80, 78],
        iconAnchor: [40, 42],
      })

      const popupHTML = `
        <div style="font-family:Cairo,sans-serif;min-width:200px;direction:rtl;">
          <div style="font-weight:900;font-size:14px;color:${color};margin-bottom:6px;">
            🚛 ${v.plate_number || '—'}
          </div>
          <div style="font-size:11px;color:#555;line-height:1.7;">
            ${v.vehicle_code ? `<div>كود: <b>${v.vehicle_code}</b></div>` : ''}
            ${v.brand ? `<div>الماركة: <b>${v.brand} ${v.model || ''}</b></div>` : ''}
            <div>المنطقة: <b style="color:${REGION_STYLE[region].color};">${REGION_STYLE[region].label}</b></div>
            <div>الحالة: <b style="color:${STATUS_STYLE[status].color};">${STATUS_STYLE[status].icon} ${STATUS_STYLE[status].label}</b></div>
            ${v.location_label ? `<div>الموقع: <b>${v.location_label}</b></div>` : ''}
            <div style="font-size:10px;color:#888;margin-top:4px;">${v.lat.toFixed(4)}, ${v.lng.toFixed(4)}</div>
          </div>
          ${canEdit ? `<div style="margin-top:8px;display:flex;flex-direction:column;gap:4px;">
            <button onclick="window.__startRoute('${v.id}')" style="background:#2563eb;color:#fff;border:none;padding:6px;border-radius:6px;font-size:11px;font-weight:700;cursor:pointer;font-family:Cairo;">🗺️ رسم مسار</button>
            ${v.route_points && v.route_points.length ? `<button onclick="window.__clearRoute('${v.id}')" style="background:#888;color:#fff;border:none;padding:6px;border-radius:6px;font-size:11px;font-weight:700;cursor:pointer;font-family:Cairo;">🚫 مسح المسار</button>` : ''}
            <button onclick="window.__removeVehiclePin('${v.id}')" style="background:#dc2626;color:#fff;border:none;padding:6px;border-radius:6px;font-size:11px;font-weight:700;cursor:pointer;font-family:Cairo;">🗑️ إزالة من الخريطة</button>
          </div>` : ''}
        </div>
      `

      let marker = markersRef.current[v.id]
      if (!marker) {
        marker = L.marker([v.lat, v.lng], { icon, draggable: canEdit })
          .bindPopup(popupHTML)
          .addTo(map)
        marker.on('dragend', (e) => {
          const { lat, lng } = e.target.getLatLng()
          updatePendingChange(v.id, { lat, lng })
        })
        marker.on('click', () => setSelected(v))
        markersRef.current[v.id] = marker
      } else {
        marker.setLatLng([v.lat, v.lng])
        marker.setIcon(icon)
        marker.setPopupContent(popupHTML)
      }
    })
  }, [placedVehicles, colorBy, canEdit, LMod])

  // Global helpers for popup buttons
  useEffect(() => {
    window.__removeVehiclePin = (vehicleId) => {
      updatePendingChange(vehicleId, { lat: null, lng: null })
      // also clear route
      setRoutesUnsaved(prev => { const n = new Map(prev); n.set(vehicleId, null); return n })
    }
    window.__startRoute = (vehicleId) => {
      const v = vehicles.find(x => x.id === vehicleId)
      if (!v) return
      const startingPoints = v.route_points && Array.isArray(v.route_points) && v.route_points.length > 0
        ? [...v.route_points]
        : [[v.lat, v.lng]]
      setRouteMode({ vehicleId, points: startingPoints })
      if (mapInstanceRef.current) mapInstanceRef.current.map.closePopup()
      showToast && showToast('🎯 اضغط على الخريطة لإضافة نقاط المسار. اضغط "حفظ المسار" لما تخلص.')
    }
    window.__clearRoute = (vehicleId) => {
      setRoutesUnsaved(prev => { const n = new Map(prev); n.set(vehicleId, null); return n })
      showToast && showToast('✂️ تم مسح المسار (احفظ التغيير)')
    }
    return () => {
      delete window.__removeVehiclePin
      delete window.__startRoute
      delete window.__clearRoute
    }
  }, [vehicles])

  // Route drawing mode — handle clicks on map to add points
  useEffect(() => {
    if (!mapInstanceRef.current || !routeMode) return
    const { map, L } = mapInstanceRef.current

    const onClick = (e) => {
      setRouteMode(prev => prev ? { ...prev, points: [...prev.points, [e.latlng.lat, e.latlng.lng]] } : null)
    }
    map.on('click', onClick)
    document.body.style.cursor = 'crosshair'

    return () => {
      map.off('click', onClick)
      document.body.style.cursor = ''
    }
  }, [routeMode?.vehicleId])

  // Render temporary route while drawing
  useEffect(() => {
    if (!mapInstanceRef.current) return
    const { map, L } = mapInstanceRef.current

    if (tempRouteLayerRef.current) {
      map.removeLayer(tempRouteLayerRef.current)
      tempRouteLayerRef.current = null
    }

    if (routeMode && routeMode.points.length > 1) {
      const v = vehicles.find(x => x.id === routeMode.vehicleId)
      const color = (v?.route_color) || '#2563eb'
      tempRouteLayerRef.current = L.polyline(routeMode.points, { color, weight: 5, opacity: 0.9, dashArray: '10,8' }).addTo(map)
    }
  }, [routeMode])

  // Render saved routes
  useEffect(() => {
    if (!mapInstanceRef.current) return
    const { map, L } = mapInstanceRef.current

    // Clear all existing route layers
    Object.values(routeLayersRef.current).forEach(layer => map.removeLayer(layer))
    routeLayersRef.current = {}

    // Combine saved + unsaved routes
    const allVehicles = vehicles.map(v => {
      if (routesUnsaved.has(v.id)) {
        return { ...v, route_points: routesUnsaved.get(v.id) }
      }
      return v
    })

    allVehicles.forEach(v => {
      if (!v.route_points || !Array.isArray(v.route_points) || v.route_points.length < 2) return
      if (routeMode && routeMode.vehicleId === v.id) return // skip — being drawn
      const color = v.route_color || '#2563eb'
      const layer = L.polyline(v.route_points, { color, weight: 4, opacity: 0.75 }).addTo(map)
      // Hover tooltip
      layer.bindTooltip(`🗺️ مسار ${v.plate_number || v.vehicle_code}`, { sticky: true })
      routeLayersRef.current[v.id] = layer
    })
  }, [vehicles, routesUnsaved, routeMode])

  const updatePendingChange = (vehicleId, patch) => {
    setUnsavedChanges(prev => {
      const next = new Map(prev)
      const existing = next.get(vehicleId) || {}
      next.set(vehicleId, { ...existing, ...patch })
      return next
    })
  }

  const placeVehicleOnMap = (vehicle, lat, lng) => {
    updatePendingChange(vehicle.id, { lat, lng })
    showToast && showToast(`✅ تم وضع ${vehicle.plate_number}`)
  }

  const saveChanges = async () => {
    const totalChanges = unsavedChanges.size + routesUnsaved.size
    if (totalChanges === 0) { showToast && showToast('لا يوجد تغييرات للحفظ'); return }
    setSaving(true)

    // Merge all changes per vehicle
    const merged = new Map()
    for (const [id, patch] of unsavedChanges.entries()) merged.set(id, { ...(merged.get(id) || {}), ...patch })
    for (const [id, route] of routesUnsaved.entries()) merged.set(id, { ...(merged.get(id) || {}), route_points: route })

    let success = 0, failed = 0
    const errors = []
    for (const [vehicleId, patch] of merged.entries()) {
      const { error } = await supabase.from('vehicles').update(patch).eq('id', vehicleId)
      if (error) {
        failed++
        errors.push(error.message)
        console.error(`فشل حفظ ${vehicleId}:`, error)
      } else success++
    }
    setSaving(false)
    if (failed === 0) {
      setUnsavedChanges(new Map())
      setRoutesUnsaved(new Map())
      showToast && showToast(`✅ تم حفظ ${success} تغيير`)
    } else {
      showToast && showToast(`❌ فشل ${failed}: ${errors[0]?.substring(0, 80) || 'خطأ غير معروف'}`, 'error')
    }
    window.dispatchEvent(new CustomEvent('vehiclesUpdated'))
  }

  const finishRoute = () => {
    if (!routeMode) return
    setRoutesUnsaved(prev => { const n = new Map(prev); n.set(routeMode.vehicleId, routeMode.points); return n })
    setRouteMode(null)
    document.body.style.cursor = ''
    showToast && showToast(`✅ تم رسم مسار بـ ${routeMode.points.length} نقاط — اضغط حفظ`)
  }

  const cancelRoute = () => {
    setRouteMode(null)
    document.body.style.cursor = ''
  }

  const undoRoutePoint = () => {
    setRouteMode(prev => prev ? { ...prev, points: prev.points.slice(0, -1) } : null)
  }

  const fitToMarkers = () => {
    if (!mapInstanceRef.current || placedVehicles.length === 0) return
    const { map, L } = mapInstanceRef.current
    const bounds = L.latLngBounds(placedVehicles.map(v => [v.lat, v.lng]))
    map.fitBounds(bounds, { padding: [60, 60] })
  }

  const resetView = () => {
    if (!mapInstanceRef.current) return
    mapInstanceRef.current.map.setView(MADINAH_CENTER, DEFAULT_ZOOM)
  }

  // Merge pending changes into vehicles for display
  const displayVehicles = useMemo(() => {
    if (unsavedChanges.size === 0) return vehicles
    return vehicles.map(v => unsavedChanges.has(v.id) ? { ...v, ...unsavedChanges.get(v.id) } : v)
  }, [vehicles, unsavedChanges])

  const sidebarVehicles = filteredList.map(v => {
    const merged = unsavedChanges.has(v.id) ? { ...v, ...unsavedChanges.get(v.id) } : v
    return merged
  })

  return (
    <div style={{ position: 'relative', height: 'calc(100vh - 140px)', minHeight: '500px', display: 'flex', gap: '0', borderRadius: '14px', overflow: 'hidden', border: '1px solid var(--border)', background: 'var(--surface)' }}>
      {/* Sidebar */}
      {showSidebar && (
        <div style={{ width: isMobile ? '100%' : '320px', maxWidth: isMobile ? '100%' : '320px', borderInlineEnd: '1px solid var(--border)', background: 'var(--surface)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '14px', borderBottom: '1px solid var(--border)' }}>
            <div style={{ fontWeight: '800', fontSize: '14px', color: 'var(--text)', marginBottom: '4px' }}>🗺️ خريطة توزيع المعدات</div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              {placedVehicles.length} موضوعة · {unplacedCount} غير موضوعة
            </div>
          </div>

          <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 بحث..." style={{ width: '100%', padding: '8px 10px', fontSize: '12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--text)', fontFamily: 'Cairo, sans-serif' }} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
              <select value={filter.region} onChange={e => setFilter({ ...filter, region: e.target.value })} style={{ padding: '6px 8px', fontSize: '11px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--text)', fontFamily: 'Cairo, sans-serif' }}>
                <option value="all">🗺️ كل المناطق</option>
                {Object.entries(REGION_STYLE).map(([k, v]) => <option key={k} value={k}>{v.icon} {v.label}</option>)}
              </select>
              <select value={filter.status} onChange={e => setFilter({ ...filter, status: e.target.value })} style={{ padding: '6px 8px', fontSize: '11px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--text)', fontFamily: 'Cairo, sans-serif' }}>
                <option value="all">📌 كل الحالات</option>
                {Object.entries(STATUS_STYLE).map(([k, v]) => <option key={k} value={k}>{v.icon} {v.label}</option>)}
              </select>
            </div>
            <select value={filter.placed} onChange={e => setFilter({ ...filter, placed: e.target.value })} style={{ padding: '6px 8px', fontSize: '11px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--text)', fontFamily: 'Cairo, sans-serif' }}>
              <option value="all">عرض الكل</option>
              <option value="placed">📍 الموضوعة فقط</option>
              <option value="unplaced">⭕ غير الموضوعة فقط</option>
            </select>
          </div>

          <div style={{ flex: 1, overflowY: 'auto' }}>
            {sidebarVehicles.length === 0 ? (
              <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>لا توجد نتائج</div>
            ) : sidebarVehicles.map(v => {
              const region = getRegion(v)
              const status = v.preparation_status || 'not_ready'
              const placed = v.lat != null && v.lng != null
              const isSelected = selected?.id === v.id
              return (
                <div key={v.id} onClick={() => { setSelected(v); if (placed && mapInstanceRef.current) mapInstanceRef.current.map.flyTo([v.lat, v.lng], 16) }} style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', cursor: 'pointer', background: isSelected ? 'var(--accent-soft)' : 'transparent', transition: 'background 0.15s' }} onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'var(--surface-2)' }} onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: colorBy === 'region' ? REGION_STYLE[region].color : STATUS_STYLE[status].color, flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.plate_number || v.vehicle_code}</div>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {[v.brand, v.model, REGION_STYLE[region].label].filter(Boolean).join(' · ')}
                      </div>
                    </div>
                    {placed ? (
                      <span style={{ fontSize: '14px' }} title="موضوعة">📍</span>
                    ) : canEdit ? (
                      <button onClick={(e) => { e.stopPropagation(); if (mapInstanceRef.current) mapInstanceRef.current.setPendingDrop(v) }} title="ضع على الخريطة" style={{ background: 'var(--accent)', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: '700', cursor: 'pointer', fontFamily: 'Cairo, sans-serif' }}>📌 ضع</button>
                    ) : null}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Map area */}
      <div style={{ flex: 1, position: 'relative' }}>
        <div ref={mapRef} style={{ width: '100%', height: '100%', background: 'var(--surface-2)' }} />

        {/* Route Mode floating bar */}
        {routeMode && (
          <div style={{ position: 'absolute', top: '14px', left: '50%', transform: 'translateX(-50%)', zIndex: 1100, background: 'var(--surface)', border: '2px solid #2563eb', borderRadius: '12px', padding: '10px 16px', boxShadow: '0 8px 24px rgba(0,0,0,0.2)', display: 'flex', alignItems: 'center', gap: '10px', fontFamily: 'Cairo, sans-serif' }}>
            <div style={{ fontSize: '13px', fontWeight: '700', color: '#2563eb' }}>🗺️ وضع رسم المسار</div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>({routeMode.points.length} نقاط)</div>
            <button onClick={undoRoutePoint} disabled={routeMode.points.length <= 1} style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', padding: '5px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: '700', cursor: routeMode.points.length <= 1 ? 'not-allowed' : 'pointer', opacity: routeMode.points.length <= 1 ? 0.5 : 1, fontFamily: 'Cairo, sans-serif' }}>↩ تراجع</button>
            <button onClick={cancelRoute} style={{ background: 'var(--surface-2)', color: '#dc2626', border: '1px solid #dc2626', padding: '5px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: '700', cursor: 'pointer', fontFamily: 'Cairo, sans-serif' }}>✕ إلغاء</button>
            <button onClick={finishRoute} disabled={routeMode.points.length < 2} style={{ background: '#16a34a', color: '#fff', border: 'none', padding: '5px 14px', borderRadius: '6px', fontSize: '11px', fontWeight: '700', cursor: routeMode.points.length < 2 ? 'not-allowed' : 'pointer', opacity: routeMode.points.length < 2 ? 0.5 : 1, fontFamily: 'Cairo, sans-serif' }}>✓ إنهاء المسار</button>
          </div>
        )}

        {/* Top floating controls */}
        <div style={{ position: 'absolute', top: '14px', right: '14px', display: 'flex', gap: '8px', zIndex: 1000, flexWrap: 'wrap' }}>
          {(unsavedChanges.size > 0 || routesUnsaved.size > 0) && canEdit && (
            <button onClick={saveChanges} disabled={saving} style={{ background: 'linear-gradient(135deg, #16a34a, #22c55e)', color: '#fff', border: 'none', padding: '10px 16px', borderRadius: '10px', fontWeight: '700', cursor: 'pointer', fontFamily: 'Cairo, sans-serif', boxShadow: '0 4px 12px rgba(22,163,74,0.4)', fontSize: '12px' }}>
              {saving ? '⏳ جاري الحفظ...' : `💾 حفظ ${unsavedChanges.size + routesUnsaved.size} تغيير`}
            </button>
          )}
          <button onClick={fitToMarkers} title="عرض كل المركبات" style={{ background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)', padding: '8px 12px', borderRadius: '10px', fontWeight: '700', cursor: 'pointer', fontFamily: 'Cairo, sans-serif', fontSize: '12px', boxShadow: 'var(--shadow-md)' }}>🎯 عرض الكل</button>
          <button onClick={resetView} title="عودة للمدينة" style={{ background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)', padding: '8px 12px', borderRadius: '10px', fontWeight: '700', cursor: 'pointer', fontFamily: 'Cairo, sans-serif', fontSize: '12px', boxShadow: 'var(--shadow-md)' }}>🏠 المدينة</button>
        </div>

        {/* Bottom legend + layer switcher */}
        <div style={{ position: 'absolute', bottom: '14px', right: '14px', zIndex: 1000, display: 'flex', gap: '8px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '10px 12px', fontSize: '11px', boxShadow: 'var(--shadow-md)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginBottom: '4px' }}>
              <span style={{ fontWeight: '700', color: 'var(--text-muted)' }}>تلوين حسب:</span>
              <button onClick={() => setColorBy('region')} style={{ padding: '2px 8px', fontSize: '10px', borderRadius: '4px', border: 'none', cursor: 'pointer', background: colorBy === 'region' ? 'var(--accent)' : 'var(--surface-2)', color: colorBy === 'region' ? '#fff' : 'var(--text)', fontFamily: 'Cairo, sans-serif', fontWeight: '700' }}>المنطقة</button>
              <button onClick={() => setColorBy('status')} style={{ padding: '2px 8px', fontSize: '10px', borderRadius: '4px', border: 'none', cursor: 'pointer', background: colorBy === 'status' ? 'var(--accent)' : 'var(--surface-2)', color: colorBy === 'status' ? '#fff' : 'var(--text)', fontFamily: 'Cairo, sans-serif', fontWeight: '700' }}>الحالة</button>
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {Object.entries(colorBy === 'region' ? REGION_STYLE : STATUS_STYLE).map(([k, v]) => (
                <div key={k} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: v.color }} />
                  <span style={{ color: 'var(--text)' }}>{v.label}</span>
                </div>
              ))}
            </div>
          </div>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', overflow: 'hidden', boxShadow: 'var(--shadow-md)', display: 'flex' }}>
            <button onClick={() => setTileLayer('streets')} style={{ padding: '8px 12px', fontSize: '11px', border: 'none', cursor: 'pointer', background: tileLayer === 'streets' ? 'var(--accent)' : 'transparent', color: tileLayer === 'streets' ? '#fff' : 'var(--text)', fontFamily: 'Cairo, sans-serif', fontWeight: '700' }}>🗺️ خرائط</button>
            <button onClick={() => setTileLayer('satellite')} style={{ padding: '8px 12px', fontSize: '11px', border: 'none', cursor: 'pointer', background: tileLayer === 'satellite' ? 'var(--accent)' : 'transparent', color: tileLayer === 'satellite' ? '#fff' : 'var(--text)', fontFamily: 'Cairo, sans-serif', fontWeight: '700' }}>🛰️ قمر</button>
          </div>
        </div>

        {/* Toggle sidebar on mobile */}
        {isMobile && (
          <button onClick={() => setShowSidebar(s => !s)} style={{ position: 'absolute', top: '14px', left: '14px', zIndex: 1000, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '8px 12px', fontSize: '12px', fontWeight: '700', cursor: 'pointer', fontFamily: 'Cairo, sans-serif', boxShadow: 'var(--shadow-md)' }}>
            {showSidebar ? '✕ إخفاء القائمة' : '📋 عرض القائمة'}
          </button>
        )}

        {/* Stats overlay */}
        <div style={{ position: 'absolute', top: '14px', left: isMobile ? '170px' : '50px', zIndex: 1000, background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(10px)', border: '1px solid var(--border)', borderRadius: '10px', padding: '8px 14px', fontSize: '11px', display: 'flex', gap: '12px', boxShadow: 'var(--shadow-md)', fontFamily: 'Cairo, sans-serif', fontWeight: '700' }}>
          <span>📍 <strong style={{ color: '#16a34a' }}>{placedVehicles.length}</strong> موضوعة</span>
          <span>⭕ <strong style={{ color: '#dc2626' }}>{unplacedCount}</strong> غير موضوعة</span>
        </div>
      </div>
    </div>
  )
}
