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
- Do NOT include any code snippets or code examples in the answers. Text explanations only.
- Return ONLY a raw JSON array. No markdown, no code fences, no extra text before or after.

Output format (return exactly this, nothing else):
[
    {
        "question": "Your question here?",
        "answer": "Your detailed text answer here."
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
- If the concept involves code, include a practical code example using proper markdown code fences like:
\`\`\`javascript
// your code here
\`\`\`
- Use the correct language identifier in the code fence (javascript, python, bash, etc.)
- Keep the explanation structured and easy to read.
- Do NOT return JSON. Return plain formatted text only.
`;

module.exports = {
    questionAnswerPrompt,
    conceptExplainPrompt,
};