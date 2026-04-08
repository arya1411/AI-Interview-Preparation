const express = require('express');
const {createSession , getSessionById , getMySession  , deleteSession} = require('../controllers/sessionController');

const {protect} = require("../middlewares/authMiddleware");



const router = express.Router();



router.post('/create' , protect , createSession);
router.get('/my-session', protect , getMySession);
router.get('/my-sessions', protect , getMySession);
router.get('/:id' , protect, getSessionById);
router.delete('/:id' , protect , deleteSession);


module.exports = router;