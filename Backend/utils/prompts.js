const questionAnswerPrompt = (role, experience, topicToFocus, numberOfQuestions) => `
You are an expert technical interviewer for ${role} roles.

Generate exactly ${numberOfQuestions} interview questions for a candidate with ${experience} years of experience.
Focus areas: ${topicToFocus}

Rules:
1. Return ONLY a valid JSON array, no prose, no explanation, no markdown fences.
2. The response must be parseable with JSON.parse().
3. Every item must have exactly this shape and no extra keys:
   { "question": "...", "answer": "..." }
4. Never add fields like "id", "expected_answer", "difficulty", or "explanation".
5. Questions must be specific, realistic, and technically relevant.
6. Answers must be plain text, 2-3 sentences max, beginner-friendly and concise.
7. No code blocks, no pseudo-code, no bullet lists, no extra keys.
8. Do not include reasoning, headings, comments, or text outside the JSON array.
9. Ensure the output starts with [ and ends with ].

Example output:
[
  { "question": "What is Docker?", "answer": "Docker packages an application and its dependencies into a portable container..." }
]
`;

const conceptExplainPrompt = (question) => `
You are an expert technical educator.

Explain this concept in a clean, developer-friendly way:
"${question}"

Mandatory output requirements:
1. Return ONLY a raw JSON object.
2. Do not wrap the whole response in markdown fences.
3. The object must have exactly two keys: "title" and "explanation".
4. "title" must be a short string of 2-6 words.
5. "explanation" must be a single string containing the full explanation.
6. The explanation string must be valid JSON text, so use escaped newlines as \n and escape quotes inside the string.
7. The explanation must include one practical code example embedded as a Markdown fenced block inside the text, like: \n\n\`\`\`javascript\n// example\nconst value = 42;\n\`\`\`\n\n
8. Keep the explanation beginner-friendly, structured, and useful for interviews.
9. No extra text before or after the JSON object.
10. The response must be parseable with JSON.parse().

Example shape:
{ "title": "Understanding Middleware", "explanation": "Middleware sits between...\n\n\`\`\`javascript\nconst app = express();\n\`\`\`\n\nIt helps..." }
`;

module.exports = {
    questionAnswerPrompt,
    conceptExplainPrompt,
};
