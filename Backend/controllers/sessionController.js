const Session = require('../models/Session');
const Question = require("../models/Question");




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
            questions = [],
        } = req.body;

        if (!role || !(experince || experience) || !(topicToFocus || topicsToFocus)) {
            return res.status(400).json({
                success: false,
                message: "role, experince/experience and topicToFocus/topicsToFocus are required",
            });
        }

        const userId = req.user._id;

        const session = await Session.create ({
            user : userId,
            role,
            experince: experince || experience,
            topicsToFocus: topicsToFocus || topicToFocus,
            description,
        });

        const questionDocs = await Promise.all(
            questions.map(async (q) => {
                const createdQuestion = await Question.create({
                    session: session._id,
                    question: q.question,
                    answer: q.answer,
                });
                return createdQuestion._id;
            })
        );

        session.questions = questionDocs;
        await session.save();

        return res.status(201).json({ success: true, session });

    } catch(error){
        return res.status(500).json({ success: false, message: "Server Error", error: error.message });
    }
};




exports.getMySession = async (req , res ) => {
    try {
        const sessions = await Session.find({user : req.user._id})
            .sort({createdAt : -1})
            .populate("questions");
        return res.status(200).json({ success: true, sessions });
    } catch(error){
        return res.status(500).json({ success: false, message: "Server Error", error: error.message });
    }
};




exports.getSessionById = async (req , res ) => {
    try {
        const session = await Session.findById(req.params.id)
        .populate({
            path : "questions",
            options : {sort : {isPinned : -1 , createdAt : 1 } }, 
        })
        .exec();
        if (!session) {
            return res.status(404).json({ success: false, message: "Session Not Found" });
        }

        return res.status(200).json({ success: true, session });

    } catch(error){
        return res.status(500).json({ success: false, message: "Server Error", error: error.message });
    }
};




exports.deleteSession = async (req , res ) => {
    try {

        const session = await Session.findById(req.params.id);


        if(!session) {
            return res.status(404).json({message : "Session Not Found"});
        }


        if(session.user.toString() !== req.user.id){
            return res
                .status(401)
                .json({message :"Not Authorized to delete this Session"});
        }

        await Question.deleteMany({session : session._id});

        await session.deleteOne();

        return res.status(200).json({ success: true, message : "Session Deleted Successfully" });

    } catch(error){
        return res.status(500).json({ success: false, message: "Server Error", error: error.message });
    }
};