const express = require('express');

const {togglePinQuestion , updateQuestionNote , addQuestionToSession , updateQuestionStatus , updateQuestionExplanation } = require("../controllers/questionController");

const { protect } = require("../middlewares/authMiddleware");



const router = express.Router();



router.post('/add' , protect , addQuestionToSession);
router.post('/:id/pin' , protect , togglePinQuestion);
router.post('/:id/note' , protect , updateQuestionNote);
router.post('/:id/status' , protect , updateQuestionStatus);
router.post('/:id/explanation' , protect , updateQuestionExplanation);



module.exports = router ;