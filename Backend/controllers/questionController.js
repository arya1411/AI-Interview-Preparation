const Question = require("../models/Question");
const Session = require("../models/Session");




exports.addQuestionToSession = async (req ,res) => {
    try {
        const {sessionId , questions } = req.body || {};

        if (!sessionId || !Array.isArray(questions)) {
            return res.status(400).json({ success: false, message: "sessionId and questions array are required" });
        }

        const session = await Session.findById(sessionId);
        if (!session) {
            return res.status(404).json({ success: false, message: "Session not found" });
        }

        const createdQuestions = await Promise.all(
            questions.map((q) =>
                Question.create({
                    session: session._id,
                    question: q.question,
                    answer: q.answer,
                    note: q.note,
                    isPinned: q.isPinned,
                })
            )
        );

        session.questions.push(...createdQuestions.map((q) => q._id));
        await session.save();

        return res.status(201).json({ success: true, questions: createdQuestions });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Server Error", error: error.message });
    }

}



exports.togglePinQuestion = async (req ,res) => {
    try {
        const question = await Question.findById(req.params.id);
        if (!question) {
            return res.status(404).json({ success: false, message: "Question not found" });
        }

        question.isPinned = !question.isPinned;
        await question.save();

        return res.status(200).json({ success: true, question });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Server Error", error: error.message });
    }
}



exports.updateQuestionNote = async (req ,res) => {
    try {
        const { note } = req.body || {};
        const question = await Question.findById(req.params.id);

        if (!question) {
            return res.status(404).json({ success: false, message: "Question not found" });
        }

        question.note = note || "";
        await question.save();

        return res.status(200).json({ success: true, question });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Server Error", error: error.message });
    }
}