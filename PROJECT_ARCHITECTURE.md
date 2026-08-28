# PrepAI - Project Architecture Documentation

## Overview
PrepAI is a full-stack AI-powered interview preparation platform that generates role-specific technical interview questions, manages preparation sessions, and provides detailed explanations for concepts.

## Technology Stack

### Backend
- **Runtime**: Node.js + Express.js
- **Database**: MongoDB + Mongoose ODM
- **Authentication**: JWT (jsonwebtoken) + bcrypt for password hashing
- **File Upload**: Multer
- **AI Integration**: NVIDIA NIM API (Nemotron 3.5 Lightning 30B A3B model)
- **Rate Limiting**: express-rate-limit (layered approach)
- **Job Scheduling**: node-cron (for server keep-alive)
- **HTTP Client**: axios

### Frontend
- **Framework**: React 19
- **Build Tool**: Vite
- **Routing**: React Router v7
- **Styling**: Tailwind CSS v4
- **HTTP Client**: Axios
- **Animations**: Framer Motion + GSAP
- **3D Graphics**: Three.js + React Three Fiber + Drei
- **Code Highlighting**: react-syntax-highlighter
- **Markdown**: remark-gfm
- **Notifications**: react-hot-toast
- **Icons**: react-icons (Feather Icons)
- **Date Handling**: moment.js

---

## Project Structure

```
AI Interview Preparation/
├── Backend/
│   ├── config/
│   │   └── db.js                    # MongoDB connection configuration
│   ├── controllers/
│   │   ├── aiControllers.js         # AI generation logic (questions, explanations)
│   │   ├── authController.js        # User authentication (register, login, profile)
│   │   ├── questionController.js    # Question operations (add, pin, note)
│   │   └── sessionController.js     # Session CRUD operations
│   ├── middlewares/
│   │   ├── authMiddleware.js        # JWT verification middleware
│   │   ├── rateLimiters.js          # Layered rate limiting configuration
│   │   └── uploadMiddleware.js      # Multer configuration for image uploads
│   ├── models/
│   │   ├── User.js                  # User schema
│   │   ├── Session.js              # Session schema
│   │   └── Question.js             # Question schema
│   ├── routes/
│   │   ├── authRoutes.js            # Authentication endpoints
│   │   ├── questionRoutes.js        # Question management endpoints
│   │   └── sessionRoutes.js         # Session management endpoints
│   ├── utils/
│   │   └── prompts.js               # AI prompt templates
│   ├── uploads/                     # Static file storage for profile images
│   ├── server.js                    # Express server entry point
│   ├── package.json
│   └── .env                         # Environment variables
├── Frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Modal.jsx            # Reusable modal component
│   │   │   ├── ThemeToggle.jsx      # Dark/light mode toggle
│   │   │   └── layout/
│   │   │       └── AppShell.jsx     # Main layout with sidebar and header
│   │   ├── context/
│   │   │   ├── ThemeContext.jsx     # Theme state management
│   │   │   ├── userContext.jsx      # User authentication state
│   │   │   ├── useTheme.jsx         # Theme hook
│   │   │   └── useUser.jsx          # User hook
│   │   ├── hooks/
│   │   │   └── useUserAuth.jsx      # User authentication hook
│   │   ├── pages/
│   │   │   ├── Auth/
│   │   │   │   ├── Login.jsx        # Login page
│   │   │   │   └── Signup.jsx       # Registration page
│   │   │   ├── Home/
│   │   │   │   └── HomeDashboard.jsx # Main dashboard with session management
│   │   │   ├── User/
│   │   │   │   └── SessionDetail.jsx # Session detail view with Q&A
│   │   │   ├── Admin/
│   │   │   │   └── AdminDashboard.jsx # Admin dashboard
│   │   │   ├── LandingPage.jsx      # Landing page
│   │   │   └── EditProfile.jsx      # Profile editing page
│   │   ├── routes/
│   │   │   └── PrivateRoute.jsx     # Protected route wrapper
│   │   ├── utils/
│   │   │   ├── apiPath.js           # API endpoint constants
│   │   │   ├── axiosInstance.js     # Axios instance with interceptors
│   │   │   ├── helper.js            # Utility functions
│   │   │   ├── roles.js             # Role definitions with topics
│   │   │   ├── toast.js             # Toast notification helpers
│   │   │   └── uploadimage.js       # Image upload utility
│   │   ├── App.jsx                  # Main routing configuration
│   │   ├── main.jsx                 # React entry point
│   │   └── index.css                # Global styles
│   ├── package.json
│   └── vite.config.js
└── README.md
```

