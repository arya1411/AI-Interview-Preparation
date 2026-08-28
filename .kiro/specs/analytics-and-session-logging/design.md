# Design Document: Analytics and Session Logging System

## Overview

This document outlines the design for an analytics and session logging system for an AI-powered interview preparation platform. The system provides users with performance insights through computed metrics, AI-powered weak topic analysis via Groq API, and comprehensive historical session review capabilities with filtering and sorting. The design maintains consistency with existing codebase patterns including React Router, Framer Motion animations, AppShell layout, dark brutalist theming, Express backend routes, and Mongoose MongoDB models.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Frontend (React)                        │
│  ┌────────────┐  ┌─────────────┐  ┌──────────────────┐     │
│  │  AppShell  │  │  Analytics  │  │  Session Logs    │     │
│  │ (Enhanced) │  │    Page     │  │      Page        │     │
│  └─────┬──────┘  └──────┬──────┘  └────────┬─────────┘     │
│        │                │                   │                │
└────────┼────────────────┼───────────────────┼────────────────┘
         │                │                   │
         │         ┌──────▼───────────────────▼──────┐
         │         │    API Client (Axios)            │
         │         └──────┬───────────────────────────┘
         │                │
         │                │ HTTPS
         │                │
┌────────┼────────────────▼───────────────────────────────────┐
│        │           Backend (Express/Node.js)                 │
│        │                                                     │
│  ┌─────▼──────────┐  ┌──────────────┐  ┌──────────────┐   │
│  │   Session      │  │  Analytics   │  │  Groq API    │   │
│  │  Controller    │  │  Controller  │  │   Service    │   │
│  └────────┬───────┘  └──────┬───────┘  └──────┬───────┘   │
│           │                  │                  │           │
│  ┌────────▼──────────────────▼──────────────────▼────────┐ │
│  │              Session Model (Mongoose)                  │ │
│  └────────┬───────────────────────────────────────────────┘ │
└───────────┼─────────────────────────────────────────────────┘
            │
     ┌──────▼──────┐
     │   MongoDB   │
     │  Database   │
     └─────────────┘
```

### Component Breakdown

#### 1. Database Layer

**Updated Session Model Schema**

```javascript
const sessionSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    role: { type: String, required: true },
    experince: { type: String, required: true }, // Maintaining existing field name for compatibility
    topicsToFocus: { type: String, required: true },
    description: String,
    questions: [{ type: mongoose.Schema.Types.ObjectId, ref: "Question" }],
    
    // New fields for analytics and logging
    status: { 
        type: String, 
        enum: ["active", "completed"], 
        default: "active",
        required: true,
        index: true // Index for efficient filtering
    },
    totalDuration: { 
        type: Number, // Duration in milliseconds
        min: 0,
        default: null
    },
    questionCount: { 
        type: Number,
        min: 0,
        default: 0,
        validate: {
            validator: Number.isInteger,
            message: 'questionCount must be an integer'
        }
    },
    completionDate: { 
        type: Date,
        default: null
    }
}, { 
    timestamps: true // Provides createdAt and updatedAt
});

// Compound index for efficient queries
sessionSchema.index({ status: 1, createdAt: -1 });
sessionSchema.index({ user: 1, status: 1, createdAt: -1 });
```

**Design Rationale:**
- `status` field uses enum validation to ensure only "active" or "completed" values
- `totalDuration` stored as milliseconds for precision and ease of calculation
- `questionCount` cached at session level to avoid repeated queries to Question collection
- `completionDate` stored separately from `updatedAt` for analytics accuracy
- Indexes on `status` and `createdAt` optimize filtering and sorting operations
- Maintains existing field names (`experince`, `topicsToFocus`) for backward compatibility

#### 2. Backend API Layer

**New Route: `/api/sessions/complete/:id` (PUT)**

Handles session completion with automatic metric calculation.

```javascript
// routes/sessionRoutes.js
router.put('/complete/:id', protect, completeSession);
```

**Controller Implementation:**

```javascript
// controllers/sessionController.js
exports.completeSession = async (req, res) => {
    try {
        const session = await Session.findById(req.params.id);
        
        if (!session) {
            return res.status(404).json({ 
                success: false, 
                message: "Session not found" 
            });
        }
        
        // Authorization check
        if (session.user.toString() !== req.user.id) {
            return res.status(403).json({ 
                success: false, 
                message: "Not authorized to complete this session" 
            });
        }
        
        // Prevent re-completion
        if (session.status === "completed") {
            return res.status(400).json({ 
                success: false, 
                message: "Session already completed" 
            });
        }
        
        // Calculate metrics
        const now = new Date();
        const startTime = session.createdAt;
        const totalDuration = now.getTime() - startTime.getTime();
        
        // Get actual question count from questions array
        const questionCount = session.questions.length;
        
        // Update session
        session.status = "completed";
        session.totalDuration = totalDuration;
        session.questionCount = questionCount;
        session.completionDate = now;
        
        await session.save();
        
        return res.status(200).json({ 
            success: true, 
            session 
        });
        
    } catch (error) {
        return res.status(500).json({ 
            success: false, 
            message: "Server error", 
            error: error.message 
        });
    }
};
```

**New Route: `/api/analytics` (GET)**

Returns aggregated analytics for the authenticated user.

```javascript
// routes/analyticsRoutes.js
const express = require('express');
const { getAnalytics, getWeakTopics } = require('../controllers/analyticsController');
const { protect } = require('../middlewares/authMiddleware');

const router = express.Router();

router.get('/', protect, getAnalytics);
router.get('/weak-topics', protect, getWeakTopics);

