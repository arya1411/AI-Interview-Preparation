const test = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { runInNewContext } = require('node:vm');

// Exercise the real controller without connecting to or mutating account data.
function controller(sessions = [], attempts = []) {
    const queries = [];
    const exports = {};
    runInNewContext(readFileSync(require.resolve('../controllers/analyticsController'), 'utf8'), {
        exports,
        require: name => ({
            '../models/Session': { findAll: async query => { queries.push(query); return sessions; } },
            '../models/TestAttempt': { findAll: async query => { queries.push(query); return attempts; } },
            '../models/Question': {},
            '../models/TestAnswer': {},
        })[name],
    });
    return { handlers: exports, queries };
}

async function invoke(handler) {
    let status, body;
    await handler({ user: { id: 42 } }, {
        status(code) { status = code; return this; },
        json(value) { body = JSON.parse(JSON.stringify(value)); },
    });
    return { status, body };
}

test('analytics has an empty account state and scopes every query to the caller', async () => {
    const { handlers, queries } = controller();
    const { status, body } = await invoke(handlers.getAnalytics);
    assert.equal(status, 200);
    assert.equal(body.stats.totalSessions, 0);
    assert.equal(body.stats.completedTests, 0);
    assert.equal(body.stats.avgTestScore, 0);
    assert.deepEqual((await invoke(handlers.getWeakTopics)).body.weakTopics, []);
    assert.ok(queries.every(query => query.where.userId === 42));
    assert.equal(queries.at(-1).where.status, 'completed');
});

test('summary includes only completed scores and counts difficulty and session types', async () => {
    const { handlers } = controller([
        { type: 'preparation', status: 'completed', questions: [{ difficulty: 'easy' }, { difficulty: 'hard' }] },
        { type: 'core', status: 'active', questions: [{ difficulty: 'medium' }] },
    ], [
        { status: 'completed', overallScore: 0 },
        { status: 'completed', overallScore: 80 },
        { status: 'in_progress', overallScore: 100 },
    ]);
    const { body } = await invoke(handlers.getAnalytics);
    assert.equal(body.stats.avgTestScore, 40);
    assert.equal(body.stats.completedTests, 2);
    assert.equal(body.stats.totalTests, 3);
    assert.equal(body.stats.completedSessions, 1);
    assert.equal(body.stats.totalQuestions, 3);
    assert.deepEqual(body.stats.difficultyBreakdown, { easy: 1, medium: 1, hard: 1 });
    assert.deepEqual(body.stats.typeBreakdown, { preparation: 1, test: 0, core: 1 });
});

test('review groups use question scores out of ten and exclude the six-point boundary', async () => {
    const { handlers } = controller([], [{ answers: [
        { difficulty: 'easy', score: 6 },
        { difficulty: 'medium', score: 4 },
        { difficulty: 'medium', score: 6 },
        { difficulty: 'hard', score: 0 },
    ] }]);
    assert.deepEqual((await invoke(handlers.getWeakTopics)).body.weakTopics, [
        { topic: 'hard', avgScore: 0, count: 1 },
        { topic: 'medium', avgScore: 5, count: 2 },
    ]);
});