---

## Backend Architecture

### Database Models

#### User Model (`models/User.js`)
```javascript
{
  name: String (required),
  email: String (required, unique),
  password: String (required, hashed),
  profileImageUrl: String (optional),
  timestamps: true
}
```

#### Session Model (`models/Session.js`)
```javascript
{
  user: ObjectId (ref: User),
  role: String (required),
  experince: String (required), // Note: typo in original
  topicsToFocus: String (required),
  description: String (optional),
  questions: [ObjectId] (ref: Question),
  timestamps: true
}
```

#### Question Model (`models/Question.js`)
```javascript
{
  session: ObjectId (ref: Session),
  question: String,
  answer: String,
  note: String (optional),
  isPinned: Boolean (default: false),
  timestamps: true
}
```

### API Endpoints

#### Authentication Routes (`routes/authRoutes.js`)
- **POST** `/api/auth/register` - User registration
  - Controller: `authController.registerUser`
  - Body: `{ name, email, password, profileImageUrl }`
  - Returns: User object with JWT token
  - Rate Limited: `registerLimiter` (15 requests/hour)

- **POST** `/api/auth/login` - User login
  - Controller: `authController.loginUser`
  - Body: `{ email, password }`
  - Returns: User object with JWT token
  - Rate Limited: `loginLimiter` (20 requests/10min, skips successful)

- **GET** `/api/auth/profile` - Get user profile
  - Controller: `authController.getUserProfile`
  - Middleware: `protect` (JWT verification)
  - Returns: User profile data

- **POST** `/api/auth/upload-image` - Upload profile image
  - Middleware: `upload.single("image")`
  - Returns: `{ imageUrl }` with full URL path

#### Session Routes (`routes/sessionRoutes.js`)
- **POST** `/api/sessions/create` - Create new session
  - Controller: `sessionController.createSession`
  - Middleware: `protect`
  - Body: `{ role, experience, topicToFocus, description, questions[] }`
  - Returns: Created session with questions

- **GET** `/api/sessions/my-sessions` - Get user's sessions
  - Controller: `sessionController.getMySession`
  - Middleware: `protect`
  - Returns: Array of user sessions with populated questions

- **GET** `/api/sessions/:id` - Get specific session
  - Controller: `sessionController.getSessionById`
  - Middleware: `protect`
  - Returns: Session with questions (sorted by isPinned, createdAt)

- **DELETE** `/api/sessions/:id` - Delete session
  - Controller: `sessionController.deleteSession`
  - Middleware: `protect`
  - Authorization: User must own the session
  - Cascades: Deletes associated questions

#### Question Routes (`routes/questionRoutes.js`)
- **POST** `/api/questions/add` - Add questions to session
  - Controller: `questionController.addQuestionToSession`
  - Middleware: `protect`
  - Body: `{ sessionId, questions[] }`
  - Returns: Created questions

- **POST** `/api/questions/:id/pin` - Toggle question pin status
  - Controller: `questionController.togglePinQuestion`
  - Middleware: `protect`
  - Returns: Updated question

- **POST** `/api/questions/:id/note` - Update question note
  - Controller: `questionController.updateQuestionNote`
  - Middleware: `protect`
  - Body: `{ note }`
  - Returns: Updated question

#### AI Routes (Direct in `server.js`)
- **POST** `/api/ai/generate-questions` - Generate interview questions
  - Controller: `aiControllers.generateInterviewQuestions`
  - Middleware: `protect`, `aiBurstLimiter`, `aiDailyLimiter`
  - Body: `{ role, experience, topicToFocus, numberOfQuestions }`
  - Returns: Array of `{ question, answer }` objects
  - AI Model: NVIDIA Nemotron 3.5 Lightning 30B A3B
  - Features: High domain accuracy, optimized for technical content

- **POST** `/api/ai/generate-explanation` - Generate concept explanation
  - Controller: `aiControllers.generateConceptExplanation`
  - Middleware: `protect`, `aiBurstLimiter`, `aiDailyLimiter`
  - Body: `{ topic }`
  - Returns: `{ title, explanation }`
  - AI Model: NVIDIA Nemotron 3.5 Lightning 30B A3B
  - Features: Reasoning mode enabled, 16K token limit for detailed explanations

### Middleware Stack

#### Authentication Middleware (`middlewares/authMiddleware.js`)
- **Function**: `protect`
- **Purpose**: Verifies JWT token from Authorization header
- **Process**:
  1. Extracts token from `Authorization: Bearer <token>`
  2. Verifies token using JWT_SECRET
  3. Fetches user from database (excludes password)
  4. Attaches user to `req.user`
  5. Calls `next()` or returns 401

