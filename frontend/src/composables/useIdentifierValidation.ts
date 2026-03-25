/** PostgreSQL identifier validation result */
export interface IdentifierIssue {
  level: 'error' | 'warning'
  message: string
}

// PostgreSQL reserved keywords (most common subset)
const RESERVED_WORDS = new Set([
  'all', 'analyse', 'analyze', 'and', 'any', 'array', 'as', 'asc', 'authorization',
  'between', 'binary', 'both', 'case', 'cast', 'check', 'collate', 'column',
  'constraint', 'create', 'cross', 'default', 'deferrable', 'desc', 'distinct', 'do',
  'else', 'end', 'except', 'false', 'fetch', 'for', 'foreign', 'from', 'grant', 'group',
  'having', 'in', 'initially', 'inner', 'intersect', 'into', 'is', 'join', 'lateral',
  'leading', 'left', 'like', 'limit', 'localtime', 'localtimestamp', 'natural', 'not',
  'null', 'offset', 'on', 'only', 'or', 'order', 'outer', 'overlaps', 'placing',
  'primary', 'references', 'returning', 'right', 'select', 'session_user', 'similar',
  'some', 'symmetric', 'table', 'then', 'to', 'trailing', 'true', 'union', 'unique',
  'user', 'using', 'variadic', 'verbose', 'when', 'where', 'window', 'with',
])

const VALID_IDENT = /^[a-zA-Z_][a-zA-Z0-9_]*$/
const SNAKE_CASE = /^[a-z][a-z0-9_]*$/
const CAMEL_CASE = /^[a-z][a-zA-Z0-9]*$/

/**
 * Validate a PostgreSQL identifier.
 * Returns array of issues (empty = valid).
 */
export function validateIdentifier(name: string, naming?: string): IdentifierIssue[] {
  const issues: IdentifierIssue[] = []

  if (!name || !name.trim()) {
    issues.push({ level: 'error', message: 'Name is required' })
    return issues
  }

  if (name.length > 63) {
    issues.push({ level: 'error', message: `Name exceeds 63 characters (${name.length})` })
  }

  if (!VALID_IDENT.test(name)) {
    if (/^\d/.test(name)) {
      issues.push({ level: 'error', message: 'Must start with a letter or underscore' })
    } else {
      issues.push({ level: 'error', message: 'Contains invalid characters (use letters, digits, underscore)' })
    }
  }

  if (RESERVED_WORDS.has(name.toLowerCase())) {
    issues.push({ level: 'warning', message: `"${name}" is a PostgreSQL reserved keyword` })
  }

  if (naming === 'snake_case' && !SNAKE_CASE.test(name)) {
    issues.push({ level: 'warning', message: 'Violates snake_case convention' })
  }
  if (naming === 'camelCase' && !CAMEL_CASE.test(name)) {
    issues.push({ level: 'warning', message: 'Violates camelCase convention' })
  }

  return issues
}

/** Returns first blocking error message, or null if valid */
export function identifierError(name: string): string | null {
  const issues = validateIdentifier(name)
  const err = issues.find(i => i.level === 'error')
  return err?.message ?? null
}

/** Returns first warning message, or null */
export function identifierWarning(name: string, naming?: string): string | null {
  const issues = validateIdentifier(name, naming)
  const warn = issues.find(i => i.level === 'warning')
  return warn?.message ?? null
}
