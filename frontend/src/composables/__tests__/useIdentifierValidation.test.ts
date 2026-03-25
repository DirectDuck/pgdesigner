import { describe, it, expect } from 'vitest'
import { validateIdentifier, identifierError, identifierWarning } from '../useIdentifierValidation'

describe('validateIdentifier', () => {
  // --- Errors ---

  it('empty name', () => {
    const issues = validateIdentifier('')
    expect(issues).toHaveLength(1)
    expect(issues[0]!.level).toBe('error')
    expect(issues[0]!.message).toContain('required')
  })

  it('whitespace-only name', () => {
    expect(validateIdentifier('  ')[0]!.level).toBe('error')
  })

  it('exceeds 63 characters', () => {
    const long = 'a'.repeat(64)
    const issues = validateIdentifier(long)
    expect(issues.some(i => i.level === 'error' && i.message.includes('63'))).toBe(true)
  })

  it('exactly 63 characters is valid', () => {
    const name = 'a'.repeat(63)
    const issues = validateIdentifier(name)
    expect(issues.filter(i => i.level === 'error')).toHaveLength(0)
  })

  it('starts with digit', () => {
    const issues = validateIdentifier('1table')
    expect(issues.some(i => i.level === 'error' && i.message.includes('start'))).toBe(true)
  })

  it('contains spaces', () => {
    const issues = validateIdentifier('my table')
    expect(issues.some(i => i.level === 'error' && i.message.includes('invalid'))).toBe(true)
  })

  it('contains hyphen', () => {
    const issues = validateIdentifier('my-table')
    expect(issues.some(i => i.level === 'error' && i.message.includes('invalid'))).toBe(true)
  })

  it('contains dot', () => {
    const issues = validateIdentifier('schema.table')
    expect(issues.some(i => i.level === 'error' && i.message.includes('invalid'))).toBe(true)
  })

  // --- Valid identifiers ---

  it('simple name', () => {
    expect(validateIdentifier('users')).toHaveLength(0)
  })

  it('underscore prefix', () => {
    expect(validateIdentifier('_temp')).toHaveLength(0)
  })

  it('camelCase', () => {
    expect(validateIdentifier('userId')).toHaveLength(0)
  })

  it('snake_case', () => {
    expect(validateIdentifier('user_id')).toHaveLength(0)
  })

  it('with digits', () => {
    expect(validateIdentifier('table2')).toHaveLength(0)
  })

  // --- Warnings: reserved keywords ---

  it('reserved keyword "user"', () => {
    const issues = validateIdentifier('user')
    expect(issues).toHaveLength(1)
    expect(issues[0]!.level).toBe('warning')
    expect(issues[0]!.message).toContain('reserved')
  })

  it('reserved keyword "order"', () => {
    const issues = validateIdentifier('order')
    expect(issues.some(i => i.level === 'warning' && i.message.includes('reserved'))).toBe(true)
  })

  it('reserved keyword "table"', () => {
    expect(validateIdentifier('table').some(i => i.message.includes('reserved'))).toBe(true)
  })

  it('non-reserved word is clean', () => {
    expect(validateIdentifier('users')).toHaveLength(0)
  })

  // --- Warnings: naming convention ---

  it('snake_case violation', () => {
    const issues = validateIdentifier('userId', 'snake_case')
    expect(issues.some(i => i.level === 'warning' && i.message.includes('snake_case'))).toBe(true)
  })

  it('snake_case valid', () => {
    const issues = validateIdentifier('user_id', 'snake_case')
    expect(issues.filter(i => i.message.includes('snake_case'))).toHaveLength(0)
  })

  it('camelCase violation', () => {
    const issues = validateIdentifier('user_id', 'camelCase')
    expect(issues.some(i => i.level === 'warning' && i.message.includes('camelCase'))).toBe(true)
  })

  it('camelCase valid', () => {
    const issues = validateIdentifier('userId', 'camelCase')
    expect(issues.filter(i => i.message.includes('camelCase'))).toHaveLength(0)
  })

  it('no naming check when convention not set', () => {
    expect(validateIdentifier('userId')).toHaveLength(0)
    expect(validateIdentifier('user_id')).toHaveLength(0)
  })

  // --- Multiple issues ---

  it('digit start + reserved', () => {
    // "1select" — starts with digit (error), but "select" check won't matter
    const issues = validateIdentifier('1select')
    expect(issues.some(i => i.level === 'error')).toBe(true)
  })
})

describe('identifierError', () => {
  it('returns null for valid name', () => {
    expect(identifierError('users')).toBeNull()
  })

  it('returns error message for empty', () => {
    expect(identifierError('')).toContain('required')
  })

  it('returns error for invalid chars', () => {
    expect(identifierError('my table')).toContain('invalid')
  })

  it('does not return warnings', () => {
    expect(identifierError('user')).toBeNull() // reserved = warning, not error
  })
})

describe('identifierWarning', () => {
  it('returns null for clean name', () => {
    expect(identifierWarning('users')).toBeNull()
  })

  it('returns warning for reserved word', () => {
    expect(identifierWarning('order')).toContain('reserved')
  })

  it('returns naming warning', () => {
    expect(identifierWarning('userId', 'snake_case')).toContain('snake_case')
  })
})
