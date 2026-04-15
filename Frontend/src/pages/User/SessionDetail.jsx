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

const stripMarkdownCodeBlocks = (text = '') => text.replace(/```[\s\S]*?```/g, '').trim()

const sanitizeCoreResponse = (text = '') => {
  const withoutFencedCode = stripMarkdownCodeBlocks(text)

  const inlineCodeStartRegex = /(?:^|[\s:([{])(?:const|let|var|function|class|import|export|require\s*\(|console\.log\s*\(|app\.(?:get|post|put|delete|listen)|SELECT|INSERT|UPDATE|DELETE|FROM|RUN|CMD|COPY|WORKDIR)\b/i

  const isCodeLikeLine = (line = '') => {
    const trimmed = line.trim()
    if (!trimmed) return false

    return /^(const|let|var|function|class|if|for|while|return|import|export|FROM|RUN|CMD|COPY|WORKDIR|def|print)\b/i.test(trimmed)
      || /=>/.test(trimmed)
      || /[{};`]/.test(trimmed)
      || /\w+\s*\(.*\)\s*;?$/.test(trimmed)
  }

  let candidate = withoutFencedCode
  const inlineMatch = inlineCodeStartRegex.exec(withoutFencedCode)
  if (inlineMatch && typeof inlineMatch.index === 'number') {
    candidate = withoutFencedCode.slice(0, inlineMatch.index).trim()
  }

  const lines = candidate.split(/\r?\n/)
  const cleanedLines = []
  for (const line of lines) {
    if (isCodeLikeLine(line)) break
    cleanedLines.push(line)
  }

  const cleanedText = cleanedLines.join('\n').replace(/\s+/g, ' ').trim()
  return cleanedText || candidate || withoutFencedCode
}

const parseCodeBlocks = (text = '') => {
  const codeBlockRegex = /```([a-zA-Z0-9_+-]+)?\s*\r?\n([\s\S]*?)```/g
  const blocks = []
  let match = codeBlockRegex.exec(text)

  while (match) {
    blocks.push({ language: match[1] || 'javascript', code: match[2] || '' })
    match = codeBlockRegex.exec(text)
  }

  if (blocks.length > 0) {
    return blocks
  }

  // Fallback for older/plain responses without markdown fences.
  const lines = text.split(/\r?\n/)
  const codeLikeLine = (line = '') => {
    const trimmed = line.trim()
    if (!trimmed) return false
    if (/^[-*]\s+/.test(trimmed)) return false

    return /^(const|let|var|function|class|if|for|while|return|import|export|FROM|RUN|CMD|COPY|WORKDIR|def|print|SELECT|INSERT|UPDATE|DELETE)\b/i.test(trimmed)
      || /[{}();=<>\[\]]/.test(trimmed)
  }

  const fallbackLines = []
  let hasStarted = false

  for (const line of lines) {
    if (codeLikeLine(line)) {
      fallbackLines.push(line)
      hasStarted = true
      continue
    }

    if (hasStarted && line.trim() === '') {
      fallbackLines.push(line)
      continue
    }

    if (hasStarted) break
  }

  if (fallbackLines.length >= 2) {
    const language = fallbackLines.some((line) => /^(FROM|RUN|CMD|COPY|WORKDIR)\b/i.test(line.trim()))
      ? 'docker'
      : 'javascript'
    return [{ language, code: fallbackLines.join('\n').trim() }]
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

  const onRegenerateExplain = async (questionId, topic) => {
    setLoadingExplain((prev) => ({ ...prev, [questionId]: true }))
    try {
      const { data } = await axiosInstance.post(API_PATH.AI.GENERATE_EXPLANATION, { topic })
      setExplanations((prev) => ({ ...prev, [questionId]: data.explanation || 'No explanation available' }))
      notifySuccess('Explanation regenerated')
    } catch (error) {
      notifyError(getErrorMessage(error, 'Could not regenerate explanation'))
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
      <div className="mb-10 rounded-2xl border border-neutral-800 bg-neutral-950/70 p-3">
        <div className="flex flex-col items-start gap-6 rounded-xl border border-neutral-800 bg-neutral-950 px-6 py-7 md:flex-row md:items-stretch md:justify-between">
          <div>
            <p className="text-[10px] font-bold tracking-[0.2em] text-neutral-400 uppercase">
              OPERATIONAL_ROLE
            </p>
            <h2 className="mt-2 text-4xl font-extrabold tracking-tight text-white uppercase">
              {session?.role || '...'}
            </h2>
          </div>

          <div className="grid w-full gap-3 md:w-auto md:grid-cols-[minmax(260px,1fr)_minmax(130px,0.4fr)_minmax(130px,0.4fr)]">
            <div className="rounded-lg border border-neutral-800 bg-neutral-950 px-5 py-3">
              <p className="text-[9px] font-bold tracking-widest text-neutral-400 uppercase">Focus</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {String(topics)
                  .split(',')
                  .map((topic) => topic.trim())
                  .filter(Boolean)
                  .map((topic) => (
                    <span
                      key={topic}
                      className="rounded border border-neutral-700 bg-neutral-900 px-2 py-1 text-[9px] font-bold tracking-wide text-neutral-200 uppercase"
                    >
                      {topic}
                    </span>
                  ))}
              </div>
            </div>
            <div className="rounded-lg border border-neutral-800 bg-neutral-950 px-5 py-3">
              <p className="text-[9px] font-bold tracking-widest text-neutral-400 uppercase">Exp</p>
              <p className="mt-1 text-xl font-extrabold text-white uppercase">{experience}</p>
            </div>
            <div className="rounded-lg border border-neutral-800 bg-neutral-950 px-5 py-3">
              <p className="text-[9px] font-bold tracking-widest text-neutral-400 uppercase">Units</p>
              <p className="mt-1 text-xl font-extrabold text-white uppercase">{questionCount} Q&A</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Question Log + Intel Panel ── */}
      <div className={`grid gap-6 ${learnMoreQuestionId ? 'xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.68fr)]' : 'grid-cols-1'}`}>
        <div>
          <div className="overflow-hidden rounded-xl border border-neutral-800 bg-neutral-950">
          {(session?.questions || []).map((q, index) => {
            const isOpen = Boolean(openQuestions[q._id])
            const isIntelOpenForRow = learnMoreQuestionId === q._id

            return (
              <article
                key={q._id || `${q.question}-${index}`}
                className="border-b border-neutral-800 bg-neutral-950 last:border-b-0"
              >
                <div className="group px-5 py-5 transition-colors hover:bg-neutral-900/60">
                  <button
                    type="button"
                    onClick={() => toggleQuestion(q._id)}
                    className="flex w-full items-center gap-4 text-left"
                  >
                    <span className="text-[11px] font-bold tracking-widest text-neutral-500">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <span className="flex-1 text-[15px] font-extrabold leading-tight tracking-tight text-white uppercase">
                      {q.question}
                    </span>
                    <div className="flex shrink-0 items-center gap-3">
                      {q.isPinned && <FiBookmark size={14} className="text-neutral-100" />}
                      <span className="text-neutral-500 transition group-hover:text-neutral-300">
                        {isOpen ? <FiChevronUp size={14} /> : <FiChevronDown size={14} />}
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
                      <div className="border-t border-neutral-800 px-6 pb-8 pt-6">
                        <div className="mb-8 flex flex-wrap gap-4">
                          <button
                            onClick={() => onPinQuestion(q._id)}
                            className={`border px-4 py-2 text-[10px] font-bold uppercase tracking-widest transition ${
                              q.isPinned
                                ? 'border-black bg-black text-white dark:border-white dark:bg-white dark:text-black'
                                : 'border-neutral-700 text-neutral-300 hover:border-white hover:text-white'
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
                                : 'border border-neutral-700 text-neutral-200 hover:border-white hover:text-white'
                            }`}
                          >
                            <FiCpu size={12} />
                            {loadingExplain[q._id] ? 'Loading...' : 'Learn More'}
                          </button>
                        </div>

                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="border border-neutral-800 bg-neutral-900/30 p-6"
                        >
                          <p className="mb-4 text-[10px] font-bold tracking-widest text-neutral-400 uppercase">Core Response</p>
                          <p className="text-sm font-medium leading-relaxed tracking-wide text-neutral-200">
                            {sanitizeCoreResponse(q.answer)}
                          </p>
                        </motion.div>

                        <div className="mt-8 flex items-center justify-end">
                          <button
                            type="button"
                            onClick={() => openNoteDialog(q)}
                            className="flex items-center gap-2 border border-neutral-700 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-neutral-300 transition hover:border-white hover:text-white"
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
              className="flex items-center gap-3 border border-neutral-700 px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-neutral-100 transition hover:border-white hover:bg-white hover:text-black disabled:cursor-not-allowed disabled:opacity-40"
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

            {selectedIntelQuestion && (
              <div className="mb-6 flex justify-end">
                <button
                  type="button"
                  onClick={() => onRegenerateExplain(selectedIntelQuestion._id, selectedIntelQuestion.question)}
                  disabled={selectedIntelLoading}
                  className="border border-neutral-200 px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-neutral-600 transition hover:border-black hover:text-black disabled:cursor-not-allowed disabled:opacity-40 dark:border-neutral-800 dark:text-neutral-300 dark:hover:border-white dark:hover:text-white"
                >
                  {selectedIntelLoading ? 'Regenerating...' : 'Regenerate'}
                </button>
              </div>
            )}

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