module.exports = router;
```

**Analytics Controller Implementation:**

```javascript
// controllers/analyticsController.js
const Session = require('../models/Session');
const { analyzeWeakTopics } = require('../services/groqService');

exports.getAnalytics = async (req, res) => {
    try {
        const userId = req.user._id;
        
        // Fetch all completed sessions for the user
        const completedSessions = await Session.find({ 
            user: userId, 
            status: "completed",
            totalDuration: { $ne: null, $gt: 0 },
            questionCount: { $ne: null, $gte: 0 }
        }).select('totalDuration questionCount createdAt completionDate');
        
        // Calculate metrics
        const totalSessions = completedSessions.length;
        
        // Calculate average duration (only from valid durations)
        const validDurations = completedSessions
            .map(s => s.totalDuration)
            .filter(d => typeof d === 'number' && d > 0);
        
        const averageDuration = validDurations.length > 0
            ? validDurations.reduce((sum, d) => sum + d, 0) / validDurations.length
            : 0;
        
        // Calculate total questions
        const totalQuestions = completedSessions
            .map(s => s.questionCount)
            .filter(q => typeof q === 'number' && q >= 0)
            .reduce((sum, q) => sum + q, 0);
        
        // Calculate completion rate (completed vs all sessions)
        const allSessions = await Session.countDocuments({ user: userId });
        const completionRate = allSessions > 0 
            ? (totalSessions / allSessions) * 100 
            : 0;
        
        // Weekly session counts for last 8 weeks
        const eightWeeksAgo = new Date();
        eightWeeksAgo.setDate(eightWeeksAgo.getDate() - 56);
        
        const recentSessions = await Session.find({
            user: userId,
            status: "completed",
            completionDate: { $gte: eightWeeksAgo }
        }).select('completionDate').lean();
        
        const weeklyData = calculateWeeklyAggregation(recentSessions);
        
        // Duration trend over time
        const durationTrend = calculateDurationTrend(completedSessions);
        
        return res.status(200).json({
            success: true,
            analytics: {
                totalSessions,
                averageDuration,
                totalQuestions,
                completionRate,
                weeklyData,
                durationTrend,
                hasInsufficientData: totalSessions < 2
            }
        });
        
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to calculate analytics",
            error: error.message
        });
    }
};

// Helper function for weekly aggregation
function calculateWeeklyAggregation(sessions) {
    const weeks = Array(8).fill(0).map((_, i) => {
        const weekStart = new Date();
        weekStart.setDate(weekStart.getDate() - (7 * (7 - i)));
        weekStart.setHours(0, 0, 0, 0);
        return { weekStart, count: 0 };
    });
    
    sessions.forEach(session => {
        const sessionDate = new Date(session.completionDate);
        for (let i = 0; i < weeks.length; i++) {
            const weekStart = weeks[i].weekStart;
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekEnd.getDate() + 7);
            
            if (sessionDate >= weekStart && sessionDate < weekEnd) {
                weeks[i].count++;
                break;
            }
        }
    });
    
    return weeks.map(w => ({
        week: w.weekStart.toISOString().split('T')[0],
        sessions: w.count
    }));
}

// Helper function for duration trend
function calculateDurationTrend(sessions) {
    if (sessions.length === 0) return [];
    
    // Sort by completion date
    const sorted = [...sessions].sort((a, b) => 
        new Date(a.completionDate) - new Date(b.completionDate)
    );
    
    // Group by week and calculate average
    const weeklyAverages = {};
    sorted.forEach(session => {
        const weekKey = getWeekKey(session.completionDate);
        if (!weeklyAverages[weekKey]) {
            weeklyAverages[weekKey] = { sum: 0, count: 0 };
        }
        weeklyAverages[weekKey].sum += session.totalDuration;
        weeklyAverages[weekKey].count++;
    });
    
    return Object.entries(weeklyAverages).map(([week, data]) => ({
        week,
        averageDuration: data.sum / data.count
    }));
}

function getWeekKey(date) {
    const d = new Date(date);
    const firstDayOfYear = new Date(d.getFullYear(), 0, 1);
    const pastDaysOfYear = (d - firstDayOfYear) / 86400000;
    const weekNumber = Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
    return `${d.getFullYear()}-W${weekNumber}`;
}

exports.getWeakTopics = async (req, res) => {
    try {
        const userId = req.user._id;
        
        // Fetch recent sessions with questions
        const sessions = await Session.find({ 
            user: userId, 
            status: "completed" 
        })
        .populate('questions')
        .sort({ completionDate: -1 })
        .limit(20) // Analyze last 20 sessions
        .lean();
        
        if (sessions.length === 0) {
            return res.status(200).json({
                success: true,
                weakTopics: [],
                message: "No completed sessions available for analysis"
            });
        }
        
        // Call Groq service for analysis
        const weakTopics = await analyzeWeakTopics(sessions);
        
        return res.status(200).json({
            success: true,
            weakTopics: weakTopics.slice(0, 5) // Limit to 5 topics
        });
        
    } catch (error) {
        // Return cached or empty on failure
        return res.status(200).json({
            success: true,
            weakTopics: [],
            message: "Analysis temporarily unavailable",
            error: error.message
        });
    }
};
```

**Groq Service Implementation:**

```javascript
// services/groqService.js
const Groq = require('groq-sdk');

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY
});

