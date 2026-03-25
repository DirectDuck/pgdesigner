import { describe, it, expect } from 'vitest'
import { shortcuts, shortcutsByContext, contextNames, statusBarHints } from '../shortcuts'

describe('shortcuts', () => {
  it('all shortcuts have required fields', () => {
    for (const s of shortcuts) {
      expect(s.key).toBeTruthy()
      expect(s.action).toBeTruthy()
      expect(s.context).toBeTruthy()
    }
  })

  it('every context has a display name', () => {
    const contexts = new Set(shortcuts.map(s => s.context))
    for (const ctx of contexts) {
      expect(contextNames[ctx]).toBeTruthy()
    }
  })
})

describe('shortcutsByContext', () => {
  it('groups by context', () => {
    const groups = shortcutsByContext()
    expect(groups['global']).toBeDefined()
    expect(groups['editor']).toBeDefined()
    expect(groups['grid']).toBeDefined()
  })

  it('every shortcut appears in its group', () => {
    const groups = shortcutsByContext()
    for (const s of shortcuts) {
      expect(groups[s.context]).toContainEqual(s)
    }
  })

  it('total count matches', () => {
    const groups = shortcutsByContext()
    const total = Object.values(groups).reduce((s, arr) => s + arr.length, 0)
    expect(total).toBe(shortcuts.length)
  })
})

describe('statusBarHints', () => {
  it('returns hints for known contexts', () => {
    expect(statusBarHints('grid')).toBeTruthy()
    expect(statusBarHints('editor')).toBeTruthy()
    expect(statusBarHints('constraints')).toBeTruthy()
    expect(statusBarHints('grid-edit')).toBeTruthy()
  })

  it('returns empty string for unknown context', () => {
    expect(statusBarHints('nonexistent')).toBe('')
  })
})
