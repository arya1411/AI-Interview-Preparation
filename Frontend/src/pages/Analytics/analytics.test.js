import test from 'node:test'
import assert from 'node:assert/strict'
import { loadAnalytics } from './analytics.js'

test('loads both authenticated analytics endpoints and preserves zero scores', async () => {
  const calls = []
  const signal = new AbortController().signal
  const stats = { totalTests: 1, completedTests: 1, avgTestScore: 0 }
  const client = { get: async (url, options) => {
    calls.push(url)
    assert.equal(options.signal, signal)
    return { data: { success: true, ...(url.endsWith('weak-topics') ? { weakTopics: [] } : { stats }) } }
  } }
  assert.deepEqual(await loadAnalytics(client, signal), { stats, weakTopics: [] })
  assert.deepEqual(calls, ['/api/analytics', '/api/analytics/weak-topics'])
})

test('a failed review request retains the available summary', async () => {
  const client = { get: async url => {
    if (url.endsWith('weak-topics')) throw new Error('Unavailable')
    return { data: { success: true, stats: { totalSessions: 2 } } }
  } }
  assert.deepEqual(await loadAnalytics(client), { stats: { totalSessions: 2 }, weakTopics: null })
})

test('failed and malformed responses remain unavailable rather than appearing empty', async () => {
  assert.deepEqual(await loadAnalytics({ get: async () => { throw new Error('Offline') } }), { stats: null, weakTopics: null })
  assert.deepEqual(await loadAnalytics({ get: async () => ({ data: '<html>Error</html>' }) }), { stats: null, weakTopics: null })
  assert.deepEqual(await loadAnalytics({ get: async () => ({ data: { success: true, weakTopics: [null] } }) }), { stats: null, weakTopics: null })
})
