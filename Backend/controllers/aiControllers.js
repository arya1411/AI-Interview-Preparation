const Groq = require("groq-sdk");
const { questionAnswerPrompt, conceptExplainPrompt } = require("../utils/prompts");

const getGroqClient = () => new Groq({ apiKey: process.env.GROQ_API_KEY });

const generateInterviewQuestions = async (req, res) => {
    try {
        const { role, experience, experince, topicToFocus, numberOfQuestions } = req.body;
        const candidateExperience = experience ?? experince;

        // Validation
        if (!role || candidateExperience === undefined || candidateExperience === null || candidateExperience === "" || !topicToFocus || !numberOfQuestions) {
            return res.status(400).json({ message: "Missing Required Field" });
        }

        // Generate prompt
        const prompt = questionAnswerPrompt(role, candidateExperience, topicToFocus, numberOfQuestions);

        // Call Groq
        const completion = await getGroqClient().chat.completions.create({
            model: "llama-3.3-70b-versatile",
            messages: [
                {
                    role: "user",
                    content: prompt,
                }
            ],
            temperature: 0.7,
        });

        const rawText = completion.choices[0]?.message?.content;

        if (!rawText) {
            return res.status(500).json({ message: "AI returned an empty response" });
        }

        // Extract JSON array robustly
        const match = rawText.match(/\[\s*\{[\s\S]*\}\s*\]/);
        if (!match) {
            return res.status(500).json({ message: "AI did not return a valid JSON array" });
        }

        const data = JSON.parse(match[0]);

        res.status(200).json(data);

    } catch (error) {
        res.status(500).json({
            message: "Failed To Generate Question",
            error: error.message
        });
    }
};

const generateConceptExplanation = async (req, res) => {
    try {
        const { topic } = req.body;

        if (!topic) {
            return res.status(400).json({ message: "Topic is required" });
        }

        const prompt = conceptExplainPrompt(topic);

        const completion = await getGroqClient().chat.completions.create({
            model: "llama-3.3-70b-versatile",
            messages: [
                {
                    role: "user",
                    content: prompt,
                }
            ],
            temperature: 0.7,
        });

        const text = completion.choices[0]?.message?.content;
        if (!text) {
            return res.status(500).json({ message: "AI returned an empty explanation" });
        }

        // Prefer strict JSON shape from prompt, but gracefully fallback
        // to raw text so existing frontend behavior keeps working.
        let title = "";
        let explanation = text;

        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            try {
                const parsed = JSON.parse(jsonMatch[0]);
                if (parsed && typeof parsed === "object") {
                    title = typeof parsed.title === "string" ? parsed.title : "";
                    explanation = typeof parsed.explanation === "string" ? parsed.explanation : text;
                }
            } catch (_error) {
                // Keep raw text fallback
            }
        }

        res.status(200).json({ title, explanation });

    } catch (error) {
        res.status(500).json({
            message: "Failed To Generate Explanation",
            error: error.message
        });
    }
};

module.exports = { generateInterviewQuestions, generateConceptExplanation };