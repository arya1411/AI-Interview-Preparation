const Session = require('../models/Session');
const Question = require('../models/Question');
const TestAttempt = require('../models/TestAttempt');
const TestAnswer = require('../models/TestAnswer');

exports.getAnalytics = async (req, res) => {
    try {
        const userId = req.user.id;

        // Get all sessions for the user
        const sessions = await Session.findAll({
            where: { userId },
            include: [{ model: Question, as: 'questions' }]
        });

        // Get all test attempts
        const attempts = await TestAttempt.findAll({
            where: { userId },
            include: [{ model: TestAnswer, as: 'answers' }]
        });

        // Calculate stats
        const totalSessions = sessions.length;
        const completedSessions = sessions.filter(s => s.status === 'completed').length;
        const totalQuestions = sessions.reduce((sum, s) => sum + (s.questions?.length || 0), 0);
        const totalTests = attempts.length;
        const completedTests = attempts.filter(a => a.status === 'completed').length;

        // Calculate average test score
        const completedTestScores = attempts
            .filter(a => a.status === 'completed' && a.overallScore !== null)
            .map(a => a.overallScore);
        const avgTestScore = completedTestScores.length > 0
            ? Math.round(completedTestScores.reduce((a, b) => a + b, 0) / completedTestScores.length)
            : 0;

        // Get difficulty breakdown
        const allQuestions = sessions.flatMap(s => s.questions || []);
        const difficultyBreakdown = {
            easy: allQuestions.filter(q => q.difficulty === 'easy').length,
            medium: allQuestions.filter(q => q.difficulty === 'medium').length,
            hard: allQuestions.filter(q => q.difficulty === 'hard').length,
        };

        // Get type breakdown
        const typeBreakdown = {
            preparation: sessions.filter(s => s.type === 'preparation').length,
            test: sessions.filter(s => s.type === 'test').length,
            core: sessions.filter(s => s.type === 'core').length,
        };

        res.status(200).json({
            success: true,
            stats: {
                totalSessions,
                completedSessions,
                totalQuestions,
                totalTests,
                completedTests,
                avgTestScore,
                difficultyBreakdown,
                typeBreakdown,
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

exports.getWeakTopics = async (req, res) => {
    try {
        const userId = req.user.id;

        // Get completed test attempts with answers
        const attempts = await TestAttempt.findAll({
            where: { userId, status: 'completed' },
            include: [{ model: TestAnswer, as: 'answers' }]
        });

        // Collect all answers with scores
        const allAnswers = attempts.flatMap(a => a.answers || []);

        // Group by difficulty (since subject is not directly available in TestAnswer)
        const weakTopics = {};

        allAnswers.forEach(answer => {
            const topic = answer.difficulty || 'General';
            const score = answer.score || 0;

            if (!weakTopics[topic]) {
                weakTopics[topic] = { total: 0, count: 0 };
            }
            weakTopics[topic].total += score;
            weakTopics[topic].count += 1;
        });

        // Calculate average scores and sort by lowest
        const topicScores = Object.entries(weakTopics)
            .map(([topic, data]) => ({
                topic,
                avgScore: data.count > 0 ? Math.round(data.total / data.count) : 0,
                count: data.count,
            }))
            .filter(t => t.count > 0)
            .sort((a, b) => a.avgScore - b.avgScore);

        // Return topics with average score below 6
        const weakTopicsList = topicScores.filter(t => t.avgScore < 6);

        res.status(200).json({
            success: true,
            weakTopics: weakTopicsList,
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};
