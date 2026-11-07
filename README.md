# PrepAI — AI Interview Preparation

PrepAI is a React/Express application for AI-generated interview preparation, MCQ and descriptive assessments, core CS subjects, account analytics and multi-language DSA practice. It uses PostgreSQL with Sequelize, JWT authentication and Groq for AI generation/evaluation.

## Features

- Role-, experience- and topic-based question generation, explanations, pins and personal notes.
- MCQ and descriptive tests with scores and answer feedback.
- Core CS subject preparation.
- Analytics at `/analytics`: account totals, completed-test average, question difficulty/session type breakdowns and difficulty groups needing review.
- Authenticated DSA workspace at `/dsa`: Monaco editor, JavaScript/Python/C++/Java execution, drafts, notes, bookmarks, verified solved progress, import and submission history.

The DSA default sheet contains eight sample problems. Analytics review areas currently group answers by difficulty, not subject. DSA progress is separate from preparation/test analytics. The cheat sheet and full DSA content are not implemented.

## Local setup

Use Node.js 22.12+ (or a newer version supported by Vite 8), npm and a reachable PostgreSQL database with TLS. The local DSA runner additionally requires Linux, Bubblewrap, `prlimit`, Node, Python and a C++ compiler; Java requires a JDK. Judge0 is an optional execution provider.

Install dependencies in each directory:

```bash
cd Backend
npm install
cp .env.example .env
```

Set database credentials, `JWT_SECRET`, `GROQ_API_KEY`, `PORT=8000` and `CLIENT_URL=http://localhost:5173` in `Backend/.env`. Keep `DB_SYNC_ALTER=false` for startup without altering existing tables. Leave `SERVER_URL` empty locally; it enables an optional hosted keep-alive task. All secrets belong on the backend.

```bash
cd Frontend
npm install
cp .env.example .env
```

Set `VITE_API_URL=http://localhost:8000`. Optional `VITE_DSA_API_URL` overrides the API origin for DSA only. Restart Vite after environment changes; `.env.development.local` can hold local overrides. Frontend `VITE_*` variables are public.

Start the backend and frontend in separate terminals:

```bash
cd Backend
npm run dev
```

```bash
cd Frontend
npm run dev
```

Open `http://localhost:5173`, sign in and use the sidebar. The backend health endpoint is `http://localhost:8000/ping`. If PORT is unset, the server defaults to 5000, so configure both applications consistently.

## DSA execution

`DSA_EXECUTION_MODE=local` runs solutions using Bubblewrap. Java is detected from `.local-runtimes/java`, `DSA_JAVA_HOME`, or a system JDK. Language runtimes are not installed by `npm install`. Local execution uses an in-memory queue and is intended for development/personal practice.

For a public deployment, use a maintained isolated Judge0-compatible service: set `DSA_EXECUTION_MODE=judge0`, `JUDGE0_URL`, credentials and language IDs in `Backend/.env`. Consult `.env.example` for supported variables. Never put judge credentials in frontend variables. The repository's `shared/` directory must remain accessible to both applications.

Imports accept JSON sheets with up to 200 questions, 50 tests per question and 1 MB. Download a template from Import Sheet. Import replaces the active sheet, drafts, notes, bookmarks and progress. C++/Java require typed signatures and language starters. Supported typed values are `int`, `int[]`, `string` and `bool`.

## Checks

```bash
cd Frontend
npm run lint
npm test
npm run build
```

```bash
cd Backend
npm run test:explanation
npm run test:analytics
npm run test:dsa
npm run test:dsa:harnesses
npm run test:dsa:local
```

The local runner suite needs host namespace permissions. The harness script skips Java if it is absent from PATH; the local runner suite also detects the bundled JDK. Backend `npm test` is still a placeholder; use the named suites above.

## API and architecture

See [PROJECT_ARCHITECTURE.md](PROJECT_ARCHITECTURE.md) for routes, models, authentication, rate limits, score scales and execution behavior. See [QA_STATUS.md](QA_STATUS.md) for verification results and outstanding browser checks.

Key authenticated API groups are `/api/sessions`, `/api/questions`, `/api/ai`, `/api/test`, `/api/analytics` and `/api/dsa`. Authentication routes provide register, login, profile and image upload. Session completion uses `PUT /api/sessions/complete/:id`. Google OAuth is not implemented.

## Deployment

Build the frontend with `npm run build` and serve `Frontend/dist` with SPA rewrites. Configure `VITE_API_URL` before building. Run the backend with `npm start`, configure database/JWT/Groq/CORS variables and persist uploads if profile images must survive restarts. PostgreSQL startup currently uses Sequelize synchronization; review schema changes before deployment. Preserve `shared/dsa-sheet.json` alongside both application directories.

The frontend does not install language runtimes or deploy the DSA backend automatically. Existing hosted deployments need the updated backend routes and a configured execution provider to support DSA.
