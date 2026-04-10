import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import {
  FiChevronDown,
  FiChevronUp,
  FiCpu,
  FiBookmark,
  FiX,
  FiCopy,
  FiCheck,
  FiCode,
  FiEdit3,
} from 'react-icons/fi'
import axiosInstance from '../../utils/axiosInstance'
import { API_PATH } from '../../utils/apiPath'
import AppShell from '../../components/layout/AppShell'
import Modal from '../../components/Modal'
import { getErrorMessage, normalizeQuestions, parseQuestionsResponse } from '../../utils/helper'
import { notifyError, notifySuccess } from '../../utils/toast'

const splitExplanation = (text = '') => {
  const cleaned = text.replace(/```[\s\S]*?```/g, '').trim()
  const paragraphs = cleaned
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)

  return {
    explanation: paragraphs[0] || 'No explanation available.',
    keyPoints: paragraphs.slice(1, 4),
    example: paragraphs.slice(4).join(' ') || '',
  }
}

const parseCodeBlocks = (text = '') => {
  const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g
  const blocks = []
  let match = codeBlockRegex.exec(text)

  while (match) {
    blocks.push({ language: match[1] || 'javascript', code: match[2] || '' })
    match = codeBlockRegex.exec(text)
  }

  return blocks
}

const SessionDetail = () => {
  const { id } = useParams()
  const [session, setSession] = useState(null)
  const [openQuestions, setOpenQuestions] = useState({})
  const [learnMoreQuestionId, setLearnMoreQuestionId] = useState(null)
  const [explanations, setExplanations] = useState({})
  const [loadingExplain, setLoadingExplain] = useState({})
  const [generatingMore, setGeneratingMore] = useState(false)
  const [copiedBlockId, setCopiedBlockId] = useState(null)
  const [noteDialog, setNoteDialog] = useState({ open: false, questionId: null, text: '' })

  const fetchSession = useCallback(async () => {
    try {
      const { data } = await axiosInstance.get(API_PATH.SESSION.GET_ONE(id))
      const payload = data.session || {}
      setSession({ ...payload, questions: normalizeQuestions(payload.questions || []) })
    } catch (error) {
      notifyError(getErrorMessage(error, 'Failed to load session'))
    }
  }, [id])

  const toggleQuestion = (questionId) => {
    setOpenQuestions((prev) => {
      const willOpen = !prev[questionId]
      if (!willOpen && learnMoreQuestionId === questionId) {
        setLearnMoreQuestionId(null)
      }
      return { ...prev, [questionId]: willOpen }
    })
  }

  useEffect(() => {
    fetchSession()
  }, [fetchSession])

  const onPinQuestion = async (questionId) => {
    try {
      await axiosInstance.post(API_PATH.QUESTION.PIN(questionId))
      fetchSession()
      notifySuccess('Pin updated')
    } catch (error) {
      notifyError(getErrorMessage(error, 'Could not update pin'))
    }
  }

  const onSaveNote = async (questionId, note) => {
    try {
      await axiosInstance.post(API_PATH.QUESTION.NOTE(questionId), { note })
      fetchSession()
      notifySuccess('Note saved')
    } catch (error) {
      notifyError(getErrorMessage(error, 'Could not save note'))
    }
  }

  const onGenerateMore = async () => {
    if (!session) return
    setGeneratingMore(true)
    try {
      const { data: aiData } = await axiosInstance.post(API_PATH.AI.GENERATE_QUESTIONS, {
        role: session.role,
        experience: session.experince || session.experience || 0,
        topicToFocus: session.topicsToFocus || session.topicToFocus || '',
        numberOfQuestions: 10,
      })
      const generated = normalizeQuestions(parseQuestionsResponse(aiData))
      await axiosInstance.post(API_PATH.QUESTION.ADD_TO_SESSION, {
        sessionId: id,
        questions: generated,
      })
      await fetchSession()
      notifySuccess('10 more questions added!')
    } catch (error) {
      notifyError(getErrorMessage(error, 'Could not generate more questions'))
    } finally {
      setGeneratingMore(false)
    }
  }

  const onExplain = async (questionId, topic) => {
    if (explanations[questionId]) return

    setLoadingExplain((prev) => ({ ...prev, [questionId]: true }))
    try {
      const { data } = await axiosInstance.post(API_PATH.AI.GENERATE_EXPLANATION, { topic })
      setExplanations((prev) => ({ ...prev, [questionId]: data.explanation || 'No explanation available' }))
    } catch (error) {
      notifyError(getErrorMessage(error, 'Could not generate explanation'))
    } finally {
      setLoadingExplain((prev) => ({ ...prev, [questionId]: false }))
    }
  }

  const onLearnMore = async (questionId, topic) => {
    if (!openQuestions[questionId]) {
      setOpenQuestions((prev) => ({ ...prev, [questionId]: true }))
    }
    await onExplain(questionId, topic)
    setLearnMoreQuestionId(questionId)
  }

  const onCopyCode = async (code, blockId) => {
    try {
      await navigator.clipboard.writeText(code)
      setCopiedBlockId(blockId)
      setTimeout(() => setCopiedBlockId(null), 1400)
    } catch (error) {
      notifyError('Unable to copy code')
    }
  }

  const openNoteDialog = (question) => {
    setNoteDialog({
      open: true,
      questionId: question._id,
      text: question.note || '',
    })
  }

  const closeNoteDialog = () => {
    setNoteDialog({ open: false, questionId: null, text: '' })
  }

  const saveNoteFromDialog = async () => {
    if (!noteDialog.questionId) return
    await onSaveNote(noteDialog.questionId, noteDialog.text)
    closeNoteDialog()
  }

  const topics = session?.topicsToFocus || session?.topicToFocus || '—'
  const experience = session?.experince || session?.experience || '—'
  const questionCount = session?.questions?.length || 0
  const selectedIntelQuestion = (session?.questions || []).find((q) => q._id === learnMoreQuestionId)
  const selectedExplanation = selectedIntelQuestion ? explanations[selectedIntelQuestion._id] || '' : ''
  const selectedParsed = splitExplanation(selectedExplanation)
  const selectedCodeBlocks = parseCodeBlocks(selectedExplanation)
  const selectedIntelLoading = selectedIntelQuestion ? Boolean(loadingExplain[selectedIntelQuestion._id]) : false

  return (
    <AppShell title="Session Logs" subtitle={`ID: ${id?.slice(-8).toUpperCase()}`}>
      {/* ── Header Summary ── */}
      <div className="mb-12 border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950">
        <div className="flex flex-col items-start gap-8 p-10 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-[10px] font-bold tracking-[0.2em] text-neutral-400 uppercase">
              OPERATIONAL_ROLE
            </p>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-black dark:text-white uppercase">
              {session?.role || '...'}
            </h2>
          </div>

          <div className="flex flex-wrap gap-4">
            <div className="border border-neutral-100 px-5 py-3 dark:border-neutral-900">
              <p className="text-[9px] font-bold tracking-widest text-neutral-400 uppercase">Focus</p>
              <p className="mt-1 text-xs font-bold text-black dark:text-white uppercase">{topics}</p>
            </div>
            <div className="border border-neutral-100 px-5 py-3 dark:border-neutral-900">
              <p className="text-[9px] font-bold tracking-widest text-neutral-400 uppercase">Exp</p>
              <p className="mt-1 text-xs font-bold text-black dark:text-white uppercase">{experience}</p>
            </div>
            <div className="border border-neutral-100 px-5 py-3 dark:border-neutral-900">
              <p className="text-[9px] font-bold tracking-widest text-neutral-400 uppercase">Units</p>
              <p className="mt-1 text-xs font-bold text-black dark:text-white uppercase">{questionCount} Q&A</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Question Log + Intel Panel ── */}
      <div className={`grid gap-6 ${learnMoreQuestionId ? 'xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.68fr)]' : 'grid-cols-1'}`}>
        <div>
          <div className="space-y-px bg-neutral-100 dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-900">
          {(session?.questions || []).map((q, index) => {
            const isOpen = Boolean(openQuestions[q._id])
            const isIntelOpenForRow = learnMoreQuestionId === q._id

            return (
              <article
                key={q._id || `${q.question}-${index}`}
                className="bg-white dark:bg-neutral-950"
              >
                <div className="group p-8 transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-900">
                  <button
                    type="button"
                    onClick={() => toggleQuestion(q._id)}
                    className="flex flex-1 items-center gap-6 text-left"
                  >
                    <span className="text-xs font-bold tracking-widest text-neutral-300 dark:text-neutral-700">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <span className="flex-1 text-sm font-bold leading-tight tracking-tight text-black dark:text-white uppercase">
                      {q.question}
                    </span>
                    <div className="flex shrink-0 items-center gap-4">
                      {q.isPinned && <FiBookmark size={14} className="text-black dark:text-white" />}
                      <span className="text-neutral-300 transition group-hover:text-black dark:group-hover:text-white">
                        {isOpen ? <FiChevronUp size={16} /> : <FiChevronDown size={16} />}
                      </span>
                    </div>
                  </button>
                </div>

                <AnimatePresence>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="border-t border-neutral-100 px-8 pb-10 pt-8 dark:border-neutral-900">
                        <div className="mb-8 flex flex-wrap gap-4">
                          <button
                            onClick={() => onPinQuestion(q._id)}
                            className={`border px-4 py-2 text-[10px] font-bold uppercase tracking-widest transition ${
                              q.isPinned
                                ? 'border-black bg-black text-white dark:border-white dark:bg-white dark:text-black'
                                : 'border-neutral-200 text-neutral-500 hover:border-black hover:text-black dark:border-neutral-800 dark:text-neutral-400 dark:hover:border-white dark:hover:text-white'
                            }`}
                          >
                            {q.isPinned ? 'Pinned' : 'Pin'}
                          </button>
                          <button
                            onClick={() => onLearnMore(q._id, q.question)}
                            disabled={loadingExplain[q._id]}
                            className={`flex items-center gap-2 px-4 py-2 text-[10px] font-bold uppercase tracking-widest transition ${
                              isIntelOpenForRow
                                ? 'border border-black bg-black text-white dark:border-white dark:bg-white dark:text-black'
                                : 'border border-neutral-200 text-neutral-700 hover:border-black hover:text-black dark:border-neutral-800 dark:text-neutral-300 dark:hover:border-white dark:hover:text-white'
                            }`}
                          >
                            <FiCpu size={12} />
                            {loadingExplain[q._id] ? 'Loading...' : 'Learn More'}
                          </button>
                        </div>

                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="border border-neutral-100 bg-neutral-50 p-6 dark:border-neutral-900 dark:bg-neutral-900/50"
                        >
                          <p className="mb-4 text-[10px] font-bold tracking-widest text-neutral-400 uppercase">Core Response</p>
                          <p className="text-sm font-medium leading-relaxed tracking-wide text-neutral-700 dark:text-neutral-300">
                            {q.answer}
                          </p>
                        </motion.div>

                        <div className="mt-8 flex items-center justify-end">
                          <button
                            type="button"
                            onClick={() => openNoteDialog(q)}
                            className="flex items-center gap-2 border border-neutral-200 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-neutral-600 transition hover:border-black hover:text-black dark:border-neutral-800 dark:text-neutral-300 dark:hover:border-white dark:hover:text-white"
                          >
                            <FiEdit3 size={12} />
                            Add Note
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </article>
            )
          })}
          </div>

          <div className="mt-8 flex justify-end">
            <button
              onClick={onGenerateMore}
              disabled={generatingMore}
              className="flex items-center gap-3 border border-black px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-black transition hover:bg-black hover:text-white dark:border-white dark:text-white dark:hover:bg-white dark:hover:text-black disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {generatingMore ? 'Generating...' : 'Generate More'}
            </button>
          </div>
        </div>

        {learnMoreQuestionId && (
          <aside className="border border-neutral-100 bg-white p-5 shadow-[0_10px_30px_rgba(0,0,0,0.04)] dark:border-neutral-900 dark:bg-neutral-950 dark:shadow-none xl:sticky xl:top-6 xl:max-h-[calc(100vh-7rem)] xl:overflow-auto">
            <div className="mb-6 flex items-start justify-between gap-4 border-b border-neutral-100 pb-4 dark:border-neutral-900">
              <div>
                <p className="text-[10px] font-bold tracking-widest uppercase text-neutral-400">Detailed Intel</p>
                <h3 className="mt-2 text-sm font-bold uppercase leading-tight text-black dark:text-white">
                  {selectedIntelQuestion?.question || 'Question Analysis'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setLearnMoreQuestionId(null)}
                className="border border-neutral-200 p-2 text-neutral-500 transition hover:border-black hover:text-black dark:border-neutral-800 dark:text-neutral-400 dark:hover:border-white dark:hover:text-white"
                aria-label="Close intel panel"
              >
                <FiX size={14} />
              </button>
            </div>

            {selectedIntelLoading && (
              <p className="text-xs font-bold uppercase tracking-widest text-neutral-400">Synthesizing analysis...</p>
            )}

            {!selectedIntelLoading && !selectedExplanation && (
              <p className="text-sm text-neutral-500 dark:text-neutral-400">No intel generated yet for this question.</p>
            )}

            {!selectedIntelLoading && selectedExplanation && (
              <div className="space-y-8">
                <div>
                  <p className="text-[10px] font-bold tracking-widest uppercase text-neutral-400">Analysis Summary</p>
                  <p className="mt-4 text-sm font-medium leading-relaxed tracking-wide text-neutral-700 dark:text-neutral-300">
                    {selectedParsed.explanation}
                  </p>
                </div>

                {selectedParsed.keyPoints.length > 0 && (
                  <div>
                    <p className="text-[10px] font-bold tracking-widest uppercase text-neutral-400">Critical Data points</p>
                    <div className="mt-4 space-y-4">
                      {selectedParsed.keyPoints.map((point) => (
                        <div key={point} className="flex gap-4">
                          <div className="mt-1.5 h-1 w-4 shrink-0 bg-black dark:bg-white" />
                          <p className="text-xs font-bold uppercase tracking-wide text-neutral-600 dark:text-neutral-400">{point}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedCodeBlocks.map((block, bIdx) => (
                  <div key={bIdx}>
                    <p className="mb-4 text-[10px] font-bold tracking-widest uppercase text-neutral-400">Implementation Schema</p>
                    <div className="overflow-hidden rounded-lg border border-neutral-200 dark:border-neutral-800">
                      <div className="flex items-center justify-between border-b border-neutral-200 bg-neutral-100 px-4 py-2 dark:border-neutral-800 dark:bg-neutral-900">
                        <div className="flex items-center gap-2 text-[11px] font-bold tracking-widest text-neutral-700 uppercase dark:text-neutral-300">
                          <FiCode size={13} />
                          {block.language || 'code'}
                        </div>
                        <button
                          type="button"
                          onClick={() => onCopyCode(block.code, `${selectedIntelQuestion?._id}-${bIdx}`)}
                          className="text-neutral-500 transition hover:text-black dark:text-neutral-400 dark:hover:text-white"
                          aria-label="Copy code"
                        >
                          {copiedBlockId === `${selectedIntelQuestion?._id}-${bIdx}` ? <FiCheck size={14} /> : <FiCopy size={14} />}
                        </button>
                      </div>

                      <SyntaxHighlighter
                        language={block.language || 'javascript'}
                        style={oneDark}
                        wrapLongLines
                        customStyle={{
                          borderRadius: 0,
                          margin: 0,
                          background: '#0f1117',
                          padding: '16px',
                          fontSize: '12px',
                          lineHeight: 1.6,
                          border: 'none',
                        }}
                        codeTagProps={{
                          style: {
                            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                            background: 'transparent',
                          },
                        }}
                      >
                        {block.code}
                      </SyntaxHighlighter>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </aside>
        )}
      </div>

      <Modal open={noteDialog.open} title="Add Note" onClose={closeNoteDialog}>
        <div className="space-y-6">
          <textarea
            rows={6}
            className="input-minimal resize-none"
            placeholder="Write your note..."
            value={noteDialog.text}
            onChange={(e) => setNoteDialog((prev) => ({ ...prev, text: e.target.value }))}
          />
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={closeNoteDialog}
              className="border border-neutral-200 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-neutral-600 transition hover:border-black hover:text-black dark:border-neutral-800 dark:text-neutral-300 dark:hover:border-white dark:hover:text-white"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={saveNoteFromDialog}
              className="bg-black px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-white transition hover:bg-neutral-800 dark:bg-white dark:text-black dark:hover:bg-neutral-200"
            >
              Save Note
            </button>
          </div>
        </div>
      </Modal>
    </AppShell>
  )
}

export default SessionDetail