#### Rate Limiting Middleware (`middlewares/rateLimiters.js`)
- **apiLimiter**: 600 requests per 15 minutes (global API protection)
- **loginLimiter**: 20 requests per 10 minutes (skips successful requests)
- **registerLimiter**: 15 requests per hour
- **aiBurstLimiter**: 8 requests per minute (per user/IP)
- **aiDailyLimiter**: 120 requests per day (per user/IP)
- **Response**: HTTP 429 with `retryAfter` header

#### Upload Middleware (`middlewares/uploadMiddleware.js`)
- **Storage**: Disk storage in `uploads/` directory
- **Filename**: Timestamp + original extension
- **Filter**: Only image files allowed
- **Auto-creates**: Upload directory if not exists

### Server Configuration (`server.js`)
- **Port**: 8000 (configurable via PORT env var)
- **CORS**: Reflects request origin, allows credentials
- **Static Files**: `/uploads` serves uploaded images
- **Self-Ping**: Cron job every 14 minutes to keep server awake (if SERVER_URL set)
- **Trust Proxy**: Enabled for rate limiting behind proxy

---

## Frontend Architecture

### Component Hierarchy

```
main.jsx (Entry Point)
├── BrowserRouter
├── ThemeProvider (Theme Context)
├── UserProvider (User Context)
├── Toaster (Notifications)
└── App.jsx (Router Configuration)
    ├── Routes
    │   ├── / → LandingPage
    │   ├── /login → LoginPage
    │   ├── /signup → SignupPage
    │   └── PrivateRoute
    │       ├── /dashboard → HomeDashboard
    │       ├── /session/:id → SessionDetail
    │       └── /profile/edit → EditProfile
```

### Context Management

#### User Context (`context/userContext.jsx`)
- **State**: `user`, `loading`
- **Functions**:
  - `login(payload)`: Stores token, sets user state
  - `logout()`: Clears token, resets user state
  - `refreshUser()`: Reloads user profile from API
- **Auto-load**: Fetches profile on mount if token exists

#### Theme Context (`context/ThemeContext.jsx`)
- **State**: Dark/light mode
- **Functions**: Theme toggle logic
- **Persistence**: Stored in localStorage

### Routing Configuration (`App.jsx`)

#### Public Routes
- `/` - Landing page
- `/login` - Login page
- `/signup` - Registration page

#### Protected Routes (via `PrivateRoute`)
- `/dashboard` - Main dashboard
- `/session/:id` - Session detail view
- `/profile/edit` - Profile editing

### Key Pages

#### LandingPage (`pages/LandingPage.jsx`)
- Purpose: Marketing and introduction
- Features: Hero section, feature highlights, CTA buttons
- Navigation: Links to login/signup

#### Login Page (`pages/Auth/Login.jsx`)
- **Form Fields**: Email, Password
- **API Call**: `POST /api/auth/login`
- **Success**: Stores token, redirects to `/dashboard`
- **Error Handling**: Displays toast notifications

#### Signup Page (`pages/Auth/Signup.jsx`)
- **Form Fields**: Name, Email, Password, Profile Image (optional)
- **API Call**: `POST /api/auth/register`
- **Success**: Stores token, redirects to `/dashboard`
- **Image Upload**: Optional profile image via `/api/auth/upload-image`

#### Home Dashboard (`pages/Home/HomeDashboard.jsx`)
- **Features**:
  - Display user's sessions in grid
  - Create new session modal
  - Delete session functionality
  - Statistics summary (active sessions, total questions, last sync)
- **Session Creation Flow**:
  1. User fills form (role, experience, topics, description)
  2. Calls AI API to generate questions
  3. Creates session with generated questions
  4. Navigates to session detail page
- **API Calls**:
  - `GET /api/sessions/my-sessions` - Fetch sessions
  - `POST /api/ai/generate-questions` - Generate questions
  - `POST /api/sessions/create` - Create session
  - `DELETE /api/sessions/:id` - Delete session

#### Session Detail (`pages/User/SessionDetail.jsx`)
- **Features**:
  - Display session information (role, topics, experience)
  - List questions with expand/collapse
  - Pin/unpin questions
  - Add personal notes to questions
  - Generate detailed explanations (AI)
  - Generate more questions for same session
  - Copy code snippets from explanations
- **Question Actions**:
  - **Pin**: Toggles `isPinned` status
  - **Learn More**: Generates AI explanation with code examples
  - **Add Note**: Opens modal to add personal notes
  - **Generate More**: Adds 10 more questions to session