exports.analyzeWeakTopics = async (sessions) => {
    try {
        // Prepare session data for analysis
        const sessionSummary = sessions.map(session => ({
            topic: session.topicsToFocus,
            role: session.role,
            experience: session.experince,
            questionCount: session.questionCount,
            questions: session.questions.map(q => ({
                question: q.question,
                answer: q.answer
            }))
        }));
        
        const prompt = `Analyze the following interview preparation sessions and identify the top weak areas where the user needs improvement. Consider the topics covered, the complexity of questions, and patterns across sessions.

Sessions data:
${JSON.stringify(sessionSummary, null, 2)}

Provide a JSON array of up to 5 weak topics, each with:
- topic: string (the weak area)
- reasoning: string (brief explanation of why this is a weak area)
- priority: string (high/medium/low)

Format: Return only valid JSON array, no additional text.`;
        
        const chatCompletion = await groq.chat.completions.create({
            messages: [
                {
                    role: "system",
                    content: "You are an expert interview coach analyzing performance patterns. Provide concise, actionable insights."
                },
                {
                    role: "user",
                    content: prompt
                }
            ],
            model: "llama-3.3-70b-versatile",
            temperature: 0.7,
            max_tokens: 1024
        });
        
        const responseText = chatCompletion.choices[0]?.message?.content || '[]';
        
        // Parse JSON response
        let weakTopics;
        try {
            weakTopics = JSON.parse(responseText);
        } catch {
            // If parsing fails, return empty array
            weakTopics = [];
        }
        
        return Array.isArray(weakTopics) ? weakTopics : [];
        
    } catch (error) {
        console.error('Groq API error:', error);
        throw new Error('Failed to analyze weak topics');
    }
};
```

**Health Check Endpoint:**

```javascript
// server.js (add to existing file)
app.get('/health', (req, res) => {
    res.status(200).json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        service: 'AI Interview Preparation API'
    });
});
```

#### 3. Frontend Layer

**Enhanced AppShell Component**

Update the navigation items array to include Analytics and Session Logs:

```javascript
// components/layout/AppShell.jsx
const NAV_ITEMS = [
  { label: 'Dashboard', path: '/dashboard', icon: FiHome },
  { label: 'Analytics', path: '/analytics', icon: FiBarChart2 },
  { label: 'Session Logs', path: '/sessions', icon: FiList },
  { label: 'Settings', path: '/settings', icon: FiSettings },
]
```

No other changes needed to AppShell - the existing logic already handles dynamic navigation rendering, active state highlighting, and maintains the dark brutalist theme.

**Analytics Page Component**

```javascript
// pages/User/Analytics.jsx
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { FiTrendingUp, FiClock, FiCheckCircle, FiAlertCircle } from 'react-icons/fi'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js'
import { Bar, Line } from 'react-chartjs-2'
import axiosInstance from '../../utils/axiosInstance'
import { API_PATH } from '../../utils/apiPath'
import AppShell from '../../components/layout/AppShell'
import { getErrorMessage } from '../../utils/helper'
import { notifyError } from '../../utils/toast'

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  Filler
)

