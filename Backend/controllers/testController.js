const Groq = require('groq-sdk');
const Session = require('../models/Session');
const Question = require('../models/Question');
const TestAttempt = require('../models/TestAttempt');
const TestAnswer = require('../models/TestAnswer');
const { evaluateAnswersPrompt } = require('../utils/prompts');

const GROQ_MODEL = 'qwen/qwen3.8-27b';


const getGroqClient = () => new Groq({ apiKey: process.env.GROQ_API_KEY });

// ─── helpers ────────────────────────────────────────────────────────────────

const extractJsonArray = (text) => {
    if (!text || typeof text !== 'string') return null;

    // Strip <think>...</think> reasoning blocks emitted by qwen models
    const stripped = text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();

    const sources = [stripped, text]; // try stripped first, fall back to raw
    for (const src of sources) {
        // Attempt 1: direct parse
        try {
            const parsed = JSON.parse(src);
            if (Array.isArray(parsed)) return parsed;
        } catch (_) { /* continue */ }

        // Attempt 2: slice between first [ and last ]
        const first = src.indexOf('[');
        const last  = src.lastIndexOf(']');
        if (first !== -1 && last > first) {
            try {
                const parsed = JSON.parse(src.slice(first, last + 1));
                if (Array.isArray(parsed)) return parsed;
            } catch (_) { /* continue */ }
        }

        // Attempt 3: regex
        const match = src.match(/\[[\s\S]*\]/);
        if (match) {
            try {
                const parsed = JSON.parse(match[0]);
                if (Array.isArray(parsed)) return parsed;
            } catch (_) { /* continue */ }
        }
    }
    return null;
};

const parseJsonField = (val) => {
    if (Array.isArray(val)) return val;
    if (typeof val === 'string') {
        try { return JSON.parse(val); } catch (_) { return []; }
    }
    return [];
};

