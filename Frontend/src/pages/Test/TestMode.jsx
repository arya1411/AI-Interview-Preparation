import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { FiArrowRight, FiLoader, FiSend, FiCheckCircle } from 'react-icons/fi'
import AppShell from '../../components/layout/AppShell'
import axiosInstance from '../../utils/axiosInstance'
import { API_PATH } from '../../utils/apiPath'
import { getErrorMessage } from '../../utils/helper'
import { notifyError } from '../../utils/toast'

const DIFFICULTY_BADGE = {
  easy:   'bg-emerald-900/30 text-emerald-400 border border-emerald-800',
  medium: 'bg-yellow-900/30  text-yellow-400  border border-yellow-800',
  hard:   'bg-red-900/30     text-red-400     border border-red-800',
}

const OPTION_LABELS = ['A', 'B', 'C', 'D']

export default function TestMode() {
  const { sessionId } = useParams()
  const navigate = useNavigate()

  // ── state ─────────────────────────────────────────────────────────────────
  const [phase, setPhase]         = useState('loading') // loading | test | submitting
  const [attemptId, setAttemptId] = useState(null)
  const [questions, setQuestions] = useState([])         // { answerId, question, difficulty, orderIndex, options[], correctOption }
  const [questionFormat, setQuestionFormat] = useState('descriptive') // 'descriptive' | 'mcq'
  const [current, setCurrent]     = useState(0)

  // descriptive state
  const [answers, setAnswers]     = useState({})          // { answerId: string }
  const [draft, setDraft]         = useState('')

  // MCQ state
  const [selected, setSelected]   = useState({})          // { answerId: optionIndex }

  const [submitted, setSubmitted] = useState({})          // { answerId: true } — locked

  const textareaRef = useRef(null)
  const bottomRef   = useRef(null)

  // ── start the test ────────────────────────────────────────────────────────
  useEffect(() => {
    const start = async () => {
      try {
        const { data } = await axiosInstance.post(API_PATH.TEST.START(sessionId))
        setAttemptId(data.attempt.id)
        setQuestions(data.questions)
        setQuestionFormat(data.attempt.questionFormat || 'descriptive')
        setPhase('test')
      } catch (err) {
        notifyError(getErrorMessage(err, 'Could not start test'))
        navigate(`/session/${sessionId}`)
      }
    }
    start()
  }, [sessionId, navigate])

  // ── focus textarea on question change (descriptive only) ──────────────────
  useEffect(() => {
    if (phase === 'test' && questionFormat === 'descriptive') {
      setDraft(answers[questions[current]?.answerId] ?? '')
      setTimeout(() => textareaRef.current?.focus(), 80)
    }
  }, [current, phase, questionFormat])

  // ── scroll to bottom ──────────────────────────────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [current, submitted])

  // ── submit current question and advance ───────────────────────────────────
  const handleSubmit = () => {
    const q = questions[current]
    if (!q) return
    if (questionFormat === 'mcq') {
      // allow submitting without selecting (counts as skipped)
      setSubmitted((prev) => ({ ...prev, [q.answerId]: true }))
    } else {
      setAnswers((prev) => ({ ...prev, [q.answerId]: draft.trim() }))
      setSubmitted((prev) => ({ ...prev, [q.answerId]: true }))
    }
    if (current < questions.length - 1) setCurrent((c) => c + 1)
  }

  const handleSkip = () => {
    const q = questions[current]
    if (!q) return
    setSubmitted((prev) => ({ ...prev, [q.answerId]: true }))
    setCurrent((c) => c + 1)
    setDraft('')
  }

  // ── Ctrl/Cmd+Enter for descriptive ────────────────────────────────────────
  const handleKeyDown = (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault()
      handleSubmit()
    }
  }

  // ── final submit ──────────────────────────────────────────────────────────
  const handleFinish = async () => {
    const q = questions[current]
    const finalAnswers  = { ...answers }
    const finalSelected = { ...selected }

    // lock in last answer if not yet submitted
    if (q && !submitted[q.answerId]) {
      if (questionFormat === 'descriptive') finalAnswers[q.answerId] = draft.trim()
    }

    setPhase('submitting')
    try {
      const payload = questions.map((q) => ({
        answerId: q.answerId,
        userAnswer: finalAnswers[q.answerId] ?? '',
        ...(questionFormat === 'mcq' ? { selectedOption: finalSelected[q.answerId] ?? null } : {}),
      }))
      await axiosInstance.post(API_PATH.TEST.SUBMIT(attemptId), { answers: payload })
      navigate(`/test/${attemptId}/result`)
    } catch (err) {
      notifyError(getErrorMessage(err, 'Evaluation failed. Please try again.'))
      setPhase('test')
    }
  }

  const answeredCount = Object.keys(submitted).length
  const allAnswered   = questions.length > 0 &&
    questions.every((q) => submitted[q.answerId] !== undefined)

  // ── screens ───────────────────────────────────────────────────────────────
  if (phase === 'loading') {
    return (
      <AppShell title="Test Mode" compactHeader>
        <div className="flex h-[60vh] flex-col items-center justify-center gap-3">
          <FiLoader className="animate-spin text-neutral-500" size={24} />
          <p className="text-[11px] font-bold uppercase tracking-widest text-neutral-500">
            Initialising test session…
          </p>
        </div>
      </AppShell>
    )
  }

  if (phase === 'submitting') {
    return (
      <AppShell title="Test Mode" compactHeader>
        <div className="flex h-[60vh] flex-col items-center justify-center gap-3">
          <FiLoader className="animate-spin text-neutral-500" size={24} />
          <p className="text-[11px] font-bold uppercase tracking-widest text-neutral-500">
            {questionFormat === 'mcq' ? 'Calculating your score…' : 'AI is evaluating your answers…'}
          </p>
          {questionFormat === 'descriptive' && (
            <p className="text-[10px] text-neutral-600">This may take a few seconds</p>
          )}
        </div>
      </AppShell>
    )
  }

  const currentQ  = questions[current]
  const isMCQ     = questionFormat === 'mcq'
  const isLastQ   = current === questions.length - 1

  return (
    <AppShell title="Test Mode" compactHeader>

      {/* ── Header ── */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-bold uppercase tracking-widest text-white">Interview Test</h2>
            <span className={`rounded px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider border ${
              isMCQ
                ? 'border-violet-800 bg-violet-900/20 text-violet-400'
                : 'border-sky-800 bg-sky-900/20 text-sky-400'
            }`}>
              {isMCQ ? 'MCQ' : 'Descriptive'}
            </span>
          </div>
          <p className="mt-1 text-[10px] font-medium uppercase tracking-wider text-neutral-400">
            {isMCQ ? 'Select the best answer for each question' : 'Answer each question in your own words'}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">Progress</p>
          <p className="mt-1 text-2xl font-extrabold tracking-tighter text-white">
            {answeredCount}
            <span className="text-base font-bold text-neutral-500"> / {questions.length}</span>
          </p>
        </div>
      </div>

      {/* ── Progress bar ── */}
      <div className="mb-10 h-1 w-full rounded-full bg-neutral-800">
        <motion.div
          className={`h-1 rounded-full ${isMCQ ? 'bg-violet-500' : 'bg-white'}`}
          animate={{ width: `${questions.length ? (answeredCount / questions.length) * 100 : 0}%` }}
          transition={{ duration: 0.4 }}
        />
      </div>

      {/* ── Chat thread — answered questions ── */}
      <div className="mb-6 space-y-8">
        <AnimatePresence initial={false}>
          {questions.slice(0, current).map((q, idx) => (
            <motion.div
              key={q.answerId}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className="space-y-3"
            >
              {/* Question bubble */}
              <div className="flex gap-3">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center bg-white text-[10px] font-extrabold text-black">Q</div>
                <div className="flex-1 rounded-xl border border-neutral-800 bg-neutral-900 px-5 py-4">
                  <div className="mb-2 flex items-center gap-2">
                    <span className="text-[9px] font-bold uppercase tracking-widest text-neutral-500">Question {idx + 1}</span>
                    <span className={`rounded px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${DIFFICULTY_BADGE[q.difficulty] || DIFFICULTY_BADGE.medium}`}>
                      {q.difficulty}
                    </span>
                  </div>
                  <p className="text-[13px] font-bold leading-relaxed uppercase text-white">{q.question}</p>
                </div>
              </div>

              {/* Answer bubble */}
              <div className="flex justify-end gap-3">
                <div className="max-w-[80%] rounded-xl border border-neutral-700 bg-neutral-800 px-5 py-4">
                  <span className="mb-2 block text-[9px] font-bold uppercase tracking-widest text-neutral-400">Your Answer</span>
                  {isMCQ ? (
                    selected[q.answerId] != null ? (
                      <p className="text-[12px] leading-relaxed text-neutral-200">
                        <span className={`mr-2 font-extrabold ${isMCQ ? 'text-violet-400' : 'text-white'}`}>
                          {OPTION_LABELS[selected[q.answerId]]}.
                        </span>
                        {q.options?.[selected[q.answerId]]?.replace(/^[A-D]\.\s*/i, '') ?? ''}
                      </p>
                    ) : (
                      <p className="text-[12px] italic text-neutral-500">Skipped</p>
                    )
                  ) : (
                    answers[q.answerId]
                      ? <p className="text-[12px] leading-relaxed text-neutral-200 whitespace-pre-wrap">{answers[q.answerId]}</p>
                      : <p className="text-[12px] italic text-neutral-500">Skipped</p>
                  )}
                </div>
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded border border-neutral-700 bg-neutral-800 text-[10px] font-extrabold text-neutral-300">U</div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* ── Current active question ── */}
        {currentQ && (
          <motion.div
            key={currentQ.answerId}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-4"
          >
            {/* Question bubble — highlighted */}
            <div className="flex gap-3">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center bg-white text-[10px] font-extrabold text-black">Q</div>
              <div className={`flex-1 rounded-xl border px-5 py-4 bg-neutral-950 ${isMCQ ? 'border-violet-600' : 'border-white'}`}>
                <div className="mb-2 flex items-center gap-2">
                  <span className="text-[9px] font-bold uppercase tracking-widest text-neutral-400">Question {current + 1}</span>
                  <span className={`rounded px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${DIFFICULTY_BADGE[currentQ.difficulty] || DIFFICULTY_BADGE.medium}`}>
                    {currentQ.difficulty}
                  </span>
                </div>
                <p className="text-[13px] font-bold leading-relaxed uppercase text-white">{currentQ.question}</p>
              </div>
            </div>

            {/* ── MCQ options ── */}
            {isMCQ && (
              <div className="ml-10 space-y-3">
                {(currentQ.options || []).map((opt, optIdx) => {
                  const isChosen = selected[currentQ.answerId] === optIdx
                  return (
                    <button
                      key={optIdx}
                      type="button"
                      onClick={() => setSelected((prev) => ({ ...prev, [currentQ.answerId]: optIdx }))}
                      className={`flex w-full items-center gap-4 rounded-lg border px-5 py-4 text-left transition ${
                        isChosen
                          ? 'border-violet-500 bg-violet-900/25 text-white'
                          : 'border-neutral-700 bg-neutral-900 text-neutral-300 hover:border-neutral-500 hover:bg-neutral-800'
                      }`}
                    >
                      <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded border text-[11px] font-extrabold ${
                        isChosen ? 'border-violet-500 bg-violet-500 text-white' : 'border-neutral-600 text-neutral-400'
                      }`}>
                        {OPTION_LABELS[optIdx]}
                      </span>
                      <span className="text-[13px] leading-relaxed">
                        {opt.replace(/^[A-D]\.\s*/i, '')}
                      </span>
                    </button>
                  )
                })}

                <div className="flex items-center justify-between pt-2">
                  <p className="text-[9px] text-neutral-600">Click an option to select it</p>
                  <div className="flex items-center gap-3">
                    {!isLastQ && (
                      <button onClick={handleSkip} className="px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-neutral-500 transition hover:text-neutral-300">
                        Skip
                      </button>
                    )}
                    {isLastQ ? (
                      <button onClick={handleFinish} className="flex items-center gap-2 bg-violet-600 px-5 py-2 text-[10px] font-bold uppercase tracking-widest text-white transition hover:bg-violet-500">
                        <FiSend size={12} /> Submit &amp; Score
                      </button>
                    ) : (
                      <button onClick={handleSubmit} className="flex items-center gap-2 bg-violet-600 px-5 py-2 text-[10px] font-bold uppercase tracking-widest text-white transition hover:bg-violet-500">
                        Next <FiArrowRight size={12} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ── Descriptive textarea ── */}
            {!isMCQ && (
              <div className="ml-10">
                <textarea
                  ref={textareaRef}
                  rows={5}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type your answer here… (Ctrl+Enter to submit)"
                  className="w-full resize-none rounded-lg border border-neutral-700 bg-neutral-900 px-4 py-3 text-[13px] leading-relaxed text-neutral-100 placeholder-neutral-600 outline-none transition focus:border-neutral-400"
                />
                <div className="mt-3 flex items-center justify-between">
                  <p className="text-[9px] text-neutral-600">Leave blank to skip</p>
                  <div className="flex items-center gap-3">
                    {!isLastQ && (
                      <button onClick={handleSkip} className="px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-neutral-500 transition hover:text-neutral-300">
                        Skip
                      </button>
                    )}
                    {isLastQ ? (
                      <button onClick={handleFinish} className="flex items-center gap-2 bg-white px-5 py-2 text-[10px] font-bold uppercase tracking-widest text-black transition hover:bg-neutral-200">
                        <FiSend size={12} /> Submit &amp; Evaluate
                      </button>
                    ) : (
                      <button onClick={handleSubmit} className="flex items-center gap-2 bg-white px-5 py-2 text-[10px] font-bold uppercase tracking-widest text-black transition hover:bg-neutral-200">
                        Next <FiArrowRight size={12} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* ── All answered safety net ── */}
        {allAnswered && !currentQ && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center gap-4 py-12">
            <FiCheckCircle size={36} className="text-emerald-500" />
            <p className="text-[11px] font-bold uppercase tracking-widest text-neutral-400">All questions answered</p>
            <button
              onClick={handleFinish}
              className={`flex items-center gap-2 px-8 py-3 text-[10px] font-bold uppercase tracking-widest text-black transition ${
                isMCQ ? 'bg-violet-500 text-white hover:bg-violet-400' : 'bg-white hover:bg-neutral-200'
              }`}
            >
              <FiSend size={12} />
              {isMCQ ? 'Submit & Score' : 'Submit & Evaluate'}
            </button>
          </motion.div>
        )}

        <div ref={bottomRef} />
      </div>
    </AppShell>
  )
}
