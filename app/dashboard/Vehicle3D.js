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
      const camera = new THREE.PerspectiveCamera(50, container.clientWidth / container.clientHeight, 0.1, 1000)
      camera.position.set(0, 2.5, 6)

      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
      renderer.setSize(container.clientWidth, container.clientHeight)
      renderer.setClearColor(0x000000, 0)
      container.appendChild(renderer.domElement)

      // Lights
      scene.add(new THREE.AmbientLight(0xffffff, 0.5))
      const dir = new THREE.DirectionalLight(0xffffff, 1)
      dir.position.set(5, 5, 5)
      scene.add(dir)
      const dir2 = new THREE.DirectionalLight(0xff6b00, 0.6)
      dir2.position.set(-3, 2, -3)
      scene.add(dir2)

      // Ground (transparent grid)
      const grid = new THREE.GridHelper(20, 30, 0xff6b00, 0x444444)
      grid.material.opacity = 0.18
      grid.material.transparent = true
      grid.position.y = -0.6
      scene.add(grid)

      // Truck group
      const truck = new THREE.Group()

      const matBody = new THREE.MeshStandardMaterial({ color, metalness: 0.4, roughness: 0.4 })
      const matCab = new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.6, roughness: 0.3 })
      const matWheel = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.8 })
      const matRim = new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.9, roughness: 0.2 })
      const matWindow = new THREE.MeshStandardMaterial({ color: 0x4488cc, transparent: true, opacity: 0.55, metalness: 0.9, roughness: 0.1 })

      // Cargo body
      const cargo = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.5, 1.4), matBody)
      cargo.position.set(0.5, 0.5, 0)
      truck.add(cargo)

      // Cab
      const cab = new THREE.Mesh(new THREE.BoxGeometry(1, 1.2, 1.3), matCab)
      cab.position.set(-0.9, 0.4, 0)
      truck.add(cab)

      // Cab roof
      const roof = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.15, 1.32), matCab)
      roof.position.set(-0.9, 1.05, 0)
      truck.add(roof)

      // Windshield
      const winShield = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.6, 1.1), matWindow)
      winShield.position.set(-1.4, 0.6, 0)
      winShield.rotation.z = 0.15
      truck.add(winShield)

      // Side windows
      const sideWin = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.45, 0.05), matWindow)
      sideWin.position.set(-0.9, 0.7, 0.66)
      truck.add(sideWin)
      const sideWin2 = sideWin.clone()
      sideWin2.position.z = -0.66
      truck.add(sideWin2)

      // Wheels (4)
      const wheelPositions = [
        [-1.4, -0.35, 0.7], [-1.4, -0.35, -0.7],
        [0.6, -0.35, 0.7], [0.6, -0.35, -0.7],
        [1.5, -0.35, 0.7], [1.5, -0.35, -0.7],
      ]
      const wheels = []
      wheelPositions.forEach(p => {
        const tireGeo = new THREE.CylinderGeometry(0.32, 0.32, 0.22, 24)
        const tire = new THREE.Mesh(tireGeo, matWheel)
        tire.rotation.z = Math.PI / 2
        tire.position.set(...p)
        truck.add(tire)
        const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.24, 16), matRim)
        rim.rotation.z = Math.PI / 2
        rim.position.set(...p)
        truck.add(rim)
        wheels.push(tire, rim)
      })

      // Headlights
      const headL = new THREE.Mesh(new THREE.SphereGeometry(0.1, 16, 16), new THREE.MeshStandardMaterial({ color: 0xffffaa, emissive: 0xffff00, emissiveIntensity: 0.6 }))
      headL.position.set(-1.5, 0.1, 0.5)
      truck.add(headL)
      const headR = headL.clone()
      headR.position.z = -0.5
      truck.add(headR)

      // Logo accent on cargo (front-facing strip)
      const stripe = new THREE.Mesh(new THREE.BoxGeometry(2.21, 0.18, 1.41), new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.5, roughness: 0.6 }))
      stripe.position.set(0.5, 0.0, 0)
      truck.add(stripe)

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
        t += 0.01
        if (autoRotate) targetRotY = t * 0.4
        targetRotY += (mouseX * 0.5 - (targetRotY - (autoRotate ? t * 0.4 : 0))) * 0.05
        targetRotX += (-mouseY * 0.2 - targetRotX) * 0.05
        truck.rotation.y = targetRotY
        truck.rotation.x = targetRotX * 0.3
        truck.position.y = Math.sin(t * 1.2) * 0.05
        wheels.forEach(w => { w.rotation.x = t * 4 })
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
