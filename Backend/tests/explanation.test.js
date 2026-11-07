const test = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { runInNewContext } = require('node:vm');
const prompts = require('../utils/prompts');

function createHandler() {
    const requests = [];
    const explanation = '## How it works\nA val locks the binding.\n\n## Worked example\n```kotlin\nval names = mutableListOf("A")\nnames.add("B")\n```\nThe list can change while the reference stays fixed.\n\n## Common mistake\nA read-only binding is not deep immutability.\n\n## Interview takeaway\nSeparate reassignment from object mutation.';
    class Groq {
        chat = { completions: { create: async body => {
            requests.push(body);
            return { choices: [{ message: { content: JSON.stringify({ title: 'Bindings and object state', explanation }) } }] };
        } } };
    }
    const module = { exports: {} };
    runInNewContext(readFileSync(require.resolve('../controllers/aiControllers'), 'utf8'), {
        module, process: { env: {} },
        require: name => name === 'groq-sdk' ? Groq : name === '../utils/prompts' ? prompts : require('../utils/coreSubjectPrompt'),
    });
    return { handler: module.exports.generateConceptExplanation, requests, explanation };
}

async function invoke(handler, body) {
    let status, response;
    await handler({ body }, { status(code) { status = code; return this; }, json(value) { response = value; } });
    return { status, response };
}

test('explanation generation uses the shown answer as context and preserves teaching sections and code', async () => {
    const { handler, requests, explanation } = createHandler();
    const shortAnswer = 'A val cannot be reassigned; a var can.';
    const { status, response } = await invoke(handler, { topic: 'Compare val and var in Kotlin.', shortAnswer });
    assert.equal(status, 200);
    assert.equal(response.explanation, explanation);
    assert.equal(requests[0].response_format.type, 'json_object');
    assert.ok(requests[0].messages[0].content.includes(JSON.stringify(shortAnswer)));
    assert.ok(requests[0].messages[0].content.includes(JSON.stringify('Compare val and var in Kotlin.')));
});

test('topic-only clients remain compatible', async () => {
    const { handler, requests } = createHandler();
    assert.equal((await invoke(handler, { topic: 'Closures' })).status, 200);
    assert.equal(requests.length, 1);
});

test('invalid topic or answer context is rejected before calling the model', async () => {
    const { handler, requests } = createHandler();
    for (const body of [undefined, {}, { topic: [] }, { topic: ' ' }, { topic: 'Closures', shortAnswer: {} }]) {
        assert.equal((await invoke(handler, body)).status, 400);
    }
    assert.equal(requests.length, 0);
});
