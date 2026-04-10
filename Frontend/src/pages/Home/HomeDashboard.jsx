import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FiPlus,
  FiTrash2,
  FiArrowRight,
  FiClock,
  FiLayers,
  FiTarget,
  FiBriefcase,
} from 'react-icons/fi'
import axiosInstance from '../../utils/axiosInstance'
import { API_PATH } from '../../utils/apiPath'
import { getErrorMessage, normalizeQuestions, parseQuestionsResponse } from '../../utils/helper'
import { notifyError, notifySuccess } from '../../utils/toast'
import AppShell from '../../components/layout/AppShell'
import Modal from '../../components/Modal'
import moment from 'moment'
import { roles } from '../../utils/roles'

const HomeDashboard = () => {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    role: 'Frontend Developer',
    experience: 'Fresher',
    topicToFocus: roles[0]?.topics.join(', ') || '',
    description: '',
  })

  const NUMBER_OF_QUESTIONS = 10

  const [busy, setBusy] = useState(false)
  const [sessions, setSessions] = useState([])
  const [showCreateModal, setShowCreateModal] = useState(false)

  const fetchSessions = async () => {
    try {
      const { data } = await axiosInstance.get(API_PATH.SESSION.GET_ALL)
      setSessions(data.sessions || [])
    } catch (error) {
      notifyError(getErrorMessage(error, 'Unable to fetch sessions'))
    }
  }

  useEffect(() => {
    fetchSessions()
  }, [])

  const onCreateSession = async (e) => {
    e.preventDefault()
    setBusy(true)

    try {
      const questionPayload = {
        role: form.role,
        experience: form.experience,
        topicToFocus: form.topicToFocus,
        numberOfQuestions: NUMBER_OF_QUESTIONS,
      }

      const { data } = await axiosInstance.post(API_PATH.AI.GENERATE_QUESTIONS, questionPayload)
      const generated = normalizeQuestions(parseQuestionsResponse(data))

      const { data: sessionData } = await axiosInstance.post(API_PATH.SESSION.CREATE, {
        role: form.role,
        experience: form.experience,
        topicToFocus: form.topicToFocus,
        description: form.description,
        questions: generated,
      })

      const createdId = sessionData?.session?._id
      notifySuccess('New session created')
      setShowCreateModal(false)
      fetchSessions()

      if (createdId) {
        navigate(`/session/${createdId}`)
      }
    } catch (error) {
      notifyError(getErrorMessage(error, 'Failed to create session'))
    } finally {
      setBusy(false)
    }
  }

  const onDeleteSession = async (id) => {
    try {
      await axiosInstance.delete(API_PATH.SESSION.DELETE(id))
      notifySuccess('Session deleted')
      setSessions((prev) => prev.filter((session) => session._id !== id))
    } catch (error) {
      notifyError(getErrorMessage(error, 'Could not delete session'))
    }
  }

  const totalQuestions = sessions.reduce((sum, s) => sum + (s.questions?.length || 0), 0)

  return (
    <AppShell title="Workspace" compactHeader>
      {/* ── Stats Summary ── */}
      <div className="mb-12 grid grid-cols-1 gap-px bg-neutral-200 dark:bg-neutral-800 sm:grid-cols-3 border border-neutral-200 dark:border-neutral-800">
        {[
          { label: 'ACTIVE_SESSIONS', value: sessions.length },
          { label: 'TOTAL_QUERIES', value: totalQuestions },
          { label: 'LAST_SYNCHRONIZED', value: sessions.length ? moment(sessions[0]?.updatedAt).format('HH:mm') : '—' },
        ].map((stat) => (
          <div key={stat.label} className="bg-white p-8 dark:bg-neutral-950">
            <p className="text-[10px] font-bold tracking-[0.2em] text-neutral-400 uppercase">{stat.label}</p>
            <p className="mt-2 text-3xl font-bold tracking-tighter text-black dark:text-white">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* ── Header Actions ── */}
      <div className="mb-10 flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-widest text-black dark:text-white">Session Registry</h2>
          <p className="mt-1 text-[10px] font-medium uppercase tracking-wider text-neutral-400">
            Current active interview preparation protocols.
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-3 bg-black px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-white transition hover:bg-neutral-800 dark:bg-white dark:text-black dark:hover:bg-neutral-200"
        >
          <FiPlus size={14} />
          Create New Protocol
        </button>
      </div>

      {/* ── Registry Grid ── */}
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {sessions.map((session) => {
          const totalQA = session?.questions?.length || 0
          const topics = session.topicsToFocus || session.topicToFocus || '—'
          const experience = session.experince || session.experience || '—'

          return (
            <article
              key={session._id}
              className="group border border-neutral-100 bg-white p-8 transition-colors hover:bg-neutral-50 dark:border-neutral-900 dark:bg-neutral-950 dark:hover:bg-neutral-900"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-[10px] font-bold tracking-widest text-neutral-400 uppercase">
                    ROLE_SPECIFICATION
                  </p>
                  <h3 className="mt-2 truncate text-lg font-bold tracking-tight text-black dark:text-white">
                    {session.role}
                  </h3>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button
                    onClick={() => onDeleteSession(session._id)}
                    className="grid h-8 w-8 place-items-center border border-neutral-200 text-neutral-400 transition hover:border-black hover:text-black dark:border-neutral-800 dark:hover:border-white dark:hover:text-white"
                  >
                    <FiTrash2 size={12} />
                  </button>
                </div>
              </div>

              <div className="mt-8 space-y-3">
                <div className="flex items-center justify-between text-[10px] font-bold tracking-widest uppercase">
                  <span className="text-neutral-400">FOCUS</span>
                  <span className="truncate text-black dark:text-white">{topics}</span>
                </div>
                <div className="flex items-center justify-between text-[10px] font-bold tracking-widest uppercase">
                  <span className="text-neutral-400">EXPERIENCE</span>
                  <span className="text-black dark:text-white">{experience}</span>
                </div>
                <div className="flex items-center justify-between text-[10px] font-bold tracking-widest uppercase">
                  <span className="text-neutral-400">QUERIES</span>
                  <span className="text-black dark:text-white">{totalQA} UNITS</span>
                </div>
              </div>

              <button
                onClick={() => navigate(`/session/${session._id}`)}
                className="mt-10 flex w-full items-center justify-between border border-black px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-black transition hover:bg-black hover:text-white dark:border-white dark:text-white dark:hover:bg-white dark:hover:text-black"
              >
                Launch Session
                <FiArrowRight size={14} />
              </button>
            </article>
          )
        })}

        {sessions.length === 0 && (
          <div className="col-span-full border border-dashed border-neutral-200 bg-white py-20 text-center dark:border-neutral-800 dark:bg-neutral-950">
            <p className="text-[10px] font-bold tracking-[0.2em] text-neutral-400 uppercase">
              No active protocols detected.
            </p>
          </div>
        )}
      </div>

      {/* ── Create Modal ── */}
      <Modal open={showCreateModal} title="INITIALIZE PROTOCOL" onClose={() => setShowCreateModal(false)}>
        <form onSubmit={onCreateSession} className="space-y-6">
          <div>
            <label className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-neutral-400">
              Role Specification
            </label>
            <select
              required
              className="input-minimal"
              value={form.role}
              onChange={(e) => {
                const selectedRole = roles.find((r) => r.role === e.target.value)
                setForm((prev) => ({
                  ...prev,
                  role: e.target.value,
                  topicToFocus: selectedRole ? selectedRole.topics.join(', ') : prev.topicToFocus,
                }))
              }}
            >
              {roles.map((r) => (
                <option key={r.role} value={r.role}>{r.role}</option>
              ))}
            </select>
          </div>

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
              <option value="Fresher">Fresher</option>
              <option value="Intermediate">Intermediate</option>
              <option value="Senior">Senior</option>
            </select>
          </div>

          <div>
            <label className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-neutral-400">
              Targeted Topics <span className="font-medium lowercase tracking-normal opacity-50">(auto-filled · editable)</span>
            </label>
            <input
              required
              className="input-minimal"
              placeholder="E.G. DISTRIBUTED SYSTEMS"
              value={form.topicToFocus}
              onChange={(e) => setForm((prev) => ({ ...prev, topicToFocus: e.target.value }))}
            />
          </div>

          <div>
            <label className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-neutral-400">
              Operational Notes (Optional)
            </label>
            <textarea
              rows={3}
              className="input-minimal resize-none"
              placeholder="ADDITIONAL CONTEXT..."
              value={form.description}
              onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
            />
          </div>

          <button
            disabled={busy}
            type="submit"
            className="flex w-full items-center justify-center gap-4 bg-black px-6 py-4 text-[11px] font-bold uppercase tracking-[0.2em] text-white transition hover:bg-neutral-800 dark:bg-white dark:text-black dark:hover:bg-neutral-200"
          >
            {busy ? 'SYNTHESIZING...' : 'Initiate Session'}
          </button>
        </form>
      </Modal>
    </AppShell>
  )
}

export default HomeDashboard