- **API Calls**:
  - `GET /api/sessions/:id` - Fetch session data
  - `POST /api/questions/:id/pin` - Toggle pin
  - `POST /api/questions/:id/note` - Save note
  - `POST /api/ai/generate-explanation` - Generate explanation
  - `POST /api/ai/generate-questions` - Generate more questions
  - `POST /api/questions/add` - Add questions to session

#### AppShell (`components/layout/AppShell.jsx`)
- **Components**:
  - Responsive sidebar (desktop fixed, mobile drawer)
  - Top header with title and user info
  - Navigation menu
  - Logout functionality
- **Navigation Items**:
  - Dashboard (`/dashboard`)
  - Profile (`/profile/edit`)

### Utility Functions

#### API Configuration (`utils/apiPath.js`)
- **BASE_URL**: Production API endpoint
- **API_PATH**: Object containing all endpoint paths
  - AUTH: Register, Login, Get Profile
  - AI: Generate Questions, Generate Explanation
  - QUESTION: Add, Pin, Note
  - SESSION: Create, Get All, Get One, Delete
  - IMAGE: Upload

#### Axios Instance (`utils/axiosInstance.js`)
- **Configuration**:
  - Base URL from `apiPath.js`
  - 10-second timeout
  - JSON content type
- **Request Interceptor**: Adds JWT token from localStorage
- **Response Interceptor**:
  - 401: Redirects to `/login`
  - 500: Logs server error
  - Timeout: Handles connection abort

#### Helper Functions (`utils/helper.js`)
- **parseQuestionsResponse**: Normalizes various API response formats
- **normalizeQuestions**: Ensures question objects have required fields
- **getErrorMessage**: Extracts error message from error objects

#### Role Definitions (`utils/roles.js`)
- Contains predefined roles with associated topics
- Used for auto-filling topic selection in session creation

---

## Data Flow

### Authentication Flow
```
User → Login Page → POST /api/auth/login
                      ↓
              authController.loginUser
                      ↓
              Verify credentials with bcrypt
                      ↓
              Generate JWT token
                      ↓
              Return user + token
                      ↓
              Frontend stores token in localStorage
                      ↓
              UserContext sets user state
                      ↓
              Redirect to /dashboard
```

### Session Creation Flow
```
User → HomeDashboard → Create Session Modal
                      ↓
              POST /api/ai/generate-questions
                      ↓
              Groq AI generates Q&A pairs
                      ↓
              POST /api/sessions/create
                      ↓
              sessionController.createSession
                      ↓
              Create Session document
                      ↓
              Create Question documents
                      ↓
              Link questions to session
                      ↓
              Return session with questions
                      ↓
              Navigate to /session/:id
```

### Question Explanation Flow
```
User → SessionDetail → Click "Learn More"
                      ↓
              POST /api/ai/generate-explanation
                      ↓
              aiControllers.generateConceptExplanation
                      ↓
              Groq AI generates explanation with code
                      ↓
              Parse and extract code blocks
                      ↓
              Display in side panel
                      ↓
              Syntax highlighting for code
```

### Protected Route Flow
```
User → PrivateRoute → Check loading state
                      ↓
              If loading → Show spinner
                      ↓
              If no user → Redirect to /login
                      ↓
              If user → Render child route
                      ↓
              Child component can access user context
```

---

## State Management

### User State
- **Location**: `UserContext`
- **Persistence**: localStorage token
- **Scope**: Application-wide
- **Updates**: Login, logout, profile refresh

### Theme State
- **Location**: `ThemeContext`
- **Persistence**: localStorage
- **Scope**: Application-wide
- **Updates**: Theme toggle

### Component State
- **Session List**: `HomeDashboard` component state
- **Session Detail**: `SessionDetail` component state
- **Form States**: Local component states for forms
- **Modal States**: Local component states for modals

---

## Security Features

### Backend Security
1. **Password Hashing**: bcrypt with salt rounds (10)
2. **JWT Authentication**: 7-day token expiration
3. **Rate Limiting**: Layered approach to prevent abuse
4. **CORS**: Configured to reflect request origin
5. **Input Validation**: Basic validation in controllers
6. **File Upload**: Restricts to image files only

### Frontend Security
1. **Protected Routes**: `PrivateRoute` wrapper
2. **Token Storage**: localStorage (consider httpOnly cookies for production)
3. **Automatic Logout**: On 401 responses
4. **Request Interceptor**: Automatically includes auth token

---

## API Rate Limiting Strategy

