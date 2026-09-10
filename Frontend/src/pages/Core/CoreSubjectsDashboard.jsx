import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import moment from 'moment'
import {
  FiPlus, FiArrowRight, FiLoader, FiTrash2,
  FiBookOpen, FiZap, FiLayers,
} from 'react-icons/fi'
import AppShell from '../../components/layout/AppShell'
import Modal from '../../components/Modal'
import axiosInstance from '../../utils/axiosInstance'
import { API_PATH } from '../../utils/apiPath'
import { getErrorMessage } from '../../utils/helper'
import { roles } from '../../utils/roles'
import { notifyError, notifySuccess } from '../../utils/toast'

// ── constants ─────────────────────────────────────────────────────────────────

const NUMBER_OF_QUESTIONS = 10

// The 4 fixed CS core subjects always shown
const CORE_SUBJECTS = ['OS', 'DBMS', 'CN', 'OOPs']

const SUBJECT_COLORS = {
  OS:   'border-sky-800    bg-sky-900/20    text-sky-400',
  DBMS: 'border-violet-800 bg-violet-900/20 text-violet-400',
  CN:   'border-emerald-800 bg-emerald-900/20 text-emerald-400',
  OOPs: 'border-amber-800  bg-amber-900/20  text-amber-400',
}
const DOMAIN_COLOR = 'border-rose-800 bg-rose-900/20 text-rose-400'

// ── helpers ──────────────────────────────────────────────────────────────────

// Count questions by subject in a session
const subjectBreakdown = (questions = []) => {
  const counts = {}
  questions.forEach((q) => {
    if (q.subject) counts[q.subject] = (counts[q.subject] || 0) + 1
  })
  return counts
}

// ─────────────────────────────────────────────────────────────────────────────

