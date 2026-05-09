'use client'
import { useEffect, useRef, useState } from 'react'

const PREFIX = 'fleet_draft_'

/**
 * Saves form state to localStorage after a debounce delay.
 * Returns: { savedAt, restore, clear, hasDraft }
 */
export default function useAutoSave(formKey, value, options = {}) {
  const { delay = 800, enabled = true } = options
  const [savedAt, setSavedAt] = useState(null)
  const [hasDraft, setHasDraft] = useState(false)
  const timer = useRef(null)
  const key = PREFIX + formKey

  // Check if a draft exists on mount
  useEffect(() => {
    if (typeof window === 'undefined') return
    const existing = localStorage.getItem(key)
    setHasDraft(!!existing)
  }, [key])

  // Auto-save on value change
  useEffect(() => {
    if (!enabled) return
    if (typeof window === 'undefined') return
    if (value === null || value === undefined) return

    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      try {
        const isEmpty = !value || (typeof value === 'object' && Object.values(value).every(v => v === '' || v === null || v === undefined))
        if (isEmpty) {
          localStorage.removeItem(key)
          setHasDraft(false)
          return
        }
        localStorage.setItem(key, JSON.stringify({ value, savedAt: Date.now() }))
        setSavedAt(Date.now())
        setHasDraft(true)
      } catch (e) {
        // ignore
      }
    }, delay)

    return () => { if (timer.current) clearTimeout(timer.current) }
  }, [value, enabled, delay, key])

  const restore = () => {
    if (typeof window === 'undefined') return null
    try {
      const raw = localStorage.getItem(key)
      if (!raw) return null
      const parsed = JSON.parse(raw)
      return parsed?.value || null
    } catch {
      return null
    }
  }

  const clear = () => {
    if (typeof window === 'undefined') return
    localStorage.removeItem(key)
    setHasDraft(false)
    setSavedAt(null)
  }

  return { savedAt, restore, clear, hasDraft }
}

/**
 * Format a "saved X ago" indicator in Arabic.
 */
export function formatSavedAgo(timestamp) {
  if (!timestamp) return ''
  const ms = Date.now() - timestamp
  if (ms < 5000) return '✓ تم الحفظ'
  if (ms < 60000) return `✓ حُفظ قبل ${Math.floor(ms / 1000)} ثانية`
  if (ms < 3600000) return `✓ حُفظ قبل ${Math.floor(ms / 60000)} دقيقة`
  return '✓ مسودة محفوظة'
}
