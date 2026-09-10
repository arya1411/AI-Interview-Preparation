const questionAnswerPrompt = (role, experience, topicToFocus, numberOfQuestions) => `
You are an expert technical interviewer for ${role} roles.

Generate exactly ${numberOfQuestions} interview questions for a candidate with ${experience} years of experience.
Focus areas: ${topicToFocus}

CRITICAL: You MUST include a mix of ALL difficulty levels (easy, medium, hard). For ${numberOfQuestions} questions:
- ${Math.ceil(numberOfQuestions * 0.3)} easy questions (basic concepts, definitions, simple scenarios)
- ${Math.ceil(numberOfQuestions * 0.4)} medium questions (practical application, problem-solving, intermediate concepts)
- ${Math.ceil(numberOfQuestions * 0.3)} hard questions (advanced concepts, system design, edge cases, optimization)

Rules:
1. Return ONLY a valid JSON array, no prose, no explanation, no markdown fences.
2. The response must be parseable with JSON.parse().
3. Every item must have exactly this shape and no extra keys:
   { "question": "...", "answer": "...", "difficulty": "..." }
4. "difficulty" must be EXACTLY one of: "easy", "medium", or "hard" (lowercase)
5. Never add fields like "id", "expected_answer", or "explanation".
6. Questions must be specific, realistic, and technically relevant.
7. Answers must be plain text, 2-3 sentences max, beginner-friendly and concise.
8. No code blocks, no pseudo-code, no bullet lists, no extra keys.
9. Do not include reasoning, headings, comments, or text outside the JSON array.
10. Ensure the output starts with [ and ends with ].
11. STRICTLY follow the difficulty distribution above - do not default all to "medium".

Example output:
[
  { "question": "What is Docker?", "answer": "Docker packages an application and its dependencies into a portable container...", "difficulty": "easy" },
  { "question": "How do you optimize database queries?", "answer": "Use proper indexing, avoid N+1 queries, and analyze query execution plans...", "difficulty": "medium" },
  { "question": "Design a distributed caching system for high-traffic applications", "answer": "Implement consistent hashing, cache invalidation strategies, and handle cache stampede...", "difficulty": "hard" }
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
6. The explanation string must be valid JSON text — use \\n for newlines and escape any double quotes inside the string.
7. If the concept is a programming/code concept, include one practical code example as a Markdown fenced block inside the explanation like: \\n\\n\`\`\`javascript\\n// example\\n\`\`\`\\n\\n. If it is a theory/CS concept (OS, DBMS, CN, OOPs, networking, etc.), skip the code block and use plain structured text instead.
8. Keep the explanation clear, structured, and interview-ready (3-6 sentences or paragraphs).
9. No extra text before or after the JSON object.
10. The response must be parseable with JSON.parse().
11. Do NOT wrap the output in \`\`\`json fences — output the raw JSON object directly.

Example shape:
{ "title": "Understanding Deadlock", "explanation": "A deadlock occurs when two or more processes are blocked forever...\\n\\nFor a deadlock to occur, four conditions must hold simultaneously: mutual exclusion, hold and wait, no preemption, and circular wait.\\n\\nTo prevent deadlocks, systems use strategies like resource ordering, timeouts, or banker's algorithm." }
`;

/**
 * Bulk evaluation prompt.
 * answers: array of { question, idealAnswer, userAnswer, difficulty }
 */
const evaluateAnswersPrompt = (answers) => `
You are an expert technical interviewer evaluating a candidate's answers.

Evaluate each answer below and return a JSON array with one result per answer, in the same order.

Answers to evaluate:
${JSON.stringify(answers.map((a, i) => ({
    index: i,
    question: a.question,
    idealAnswer: a.idealAnswer,
    userAnswer: a.userAnswer || '(no answer provided)',
    difficulty: a.difficulty || 'medium',
})), null, 2)}

Scoring rules:
- Score each answer from 0 to 10 (integers only).
- 9-10: Excellent — covers all key points accurately.
- 7-8: Good — covers most key points with minor gaps.
- 5-6: Adequate — covers some points but misses important ones.
- 3-4: Weak — significant gaps or inaccuracies.
- 1-2: Poor — barely relevant.
- 0: No answer or completely wrong.
- Be strict but fair. Reward correct concepts even if phrasing differs from the ideal answer.

Return ONLY a valid JSON array, no prose, no markdown fences.
Every item must have exactly this shape:
{
  "index": <number matching the input index>,
  "score": <integer 0-10>,
  "feedback": "<2-3 sentence overall assessment>",
  "strengths": ["<point 1>", "<point 2>"],
  "improvements": ["<point 1>", "<point 2>"]
}

Rules:
1. Return ONLY the JSON array — nothing before [ or after ].
2. "strengths" and "improvements" must each be arrays of 1-3 short strings.
3. If userAnswer is empty or "(no answer provided)", score must be 0 and feedback must say no answer was provided.
4. Do not add extra keys.
5. The output must be parseable with JSON.parse().
`;

const mcqGenerationPrompt = (role, experience, topicToFocus, numberOfQuestions) => `
You are an expert technical interviewer for ${role} roles.

Generate exactly ${numberOfQuestions} multiple-choice questions for a candidate with ${experience} years of experience.
Focus areas: ${topicToFocus}

Difficulty distribution for ${numberOfQuestions} questions:
- ${Math.ceil(numberOfQuestions * 0.3)} easy
- ${Math.ceil(numberOfQuestions * 0.4)} medium
- ${Math.ceil(numberOfQuestions * 0.3)} hard

Rules:
1. Return ONLY a valid JSON array — no prose, no markdown fences.
2. The response must be parseable with JSON.parse().
3. Every item must have EXACTLY this shape and no extra keys:
   { "question": "...", "options": ["A. ...", "B. ...", "C. ...", "D. ..."], "correctOption": <0|1|2|3>, "answer": "...", "difficulty": "..." }
4. "options" must be an array of exactly 4 strings, each prefixed with "A. ", "B. ", "C. ", "D. ".
5. "correctOption" is the 0-based index of the correct option (0=A, 1=B, 2=C, 3=D).
6. "answer" is a 1-2 sentence explanation of why the correct option is right.
7. "difficulty" must be EXACTLY one of: "easy", "medium", "hard" (lowercase).
8. All 4 options must be plausible — avoid obviously wrong distractors.
9. Only one option must be correct.
10. Do not include reasoning, headings, or any text outside the JSON array.
11. Output must start with [ and end with ].

Example output:
[
  {
    "question": "Which hook is used to run side effects in a React functional component?",
    "options": ["A. useState", "B. useEffect", "C. useContext", "D. useReducer"],
    "correctOption": 1,
    "answer": "useEffect is the hook designed for side effects such as data fetching, subscriptions, and DOM mutations.",
    "difficulty": "easy"
  }
]
`;

module.exports = {
    questionAnswerPrompt,
    conceptExplainPrompt,
    evaluateAnswersPrompt,
    mcqGenerationPrompt,
};
