import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import moment from 'moment'
import { FiZap, FiPlus, FiArrowRight, FiLoader, FiTrash2, FiAward, FiList, FiCheckSquare } from 'react-icons/fi'
import AppShell from '../../components/layout/AppShell'
import Modal from '../../components/Modal'
import axiosInstance from '../../utils/axiosInstance'
import { API_PATH } from '../../utils/apiPath'
import { getErrorMessage, normalizeQuestions, parseQuestionsResponse } from '../../utils/helper'
import { roles } from '../../utils/roles'
import { notifyError, notifySuccess } from '../../utils/toast'

// ── helpers ────────────────────────────────────────────────────────────────

const scoreColorClass = (score) => {
  if (score >= 80) return 'text-emerald-400'
  if (score >= 60) return 'text-yellow-400'
  if (score >= 40) return 'text-orange-400'
  return 'text-red-400'
}

const scoreBadgeClass = (score) => {
  if (score >= 80) return 'border-emerald-800 bg-emerald-900/20 text-emerald-400'
  if (score >= 60) return 'border-yellow-800  bg-yellow-900/20  text-yellow-400'
  if (score >= 40) return 'border-orange-800  bg-orange-900/20  text-orange-400'
  return                  'border-red-800     bg-red-900/20     text-red-400'
}

const NUMBER_OF_QUESTIONS = 10

