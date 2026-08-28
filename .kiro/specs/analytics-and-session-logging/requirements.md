# Requirements Document

## Introduction

This document defines the requirements for an analytics and session logging system for an AI-powered interview preparation platform. The system provides users with performance insights, weak topic identification using AI analysis, historical session review with detailed topic-based navigation, and enhanced sidebar navigation. The system maintains a unified session model with status tracking and session-level metrics. The frontend connects to a locally-running backend server during development.

## Glossary

- **Session**: A single interview preparation interaction with a defined topic (e.g., "Full stack developer"), experience level, start time, and completion status
- **Analytics_Engine**: The component responsible for calculating performance metrics and aggregating session data
- **Weak_Topics_Analyzer**: The AI-powered component using Groq API that analyzes user responses to identify areas needing improvement
- **Sessions_List_View**: The component that displays all historical session records in a list format with filtering and sorting capabilities
- **Session_Detail_View**: The component that displays a single session's content organized by topic tabs with questions, explanations, and code examples
- **Topic_Tab**: A horizontal navigation element within Session_Detail_View representing a subject area (e.g., Frontend, Backend, Database design)
- **Question_Card**: A display component showing a question with sub-tabs for Explanation and Code example, plus pin and note actions
- **AppShell**: The main application layout component containing the navigation sidebar
- **Session_Status**: An enumeration with values "active" or "completed" indicating the current state of a session
- **Session_Metrics**: Quantitative measurements including total time, question count, and completion date
- **Navigation_Item**: A clickable element in the sidebar that routes to different pages (Dashboard, Sessions, Session logs, Analytics)
- **Backend_API**: The Node.js/Express server running locally on port 5000 handling data persistence and business logic
- **Database**: The MongoDB instance storing session data and user information
- **Groq_Service**: The external AI service providing natural language analysis capabilities
- **BASE_URL**: The frontend configuration constant pointing to the backend API endpoint (http://localhost:5000)

## Requirements

### Requirement 1: Unified Session Model

**User Story:** As a developer, I want a consistent session data structure throughout the application, so that data integrity is maintained across all components.

#### Acceptance Criteria

1. THE Database SHALL store sessions with fields: topic (string), experienceLevel (string), startTime, endTime, status, questionCount, totalDuration, and questions (array)
2. THE Database SHALL store each question with fields: text, topic (string), explanation, codeExample, isPinned (boolean), and userNotes (string)
3. THE Backend_API SHALL validate that status field contains only "active" or "completed" values
4. WHEN a session is created, THE Backend_API SHALL set status to "active"
5. WHEN a session is ended, THE Backend_API SHALL set status to "completed" and calculate totalDuration
6. THE Backend_API SHALL reject session updates that omit required fields

### Requirement 2: Navigation Sidebar Structure

**User Story:** As a user, I want to access Dashboard, Sessions, Session logs, and Analytics from the sidebar, so that I can navigate efficiently between application features.

#### Acceptance Criteria

1. THE AppShell SHALL display four Navigation_Items with icons and labels in this exact order: 🏠 Dashboard, ≡ Sessions, 🔄 Session logs, 📊 Analytics
2. WHEN a Navigation_Item is clicked, THE AppShell SHALL route to the corresponding page
3. THE AppShell SHALL highlight the active Navigation_Item based on current route
4. THE AppShell SHALL maintain the dark brutalist theme for all Navigation_Items
5. THE AppShell SHALL display the 🏠 icon for Dashboard, ≡ icon for Sessions, 🔄 icon for Session logs, and 📊 icon for Analytics

### Requirement 3: Analytics Page Display

**User Story:** As a user, I want to view my performance analytics and weak topics, so that I can understand my progress and areas for improvement.

#### Acceptance Criteria

1. THE Analytics_Engine SHALL calculate total sessions completed from Database records with status "completed"
2. THE Analytics_Engine SHALL calculate average session duration from completed sessions
3. THE Analytics_Engine SHALL calculate total questions answered by summing questionCount across all completed sessions
4. THE Analytics_Engine SHALL display metrics for total sessions, average duration, and total questions
5. WHEN the Analytics page loads, THE Weak_Topics_Analyzer SHALL analyze user performance and display weak topics

### Requirement 4: AI-Powered Weak Topics Analysis

**User Story:** As a user, I want AI to identify my weak topics based on my responses, so that I can focus my study efforts effectively.

#### Acceptance Criteria

1. THE Weak_Topics_Analyzer SHALL send session data to Groq_Service for analysis
2. THE Weak_Topics_Analyzer SHALL receive topic recommendations from Groq_Service
3. THE Weak_Topics_Analyzer SHALL display up to 5 weak topics with explanations
4. IF Groq_Service is unavailable, THEN THE Weak_Topics_Analyzer SHALL display a fallback message indicating analysis is temporarily unavailable
5. THE Weak_Topics_Analyzer SHALL refresh analysis when new sessions are completed

### Requirement 5: Sessions List View Display

**User Story:** As a user, I want to view all my interview sessions in a list, so that I can see my preparation history at a glance and select sessions to review.

#### Acceptance Criteria

1. THE Sessions_List_View SHALL retrieve all sessions from Database ordered by startTime descending
2. THE Sessions_List_View SHALL display session topic, date, duration, and question count for each session
3. THE Sessions_List_View SHALL indicate session status using visual styling for "active" and "completed" states
4. WHEN a session entry is clicked, THE Sessions_List_View SHALL navigate to Session_Detail_View for that session
5. THE Sessions_List_View SHALL display a message when no sessions exist

### Requirement 6: Session Filtering and Sorting

**User Story:** As a user, I want to filter and sort my session list, so that I can find specific sessions quickly.

#### Acceptance Criteria

1. THE Sessions_List_View SHALL provide filter options for status: "all", "active", "completed"
2. WHEN a filter is selected, THE Sessions_List_View SHALL display only sessions matching the selected status
3. THE Sessions_List_View SHALL provide sort options: "newest first", "oldest first", "longest duration", "most questions"
4. WHEN a sort option is selected, THE Sessions_List_View SHALL reorder the displayed sessions accordingly
5. THE Sessions_List_View SHALL persist filter and sort selections during the user session

### Requirement 6.5: Session Detail View with Topic Tabs

**User Story:** As a user, I want to view a session's questions organized by topic tabs, so that I can navigate through different subject areas efficiently.

#### Acceptance Criteria

1. THE Session_Detail_View SHALL display the session title (e.g., "Full stack developer") at the top
2. THE Session_Detail_View SHALL display horizontal Topic_Tabs representing subject areas (e.g., Frontend, Backend, Database design, API integration, Auth)
3. THE Session_Detail_View SHALL display experience level and total question count (e.g., "Experience: fresher" and "10 Q&A")
4. WHEN a Topic_Tab is clicked, THE Session_Detail_View SHALL display questions associated with that topic
5. THE Session_Detail_View SHALL group all questions by their respective Topic_Tabs

### Requirement 6.6: Question Display with Sub-tabs and Actions

**User Story:** As a user, I want to view question details with explanations and code examples, so that I can learn comprehensively from each question.

#### Acceptance Criteria

1. THE Question_Card SHALL display the question text prominently
2. THE Question_Card SHALL provide two sub-tabs: "Explanation" and "Code example"
3. WHEN the "Explanation" sub-tab is selected, THE Question_Card SHALL display the explanation content
4. WHEN the "Code example" sub-tab is selected, THE Question_Card SHALL display the code example with syntax highlighting
5. THE Question_Card SHALL provide "Pin" and "Add note" action buttons for each question

### Requirement 7: Session Metrics Storage

**User Story:** As a system, I want to store session-level metrics efficiently, so that analytics can be computed without complex aggregations.

#### Acceptance Criteria

1. WHEN a session is completed, THE Backend_API SHALL calculate totalDuration as the difference between endTime and startTime
2. THE Backend_API SHALL store questionCount as an integer representing total questions in the session
3. THE Backend_API SHALL store completionDate when status changes to "completed"
4. THE Database SHALL index sessions by status and startTime for efficient queries
5. THE Backend_API SHALL return session metrics in API responses without additional computation

### Requirement 8: Progress Tracking Visualization

**User Story:** As a user, I want visual representations of my progress over time, so that I can see improvement trends.

#### Acceptance Criteria

1. THE Analytics_Engine SHALL generate a chart showing sessions completed per week for the last 8 weeks
2. THE Analytics_Engine SHALL generate a chart showing average session duration trend over time
3. THE Analytics_Engine SHALL calculate completion rate as percentage of completed sessions versus total sessions
4. THE Analytics_Engine SHALL display progress metrics using the dark brutalist theme color palette
5. WHEN insufficient data exists (fewer than 2 sessions), THE Analytics_Engine SHALL display a message encouraging more practice

### Requirement 9: Performance Metrics Accuracy

**User Story:** As a user, I want accurate performance metrics, so that I can trust the analytics provided.

#### Acceptance Criteria

1. THE Backend_API SHALL validate that totalDuration is a positive number before storing
2. THE Backend_API SHALL validate that questionCount is a non-negative integer before storing
3. THE Analytics_Engine SHALL exclude sessions with status "active" from completion statistics
4. THE Analytics_Engine SHALL handle sessions with missing or null values by excluding them from calculations
5. WHEN calculating averages, THE Analytics_Engine SHALL use only sessions with valid numeric values

### Requirement 10: Local Backend Development Setup

**User Story:** As a developer, I want to run the backend locally from the Backend folder, so that I can develop and test the application in my local environment.

#### Acceptance Criteria

1. THE Backend_API SHALL run locally on port 5000
2. THE Frontend SHALL configure BASE_URL as "http://localhost:5000" for API requests
3. THE Backend_API SHALL connect to MongoDB using environment variables for connection strings
4. THE Backend_API SHALL connect to Groq_Service using environment variables for API keys
5. THE Backend_API SHALL respond to health check requests at /health endpoint

### Requirement 11: Responsive Design Consistency

**User Story:** As a user, I want the Analytics, Sessions, and Session Detail pages to match the application's visual style, so that the interface feels cohesive.

#### Acceptance Criteria

1. THE Analytics_Engine SHALL render content using the dark brutalist theme with high contrast
2. THE Sessions_List_View SHALL render content using the dark brutalist theme with high contrast
3. THE Session_Detail_View SHALL render content using the dark brutalist theme with high contrast
4. THE AppShell SHALL maintain consistent spacing and typography across all pages
5. THE Analytics_Engine, Sessions_List_View, and Session_Detail_View SHALL use responsive layouts that adapt to screen sizes from 320px to 1920px width

### Requirement 12: Error Handling and User Feedback

**User Story:** As a user, I want clear feedback when errors occur, so that I understand what went wrong and what to do next.

#### Acceptance Criteria

1. IF Backend_API requests fail, THEN THE application SHALL display an error message with retry option
2. IF Database connection is lost, THEN THE Backend_API SHALL return a 503 status code with error details
3. IF Groq_Service analysis fails, THEN THE Weak_Topics_Analyzer SHALL display cached results if available
4. THE application SHALL display loading indicators while fetching analytics or session data
5. WHEN network requests exceed 10 seconds, THE application SHALL display a timeout message
