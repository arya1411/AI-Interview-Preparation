const Session = require('../models/Session');
const Question = require("../models/Question");




const serializeSession = (session) => {
    const plain = session && typeof session.toJSON === 'function' ? session.toJSON() : session;
    return plain ? { ...plain, _id: plain._id ?? plain.id } : plain;
};

exports.createSession = async (req , res ) => {
    try {
        if (!req.body || typeof req.body !== "object") {
            return res.status(400).json({ success: false, message: "Invalid request body" });
        }

        const {
            role,
            experince,
            experience,
            topicToFocus,
            topicsToFocus,
            description,
            type,
            questionFormat,
            questions = [],
        } = req.body;

        if (!role || !(experince || experience) || !(topicToFocus || topicsToFocus)) {
            return res.status(400).json({
                success: false,
                message: "role, experince/experience and topicToFocus/topicsToFocus are required",
            });
        }

        const sessionType   = ['preparation', 'test', 'core'].includes(type) ? type : 'preparation';
        const sessionFormat = ['descriptive', 'mcq'].includes(questionFormat) ? questionFormat : 'descriptive';
        const userId = req.user.id;

        const session = await Session.create ({
            userId,
            role,
            experience: experince || experience,
            topicsToFocus: topicsToFocus || topicToFocus,
            description,
            type: sessionType,
            questionFormat: sessionFormat,
        });

        await Promise.all(
            questions.map(async (q) => {
                await Question.create({
                    sessionId: session.id,
                    question: q.question,
                    answer: q.answer,
                    difficulty: q.difficulty || 'medium',
                    options: q.options ? JSON.stringify(q.options) : null,
                    correctOption: q.correctOption != null ? q.correctOption : null,
                    subject: q.subject || null,
                });
            })
        );

        return res.status(201).json({ success: true, session: serializeSession(session) });

    } catch(error){
        return res.status(500).json({ success: false, message: "Server Error", error: error.message });
    }
};


exports.getMySession = async (req , res ) => {
    try {
        const { type } = req.query;
        const where = { userId: req.user.id };

        // If a valid type is passed, filter by it — otherwise return all
        if (type === 'preparation' || type === 'test' || type === 'core') {
            where.type = type;
        }

        const sessions = await Session.findAll({
            where,
            order: [['createdAt', 'DESC']],
            include: [{
                model: Question,
                as: 'questions',
            }]
        });
        return res.status(200).json({ success: true, sessions: sessions.map(serializeSession) });
    } catch(error){
        return res.status(500).json({ success: false, message: "Server Error", error: error.message });
    }
};


exports.getSessionById = async (req , res ) => {
    try {
        const session = await Session.findByPk(req.params.id, {
            include: [{
                model: Question,
                as: 'questions',
            }]
        });
        
        if (!session) {
            return res.status(404).json({ success: false, message: "Session Not Found" });
        }

        return res.status(200).json({ success: true, session: serializeSession(session) });

    } catch(error){
        return res.status(500).json({ success: false, message: "Server Error", error: error.message });
    }
};


exports.deleteSession = async (req , res ) => {
    try {

        const session = await Session.findByPk(req.params.id);


        if(!session) {
            return res.status(404).json({message : "Session Not Found"});
        }


        if(session.userId !== req.user.id){
            return res
                .status(401)
                .json({message :"Not Authorized to delete this Session"});
        }

        await Question.destroy({where: { sessionId: session.id }});

        await session.destroy();

        return res.status(200).json({ success: true, message : "Session Deleted Successfully" });

    } catch(error){
        return res.status(500).json({ success: false, message: "Server Error", error: error.message });
    }
};


exports.completeSession = async (req, res) => {
    try {
        const session = await Session.findByPk(req.params.id);
        if (!session) return res.status(404).json({ success: false, message: "Session not found" });
        if (session.userId !== req.user.id) return res.status(403).json({ success: false, message: "Not authorized" });
        if (session.status === "completed") return res.status(400).json({ success: false, message: "Session already completed" });
        const now = new Date();
        session.status = "completed";
        session.totalDuration = now.getTime() - session.createdAt.getTime();
        session.questionCount = session.questions ? session.questions.length : 0;
        session.completionDate = now;
        await session.save();
        return res.status(200).json({ success: true, session });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Server error", error: error.message });
    }
};
