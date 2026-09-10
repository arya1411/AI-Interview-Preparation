const express = require('express');
const {createSession , getSessionById , getMySession  , deleteSession, completeSession} = require('../controllers/sessionController');

const {protect} = require("../middlewares/authMiddleware");



const router = express.Router();



router.post('/create' , protect , createSession);
router.get('/my-sessions', protect , getMySession);
router.put('/complete/:id', protect, completeSession);
router.get('/:id' , protect, getSessionById);
router.delete('/:id' , protect , deleteSession);


module.exports = router;