# PrepAI - AI Interview Preparation Platform

> **Version 2.0** - Enhanced with Core Subjects, Test Mode, Analytics & PostgreSQL

PrepAI is a comprehensive full-stack interview preparation platform that generates role-specific technical interview questions using AI. It features structured preparation sessions, interactive test mode, performance analytics, and core CS fundamentals coverage.

## 🎯 Key Features

### **AI-Powered Question Generation**
- **Role-specific questions** tailored by experience level and topic focus
- **Multiple question formats**: Descriptive Q&A and Multiple Choice Questions (MCQ)
- **Core Subjects module** covering OS, DBMS, CN, OOPs + domain-specific fundamentals
- Powered by **Groq AI** (qwen/qwen3.8-27b model)

### **Preparation & Test Modes**
- **Preparation Mode**: Study with AI-generated explanations and personal notes
- **Test Mode**: Timed assessments with instant scoring and detailed results
- Question-level actions: pin/unpin, add notes, track status (mastered/needs-review/skipped)

### **Analytics Dashboard**
- Performance tracking across sessions
- Weak topic identification and improvement suggestions
- Difficulty-wise breakdown and progress visualization
- Historical test attempts and scoring trends

### **User Management**
- Secure JWT authentication with bcrypt encryption
- Profile customization with image upload
- Session history and progress tracking

## 🚀 Tech Stack

### Frontend
- **React 19.2** + **Vite 8.0** - Modern build tooling
- **React Router 7.14** - Client-side routing
- **Tailwind CSS 4.2** - Utility-first styling
- **Axios** - HTTP client
- **Framer Motion 12** - Smooth animations
- **GSAP 3.14** - Advanced animations
- **Three.js + React Three Fiber** - 3D graphics
- **Chart.js + react-chartjs-2** - Data visualization
- **React Hot Toast** - Notifications

### Backend
- **Node.js** + **Express.js** - REST API server
- **PostgreSQL** (Neon) + **Sequelize** - Relational database with ORM
- **JWT + bcrypt** - Secure authentication
- **Groq SDK** - AI question generation
- **Multer** - File upload handling
- **express-rate-limit** - API throttling
- **node-cron** - Scheduled tasks (server keep-alive)

## 📁 Project Structure

```text
AI Interview Preparation/
├── Backend/
│   ├── config/
│   │   └── database.js          # PostgreSQL Sequelize config
│   ├── controllers/
│   │   ├── aiControllers.js     # AI generation logic
│   │   ├── analyticsController.js
│   │   ├── authController.js
│   │   ├── questionController.js
│   │   ├── sessionController.js
│   │   └── testController.js
│   ├── middlewares/
│   │   ├── authMiddleware.js    # JWT verification
│   │   ├── rateLimiters.js      # Multi-layer rate limiting
│   │   └── uploadMiddleware.js
│   ├── models/
│   │   ├── User.js
│   │   ├── Session.js
│   │   ├── Question.js
│   │   ├── TestAttempt.js
│   │   └── TestAnswer.js
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── sessionRoutes.js
│   │   ├── questionRoutes.js
│   │   ├── testRoutes.js
│   │   └── analyticsRoutes.js
│   ├── utils/
│   │   ├── prompts.js           # AI prompt templates
│   │   └── coreSubjectPrompt.js
│   ├── uploads/                 # User profile images
│   ├── server.js
│   └── package.json
├── Frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Modal.jsx
│   │   │   ├── ThemeToggle.jsx
│   │   │   └── layout/
│   │   │       └── AppShell.jsx
│   │   ├── context/
│   │   │   ├── ThemeContext.jsx
│   │   │   └── userContext.jsx
│   │   ├── pages/
│   │   │   ├── LandingPage.jsx
│   │   │   ├── Auth/
│   │   │   ├── Dashboard/
│   │   │   ├── Session/
│   │   │   ├── Test/
│   │   │   ├── Core/
│   │   │   └── Analytics/
│   │   ├── routes/
│   │   │   └── PrivateRoute.jsx
│   │   ├── utils/
│   │   │   ├── apiPath.js
│   │   │   ├── axiosInstance.js
│   │   │   └── roles.js
│   │   └── App.jsx
│   ├── vite.config.js
│   └── package.json
└── README.md
```