export default function TestDashboard() {
  const navigate = useNavigate()

  const [sessions, setSessions]           = useState([])
  const [attemptsMap, setAttemptsMap]     = useState({})  // { sessionId: [attempt, ...] }
  const [loadingSessions, setLoadingSessions] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [busy, setBusy]                   = useState(false)
  const [expandedSession, setExpandedSession] = useState(null) // sessionId showing past attempts

  const [form, setForm] = useState({
    role: roles[0]?.role || '',
    experience: 'Fresher',
    topicToFocus: roles[0]?.topics.join(', ') || '',
    description: '',
    questionFormat: 'descriptive', // 'descriptive' | 'mcq'
  })

  // ── fetch all sessions ─────────────────────────────────────────────────────
  const fetchSessions = async () => {
    setLoadingSessions(true)
    try {
      const { data } = await axiosInstance.get(`${API_PATH.SESSION.GET_ALL}?type=test`)
      setSessions(data.sessions || [])
    } catch (err) {
      notifyError(getErrorMessage(err, 'Unable to fetch sessions'))
    } finally {
      setLoadingSessions(false)
    }
  }

  useEffect(() => {
    fetchSessions()
  }, [])

  // ── fetch past attempts for a session (lazy, on expand) ───────────────────
  const fetchAttempts = async (sessionId) => {
    if (attemptsMap[sessionId]) return // already loaded
    try {
      const { data } = await axiosInstance.get(API_PATH.TEST.BY_SESSION(sessionId))
      setAttemptsMap((prev) => ({ ...prev, [sessionId]: data.attempts || [] }))
    } catch {
      setAttemptsMap((prev) => ({ ...prev, [sessionId]: [] }))
    }
  }

  const toggleExpand = (sessionId) => {
    if (expandedSession === sessionId) {
      setExpandedSession(null)
    } else {
      setExpandedSession(sessionId)
      fetchAttempts(sessionId)
    }
  }

  // ── create new session ─────────────────────────────────────────────────────
  const onCreateSession = async (e) => {
    e.preventDefault()
    setBusy(true)
    try {
      const isMCQ = form.questionFormat === 'mcq'

      // Pick the right AI endpoint based on format
      const aiEndpoint = isMCQ ? API_PATH.AI.GENERATE_MCQ : API_PATH.AI.GENERATE_QUESTIONS
      const { data: aiData } = await axiosInstance.post(aiEndpoint, {
        role: form.role,
        experience: form.experience,
        topicToFocus: form.topicToFocus,
        numberOfQuestions: NUMBER_OF_QUESTIONS,
      })

      // MCQ data comes back as a raw array; descriptive goes through parseQuestionsResponse
      const raw = Array.isArray(aiData) ? aiData : parseQuestionsResponse(aiData)

      // Normalize — preserve options + correctOption for MCQ
      const generated = raw
        .filter((q) => q?.question)
        .map((q) => ({
          question: q.question,
          answer: q.answer || '',
          difficulty: q.difficulty || 'medium',
          ...(isMCQ && q.options ? { options: q.options, correctOption: q.correctOption } : {}),
        }))

      const { data: sessionData } = await axiosInstance.post(API_PATH.SESSION.CREATE, {
        role: form.role,
        experience: form.experience,
        topicToFocus: form.topicToFocus,
        description: form.description,
        type: 'test',
        questionFormat: form.questionFormat,
        questions: generated,
      })

      const createdId = sessionData?.session?._id ?? sessionData?.session?.id
      notifySuccess('Session created — ready to test!')
      setShowCreateModal(false)
      fetchSessions()

      if (createdId) {
        navigate(`/session/${createdId}/test`)
      }
    } catch (err) {
      notifyError(getErrorMessage(err, 'Failed to create session'))
    } finally {
      setBusy(false)
    }
  }

  // ── delete session ────────────────────────────────────────────────────────
  const onDeleteSession = async (id) => {
    try {
      await axiosInstance.delete(API_PATH.SESSION.DELETE(id))
      notifySuccess('Session deleted')
      setSessions((prev) => prev.filter((s) => (s._id ?? s.id) !== id))
    } catch (err) {
      notifyError(getErrorMessage(err, 'Could not delete session'))
    }
  }

  // ── derived stats ─────────────────────────────────────────────────────────
  const totalAttempts = Object.values(attemptsMap).flat().length
  const allScores = Object.values(attemptsMap)
    .flat()
    .filter((a) => a.overallScore != null)
    .map((a) => a.overallScore)
  const bestScore = allScores.length ? Math.max(...allScores) : null

  return (
    <AppShell title="Test Arena" compactHeader>

      {/* ── Stats row ── */}
      <div className="mb-12 grid grid-cols-1 gap-px bg-neutral-800 sm:grid-cols-3 border border-neutral-800">
        {[
          { label: 'AVAILABLE_SESSIONS', value: sessions.length },
          { label: 'TOTAL_ATTEMPTS',     value: totalAttempts },
          { label: 'BEST_SCORE',         value: bestScore != null ? `${bestScore}%` : '—' },
        ].map((stat) => (
          <div key={stat.label} className="bg-neutral-950 p-8">
            <p className="text-[10px] font-bold tracking-[0.2em] text-neutral-400 uppercase">
              {stat.label}
            </p>
            <p className={`mt-2 text-3xl font-extrabold tracking-tighter ${stat.label === 'BEST_SCORE' && bestScore != null ? scoreColorClass(bestScore) : 'text-white'}`}>
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      {/* ── Header actions ── */}
      <div className="mb-10 flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-widest text-white">
            Session Registry
          </h2>
          <p className="mt-1 text-[10px] font-medium uppercase tracking-wider text-neutral-400">
            Pick a session to test yourself, or create a new one.
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-3 bg-white px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-black transition hover:bg-neutral-200"
        >
          <FiPlus size={14} />
          New Test Protocol
        </button>
      </div>

      {/* ── Session grid ── */}
      {loadingSessions ? (
        <div className="flex items-center justify-center py-20">
          <FiLoader className="animate-spin text-neutral-600" size={22} />
        </div>
      ) : sessions.length === 0 ? (
        <div className="border border-dashed border-neutral-800 py-20 text-center">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500">
            No sessions found. Create one to start testing.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {sessions.map((session) => {
            const sessionId   = session._id ?? session.id
            const totalQA     = session.questions?.length || 0
            const topics      = session.topicsToFocus || session.topicToFocus || '—'
            const experience  = session.experince || session.experience || '—'
            const isExpanded  = expandedSession === sessionId
            const attempts    = attemptsMap[sessionId]
            const bestAttempt = attempts
              ?.filter((a) => a.overallScore != null)
              ?.sort((a, b) => b.overallScore - a.overallScore)[0]

            return (
              <div
                key={sessionId}
                className="overflow-hidden rounded-xl border border-neutral-800 bg-neutral-950"
              >
                {/* ── Session row ── */}
                <div className="flex flex-col gap-4 px-6 py-5 md:flex-row md:items-center md:justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-[9px] font-bold uppercase tracking-widest text-neutral-500">
                      ROLE_SPECIFICATION
                    </p>
                    <h3 className="mt-1 truncate text-base font-extrabold uppercase tracking-tight text-white">
                      {session.role}
                    </h3>
                    <div className="mt-2 flex flex-wrap gap-4 text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                      <span>
                        <span className="text-neutral-600">Focus: </span>
                        <span className="text-neutral-300">{topics}</span>
                      </span>
                      <span>
                        <span className="text-neutral-600">Exp: </span>
                        <span className="text-neutral-300">{experience}</span>
                      </span>
                      <span>
                        <span className="text-neutral-600">Questions: </span>
                        <span className="text-neutral-300">{totalQA}</span>
                      </span>
                      <span className={`rounded px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider border ${
                        session.questionFormat === 'mcq'
                          ? 'border-violet-800 bg-violet-900/20 text-violet-400'
                          : 'border-sky-800 bg-sky-900/20 text-sky-400'
                      }`}>
                        {session.questionFormat === 'mcq' ? 'MCQ' : 'Descriptive'}
                      </span>
                      {bestAttempt && (
                        <span>
                          <span className="text-neutral-600">Best: </span>
                          <span className={scoreColorClass(bestAttempt.overallScore)}>
                            {bestAttempt.overallScore}%
                          </span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex shrink-0 items-center gap-3">
                    {/* Past attempts toggle */}
                    <button
                      onClick={() => toggleExpand(sessionId)}
                      className="flex items-center gap-2 border border-neutral-700 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-neutral-400 transition hover:border-neutral-400 hover:text-white"
                    >
                      <FiAward size={12} />
                      {isExpanded ? 'Hide Attempts' : 'Attempts'}
                    </button>

                    {/* Delete */}
                    <button
                      onClick={() => onDeleteSession(sessionId)}
                      className="grid h-9 w-9 place-items-center border border-neutral-800 text-neutral-600 transition hover:border-red-800 hover:text-red-400"
                    >
                      <FiTrash2 size={13} />
                    </button>

                    {/* Start test */}
                    <button
                      onClick={() => navigate(`/session/${sessionId}/test`)}
                      className="flex items-center gap-2 bg-white px-5 py-2 text-[10px] font-bold uppercase tracking-widest text-black transition hover:bg-neutral-200"
                    >
                      <FiZap size={12} />
                      Start Test
                      <FiArrowRight size={12} />
                    </button>
                  </div>
                </div>

                {/* ── Past attempts panel ── */}
                {isExpanded && (
                  <div className="border-t border-neutral-800 px-6 py-4">
                    <p className="mb-3 text-[9px] font-bold uppercase tracking-widest text-neutral-500">
                      Past Attempts
                    </p>

                    {!attempts ? (
                      <div className="flex items-center gap-2 py-4">
                        <FiLoader className="animate-spin text-neutral-600" size={14} />
                        <span className="text-[10px] text-neutral-600">Loading…</span>
                      </div>
                    ) : attempts.length === 0 ? (
                      <p className="py-4 text-[10px] italic text-neutral-600">
                        No attempts yet. Hit Start Test to begin!
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {attempts.map((attempt, idx) => (
                          <button
                            key={attempt.id}
                            onClick={() => navigate(`/test/${attempt.id}/result`)}
                            className="flex w-full items-center justify-between rounded-lg border border-neutral-800 bg-neutral-900 px-4 py-3 text-left transition hover:border-neutral-600"
                          >
                            <div className="flex items-center gap-4">
                              {/* Attempt number */}
                              <span className="text-[9px] font-bold uppercase tracking-widest text-neutral-600">
                                #{attempts.length - idx}
                              </span>
                              {/* Score badge */}
                              {attempt.overallScore != null ? (
                                <span className={`rounded border px-2 py-0.5 text-[10px] font-extrabold ${scoreBadgeClass(attempt.overallScore)}`}>
                                  {attempt.overallScore}%
                                </span>
                              ) : (
                                <span className="rounded border border-neutral-700 px-2 py-0.5 text-[10px] font-bold text-neutral-500">
                                  In Progress
                                </span>
                              )}
                              {/* Questions count */}
                              <span className="text-[10px] text-neutral-500">
                                {attempt.totalQuestions} questions
                              </span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-[9px] text-neutral-600">
                                {moment(attempt.createdAt).format('MMM D, YYYY · HH:mm')}
                              </span>
                              <FiArrowRight size={12} className="text-neutral-600" />
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* ── Create Session Modal ── */}
      <Modal
        open={showCreateModal}
        title="INITIALIZE TEST PROTOCOL"
        onClose={() => setShowCreateModal(false)}
      >
        <form onSubmit={onCreateSession} className="space-y-6">
          {/* Role */}
          <div>
            <label className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-neutral-400">
              Role Specification
            </label>
            <select
              required
              className="input-minimal"
              value={form.role}
              onChange={(e) => {
                const selected = roles.find((r) => r.role === e.target.value)
                setForm((prev) => ({
                  ...prev,
                  role: e.target.value,
                  topicToFocus: selected ? selected.topics.join(', ') : prev.topicToFocus,
                }))
              }}
            >
              {roles.map((r) => (
                <option key={r.role} value={r.role}>{r.role}</option>
              ))}
            </select>
          </div>

          {/* Experience */}
          <div>
            <label className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-neutral-400">
              Experience Level
            </label>
            <select
              required
              className="input-minimal"
              value={form.experience}
              onChange={(e) => setForm((prev) => ({ ...prev, experience: e.target.value }))}
            >
              {['Fresher', '1 year', '2 years', '3 years', '4 years', '5+ years'].map((v) => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          </div>

          {/* Topics */}
          <div>
            <label className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-neutral-400">
              Topics to Focus
            </label>
            <input
              required
              type="text"
              className="input-minimal"
              value={form.topicToFocus}
              onChange={(e) => setForm((prev) => ({ ...prev, topicToFocus: e.target.value }))}
              placeholder="e.g. React, Hooks, State Management"
            />
          </div>

          {/* Question Format */}
          <div>
            <label className="mb-3 block text-[10px] font-bold uppercase tracking-widest text-neutral-400">
              Question Format
            </label>
            <div className="grid grid-cols-2 gap-3">
              {[
                { value: 'descriptive', label: 'Descriptive', icon: FiList,        desc: 'Write open-ended answers, AI evaluates' },
                { value: 'mcq',        label: 'MCQ',         icon: FiCheckSquare,  desc: '4-option multiple choice, auto-scored' },
              ].map(({ value, label, icon: Icon, desc }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setForm((prev) => ({ ...prev, questionFormat: value }))}
                  className={`flex flex-col items-start gap-2 rounded-lg border p-4 text-left transition ${
                    form.questionFormat === value
                      ? value === 'mcq'
                        ? 'border-violet-600 bg-violet-900/20'
                        : 'border-sky-600 bg-sky-900/20'
                      : 'border-neutral-700 bg-neutral-900 hover:border-neutral-500'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Icon size={14} className={
                      form.questionFormat === value
                        ? value === 'mcq' ? 'text-violet-400' : 'text-sky-400'
                        : 'text-neutral-400'
                    } />
                    <span className={`text-[11px] font-bold uppercase tracking-widest ${
                      form.questionFormat === value
                        ? value === 'mcq' ? 'text-violet-300' : 'text-sky-300'
                        : 'text-neutral-300'
                    }`}>
                      {label}
                    </span>
                  </div>
                  <p className="text-[10px] leading-relaxed text-neutral-500">{desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Description (optional) */}
          <div>
            <label className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-neutral-400">
              Notes <span className="text-neutral-600">(optional)</span>
            </label>
            <textarea
              rows={2}
              className="input-minimal resize-none"
              value={form.description}
              onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="Any specific areas to focus on…"
            />
          </div>

          <button
            type="submit"
            disabled={busy}
            className="flex w-full items-center justify-center gap-3 bg-black py-3 text-[10px] font-bold uppercase tracking-widest text-white transition hover:bg-neutral-800 disabled:opacity-50 dark:bg-white dark:text-black dark:hover:bg-neutral-200"
          >
            {busy ? (
              <>
                <FiLoader className="animate-spin" size={13} />
                Generating &amp; Starting…
              </>
            ) : (
              <>
                <FiZap size={13} />
                Generate &amp; Start Test
              </>
            )}
          </button>
        </form>
      </Modal>
    </AppShell>
  )
}
