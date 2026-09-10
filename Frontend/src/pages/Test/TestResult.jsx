import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FiChevronDown,
  FiChevronUp,
  FiLoader,
  FiArrowLeft,
  FiRefreshCw,
  FiCheckCircle,
  FiAlertCircle,
  FiMinusCircle,
  FiTrendingUp,
  FiCheck,
  FiX,
} from 'react-icons/fi'
import AppShell from '../../components/layout/AppShell'
import axiosInstance from '../../utils/axiosInstance'
import { API_PATH } from '../../utils/apiPath'
import { getErrorMessage } from '../../utils/helper'
import { notifyError } from '../../utils/toast'

// ── helpers ──────────────────────────────────────────────────────────────────

const OPTION_LABELS = ['A', 'B', 'C', 'D']

const scoreColorClass = (score) => {
  if (score >= 8) return 'text-emerald-400'
  if (score >= 5) return 'text-yellow-400'
  return 'text-red-400'
}

const scoreBorderClass = (score) => {
  if (score >= 8) return 'border-emerald-800 bg-emerald-900/20 text-emerald-400'
  if (score >= 5) return 'border-yellow-800 bg-yellow-900/20 text-yellow-400'
  return 'border-red-800 bg-red-900/20 text-red-400'
}

const scoreBarClass = (pct) => {
  if (pct >= 80) return 'bg-emerald-500'
  if (pct >= 60) return 'bg-yellow-500'
  if (pct >= 40) return 'bg-orange-500'
  return 'bg-red-500'
}

const overallLabel = (pct) => {
  if (pct >= 80) return { label: 'Excellent',      icon: FiCheckCircle, color: 'text-emerald-400' }
  if (pct >= 60) return { label: 'Good',           icon: FiTrendingUp,  color: 'text-yellow-400'  }
  if (pct >= 40) return { label: 'Needs Work',     icon: FiMinusCircle, color: 'text-orange-400'  }
  return               { label: 'Keep Practicing', icon: FiAlertCircle, color: 'text-red-400'     }
}

const DIFFICULTY_BADGE = {
  easy:   'bg-emerald-900/30 text-emerald-400 border border-emerald-800',
  medium: 'bg-yellow-900/30  text-yellow-400  border border-yellow-800',
  hard:   'bg-red-900/30     text-red-400     border border-red-800',
}

