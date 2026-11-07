import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { FiRefreshCw } from 'react-icons/fi'
import AppShell from '../../components/layout/AppShell'
import axiosInstance from '../../utils/axiosInstance'
import { loadAnalytics } from './analytics'

const count = (value) => Number.isFinite(Number(value)) ? Math.max(0, Number(value)) : 0

function Breakdown({ title, values, labels }) {
  const total = Object.values(values || {}).reduce((sum, value) => sum + count(value), 0)
  return (
    <section className="min-w-0 border border-neutral-800 p-6" aria-label={title}>
      <h3 className="mb-6 text-xs font-bold uppercase tracking-widest">{title}</h3>
      {total === 0 ? <p className="text-sm text-neutral-400">No data yet.</p> : (
        <ul className="space-y-5">
          {Object.entries(labels).map(([key, label]) => (
            <li key={key}>
              <div className="mb-2 flex justify-between gap-4 text-sm"><span className="text-neutral-300">{label}</span><span>{count(values?.[key])}</span></div>
              <div className="h-1 bg-neutral-800" aria-hidden="true"><div className="h-full bg-white" style={{ width: `${count(values?.[key]) / total * 100}%` }} /></div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

export default function AnalyticsDashboard() {
  const [result, setResult] = useState(null)
  const [refresh, setRefresh] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    loadAnalytics(axiosInstance, controller.signal).then((data) => {
      if (!controller.signal.aborted) setResult(data)
    })
    return () => controller.abort()
  }, [refresh])

  const stats = result?.stats
  const weakTopics = result?.weakTopics
  const retry = () => { setResult(null); setRefresh(value => value + 1) }

  return (
    <AppShell title="Analytics" compactHeader>
      <div className="space-y-8 text-white" aria-busy={!result}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div><h2 className="text-xl font-bold uppercase tracking-wide">Your progress</h2><p className="mt-2 max-w-xl text-sm text-neutral-400">Track preparation and test performance across your account. DSA progress is available in DSA Practice.</p></div>
          <button onClick={retry} disabled={!result} className="flex items-center gap-2 border border-neutral-700 px-4 py-3 text-xs font-bold uppercase tracking-wider hover:border-white disabled:opacity-50"><FiRefreshCw /> Refresh</button>
        </div>

        {!result ? <p role="status" className="py-12 text-sm text-neutral-400">Loading your analytics…</p> : <>
          {(!stats || weakTopics === null) && <div role="alert" className="flex flex-wrap items-center justify-between gap-4 border border-neutral-700 p-5 text-sm"><p>{!stats ? 'Unable to load your progress summary.' : 'Your summary is available, but review areas could not be loaded.'}</p><button onClick={retry} className="border border-neutral-600 px-4 py-2 hover:border-white">Try again</button></div>}

          {stats && <>
            <div className="grid gap-px border border-neutral-800 bg-neutral-800 sm:grid-cols-2 xl:grid-cols-4">
              {[
                ['Sessions', count(stats.totalSessions), `${count(stats.completedSessions)} completed`],
                ['Questions', count(stats.totalQuestions), 'Across all sessions'],
                ['Tests', count(stats.totalTests), `${count(stats.completedTests)} completed`],
                ['Average score', count(stats.completedTests) ? `${count(stats.avgTestScore)}%` : '—', 'Completed tests only'],
              ].map(([label, value, detail]) => <section key={label} className="bg-neutral-950 p-6"><h3 className="text-xs font-bold uppercase tracking-widest text-neutral-400">{label}</h3><p className="my-3 text-4xl font-bold tracking-tight">{value}</p><p className="text-xs text-neutral-400">{detail}</p></section>)}
            </div>
            {count(stats.totalSessions) === 0 && <div className="border border-dashed border-neutral-700 p-6"><h3 className="font-bold">Start building your progress</h3><p className="my-3 text-sm text-neutral-400">Create a preparation session or complete a test to see your results here.</p><Link className="inline-block border border-neutral-600 px-4 py-3 text-xs font-bold uppercase hover:border-white" to="/dashboard">Go to dashboard</Link></div>}
            <div className="grid gap-6 md:grid-cols-2">
              <Breakdown title="Question difficulty" values={stats.difficultyBreakdown} labels={{ easy: 'Easy', medium: 'Medium', hard: 'Hard' }} />
              <Breakdown title="Session types" values={stats.typeBreakdown} labels={{ preparation: 'Preparation', test: 'Test', core: 'Core subjects' }} />
            </div>
          </>}

          {weakTopics !== null && <section className="border border-neutral-800 p-6">
            <h3 className="text-xs font-bold uppercase tracking-widest">Areas to review</h3>
            <p className="mt-3 text-sm text-neutral-400">Difficulty groups averaging below 6/10 in completed tests. Scores are grouped by difficulty, rather than individual subjects.</p>
            {weakTopics.length ? <ul className="mt-6 divide-y divide-neutral-800">{weakTopics.map(item => <li key={item.topic} className="flex flex-wrap justify-between gap-3 py-4 text-sm"><span className="capitalize">{item.topic}</span><span className="text-neutral-300">{count(item.avgScore)}/10 · {count(item.count)} answers</span></li>)}</ul> : <p className="mt-6 text-sm text-neutral-300">{count(stats?.completedTests) ? 'No difficulty groups currently fall below 6/10.' : 'Complete a test to discover areas to review.'}</p>}
            <Link to="/test" className="mt-5 inline-block border border-neutral-600 px-4 py-3 text-xs font-bold uppercase hover:border-white">Practice in Test Arena</Link>
          </section>}
        </>}
      </div>
    </AppShell>
  )
}
