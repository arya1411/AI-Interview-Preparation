import test from 'node:test'
import assert from 'node:assert/strict'
import { sampleSheet } from '../../data/dsaSheet.js'
import { equalValues, validateSheet } from './sheet.js'
import { validateWorkspaceResponse, workspaceErrorMessage } from './workspaceResponse.js'

test('sample sheet meets import contract', () => assert.equal(validateSheet(sampleSheet), sampleSheet))

test('rejects missing tests, invalid metadata, duplicate and reserved IDs', () => {
  for (const mutate of [
    s => { s.questions[0].tests = [] },
    s => { s.questions[0].difficulty = 'Unknown' },
    s => { s.questions[1].id = s.questions[0].id },
    s => { s.questions[0].id = '__proto__' },
    s => { s.questions[0].tests[0] = { args: [] } },
    s => { s.questions[0].constraints = 'bad' },
    s => { s.questions = [] },
  ]) {
    const sheet = structuredClone(sampleSheet)
    mutate(sheet)
    assert.throws(() => validateSheet(sheet))
  }
})

test('compares nested JSON structurally without depending on object key order', () => {
  assert.ok(equalValues({ a: [1, { x: true }], b: null }, { b: null, a: [1, { x: true }] }))
  assert.ok(!equalValues([1, 2], [2, 1]))
  assert.ok(!equalValues(undefined, null))
  assert.ok(!equalValues([1], { 0: 1 }))
  assert.ok(!equalValues([1], [1, 2]))
})

test('sample starters cover all four editor languages and typed signatures', () => {
  for (const q of sampleSheet.questions) {
    assert.equal(q.signature.args.length, q.tests[0].args.length)
    for (const language of ['javascript', 'python', 'cpp', 'java']) {
      assert.equal(typeof q.starters[language], 'string')
      assert.ok(q.starters[language].includes('solution'))
    }
  }
})

test('missing deployed DSA routes explain the backend update instead of claiming a network failure', () => {
  const message = workspaceErrorMessage({ response: { status: 404, data: '<pre>Cannot GET /api/dsa/workspace</pre>' } })
  assert.match(message, /does not have the DSA workspace endpoint/)
  assert.match(message, /VITE_DSA_API_URL/)
  assert.doesNotMatch(message, /current edits/)
})

test('initial connection failures and save failures have distinct messages', () => {
  assert.match(workspaceErrorMessage({ code: 'ERR_NETWORK' }), /Unable to connect/)
  assert.doesNotMatch(workspaceErrorMessage({ code: 'ERR_NETWORK' }), /current edits/)
  assert.match(workspaceErrorMessage({ code: 'ERR_NETWORK' }, 'save'), /current edits remain/)
  assert.match(workspaceErrorMessage({ code: 'ECONNABORTED' }), /took too long/)
})

test('workspace response validation rejects HTML and incomplete API payloads', () => {
  assert.throws(() => validateWorkspaceResponse('<html>Not an API response</html>'), /invalid DSA workspace response/)
  assert.throws(() => validateWorkspaceResponse({ sheet: sampleSheet }), /invalid DSA workspace response/)
  const workspace = { sheet: sampleSheet, sheetKey: '12345678-1234-1234-1234-123456789abc', revision: 0, executionConfigured: false, drafts: {}, bookmarks: {}, solved: {}, notes: {} }
  assert.equal(validateWorkspaceResponse(workspace), workspace)
})
