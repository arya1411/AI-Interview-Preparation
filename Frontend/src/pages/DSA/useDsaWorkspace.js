import { useCallback, useEffect, useRef, useState } from 'react'
import dsaApi from '../../utils/dsaApi'
import { sampleSheet } from '../../data/dsaSheet'
import { validateWorkspaceResponse, workspaceErrorMessage } from './workspaceResponse'

const initial = { sheet: sampleSheet, sheetKey: '', drafts: {}, notes: {}, bookmarks: {}, solved: {}, revision: 0, executionConfigured: false }
const contentOf = data => ({ drafts: data.drafts, notes: data.notes, bookmarks: data.bookmarks })

export default function useDsaWorkspace() {
  const [data, setData] = useState(initial)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [sync, setSync] = useState({ status: 'loading', message: '' })
  const latest = useRef(data)
  const revision = useRef(0)
  const saved = useRef('')
  const pending = useRef(null)
  const saving = useRef(null)
  const active = useRef(false)
  const loadSequence = useRef(0)
  const controller = useRef(null)

  const accept = useCallback(response => {
    const value = validateWorkspaceResponse(response)
    revision.current = value.revision
    saved.current = JSON.stringify(contentOf(value))
    pending.current = null
    latest.current = value
    setData(value)
    setSync({ status: 'saved', message: '' })
  }, [])

  const reload = useCallback(async () => {
    const sequence = ++loadSequence.current
    const signal = controller.current.signal
    setLoading(true)
    setLoadError('')
    try {
      const result = await dsaApi.get('/api/dsa/workspace', { signal })
      if (active.current && sequence === loadSequence.current && !signal.aborted) accept(result.data)
    } catch (error) {
      if (active.current && sequence === loadSequence.current && !signal.aborted && error.code !== 'ERR_CANCELED') setLoadError(workspaceErrorMessage(error, 'load'))
    } finally { if (active.current && sequence === loadSequence.current && !signal.aborted) setLoading(false) }
  }, [accept])

  useEffect(() => {
    active.current = true
    controller.current = new AbortController()
    reload()
    return () => { active.current = false; controller.current.abort() }
  }, [reload])

  const flush = useCallback(() => {
    if (saving.current) return saving.current
    // Read the latest render as well as the debounced pending snapshot.
    const current = latest.current
    if (current.sheetKey && JSON.stringify(contentOf(current)) !== saved.current) pending.current = { content: contentOf(current), sheetKey: current.sheetKey }
    const task = async () => {
      while (active.current && pending.current) {
        const job = pending.current
        pending.current = null
        setSync({ status: 'saving', message: '' })
        try {
          const result = await dsaApi.put('/api/dsa/workspace', { ...job, revision: revision.current }, { signal: controller.current.signal })
          if (!active.current) return
          revision.current = result.data.revision
          saved.current = JSON.stringify(job.content)
        } catch (error) {
          if (!active.current) return
          if (!pending.current) pending.current = job
          setSync({ status: error.response?.status === 409 ? 'conflict' : 'error', message: workspaceErrorMessage(error, 'save') })
          throw error
        }
      }
      if (active.current) setSync({ status: 'saved', message: '' })
    }
    saving.current = task().finally(() => { saving.current = null })
    return saving.current
  }, [])

  useEffect(() => {
    latest.current = data
    if (!data.sheetKey || loading || loadError) return
    const content = contentOf(data)
    if (JSON.stringify(content) === saved.current) return
    pending.current = { content, sheetKey: data.sheetKey }
    setSync({ status: 'unsaved', message: '' })
    const timer = setTimeout(() => { flush().catch(() => {}) }, 700)
    return () => clearTimeout(timer)
  }, [data, loading, loadError, flush])

  useEffect(() => {
    const warn = event => {
      if (latest.current.sheetKey && JSON.stringify(contentOf(latest.current)) !== saved.current) { event.preventDefault(); event.returnValue = '' }
    }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [])

  const importSheet = useCallback(async sheet => {
    await flush()
    const result = await dsaApi.post('/api/dsa/workspace/import', { sheet, sheetKey: latest.current.sheetKey, revision: revision.current }, { signal: controller.current.signal })
    if (active.current) accept(result.data)
  }, [accept, flush])

  return { data, setData, loading, loadError, sync, reload, flush, importSheet }
}