## 🔄 Core User Flow

1. **Sign Up / Login** - JWT-based authentication
2. **Create Session** - Choose role, experience, topics, and question format
3. **AI Generation** - Backend generates tailored questions via Groq API
4. **Study Mode** - Review questions, pin important ones, add personal notes
5. **Request Explanations** - Generate detailed concept breakdowns with AI
6. **Test Mode** - Take timed tests and get instant scoring
7. **Analytics** - Track performance, identify weak areas, view progress

## 📡 API Reference

**Base URL (Development):** `http://localhost:8000`  
**Base URL (Production):** `https://ai-interview-preparation-uw13.onrender.com`

### Authentication Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/register` | ❌ | User registration |
| POST | `/api/auth/login` | ❌ | User login (returns JWT) |
| POST | `/api/auth/google` | ❌ | Google OAuth login |
| GET | `/api/auth/profile` | ✅ | Get user profile |
| POST | `/api/auth/upload-image` | ✅ | Upload profile image |

### Session Management

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/sessions/create` | ✅ | Create new prep session |
| GET | `/api/sessions/my-sessions` | ✅ | Get all user sessions |
| GET | `/api/sessions/:id` | ✅ | Get session details |
| DELETE | `/api/sessions/:id` | ✅ | Delete session |
| POST | `/api/sessions/complete/:id` | ✅ | Mark session complete |

### Question Actions

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/questions/add` | ✅ | Add custom question |
| POST | `/api/questions/:id/pin` | ✅ | Pin/unpin question |
| POST | `/api/questions/:id/note` | ✅ | Add/update note |
| POST | `/api/questions/:id/status` | ✅ | Update status |
| POST | `/api/questions/:id/explanation` | ✅ | Generate explanation |

### AI Generation

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/ai/generate-questions` | ✅ | Generate Q&A questions |
| POST | `/api/ai/generate-mcq` | ✅ | Generate MCQ questions |
| POST | `/api/ai/generate-core-subjects` | ✅ | Generate core CS questions |
| POST | `/api/ai/generate-explanation` | ✅ | Generate concept explanation |

### Test Mode

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/test/:sessionId/start` | ✅ | Start test attempt |
| POST | `/api/test/:attemptId/submit` | ✅ | Submit test answers |
| GET | `/api/test/:attemptId` | ✅ | Get test attempt details |
| GET | `/api/test/session/:sessionId` | ✅ | Get all attempts for session |

### Analytics

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/analytics` | ✅ | Get user analytics |
| GET | `/api/analytics/weak-topics` | ✅ | Get weak topic insights |

### Health Check

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/ping` | ❌ | Server health check |

## 🔒 Rate Limiting Strategy

Multi-layer rate limiting for stability and cost protection:

- **Global API Limiter** (100 req/15min) - Broad protection for all `/api` traffic
- **Login Limiter** (5 req/15min) - Brute-force protection
- **Register Limiter** (3 req/hour) - Sign-up abuse protection
- **AI Burst Limiter** (10 req/minute) - Short-window spike prevention
- **AI Daily Limiter** (50 req/day per user) - Sustainable AI usage

All rate limit responses return **HTTP 429** with `retryAfter` value.

## 🛠️ Getting Started

### Prerequisites

