const Groq = require("groq-sdk");
const { questionAnswerPrompt, conceptExplainPrompt } = require("../utils/prompts");

const GROQ_MODEL = "qwen/qwen3.8-27b";

const getGroqClient = () => new Groq({
    apiKey: process.env.GROQ_API_KEY,
});

const extractJsonArray = (text) => {
    if (!text || typeof text !== "string") return null;

    try {
        const parsed = JSON.parse(text);
        if (Array.isArray(parsed)) return parsed;
    } catch (_error) {
        // ignore and fallback to extraction
    }

    const firstOpen = text.indexOf("[");
    const lastClose = text.lastIndexOf("]");
    if (firstOpen !== -1 && lastClose > firstOpen) {
        const candidate = text.slice(firstOpen, lastClose + 1);
        try {
            const parsed = JSON.parse(candidate);
            if (Array.isArray(parsed)) return parsed;
        } catch (_error) {
            // ignore and fallback to regex extraction
        }
    }

    const match = text.match(/\[[\s\S]*\]/);
    if (match) {
        try {
            const parsed = JSON.parse(match[0]);
            if (Array.isArray(parsed)) return parsed;
        } catch (_error) {
            // ignore
        }
    }

    return null;
};

const extractJsonObject = (text) => {
    if (!text || typeof text !== "string") return null;

    try {
        const parsed = JSON.parse(text);
        if (parsed && typeof parsed === "object") return parsed;
    } catch (_error) {
        // ignore and fallback
    }

    const firstOpen = text.indexOf("{");
    const lastClose = text.lastIndexOf("}");
    if (firstOpen !== -1 && lastClose > firstOpen) {
        const candidate = text.slice(firstOpen, lastClose + 1);
        try {
            const parsed = JSON.parse(candidate);
            if (parsed && typeof parsed === "object") return parsed;
        } catch (_error) {
            // ignore
        }
    }

    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
        try {
            const parsed = JSON.parse(match[0]);
            if (parsed && typeof parsed === "object") return parsed;
        } catch (_error) {
            // ignore
        }
    }

    return null;
};

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

        // Call Groq API
        const completion = await getGroqClient().chat.completions.create({
            model: GROQ_MODEL,
            messages: [
                {
                    role: "user",
                    content: prompt,
                }
            ],
            temperature: 0.7,
            top_p: 0.95,
            max_tokens: 2048,
        });

        const rawText = completion.choices[0]?.message?.content;

        if (!rawText) {
            return res.status(500).json({ message: "AI returned an empty response" });
        }

        const data = extractJsonArray(rawText);
        if (!data) {
            return res.status(500).json({ message: "AI did not return a valid JSON array" });
        }

        const normalized = data
            .map((item) => {
                const question = typeof item?.question === "string" ? item.question : "";
                const answer = typeof item?.answer === "string"
                    ? item.answer
                    : typeof item?.expected_answer === "string"
                        ? item.expected_answer
                        : "";

                if (!question || !answer) return null;
                return { question, answer };
            })
            .filter(Boolean);

        if (!normalized.length) {
            return res.status(500).json({ message: "AI did not return usable question data" });
        }

        res.status(200).json(normalized);

    } catch (error) {
        const status = error?.status || error?.response?.status || 500;
        const message = error?.message || "Unknown AI generation error";
        res.status(status === 404 ? 502 : 500).json({
            message: status === 404 ? "Groq model unavailable for this account" : "Failed To Generate Question",
            error: message
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
            model: GROQ_MODEL,
            messages: [
                {
                    role: "user",
                    content: prompt,
                }
            ],
            temperature: 0.7,
            top_p: 0.95,
            max_tokens: 1024,
        });

        const text = completion.choices[0]?.message?.content;
        if (!text) {
            return res.status(500).json({ message: "AI returned an empty explanation" });
        }

        let title = "";
        let explanation = text;

        const cleaned = text
            .replace(/^```(?:json)?\s*/i, "")
            .replace(/\s*```\s*$/i, "")
            .trim();

        const parsed = extractJsonObject(cleaned);
        if (parsed && typeof parsed === "object") {
            title = typeof parsed.title === "string" ? parsed.title : "";
            explanation = typeof parsed.explanation === "string" ? parsed.explanation : text;
        }

        res.status(200).json({ title, explanation });

    } catch (error) {
        const status = error?.status || error?.response?.status || 500;
        const message = error?.message || "Unknown AI generation error";
        res.status(status === 404 ? 502 : 500).json({
            message: status === 404 ? "Groq model unavailable for this account" : "Failed To Generate Explanation",
            error: message
        });
    }
};

module.exports = { generateInterviewQuestions, generateConceptExplanation };