### Layered Approach
1. **Global API Limiter**: 600 requests/15min (broad protection)
2. **Login Limiter**: 20 requests/10min (brute-force protection)
3. **Register Limiter**: 15 requests/hour (signup abuse prevention)
4. **AI Burst Limiter**: 8 requests/min (per user/IP, prevents spikes)
5. **AI Daily Limiter**: 120 requests/day (per user/IP, cost control)

### Response Format
```json
{
  "success": false,
  "message": "Too many requests",
  "retryAfter": 45
}
```

---

## AI Integration

### NVIDIA NIM API Configuration
- **Model**: nvidia/nemotron-3.5-lightning-30b-a3b
- **Temperature**: 0.7 (balanced creativity)
- **API Key**: From environment variable `NVIDIA_API_KEY`
- **Base URL**: https://integrate.api.nvidia.com/v1
- **Max Tokens**: 16,384
- **Special Features**: Reasoning mode enabled for explanations

### Prompt Templates (`utils/prompts.js`)

#### Question Generation Prompt
- **Inputs**: Role, Experience, Topics, Number of Questions
- **Output Format**: JSON array of `{ question, answer }`
- **Constraints**: Plain text answers, no code snippets

#### Explanation Generation Prompt
- **Inputs**: Topic/Question
- **Output Format**: JSON object `{ title, explanation }`
- **Requirements**: Detailed explanation with code examples

---

## File Upload Flow

### Profile Image Upload
```
User → EditProfile → Select Image
                      ↓
              POST /api/auth/upload-image
                      ↓
              Multer middleware processes file
                      ↓
              Save to uploads/ directory
                      ↓
              Return image URL
                      ↓
              Update user profile with image URL
```

---

## Error Handling

### Backend Error Handling
- **Try-Catch Blocks**: All controller functions wrapped
- **Status Codes**: Appropriate HTTP status codes
- **Error Messages**: User-friendly error messages
- **Logging**: Console.error for debugging

### Frontend Error Handling
- **Axios Interceptor**: Catches 401 and 500 errors
- **Helper Function**: `getErrorMessage` extracts error messages
- **Toast Notifications**: User feedback via react-hot-toast
- **Loading States**: Prevent duplicate requests

---

## Development Workflow

### Backend Development
```bash
cd Backend
npm install
npm run dev  # Starts with nodemon on port 8000
```

### Frontend Development
```bash
cd Frontend
npm install
npm run dev  # Starts Vite dev server
```

### Environment Variables
**Backend (.env)**:
```
MONGO_URL=mongodb_connection_string
JWT_SECRET=jwt_secret_key
PORT=8000
NVIDIA_API_KEY=nvidia_nim_api_key
SERVER_URL=optional_server_url_for_keepalive
```

---

## Key Dependencies

### Backend
- `express`: Web framework
- `mongoose`: MongoDB ODM
- `jsonwebtoken`: JWT authentication
- `bcrypt`: Password hashing
- `openai`: NVIDIA NIM API integration
- `express-rate-limit`: Rate limiting
- `multer`: File uploads
- `axios`: HTTP client
- `node-cron`: Job scheduling

### Frontend
- `react`: UI framework
- `react-router-dom`: Routing
- `axios`: HTTP client
- `framer-motion`: Animations
- `tailwindcss`: Styling
- `react-hot-toast`: Notifications
- `react-syntax-highlighter`: Code highlighting
- `react-icons`: Icons

---

## Deployment Considerations

### Backend
- Use environment variables for sensitive data
- Configure CORS for production domain
- Use MongoDB Atlas for cloud database
- Consider Redis for rate limiting in multi-instance deployments
- Implement proper logging (Winston, etc.)

### Frontend
- Build with `npm run build`
- Deploy to Vercel, Netlify, or similar
- Update BASE_URL in production
- Implement proper error boundaries
- Add service worker for PWA capabilities

---

## Future Improvements

1. **Testing**: Add unit and integration tests
2. **Validation**: Add Zod/Joi for request validation
3. **Role-Based Access**: Admin/user roles
4. **API Documentation**: Swagger/OpenAPI
5. **Performance**: Add Redis caching
6. **Security**: httpOnly cookies for tokens
7. **Monitoring**: Add error tracking (Sentry)
8. **CI/CD**: Automated testing and deployment

---

## Summary

PrepAI follows a clean separation of concerns with a RESTful backend and React frontend. The application uses JWT for authentication, MongoDB for data persistence, and Groq AI for intelligent question generation. The frontend implements a component-based architecture with context for state management and protected routes for security. Rate limiting is implemented at multiple levels to ensure stability and cost control.
