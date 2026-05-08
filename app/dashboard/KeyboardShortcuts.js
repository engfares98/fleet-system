'use client'
import { useEffect, useState } from 'react'

const SHORTCUTS = [
  { keys: ['Ctrl', 'K'], desc: 'البحث السريع' },
  { keys: ['Ctrl', 'N'], desc: 'إضافة مركبة جديدة' },
  { keys: ['Ctrl', 'D'], desc: 'لوحة التحكم' },
  { keys: ['Ctrl', 'V'], desc: 'المركبات' },
  { keys: ['Ctrl', 'U'], desc: 'السائقون' },
  { keys: ['Ctrl', 'M'], desc: 'الصيانة' },
  { keys: ['Ctrl', 'F'], desc: 'الوقود' },
  { keys: ['Ctrl', 'R'], desc: 'التقارير' },
  { keys: ['Ctrl', 'L'], desc: 'تبديل اللغة' },
  { keys: ['Ctrl', 'B'], desc: 'تبديل الثيم' },
  { keys: ['Ctrl', '/'], desc: 'عرض / إخفاء الاختصارات' },
  { keys: ['Esc'], desc: 'إغلاق النوافذ' },
]

export default function KeyboardShortcuts({ onSearch, onNewVehicle, onSwitchTab, onToggleLang, onToggleTheme }) {
  const [showHelp, setShowHelp] = useState(false)

  useEffect(() => {
    const handler = (e) => {
      // Skip if user is typing in an input
      const tag = (e.target.tagName || '').toLowerCase()
      const isInput = tag === 'input' || tag === 'textarea' || tag === 'select' || e.target.isContentEditable
      if (isInput && !(e.ctrlKey || e.metaKey)) return

      const ctrl = e.ctrlKey || e.metaKey
      const k = e.key.toLowerCase()

      if (ctrl && k === 'k') { e.preventDefault(); onSearch && onSearch() }
      else if (ctrl && k === 'n') { e.preventDefault(); onNewVehicle && onNewVehicle() }
      else if (ctrl && k === 'd') { e.preventDefault(); onSwitchTab && onSwitchTab('dashboard') }
      else if (ctrl && k === 'v') { e.preventDefault(); onSwitchTab && onSwitchTab('vehicles') }
      else if (ctrl && k === 'u') { e.preventDefault(); onSwitchTab && onSwitchTab('drivers') }
      else if (ctrl && k === 'm') { e.preventDefault(); onSwitchTab && onSwitchTab('maintenance') }
      else if (ctrl && k === 'f') { e.preventDefault(); onSwitchTab && onSwitchTab('fuel') }
      else if (ctrl && k === 'r') { e.preventDefault(); onSwitchTab && onSwitchTab('reports') }
      else if (ctrl && k === 'l') { e.preventDefault(); onToggleLang && onToggleLang() }
      else if (ctrl && k === 'b') { e.preventDefault(); onToggleTheme && onToggleTheme() }
      else if (ctrl && k === '/') { e.preventDefault(); setShowHelp(s => !s) }
      else if (k === 'escape') setShowHelp(false)
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onSearch, onNewVehicle, onSwitchTab, onToggleLang, onToggleTheme])

  if (!showHelp) return null

  return (
    <div
      onClick={() => setShowHelp(false)}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(6px)', zIndex: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', animation: 'fadeIn 0.2s' }}
    >
      <div
        onClick={e => e.stopPropagation()}
        dir="rtl"
        style={{ background: 'var(--surface)', borderRadius: '16px', padding: '24px 28px', maxWidth: '480px', width: '100%', boxShadow: 'var(--shadow-xl)', fontFamily: 'Cairo, sans-serif', animation: 'scaleIn 0.25s' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div style={{ fontWeight: '900', fontSize: '17px', color: 'var(--text)' }}>⌨️ اختصارات لوحة المفاتيح</div>
          <button onClick={() => setShowHelp(false)} style={{ background: 'var(--surface-2)', border: 'none', width: '28px', height: '28px', borderRadius: '6px', cursor: 'pointer', color: 'var(--text-muted)' }}>✕</button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {SHORTCUTS.map((s, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'var(--surface-2)', borderRadius: '8px' }}>
              <span style={{ fontSize: '13px', color: 'var(--text)' }}>{s.desc}</span>
              <div style={{ display: 'flex', gap: '4px' }}>
                {s.keys.map((k, j) => (
                  <kbd key={j} style={{ background: 'var(--surface-3)', border: '1px solid var(--border)', borderRadius: '4px', padding: '2px 8px', fontSize: '11px', fontWeight: '700', fontFamily: 'monospace', color: 'var(--text)', minWidth: '24px', textAlign: 'center' }}>{k}</kbd>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: '16px', padding: '10px 12px', background: 'var(--accent-soft)', borderRadius: '8px', fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center' }}>
          💡 اضغط <kbd style={{ background: 'var(--surface-3)', padding: '1px 6px', borderRadius: '3px' }}>Ctrl + /</kbd> في أي وقت لعرض هذه القائمة
        </div>
      </div>
    </div>
  )
}
