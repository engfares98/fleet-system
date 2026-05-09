'use client'
import { useRef, useState } from 'react'

/**
 * 3D Tilt Card — tilts based on mouse position.
 * Wrap any content. Use `intensity` to control tilt strength (default 12 degrees).
 */
export default function TiltCard({ children, intensity = 12, scale = 1.02, className = '', style = {}, glow = false, ...rest }) {
  const ref = useRef(null)
  const [transform, setTransform] = useState('perspective(1000px) rotateX(0) rotateY(0) scale(1)')
  const [glarePos, setGlarePos] = useState({ x: 50, y: 50 })

  const handleMove = (e) => {
    const el = ref.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const cx = rect.width / 2
    const cy = rect.height / 2
    const rotateY = ((x - cx) / cx) * intensity
    const rotateX = -((y - cy) / cy) * intensity
    setTransform(`perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(${scale})`)
    setGlarePos({ x: (x / rect.width) * 100, y: (y / rect.height) * 100 })
  }

  const handleLeave = () => {
    setTransform('perspective(1000px) rotateX(0) rotateY(0) scale(1)')
    setGlarePos({ x: 50, y: 50 })
  }

  return (
    <div
      ref={ref}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      className={className}
      style={{
        transform,
        transition: 'transform 0.18s ease-out',
        transformStyle: 'preserve-3d',
        position: 'relative',
        willChange: 'transform',
        ...style,
      }}
      {...rest}
    >
      {children}
      {glow && (
        <div
          aria-hidden
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: 'inherit',
            background: `radial-gradient(circle at ${glarePos.x}% ${glarePos.y}%, rgba(255,255,255,0.15), transparent 50%)`,
            pointerEvents: 'none',
            transition: 'opacity 0.2s',
            mixBlendMode: 'overlay',
          }}
        />
      )}
    </div>
  )
}
