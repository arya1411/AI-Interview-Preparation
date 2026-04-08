const { GoogleGenAI } = require("@google/genai");

const { conceptExplainPrompt } = require("../utils/prompts");


const ai = new GoogleGenAI({apiKey : process.env.GEMINI_API_KEY});



const generateInterviewQuestions = async (req ,res) => {
    try {

    } catch(error){
        res.status(500).json({message : "Failed To Generate Question" , error : error.message});
    }
};


const generateConceptExplanation = async (req , res) => {

};


module.exports = {generateInterviewQuestions , generateConceptExplanation};