- Node.js 18+ and npm 9+
- PostgreSQL database (we use Neon serverless Postgres)
- Groq API key from [console.groq.com/keys](https://console.groq.com/keys)

### 1️⃣ Clone & Install

```bash
git clone https://github.com/arya1411/AI-Interview-Preparation.git
cd AI-Interview-Preparation

# Install backend dependencies
cd Backend
npm install

# Install frontend dependencies
cd ../Frontend
npm install
```

### 2️⃣ Configure Backend Environment

Create `Backend/.env`:

```env
# Database (PostgreSQL via Neon)
DB_NAME=your_db_name
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_HOST=your_neon_host.neon.tech
DB_PORT=5432

# Authentication
JWT_SECRET=your_strong_random_jwt_secret

# Server
PORT=8000

# AI Service
GROQ_API_KEY=your_groq_api_key

# CORS (Production)
CLIENT_URL=https://your-frontend-domain.vercel.app

# Keep-alive (for Render free tier)
SERVER_URL=https://your-backend-domain.onrender.com
```

**Get a free Groq API key:** Visit [console.groq.com/keys](https://console.groq.com/keys)

### 3️⃣ Configure Frontend Environment

Create `Frontend/.env`:

```env
# Backend API
VITE_API_URL=http://localhost:8000

# Firebase (optional - for future use)
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

### 4️⃣ Run Backend

```bash
cd Backend
npm run dev
```

Backend will start on `http://localhost:8000`

### 5️⃣ Run Frontend

```bash
cd Frontend
npm run dev
```

Frontend will start on `http://localhost:5173`

## 📜 Available Scripts

### Backend

| Command | Description |
|---------|-------------|
| `npm start` | Start server (production) |
| `npm run dev` | Start with nodemon (development) |

### Frontend

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint |

## 🌐 Deployment

### Backend (Render)
- Platform: [Render.com](https://render.com)
- Build Command: `npm install`
- Start Command: `npm start`
- Set all environment variables in Render dashboard

### Frontend (Vercel)
- Platform: [Vercel](https://vercel.com)
- Framework: Vite
- Build Command: `npm run build`
- Output Directory: `dist`
- Set `VITE_API_URL` to your backend URL

## 🔐 Security Best Practices

- ✅ Never commit `.env` files to git (already gitignored)
- ✅ Use strong, random `JWT_SECRET` (32+ characters)
- ✅ Restrict CORS origins in production
- ✅ Keep API keys secure and rotate regularly
- ✅ Enable SSL/TLS in production


## 🎨 UI Features

- **Dark/Light Theme Toggle** with persistent storage
- **Responsive Design** for mobile, tablet, and desktop
- **Smooth Animations** using Framer Motion and GSAP
- **3D Effects** with Three.js and React Three Fiber
- **Interactive Charts** for analytics visualization
- **Toast Notifications** for user feedback

## 🧪 Testing Tips

1. **Test Authentication Flow**
   - Register new user
   - Login and verify JWT token
   - Access protected routes

2. **Test Session Creation**
   - Create descriptive Q&A session
   - Create MCQ session
   - Create core subjects session

3. **Test AI Generation**
   - Verify question quality and relevance
   - Check difficulty distribution
   - Validate response format

4. **Test Test Mode**
   - Start test attempt
   - Submit answers
   - View results and scoring

5. **Test Analytics**
   - Complete multiple sessions
   - Check weak topics
   - Verify progress tracking

## 🚀 Future Enhancements

- [ ] **Advanced Analytics** - Time-series performance tracking and ML-based insights
- [ ] **Collaborative Sessions** - Share sessions with peers for group study
- [ ] **Custom Question Banks** - Import/export question sets
- [ ] **Video Interview Practice** - AI-powered mock video interviews
- [ ] **Spaced Repetition** - Smart question scheduling based on forgetting curve
- [ ] **Topic Recommendations** - AI-suggested topics based on weak areas
- [ ] **Mobile App** - React Native mobile application
- [ ] **API Documentation** - Swagger/OpenAPI interactive docs
- [ ] **Automated Testing** - Unit and integration test coverage
- [ ] **CI/CD Pipeline** - GitHub Actions for automated deployment
- [ ] **Redis Caching** - Performance optimization for frequently accessed data
- [ ] **WebSocket Support** - Real-time collaboration features
- [ ] **Role-Based Access** - Admin dashboard for content management

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- **Groq** for providing fast and free AI inference
- **Neon** for serverless PostgreSQL hosting
- **Vercel** for frontend hosting
- **Render** for backend hosting
- React, Vite, and the entire open-source community

## 📧 Contact

- **Author**: Arya
- **GitHub**: [@arya1411](https://github.com/arya1411)
- **Repository**: [AI-Interview-Preparation](https://github.com/arya1411/AI-Interview-Preparation)
- **Live Demo**: [PrepAI Platform](https://ai-interview-preparation-pied.vercel.app)

---

<div align="center">

**Built with ❤️ using React, Node.js, PostgreSQL & Groq AI**

[⭐ Star this repo](https://github.com/arya1411/AI-Interview-Preparation) | [🐛 Report Bug](https://github.com/arya1411/AI-Interview-Preparation/issues) | [💡 Request Feature](https://github.com/arya1411/AI-Interview-Preparation/issues)

</div>
