'use client'
import { useEffect, useRef } from 'react'

/**
 * 3D Vehicle Viewer using Three.js (loaded dynamically).
 * Renders a stylized truck model with rotation, hover glow.
 * No external GLTF needed — built from primitives.
 */
export default function Vehicle3D({ color = '#ff6b00', height = 280, autoRotate = true }) {
  const containerRef = useRef(null)
  const stateRef = useRef({})

  useEffect(() => {
    let cleanup = () => {}
    let mounted = true

    ;(async () => {
      const THREE = await import('three')
      if (!mounted || !containerRef.current) return
      const container = containerRef.current

      const scene = new THREE.Scene()
      const camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 1000)
      camera.position.set(4, 3, 6)
      camera.lookAt(0, 0.5, 0)

      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
      renderer.setSize(container.clientWidth, container.clientHeight)
      renderer.setClearColor(0x000000, 0)
      container.appendChild(renderer.domElement)

      // Lights — strong setup so model is clearly visible
      scene.add(new THREE.AmbientLight(0xffffff, 0.8))
      const dir = new THREE.DirectionalLight(0xffffff, 1.4)
      dir.position.set(5, 8, 5)
      scene.add(dir)
      const dir2 = new THREE.DirectionalLight(0xff6b00, 0.8)
      dir2.position.set(-5, 4, -3)
      scene.add(dir2)
      const fill = new THREE.DirectionalLight(0xffffff, 0.5)
      fill.position.set(0, -3, 5)
      scene.add(fill)

      // Ground (transparent grid)
      const grid = new THREE.GridHelper(16, 20, 0xff6b00, 0x666666)
      grid.material.opacity = 0.22
      grid.material.transparent = true
      grid.position.y = -0.7
      scene.add(grid)

      // Truck group
      const truck = new THREE.Group()

      const matBody = new THREE.MeshStandardMaterial({ color, metalness: 0.5, roughness: 0.35 })
      const matCab = new THREE.MeshStandardMaterial({ color: 0xf5f5f5, metalness: 0.7, roughness: 0.25 })
      const matWheel = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.85 })
      const matRim = new THREE.MeshStandardMaterial({ color: 0xaaaaaa, metalness: 0.95, roughness: 0.15 })
      const matWindow = new THREE.MeshStandardMaterial({ color: 0x88aacc, transparent: true, opacity: 0.5, metalness: 0.95, roughness: 0.05 })
      const matChrome = new THREE.MeshStandardMaterial({ color: 0x2a2a2a, metalness: 0.6, roughness: 0.5 })

      // Cargo box (back) — bigger and centered
      const cargo = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.6, 1.5), matBody)
      cargo.position.set(0.7, 0.3, 0)
      truck.add(cargo)

      // Cab (front) — clearly distinct
      const cab = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.3, 1.5), matCab)
      cab.position.set(-1.1, 0.15, 0)
      truck.add(cab)

      // Hood (sloped front)
      const hood = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.5, 1.45), matCab)
      hood.position.set(-1.85, -0.15, 0)
      truck.add(hood)

      // Cab roof (slightly larger for shadow)
      const roof = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.1, 1.55), matCab)
      roof.position.set(-1.1, 0.85, 0)
      truck.add(roof)

      // Windshield (slanted)
      const winShield = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.55, 1.3), matWindow)
      winShield.position.set(-1.65, 0.4, 0)
      winShield.rotation.z = 0.4
      truck.add(winShield)

      // Side windows
      const sideWin = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.5, 0.04), matWindow)
      sideWin.position.set(-1.1, 0.45, 0.77)
      truck.add(sideWin)
      const sideWin2 = sideWin.clone()
      sideWin2.position.z = -0.77
      truck.add(sideWin2)

      // Cargo back door (slight inset)
      const cargoBack = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1.4, 1.4), matChrome)
      cargoBack.position.set(1.92, 0.3, 0)
      truck.add(cargoBack)

      // Side accent stripe on cargo
      const stripe = new THREE.Mesh(new THREE.BoxGeometry(2.42, 0.2, 1.52), matChrome)
      stripe.position.set(0.7, -0.3, 0)
      truck.add(stripe)

      // Wheels (6 wheels — 2 front + 4 rear dual)
      const wheelPositions = [
        [-1.5, -0.5, 0.85], [-1.5, -0.5, -0.85],   // front
        [0.4, -0.5, 0.85], [0.4, -0.5, -0.85],     // rear 1
        [1.4, -0.5, 0.85], [1.4, -0.5, -0.85],     // rear 2
      ]
      const wheels = []
      wheelPositions.forEach(p => {
        const tireGeo = new THREE.CylinderGeometry(0.4, 0.4, 0.28, 28)
        const tire = new THREE.Mesh(tireGeo, matWheel)
        tire.rotation.z = Math.PI / 2
        tire.position.set(...p)
        truck.add(tire)
        const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.3, 18), matRim)
        rim.rotation.z = Math.PI / 2
        rim.position.set(...p)
        truck.add(rim)
        // Hub
        const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.32, 12), new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.7 }))
        hub.rotation.z = Math.PI / 2
        hub.position.set(...p)
        truck.add(hub)
        wheels.push(tire, rim, hub)
      })

      // Headlights (bright)
      const headLightMat = new THREE.MeshStandardMaterial({ color: 0xfffacd, emissive: 0xffff66, emissiveIntensity: 1.2 })
      const headL = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.15, 0.2), headLightMat)
      headL.position.set(-2.2, -0.1, 0.55)
      truck.add(headL)
      const headR = headL.clone()
      headR.position.z = -0.55
      truck.add(headR)

      // Front grille
      const grille = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.4, 1.2), new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.8, roughness: 0.4 }))
      grille.position.set(-2.2, -0.15, 0)
      truck.add(grille)

      // Bumper
      const bumper = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.18, 1.55), matChrome)
      bumper.position.set(-2.22, -0.42, 0)
      truck.add(bumper)

      // Center the truck
      truck.position.y = 0
      truck.scale.set(0.85, 0.85, 0.85)

      scene.add(truck)
      stateRef.current.truck = truck
      stateRef.current.wheels = wheels

      // Mouse interaction
      let mouseX = 0, mouseY = 0, targetRotY = 0, targetRotX = 0
      const onMove = (e) => {
        const rect = container.getBoundingClientRect()
        mouseX = ((e.clientX - rect.left) / rect.width) * 2 - 1
        mouseY = ((e.clientY - rect.top) / rect.height) * 2 - 1
      }
      container.addEventListener('mousemove', onMove)

      // Resize
      const onResize = () => {
        if (!container) return
        camera.aspect = container.clientWidth / container.clientHeight
        camera.updateProjectionMatrix()
        renderer.setSize(container.clientWidth, container.clientHeight)
      }
      window.addEventListener('resize', onResize)

      // Animation loop
      let animId
      let t = 0
      const animate = () => {
        animId = requestAnimationFrame(animate)
        t += 0.008
        if (autoRotate) targetRotY = t * 0.5
        const mouseInfluence = mouseX * 0.4
        truck.rotation.y = (autoRotate ? t * 0.5 : 0) + mouseInfluence
        truck.rotation.x = -mouseY * 0.1
        truck.position.y = Math.sin(t * 1.5) * 0.06
        wheels.forEach(w => { w.rotation.x = t * 5 })
        camera.lookAt(0, 0.3, 0)
        renderer.render(scene, camera)
      }
      animate()

      cleanup = () => {
        cancelAnimationFrame(animId)
        window.removeEventListener('resize', onResize)
        container.removeEventListener('mousemove', onMove)
        if (renderer.domElement && container.contains(renderer.domElement)) {
          container.removeChild(renderer.domElement)
        }
        renderer.dispose()
        scene.traverse(o => {
          if (o.geometry) o.geometry.dispose()
          if (o.material) {
            if (Array.isArray(o.material)) o.material.forEach(m => m.dispose())
            else o.material.dispose()
          }
        })
      }
    })()

    return () => { mounted = false; cleanup() }
  }, [color, autoRotate])

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: `${height}px`,
        borderRadius: '16px',
        background: 'linear-gradient(135deg, var(--surface), var(--surface-2))',
        border: '1px solid var(--border)',
        overflow: 'hidden',
        position: 'relative',
        cursor: 'grab',
      }}
    />
  )
}
