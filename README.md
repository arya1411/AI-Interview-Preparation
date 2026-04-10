# PrepAI - AI Interview Preparation Platform

PrepAI is a full-stack interview preparation platform that generates role-specific technical interview questions using AI, saves them into trackable sessions, and helps users revise with notes, pinning, and concept deep-dives.

## Highlights

- AI-generated interview questions tailored by role, experience, and topic focus.
- Structured preparation sessions with full history and revisit support.
- Question-level actions: pin/unpin, add personal notes, generate detailed explanation.
- Secure JWT authentication flow with protected APIs.
- Profile image upload support.
- Layered API rate limiting for abuse prevention and AI cost control.

## Tech Stack

### Frontend

- React 19 + Vite
- React Router
- Tailwind CSS v4
- Axios
- Framer Motion + GSAP + Three.js (interactive UI)

### Backend

- Node.js + Express
- MongoDB + Mongoose
- JWT + bcrypt authentication
- Multer for file uploads
- Groq API for AI generation
- express-rate-limit for layered throttling

## Repository Structure

```text
.
|- Backend/
|  |- config/
|  |- controllers/
|  |- middlewares/
|  |- models/
|  |- routes/
|  |- uploads/
|  |- utils/
|  |- server.js
|  |- package.json
|- Frontend/
|  |- src/
|  |  |- components/
|  |  |- context/
|  |  |- hooks/
|  |  |- pages/
|  |  |- routes/
|  |  |- utils/
|  |- package.json
|- README.md
```

## Core User Flow

1. User signs up / logs in.
2. User opens dashboard and creates a session (role + experience + topics).
3. Frontend requests AI question generation.
4. Backend generates questions using Groq and stores session + questions in MongoDB.
5. User reviews Q&A, pins important questions, adds notes, and requests detailed explanations.
6. User can generate more questions and continue iterative preparation.

## API Overview

Base URL (default): `http://localhost:8000`

### Auth

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/profile` (protected)
- `POST /api/auth/upload-image`

### Sessions

- `POST /api/sessions/create` (protected)
- `GET /api/sessions/my-sessions` (protected)
- `GET /api/sessions/:id` (protected)
- `DELETE /api/sessions/:id` (protected)

### Questions

- `POST /api/questions/add` (protected)
- `POST /api/questions/:id/pin` (protected)
- `POST /api/questions/:id/note` (protected)

### AI

- `POST /api/ai/generate-questions` (protected)
- `POST /api/ai/generate-explanation` (protected)

## Rate Limiting Strategy

The backend uses layered rate limits for stability and cost protection:

- Global API limiter: broad protection for all `/api` traffic.
- Login limiter: brute-force protection with successful-logins skipped.
- Register limiter: sign-up abuse protection.
- AI burst limiter: short-window throttling to prevent spikes.
- AI daily limiter: per-user/IP daily cap for sustainable usage.

All limit responses return HTTP `429` with a user-friendly message and `retryAfter` value.

## Getting Started

### Prerequisites

- Node.js 18+
- npm 9+
- MongoDB Atlas URI (or local MongoDB)
- Groq API key

### 1) Install dependencies

```bash
cd Backend
npm install

cd ../Frontend
npm install
```

### 2) Configure backend environment

Create `Backend/.env`:

```env
MONGO_URL=your_mongodb_connection_string
JWT_SECRET=your_strong_jwt_secret
PORT=8000
GROQ_API_KEY=your_groq_api_key
```

### 3) Run backend

```bash
cd Backend
npm run dev
```

### 4) Run frontend

```bash
cd Frontend
npm run dev
```

Frontend should run on Vite default URL and call backend at `http://localhost:8000`.

## Available Scripts

### Backend

- `npm run dev` - Start backend with nodemon
- `npm start` - Start backend normally

### Frontend

- `npm run dev` - Start Vite development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Security Notes

- Never commit real `.env` secrets.
- Use long, random `JWT_SECRET` values.
- Restrict CORS origins in production.
- Consider adding request validation (e.g., Zod/Joi) for stronger input safety.

## Suggested Next Improvements

- Add role-based authorization (admin/user flows).
- Add automated tests (unit + integration).
- Add API docs (Swagger/OpenAPI).
- Add CI checks for lint and tests.
- Add Redis-backed rate-limit store for multi-instance deployments.

## License

This project is currently unlicensed. Add a license file before public distribution.
