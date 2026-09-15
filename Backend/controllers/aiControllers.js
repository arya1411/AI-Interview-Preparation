const Groq = require("groq-sdk");
const { questionAnswerPrompt, conceptExplainPrompt, mcqGenerationPrompt } = require("../utils/prompts");
const { coreSubjectsPrompt } = require("../utils/coreSubjectPrompt");

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
                const difficulty = typeof item?.difficulty === "string" 
                    ? ["easy", "medium", "hard"].includes(item.difficulty.toLowerCase()) 
                        ? item.difficulty.toLowerCase() 
                        : "medium"
                    : "medium";

                if (!question || !answer) return null;
                return { question, answer, difficulty };
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
            max_tokens: 2048,
        });

        const rawText = completion.choices[0]?.message?.content;
        if (!rawText) {
            return res.status(500).json({ message: "AI returned an empty explanation" });
        }

        // Strip <think>...</think> reasoning blocks emitted by qwen models
        const stripped = rawText.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();

        let title = "";
        let explanation = stripped;

        // Try to strip outer markdown fences if present
        const cleaned = stripped
            .replace(/^```(?:json)?\s*/i, "")
            .replace(/\s*```\s*$/i, "")
            .trim();

        // Try parsing the cleaned text as JSON
        const parsed = extractJsonObject(cleaned);
        if (parsed && typeof parsed === "object") {
            title = typeof parsed.title === "string" ? parsed.title : "";
            explanation = typeof parsed.explanation === "string" ? parsed.explanation : stripped;
        } else {
            // Fallback: try raw stripped text
            const parsedRaw = extractJsonObject(stripped);
            if (parsedRaw && typeof parsedRaw === "object") {
                title = typeof parsedRaw.title === "string" ? parsedRaw.title : "";
                explanation = typeof parsedRaw.explanation === "string" ? parsedRaw.explanation : stripped;
            }
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

const generateMCQQuestions = async (req, res) => {
    try {
        const { role, experience, experince, topicToFocus, numberOfQuestions } = req.body;
        const candidateExperience = experience ?? experince;

        if (!role || candidateExperience === undefined || candidateExperience === null || candidateExperience === "" || !topicToFocus || !numberOfQuestions) {
            return res.status(400).json({ message: "Missing Required Field" });
        }

        const prompt = mcqGenerationPrompt(role, candidateExperience, topicToFocus, numberOfQuestions);

        const completion = await getGroqClient().chat.completions.create({
            model: GROQ_MODEL,
            messages: [{ role: "user", content: prompt }],
            temperature: 0.7,
            top_p: 0.95,
            max_tokens: 4096,
        });

        const rawText = completion.choices[0]?.message?.content;
        if (!rawText) return res.status(500).json({ message: "AI returned an empty response" });

        // Strip <think> blocks from qwen models
        const cleaned = rawText.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
        const data = extractJsonArray(cleaned) || extractJsonArray(rawText);

        if (!data) return res.status(500).json({ message: "AI did not return a valid JSON array" });

        const normalized = data
            .map((item) => {
                const question = typeof item?.question === "string" ? item.question : "";
                const options   = Array.isArray(item?.options) && item.options.length === 4 ? item.options : null;
                const correctOption = typeof item?.correctOption === "number" &&
                    item.correctOption >= 0 && item.correctOption <= 3
                    ? item.correctOption : null;
                const answer = typeof item?.answer === "string" ? item.answer : "";
                const difficulty = typeof item?.difficulty === "string" &&
                    ["easy", "medium", "hard"].includes(item.difficulty.toLowerCase())
                    ? item.difficulty.toLowerCase() : "medium";

                if (!question || !options || correctOption === null) return null;
                return { question, options, correctOption, answer, difficulty };
            })
            .filter(Boolean);

        if (!normalized.length) return res.status(500).json({ message: "AI did not return usable MCQ data" });

        res.status(200).json(normalized);
    } catch (error) {
        const status = error?.status || error?.response?.status || 500;
        const message = error?.message || "Unknown AI generation error";
        res.status(status === 404 ? 502 : 500).json({
            message: status === 404 ? "Groq model unavailable" : "Failed To Generate MCQ Questions",
            error: message,
        });
    }
};

const generateCoreSubjects = async (req, res) => {
    try {
        const { role, topicToFocus, numberOfQuestions } = req.body;

        console.log('[Core Subjects] Request received:', { role, topicToFocus, numberOfQuestions });

        if (!role || !topicToFocus || !numberOfQuestions) {
            return res.status(400).json({ message: "role, topicToFocus and numberOfQuestions are required" });
        }

        const prompt = coreSubjectsPrompt(role, topicToFocus, numberOfQuestions);
        console.log('[Core Subjects] Prompt generated, length:', prompt.length);

        const completion = await getGroqClient().chat.completions.create({
            model: GROQ_MODEL,
            messages: [{ role: "user", content: prompt }],
            temperature: 0.7,
            top_p: 0.95,
            max_tokens: 4096,
        });

        const rawText = completion.choices[0]?.message?.content;
        console.log('[Core Subjects] Raw AI response length:', rawText?.length || 0);
        
        if (!rawText) return res.status(500).json({ message: "AI returned an empty response" });

        // Strip <think>...</think> reasoning blocks emitted by qwen models
        const stripped = rawText.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
        const data = extractJsonArray(stripped) || extractJsonArray(rawText);

        if (!data) {
            console.error('[Core Subjects] Failed to extract JSON array from:', stripped.substring(0, 200));
            return res.status(500).json({ message: "AI did not return a valid JSON array" });
        }

        console.log('[Core Subjects] Extracted', data.length, 'questions from AI');

        const normalized = data
            .map((item) => {
                const question   = typeof item?.question  === "string" ? item.question  : "";
                const answer     = typeof item?.answer    === "string" ? item.answer    : "";
                const subject    = typeof item?.subject   === "string" ? item.subject   : "";
                const difficulty = typeof item?.difficulty === "string" &&
                    ["easy", "medium", "hard"].includes(item.difficulty.toLowerCase())
                    ? item.difficulty.toLowerCase() : "medium";

                if (!question || !answer || !subject) return null;
                return { question, answer, subject, difficulty };
            })
            .filter(Boolean);

        if (!normalized.length) {
            console.error('[Core Subjects] No valid questions after normalization');
            return res.status(500).json({ message: "AI did not return usable core subject data" });
        }

        console.log('[Core Subjects] Returning', normalized.length, 'normalized questions');
        res.status(200).json(normalized);
    } catch (error) {
        console.error('[Core Subjects] Error:', error.message);
        console.error('[Core Subjects] Stack:', error.stack);
        
        const status = error?.status || error?.response?.status || 500;
        const message = error?.message || "Unknown AI generation error";
        res.status(status === 404 ? 502 : 500).json({
            message: status === 404 ? "Groq model unavailable" : "Failed To Generate Core Subject Questions",
            error: message,
        });
    }
};

module.exports = { generateInterviewQuestions, generateConceptExplanation, generateMCQQuestions, generateCoreSubjects };