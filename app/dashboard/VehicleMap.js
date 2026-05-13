'use client'
import { useEffect, useRef, useState, useMemo } from 'react'

const MADINAH_CENTER = [24.4709, 39.6122]
const DEFAULT_ZOOM = 11

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

const SHIFT_STYLE = {
  1: { color: '#2563eb', label: 'الشفت الأول', icon: '🌅', short: 'ش1' },
  2: { color: '#7c3aed', label: 'الشفت الثاني', icon: '🌃', short: 'ش2' },
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
  const routeLayersRef = useRef({})
  const tempRouteLayerRef = useRef(null)

  const [LMod, setLMod] = useState(null)
  const [placements, setPlacements] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState({ status: 'all', region: 'all', placed: 'all' })
  const [colorBy, setColorBy] = useState('shift')
  const [showSidebar, setShowSidebar] = useState(true)
  const [tileLayer, setTileLayer] = useState('streets')

  // Shift state
  const [selectedShift, setSelectedShift] = useState(1)
  const [displayShift, setDisplayShift] = useState('all')

  // Pending changes (separate from saved placements)
  const [pendingUpdates, setPendingUpdates] = useState(new Map()) // key: "vehicleId_shift" -> patch
  const [pendingDeletes, setPendingDeletes] = useState(new Set()) // key: "vehicleId_shift"
  const [pendingCreates, setPendingCreates] = useState(new Map()) // key: "vehicleId_shift" -> placement

  const [routeMode, setRouteMode] = useState(null)
  const [saving, setSaving] = useState(false)

  const placementKey = (vid, shift) => `${vid}_${shift}`

  // Fetch placements
  const fetchPlacements = async () => {
    setLoading(true)
    const { data, error } = await supabase.from('vehicle_placements').select('*')
    if (error) {
      console.error('فشل جلب المواضع:', error)
      showToast && showToast('❌ فشل جلب المواضع: ' + error.message, 'error')
      setPlacements([])
    } else {
      setPlacements(data || [])
    }
    setLoading(false)
  }
  useEffect(() => { fetchPlacements() }, [])

  // Build display placements (merge pending changes)
  const effectivePlacements = useMemo(() => {
    const result = []
    for (const p of placements) {
      const key = placementKey(p.vehicle_id, p.shift)
      if (pendingDeletes.has(key)) continue
      const patch = pendingUpdates.get(key)
      result.push(patch ? { ...p, ...patch } : p)
    }
    for (const [key, p] of pendingCreates.entries()) {
      result.push(p)
    }
    return result
  }, [placements, pendingUpdates, pendingDeletes, pendingCreates])

  // Vehicles enriched with their placements
  const vehiclesWithPlacements = useMemo(() => {
    const byId = new Map(vehicles.map(v => [v.id, { vehicle: v, shifts: {} }]))
    for (const p of effectivePlacements) {
      const entry = byId.get(p.vehicle_id)
      if (entry) entry.shifts[p.shift] = p
    }
    return Array.from(byId.values())
  }, [vehicles, effectivePlacements])

  // Filtered sidebar list
  const filteredList = useMemo(() => {
    return vehiclesWithPlacements.filter(({ vehicle: v, shifts }) => {
      if (filter.status !== 'all' && (v.preparation_status || 'not_ready') !== filter.status) return false
      if (filter.region !== 'all' && getRegion(v) !== filter.region) return false
      const placedInAny = Object.keys(shifts).length > 0
      const placedInShift1 = !!shifts[1]
      const placedInShift2 = !!shifts[2]
      if (filter.placed === 'placed' && !placedInAny) return false
      if (filter.placed === 'unplaced' && placedInAny) return false
      if (filter.placed === 'shift1' && !placedInShift1) return false
      if (filter.placed === 'shift2' && !placedInShift2) return false
      if (filter.placed === 'both' && (!placedInShift1 || !placedInShift2)) return false
      if (search) {
        const q = search.toLowerCase()
        const hay = [v.plate_number, v.vehicle_code, v.brand, v.model, v.year].filter(Boolean).join(' ').toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [vehiclesWithPlacements, filter, search])

  // Stats
  const stats = useMemo(() => {
    const shift1Count = effectivePlacements.filter(p => p.shift === 1).length
    const shift2Count = effectivePlacements.filter(p => p.shift === 2).length
    const total = vehicles.length
    const placedAny = new Set(effectivePlacements.map(p => p.vehicle_id)).size
    return { shift1Count, shift2Count, total, placedAny, unplaced: total - placedAny }
  }, [effectivePlacements, vehicles])

  // Load Leaflet
  useEffect(() => {
    let mounted = true
    ;(async () => {
      const L = (await import('leaflet')).default
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

    const map = L.map(mapRef.current, { center: MADINAH_CENTER, zoom: DEFAULT_ZOOM, zoomControl: false })
    L.control.zoom({ position: 'topleft' }).addTo(map)

    const streets = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap', maxZoom: 19 })
    const satellite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { attribution: '© Esri', maxZoom: 19 })
    streets.addTo(map)
    mapInstanceRef.current = { map, streets, satellite, L }

    FAMOUS_PLACES.forEach(p => {
      const icon = L.divIcon({
        className: 'famous-place',
        html: `<div style="background:rgba(0,0,0,0.7);color:#fff;padding:2px 8px;border-radius:12px;font-size:10px;font-weight:700;font-family:Cairo;white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,0.3);">${p.type === 'landmark' ? '🕌' : '📍'} ${p.name}</div>`,
        iconSize: null, iconAnchor: [0, 0],
      })
      L.marker([p.lat, p.lng], { icon, interactive: false, opacity: 0.85 }).addTo(map)
    })

    let pendingDrop = null
    map.on('click', (e) => {
      if (pendingDrop) {
        placeVehicleOnMap(pendingDrop, e.latlng.lat, e.latlng.lng, pendingDrop._targetShift)
        pendingDrop = null
        document.body.style.cursor = ''
      }
    })

    mapInstanceRef.current.setPendingDrop = (v, shift) => {
      pendingDrop = { ...v, _targetShift: shift }
      document.body.style.cursor = 'crosshair'
      showToast && showToast(`🎯 اضغط على الخريطة لوضع المركبة في ${SHIFT_STYLE[shift].label}`)
    }

    return () => { map.remove(); mapInstanceRef.current = null }
  }, [LMod])

  // Tile switcher
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

    // visible placements
    const visiblePlacements = effectivePlacements.filter(p => displayShift === 'all' || String(p.shift) === displayShift)

    // Remove old markers
    Object.keys(markersRef.current).forEach(key => {
      const stillExists = visiblePlacements.find(p => placementKey(p.vehicle_id, p.shift) === key)
      if (!stillExists) {
        map.removeLayer(markersRef.current[key])
        delete markersRef.current[key]
      }
    })

    // Add/update markers
    visiblePlacements.forEach(p => {
      const v = vehicles.find(x => x.id === p.vehicle_id)
      if (!v) return
      const key = placementKey(p.vehicle_id, p.shift)
      const region = getRegion(v)
      const status = v.preparation_status || 'not_ready'
      const shiftStyle = SHIFT_STYLE[p.shift]
      const baseColor = colorBy === 'shift' ? shiftStyle.color : colorBy === 'region' ? REGION_STYLE[region].color : STATUS_STYLE[status].color
      const equipType = v.year || ''
      const plateText = v.vehicle_code || v.plate_number || '—'

      const icon = L.divIcon({
        className: 'vehicle-marker',
        html: `<div style="display:flex;flex-direction:column;align-items:center;cursor:pointer;font-family:'Cairo',sans-serif;">
          <div style="position:relative;">
            <div style="background:${baseColor};color:#fff;width:44px;height:44px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);box-shadow:0 4px 14px rgba(0,0,0,0.4);border:3px solid #fff;display:flex;align-items:center;justify-content:center;font-size:18px;">
              <span style="transform:rotate(45deg);">🚛</span>
            </div>
            <div style="position:absolute;top:-6px;right:-6px;background:${shiftStyle.color};color:#fff;width:22px;height:22px;border-radius:50%;border:2px solid #fff;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:900;box-shadow:0 2px 6px rgba(0,0,0,0.3);">${p.shift}</div>
          </div>
          <div style="margin-top:5px;background:rgba(255,255,255,0.97);color:#1a1a1a;padding:2px 8px;border-radius:6px;font-size:10px;font-weight:800;white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,0.25);border:1px solid ${baseColor};">${plateText}</div>
          ${equipType ? `<div style="margin-top:2px;background:${baseColor};color:#fff;padding:1px 6px;border-radius:4px;font-size:9px;font-weight:700;white-space:nowrap;">${equipType}</div>` : ''}
        </div>`,
        iconSize: [80, 86], iconAnchor: [40, 44],
      })

      const popupHTML = `
        <div style="font-family:Cairo,sans-serif;min-width:220px;direction:rtl;">
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;">
            <span style="background:${shiftStyle.color};color:#fff;padding:2px 8px;border-radius:12px;font-size:10px;font-weight:800;">${shiftStyle.icon} ${shiftStyle.label}</span>
            <span style="font-weight:900;font-size:14px;color:${baseColor};">🚛 ${plateText}</span>
          </div>
          <div style="font-size:11px;color:#555;line-height:1.7;">
            ${v.brand ? `<div>الماركة: <b>${v.brand} ${v.model || ''}</b></div>` : ''}
            ${equipType ? `<div>نوع التجهيزة: <b>${equipType}</b></div>` : ''}
            <div>المنطقة: <b style="color:${REGION_STYLE[region].color};">${REGION_STYLE[region].label}</b></div>
            <div>الحالة: <b style="color:${STATUS_STYLE[status].color};">${STATUS_STYLE[status].icon} ${STATUS_STYLE[status].label}</b></div>
            <div style="font-size:10px;color:#888;margin-top:4px;">${p.lat.toFixed(4)}, ${p.lng.toFixed(4)}</div>
          </div>
          ${canEdit ? `<div style="margin-top:8px;display:flex;flex-direction:column;gap:4px;">
            <button onclick="window.__startRoute('${v.id}', ${p.shift})" style="background:#2563eb;color:#fff;border:none;padding:6px;border-radius:6px;font-size:11px;font-weight:700;cursor:pointer;font-family:Cairo;">🗺️ رسم مسار</button>
            ${p.route_points && p.route_points.length ? `<button onclick="window.__clearRoute('${v.id}', ${p.shift})" style="background:#888;color:#fff;border:none;padding:6px;border-radius:6px;font-size:11px;font-weight:700;cursor:pointer;font-family:Cairo;">🚫 مسح المسار</button>` : ''}
            <button onclick="window.__removeVehiclePin('${v.id}', ${p.shift})" style="background:#dc2626;color:#fff;border:none;padding:6px;border-radius:6px;font-size:11px;font-weight:700;cursor:pointer;font-family:Cairo;">🗑️ إزالة</button>
          </div>` : ''}
        </div>
      `

      let marker = markersRef.current[key]
      if (!marker) {
        marker = L.marker([p.lat, p.lng], { icon, draggable: canEdit }).bindPopup(popupHTML).addTo(map)
        marker.on('dragend', (e) => {
          const { lat, lng } = e.target.getLatLng()
          updatePlacement(p.vehicle_id, p.shift, { lat, lng })
        })
        markersRef.current[key] = marker
      } else {
        marker.setLatLng([p.lat, p.lng])
        marker.setIcon(icon)
        marker.setPopupContent(popupHTML)
      }
    })
  }, [effectivePlacements, displayShift, colorBy, canEdit, vehicles, LMod])

  // Render routes
  useEffect(() => {
    if (!mapInstanceRef.current) return
    const { map, L } = mapInstanceRef.current
    Object.values(routeLayersRef.current).forEach(layer => map.removeLayer(layer))
    routeLayersRef.current = {}

    const visible = effectivePlacements.filter(p => displayShift === 'all' || String(p.shift) === displayShift)
    visible.forEach(p => {
      if (!p.route_points || !Array.isArray(p.route_points) || p.route_points.length < 2) return
      if (routeMode && routeMode.vehicleId === p.vehicle_id && routeMode.shift === p.shift) return
      const v = vehicles.find(x => x.id === p.vehicle_id)
      const color = p.route_color || SHIFT_STYLE[p.shift].color
      const key = placementKey(p.vehicle_id, p.shift)
      const layer = L.polyline(p.route_points, { color, weight: 4, opacity: 0.75 }).addTo(map)
      layer.bindTooltip(`🗺️ مسار ${v?.plate_number || ''} - ش${p.shift}`, { sticky: true })
      routeLayersRef.current[key] = layer
    })
  }, [effectivePlacements, displayShift, routeMode, vehicles])

  // Route mode click handler
  useEffect(() => {
    if (!mapInstanceRef.current || !routeMode) return
    const { map } = mapInstanceRef.current
    const onClick = (e) => {
      setRouteMode(prev => prev ? { ...prev, points: [...prev.points, [e.latlng.lat, e.latlng.lng]] } : null)
    }
    map.on('click', onClick)
    document.body.style.cursor = 'crosshair'
    return () => { map.off('click', onClick); document.body.style.cursor = '' }
  }, [routeMode?.vehicleId, routeMode?.shift])

  // Temp route layer
  useEffect(() => {
    if (!mapInstanceRef.current) return
    const { map, L } = mapInstanceRef.current
    if (tempRouteLayerRef.current) { map.removeLayer(tempRouteLayerRef.current); tempRouteLayerRef.current = null }
    if (routeMode && routeMode.points.length > 1) {
      const color = SHIFT_STYLE[routeMode.shift].color
      tempRouteLayerRef.current = L.polyline(routeMode.points, { color, weight: 5, opacity: 0.9, dashArray: '10,8' }).addTo(map)
    }
  }, [routeMode])

  // Global popup helpers
  useEffect(() => {
    window.__removeVehiclePin = (vehicleId, shift) => removePlacement(vehicleId, shift)
    window.__startRoute = (vehicleId, shift) => {
      const p = effectivePlacements.find(x => x.vehicle_id === vehicleId && x.shift === shift)
      if (!p) return
      const startingPoints = p.route_points && p.route_points.length > 0 ? [...p.route_points] : [[p.lat, p.lng]]
      setRouteMode({ vehicleId, shift, points: startingPoints })
      if (mapInstanceRef.current) mapInstanceRef.current.map.closePopup()
      showToast && showToast(`🎯 ضع نقاط المسار للشفت ${shift}`)
    }
    window.__clearRoute = (vehicleId, shift) => {
      updatePlacement(vehicleId, shift, { route_points: null })
      showToast && showToast('✂️ تم مسح المسار')
    }
    return () => { delete window.__removeVehiclePin; delete window.__startRoute; delete window.__clearRoute }
  }, [effectivePlacements])

  // Update a placement (pending)
  const updatePlacement = (vehicleId, shift, patch) => {
    const key = placementKey(vehicleId, shift)
    const existing = placements.find(p => p.vehicle_id === vehicleId && p.shift === shift)
    if (existing) {
      setPendingUpdates(prev => { const n = new Map(prev); n.set(key, { ...(n.get(key) || {}), ...patch }); return n })
    } else if (pendingCreates.has(key)) {
      setPendingCreates(prev => { const n = new Map(prev); n.set(key, { ...n.get(key), ...patch }); return n })
    }
  }

  const placeVehicleOnMap = (vehicle, lat, lng, shift) => {
    const key = placementKey(vehicle.id, shift)
    const existing = placements.find(p => p.vehicle_id === vehicle.id && p.shift === shift)
    if (existing) {
      // It exists in DB — patch it
      setPendingUpdates(prev => { const n = new Map(prev); n.set(key, { ...(n.get(key) || {}), lat, lng }); return n })
      if (pendingDeletes.has(key)) setPendingDeletes(prev => { const n = new Set(prev); n.delete(key); return n })
    } else if (pendingCreates.has(key)) {
      setPendingCreates(prev => { const n = new Map(prev); n.set(key, { ...n.get(key), lat, lng }); return n })
    } else {
      // New placement
      setPendingCreates(prev => { const n = new Map(prev); n.set(key, { vehicle_id: vehicle.id, shift, lat, lng, _isNew: true }); return n })
    }
    showToast && showToast(`✅ ${vehicle.plate_number} في الشفت ${shift}`)
  }

  const removePlacement = (vehicleId, shift) => {
    const key = placementKey(vehicleId, shift)
    if (pendingCreates.has(key)) {
      setPendingCreates(prev => { const n = new Map(prev); n.delete(key); return n })
    } else {
      setPendingDeletes(prev => { const n = new Set(prev); n.add(key); return n })
      setPendingUpdates(prev => { const n = new Map(prev); n.delete(key); return n })
    }
  }

  const totalChanges = pendingUpdates.size + pendingDeletes.size + pendingCreates.size

  const saveChanges = async () => {
    if (totalChanges === 0) { showToast && showToast('لا يوجد تغييرات'); return }
    setSaving(true)
    let success = 0, failed = 0, errorMsg = ''

    // Deletes
    for (const key of pendingDeletes) {
      const [vid, sh] = key.split('_')
      const { error } = await supabase.from('vehicle_placements').delete().eq('vehicle_id', vid).eq('shift', Number(sh))
      if (error) { failed++; errorMsg = error.message; console.error(error) } else success++
    }
    // Updates
    for (const [key, patch] of pendingUpdates.entries()) {
      const [vid, sh] = key.split('_')
      const payload = { ...patch, updated_at: new Date().toISOString() }
      delete payload._isNew
      const { error } = await supabase.from('vehicle_placements').update(payload).eq('vehicle_id', vid).eq('shift', Number(sh))
      if (error) { failed++; errorMsg = error.message; console.error(error) } else success++
    }
    // Creates
    for (const [key, placement] of pendingCreates.entries()) {
      const payload = { ...placement }
      delete payload._isNew
      const { error } = await supabase.from('vehicle_placements').insert(payload)
      if (error) { failed++; errorMsg = error.message; console.error(error) } else success++
    }

    setSaving(false)
    if (failed === 0) {
      setPendingUpdates(new Map()); setPendingDeletes(new Set()); setPendingCreates(new Map())
      showToast && showToast(`✅ تم حفظ ${success} تغيير`)
    } else {
      showToast && showToast(`⚠️ نجح ${success}، فشل ${failed}: ${errorMsg.substring(0, 80)}`, 'error')
    }
    fetchPlacements()
  }

  const finishRoute = () => {
    if (!routeMode) return
    updatePlacement(routeMode.vehicleId, routeMode.shift, { route_points: routeMode.points, route_color: SHIFT_STYLE[routeMode.shift].color })
    setRouteMode(null)
    document.body.style.cursor = ''
    showToast && showToast(`✅ مسار بـ ${routeMode.points.length} نقاط`)
  }
  const cancelRoute = () => { setRouteMode(null); document.body.style.cursor = '' }
  const undoRoutePoint = () => setRouteMode(prev => prev ? { ...prev, points: prev.points.slice(0, -1) } : null)

  const fitToMarkers = () => {
    if (!mapInstanceRef.current) return
    const visible = effectivePlacements.filter(p => displayShift === 'all' || String(p.shift) === displayShift)
    if (visible.length === 0) return
    const { map, L } = mapInstanceRef.current
    const bounds = L.latLngBounds(visible.map(p => [p.lat, p.lng]))
    map.fitBounds(bounds, { padding: [60, 60] })
  }
  const resetView = () => { if (mapInstanceRef.current) mapInstanceRef.current.map.setView(MADINAH_CENTER, DEFAULT_ZOOM) }

  return (
    <div style={{ position: 'relative', height: 'calc(100vh - 140px)', minHeight: '500px', display: 'flex', gap: '0', borderRadius: '14px', overflow: 'hidden', border: '1px solid var(--border)', background: 'var(--surface)' }}>
      {showSidebar && (
        <div style={{ width: isMobile ? '100%' : '340px', maxWidth: isMobile ? '100%' : '340px', borderInlineEnd: '1px solid var(--border)', background: 'var(--surface)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '14px', borderBottom: '1px solid var(--border)' }}>
            <div style={{ fontWeight: '800', fontSize: '14px', color: 'var(--text)', marginBottom: '4px' }}>🗺️ خريطة توزيع المعدات</div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <span>🌅 ش1: <strong style={{ color: SHIFT_STYLE[1].color }}>{stats.shift1Count}</strong></span>
              <span>🌃 ش2: <strong style={{ color: SHIFT_STYLE[2].color }}>{stats.shift2Count}</strong></span>
              <span>⭕ غير موضوعة: <strong>{stats.unplaced}</strong></span>
            </div>
          </div>

          {/* Shift selector — where new placements go */}
          {canEdit && (
            <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', background: 'var(--surface-2)' }}>
              <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', marginBottom: '6px' }}>📍 وضع المركبات في:</div>
              <div style={{ display: 'flex', gap: '6px' }}>
                {[1, 2].map(sh => (
                  <button key={sh} onClick={() => setSelectedShift(sh)} style={{ flex: 1, padding: '8px', borderRadius: '8px', border: `2px solid ${selectedShift === sh ? SHIFT_STYLE[sh].color : 'var(--border)'}`, background: selectedShift === sh ? `${SHIFT_STYLE[sh].color}20` : 'var(--surface)', color: selectedShift === sh ? SHIFT_STYLE[sh].color : 'var(--text)', cursor: 'pointer', fontFamily: 'Cairo, sans-serif', fontWeight: '700', fontSize: '12px' }}>
                    {SHIFT_STYLE[sh].icon} {SHIFT_STYLE[sh].label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Display filter (which shifts to show on map) */}
          <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)' }}>
            <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', marginBottom: '6px' }}>👁️ عرض على الخريطة:</div>
            <div style={{ display: 'flex', gap: '6px' }}>
              {[['all','الكل','#6b7280'],['1','ش1',SHIFT_STYLE[1].color],['2','ش2',SHIFT_STYLE[2].color]].map(([v,label,c]) => (
                <button key={v} onClick={() => setDisplayShift(v)} style={{ flex: 1, padding: '6px', borderRadius: '6px', border: `1.5px solid ${displayShift === v ? c : 'var(--border)'}`, background: displayShift === v ? `${c}20` : 'var(--surface)', color: displayShift === v ? c : 'var(--text)', cursor: 'pointer', fontFamily: 'Cairo, sans-serif', fontWeight: '700', fontSize: '11px' }}>{label}</button>
              ))}
            </div>
          </div>

          <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 بحث..." style={{ width: '100%', padding: '8px 10px', fontSize: '12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--text)', fontFamily: 'Cairo, sans-serif' }} />
            <select value={filter.placed} onChange={e => setFilter({ ...filter, placed: e.target.value })} style={{ padding: '6px 8px', fontSize: '11px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--text)', fontFamily: 'Cairo, sans-serif' }}>
              <option value="all">عرض الكل</option>
              <option value="placed">📍 الموضوعة في أي شفت</option>
              <option value="shift1">🌅 الموضوعة في الشفت 1</option>
              <option value="shift2">🌃 الموضوعة في الشفت 2</option>
              <option value="both">📍📍 الموضوعة في الشفتين</option>
              <option value="unplaced">⭕ غير الموضوعة</option>
            </select>
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
          </div>

          <div style={{ flex: 1, overflowY: 'auto' }}>
            {loading ? (
              <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>⏳ جاري التحميل...</div>
            ) : filteredList.length === 0 ? (
              <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>لا توجد نتائج</div>
            ) : filteredList.map(({ vehicle: v, shifts }) => {
              const region = getRegion(v)
              const status = v.preparation_status || 'not_ready'
              return (
                <div key={v.id} style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.plate_number || v.vehicle_code}</div>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{[v.brand, v.year, REGION_STYLE[region].label].filter(Boolean).join(' · ')}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    {[1, 2].map(sh => {
                      const placed = !!shifts[sh]
                      const shiftStyle = SHIFT_STYLE[sh]
                      return placed ? (
                        <button key={sh} onClick={() => { const p = shifts[sh]; if (mapInstanceRef.current) mapInstanceRef.current.map.flyTo([p.lat, p.lng], 16) }} style={{ flex: 1, padding: '6px', borderRadius: '6px', border: `1.5px solid ${shiftStyle.color}`, background: `${shiftStyle.color}15`, color: shiftStyle.color, fontSize: '10px', fontWeight: '700', cursor: 'pointer', fontFamily: 'Cairo, sans-serif' }}>
                          📍 {shiftStyle.short}
                        </button>
                      ) : canEdit ? (
                        <button key={sh} onClick={() => { if (mapInstanceRef.current) mapInstanceRef.current.setPendingDrop(v, sh) }} style={{ flex: 1, padding: '6px', borderRadius: '6px', border: `1.5px dashed ${shiftStyle.color}`, background: 'var(--surface)', color: shiftStyle.color, fontSize: '10px', fontWeight: '700', cursor: 'pointer', fontFamily: 'Cairo, sans-serif' }}>
                          + {shiftStyle.short}
                        </button>
                      ) : (
                        <div key={sh} style={{ flex: 1, padding: '6px', borderRadius: '6px', background: 'var(--surface-2)', color: 'var(--text-subtle)', fontSize: '10px', fontWeight: '700', textAlign: 'center' }}>—</div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div style={{ flex: 1, position: 'relative' }}>
        <div ref={mapRef} style={{ width: '100%', height: '100%', background: 'var(--surface-2)' }} />

        {routeMode && (
          <div style={{ position: 'absolute', top: '14px', left: '50%', transform: 'translateX(-50%)', zIndex: 1100, background: 'var(--surface)', border: `2px solid ${SHIFT_STYLE[routeMode.shift].color}`, borderRadius: '12px', padding: '10px 16px', boxShadow: '0 8px 24px rgba(0,0,0,0.2)', display: 'flex', alignItems: 'center', gap: '10px', fontFamily: 'Cairo, sans-serif' }}>
            <div style={{ fontSize: '13px', fontWeight: '700', color: SHIFT_STYLE[routeMode.shift].color }}>🗺️ رسم مسار ({SHIFT_STYLE[routeMode.shift].label})</div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>({routeMode.points.length})</div>
            <button onClick={undoRoutePoint} disabled={routeMode.points.length <= 1} style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', padding: '5px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: '700', cursor: routeMode.points.length <= 1 ? 'not-allowed' : 'pointer', opacity: routeMode.points.length <= 1 ? 0.5 : 1 }}>↩</button>
            <button onClick={cancelRoute} style={{ background: 'var(--surface-2)', color: '#dc2626', border: '1px solid #dc2626', padding: '5px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: '700', cursor: 'pointer' }}>✕</button>
            <button onClick={finishRoute} disabled={routeMode.points.length < 2} style={{ background: '#16a34a', color: '#fff', border: 'none', padding: '5px 14px', borderRadius: '6px', fontSize: '11px', fontWeight: '700', cursor: routeMode.points.length < 2 ? 'not-allowed' : 'pointer', opacity: routeMode.points.length < 2 ? 0.5 : 1 }}>✓ إنهاء</button>
          </div>
        )}

        <div style={{ position: 'absolute', top: '14px', right: '14px', display: 'flex', gap: '8px', zIndex: 1000, flexWrap: 'wrap' }}>
          {totalChanges > 0 && canEdit && (
            <button onClick={saveChanges} disabled={saving} style={{ background: 'linear-gradient(135deg, #16a34a, #22c55e)', color: '#fff', border: 'none', padding: '10px 16px', borderRadius: '10px', fontWeight: '700', cursor: 'pointer', fontFamily: 'Cairo, sans-serif', boxShadow: '0 4px 12px rgba(22,163,74,0.4)', fontSize: '12px' }}>
              {saving ? '⏳ جاري الحفظ...' : `💾 حفظ ${totalChanges} تغيير`}
            </button>
          )}
          <button onClick={fitToMarkers} style={{ background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)', padding: '8px 12px', borderRadius: '10px', fontWeight: '700', cursor: 'pointer', fontFamily: 'Cairo, sans-serif', fontSize: '12px', boxShadow: 'var(--shadow-md)' }}>🎯 عرض الكل</button>
          <button onClick={resetView} style={{ background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)', padding: '8px 12px', borderRadius: '10px', fontWeight: '700', cursor: 'pointer', fontFamily: 'Cairo, sans-serif', fontSize: '12px', boxShadow: 'var(--shadow-md)' }}>🏠 المدينة</button>
        </div>

        <div style={{ position: 'absolute', bottom: '14px', right: '14px', zIndex: 1000, display: 'flex', gap: '8px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '10px 12px', fontSize: '11px', boxShadow: 'var(--shadow-md)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              <span style={{ fontWeight: '700', color: 'var(--text-muted)' }}>تلوين:</span>
              {['shift','region','status'].map(b => (
                <button key={b} onClick={() => setColorBy(b)} style={{ padding: '2px 8px', fontSize: '10px', borderRadius: '4px', border: 'none', cursor: 'pointer', background: colorBy === b ? 'var(--accent)' : 'var(--surface-2)', color: colorBy === b ? '#fff' : 'var(--text)', fontWeight: '700' }}>{b === 'shift' ? 'الشفت' : b === 'region' ? 'المنطقة' : 'الحالة'}</button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {Object.entries(colorBy === 'shift' ? SHIFT_STYLE : colorBy === 'region' ? REGION_STYLE : STATUS_STYLE).map(([k, v]) => (
                <div key={k} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: v.color }} />
                  <span style={{ color: 'var(--text)' }}>{v.label}</span>
                </div>
              ))}
            </div>
          </div>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', overflow: 'hidden', boxShadow: 'var(--shadow-md)', display: 'flex' }}>
            <button onClick={() => setTileLayer('streets')} style={{ padding: '8px 12px', fontSize: '11px', border: 'none', cursor: 'pointer', background: tileLayer === 'streets' ? 'var(--accent)' : 'transparent', color: tileLayer === 'streets' ? '#fff' : 'var(--text)', fontWeight: '700' }}>🗺️</button>
            <button onClick={() => setTileLayer('satellite')} style={{ padding: '8px 12px', fontSize: '11px', border: 'none', cursor: 'pointer', background: tileLayer === 'satellite' ? 'var(--accent)' : 'transparent', color: tileLayer === 'satellite' ? '#fff' : 'var(--text)', fontWeight: '700' }}>🛰️</button>
          </div>
        </div>

        {isMobile && (
          <button onClick={() => setShowSidebar(s => !s)} style={{ position: 'absolute', top: '14px', left: '14px', zIndex: 1000, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '8px 12px', fontSize: '12px', fontWeight: '700', cursor: 'pointer', fontFamily: 'Cairo, sans-serif', boxShadow: 'var(--shadow-md)' }}>
            {showSidebar ? '✕' : '📋'}
          </button>
        )}
      </div>
    </div>
  )
}
