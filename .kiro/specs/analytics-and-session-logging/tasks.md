# Implementation Plan: Analytics and Session Logging System

## Overview

This implementation plan breaks down the analytics and session logging system into discrete, testable coding tasks. The system adds performance insights, AI-powered weak topic analysis, and comprehensive session history to an existing AI interview preparation platform. The implementation follows the existing codebase patterns including Express/Node.js backend with MongoDB, React frontend with TailwindCSS and Framer Motion, and maintains the dark brutalist theme.

## Tasks

- [ ] 1. Update database schema and model
  - [ ] 1.1 Extend Session model with analytics fields
    - Add `status` field (enum: "active", "completed") with default "active" and indexing
    - Add `totalDuration` field (Number, milliseconds, min: 0)
    - Add `questionCount` field (Number, non-negative integer with validation)
    - Add `completionDate` field (Date, default null)
    - Add compound indexes: `{ status: 1, createdAt: -1 }` and `{ user: 1, status: 1, createdAt: -1 }`
    - Maintain existing fields for backward compatibility (experince, topicsToFocus)
    - _Requirements: 1.1, 1.2, 1.3, 7.2, 7.3_

  - [ ]* 1.2 Write property tests for session model validation
    - **Property 1: Status Validation** - Verify status only accepts "active" or "completed"
    - **Property 2: Session Initialization** - Verify new sessions default to "active" status
    - **Property 4: Required Field Validation** - Verify required fields are enforced
    - **Property 16: Question Count Type Validation** - Verify questionCount is non-negative integer
    - **Property 21: Positive Duration Validation** - Verify totalDuration is positive when provided
    - **Validates: Requirements 1.2, 1.3, 1.5, 9.1, 9.2_

- [ ] 2. Implement backend session completion endpoint
  - [ ] 2.1 Create session completion controller
    - Implement `completeSession` function in `controllers/sessionController.js`
    - Validate session existence and ownership (403 if unauthorized)
    - Prevent re-completion of already completed sessions (400 error)
    - Calculate totalDuration as (current time - createdAt)
    - Set questionCount from questions array length
    - Update status to "completed" and set completionDate
    - _Requirements: 1.4, 7.1, 7.3_

  - [ ] 2.2 Add session completion route
    - Create PUT route `/api/sessions/complete/:id` in `routes/sessionRoutes.js`
    - Apply `protect` middleware for authentication
    - Wire to `completeSession` controller function
    - _Requirements: 1.4_

  - [ ]* 2.3 Write unit tests for session completion
    - Test successful completion flow
    - Test unauthorized access (different user)
    - Test re-completion prevention
    - Test duration and question count calculation accuracy
    - _Requirements: 1.4, 7.1, 9.1_

  - [ ]* 2.4 Write property tests for session completion
    - **Property 3: Session Completion Metrics** - Verify totalDuration and completionDate are correctly set
    - **Property 15: Duration Calculation Correctness** - Verify duration = endTime - startTime
    - **Property 17: Completion Date Assignment** - Verify completionDate is set on completion
    - **Validates: Requirements 1.4, 7.1, 7.3**

- [ ] 3. Checkpoint - Session completion functionality complete
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 4. Implement Groq AI service for weak topics
  - [ ] 4.1 Create Groq service module
    - Create `services/groqService.js` file
    - Implement `analyzeWeakTopics` function that sends session data to Groq API
    - Use "llama-3.3-70b-versatile" model with temperature 0.7
    - Parse JSON response to extract up to 5 weak topics with topic, reasoning, and priority fields
    - Handle parsing errors by returning empty array
    - Use GROQ_API_KEY from environment variables
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

  - [ ]* 4.2 Write unit tests for Groq service
    - Test successful API call and JSON parsing
    - Test error handling when API fails
    - Test handling of malformed JSON responses
    - Test limiting to 5 topics maximum
    - Mock Groq API calls to avoid external dependencies
    - _Requirements: 4.4_

