'use client'

/**
 * Animated 3D Background — pure CSS, no dependencies.
 * Variants: 'mesh' | 'aurora' | 'grid' | 'particles'
 */
export default function AnimatedBackground({ variant = 'mesh', intensity = 1, fixed = true, children }) {
  const baseStyle = {
    position: fixed ? 'fixed' : 'absolute',
    inset: 0,
    zIndex: -1,
    pointerEvents: 'none',
    overflow: 'hidden',
    opacity: intensity,
  }

  const renderMesh = () => (
    <div style={{ ...baseStyle }}>
      <div style={{ position: 'absolute', top: '-25%', left: '-25%', width: '60%', height: '60%', background: 'radial-gradient(circle, rgba(255,107,0,0.18), transparent 70%)', filter: 'blur(40px)', animation: 'meshA 20s ease-in-out infinite' }} />
      <div style={{ position: 'absolute', top: '20%', right: '-20%', width: '50%', height: '50%', background: 'radial-gradient(circle, rgba(124,58,237,0.15), transparent 70%)', filter: 'blur(60px)', animation: 'meshB 25s ease-in-out infinite' }} />
      <div style={{ position: 'absolute', bottom: '-20%', left: '20%', width: '70%', height: '60%', background: 'radial-gradient(circle, rgba(37,99,235,0.12), transparent 70%)', filter: 'blur(50px)', animation: 'meshC 30s ease-in-out infinite' }} />
      <div style={{ position: 'absolute', top: '40%', left: '50%', width: '40%', height: '40%', background: 'radial-gradient(circle, rgba(22,163,74,0.10), transparent 70%)', filter: 'blur(50px)', animation: 'meshD 22s ease-in-out infinite' }} />
      <style jsx global>{`
        @keyframes meshA { 0%,100%{transform:translate(0,0) scale(1);} 50%{transform:translate(30%,20%) scale(1.2);} }
        @keyframes meshB { 0%,100%{transform:translate(0,0) scale(1);} 50%{transform:translate(-25%,30%) scale(1.3);} }
        @keyframes meshC { 0%,100%{transform:translate(0,0) scale(1);} 50%{transform:translate(20%,-25%) scale(1.15);} }
        @keyframes meshD { 0%,100%{transform:translate(0,0) scale(1);} 50%{transform:translate(-30%,-20%) scale(1.25);} }
      `}</style>
    </div>
  )

  const renderAurora = () => (
    <div style={{ ...baseStyle }}>
      <div style={{ position: 'absolute', inset: '-50%', background: 'conic-gradient(from 0deg at 50% 50%, rgba(255,107,0,0.20), rgba(124,58,237,0.12), rgba(37,99,235,0.12), rgba(22,163,74,0.12), rgba(255,107,0,0.20))', filter: 'blur(80px)', animation: 'spin 25s linear infinite' }} />
    </div>
  )

  const renderGrid = () => (
    <div style={{ ...baseStyle }}>
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: 'linear-gradient(rgba(255,107,0,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,107,0,0.06) 1px, transparent 1px)',
        backgroundSize: '50px 50px',
        transform: 'perspective(1000px) rotateX(60deg) translateY(-200px) translateZ(-100px)',
        transformOrigin: 'center bottom',
        maskImage: 'linear-gradient(to bottom, transparent 0%, black 30%, black 70%, transparent 100%)',
        animation: 'gridScroll 30s linear infinite'
      }} />
      <style jsx global>{`
        @keyframes gridScroll { from { background-position: 0 0; } to { background-position: 50px 50px; } }
      `}</style>
    </div>
  )

  const renderParticles = () => {
    // 30 particles
    const particles = Array.from({ length: 30 }).map((_, i) => {
      const left = Math.random() * 100
      const top = Math.random() * 100
      const size = 2 + Math.random() * 4
      const delay = Math.random() * 20
      const duration = 15 + Math.random() * 20
      const colors = ['#ff6b00', '#7c3aed', '#2563eb', '#16a34a']
      const color = colors[Math.floor(Math.random() * colors.length)]
      return (
        <span
          key={i}
          style={{
            position: 'absolute', left: `${left}%`, top: `${top}%`,
            width: `${size}px`, height: `${size}px`, borderRadius: '50%',
            background: color, opacity: 0.5,
            boxShadow: `0 0 ${size * 3}px ${color}`,
            animation: `particle${i % 4} ${duration}s ${delay}s ease-in-out infinite`
          }}
        />
      )
    })
    return (
      <div style={{ ...baseStyle }}>
        {particles}
        <style jsx global>{`
          @keyframes particle0 { 0%,100% { transform: translate(0,0); } 50% { transform: translate(50px, -80px); } }
          @keyframes particle1 { 0%,100% { transform: translate(0,0); } 50% { transform: translate(-60px, 70px); } }
          @keyframes particle2 { 0%,100% { transform: translate(0,0); } 50% { transform: translate(80px, 100px); } }
          @keyframes particle3 { 0%,100% { transform: translate(0,0); } 50% { transform: translate(-90px, -90px); } }
        `}</style>
      </div>
    )
  }

  const renderers = { mesh: renderMesh, aurora: renderAurora, grid: renderGrid, particles: renderParticles }
  const RenderFn = renderers[variant] || renderMesh

  return (
    <>
      {RenderFn()}
      {children}
    </>
  )
}
