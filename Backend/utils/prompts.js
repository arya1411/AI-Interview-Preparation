const questionAnswerPrompt = (role, experience, topicToFocus, numberOfQuestions) => `
You are an expert technical interviewer. Generate interview questions tailored to the candidate's profile.

Candidate Profile:
- Role: ${role}
- Experience Level: ${experience} (Fresher = entry-level basics, Intermediate = practical concepts, Senior = deep architecture & design)
- Focus Topics: ${topicToFocus}
- Number of Questions: ${numberOfQuestions}

Instructions:
- Calibrate question difficulty strictly based on the Experience Level above.
- For each question, write a clear, detailed answer appropriate for that level.
- Include a short and relevant code example or real-world example wherever applicable to improve understanding.
- Keep code examples concise and simple (no long programs).
- Write code as plain text inside the answer (DO NOT use markdown code fences like \`\`\`).
- Return ONLY a raw JSON array. No markdown, no code fences, no extra text before or after.

Output format (return exactly this, nothing else):
[
    {
        "question": "Your question here?",
        "answer": "Your detailed text answer here including explanation and a short code or example written in plain text."
    }
]
`;

const conceptExplainPrompt = (question) => `
You are an expert software engineering mentor. Explain the following interview question thoroughly.

Question: "${question}"

Instructions:
- Write a clear, in-depth explanation as if teaching a developer who is learning.
- Start with a 1-2 sentence summary of the concept.
- Then explain it in detail with key points (each on a new line).
- Include a practical code example where relevant to improve understanding.
- Write code examples as plain text (DO NOT use markdown code fences like \`\`\`).
- Keep the explanation structured and easy to read.
- Do NOT return JSON. Return plain formatted text only.
`;

module.exports = {
    questionAnswerPrompt,
    conceptExplainPrompt,
};