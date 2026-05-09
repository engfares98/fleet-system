/**
 * Granular Permissions System
 *
 * Modules: vehicles, drivers, maintenance, fuel, reports, attachments, users, audit
 * Actions: read, create, edit, delete, export
 */

export const MODULES = [
  { key: 'vehicles', label: 'المركبات', icon: '🚛' },
  { key: 'drivers', label: 'السائقون', icon: '👤' },
  { key: 'maintenance', label: 'الصيانة', icon: '🔧' },
  { key: 'fuel', label: 'الوقود', icon: '⛽' },
  { key: 'attachments', label: 'المرفقات', icon: '📎' },
  { key: 'reports', label: 'التقارير', icon: '📊' },
  { key: 'users', label: 'المستخدمون', icon: '👥' },
  { key: 'audit', label: 'سجل النشاط', icon: '📜' },
]

export const ACTIONS = [
  { key: 'read', label: 'عرض' },
  { key: 'create', label: 'إضافة' },
  { key: 'edit', label: 'تعديل' },
  { key: 'delete', label: 'حذف' },
  { key: 'export', label: 'تصدير' },
]

/**
 * Default permission templates per role.
 */
export const ROLE_TEMPLATES = {
  admin: {
    vehicles: ['read', 'create', 'edit', 'delete', 'export'],
    drivers: ['read', 'create', 'edit', 'delete', 'export'],
    maintenance: ['read', 'create', 'edit', 'delete', 'export'],
    fuel: ['read', 'create', 'edit', 'delete', 'export'],
    attachments: ['read', 'create', 'edit', 'delete'],
    reports: ['read', 'export'],
    users: ['read', 'create', 'edit', 'delete'],
    audit: ['read'],
  },
  editor: {
    vehicles: ['read', 'create', 'edit', 'export'],
    drivers: ['read', 'create', 'edit', 'export'],
    maintenance: ['read', 'create', 'edit'],
    fuel: ['read', 'create', 'edit'],
    attachments: ['read', 'create', 'edit'],
    reports: ['read', 'export'],
    users: [],
    audit: [],
  },
  viewer: {
    vehicles: ['read'],
    drivers: ['read'],
    maintenance: ['read'],
    fuel: ['read'],
    attachments: ['read'],
    reports: ['read'],
    users: [],
    audit: [],
  },
}

/**
 * Check if user has a specific permission.
 * Falls back to role template when no per-user override.
 */
export function can(role, permissions, module, action) {
  // Admin shortcut
  if (role === 'admin' && (!permissions || Object.keys(permissions).length === 0)) {
    return ROLE_TEMPLATES.admin[module]?.includes(action) ?? false
  }
  // Per-user permissions if set
  if (permissions && permissions[module]) {
    return Array.isArray(permissions[module]) && permissions[module].includes(action)
  }
  // Fallback to role template
  const template = ROLE_TEMPLATES[role || 'viewer']
  return template?.[module]?.includes(action) ?? false
}

/**
 * Get effective permissions for a user.
 */
export function getEffectivePermissions(role, customPermissions) {
  const base = ROLE_TEMPLATES[role || 'viewer'] || ROLE_TEMPLATES.viewer
  if (!customPermissions || Object.keys(customPermissions).length === 0) return base
  return { ...base, ...customPermissions }
}
