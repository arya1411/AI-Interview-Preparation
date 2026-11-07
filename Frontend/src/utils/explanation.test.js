import test from 'node:test'
import assert from 'node:assert/strict'
import { generateAndSaveExplanation, parseExplanationSections } from './explanation.js'
import { normalizeQuestions } from './helper.js'

const data = { title: 'Closures', explanation: 'Functions retain their outer scope.' }

test('displays generated content before saving and persists regenerated content', async () => {
  const events = []
  const result = await generateAndSaveExplanation({
    client: { async post(url, body) {
      events.push({ url, body })
      return { data }
    } },
    generateUrl: '/generate', saveUrl: '/save', topic: 'Closures',
    onGenerated: (value) => events.push(value),
  })
  assert.deepEqual(events, [
    { url: '/generate', body: { topic: 'Closures' } },
    data,
    { url: '/save', body: { explanation: data.explanation } },
  ])
  assert.equal(result.saved, true)
})

test('save failure keeps generated content available', async () => {
  let displayed
  const result = await generateAndSaveExplanation({
    client: { async post(url) {
      if (url === '/save') throw new Error('Database unavailable')
      return { data }
    } },
    generateUrl: '/generate', saveUrl: '/save', topic: 'Closures',
    onGenerated: (value) => { displayed = value },
  })
  assert.deepEqual(displayed, data)
  assert.equal(result.saved, false)
})

test('a pending save does not delay publishing the explanation', async () => {
  let finishSave
  const save = new Promise(resolve => { finishSave = resolve })
  let displayed
  let finished = false
  const request = generateAndSaveExplanation({
    client: { async post(url) {
      if (url === '/save') return save
      return { data }
    } },
    generateUrl: '/generate', saveUrl: '/save', topic: 'Closures',
    onGenerated: value => { displayed = value },
  }).then(result => { finished = true; return result })

  // Allow generation to complete while the database request remains pending.
  await new Promise(resolve => setTimeout(resolve, 0))
  assert.deepEqual(displayed, data)
  assert.equal(finished, false)
  finishSave({ data: { success: true } })
  assert.deepEqual(await request, { saved: true })
})

test('generation failure is propagated without displaying or saving content', async () => {
  let calls = 0
  await assert.rejects(generateAndSaveExplanation({
    client: { async post() { calls++; throw new Error('AI unavailable') } },
    onGenerated: () => assert.fail('Must not display failed content'),
  }), /AI unavailable/)
  assert.equal(calls, 1)
})

test('empty and malformed explanations cannot overwrite a saved explanation', async () => {
  for (const explanation of ['', '   ', null, {}]) {
    let calls = 0
    await assert.rejects(generateAndSaveExplanation({
      client: { async post() { calls++; return { data: { explanation } } } },
      onGenerated: () => assert.fail('Must not display empty content'),
    }), /empty explanation/)
    assert.equal(calls, 1)
  }
})

test('loading questions preserves saved explanations', () => {
  const [question] = normalizeQuestions([{ id: 1, question: 'What is a closure?', ...data }])
  assert.equal(question.explanation, data.explanation)
})

test('generation receives the existing answer as context without replacing it in storage', async () => {
  const calls = []
  await generateAndSaveExplanation({
    client: { async post(url, body) { calls.push({ url, body }); return { data } } },
    generateUrl: '/generate', saveUrl: '/save', topic: 'Closures',
    shortAnswer: 'A closure captures its lexical scope.', onGenerated: () => {},
  })
  assert.deepEqual(calls[0].body, { topic: 'Closures', shortAnswer: 'A closure captures its lexical scope.' })
  assert.deepEqual(calls[1].body, { explanation: data.explanation })
})

test('teaching sections preserve the sequence of example code, output and reasoning', () => {
  const sections = parseExplanationSections('## How it works\r\nCaptured variables remain accessible.\r\n\r\n## Worked example\r\nCall the counter twice.\r\n```javascript\r\n// ## This is a code comment, not a section\r\nconsole.log(counter());\r\n```\r\nThe second call uses the retained value.\r\n\r\n## Common mistake\r\nThe value is not reset on every call.\r\n\r\n## Interview takeaway\r\nCheck which scope owns the variable.')
  assert.deepEqual(sections.map(section => section.title), ['How it works', 'Worked example', 'Common mistake', 'Interview takeaway'])
  assert.deepEqual(sections[1].blocks.map(block => block.type), ['text', 'code', 'text'])
  assert.equal(sections[1].blocks[1].language, 'javascript')
  assert.match(sections[1].blocks[1].code, /## This is a code comment/)
})

test('legacy saved explanations and unfinished code fences remain readable', () => {
  assert.deepEqual(parseExplanationSections('First paragraph.\n\nSecond paragraph.'), [{ title: '', blocks: [{ type: 'text', text: 'First paragraph.' }, { type: 'text', text: 'Second paragraph.' }] }])
  assert.deepEqual(parseExplanationSections('```python\nprint(1)')[0].blocks, [{ type: 'code', language: 'python', code: 'print(1)' }])
  assert.deepEqual(parseExplanationSections(''), [])
})