// ── MCQ option row ────────────────────────────────────────────────────────────
function MCQOptions({ options = [], correctOption, selectedOption }) {
  return (
    <div className="space-y-2">
      {options.map((opt, idx) => {
        const isCorrect  = idx === correctOption
        const isSelected = idx === selectedOption
        const isWrong    = isSelected && !isCorrect

        let cls = 'border-neutral-700 bg-neutral-900 text-neutral-400'
        if (isCorrect)  cls = 'border-emerald-700 bg-emerald-900/20 text-emerald-300'
        if (isWrong)    cls = 'border-red-700 bg-red-900/20 text-red-300'

        return (
          <div key={idx} className={`flex items-center gap-3 rounded-lg border px-4 py-3 ${cls}`}>
            <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded border text-[10px] font-extrabold ${
              isCorrect ? 'border-emerald-600 bg-emerald-700 text-white' :
              isWrong   ? 'border-red-600 bg-red-700 text-white' :
              'border-neutral-600 text-neutral-500'
            }`}>
              {OPTION_LABELS[idx]}
            </span>
            <span className="flex-1 text-[12px] leading-relaxed">
              {opt.replace(/^[A-D]\.\s*/i, '')}
            </span>
            {isCorrect && <FiCheck size={14} className="shrink-0 text-emerald-400" />}
            {isWrong   && <FiX    size={14} className="shrink-0 text-red-400" />}
          </div>
        )
      })}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────

export default function TestResult() {
  const { attemptId } = useParams()
  const navigate = useNavigate()

  const [attempt, setAttempt]   = useState(null)
  const [answers, setAnswers]   = useState([])
  const [loading, setLoading]   = useState(true)
  const [expanded, setExpanded] = useState({})

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await axiosInstance.get(API_PATH.TEST.GET(attemptId))
        setAttempt(data.attempt)
        setAnswers(data.answers || [])
        if (data.answers?.[0]) setExpanded({ [data.answers[0].id]: true })
      } catch (err) {
        notifyError(getErrorMessage(err, 'Could not load results'))
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [attemptId])

  const toggle = (id) => setExpanded((prev) => ({ ...prev, [id]: !prev[id] }))

  if (loading) {
    return (
      <AppShell title="Test Results" compactHeader>
        <div className="flex h-[60vh] items-center justify-center gap-3">
          <FiLoader className="animate-spin text-neutral-500" size={22} />
        </div>
      </AppShell>
    )
  }

  if (!attempt) return null

  const score = attempt.overallScore ?? 0
  const { label, icon: LabelIcon, color: labelColor } = overallLabel(score)

  // Detect MCQ from first answer having options
  const isMCQ = answers.length > 0 && answers[0].options?.length > 0

  // Per-difficulty avg (0–100 scale)
  const byDiff = { easy: [], medium: [], hard: [] }
  answers.forEach((a) => {
    const d = a.difficulty || 'medium'
    if (byDiff[d]) byDiff[d].push(a.score ?? 0)
  })
  const diffAvg = (arr) =>
    arr.length ? Math.round((arr.reduce((s, v) => s + v, 0) / arr.length) * 10) : null

  const excellentCount   = answers.filter((a) => (a.score ?? 0) >= 8).length
  const needsReviewCount = answers.filter((a) => (a.score ?? 0) < 5).length

  // MCQ stats
  const correctCount = isMCQ ? answers.filter((a) => a.selectedOption != null && a.selectedOption === a.correctOption).length : null
  const skippedCount = isMCQ ? answers.filter((a) => a.selectedOption == null).length : null
  const wrongCount   = isMCQ ? answers.filter((a) => a.selectedOption != null && a.selectedOption !== a.correctOption).length : null

  return (
    <AppShell title="Test Results" compactHeader>

      {/* ── Nav ── */}
      <div className="mb-8 flex items-center justify-between">
        <button
          onClick={() => navigate(`/session/${attempt.sessionId}`)}
          className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-neutral-400 transition hover:text-white"
        >
          <FiArrowLeft size={12} /> Back to Session
        </button>
        <button
          onClick={() => navigate(`/session/${attempt.sessionId}/test`)}
          className="flex items-center gap-2 border border-neutral-700 px-5 py-2 text-[10px] font-bold uppercase tracking-widest text-neutral-300 transition hover:border-white hover:text-white"
        >
          <FiRefreshCw size={11} /> Retake Test
        </button>
      </div>

      {/* ── Score card ── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-10 rounded-2xl border border-neutral-800 bg-neutral-950/70 p-3"
      >
        <div className="rounded-xl border border-neutral-800 bg-neutral-950 px-6 py-8">
          <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">

            {/* Score + label */}
            <div>
              <div className="flex items-center gap-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-400">Overall Score</p>
                <span className={`rounded border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                  isMCQ
                    ? 'border-violet-800 bg-violet-900/20 text-violet-400'
                    : 'border-sky-800 bg-sky-900/20 text-sky-400'
                }`}>
                  {isMCQ ? 'MCQ' : 'Descriptive'}
                </span>
              </div>
              <div className="mt-3 flex items-end gap-3">
                <span className={`text-7xl font-extrabold tracking-tighter ${scoreColorClass(score / 10)}`}>
                  {score}
                </span>
                <span className="mb-3 text-2xl font-bold text-neutral-600">/ 100</span>
              </div>
              <div className={`mt-2 flex items-center gap-2 ${labelColor}`}>
                <LabelIcon size={14} />
                <span className="text-[11px] font-bold uppercase tracking-widest">{label}</span>
              </div>
            </div>

            {/* Right stats */}
            <div className="flex gap-6 md:flex-col md:items-end md:gap-3">
              {isMCQ ? (
                // MCQ breakdown
                <>
                  <div className="text-center md:text-right">
                    <p className="text-[9px] font-bold uppercase tracking-widest text-neutral-500">Correct</p>
                    <p className="mt-1 text-lg font-extrabold text-emerald-400">{correctCount}</p>
                  </div>
                  <div className="text-center md:text-right">
                    <p className="text-[9px] font-bold uppercase tracking-widest text-neutral-500">Wrong</p>
                    <p className="mt-1 text-lg font-extrabold text-red-400">{wrongCount}</p>
                  </div>
                  <div className="text-center md:text-right">
                    <p className="text-[9px] font-bold uppercase tracking-widest text-neutral-500">Skipped</p>
                    <p className="mt-1 text-lg font-extrabold text-neutral-400">{skippedCount}</p>
                  </div>
                </>
              ) : (
                // Descriptive difficulty breakdown
                Object.entries(byDiff).map(([diff, scores]) => {
                  const avg = diffAvg(scores)
                  return (
                    <div key={diff} className="text-center md:text-right">
                      <span className={`inline-block rounded px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${DIFFICULTY_BADGE[diff]}`}>
                        {diff}
                      </span>
                      <p className={`mt-1 text-lg font-extrabold ${avg !== null ? scoreColorClass(avg / 10) : 'text-neutral-600'}`}>
                        {avg !== null ? `${avg}%` : '—'}
                      </p>
                    </div>
                  )
                })
              )}
            </div>
          </div>

          {/* Score bar */}
          <div className="mt-8 h-1.5 w-full overflow-hidden rounded-full bg-neutral-800">
            <motion.div
              className={`h-full rounded-full ${scoreBarClass(score)}`}
              initial={{ width: 0 }}
              animate={{ width: `${score}%` }}
              transition={{ duration: 0.9, ease: 'easeOut' }}
            />
          </div>

          {/* Footer stats */}
          <div className="mt-4 flex gap-6 text-[10px] font-bold uppercase tracking-widest text-neutral-500">
            <span>{answers.length} questions</span>
            {isMCQ ? (
              <span className="text-emerald-500">{correctCount} correct</span>
            ) : (
              <span className="text-emerald-500">{excellentCount} excellent</span>
            )}
            <span className="text-red-400">{needsReviewCount} needs review</span>
          </div>
        </div>
      </motion.div>

      {/* ── Breakdown header ── */}
      <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-400">
        Question Breakdown
      </p>

      {/* ── Accordion ── */}
      <div className="overflow-hidden rounded-xl border border-neutral-800 bg-neutral-950">
        {answers.map((answer, idx) => {
          const qScore = answer.score ?? 0
          const isOpen = Boolean(expanded[answer.id])
          const isCorrectMCQ = isMCQ && answer.selectedOption === answer.correctOption
          const isWrongMCQ   = isMCQ && answer.selectedOption != null && !isCorrectMCQ
          const isSkippedMCQ = isMCQ && answer.selectedOption == null

          return (
            <div key={answer.id} className="border-b border-neutral-800 last:border-b-0">

              {/* Row header */}
              <button
                onClick={() => toggle(answer.id)}
                className="flex w-full items-center gap-4 px-5 py-5 text-left transition hover:bg-neutral-900/60"
              >
                {/* Score / result badge */}
                {isMCQ ? (
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded border ${
                    isCorrectMCQ ? 'border-emerald-700 bg-emerald-900/20' :
                    isWrongMCQ   ? 'border-red-700 bg-red-900/20' :
                    'border-neutral-700 bg-neutral-800'
                  }`}>
                    {isCorrectMCQ ? <FiCheck size={16} className="text-emerald-400" /> :
                     isWrongMCQ   ? <FiX    size={16} className="text-red-400" /> :
                     <span className="text-[10px] font-bold text-neutral-500">—</span>}
                  </div>
                ) : (
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded border text-sm font-extrabold ${scoreBorderClass(qScore)}`}>
                    {qScore}
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-center gap-2">
                    <span className="text-[9px] font-bold uppercase tracking-widest text-neutral-500">Q{idx + 1}</span>
                    <span className={`rounded px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${DIFFICULTY_BADGE[answer.difficulty] || DIFFICULTY_BADGE.medium}`}>
                      {answer.difficulty || 'medium'}
                    </span>
                    {!isMCQ && <span className="text-[9px] font-bold text-neutral-600">/ 10</span>}
                    {isMCQ && isSkippedMCQ && (
                      <span className="rounded border border-neutral-700 px-2 py-0.5 text-[9px] font-bold uppercase text-neutral-500">Skipped</span>
                    )}
                  </div>
                  <p className="truncate text-[13px] font-bold uppercase leading-tight tracking-tight text-white">
                    {answer.question}
                  </p>
                </div>

                <div className="shrink-0 text-neutral-500">
                  {isOpen ? <FiChevronUp size={14} /> : <FiChevronDown size={14} />}
                </div>
              </button>

              {/* Expanded detail */}
              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    key="detail"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="space-y-6 border-t border-neutral-800 px-5 py-6">

                      {/* ── MCQ options with correct/wrong highlight ── */}
                      {isMCQ && (
                        <div>
                          <p className="mb-3 text-[9px] font-bold uppercase tracking-widest text-neutral-400">Options</p>
                          <MCQOptions
                            options={answer.options || []}
                            correctOption={answer.correctOption}
                            selectedOption={answer.selectedOption}
                          />
                          {answer.idealAnswer && (
                            <div className="mt-4 rounded-lg border border-neutral-800 bg-neutral-900 p-4">
                              <p className="mb-1 text-[9px] font-bold uppercase tracking-widest text-neutral-400">Explanation</p>
                              <p className="text-[12px] leading-relaxed text-neutral-300">{answer.idealAnswer}</p>
                            </div>
                          )}
                        </div>
                      )}

                      {/* ── Descriptive feedback ── */}
                      {!isMCQ && (
                        <>
                          {answer.feedback && (
                            <div>
                              <p className="mb-2 text-[9px] font-bold uppercase tracking-widest text-neutral-400">AI Feedback</p>
                              <p className="text-[13px] leading-relaxed text-neutral-200">{answer.feedback}</p>
                            </div>
                          )}

                          {(answer.strengths?.length > 0 || answer.improvements?.length > 0) && (
                            <div className="grid gap-4 sm:grid-cols-2">
                              {answer.strengths?.length > 0 && (
                                <div className="rounded-lg border border-emerald-800 bg-emerald-900/10 p-4">
                                  <p className="mb-3 text-[9px] font-bold uppercase tracking-widest text-emerald-400">Strengths</p>
                                  <ul className="space-y-2">
                                    {answer.strengths.map((s, i) => (
                                      <li key={i} className="flex items-start gap-2 text-[12px] text-neutral-200">
                                        <span className="mt-0.5 shrink-0 text-emerald-500">✓</span>{s}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                              {answer.improvements?.length > 0 && (
                                <div className="rounded-lg border border-yellow-800 bg-yellow-900/10 p-4">
                                  <p className="mb-3 text-[9px] font-bold uppercase tracking-widest text-yellow-400">Improvements</p>
                                  <ul className="space-y-2">
                                    {answer.improvements.map((s, i) => (
                                      <li key={i} className="flex items-start gap-2 text-[12px] text-neutral-200">
                                        <span className="mt-0.5 shrink-0 text-yellow-500">→</span>{s}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          )}

                          <div className="grid gap-4 sm:grid-cols-2">
                            <div>
                              <p className="mb-2 text-[9px] font-bold uppercase tracking-widest text-neutral-400">Your Answer</p>
                              <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-4">
                                <p className="text-[12px] leading-relaxed text-neutral-300 whitespace-pre-wrap">
                                  {answer.userAnswer || <span className="italic text-neutral-600">No answer provided</span>}
                                </p>
                              </div>
                            </div>
                            <div>
                              <p className="mb-2 text-[9px] font-bold uppercase tracking-widest text-neutral-400">Ideal Answer</p>
                              <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-4">
                                <p className="text-[12px] leading-relaxed text-neutral-300">{answer.idealAnswer || '—'}</p>
                              </div>
                            </div>
                          </div>
                        </>
                      )}

                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )
        })}
      </div>

    </AppShell>
  )
}