- [ ] 5. Implement analytics backend controller and routes
  - [ ] 5.1 Create analytics helper functions
    - Implement `calculateWeeklyAggregation` function for last 8 weeks of session counts
    - Implement `calculateDurationTrend` function for weekly average durations
    - Implement `getWeekKey` helper for week identification
    - _Requirements: 8.1, 8.2_

  - [ ]* 5.2 Write property tests for analytics helpers
    - **Property 18: Weekly Aggregation Correctness** - Verify each session counted once in correct week
    - **Property 19: Duration Trend Calculation** - Verify average calculations per time period
    - **Validates: Requirements 8.1, 8.2**

  - [ ] 5.3 Create analytics controller
    - Implement `getAnalytics` function in `controllers/analyticsController.js`
    - Query completed sessions for authenticated user (status="completed")
    - Calculate total sessions count (only completed)
    - Calculate average duration (excluding null/invalid values)
    - Calculate total questions (sum of questionCount across sessions)
    - Calculate completion rate (completed/all sessions × 100)
    - Generate weekly session counts for last 8 weeks
    - Generate duration trend over time
    - Return hasInsufficientData flag when less than 2 sessions
    - _Requirements: 3.1, 3.2, 3.3, 8.1, 8.2, 8.3, 9.3, 9.4, 9.5_

  - [ ] 5.4 Create weak topics controller
    - Implement `getWeakTopics` function in `controllers/analyticsController.js`
    - Fetch last 20 completed sessions with populated questions
    - Call `analyzeWeakTopics` from Groq service
    - Return up to 5 weak topics
    - On error, return empty array with fallback message (don't throw error)
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

  - [ ]* 5.5 Write property tests for analytics calculations
    - **Property 7: Completed Sessions Count** - Verify count equals sessions with status="completed"
    - **Property 8: Average Duration Calculation** - Verify average = sum/count for valid durations
    - **Property 9: Total Questions Summation** - Verify sum of all questionCount values
    - **Property 20: Completion Rate Formula** - Verify (completed/total) × 100
    - **Property 23: Active Session Exclusion** - Verify active sessions excluded from completion stats
    - **Property 24: Invalid Data Exclusion** - Verify null/missing values excluded
    - **Property 25: Average Calculation Data Validation** - Verify only valid numerics used
    - **Validates: Requirements 3.1, 3.2, 3.3, 8.3, 9.3, 9.4, 9.5**

  - [ ] 5.6 Add analytics routes
    - Create `routes/analyticsRoutes.js` file
    - Add GET route `/api/analytics` with protect middleware
    - Add GET route `/api/analytics/weak-topics` with protect middleware
    - Wire routes to controller functions
    - Register router in main server file
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

  - [ ]* 5.7 Write integration tests for analytics endpoints
    - Test GET /api/analytics returns correct structure
    - Test authentication requirement (401 without token)
    - Test weak topics endpoint with and without sessions
    - Test error handling for database failures
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [ ] 6. Add health check endpoint
  - [ ] 6.1 Implement health check route
    - Add GET `/health` endpoint to main server file
    - Return 200 status with service name and timestamp
    - _Requirements: 10.4_

- [ ] 7. Checkpoint - Backend analytics and AI integration complete
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 8. Update API path constants in frontend
  - [ ] 8.1 Extend API_PATH configuration
    - Add `ANALYTICS.GET: '/api/analytics'` to `utils/apiPath.js`
    - Add `ANALYTICS.GET_WEAK_TOPICS: '/api/analytics/weak-topics'` to `utils/apiPath.js`
    - Add `SESSION.GET_MY_SESSIONS: '/api/sessions/my-sessions'` to `utils/apiPath.js`
    - Add `SESSION.COMPLETE: (id) => '/api/sessions/complete/${id}'` to `utils/apiPath.js`
    - _Requirements: 3.5, 5.1_

- [ ] 9. Enhance AppShell navigation
  - [ ] 9.1 Update navigation items array
    - Modify `components/layout/AppShell.jsx` NAV_ITEMS array
    - Add Analytics item with `/analytics` path and FiBarChart2 icon
    - Add Session Logs item with `/sessions` path and FiList icon
    - Ensure order: Dashboard, Analytics, Session Logs, Settings
    - Import required icons from react-icons/fi
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

  - [ ]* 9.2 Write unit tests for navigation
    - Test navigation items render in correct order
    - Test clicking navigation item triggers route change
    - Test active state highlighting matches current route
    - _Requirements: 2.2, 2.3_

- [ ] 10. Create Analytics page component
  - [ ] 10.1 Set up Analytics page structure
    - Create `pages/User/Analytics.jsx` file
    - Import required dependencies (React, Framer Motion, Chart.js, react-chartjs-2, react-icons)
    - Register Chart.js components (CategoryScale, LinearScale, BarElement, LineElement, etc.)
    - Set up state management for analytics, weakTopics, loading states, and errors
    - Implement AppShell wrapper with title "Analytics" and subtitle "Performance Insights"
    - _Requirements: 3.4, 11.1, 11.3_

  - [ ] 10.2 Implement data fetching logic
    - Create `fetchAnalytics` function using axiosInstance
    - Create `fetchWeakTopics` function using axiosInstance
    - Call both functions on component mount using useEffect
    - Implement error handling with toast notifications
    - Implement 10-second timeout handling
    - _Requirements: 3.4, 3.5, 12.1, 12.4, 12.5_

  - [ ] 10.3 Create loading state UI
    - Implement bouncing dots animation for loading indicator
    - Apply dark brutalist theme styling
    - _Requirements: 11.1, 12.4_

  - [ ] 10.4 Create error state UI with retry
    - Display error message with FiAlertCircle icon
    - Add retry button that calls fetchAnalytics again
    - Apply dark brutalist theme styling
    - _Requirements: 12.1_

  - [ ] 10.5 Create insufficient data state UI
    - Check `analytics.hasInsufficientData` flag
    - Display encouraging message to complete more sessions
    - Use FiTrendingUp icon and dark brutalist theme
    - _Requirements: 8.5_

  - [ ] 10.6 Implement metrics cards
    - Create grid layout (4 columns on large screens, responsive)
    - Display Total Sessions with FiCheckCircle icon (from analytics.totalSessions)
    - Display Average Duration with FiClock icon (formatted as hours/minutes)
    - Display Total Questions with FiTrendingUp icon (from analytics.totalQuestions)
    - Display Completion Rate with FiCheckCircle icon (formatted as percentage)
    - Apply Framer Motion staggered animations (delay 0.1-0.4)
    - Use dark brutalist theme with border-neutral-800 and bg-neutral-950
    - _Requirements: 3.4, 11.1, 11.3, 11.4_

  - [ ] 10.7 Implement duration formatting helper
    - Create `formatDuration` function to convert milliseconds to "Xh Ym" format
    - Handle cases where duration is 0 or null
    - _Requirements: 3.2_

  - [ ] 10.8 Create chart configurations
    - Configure weeklySessionsData with Bar chart for last 8 weeks
    - Configure durationTrendData with Line chart for duration trends
    - Set up chartOptions with dark theme colors, grid styling, and tooltips
    - Use monospace fonts and high contrast colors (white on black)
    - _Requirements: 8.1, 8.2, 11.1, 11.4_

  - [ ] 10.9 Implement charts section
    - Create 2-column grid layout for charts
    - Add Weekly Sessions bar chart using weeklySessionsData
    - Add Duration Trend line chart using durationTrendData
    - Apply Framer Motion animations (delay 0.5-0.6)
    - Set chart height to 256px (h-64)
    - _Requirements: 8.1, 8.2, 11.1, 11.4_

  - [ ] 10.10 Implement weak topics section
    - Create section titled "Areas for Improvement"
    - Display "Analyzing..." loading state when loadingWeakTopics is true
    - Show fallback message when weakTopics array is empty
    - Map through weakTopics array to render topic cards
    - Display topic name, priority badge, and reasoning for each
    - Apply priority-based color coding (red/yellow/blue for high/medium/low)
    - Use dark brutalist theme with appropriate borders and backgrounds
    - Apply Framer Motion animation (delay 0.7)
    - _Requirements: 4.3, 4.4, 4.5, 11.1, 11.3_

  - [ ]* 10.11 Write unit tests for Analytics component
    - Test loading state renders correctly
    - Test error state with retry button
    - Test insufficient data state
    - Test metrics cards display correct values
    - Test charts render with data
    - Test weak topics section displays topics
    - Mock axiosInstance calls
    - _Requirements: 3.4, 3.5, 8.5_

- [ ] 11. Create Session Logs page component
  - [ ] 11.1 Set up Session Logs page structure
    - Create `pages/User/SessionLogs.jsx` file
    - Import required dependencies (React, React Router, Framer Motion, react-icons)
    - Set up state for sessions, filteredSessions, loading, statusFilter, and sortBy
    - Implement AppShell wrapper with title "Session Logs" and subtitle "History & Records"
    - _Requirements: 5.1, 11.2, 11.3_

  - [ ] 11.2 Implement data fetching and filtering logic
    - Create `fetchSessions` function using GET_MY_SESSIONS endpoint
    - Call fetchSessions on component mount
    - Create `applyFiltersAndSort` function to handle client-side filtering and sorting
    - Implement status filter logic (all/active/completed)
    - Implement sort logic (newest/oldest/longest/mostQuestions)
    - Use useEffect to re-apply filters when sessions or filter state changes
    - _Requirements: 5.1, 6.1, 6.2, 6.3, 6.4, 6.5_

  - [ ]* 11.3 Write property tests for filtering and sorting
    - **Property 13: Status Filtering** - Verify filter shows only matching sessions
    - **Property 14: Sort Ordering** - Verify sessions ordered by selected criterion
    - **Validates: Requirements 6.2, 6.4**

  - [ ] 11.4 Implement helper functions
    - Create `formatDate` function to format dates as "MMM DD, YYYY"
    - Create `formatDuration` function to convert milliseconds to readable format
    - Create `getStatusColor` function to return color classes based on status
    - _Requirements: 5.2, 5.3_

  - [ ] 11.5 Create loading state UI
    - Implement bouncing dots animation
    - Apply dark brutalist theme styling
    - _Requirements: 11.2, 12.4_

  - [ ] 11.6 Create empty state UI
    - Display when sessions.length is 0
    - Show FiCircle icon with "No Sessions Yet" message
    - Apply dark brutalist theme styling
    - _Requirements: 5.5_

  - [ ] 11.7 Implement filters and sort controls
    - Create filter buttons for "all", "active", "completed" using statusFilter state
    - Create sort dropdown with options: "newest first", "oldest first", "longest duration", "most questions"
    - Display session count badge
    - Use FiFilter and FiArrowDown icons
    - Apply dark brutalist theme with border-neutral-700 and hover effects
    - Persist selections in component state (not localStorage per requirement 6.5)
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

  - [ ] 11.8 Implement session list
    - Map through filteredSessions array to render session cards
    - Display role as title, topics as subtitle
    - Show status badge with FiCheckCircle (completed) or FiCircle (active) icon
    - Display date, duration, question count, and experience in grid layout
    - Apply status-based color coding for badges
    - Make cards clickable to navigate to `/session/:id`
    - Apply Framer Motion staggered animations (delay index × 0.05)
    - Use dark brutalist theme with border-neutral-800 and hover effects
    - _Requirements: 5.2, 5.3, 5.4, 11.2, 11.3, 11.5_

  - [ ]* 11.9 Write unit tests for Session Logs component
    - Test loading state renders
    - Test empty state displays when no sessions
    - Test filters change displayed sessions
    - Test sort options reorder sessions correctly
    - Test clicking session navigates to detail page
    - Mock axiosInstance and React Router
    - _Requirements: 5.1, 5.2, 5.4, 6.2, 6.4_

  - [ ]* 11.10 Write property tests for session display
    - **Property 10: Session Ordering** - Verify default ordering by startTime desc
    - **Property 11: Session Display Completeness** - Verify all fields displayed
    - **Property 12: Session Click Navigation** - Verify navigation on click
    - **Validates: Requirements 5.1, 5.2, 5.4**

- [ ] 12. Add routes for new pages
  - [ ] 12.1 Register Analytics and Session Logs routes
    - Add route for `/analytics` pointing to Analytics component
    - Add route for `/sessions` pointing to SessionLogs component
    - Update routing configuration in main App or routing file
    - _Requirements: 2.2_

  - [ ]* 12.2 Write routing tests
    - Test /analytics route renders Analytics component
    - Test /sessions route renders SessionLogs component
    - Test navigation between routes
    - _Requirements: 2.2_

- [ ] 13. Install frontend dependencies
  - [ ] 13.1 Add Chart.js dependencies
    - Install `chart.js` package (^4.4.0)
    - Install `react-chartjs-2` package (^5.2.0)
    - Verify react-icons is already installed
    - _Requirements: 8.1, 8.2_

- [ ] 14. Update environment configuration
  - [ ] 14.1 Add backend environment variables
    - Add GROQ_API_KEY to .env file (for development)
    - Document required environment variables in README
    - Ensure PORT, MONGODB_URI, JWT_SECRET are already configured
    - _Requirements: 4.1, 10.3_

  - [ ] 14.2 Configure deployment environment
    - Document Render deployment requirements in README
    - List required environment variables for Render: MONGODB_URI, JWT_SECRET, GROQ_API_KEY, NODE_ENV
    - Document health check endpoint at /health
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

- [ ] 15. Checkpoint - Frontend implementation complete
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 16. Create database migration script (optional)
  - [ ] 16.1 Write backfill script for existing sessions
    - Create `scripts/backfillSessionMetrics.js` file
    - Query sessions without status field
    - Set status to "completed" for old sessions
    - Calculate questionCount from questions array length
    - Use updatedAt as proxy for completionDate
    - Calculate totalDuration from createdAt to updatedAt timestamps
    - Log number of backfilled sessions
    - _Requirements: 1.1, 7.1, 7.2, 7.3_

  - [ ]* 16.2 Test migration script
    - Test with mock session data
    - Verify all fields correctly populated
    - Test idempotency (running script multiple times)
    - _Requirements: 1.1_

- [ ] 17. End-to-end integration verification
  - [ ] 17.1 Verify complete session completion flow
    - Manually test creating a session
    - Manually test completing a session via PUT /api/sessions/complete/:id
    - Verify status changes to "completed"
    - Verify totalDuration, questionCount, and completionDate are set
    - _Requirements: 1.3, 1.4, 7.1, 7.2, 7.3_

  - [ ] 17.2 Verify analytics page displays correctly
    - Navigate to /analytics page
    - Verify metrics cards show correct values
    - Verify charts render with data
    - Verify weak topics section loads and displays AI analysis
    - Test with different data scenarios (0 sessions, 1 session, many sessions)
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 4.3, 8.1, 8.2_

  - [ ] 17.3 Verify session logs page functionality
    - Navigate to /sessions page
    - Test status filters (all/active/completed)
    - Test sort options (newest/oldest/longest/mostQuestions)
    - Click session entry and verify navigation to detail page
    - Verify empty state when no sessions
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 6.2, 6.4_

  - [ ] 17.4 Verify navigation and theming
    - Test clicking Analytics and Session Logs in sidebar
    - Verify active state highlighting works correctly
    - Verify dark brutalist theme consistency across all new pages
    - Test responsive layouts at 320px, 768px, 1024px, and 1920px widths
    - _Requirements: 2.1, 2.2, 2.3, 11.1, 11.2, 11.4, 11.5_

  - [ ] 17.5 Verify error handling
    - Test with backend API unavailable (simulate network error)
    - Test with Groq API failure (simulate AI service down)
    - Verify retry functionality on analytics page
    - Verify timeout handling after 10 seconds
    - Verify appropriate error messages display
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5_

- [ ] 18. Final checkpoint - Complete system verification
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional testing tasks and can be skipped for faster MVP delivery
- Each task references specific requirements from the requirements document for traceability
- The implementation uses existing project dependencies where possible (Groq SDK, React Icons, Framer Motion, etc.)
- Backend uses Express with Mongoose for MongoDB, maintaining existing patterns
- Frontend uses React with TailwindCSS and maintains the dark brutalist theme
- All numeric calculations exclude null/invalid values to ensure data accuracy
- Client-side filtering and sorting reduces server load
- Groq AI service failures are handled gracefully with fallback messages
- Property tests validate universal correctness properties across randomized inputs
- Integration tests verify end-to-end request/response cycles
- Health check endpoint enables Render platform monitoring
- Database indexes optimize query performance for analytics and filtering
- Checkpoint tasks ensure incremental validation and user communication

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "8.1", "13.1", "14.1"] },
    { "id": 1, "tasks": ["1.2", "2.1", "4.1", "6.1", "9.1", "14.2"] },
    { "id": 2, "tasks": ["2.2", "2.3", "2.4", "4.2", "5.1", "9.2"] },
    { "id": 3, "tasks": ["5.2", "5.3", "5.4", "10.1", "11.1"] },
    { "id": 4, "tasks": ["5.5", "5.6", "10.2", "10.3", "10.4", "10.5", "11.2"] },
    { "id": 5, "tasks": ["5.7", "10.6", "10.7", "11.3", "11.4"] },
    { "id": 6, "tasks": ["10.8", "10.9", "10.10", "11.5", "11.6", "11.7"] },
    { "id": 7, "tasks": ["10.11", "11.8", "11.9", "11.10"] },
    { "id": 8, "tasks": ["12.1", "12.2"] },
    { "id": 9, "tasks": ["16.1", "16.2"] },
    { "id": 10, "tasks": ["17.1", "17.2", "17.3", "17.4", "17.5"] }
  ]
}
```
