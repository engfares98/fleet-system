'use client'
import { useState } from 'react'
import { MODULES, ACTIONS, ROLE_TEMPLATES } from './permissions'

export default function PermissionsManager({ user, onSave, onClose, isMobile }) {
  const initialPerms = user.permissions && Object.keys(user.permissions).length > 0
    ? user.permissions
    : ROLE_TEMPLATES[user.role] || ROLE_TEMPLATES.viewer
  const [perms, setPerms] = useState(initialPerms)
  const [role, setRole] = useState(user.role || 'viewer')
  const [saving, setSaving] = useState(false)

  const toggle = (module, action) => {
    setPerms(p => {
      const list = p[module] || []
      const newList = list.includes(action) ? list.filter(a => a !== action) : [...list, action]
      return { ...p, [module]: newList }
    })
  }

  const applyTemplate = (newRole) => {
    setRole(newRole)
    setPerms(ROLE_TEMPLATES[newRole] || ROLE_TEMPLATES.viewer)
  }

  const handleSave = async () => {
    setSaving(true)
    await onSave({ role, permissions: perms })
    setSaving(false)
  }

  return (
    <div>
      <div style={{ marginBottom: '16px' }}>
        <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>الدور الأساسي</label>
        <div style={{ display: 'flex', gap: '8px' }}>
          {['admin', 'editor', 'viewer'].map(r => (
            <button key={r} onClick={() => applyTemplate(r)} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: `2px solid ${role === r ? 'var(--accent)' : 'var(--border)'}`, background: role === r ? 'var(--accent-soft)' : 'var(--surface)', color: role === r ? 'var(--accent)' : 'var(--text)', fontWeight: '700', cursor: 'pointer', fontFamily: 'Cairo, sans-serif', fontSize: '13px' }}>
              {r === 'admin' ? '🛡️ مدير' : r === 'editor' ? '📝 محرر' : '🔍 مشاهد'}
            </button>
          ))}
        </div>
        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px' }}>اختيار دور يطبّق صلاحياته الافتراضية. ثم خصّص أدناه إن لزم.</div>
      </div>

      <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: '12px', padding: '12px', marginBottom: '16px', overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'right', padding: '8px', color: 'var(--text-muted)', fontWeight: '700', fontSize: '11px' }}>القسم</th>
              {ACTIONS.map(a => (
                <th key={a.key} style={{ padding: '8px', color: 'var(--text-muted)', fontWeight: '700', fontSize: '11px', textAlign: 'center' }}>{a.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {MODULES.map(m => (
              <tr key={m.key}>
                <td style={{ padding: '10px 8px', fontWeight: '700', color: 'var(--text)' }}>{m.icon} {m.label}</td>
                {ACTIONS.map(a => {
                  const checked = (perms[m.key] || []).includes(a.key)
                  return (
                    <td key={a.key} style={{ padding: '10px 8px', textAlign: 'center' }}>
                      <input type="checkbox" checked={checked} onChange={() => toggle(m.key, a.key)} style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: 'var(--accent)' }} />
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
        {onClose && <button onClick={onClose} style={{ padding: '10px 20px', border: '1px solid var(--border)', borderRadius: '8px', background: 'var(--surface)', cursor: 'pointer', fontFamily: 'Cairo, sans-serif', fontWeight: '700', color: 'var(--text)' }}>إلغاء</button>}
        <button onClick={handleSave} disabled={saving} style={{ padding: '10px 24px', border: 'none', borderRadius: '8px', background: 'linear-gradient(135deg, var(--accent), var(--accent-2))', color: '#fff', cursor: 'pointer', fontFamily: 'Cairo, sans-serif', fontWeight: '700', boxShadow: 'var(--shadow-accent)' }}>
          {saving ? '⏳ جاري الحفظ...' : '✓ حفظ الصلاحيات'}
        </button>
      </div>
    </div>
  )
}
