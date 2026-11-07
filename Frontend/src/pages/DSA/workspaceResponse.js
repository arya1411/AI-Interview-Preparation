import { validateSheet } from './sheet.js'

export function validateWorkspaceResponse(value) {
  const invalid = () => {
    const error = new Error('The backend returned an invalid DSA workspace response. Restart or deploy the updated backend, then retry.')
    error.code = 'DSA_INVALID_RESPONSE'
    throw error
  }
  if (!value || typeof value !== 'object' || typeof value.sheetKey !== 'string' || !/^[a-f0-9-]{36}$/i.test(value.sheetKey) || !Number.isSafeInteger(value.revision) || value.revision < 0 || typeof value.executionConfigured !== 'boolean') invalid()
  for (const key of ['drafts', 'notes', 'bookmarks', 'solved']) {
    if (!value[key] || typeof value[key] !== 'object' || Array.isArray(value[key])) invalid()
  }
  try { validateSheet(value.sheet) } catch { invalid() }
  return value
}

export function workspaceErrorMessage(error, operation = 'load') {
  if (error.code === 'DSA_INVALID_RESPONSE') return error.message
  const status = error.response?.status
  if (status === 404) return 'This backend does not have the DSA workspace endpoint yet. Restart or deploy the updated backend, then retry. For local development, set VITE_DSA_API_URL=http://localhost:8000 and run the backend.'
  const serverMessage = error.response?.data?.message
  if (typeof serverMessage === 'string' && serverMessage.trim()) return serverMessage
  if (status >= 500) return 'The DSA backend could not load your workspace. Check the backend logs and database connection, then retry.'
  if (status === 429) return 'Too many requests. Wait briefly, then retry.'
  if (operation === 'save') return 'Unable to save to the server. Your current edits remain on this page; retry saving before leaving.'
  if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') return 'The DSA backend took too long to respond. It may be starting up; wait briefly, then retry.'
  return 'Unable to connect to the DSA backend. Check that the server is running and that VITE_API_URL or VITE_DSA_API_URL points to the correct backend.'
}