const Analytics = () => {
  const [analytics, setAnalytics] = useState(null)
  const [weakTopics, setWeakTopics] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingWeakTopics, setLoadingWeakTopics] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchAnalytics()
    fetchWeakTopics()
  }, [])

  const fetchAnalytics = async () => {
    try {
      setLoading(true)
      const { data } = await axiosInstance.get(API_PATH.ANALYTICS.GET)
      setAnalytics(data.analytics)
      setError(null)
    } catch (err) {
      const message = getErrorMessage(err, 'Failed to load analytics')
      setError(message)
      notifyError(message)
    } finally {
      setLoading(false)
    }
  }

  const fetchWeakTopics = async () => {
    try {
      setLoadingWeakTopics(true)
      const { data } = await axiosInstance.get(API_PATH.ANALYTICS.GET_WEAK_TOPICS)
      setWeakTopics(data.weakTopics || [])
    } catch (err) {
      console.error('Failed to load weak topics:', err)
      setWeakTopics([])
    } finally {
      setLoadingWeakTopics(false)
    }
  }

  const formatDuration = (ms) => {
    if (!ms) return '0m'
    const minutes = Math.floor(ms / 60000)
    const hours = Math.floor(minutes / 60)
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`
    }
    return `${minutes}m`
  }

  if (loading) {
    return (
      <AppShell title="Analytics" subtitle="Performance Insights">
        <div className="flex items-center justify-center py-20">
          <div className="flex items-center gap-3">
            <div className="h-2 w-2 animate-bounce rounded-full bg-neutral-500" style={{ animationDelay: '0ms' }} />
            <div className="h-2 w-2 animate-bounce rounded-full bg-neutral-500" style={{ animationDelay: '150ms' }} />
            <div className="h-2 w-2 animate-bounce rounded-full bg-neutral-500" style={{ animationDelay: '300ms' }} />
            <p className="text-xs font-bold uppercase tracking-widest text-neutral-500">Loading...</p>
          </div>
        </div>
      </AppShell>
    )
  }

  if (error) {
    return (
      <AppShell title="Analytics" subtitle="Performance Insights">
        <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-8 text-center">
          <FiAlertCircle className="mx-auto mb-4 text-neutral-500" size={32} />
          <p className="text-sm font-bold uppercase tracking-wider text-neutral-400">{error}</p>
          <button
            onClick={fetchAnalytics}
            className="mt-6 border border-neutral-700 px-6 py-2 text-xs font-bold uppercase tracking-widest text-neutral-300 transition hover:border-white hover:text-white"
          >
            Retry
          </button>
        </div>
      </AppShell>
    )
  }

  if (analytics?.hasInsufficientData) {
    return (
      <AppShell title="Analytics" subtitle="Performance Insights">
        <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-12 text-center">
          <FiTrendingUp className="mx-auto mb-6 text-neutral-700" size={48} />
          <h3 className="mb-3 text-xl font-extrabold uppercase tracking-wider text-white">
            Keep Practicing
          </h3>
          <p className="text-sm font-medium leading-relaxed text-neutral-400">
            Complete at least 2 interview sessions to unlock detailed analytics and insights.
          </p>
        </div>
      </AppShell>
    )
  }

  // Chart configurations
  const weeklySessionsData = {
    labels: analytics.weeklyData.map(w => w.week),
    datasets: [
      {
        label: 'Sessions Completed',
        data: analytics.weeklyData.map(w => w.sessions),
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        borderColor: 'rgba(255, 255, 255, 1)',
        borderWidth: 2,
      }
    ]
  }

  const durationTrendData = {
    labels: analytics.durationTrend.map(d => d.week),
    datasets: [
      {
        label: 'Avg Duration',
        data: analytics.durationTrend.map(d => d.averageDuration / 60000), // Convert to minutes
        borderColor: 'rgba(255, 255, 255, 0.9)',
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 2,
        fill: true,
        tension: 0.3,
      }
    ]
  }

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        titleColor: 'rgba(255, 255, 255, 1)',
        bodyColor: 'rgba(255, 255, 255, 0.8)',
        borderColor: 'rgba(255, 255, 255, 0.2)',
        borderWidth: 1,
        padding: 12,
        displayColors: false,
        titleFont: {
          size: 11,
          weight: 'bold',
          family: 'monospace'
        },
        bodyFont: {
          size: 11,
          family: 'monospace'
        }
      }
    },
    scales: {
      x: {
        grid: {
          color: 'rgba(255, 255, 255, 0.05)',
          borderColor: 'rgba(255, 255, 255, 0.1)'
        },
        ticks: {
          color: 'rgba(255, 255, 255, 0.5)',
          font: {
            size: 9,
            weight: 'bold',
            family: 'monospace'
          }
        }
      },
      y: {
        grid: {
          color: 'rgba(255, 255, 255, 0.05)',
          borderColor: 'rgba(255, 255, 255, 0.1)'
        },
        ticks: {
          color: 'rgba(255, 255, 255, 0.5)',
          font: {
            size: 9,
            weight: 'bold',
            family: 'monospace'
          }
        }
      }
    }
  }

  const getPriorityColor = (priority) => {
    switch (priority?.toLowerCase()) {
      case 'high':
        return 'border-red-500/50 bg-red-950/30'
      case 'medium':
        return 'border-yellow-500/50 bg-yellow-950/30'
      case 'low':
        return 'border-blue-500/50 bg-blue-950/30'
      default:
        return 'border-neutral-700 bg-neutral-900/30'
    }
  }

  return (
    <AppShell title="Analytics" subtitle="Performance Insights">
      {/* Metrics Cards */}
      <div className="mb-10 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-xl border border-neutral-800 bg-neutral-950 p-6"
        >
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[9px] font-bold uppercase tracking-widest text-neutral-500">
              Total Sessions
            </p>
            <FiCheckCircle className="text-neutral-700" size={16} />
          </div>
          <p className="text-3xl font-extrabold text-white">{analytics.totalSessions}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-xl border border-neutral-800 bg-neutral-950 p-6"
        >
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[9px] font-bold uppercase tracking-widest text-neutral-500">
              Avg Duration
            </p>
            <FiClock className="text-neutral-700" size={16} />
          </div>
          <p className="text-3xl font-extrabold text-white">
            {formatDuration(analytics.averageDuration)}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="rounded-xl border border-neutral-800 bg-neutral-950 p-6"
        >
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[9px] font-bold uppercase tracking-widest text-neutral-500">
              Total Questions
            </p>
            <FiTrendingUp className="text-neutral-700" size={16} />
          </div>
          <p className="text-3xl font-extrabold text-white">{analytics.totalQuestions}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="rounded-xl border border-neutral-800 bg-neutral-950 p-6"
        >
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[9px] font-bold uppercase tracking-widest text-neutral-500">
              Completion Rate
            </p>
            <FiCheckCircle className="text-neutral-700" size={16} />
          </div>
          <p className="text-3xl font-extrabold text-white">
            {analytics.completionRate.toFixed(1)}%
          </p>
        </motion.div>
      </div>

      {/* Charts */}
      <div className="mb-10 grid gap-6 lg:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="rounded-xl border border-neutral-800 bg-neutral-950 p-6"
        >
          <h3 className="mb-6 text-xs font-bold uppercase tracking-widest text-white">
            Weekly Sessions
          </h3>
          <div className="h-64">
            <Bar data={weeklySessionsData} options={chartOptions} />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="rounded-xl border border-neutral-800 bg-neutral-950 p-6"
        >
          <h3 className="mb-6 text-xs font-bold uppercase tracking-widest text-white">
            Duration Trend
          </h3>
          <div className="h-64">
            <Line data={durationTrendData} options={chartOptions} />
          </div>
        </motion.div>
      </div>

      {/* Weak Topics */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
        className="rounded-xl border border-neutral-800 bg-neutral-950 p-6"
      >
        <div className="mb-6 flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-widest text-white">
            Areas for Improvement
          </h3>
          {loadingWeakTopics && (
            <div className="flex items-center gap-2">
              <div className="h-1 w-1 animate-bounce rounded-full bg-neutral-500" />
              <p className="text-[9px] font-bold uppercase tracking-widest text-neutral-500">
                Analyzing...
              </p>
            </div>
          )}
        </div>

        {!loadingWeakTopics && weakTopics.length === 0 && (
          <p className="text-center text-sm font-medium text-neutral-500">
            Analysis temporarily unavailable or no weak topics identified
          </p>
        )}

        {!loadingWeakTopics && weakTopics.length > 0 && (
          <div className="space-y-4">
            {weakTopics.map((topic, index) => (
              <div
                key={index}
                className={`rounded-lg border p-5 ${getPriorityColor(topic.priority)}`}
              >
                <div className="mb-2 flex items-start justify-between">
                  <h4 className="text-sm font-bold uppercase tracking-wide text-white">
                    {topic.topic}
                  </h4>
                  <span className="rounded border border-neutral-700 bg-neutral-900 px-2 py-1 text-[8px] font-bold uppercase tracking-wider text-neutral-400">
                    {topic.priority}
                  </span>
                </div>
                <p className="text-xs font-medium leading-relaxed text-neutral-300">
                  {topic.reasoning}
                </p>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </AppShell>
  )
}

export default Analytics
```

**Session Logs Page Component**

```javascript
// pages/User/SessionLogs.jsx
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { FiClock, FiCheckCircle, FiCircle, FiFilter, FiArrowDown } from 'react-icons/fi'
import axiosInstance from '../../utils/axiosInstance'
import { API_PATH } from '../../utils/apiPath'
import AppShell from '../../components/layout/AppShell'
import { getErrorMessage } from '../../utils/helper'
import { notifyError } from '../../utils/toast'

const SessionLogs = () => {
  const navigate = useNavigate()
  const [sessions, setSessions] = useState([])
  const [filteredSessions, setFilteredSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')
  const [sortBy, setSortBy] = useState('newest')

  useEffect(() => {
    fetchSessions()
  }, [])

  useEffect(() => {
    applyFiltersAndSort()
  }, [sessions, statusFilter, sortBy])

  const fetchSessions = async () => {
    try {
      setLoading(true)
      const { data } = await axiosInstance.get(API_PATH.SESSION.GET_MY_SESSIONS)
      setSessions(data.sessions || [])
    } catch (err) {
      notifyError(getErrorMessage(err, 'Failed to load sessions'))
    } finally {
      setLoading(false)
    }
  }

  const applyFiltersAndSort = () => {
    let result = [...sessions]

    // Apply status filter
    if (statusFilter !== 'all') {
      result = result.filter(s => s.status === statusFilter)
    }

    // Apply sorting
    switch (sortBy) {
      case 'newest':
        result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        break
      case 'oldest':
        result.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
        break
      case 'longest':
        result.sort((a, b) => (b.totalDuration || 0) - (a.totalDuration || 0))
        break
      case 'mostQuestions':
        result.sort((a, b) => (b.questionCount || 0) - (a.questionCount || 0))
        break
      default:
        break
    }

    setFilteredSessions(result)
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    })
  }

  const formatDuration = (ms) => {
    if (!ms) return '—'
    const minutes = Math.floor(ms / 60000)
    const hours = Math.floor(minutes / 60)
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`
    }
    return `${minutes}m`
  }

  const getStatusColor = (status) => {
    return status === 'completed' 
      ? 'border-green-500/50 bg-green-950/30 text-green-400' 
      : 'border-yellow-500/50 bg-yellow-950/30 text-yellow-400'
  }

  if (loading) {
    return (
      <AppShell title="Session Logs" subtitle="History & Records">
        <div className="flex items-center justify-center py-20">
          <div className="flex items-center gap-3">
            <div className="h-2 w-2 animate-bounce rounded-full bg-neutral-500" style={{ animationDelay: '0ms' }} />
            <div className="h-2 w-2 animate-bounce rounded-full bg-neutral-500" style={{ animationDelay: '150ms' }} />
            <div className="h-2 w-2 animate-bounce rounded-full bg-neutral-500" style={{ animationDelay: '300ms' }} />
            <p className="text-xs font-bold uppercase tracking-widest text-neutral-500">Loading...</p>
          </div>
        </div>
      </AppShell>
    )
  }

  if (sessions.length === 0) {
    return (
      <AppShell title="Session Logs" subtitle="History & Records">
        <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-12 text-center">
          <FiCircle className="mx-auto mb-6 text-neutral-700" size={48} />
          <h3 className="mb-3 text-xl font-extrabold uppercase tracking-wider text-white">
            No Sessions Yet
          </h3>
          <p className="text-sm font-medium leading-relaxed text-neutral-400">
            Start your first interview session to see your history here.
          </p>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell title="Session Logs" subtitle="History & Records">
      {/* Filters and Sort */}
      <div className="mb-8 flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <FiFilter className="text-neutral-500" size={14} />
          <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">
            Filter:
          </span>
          <div className="flex gap-2">
            {['all', 'active', 'completed'].map(filter => (
              <button
                key={filter}
                onClick={() => setStatusFilter(filter)}
                className={`border px-3 py-1.5 text-[9px] font-bold uppercase tracking-widest transition ${
                  statusFilter === filter
                    ? 'border-white bg-white text-black'
                    : 'border-neutral-700 text-neutral-400 hover:border-white hover:text-white'
                }`}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <FiArrowDown className="text-neutral-500" size={14} />
          <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">
            Sort:
          </span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="border border-neutral-700 bg-neutral-950 px-3 py-1.5 text-[9px] font-bold uppercase tracking-widest text-neutral-300 transition hover:border-white focus:border-white focus:outline-none"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="longest">Longest Duration</option>
            <option value="mostQuestions">Most Questions</option>
          </select>
        </div>

        <div className="ml-auto text-[10px] font-bold uppercase tracking-widest text-neutral-500">
          {filteredSessions.length} Session{filteredSessions.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Session List */}
      <div className="space-y-4">
        {filteredSessions.map((session, index) => (
          <motion.article
            key={session._id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            onClick={() => navigate(`/session/${session._id}`)}
            className="cursor-pointer rounded-xl border border-neutral-800 bg-neutral-950 p-6 transition-all hover:border-neutral-700 hover:bg-neutral-900/50"
          >
            <div className="mb-4 flex items-start justify-between">
              <div className="flex-1">
                <div className="mb-2 flex items-center gap-3">
                  <h3 className="text-lg font-extrabold uppercase tracking-tight text-white">
                    {session.role}
                  </h3>
                  <span className={`flex items-center gap-1.5 rounded border px-2 py-1 text-[8px] font-bold uppercase tracking-wider ${getStatusColor(session.status)}`}>
                    {session.status === 'completed' ? (
                      <FiCheckCircle size={10} />
                    ) : (
                      <FiCircle size={10} />
                    )}
                    {session.status}
                  </span>
                </div>
                <p className="text-[11px] font-medium tracking-wide text-neutral-400">
                  {session.topicsToFocus || session.topicToFocus}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <div>
                <p className="mb-1 text-[9px] font-bold uppercase tracking-widest text-neutral-500">
                  Date
                </p>
                <p className="text-xs font-bold text-neutral-300">
                  {formatDate(session.createdAt)}
                </p>
              </div>
              <div>
                <p className="mb-1 text-[9px] font-bold uppercase tracking-widest text-neutral-500">
                  Duration
                </p>
                <p className="text-xs font-bold text-neutral-300">
                  {formatDuration(session.totalDuration)}
                </p>
              </div>
              <div>
                <p className="mb-1 text-[9px] font-bold uppercase tracking-widest text-neutral-500">
                  Questions
                </p>
                <p className="text-xs font-bold text-neutral-300">
                  {session.questionCount || session.questions?.length || 0}
                </p>
              </div>
              <div>
                <p className="mb-1 text-[9px] font-bold uppercase tracking-widest text-neutral-500">
                  Experience
                </p>
                <p className="text-xs font-bold text-neutral-300">
                  {session.experince || session.experience || '—'}
                </p>
              </div>
            </div>
          </motion.article>
        ))}
      </div>
    </AppShell>
  )
}

export default SessionLogs
```

**API Path Constants Update**

```javascript
// utils/apiPath.js (add to existing file)
export const API_PATH = {
  // ... existing paths
  ANALYTICS: {
    GET: '/api/analytics',
    GET_WEAK_TOPICS: '/api/analytics/weak-topics'
  },
  SESSION: {
    // ... existing session paths
    GET_MY_SESSIONS: '/api/sessions/my-sessions',
    COMPLETE: (id) => `/api/sessions/complete/${id}`
  }
}
```

## Data Flow

### 1. Session Completion Flow

```
User completes session
    ↓
Frontend calls PUT /api/sessions/complete/:id
    ↓
Backend controller:
  - Validates session ownership
  - Calculates totalDuration (endTime - startTime)
  - Sets questionCount from questions array length
  - Sets status = "completed"
  - Sets completionDate = now
  - Saves to database
    ↓
Returns updated session to frontend
    ↓
Frontend refreshes session view
```

### 2. Analytics Loading Flow

```
User navigates to Analytics page
    ↓
Frontend calls GET /api/analytics
    ↓
Backend controller:
  - Queries completed sessions for user
  - Filters out invalid data (null/negative values)
  - Calculates total sessions
  - Calculates average duration
  - Calculates total questions
  - Calculates completion rate
  - Aggregates weekly session counts
  - Calculates duration trend
    ↓
Returns analytics object to frontend
    ↓
Frontend renders metrics and charts
    ↓
Frontend calls GET /api/analytics/weak-topics (parallel)
    ↓
Backend:
  - Fetches recent sessions with questions
  - Calls Groq API with session data
  - Parses AI response
  - Returns top 5 weak topics
    ↓
Frontend renders weak topics section
```

### 3. Session Logs Flow

```
User navigates to Session Logs page
    ↓
Frontend calls GET /api/sessions/my-sessions
    ↓
Backend returns all user sessions sorted by createdAt desc
    ↓
Frontend applies client-side filtering (status: all/active/completed)
    ↓
Frontend applies client-side sorting (newest/oldest/longest/mostQuestions)
    ↓
User clicks session entry
    ↓
Navigate to /session/:id (existing SessionDetail page)
```

## Error Handling

### Backend Error Responses

All backend endpoints follow consistent error response format:

```javascript
{
  success: false,
  message: "Human-readable error message",
  error: "Technical error details" // Optional, only in development
}
```

**HTTP Status Codes:**
- `400`: Bad request (validation errors, missing fields)
- `401`: Unauthorized (invalid/missing authentication)
- `403`: Forbidden (insufficient permissions)
- `404`: Resource not found
- `500`: Internal server error
- `503`: Service unavailable (database connection lost)

### Frontend Error Handling

**Network Request Timeout:**
```javascript
axiosInstance.defaults.timeout = 10000; // 10 seconds

// Timeout handling in components
try {
  const { data } = await axiosInstance.get(url);
} catch (error) {
  if (error.code === 'ECONNABORTED') {
    notifyError('Request timed out. Please check your connection and retry.');
  } else {
    notifyError(getErrorMessage(error, 'Operation failed'));
  }
}
```

**Groq Service Fallback:**

When Groq API fails, the weak topics endpoint returns an empty array with a message rather than throwing an error, ensuring the Analytics page remains functional.

```javascript
// In analyticsController.js
catch (error) {
  return res.status(200).json({
    success: true,
    weakTopics: [],
    message: "Analysis temporarily unavailable"
  });
}
```

**Loading States:**

All async operations display loading indicators:
- Bouncing dots animation for full-page loads
- "Analyzing..." text for AI operations
- Disabled button states with opacity during submission

## Deployment Configuration

### Environment Variables

**Backend (.env):**
```bash
PORT=5000
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/dbname
JWT_SECRET=your_jwt_secret_key
GROQ_API_KEY=gsk_your_groq_api_key
NODE_ENV=production
```

**Frontend (.env):**
```bash
VITE_API_URL=https://your-backend.onrender.com
```

### Render Deployment

**Backend Configuration (render.yaml):**
```yaml
services:
  - type: web
    name: ai-interview-prep-backend
    env: node
    buildCommand: npm install
    startCommand: node server.js
    envVars:
      - key: NODE_VERSION
        value: 18.x
      - key: MONGODB_URI
        sync: false
      - key: JWT_SECRET
        sync: false
      - key: GROQ_API_KEY
        sync: false
    healthCheckPath: /health
```

**Health Check Endpoint:**

The `/health` endpoint ensures Render can monitor service availability:
- Returns 200 status on success
- Includes timestamp and service name
- Used by Render's health monitoring

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Status Validation

*For any* session creation or update request, if the status field is provided, it SHALL only be accepted if the value is exactly "active" or "completed", otherwise the request SHALL be rejected with a validation error.

**Validates: Requirements 1.2**

### Property 2: Session Initialization

*For any* valid session creation request, the resulting session SHALL have status field set to "active" regardless of other input parameters.

**Validates: Requirements 1.3**

### Property 3: Session Completion Metrics

*For any* session being completed, when status changes to "completed", the system SHALL set totalDuration equal to (endTime - startTime) and completionDate equal to the current timestamp.

**Validates: Requirements 1.4, 7.1, 7.3**

### Property 4: Required Field Validation

*For any* session update request that omits required fields (user, role, experince, topicsToFocus), the API SHALL reject the request with appropriate error message.

**Validates: Requirements 1.5**

### Property 5: Navigation Routing

*For any* navigation item in the AppShell, clicking that item SHALL navigate to its corresponding route path.

**Validates: Requirements 2.2**

### Property 6: Active Route Highlighting

*For any* valid application route, the AppShell SHALL apply active styling to the navigation item whose path matches the current route.

**Validates: Requirements 2.3**

### Property 7: Completed Sessions Count

*For any* collection of sessions, the Analytics Engine's total sessions metric SHALL equal the count of sessions with status "completed".

**Validates: Requirements 3.1**

### Property 8: Average Duration Calculation

*For any* collection of completed sessions with valid totalDuration values, the calculated average duration SHALL equal the sum of all totalDuration values divided by the count of sessions.

**Validates: Requirements 3.2**

### Property 9: Total Questions Summation

*For any* collection of sessions, the total questions metric SHALL equal the sum of all questionCount values across those sessions.

**Validates: Requirements 3.3**

### Property 10: Session Ordering

*For any* collection of sessions retrieved by the Session Log Viewer, the default ordering SHALL be by startTime in descending order (newest first).

**Validates: Requirements 5.1**

### Property 11: Session Display Completeness

*For any* session displayed in the Session Log Viewer, the rendered representation SHALL contain all of: topic, date, duration, and questionCount.

**Validates: Requirements 5.2**

### Property 12: Session Click Navigation

*For any* session entry in the Session Log Viewer list, clicking that entry SHALL navigate to the detailed session view at `/session/:id`.

**Validates: Requirements 5.4**

### Property 13: Status Filtering

*For any* session collection and any selected status filter ("all", "active", "completed"), the displayed sessions SHALL include only those sessions matching the filter criteria (or all sessions if filter is "all").

**Validates: Requirements 6.2**

### Property 14: Sort Ordering

*For any* session collection and any selected sort option ("newest first", "oldest first", "longest duration", "most questions"), the displayed sessions SHALL be ordered according to the corresponding criterion.

**Validates: Requirements 6.4**

### Property 15: Duration Calculation Correctness

*For any* session with valid startTime and endTime timestamps, when calculating totalDuration, the result SHALL equal (endTime - startTime) expressed in milliseconds.

**Validates: Requirements 7.1**

### Property 16: Question Count Type Validation

*For any* session save operation, if questionCount is provided, it SHALL only be accepted if the value is a non-negative integer, otherwise validation SHALL fail.

**Validates: Requirements 7.2**

### Property 17: Completion Date Assignment

*For any* session where status changes to "completed", the completionDate field SHALL be set to the current timestamp at the time of completion.

**Validates: Requirements 7.3**

### Property 18: Weekly Aggregation Correctness

*For any* collection of sessions with completionDate values, when aggregating sessions per week, each session SHALL be counted exactly once in the week containing its completionDate.

**Validates: Requirements 8.1**

### Property 19: Duration Trend Calculation

*For any* time-series collection of session durations, the calculated trend SHALL produce average duration values per time period by summing durations in that period and dividing by the count of sessions in that period.

**Validates: Requirements 8.2**

### Property 20: Completion Rate Formula

*For any* user with total sessions and completed sessions, the completion rate SHALL equal (completed sessions / total sessions) × 100.

**Validates: Requirements 8.3**

### Property 21: Positive Duration Validation

*For any* session save operation where totalDuration is provided, the value SHALL only be accepted if it is a positive number, otherwise validation SHALL fail.

**Validates: Requirements 9.1**

### Property 22: Non-Negative Question Count Validation

*For any* session save operation where questionCount is provided, the value SHALL only be accepted if it is a non-negative integer (>= 0), otherwise validation SHALL fail.

**Validates: Requirements 9.2**

### Property 23: Active Session Exclusion

*For any* analytics calculation involving completion statistics, sessions with status "active" SHALL be excluded from the calculation.

**Validates: Requirements 9.3**

### Property 24: Invalid Data Exclusion

*For any* analytics calculation, sessions with null or missing required metric values SHALL be excluded from aggregations and averages.

**Validates: Requirements 9.4**

### Property 25: Average Calculation Data Validation

*For any* average calculation (duration, questions, etc.), only sessions with valid numeric values for that metric SHALL contribute to the sum and count used in the average formula.

**Validates: Requirements 9.5**

## Testing Strategy

### Unit Tests

Unit tests should cover:
- **Validation logic**: Status enum validation, type validation for numeric fields
- **Calculation functions**: Duration calculation, average calculation, aggregation helpers
- **Component rendering**: Proper display of navigation items, metrics cards, session entries
- **Error handling**: Fallback messages, timeout handling, retry functionality
- **Edge cases**: Empty session lists, single session, insufficient data scenarios

### Property-Based Tests

Property tests should verify universal behaviors across randomized inputs (minimum 100 iterations per property):

**Backend Properties:**
- Property 1-6: Session model validation and state transitions
- Property 7-9: Analytics calculation correctness
- Property 15-25: Metric calculations and data validation

**Frontend Properties:**
- Property 5-6: Navigation behavior and routing
- Property 10-14: Session list filtering and sorting

**Tag Format:** Each property test must reference its design property:
```javascript
describe('Feature: analytics-and-session-logging, Property 8: Average Duration Calculation', () => {
  // Test implementation with fast-check or similar library
});
```

### Integration Tests

Integration tests should verify:
- Database connection and query execution
- Groq API integration with mock responses
- Complete request/response cycles for each endpoint
- Frontend-backend communication
- Chart rendering with actual data

### Configuration Tests

Smoke tests for one-time verification:
- Database schema includes all required fields and indexes
- Environment variables are correctly loaded
- Health check endpoint responds
- Deployment configuration is valid

## Dependencies

### Backend New Dependencies

```json
{
  "groq-sdk": "^0.3.0"
}
```

### Frontend New Dependencies

```json
{
  "chart.js": "^4.4.0",
  "react-chartjs-2": "^5.2.0",
  "react-icons": "^4.12.0"
}
```

Note: `react-icons`, `framer-motion`, `react-router-dom`, and `axios` are already present in the project.

## Migration Plan

For existing sessions without the new fields:

1. **Default Values:**
   - `status`: Will default to "active" (existing sessions remain active until explicitly completed)
   - `totalDuration`: Will be `null` (analytics will exclude these from duration calculations)
   - `questionCount`: Will default to `0` (can be backfilled by counting questions array)
   - `completionDate`: Will be `null`

2. **Backfill Script** (optional, for historical accuracy):

```javascript
// scripts/backfillSessionMetrics.js
const Session = require('./models/Session');

async function backfillMetrics() {
  const sessions = await Session.find({
    status: { $exists: false }
  }).populate('questions');
  
  for (const session of sessions) {
    session.status = 'completed'; // Assume old sessions are completed
    session.questionCount = session.questions.length;
    session.completionDate = session.updatedAt; // Use last update as proxy
    
    // Calculate duration based on timestamps if available
    if (session.createdAt && session.updatedAt) {
      session.totalDuration = 
        new Date(session.updatedAt).getTime() - 
        new Date(session.createdAt).getTime();
    }
    
    await session.save();
  }
  
  console.log(`Backfilled ${sessions.length} sessions`);
}
```

## Security Considerations

1. **Authentication**: All analytics and session endpoints require valid JWT token via `protect` middleware
2. **Authorization**: Session completion and viewing restricted to session owner
3. **Input Validation**: All numeric inputs validated for type and range
4. **API Key Security**: Groq API key stored in environment variables, never exposed to frontend
5. **Rate Limiting**: Consider implementing rate limits on Groq API calls to prevent abuse
6. **HTTPS**: All production requests served over HTTPS (enforced by Render platform)

## Performance Optimizations

1. **Database Indexes**: Compound indexes on `(user, status, createdAt)` optimize filtering queries
2. **Cached Metrics**: Pre-computed `totalDuration` and `questionCount` avoid expensive aggregations
3. **Pagination**: Consider implementing pagination for session logs when user has >100 sessions
4. **Lazy Loading**: Weak topics loaded separately to avoid blocking main analytics display
5. **Client-Side Filtering**: Filters and sorts applied in browser to reduce server requests

## Future Enhancements

1. **Export Functionality**: Allow users to download analytics as CSV/PDF
2. **Comparative Analytics**: Compare performance across different roles or topics
3. **Goal Setting**: Allow users to set practice goals and track progress
4. **Session Notes**: Add ability to add notes to completed sessions
5. **Advanced Filtering**: Filter by date range, topic, or experience level
6. **Real-time Updates**: WebSocket updates for active session duration tracking
7. **Groq Caching**: Cache weak topic analysis results to reduce API costs
