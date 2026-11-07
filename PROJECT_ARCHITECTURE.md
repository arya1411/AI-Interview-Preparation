# PrepAI architecture

This document describes the checked-in application. See [README.md](README.md) for setup and [DSA_IMPLEMENTATION_PLAN.md](DSA_IMPLEMENTATION_PLAN.md) for detailed DSA execution and import behavior (local implementation notes, ignored by Git).

## Runtime and structure

- `Frontend/`: React 19, React Router 7, Vite 8 and Tailwind CSS 4. Axios calls the Express API. Framer Motion, GSAP and Three.js provide visual effects; Monaco provides the DSA editor.
- `Backend/`: CommonJS Node.js, Express 5, PostgreSQL through Sequelize, JWT/bcrypt authentication and Multer image uploads.
- `shared/dsa-sheet.json`: shared default DSA sheet consumed by both applications. Preserve this directory when deploying either application.
- AI question generation, explanations and descriptive answer evaluation use Groq. The configured model is `qwen/qwen3.8-27b` in `aiControllers.js` and `testController.js`; changing providers requires code/configuration changes.

There is no MongoDB/Mongoose database or active NVIDIA NIM integration in this implementation.

## Frontend routes

| Route | Page |
| --- | --- |
| `/` | Landing page |
| `/login`, `/signup` | Authentication |
| `/dashboard` | Preparation sessions |
| `/session/:id` | Study, explanations, notes, pins and progress |
| `/test` | Test session dashboard |
| `/session/:sessionId/test` | MCQ or descriptive assessment |
| `/test/:attemptId/result` | Evaluation and answer breakdown |
| `/core` | Core CS subject preparation |
| `/dsa` | Coding sheet, editor, execution and submission history |
| `/analytics` | Account preparation and test analytics |
| `/profile/edit` | Profile editing |

All routes except landing and authentication use `PrivateRoute`. `UserProvider` loads the profile using the token in localStorage; Axios attaches it as a bearer token. API authentication failures redirect to login. `AppShell` supplies desktop navigation and a mobile drawer. DSA supplies a pre-navigation save callback.

Expanding a study question renders its stored short answer immediately. The Generate explanation button requests a detailed version only when clicked; it becomes visible before its separate save finishes; an existing explanation remains visible during regeneration. Generation receives the short answer as context and requests four teaching sections: how it works, a worked example, a common mistake, and an interview takeaway. The renderer preserves code within each section and supports older saved plain-text explanations. See [ANSWER_LATENCY.md](ANSWER_LATENCY.md) for the latency investigation.

`VITE_API_URL` selects the shared API origin. `VITE_DSA_API_URL` optionally overrides only DSA requests. These values are public build-time configuration, never a place for provider credentials.

## Data model

`config/database.js` authenticates PostgreSQL, registers associations and synchronizes Sequelize models at startup. `DB_SYNC_ALTER=false` creates missing tables without altering existing ones; otherwise startup enables Sequelize's alter behavior. Plan schema changes separately for deployment.

| Model | Data and relationships |
| --- | --- |
| User | Credentials and profile; owns sessions and attempts |
| Session | Role, experience, focus, type, question format and completion status; owns questions and attempts |
| Question | Prompt, answer, difficulty, notes, pin, status, explanation; optional subject and MCQ options |
| TestAttempt | User/session ownership, status, percentage score and completion time |
| TestAnswer | Attempt/question ownership and a snapshot of the question, answer, difficulty, MCQ choices, evaluation and score |
| DsaWorkspace | User's active sheet, sheet identity, revision, drafts, notes, bookmarks and solved map |
| DsaSubmission | Owned source, language, run/submit kind, execution status, test snapshot and verdicts |

Question scores are 0–10. Overall test scores are percentages (0–100). MCQs are scored by the server; descriptive answers use Groq evaluation.

## API modules

`server.js` registers CORS, JSON parsing, layered rate limits and these route groups:

- `/api/auth`: registration, login, profile and image uploads. There is no registered Google OAuth endpoint.
- `/api/sessions`: create, list, detail, delete and `PUT /complete/:id`.
- `/api/questions`: add, pin, note, status and explanation updates.
- `/api/ai`: generate descriptive questions, MCQs, core questions and concept explanations; authenticated and AI rate limited.
- `/api/test`: start attempts, submit answers, retrieve results and list a session's attempts.
- `/api/analytics`: summary and `/weak-topics`, both scoped to the authenticated account.
- `/api/dsa`: authenticated workspace load/save/import, execution and submission retrieval.
- `/ping`: health check. `/uploads` serves uploaded profile images.

The global API limit is 600 requests per 15 minutes. Login permits 20 failed requests per 10 minutes; registration permits 15 per hour. AI generation limits are 8 per minute and 120 per day per user. DSA execution allows 6 per minute per user. Limit responses include HTTP 429 and retry information. Limits are process-local.

## Analytics behavior

The analytics page loads the summary and review endpoints concurrently. It shows loading, empty, failure and partial-result states, offers refresh/retry, and aborts requests on navigation. Summary cards show session/question/test totals and the completed-test average; no completed tests displays a dash instead of an invented score. Breakdown bars include numeric counts.

The backend's `weak-topics` endpoint groups completed test answers by **difficulty**, because TestAnswer does not store subject. The UI labels these as difficulty groups and lists averages below 6/10. This is not subject-level recommendation data. DSA progress is displayed in DSA Practice and is not included in these totals. Historical trend charts are not implemented.

## DSA execution and persistence

The client saves per-problem/language drafts, notes and bookmarks with a revision and sheet identity. Server revision checks reject stale writes. Only accepted full submissions can update solved progress. Sheet import replaces the active workspace content; old submission records remain stored.

Execution sends source and problem identity to the backend, which selects stored tests and generates language harnesses. Local mode runs JavaScript, Python, C++ and Java in Bubblewrap child processes with no network or application environment and bounded time/output/address space. A bundled ignored JDK or `DSA_JAVA_HOME` can supply Java. Judge0-compatible execution is available as a backend-only alternative.

The local runner is intended for development/personal use: one job runs at a time, up to three wait, and restarting loses pending jobs. Completed database results persist. Use a maintained isolated execution service for public deployment. Test inputs and expected outputs are visible; supported typed inputs/returns are `int`, `int[]`, `string` and `bool`. The default sheet has eight sample questions; the full sheet remains to be supplied.

## Verification

From `Frontend/`, run `npm run lint`, `npm test` and `npm run build`. Tests cover DSA sheet/response validation, explanation formatting, analytics endpoint loading and partial failures.

From `Backend/`, run `npm run test:explanation`, `npm run test:analytics`, `npm run test:dsa`, `npm run test:dsa:harnesses` and `npm run test:dsa:local`. The harness script uses system Python/C++ and runs Java only if it is on PATH. Local runner tests also detect the bundled JDK and require Bubblewrap namespace permissions. A restricted agent sandbox may prevent those namespaces even when the host supports them.

Browser verification is separate from these checks: assess authentication, navigation, analytics loading/empty/error/populated states, session study/test flows, and DSA editing/run/submit/save/reload at desktop and mobile widths. See [QA_STATUS.md](QA_STATUS.md) for the latest verification status.
