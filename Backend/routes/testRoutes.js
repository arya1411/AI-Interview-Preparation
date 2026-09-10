const express = require('express');
const { protect } = require('../middlewares/authMiddleware');
const {
    startTest,
    submitTest,
    getAttempt,
    getAttemptsBySession,
} = require('../controllers/testController');

const router = express.Router();

// IMPORTANT: static/specific routes must come before dynamic /:param routes

// List all attempts for a session  — must be before /:attemptId
router.get('/session/:sessionId', protect, getAttemptsBySession);

// Start a new test attempt for a session
router.post('/:sessionId/start', protect, startTest);

// Submit all answers and trigger AI evaluation
router.post('/:attemptId/submit', protect, submitTest);

// Get a single attempt with results — keep last among GET routes
router.get('/:attemptId', protect, getAttempt);

module.exports = router;
