/**
 * Audit Log Helper
 * Records every important action (create/update/delete) to public.audit_log
 */

let cachedUser = null

export function setAuditUser(user, role) {
  cachedUser = user ? { id: user.id, email: user.email, role } : null
}

function detectClient() {
  if (typeof window === 'undefined') return {}
  const ua = navigator.userAgent
  const isMobile = /Mobile|Android|iPhone|iPad/i.test(ua)
  return { user_agent: ua, device_type: isMobile ? 'mobile' : 'desktop' }
}

/**
 * Log an action.
 * @param {object} supabase - Supabase client
 * @param {object} entry - { action, entity_type, entity_id, entity_label, changes }
 */
export async function logAction(supabase, entry) {
  if (!supabase) return
  try {
    const client = detectClient()
    const payload = {
      user_id: cachedUser?.id || null,
      user_email: cachedUser?.email || null,
      user_role: cachedUser?.role || null,
      action: entry.action,
      entity_type: entry.entity_type,
      entity_id: entry.entity_id ? String(entry.entity_id) : null,
      entity_label: entry.entity_label || null,
      changes: entry.changes || null,
      user_agent: client.user_agent || null,
    }
    await supabase.from('audit_log').insert(payload)
  } catch (e) {
    // Audit failure should not break the main operation
    if (typeof console !== 'undefined') console.warn('audit log failed:', e?.message || e)
  }
}

/**
 * Log a login event.
 */
export async function logLogin(supabase, user, success = true) {
  if (!supabase || !user) return
  try {
    const client = detectClient()
    const ua = client.user_agent || ''
    const browser = /Chrome/i.test(ua) ? 'Chrome' : /Firefox/i.test(ua) ? 'Firefox' : /Safari/i.test(ua) ? 'Safari' : /Edge/i.test(ua) ? 'Edge' : 'Other'
    const os = /Windows/i.test(ua) ? 'Windows' : /Mac/i.test(ua) ? 'macOS' : /Linux/i.test(ua) ? 'Linux' : /Android/i.test(ua) ? 'Android' : /iPhone|iPad/i.test(ua) ? 'iOS' : 'Other'
    await supabase.from('login_history').insert({
      user_id: user.id,
      email: user.email,
      user_agent: ua,
      device_type: client.device_type || 'desktop',
      browser,
      os,
      success,
    })
  } catch (e) {
    if (typeof console !== 'undefined') console.warn('login log failed:', e?.message || e)
  }
}

/**
 * Compute diff between old and new objects (only changed fields).
 */
export function diffChanges(oldObj, newObj, ignoreKeys = ['updated_at', 'created_at']) {
  const changes = {}
  const all = new Set([...Object.keys(oldObj || {}), ...Object.keys(newObj || {})])
  for (const k of all) {
    if (ignoreKeys.includes(k)) continue
    if (typeof oldObj?.[k] === 'object' || typeof newObj?.[k] === 'object') continue
    if (oldObj?.[k] !== newObj?.[k]) {
      changes[k] = { from: oldObj?.[k] ?? null, to: newObj?.[k] ?? null }
    }
  }
  return Object.keys(changes).length > 0 ? changes : null
}