export default function CoreSubjectsDashboard() {
  const navigate = useNavigate()

  const [sessions, setSessions]         = useState([])
  const [loading, setLoading]           = useState(true)
  const [showModal, setShowModal]       = useState(false)
  const [busy, setBusy]                 = useState(false)

  const [form, setForm] = useState({
    role:         roles[0]?.role || '',
    topicToFocus: roles[0]?.role || '',
    mode:         'preparation',  // 'preparation' | 'test'
    // Core subjects are always descriptive — MCQ makes no sense for theory questions
    // questionFormat is fixed to 'descriptive' and not exposed to the user
  })

  // ── fetch ──────────────────────────────────────────────────────────────────
  const fetchSessions = async () => {
    setLoading(true)
    try {
      const { data } = await axiosInstance.get(`${API_PATH.SESSION.GET_ALL}?type=core`)
      setSessions(data.sessions || [])
    } catch (err) {
      notifyError(getErrorMessage(err, 'Unable to fetch sessions'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchSessions() }, [])

  // ── create ─────────────────────────────────────────────────────────────────
  const onCreateSession = async (e) => {
    e.preventDefault()
    setBusy(true)
    try {
      // 1. Generate questions via AI
      const { data: aiData } = await axiosInstance.post(API_PATH.AI.GENERATE_CORE_SUBJECTS, {
        role: form.role,
        topicToFocus: form.topicToFocus,
        numberOfQuestions: NUMBER_OF_QUESTIONS,
      })

      const generated = Array.isArray(aiData) ? aiData : []
      if (!generated.length) throw new Error('No questions returned from AI')

      // 2. Create session — type='core', questionFormat depends on mode
      const { data: sessionData } = await axiosInstance.post(API_PATH.SESSION.CREATE, {
        role: form.role,
        experience: 'Core Subjects',
        topicToFocus: form.topicToFocus,
        type: 'core',
        questionFormat: 'descriptive', // always descriptive — core is theory-based
        questions: generated.map((q) => ({
          question:   q.question,
          answer:     q.answer,
          difficulty: q.difficulty || 'medium',
          subject:    q.subject || null,
        })),
      })

      const createdId = sessionData?.session?._id ?? sessionData?.session?.id
      notifySuccess('Core session created!')
      setShowModal(false)
      fetchSessions()

      if (createdId) {
        // Route based on mode selection
        if (form.mode === 'test') {
          navigate(`/session/${createdId}/test`)
        } else {
          navigate(`/session/${createdId}`)
        }
      }
    } catch (err) {
      notifyError(getErrorMessage(err, 'Failed to create session'))
    } finally {
      setBusy(false)
    }
  }

  // ── delete ─────────────────────────────────────────────────────────────────
  const onDelete = async (id) => {
    try {
      await axiosInstance.delete(API_PATH.SESSION.DELETE(id))
      notifySuccess('Session deleted')
      setSessions((prev) => prev.filter((s) => (s._id ?? s.id) !== id))
    } catch (err) {
      notifyError(getErrorMessage(err, 'Could not delete session'))
    }
  }

  // ── stats ──────────────────────────────────────────────────────────────────
  const totalQuestions = sessions.reduce((s, sess) => s + (sess.questions?.length || 0), 0)

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <AppShell title="Core Subjects" compactHeader>

      {/* ── Stats row ── */}
      <div className="mb-12 grid grid-cols-1 gap-px border border-neutral-800 bg-neutral-800 sm:grid-cols-3">
        {[
          { label: 'CORE_SESSIONS',   value: sessions.length },
          { label: 'TOTAL_QUESTIONS', value: totalQuestions  },
          { label: 'LAST_ACTIVITY',   value: sessions.length ? moment(sessions[0]?.updatedAt).format('MMM D, HH:mm') : '—' },
        ].map((s) => (
          <div key={s.label} className="bg-neutral-950 p-8">
            <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-neutral-400">{s.label}</p>
            <p className="mt-2 text-3xl font-extrabold tracking-tighter text-white">{s.value}</p>
          </div>
        ))}
      </div>

      {/* ── Subject pills legend ── */}
      <div className="mb-8 flex flex-wrap items-center gap-2">
        <span className="text-[9px] font-bold uppercase tracking-widest text-neutral-500 mr-2">Subjects:</span>
        {CORE_SUBJECTS.map((s) => (
          <span key={s} className={`rounded border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${SUBJECT_COLORS[s]}`}>
            {s}
          </span>
        ))}
        <span className={`rounded border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${DOMAIN_COLOR}`}>
          Domain
        </span>
      </div>

      {/* ── Header actions ── */}
      <div className="mb-10 flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-widest text-white">Session Registry</h2>
          <p className="mt-1 text-[10px] font-medium uppercase tracking-wider text-neutral-400">
            OS · DBMS · CN · OOPs · Domain — all in one session.
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-3 bg-white px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-black transition hover:bg-neutral-200"
        >
          <FiPlus size={14} /> New Core Session
        </button>
      </div>

      {/* ── Session list ── */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <FiLoader className="animate-spin text-neutral-600" size={22} />
        </div>
      ) : sessions.length === 0 ? (
        <div className="border border-dashed border-neutral-800 py-20 text-center">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500">
            No core sessions yet. Create one to begin.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {sessions.map((session) => {
            const sid      = session._id ?? session.id
            const qcount   = session.questions?.length || 0
            const breakdown = subjectBreakdown(session.questions || [])
            const domain   = Object.keys(breakdown).find((k) => !CORE_SUBJECTS.includes(k))

            return (
              <div
                key={sid}
                className="overflow-hidden rounded-xl border border-neutral-800 bg-neutral-950"
              >
                <div className="flex flex-col gap-4 px-6 py-5 md:flex-row md:items-center md:justify-between">

                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <p className="text-[9px] font-bold uppercase tracking-widest text-neutral-500">ROLE</p>
                      <span className="text-[9px] text-neutral-600">·</span>
                      <p className="text-[9px] font-bold uppercase tracking-widest text-neutral-500">CORE SUBJECTS</p>
                    </div>

                    <h3 className="truncate text-base font-extrabold uppercase tracking-tight text-white">
                      {session.role}
                    </h3>

                    {/* Subject breakdown pills */}
                    <div className="mt-3 flex flex-wrap gap-2">
                      {CORE_SUBJECTS.map((subj) => (
                        <span
                          key={subj}
                          className={`rounded border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${SUBJECT_COLORS[subj]}`}
                        >
                          {subj} {breakdown[subj] ? `· ${breakdown[subj]}Q` : ''}
                        </span>
                      ))}
                      {domain && (
                        <span className={`rounded border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${DOMAIN_COLOR}`}>
                          {domain} · {breakdown[domain]}Q
                        </span>
                      )}
                    </div>

                    <div className="mt-3 flex flex-wrap gap-4 text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                      <span><span className="text-neutral-600">Total Q: </span><span className="text-neutral-300">{qcount}</span></span>
                      <span><span className="text-neutral-600">Created: </span><span className="text-neutral-300">{moment(session.createdAt).format('MMM D, YYYY')}</span></span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex shrink-0 flex-wrap items-center gap-3">
                    <button
                      onClick={() => onDelete(sid)}
                      className="grid h-9 w-9 place-items-center border border-neutral-800 text-neutral-600 transition hover:border-red-800 hover:text-red-400"
                    >
                      <FiTrash2 size={13} />
                    </button>

                    {/* Preparation — go to session detail */}
                    <button
                      onClick={() => navigate(`/session/${sid}`)}
                      className="flex items-center gap-2 border border-neutral-700 px-5 py-2 text-[10px] font-bold uppercase tracking-widest text-neutral-300 transition hover:border-white hover:text-white"
                    >
                      <FiBookOpen size={12} /> Prepare
                    </button>

                    {/* Test — go to test mode */}
                    <button
                      onClick={() => navigate(`/session/${sid}/test`)}
                      className="flex items-center gap-2 bg-white px-5 py-2 text-[10px] font-bold uppercase tracking-widest text-black transition hover:bg-neutral-200"
                    >
                      <FiZap size={12} /> Test
                      <FiArrowRight size={12} />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ══════════════════════════════════════════
          CREATE MODAL
      ══════════════════════════════════════════ */}
      <Modal
        open={showModal}
        title="NEW CORE SUBJECTS SESSION"
        onClose={() => setShowModal(false)}
      >
        <form onSubmit={onCreateSession} className="space-y-6">

          {/* Role */}
          <div>
            <label className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-neutral-400">
              Role
            </label>
            <select
              required
              className="input-minimal"
              value={form.role}
              onChange={(e) => {
                setForm((prev) => ({
                  ...prev,
                  role: e.target.value,
                  topicToFocus: e.target.value, // default domain = role name
                }))
              }}
            >
              {roles.map((r) => (
                <option key={r.role} value={r.role}>{r.role}</option>
              ))}
            </select>
          </div>

          {/* Domain topic (5th subject) */}
          <div>
            <label className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-neutral-400">
              Domain Subject <span className="text-neutral-600">(5th subject — beside OS, DBMS, CN, OOPs)</span>
            </label>
            <input
              required
              type="text"
              className="input-minimal"
              value={form.topicToFocus}
              onChange={(e) => setForm((prev) => ({ ...prev, topicToFocus: e.target.value }))}
              placeholder="e.g. React, ML, Cloud, Android…"
            />
            {/* Fixed subjects reminder */}
            <div className="mt-3 flex flex-wrap gap-2">
              {CORE_SUBJECTS.map((s) => (
                <span key={s} className={`rounded border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${SUBJECT_COLORS[s]}`}>
                  {s}
                </span>
              ))}
              <span className="text-[9px] font-bold uppercase tracking-widest text-neutral-500 self-center">+</span>
              <span className={`rounded border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${DOMAIN_COLOR}`}>
                {form.topicToFocus || 'Domain'}
              </span>
            </div>
          </div>

          {/* Mode selector — Preparation or Test */}
          <div>
            <label className="mb-3 block text-[10px] font-bold uppercase tracking-widest text-neutral-400">
              Mode
            </label>
            <div className="grid grid-cols-2 gap-3">
              {[
                {
                  value: 'preparation',
                  label: 'Preparation',
                  icon:  FiBookOpen,
                  desc:  'Study Q&A with AI explanations, pin and note questions',
                },
                {
                  value: 'test',
                  label: 'Test',
                  icon:  FiZap,
                  desc:  'Answer questions one by one — AI evaluates your performance',
                },
              ].map(({ value, label, icon: Icon, desc }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setForm((prev) => ({ ...prev, mode: value }))}
                  className={`flex flex-col items-start gap-2 rounded-lg border p-4 text-left transition ${
                    form.mode === value
                      ? value === 'test'
                        ? 'border-violet-600 bg-violet-900/20'
                        : 'border-sky-600 bg-sky-900/20'
                      : 'border-neutral-700 bg-neutral-900 hover:border-neutral-500'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Icon
                      size={14}
                      className={
                        form.mode === value
                          ? value === 'test' ? 'text-violet-400' : 'text-sky-400'
                          : 'text-neutral-400'
                      }
                    />
                    <span className={`text-[11px] font-bold uppercase tracking-widest ${
                      form.mode === value
                        ? value === 'test' ? 'text-violet-300' : 'text-sky-300'
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

          {/* Info note */}
          <div className="rounded-lg border border-neutral-800 bg-neutral-900/50 p-4">
            <div className="flex items-start gap-3">
              <FiLayers size={14} className="mt-0.5 shrink-0 text-neutral-500" />
              <p className="text-[11px] leading-relaxed text-neutral-400">
                Generates <span className="font-bold text-white">{NUMBER_OF_QUESTIONS} questions</span> split across
                {' '}<span className="font-bold text-white">OS, DBMS, CN, OOPs</span>{' '}
                and <span className="font-bold text-rose-400">{form.topicToFocus || 'your domain'}</span>.
                Mix of easy, medium, and hard — all conceptual, no coding.
              </p>
            </div>
          </div>

          <button
            type="submit"
            disabled={busy}
            className="flex w-full items-center justify-center gap-3 bg-white py-3 text-[10px] font-bold uppercase tracking-widest text-black transition hover:bg-neutral-200 disabled:opacity-50"
          >
            {busy ? (
              <>
                <FiLoader className="animate-spin" size={13} />
                Generating questions…
              </>
            ) : (
              <>
                {form.mode === 'test' ? <FiZap size={13} /> : <FiBookOpen size={13} />}
                Generate &amp; {form.mode === 'test' ? 'Start Test' : 'Start Preparation'}
              </>
            )}
          </button>
        </form>
      </Modal>
    </AppShell>
  )
}
