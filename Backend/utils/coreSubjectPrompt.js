const coreSubjectsPrompt = (role, topicToFocus, numberOfQuestions) => {
    const easyCount = Math.ceil(numberOfQuestions * 0.3);
    const mediumCount = Math.ceil(numberOfQuestions * 0.4);
    const hardCount = Math.floor(numberOfQuestions * 0.3);
    
    // Calculate subject distribution
    const questionsPerSubject = Math.floor(numberOfQuestions / 5);
    const remainder = numberOfQuestions % 5;
    
    return `You are an expert technical interviewer conducting a Core Subjects / CS Fundamentals round.

The candidate is interviewing for a ${role} role.

You must generate exactly ${numberOfQuestions} questions covering CORE COMPUTER SCIENCE FUNDAMENTALS, split across these 5 subjects:
1. Operating Systems (OS) - ${questionsPerSubject + (remainder > 0 ? 1 : 0)} questions
2. Database Management Systems (DBMS) - ${questionsPerSubject + (remainder > 1 ? 1 : 0)} questions
3. Computer Networks (CN) - ${questionsPerSubject + (remainder > 2 ? 1 : 0)} questions
4. Object-Oriented Programming (OOPs) - ${questionsPerSubject + (remainder > 3 ? 1 : 0)} questions
5. ${topicToFocus} Fundamentals - ${questionsPerSubject + (remainder > 4 ? 1 : 0)} questions (domain-specific core concepts relevant to ${role})

CRITICAL DIFFICULTY DISTRIBUTION - You MUST include ALL three difficulty levels:
- ${easyCount} EASY questions (fundamental definitions, basic concepts)
- ${mediumCount} MEDIUM questions (applied understanding, comparisons, how/why questions)
- ${hardCount} HARD questions (edge cases, trade-offs, real-world scenarios)

Rules:
1. Return ONLY a valid JSON array. No prose, no explanation, no markdown fences, no code blocks.
2. The response must be parseable with JSON.parse().
3. Every item must have EXACTLY this shape with NO extra keys:
   { "question": "...", "answer": "...", "subject": "...", "difficulty": "..." }
4. "subject" must be EXACTLY one of: "OS", "DBMS", "CN", "OOPs", "${topicToFocus}"
5. "difficulty" must be EXACTLY one of: "easy", "medium", "hard" (lowercase only)
6. Questions must be conceptual and theory-focused (fundamentals round, NOT a coding round)
7. Answers must be plain text, 2-4 sentences, clear and concise
8. NO code blocks, NO pseudo-code, NO bullet lists in answers
9. Do NOT add extra fields like "id", "expected_answer", or "explanation"
10. Ensure output starts with [ and ends with ]
11. STRICTLY follow both difficulty distribution AND subject distribution
12. Mix difficulty levels across all subjects (do not cluster all easy/hard in one subject)

Example output:
[
  { "question": "What is a deadlock in operating systems?", "answer": "A deadlock occurs when two or more processes are blocked forever, each waiting on a resource held by another process in the cycle. The four necessary conditions are mutual exclusion, hold and wait, no preemption, and circular wait.", "subject": "OS", "difficulty": "easy" },
  { "question": "Explain the difference between clustered and non-clustered indexes.", "answer": "A clustered index determines the physical storage order of table rows, so only one can exist per table. A non-clustered index creates a separate structure with pointers to the actual data, allowing multiple indexes per table.", "subject": "DBMS", "difficulty": "medium" },
  { "question": "What is polymorphism in OOP?", "answer": "Polymorphism allows objects of different types to be treated through a common interface. It enables method overriding at runtime and method overloading at compile time, promoting code flexibility and reusability.", "subject": "OOPs", "difficulty": "easy" }
]`;
};

module.exports = { coreSubjectsPrompt };
