const express = require('express');
const { getAnalytics, getWeakTopics } = require('../controllers/analyticsController');
const { protect } = require('../middlewares/authMiddleware');

const router = express.Router();

router.get('/', protect, getAnalytics);
router.get('/weak-topics', protect, getWeakTopics);

module.exports = router;
