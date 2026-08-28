import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import {
  FiChevronDown,
  FiChevronUp,
  FiBookmark,
  FiCopy,
  FiCheck,
  FiCode,
  FiEdit3,
  FiRefreshCw,
} from 'react-icons/fi'
import axiosInstance from '../../utils/axiosInstance'
import { API_PATH } from '../../utils/apiPath'
import AppShell from '../../components/layout/AppShell'
import Modal from '../../components/Modal'
import { getErrorMessage, normalizeQuestions, parseQuestionsResponse } from '../../utils/helper'
import { notifyError, notifySuccess } from '../../utils/toast'

// Extract markdown fenced code blocks
const extractCodeBlocks = (text = '') => {
  const regex = /```([a-zA-Z0-9_+-]+)?\s*\r?\n([\s\S]*?)```/g
  const blocks = []
  let match
  while ((match = regex.exec(text)) !== null) {
    blocks.push({ language: match[1] || 'javascript', code: match[2] || '' })
  }
  return blocks
}

// Remove code blocks from text
const stripCodeBlocks = (text = '') => text.replace(/```[\s\S]*?```/g, '').replace(/\n{3,}/g, '\n\n').trim()

const SessionDetail = () => {
  const { id } = useParams()
  const [session, setSession] = useState(null)
  const [openQuestions, setOpenQuestions] = useState({})
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

  useEffect(() => {
    fetchSession()
  }, [fetchSession])

  const fetchExplanation = async (questionId, topic) => {
    setLoadingExplain((prev) => ({ ...prev, [questionId]: true }))
    try {
      const { data } = await axiosInstance.post(API_PATH.AI.GENERATE_EXPLANATION, { topic })
      const rawExplanation = data.explanation || ''
      setExplanations((prev) => ({
        ...prev,
        [questionId]: {
          title: data.title || '',
          text: stripCodeBlocks(rawExplanation),
          codeBlocks: extractCodeBlocks(rawExplanation),
        },
      }))
    } catch (error) {
      notifyError(getErrorMessage(error, 'Could not generate explanation'))
    } finally {
      setLoadingExplain((prev) => ({ ...prev, [questionId]: false }))
    }
  }

  const toggleQuestion = (questionId, questionText) => {
    setOpenQuestions((prev) => {
      const willOpen = !prev[questionId]
      if (willOpen && !explanations[questionId]) {
        fetchExplanation(questionId, questionText)
      }
      return { ...prev, [questionId]: willOpen }
    })
  }

  const onRegenerateExplain = async (questionId, topic) => {
    setLoadingExplain((prev) => ({ ...prev, [questionId]: true }))
    try {
      const { data } = await axiosInstance.post(API_PATH.AI.GENERATE_EXPLANATION, { topic })
      const rawExplanation = data.explanation || ''
      setExplanations((prev) => ({
        ...prev,
        [questionId]: {
          title: data.title || '',
          text: stripCodeBlocks(rawExplanation),
          codeBlocks: extractCodeBlocks(rawExplanation),
        },
      }))
      notifySuccess('Explanation regenerated')
    } catch (error) {
      notifyError(getErrorMessage(error, 'Could not regenerate explanation'))
    } finally {
      setLoadingExplain((prev) => ({ ...prev, [questionId]: false }))
    }
  }

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

  const onCopyCode = async (code, blockId) => {
    try {
      await navigator.clipboard.writeText(code)
      setCopiedBlockId(blockId)
      setTimeout(() => setCopiedBlockId(null), 1400)
    } catch {
      notifyError('Unable to copy code')
    }
  }

  const openNoteDialog = (question) => {
    setNoteDialog({ open: true, questionId: question._id, text: question.note || '' })
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

  return (
    <AppShell title="Session Logs" subtitle={`ID: ${id?.slice(-8).toUpperCase()}`}>
      <div className="mb-10 rounded-2xl border border-neutral-800 bg-neutral-950/70 p-3">
        <div className="flex flex-col items-start gap-6 rounded-xl border border-neutral-800 bg-neutral-950 px-6 py-7 md:flex-row md:items-stretch md:justify-between">
          <div>
            <p className="text-[10px] font-bold tracking-[0.2em] text-neutral-400 uppercase">OPERATIONAL_ROLE</p>
            <h2 className="mt-2 text-4xl font-extrabold tracking-tight text-white uppercase">{session?.role || '...'}</h2>
          </div>
          <div className="grid w-full gap-3 md:w-auto md:grid-cols-[minmax(260px,1fr)_minmax(130px,0.4fr)_minmax(130px,0.4fr)]">
            <div className="rounded-lg border border-neutral-800 bg-neutral-950 px-5 py-3">
              <p className="text-[9px] font-bold tracking-widest text-neutral-400 uppercase">Focus</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {String(topics).split(',').map((t) => t.trim()).filter(Boolean).map((t) => (
                  <span key={t} className="rounded border border-neutral-700 bg-neutral-900 px-2 py-1 text-[9px] font-bold tracking-wide text-neutral-200 uppercase">{t}</span>
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

      <div className="overflow-hidden rounded-xl border border-neutral-800 bg-neutral-950">
        {(session?.questions || []).map((q, index) => {
          const isOpen = Boolean(openQuestions[q._id])
          const explData = explanations[q._id]
          const isLoadingExplain = Boolean(loadingExplain[q._id])

          return (
            <article key={q._id || `${q.question}-${index}`} className="border-b border-neutral-800 last:border-b-0">
              <div className="group px-5 py-5 transition-colors hover:bg-neutral-900/60">
                <button type="button" onClick={() => toggleQuestion(q._id, q.question)} className="flex w-full items-center gap-4 text-left">
                  <span className="text-[11px] font-bold tracking-widest text-neutral-500">{String(index + 1).padStart(2, '0')}</span>
                  <span className="flex-1 text-[15px] font-extrabold leading-tight tracking-tight text-white uppercase">{q.question}</span>
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
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                    <div className="border-t border-neutral-800 px-6 pb-8 pt-6 space-y-6">
                      <div className="flex flex-wrap gap-3">
                        <button onClick={() => onPinQuestion(q._id)} className={`border px-4 py-2 text-[10px] font-bold uppercase tracking-widest transition ${q.isPinned ? 'border-white bg-white text-black' : 'border-neutral-700 text-neutral-300 hover:border-white hover:text-white'}`}>
                          {q.isPinned ? 'Pinned' : 'Pin'}
                        </button>
                        <button type="button" onClick={() => openNoteDialog(q)} className="flex items-center gap-2 border border-neutral-700 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-neutral-300 transition hover:border-white hover:text-white">
                          <FiEdit3 size={12} /> Note
                        </button>
                        <button type="button" onClick={() => onRegenerateExplain(q._id, q.question)} disabled={isLoadingExplain} className="ml-auto flex items-center gap-2 border border-neutral-700 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-neutral-300 transition hover:border-white hover:text-white disabled:cursor-not-allowed disabled:opacity-40">
                          <FiRefreshCw size={12} className={isLoadingExplain ? 'animate-spin' : ''} /> Regenerate
                        </button>
                      </div>

                      {isLoadingExplain && (
                        <div className="flex items-center gap-3 py-2">
                          <div className="h-1 w-1 animate-bounce rounded-full bg-neutral-500" style={{ animationDelay: '0ms' }} />
                          <div className="h-1 w-1 animate-bounce rounded-full bg-neutral-500" style={{ animationDelay: '150ms' }} />
                          <div className="h-1 w-1 animate-bounce rounded-full bg-neutral-500" style={{ animationDelay: '300ms' }} />
                          <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">Synthesizing...</p>
                        </div>
                      )}

                      {!isLoadingExplain && explData && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                          {explData.title && <h4 className="text-base font-extrabold uppercase tracking-widest text-white">{explData.title}</h4>}
                          {explData.text && (
                            <div className="border border-neutral-800 bg-neutral-900/30 p-6">
                              <p className="mb-3 text-[10px] font-bold tracking-widest text-neutral-400 uppercase">Detailed Explanation</p>
                              <p className="whitespace-pre-line text-sm font-medium leading-relaxed tracking-wide text-neutral-200">{explData.text}</p>
                            </div>
                          )}
                          {explData.codeBlocks.map((block, bIdx) => (
                            <div key={bIdx} className="overflow-hidden rounded-lg border border-neutral-800">
                              <div className="flex items-center justify-between border-b border-neutral-800 bg-neutral-900 px-4 py-2">
                                <div className="flex items-center gap-2 text-[11px] font-bold tracking-widest text-neutral-300 uppercase">
                                  <FiCode size={13} /> {block.language}
                                </div>
                                <button type="button" onClick={() => onCopyCode(block.code, `${q._id}-${bIdx}`)} className="text-neutral-400 transition hover:text-white" aria-label="Copy code">
                                  {copiedBlockId === `${q._id}-${bIdx}` ? <FiCheck size={14} /> : <FiCopy size={14} />}
                                </button>
                              </div>
                              <SyntaxHighlighter language={block.language} style={oneDark} wrapLongLines customStyle={{ borderRadius: 0, margin: 0, background: '#0f1117', padding: '16px', fontSize: '12px', lineHeight: 1.6, border: 'none' }} codeTagProps={{ style: { fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace', background: 'transparent' } }}>
                                {block.code}
                              </SyntaxHighlighter>
                            </div>
                          ))}
                        </motion.div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </article>
          )
        })}
      </div>

      <div className="mt-8 flex justify-end">
        <button onClick={onGenerateMore} disabled={generatingMore} className="flex items-center gap-3 border border-neutral-700 px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-neutral-100 transition hover:border-white hover:bg-white hover:text-black disabled:cursor-not-allowed disabled:opacity-40">
          {generatingMore ? 'Generating...' : 'Generate More'}
        </button>
      </div>

      <Modal open={noteDialog.open} title="Add Note" onClose={closeNoteDialog}>
        <div className="space-y-6">
          <textarea rows={6} className="input-minimal resize-none" placeholder="Write your note..." value={noteDialog.text} onChange={(e) => setNoteDialog((prev) => ({ ...prev, text: e.target.value }))} />
          <div className="flex justify-end gap-3">
            <button type="button" onClick={closeNoteDialog} className="border border-neutral-200 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-neutral-600 transition hover:border-black hover:text-black dark:border-neutral-800 dark:text-neutral-300 dark:hover:border-white dark:hover:text-white">Cancel</button>
            <button type="button" onClick={saveNoteFromDialog} className="bg-black px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-white transition hover:bg-neutral-800 dark:bg-white dark:text-black dark:hover:bg-neutral-200">Save Note</button>
          </div>
        </div>
      </Modal>
    </AppShell>
  )
}

export default SessionDetail
