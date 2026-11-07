import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import AppShell from '../../components/layout/AppShell'
import { FiArrowLeft, FiArrowRight, FiBookOpen, FiCheck, FiCheckCircle, FiClock, FiCode, FiDownload, FiFileText, FiGrid, FiPlay, FiRotateCcw, FiSearch, FiStar, FiTerminal, FiUpload, FiX, FiZap } from 'react-icons/fi'
import toast from 'react-hot-toast'
import { sampleSheet } from '../../data/dsaSheet'
import { formatValue, validateSheet } from './sheet'
import dsaApi from '../../utils/dsaApi'
import useDsaWorkspace from './useDsaWorkspace'
import './dsa.css'

const CodeEditor = lazy(() => import('./CodeEditor'))
const languageLabels = { javascript: 'JavaScript', python: 'Python', cpp: 'C++', java: 'Java' }
const extensions = { javascript: 'js', python: 'py', cpp: 'cpp', java: 'java' }

function downloadSheet() {
  const url = URL.createObjectURL(new Blob([JSON.stringify(sampleSheet, null, 2)], { type: 'application/json' }))
  const link = document.createElement('a')
  link.href = url
  link.download = 'prepai-dsa-sheet-template.json'
  link.click()
  URL.revokeObjectURL(url)
}

export default function DSAWorkspace() {
  const { data, setData, loading, loadError, sync, reload, flush, importSheet: saveImportedSheet } = useDsaWorkspace()
  const [view, setView] = useState('sheet')
  const [selected, setSelected] = useState('')
  const [language, setLanguage] = useState('javascript')
  const [split, setSplit] = useState(45)
  const [search, setSearch] = useState('')
  const [topic, setTopic] = useState('All topics')
  const [difficulty, setDifficulty] = useState('All levels')
  const [status, setStatus] = useState('All problems')
  const [tab, setTab] = useState('description')
  const [run, setRun] = useState(null)
  const [running, setRunning] = useState(false)
  const [history, setHistory] = useState([])
  const [historyState, setHistoryState] = useState('idle')
  const [historyRefresh, setHistoryRefresh] = useState(0)
  const [showImport, setShowImport] = useState(false)
  const [importError, setImportError] = useState('')
  const [importing, setImporting] = useState(false)
  const attempt = useRef(0)
  const fileRef = useRef(null)
  const dialogRef = useRef(null)
  const { sheet, drafts, solved, bookmarks, notes } = data
  const question = sheet.questions.find(q => q.id === selected) || sheet.questions[0]
  const draftKey = `${question.id}:${language}`
  const starter = question.starters?.[language] || (language === 'javascript' ? question.starter : language === 'python' ? 'def solution(*args):\n    # Write your solution here.\n    pass\n' : '// Import a sheet with a typed signature and starter for this language.')
  const code = drafts[draftKey] ?? starter
  const topics = [...new Set(sheet.questions.map(q => q.topic))]
  const completed = sheet.questions.filter(q => solved[q.id]).length
  const percent = Math.round(completed / sheet.questions.length * 100)
  const filtered = sheet.questions.filter(q => `${q.title} ${q.topic}`.toLowerCase().includes(search.toLowerCase()) && (topic === 'All topics' || q.topic === topic) && (difficulty === 'All levels' || q.difficulty === difficulty) && (status === 'All problems' || (status === 'Solved' ? solved[q.id] : status === 'Bookmarked' ? bookmarks[q.id] : !solved[q.id])))
  const next = sheet.questions.find(q => !solved[q.id]) || sheet.questions[0]
  const saveLabel = { loading: 'Loading account', saved: 'Saved to account', unsaved: 'Unsaved changes', saving: 'Saving…', error: 'Save failed', conflict: 'Sync conflict' }[sync.status]

  useEffect(() => () => { attempt.current++ }, [])
  useEffect(() => {
    const dialog = dialogRef.current
    if (showImport) dialog?.showModal()
    else dialog?.close()
  }, [showImport])

  useEffect(() => {
    if (tab !== 'submissions' || loading || !data.sheetKey) return
    let canceled = false
    setHistoryState('loading')
    dsaApi.get('/api/dsa/submissions', { params: { problemId: question.id } }).then(result => {
      if (!canceled) { setHistory(result.data.submissions); setHistoryState('ready') }
    }).catch(() => { if (!canceled) setHistoryState('error') })
    return () => { canceled = true }
  }, [tab, question.id, loading, data.sheetKey, historyRefresh])

  const updateMap = (key, id, value) => setData(current => ({ ...current, [key]: { ...current[key], [id]: value } }))
  const cancelRun = () => { attempt.current++; setRunning(false) }
  const openQuestion = q => {
    cancelRun()
    setSelected(q.id)
    if (!q.signature && ['cpp', 'java'].includes(language)) setLanguage('javascript')
    setView('practice')
    setTab('description')
    setRun(null)
  }
  const changeLanguage = value => { cancelRun(); setLanguage(value); setRun(null) }

  const execute = async (submit = false) => {
    if (running) return
    cancelRun()
    const current = attempt.current
    setRunning(true)
    setRun(null)
    try {
      await flush()
      if (attempt.current !== current) return
      const started = await dsaApi.post('/api/dsa/executions', { sheetKey: data.sheetKey, problemId: question.id, language, code, kind: submit ? 'submit' : 'run' })
      for (let i = 0; i < 60 && attempt.current === current; i++) {
        await new Promise(resolve => setTimeout(resolve, 1200))
        if (attempt.current !== current) return
        const response = await dsaApi.get(`/api/dsa/submissions/${started.data.id}`)
        if (attempt.current !== current) return
        if (response.data.result) {
          setRun(response.data.result)
          setHistoryRefresh(value => value+1)
          if (response.data.result.accepted) {
            updateMap('solved', question.id, true)
            toast.success('Accepted. Progress saved to your account.')
          }
          return
        }
      }
      if (attempt.current === current) setRun({ error: 'Execution is still queued. Open Submissions and select the attempt to retrieve its result.' })
    } catch (error) {
      if (attempt.current === current) setRun({ error: error.response?.data?.message || 'Unable to complete execution. Try again or check submission history.' })
    } finally { if (attempt.current === current) { setRunning(false); setHistoryRefresh(value => value+1) } }
  }

  const reviewSubmission = async id => {
    cancelRun()
    const current = attempt.current
    setRunning(true)
    try {
      const response = await dsaApi.get(`/api/dsa/submissions/${id}`)
      if (attempt.current !== current) return
      const value = response.data
      setLanguage(value.language)
      updateMap('drafts', `${question.id}:${value.language}`, value.code)
      setRun(value.result || { error: 'This attempt is still running. Select it again shortly to retrieve its result.' })
      if (value.result?.accepted) updateMap('solved', question.id, true)
      setHistoryRefresh(value => value+1)
    } catch (error) { if (attempt.current === current) toast.error(error.response?.data?.message || 'Unable to load this submission.') }
    finally { if (attempt.current === current) setRunning(false) }
  }

  const importSheet = async event => {
    const file = event.target.files?.[0]
    if (!file) return
    setImporting(true)
    try {
      if (file.size > 1024 * 1024) throw new Error('Choose a JSON sheet smaller than 1 MB.')
      const imported = validateSheet(JSON.parse(await file.text()))
      await saveImportedSheet(imported)
      cancelRun()
      setSelected(imported.questions[0].id)
      setLanguage('javascript')
      setSearch(''); setTopic('All topics'); setDifficulty('All levels'); setStatus('All problems')
      setView('sheet'); setRun(null); setShowImport(false)
      toast.success(`Saved ${imported.questions.length} questions to your account.`)
    } catch (error) {
      setImportError(error instanceof SyntaxError ? 'This file is not valid JSON. Download the template to see the supported format.' : error.response?.data?.message || error.message)
    } finally { setImporting(false); event.target.value = '' }
  }

  if (loading || loadError) return <AppShell title="DSA Practice" compactHeader><div className="dsa-app"><div className="dsa-empty"><FiCode size={26} /><h3>{loading ? 'Loading your workspace…' : 'Unable to load workspace'}</h3>{loadError && <><p role="alert">{loadError}</p><button className="dsa-button secondary" onClick={reload}>Retry</button></>}</div></div></AppShell>

  return (
    <AppShell title={view === 'sheet' ? 'DSA Practice' : 'Coding Workspace'} compactHeader onBeforeNavigate={flush}>
      <div className="dsa-app">
        <nav className="dsa-view-nav" aria-label="DSA sections">
          <div className="dsa-view-tabs">
            <button className={view === 'sheet' && status !== 'Bookmarked' ? 'active' : ''} aria-pressed={view === 'sheet' && status !== 'Bookmarked'} onClick={() => { setStatus('All problems'); setView('sheet') }}><FiGrid /> Problem sheet <span>{sheet.questions.length}</span></button>
            <button className={view === 'practice' ? 'active' : ''} aria-pressed={view === 'practice'} onClick={() => setView('practice')}><FiCode /> Workspace</button>
            <button className={view === 'sheet' && status === 'Bookmarked' ? 'active' : ''} aria-pressed={view === 'sheet' && status === 'Bookmarked'} onClick={() => { setStatus('Bookmarked'); setView('sheet') }}><FiStar /> Bookmarks <span>{sheet.questions.filter(q => bookmarks[q.id]).length}</span></button>
          </div>
          <span className="dsa-local" role="status"><FiCheck /> {saveLabel}</span>
        </nav>

        <div className="dsa-sync-status" role="status"><span>{saveLabel}</span>{['error', 'conflict'].includes(sync.status) && <><span>{sync.message}</span><button className="dsa-text-button" onClick={() => sync.status === 'conflict' ? (window.confirm('Reload the saved workspace? Your unsaved edits on this page will be discarded.') && reload()) : flush().catch(() => {})}>{sync.status === 'conflict' ? 'Reload workspace' : 'Retry save'}</button></>}</div>
        {!data.executionConfigured && <div className="dsa-service-notice"><FiTerminal /><span>{data.executionEngine === 'local' ? 'Local code execution is unavailable. Check the local runner and language runtimes.' : 'Code execution is unavailable. Enable the local runner on the backend.'}</span></div>}
        {view === 'sheet' ? <div className="dsa-content">
          <section className="mb-12 grid grid-cols-1 gap-px border border-neutral-800 bg-neutral-800 sm:grid-cols-3" aria-label="Practice overview">
            {[
              { label: 'TOTAL_PROBLEMS', value: sheet.questions.length },
              { label: 'PROBLEMS_SOLVED', value: completed },
              { label: 'SHEET_COMPLETION', value: `${percent}%` },
            ].map(stat => (
              <div key={stat.label} className="bg-neutral-950 p-8">
                <p className="dsa-stat-label font-bold uppercase tracking-[0.2em] text-neutral-400">{stat.label}</p>
                <p className="dsa-stat-value mt-2 font-bold tracking-tighter text-white">{stat.value}</p>
              </div>
            ))}
          </section>

          <div className="dsa-page-heading">
            <div><h2>Problem Registry</h2><p>Structured DSA practice. Select a problem to launch the workspace.</p></div>
            <button className="dsa-button primary" onClick={() => { setImportError(''); setShowImport(true) }}><FiUpload /> Import sheet</button>
          </div>

          <section className="dsa-overview" aria-label="Progress by difficulty">
            <div className="dsa-difficulty-stats">
              {['Easy', 'Medium', 'Hard'].map(level => {
                const all = sheet.questions.filter(q => q.difficulty === level)
                const done = all.filter(q => solved[q.id]).length
                return <div key={level}><div><span className={`dsa-level ${level.toLowerCase()}`}>{level}</span><strong>{done}<span> / {all.length}</span></strong></div><div className="dsa-meter"><span style={{ width: `${all.length ? done / all.length * 100 : 0}%` }} /></div></div>
              })}
            </div>
            <div className="dsa-continue"><div><span className="dsa-eyebrow">{completed === sheet.questions.length ? 'REVISIT A PROBLEM' : 'NEXT PROBLEM'}</span><strong>{next.title}</strong></div><button className="dsa-button secondary" onClick={() => openQuestion(next)}>Launch workspace <FiArrowRight /></button></div>
          </section>

          <section className="dsa-sheet-section"><div className="dsa-section-heading"><div><h2><FiBookOpen /> {sheet.name}</h2><p>{sheet.questions.length} problems · {topics.length} topics · Your own pace</p></div><span className="dsa-sample-badge">{sheet.name === sampleSheet.name ? 'Sample sheet' : 'Your imported sheet'}</span></div>
            <div className="dsa-filters"><label className="dsa-search"><FiSearch /><input aria-label="Search problems" placeholder="Search a problem or topic…" value={search} onChange={e => setSearch(e.target.value)} /></label><select aria-label="Filter by topic" value={topic} onChange={e => setTopic(e.target.value)}>{['All topics', ...topics].map(t => <option key={t}>{t}</option>)}</select><select aria-label="Filter by difficulty" value={difficulty} onChange={e => setDifficulty(e.target.value)}>{['All levels', 'Easy', 'Medium', 'Hard'].map(t => <option key={t}>{t}</option>)}</select><select aria-label="Filter by status" value={status} onChange={e => setStatus(e.target.value)}>{['All problems', 'Unsolved', 'Solved', 'Bookmarked'].map(t => <option key={t}>{t}</option>)}</select></div>
            <div className="dsa-table-wrap"><table className="dsa-table"><thead><tr><th className="dsa-status-cell">Status</th><th>Problem</th><th>Topic</th><th>Difficulty</th><th><span className="dsa-sr-only">Bookmark</span></th></tr></thead><tbody>{filtered.map(q => <tr key={q.id}><td className="dsa-status-cell">{solved[q.id] ? <FiCheckCircle className="dsa-green" aria-label="Solved" /> : <span className="dsa-unsolved" aria-label="Unsolved" />}</td><td><button className="dsa-problem-link" onClick={() => openQuestion(q)}><span className="dsa-problem-number">{String(sheet.questions.indexOf(q) + 1).padStart(2, '0')}</span>{q.title}<FiArrowRight /></button></td><td><span className="dsa-topic-tag">{q.topic}</span></td><td><span className={`dsa-level ${q.difficulty.toLowerCase()}`}>{q.difficulty}</span></td><td><button className={`dsa-icon-button ${bookmarks[q.id] ? 'bookmarked' : ''}`} aria-label={`${bookmarks[q.id] ? 'Remove bookmark for' : 'Bookmark'} ${q.title}`} aria-pressed={!!bookmarks[q.id]} onClick={() => updateMap('bookmarks', q.id, !bookmarks[q.id])}><FiStar /></button></td></tr>)}</tbody></table>{!filtered.length && <div className="dsa-empty"><FiSearch size={26} /><h3>No matching problems</h3><p>Try a different search or reset your filters.</p><button className="dsa-button secondary" onClick={() => { setSearch(''); setTopic('All topics'); setDifficulty('All levels'); setStatus('All problems') }}>Reset filters</button></div>}</div>
            <div className="dsa-table-footer"><span>Showing {filtered.length} of {sheet.questions.length} problems</span><span><FiCheck /> {saveLabel}</span></div>
          </section>
          <footer className="dsa-footer"><span>DSA PRACTICE</span><span>Python · C++ · Java · JavaScript</span></footer>
        </div> : <div className="dsa-practice">
          <div className="dsa-practice-toolbar"><button className="dsa-text-button" onClick={() => setView('sheet')}><FiArrowLeft /> Back to sheet</button><select aria-label="Choose problem" value={question.id} onChange={e => openQuestion(sheet.questions.find(q => q.id === e.target.value))}>{sheet.questions.map(q => <option key={q.id} value={q.id}>{solved[q.id] ? '✓ ' : ''}{q.title}</option>)}</select><span className="dsa-practice-count">{completed} / {sheet.questions.length} solved</span></div>
          <div className="dsa-panel-settings"><label>Panel width <input aria-label="Problem panel width" type="range" min="30" max="65" value={split} onChange={e => setSplit(Number(e.target.value))} /><span>{split}%</span></label><span>Drag the editor’s bottom edge to adjust its height.</span></div>
          <div className="dsa-workspace-grid" style={{ '--dsa-left': `${split}fr`, '--dsa-right': `${100-split}fr` }}>
            <section className="dsa-description-panel"><div className="dsa-panel-tabs" role="tablist" aria-label="Problem information" onKeyDown={e => {
              const keys = ['description', 'hint', 'notes', 'submissions']
              if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return
              e.preventDefault()
              const index = keys.indexOf(tab)
              const nextIndex = e.key === 'Home' ? 0 : e.key === 'End' ? keys.length-1 : (index + (e.key === 'ArrowRight' ? 1 : keys.length-1)) % keys.length
              setTab(keys[nextIndex])
              e.currentTarget.querySelectorAll('[role="tab"]')[nextIndex].focus()
            }}>{[['description', FiFileText, 'Description'], ['hint', FiZap, 'Hint'], ['notes', FiBookOpen, 'Notes'], ['submissions', FiClock, 'Submissions']].map(([key, Icon, label]) => <button role="tab" tabIndex={tab === key ? 0 : -1} id={`dsa-tab-${key}`} aria-controls={`dsa-panel-${key}`} aria-selected={tab === key} className={tab === key ? 'active' : ''} key={key} onClick={() => setTab(key)}><Icon />{label}</button>)}</div>
              <div className="dsa-problem-body" role="tabpanel" id={`dsa-panel-${tab}`} aria-labelledby={`dsa-tab-${tab}`}><div className="dsa-question-meta"><span className={`dsa-level ${question.difficulty.toLowerCase()}`}>{question.difficulty}</span><span className="dsa-topic-tag">{question.topic}</span>{solved[question.id] && <span className="dsa-green"><FiCheckCircle /> Solved</span>}</div><h1>{question.title}</h1>
                {tab === 'description' && <><p className="dsa-problem-description">{question.description}</p>{question.tests.slice(0, 2).map((t, i) => <div className="dsa-example" key={i}><h3>Example {i + 1}</h3><div><span>Input</span><code>{formatValue(t.args)}</code><span>Output</span><code>{formatValue(t.expected)}</code></div></div>)}{!!question.constraints?.length && <div className="dsa-constraints"><h3>Constraints</h3><ul>{question.constraints.map(c => <li key={c}>{c}</li>)}</ul></div>}<div className="dsa-tip"><FiZap /><p>Start with a simple approach. Then ask yourself how to make it better.</p></div></>}
                {tab === 'hint' && <div className="dsa-hint"><FiZap size={24} /><h3>A nudge in the right direction</h3><p>{question.hint || 'Break down the examples, consider a brute-force solution, then look for repeated work you can avoid.'}</p></div>}
                {tab === 'notes' && <><p className="dsa-muted">Capture your approach, complexity, and what you learned.</p><textarea className="dsa-notes" aria-label="Your problem notes" placeholder={'My approach…\n\nTime complexity: \nSpace complexity: '} value={notes[question.id] || ''} onChange={e => updateMap('notes', question.id, e.target.value)} /><small className="dsa-muted">Changes save automatically to your account.</small></>}
                {tab === 'submissions' && <div className="dsa-history"><div className="dsa-history-heading"><h3>Recent attempts</h3><button className="dsa-icon-button" aria-label="Refresh submissions" onClick={() => setHistoryRefresh(value => value+1)}><FiRotateCcw /></button></div><p className="dsa-muted">Select an attempt to restore its code and retrieve its result.</p>{historyState === 'loading' ? <p>Loading submissions…</p> : historyState === 'error' ? <p role="alert">Unable to load submissions. Use refresh to retry.</p> : !history.length ? <p className="dsa-muted">No submissions yet. Run or submit your first solution.</p> : history.map(item => <button className="dsa-history-item" key={item.id} disabled={running} onClick={() => reviewSubmission(item.id)}><span><strong className={item.status === 'accepted' ? 'dsa-green' : item.status === 'wrong_answer' || item.status === 'execution_error' ? 'dsa-red' : ''}>{item.kind === 'run' && item.status === 'accepted' ? 'Samples passed' : item.status.replaceAll('_', ' ')}</strong><small>{languageLabels[item.language]} · {item.kind === 'run' ? 'Sample run' : 'Submission'}</small></span><time dateTime={item.createdAt}>{new Date(item.createdAt).toLocaleString()}</time><FiArrowRight /></button>)}</div>}
              </div>
            </section>
            <section className="dsa-code-panel"><div className="dsa-code-heading"><span><FiCode /> Code</span><div><select aria-label="Programming language" value={language} onChange={e => changeLanguage(e.target.value)}>{Object.entries(languageLabels).map(([key,label]) => <option key={key} value={key} disabled={(data.languages && !data.languages.includes(key)) || (['cpp', 'java'].includes(key) && !question.signature)}>{label}{data.languages && !data.languages.includes(key) ? ' (runtime missing)' : ['cpp', 'java'].includes(key) && !question.signature ? ' (signature required)' : ''}</option>)}</select><button className="dsa-icon-button" title="Reset code to starter" aria-label="Reset code to starter" disabled={running} onClick={() => { if (window.confirm('Replace your current code with the starter?')) { updateMap('drafts', draftKey, starter); setRun(null) } }}><FiRotateCcw /></button></div></div><div className="dsa-editor"><Suspense fallback={<div className="dsa-test-placeholder">Loading editor…</div>}><CodeEditor code={code} language={language} path={`${data.sheetKey}/${question.id}/solution.${extensions[language]}`} onChange={value => { updateMap('drafts', draftKey, value); setRun(null) }} onRun={() => execute(false)} onSubmit={() => execute(true)} /></Suspense></div><div className="dsa-editor-status"><span>solution.{extensions[language]}</span><span><FiCheck /> {saveLabel}</span></div>
              <div className="dsa-run-actions"><span><FiClock /> 3s CPU / test</span><div><button className="dsa-button secondary" disabled={running || !data.executionConfigured} onClick={() => execute(false)}><FiPlay /> Run samples</button><button className="dsa-button primary" disabled={running || !data.executionConfigured} onClick={() => execute(true)}>{running ? 'Running…' : <><FiUpload /> Submit</>}</button></div></div>
              <div className="dsa-test-panel" aria-live="polite" aria-busy={running}><h3><FiTerminal /> Test results <span>{question.tests.length} available tests</span></h3>{running ? <div className="dsa-test-placeholder">Running your code…</div> : run?.error ? <div className="dsa-result-error"><strong>Execution error</strong><pre>{run.error}</pre></div> : run?.results ? <><div className={`dsa-result-summary ${run.results.every(r => r.passed) ? 'passed' : 'failed'}`}><strong>{run.accepted ? 'Accepted' : run.results.every(r => r.passed) ? 'Sample tests passed' : 'Tests failed'}</strong><span>{run.results.filter(r => r.passed).length} / {run.results.length} passed</span></div>{run.results.map((r, i) => <details className="dsa-case" key={i} open={!r.passed}><summary><span className={r.passed ? 'dsa-green' : 'dsa-red'}>{r.passed ? <FiCheckCircle /> : <FiX />} Case {i + 1}</span><span>{r.passed ? `${r.ms} ms` : 'Failed'}</span></summary><div><p>Input <code>{r.input}</code></p><p>Expected <code>{r.expected}</code></p><p>{r.error ? 'Error' : 'Output'} <code>{r.error || r.actual}</code></p></div></details>)}{run.accepted && <button className="dsa-text-button dsa-next" onClick={() => openQuestion(sheet.questions.find(q => !solved[q.id]) || sheet.questions[(sheet.questions.indexOf(question) + 1) % sheet.questions.length])}>Next problem <FiArrowRight /></button>}</> : <div className="dsa-test-placeholder"><FiTerminal size={25} /><p>Ready to execute.</p><span>Run sample tests, then submit against every available test.</span></div>}</div>
            </section>
          </div><p className="dsa-prototype-note">{data.executionEngine === 'local' ? 'Submissions execute locally. ' : ''}Ctrl/Cmd + Enter: run samples · Ctrl/Cmd + Shift + Enter: submit · Ctrl/Cmd + Space: autocomplete. JavaScript has language intelligence; Python, C++, and Java have snippets and word suggestions. Acceptance checks the available tests.</p>
        </div>}
      <dialog ref={dialogRef} className="dsa-dialog" aria-labelledby="dsa-import-title" onCancel={() => setShowImport(false)} onClose={() => setShowImport(false)}><div className="dsa-dialog-heading"><span className="dsa-small-icon"><FiUpload /></span><button className="dsa-icon-button" aria-label="Close import" onClick={() => setShowImport(false)}><FiX /></button></div><h2 id="dsa-import-title">Import DSA Sheet</h2><p>Import your DSA sheet as JSON. Download the sample to see the format, then replace it with your questions, starter code, and tests.</p><div className="dsa-import-info"><FiBookOpen /><span>Importing replaces your active sheet, drafts, notes, bookmarks, and progress on all devices. Previous submissions remain in the database.</span></div><input ref={fileRef} type="file" accept=".json,application/json" hidden onChange={importSheet} /><button className="dsa-upload-area" disabled={importing} onClick={() => fileRef.current?.click()}><FiUpload size={26} /><strong>{importing ? 'Saving sheet…' : 'Choose your JSON sheet'}</strong><span>Up to 1 MB · 200 questions</span></button>{importError && <p className="dsa-import-error" role="alert">{importError}</p>}<button className="dsa-text-button" onClick={downloadSheet}><FiDownload /> Download sample template</button><p className="dsa-dialog-footnote">Use the template to include problem statements, starter code, and expected test outputs.</p></dialog>
      </div>
    </AppShell>
  )
}
