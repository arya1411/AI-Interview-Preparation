export function validateSheet(value) {
  const fail = () => { throw new Error('Use a sheet with a name and 1–200 questions. Each question needs a unique id, title, topic, difficulty (Easy/Medium/Hard), description, starter, and 1–50 tests with args and expected. See the downloaded template.') }
  if (!value || typeof value.name !== 'string' || !value.name.trim() || !Array.isArray(value.questions) || !value.questions.length || value.questions.length > 200) fail()
  const ids = new Set()
  for (const q of value.questions) {
    if (!q || ['id', 'title', 'topic', 'description', 'starter'].some(key => typeof q[key] !== 'string' || !q[key].trim()) || !/^[a-zA-Z0-9_-]+$/.test(q.id) || Object.hasOwn(Object.prototype, q.id) || ids.has(q.id) || !['Easy', 'Medium', 'Hard'].includes(q.difficulty)) fail()
    if (!Array.isArray(q.tests) || !q.tests.length || q.tests.length > 50 || q.tests.some(t => !t || !Array.isArray(t.args) || !Object.hasOwn(t, 'expected'))) fail()
    if (q.constraints !== undefined && (!Array.isArray(q.constraints) || q.constraints.some(c => typeof c !== 'string'))) fail()
    if (q.hint !== undefined && typeof q.hint !== 'string') fail()
    ids.add(q.id)
  }
  return value
}

export function formatValue(value) {
  return value === undefined ? 'undefined' : JSON.stringify(value)
}

// Compare JSON values structurally; object key order must not affect a result.
export function equalValues(a, b) {
  if (a === b) return true
  if (a === null || b === null || typeof a !== 'object' || typeof b !== 'object') return false
  if (Array.isArray(a) !== Array.isArray(b)) return false
  const keys = Object.keys(a)
  return keys.length === Object.keys(b).length && keys.every(key => Object.hasOwn(b, key) && equalValues(a[key], b[key]))
}
