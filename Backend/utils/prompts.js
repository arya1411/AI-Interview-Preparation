const questionAnswerPrompt = (role, experience, topicToFocus, numberOfQuestions) => `
You are an AI trained to generate technical interview questions and answers.

Task:
- Role: ${role}
- Candidate Experience: ${experience} years
- Focus Topics: ${topicToFocus}
- Write ${numberOfQuestions} interview questions.
- For each question, generate a short, beginner-friendly definition-only answer.
- Keep each answer focused on concept clarity in plain text only.
- Do NOT include any code snippet, pseudo code, inline code, or markdown code block in "answer".
- Keep formatting very clean.
- Return a pure JSON array like:
[
  {
    "question": "Question here?",
    "answer": "Definition here in plain text only."
  }
]

Important: Do NOT add any extra text. Only return valid JSON.
`;

const conceptExplainPrompt = (question) => `
You are an AI trained to generate explanations for a given interview question.

Task:
- Explain the following interview question and its concept in depth as if you're teaching a beginner developer.
- Question: "${question}"
- After the explanation, provide a short and clear title that summarizes the concept for the article or page header.
- You MUST include one implementation schema code snippet as a markdown fenced code block with a language tag.
- Do not place code in the title; code must appear only inside "explanation".
- Keep the formatting very clean and clear.
- Return the result as a valid JSON object in the following format:

{
  "title": "Short title here?",
  "explanation": "Explanation here."
}

Important: Do NOT add any extra text outside the JSON format. Only return valid JSON.
`;

module.exports = {
    questionAnswerPrompt,
    conceptExplainPrompt,
};