// ─── POST /api/test/:sessionId/start ────────────────────────────────────────
// Creates a new TestAttempt with placeholder TestAnswer rows (one per question).
exports.startTest = async (req, res) => {
    try {
        const session = await Session.findByPk(req.params.sessionId, {
            include: [{ model: Question, as: 'questions' }],
        });

        if (!session) {
            return res.status(404).json({ success: false, message: 'Session not found' });
        }

        if (session.userId !== req.user.id) {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        const questions = session.questions || [];
        if (questions.length === 0) {
            return res.status(400).json({ success: false, message: 'Session has no questions' });
        }

        // Limit to first 10 questions for the test
        const testQuestions = questions.slice(0, 10);

        const attempt = await TestAttempt.create({
            sessionId: session.id,
            userId: req.user.id,
            status: 'in_progress',
            totalQuestions: testQuestions.length,
        });

        // Pre-create answer rows (empty userAnswer) so the frontend always has
        // a stable set of records to work with
        const answerRows = await Promise.all(
            testQuestions.map((q, idx) =>
                TestAnswer.create({
                    attemptId: attempt.id,
                    questionId: q.id,
                    questionText: q.question,
                    idealAnswer: q.answer || '',
                    userAnswer: '',
                    difficulty: q.difficulty || 'medium',
                    orderIndex: idx,
                    options: q.options || null,
                    correctOption: q.correctOption != null ? q.correctOption : null,
                })
            )
        );

        return res.status(201).json({
            success: true,
            attempt: {
                id: attempt.id,
                sessionId: attempt.sessionId,
                status: attempt.status,
                totalQuestions: attempt.totalQuestions,
                questionFormat: session.questionFormat || 'descriptive',
            },
            questions: answerRows.map((a) => ({
                answerId: a.id,
                questionId: a.questionId,
                question: a.questionText,
                difficulty: a.difficulty,
                orderIndex: a.orderIndex,
                options: parseJsonField(a.options),
                correctOption: a.correctOption,
            })),
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

// ─── POST /api/test/:attemptId/submit ────────────────────────────────────────
// Receives all answers, calls Groq to evaluate them all at once, persists results.
exports.submitTest = async (req, res) => {
    try {
        const attempt = await TestAttempt.findByPk(req.params.attemptId, {
            include: [{ model: TestAnswer, as: 'answers' }],
        });

        if (!attempt) {
            return res.status(404).json({ success: false, message: 'Attempt not found' });
        }

        if (attempt.userId !== req.user.id) {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        if (attempt.status === 'completed') {
            return res.status(400).json({ success: false, message: 'Attempt already submitted' });
        }

        // req.body.answers: [{ answerId, userAnswer, selectedOption? }]
        const submitted = Array.isArray(req.body.answers) ? req.body.answers : [];

        // Normalise to string keys so Map lookup works regardless of JSON number/string
        const answerMap = new Map(submitted.map((a) => [String(a.answerId), a]));

        // Sort answers by orderIndex
        const answers = (attempt.answers || []).slice().sort((a, b) => a.orderIndex - b.orderIndex);

        // Persist user answers / selected options
        for (const row of answers) {
            const key = String(row.id);
            if (answerMap.has(key)) {
                const sub = answerMap.get(key);
                row.userAnswer = sub.userAnswer || '';
                if (sub.selectedOption != null) row.selectedOption = sub.selectedOption;
                await row.save();
            }
        }

        // Determine format — if every answer row has options it's MCQ
        const isMCQ = answers.every((a) => a.options != null && a.correctOption != null);

        let totalScore = 0;

        if (isMCQ) {
            // ── MCQ: auto-score locally, no AI call needed ──────────────────
            for (const row of answers) {
                const isCorrect = row.selectedOption != null && row.selectedOption === row.correctOption;
                const score = isCorrect ? 10 : 0;
                row.score = score;
                row.feedback = isCorrect
                    ? 'Correct! You selected the right answer.'
                    : `Incorrect. The correct answer was option ${['A','B','C','D'][row.correctOption] ?? row.correctOption}.`;
                row.strengths    = JSON.stringify(isCorrect ? ['Selected the correct answer'] : []);
                row.improvements = JSON.stringify(!isCorrect ? ['Review this concept and the correct answer explanation'] : []);
                await row.save();
                totalScore += score;
            }
        } else {
            // ── Descriptive: call Groq for bulk evaluation ──────────────────
            const evalPayload = answers.map((a) => ({
                question: a.questionText,
                idealAnswer: a.idealAnswer,
                userAnswer: a.userAnswer,
                difficulty: a.difficulty,
            }));

            const prompt = evaluateAnswersPrompt(evalPayload);

            let completion;
            try {
                completion = await getGroqClient().chat.completions.create({
                    model: GROQ_MODEL,
                    messages: [{ role: 'user', content: prompt }],
                    temperature: 0.3,
                    top_p: 0.9,
                    max_tokens: 4096,
                });
            } catch (groqErr) {
                return res.status(502).json({ success: false, message: 'AI service error', error: groqErr.message });
            }

            const rawText = completion.choices[0]?.message?.content || '';
            const evaluations = extractJsonArray(rawText);

            if (!evaluations) {
                return res.status(500).json({ success: false, message: 'AI did not return valid evaluation data', raw: rawText.slice(0, 300) });
            }

            for (const ev of evaluations) {
                const row = answers[ev.index];
                if (!row) continue;
                const score = typeof ev.score === 'number' ? Math.min(10, Math.max(0, ev.score)) : 0;
                row.score        = score;
                row.feedback     = ev.feedback || '';
                row.strengths    = JSON.stringify(Array.isArray(ev.strengths) ? ev.strengths : []);
                row.improvements = JSON.stringify(Array.isArray(ev.improvements) ? ev.improvements : []);
                await row.save();
                totalScore += score;
            }
        }

        // Calculate overall percentage score (each question max 10 pts)
        const maxScore = answers.length * 10;
        const overallScore = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;

        attempt.status = 'completed';
        attempt.overallScore = overallScore;
        attempt.completedAt = new Date();
        await attempt.save();

        // Reload answers after saving
        const finalAnswers = await TestAnswer.findAll({
            where: { attemptId: attempt.id },
            order: [['orderIndex', 'ASC']],
        });

        return res.status(200).json({
            success: true,
            attempt: {
                id: attempt.id,
                sessionId: attempt.sessionId,
                status: attempt.status,
                overallScore: attempt.overallScore,
                totalQuestions: attempt.totalQuestions,
                completedAt: attempt.completedAt,
            },
            answers: finalAnswers.map((a) => ({
                id: a.id,
                questionId: a.questionId,
                question: a.questionText,
                idealAnswer: a.idealAnswer,
                userAnswer: a.userAnswer,
                score: a.score,
                feedback: a.feedback,
                strengths: parseJsonField(a.strengths),
                improvements: parseJsonField(a.improvements),
                difficulty: a.difficulty,
                orderIndex: a.orderIndex,
                options: parseJsonField(a.options),
                correctOption: a.correctOption,
                selectedOption: a.selectedOption,
            })),
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

// ─── GET /api/test/:attemptId ─────────────────────────────────────────────────
// Fetch a completed attempt with all answers and scores.
exports.getAttempt = async (req, res) => {
    try {
        const attempt = await TestAttempt.findByPk(req.params.attemptId, {
            include: [{ model: TestAnswer, as: 'answers' }],
        });

        if (!attempt) {
            return res.status(404).json({ success: false, message: 'Attempt not found' });
        }

        if (attempt.userId !== req.user.id) {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        const answers = (attempt.answers || []).slice().sort((a, b) => a.orderIndex - b.orderIndex);

        return res.status(200).json({
            success: true,
            attempt: {
                id: attempt.id,
                sessionId: attempt.sessionId,
                status: attempt.status,
                overallScore: attempt.overallScore,
                totalQuestions: attempt.totalQuestions,
                completedAt: attempt.completedAt,
                createdAt: attempt.createdAt,
            },
            answers: answers.map((a) => ({
                id: a.id,
                questionId: a.questionId,
                question: a.questionText,
                idealAnswer: a.idealAnswer,
                userAnswer: a.userAnswer,
                score: a.score,
                feedback: a.feedback,
                strengths: parseJsonField(a.strengths),
                improvements: parseJsonField(a.improvements),
                difficulty: a.difficulty,
                orderIndex: a.orderIndex,
                options: parseJsonField(a.options),
                correctOption: a.correctOption,
                selectedOption: a.selectedOption,
            })),
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

// ─── GET /api/test/session/:sessionId ────────────────────────────────────────
// List all attempts for a session (for showing history).
exports.getAttemptsBySession = async (req, res) => {
    try {
        const attempts = await TestAttempt.findAll({
            where: { sessionId: req.params.sessionId, userId: req.user.id },
            order: [['createdAt', 'DESC']],
        });

        return res.status(200).json({ success: true, attempts });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};
