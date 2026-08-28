const OpenAI = require("openai");
const { questionAnswerPrompt, conceptExplainPrompt } = require("../utils/prompts");

const getNVIDIAClient = () => new OpenAI({
    baseURL: "https://integrate.api.nvidia.com/v1",
    apiKey: process.env.NVIDIA_API_KEY,
});

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

        // Call NVIDIA NIM API
        const completion = await getNVIDIAClient().chat.completions.create({
            model: "nvidia/nemotron-3.5-lightning-30b-a3b",
            messages: [
                {
                    role: "user",
                    content: prompt,
                }
            ],
            temperature: 0.7,
            top_p: 0.95,
            max_tokens: 16384,
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

        const completion = await getNVIDIAClient().chat.completions.create({
            model: "nvidia/nemotron-3.5-lightning-30b-a3b",
            messages: [
                {
                    role: "user",
                    content: prompt,
                }
            ],
            temperature: 0.7,
            top_p: 0.95,
            max_tokens: 16384,
            extra_body: {
                chat_template_kwargs: { enable_thinking: true },
                reasoning_budget: 16384
            }
        });

        const text = completion.choices[0]?.message?.content;
        if (!text) {
            return res.status(500).json({ message: "AI returned an empty explanation" });
        }

        let title = "";
        let explanation = text;

        // Strip markdown code fences the model sometimes wraps around JSON
        const cleaned = text
            .replace(/^```(?:json)?\s*/i, "")
            .replace(/\s*```\s*$/i, "")
            .trim();

        // Extract the outermost JSON object
        const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            try {
                const parsed = JSON.parse(jsonMatch[0]);
                if (parsed && typeof parsed === "object") {
                    title = typeof parsed.title === "string" ? parsed.title : "";
                    explanation = typeof parsed.explanation === "string" ? parsed.explanation : text;
                }
            } catch (_error) {
                // JSON parse failed — fall through to raw text fallback
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