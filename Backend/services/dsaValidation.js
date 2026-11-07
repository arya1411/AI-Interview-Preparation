const { isDeepStrictEqual } = require('node:util');
const LANGUAGES = ['javascript', 'python', 'cpp', 'java'];
const TYPES = ['int', 'int[]', 'string', 'bool'];
class DsaError extends Error {
  constructor(message, status = 400) { super(message); this.status = status; }
}
const validId = id => typeof id === 'string' && /^[a-zA-Z0-9_-]{1,100}$/.test(id) && !Object.hasOwn(Object.prototype, id);
function matchesType(value, type) {
  if (type === 'int') return Number.isInteger(value) && value >= -2147483648 && value <= 2147483647;
  if (type === 'int[]') return Array.isArray(value) && value.length <= 20000 && value.every(v => matchesType(v, 'int'));
  if (type === 'string') return typeof value === 'string' && value.length <= 20000;
  return type === 'bool' && typeof value === 'boolean';
}
function validateSheet(sheet) {
  if (!sheet || typeof sheet.name !== 'string' || !sheet.name.trim() || sheet.name.length > 200 || !Array.isArray(sheet.questions) || sheet.questions.length < 1 || sheet.questions.length > 200 || Buffer.byteLength(JSON.stringify(sheet)) > 1024 * 1024) throw new DsaError('Provide a named sheet with 1–200 questions, up to 1 MB.');
  const ids = new Set();
  for (const q of sheet.questions) {
    if (!q || !validId(q.id) || ids.has(q.id) || !['Easy','Medium','Hard'].includes(q.difficulty) || ['title','topic','description','starter'].some(key => typeof q[key] !== 'string' || !q[key].trim() || q[key].length > 30000)) throw new DsaError('Invalid question fields or duplicate problem IDs.');
    if (!Array.isArray(q.tests) || !q.tests.length || q.tests.length > 50 || q.tests.some(t => !t || !Array.isArray(t.args) || !Object.hasOwn(t,'expected'))) throw new DsaError('Each problem needs 1–50 tests with args and expected output.');
    if (q.constraints !== undefined && (!Array.isArray(q.constraints) || q.constraints.some(c => typeof c !== 'string'))) throw new DsaError('Constraints must be a list of strings.');
    if (q.hint !== undefined && typeof q.hint !== 'string') throw new DsaError('Hints must be strings.');
    if (q.starters !== undefined && (!q.starters || typeof q.starters !== 'object' || Object.entries(q.starters).some(([key,value]) => !LANGUAGES.includes(key) || typeof value !== 'string' || value.length > 64000))) throw new DsaError('Invalid language starter code.');
    if (q.signature) {
      const { args, returns, names } = q.signature;
      if (!Array.isArray(args) || args.length > 10 || args.some(t => !TYPES.includes(t)) || !TYPES.includes(returns) || (names !== undefined && (!Array.isArray(names) || names.length !== args.length || names.some(n => !/^[a-zA-Z][a-zA-Z0-9_]*$/.test(n))))) throw new DsaError('Invalid function signature. Supported types: int, int[], string, bool.');
      if (q.tests.some(t => t.args.length !== args.length || t.args.some((v,i) => !matchesType(v,args[i])) || !matchesType(t.expected,returns))) throw new DsaError('Test values must match the function signature.');
    }
    ids.add(q.id);
  }
  return sheet;
}
function validateContent(content, sheet) {
  if (!content || typeof content !== 'object' || Buffer.byteLength(JSON.stringify(content)) > 2 * 1024 * 1024) throw new DsaError('Workspace data is too large.');
  const ids = new Set(sheet.questions.map(q=>q.id));
  const cleaned = { drafts: {}, bookmarks: {}, notes: {} };
  for (const field of Object.keys(cleaned)) {
    const map = content[field];
    if (!map || typeof map !== 'object' || Array.isArray(map)) throw new DsaError(`Invalid ${field}.`);
    for (const [key,value] of Object.entries(map)) {
      const [id, language, extra] = key.split(':');
      if (!ids.has(id) || extra || (field === 'drafts' ? !LANGUAGES.includes(language) : language !== undefined)) throw new DsaError('Unknown problem or draft language.');
      if (field === 'bookmarks' ? typeof value !== 'boolean' : typeof value !== 'string' || value.length > (field === 'drafts' ? 64000 : 20000)) throw new DsaError(`Invalid ${field} value.`);
      cleaned[field][key] = value;
    }
  }
  return cleaned;
}
module.exports = { DsaError, LANGUAGES, validateSheet, validateContent, equalValues: isDeepStrictEqual };
