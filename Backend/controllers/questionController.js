const Question = require("../models/Question");
const Session = require("../models/Session");

// ── helper: verify the question belongs to the requesting user's session ──────
const getOwnedQuestion = async (questionId, userId) => {
    const question = await Question.findByPk(questionId, {
        include: [{ model: Session, as: 'session' }],
    });
    if (!question) return { error: 404, message: 'Question not found' };
    if (!question.session || question.session.userId !== userId) {
        return { error: 403, message: 'Not authorized' };
    }
    return { question };
};

exports.addQuestionToSession = async (req, res) => {
    try {
        const { sessionId, questions } = req.body || {};

        if (!sessionId || !Array.isArray(questions)) {
            return res.status(400).json({ success: false, message: "sessionId and questions array are required" });
        }

        const session = await Session.findByPk(sessionId);
        if (!session) {
            return res.status(404).json({ success: false, message: "Session not found" });
        }

        // Ownership check
        if (session.userId !== req.user.id) {
            return res.status(403).json({ success: false, message: "Not authorized" });
        }

        const createdQuestions = await Promise.all(
            questions.map((q) =>
                Question.create({
                    sessionId: session.id,
                    question: q.question,
                    answer: q.answer,
                    difficulty: q.difficulty || 'medium',
                    note: q.note || null,
                    isPinned: q.isPinned || false,
                    subject: q.subject || null,
                })
            )
        );

        return res.status(201).json({ success: true, questions: createdQuestions });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Server Error", error: error.message });
    }
};

exports.togglePinQuestion = async (req, res) => {
    try {
        const { error, message, question } = await getOwnedQuestion(req.params.id, req.user.id);
        if (error) return res.status(error).json({ success: false, message });

        question.isPinned = !question.isPinned;
        await question.save();

        return res.status(200).json({ success: true, question });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Server Error", error: error.message });
    }
};

exports.updateQuestionNote = async (req, res) => {
    try {
        const { note } = req.body || {};
        const { error, message, question } = await getOwnedQuestion(req.params.id, req.user.id);
        if (error) return res.status(error).json({ success: false, message });

        question.note = note || "";
        await question.save();

        return res.status(200).json({ success: true, question });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Server Error", error: error.message });
    }
};

exports.updateQuestionStatus = async (req, res) => {
    try {
        const { status } = req.body || {};
        const { error, message, question } = await getOwnedQuestion(req.params.id, req.user.id);
        if (error) return res.status(error).json({ success: false, message });

        if (!['pending', 'answered', 'skipped'].includes(status)) {
            return res.status(400).json({ success: false, message: "Invalid status. Must be pending, answered, or skipped" });
        }

        question.status = status;
        await question.save();

        return res.status(200).json({ success: true, question });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Server Error", error: error.message });
    }
};

exports.updateQuestionExplanation = async (req, res) => {
    try {
        const { explanation } = req.body || {};
        const { error, message, question } = await getOwnedQuestion(req.params.id, req.user.id);
        if (error) return res.status(error).json({ success: false, message });

        question.explanation = explanation || "";
        await question.save();

        return res.status(200).json({ success: true, question });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Server Error", error: error.message });
    }
};
