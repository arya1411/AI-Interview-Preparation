// Publish generated content before saving so a storage failure cannot hide it.
export const generateAndSaveExplanation = async ({ client, generateUrl, saveUrl, topic, shortAnswer, onGenerated }) => {
  const { data } = await client.post(generateUrl, { topic, ...(shortAnswer !== undefined ? { shortAnswer } : {}) })
  if (typeof data?.explanation !== 'string' || !data.explanation.trim()) {
    throw new Error('AI returned an empty explanation. Please try again.')
  }

  onGenerated(data)
  try {
    await client.post(saveUrl, { explanation: data.explanation })
    return { saved: true }
  } catch {
    return { saved: false }
  }
}

// Preserve the order of teaching sections, examples, and code in stored text.
// Older explanations without headings remain readable as a single section.
export const parseExplanationSections = (content = '') => {
  const sections = []
  let section = { title: '', blocks: [] }
  let lines = []
  let codeLines = null
  let language = 'text'
  const flushText = () => {
    const text = lines.join('\n').trim()
    if (text) section.blocks.push({ type: 'text', text })
    lines = []
  }
  const flushSection = () => {
    flushText()
    if (section.title || section.blocks.length) sections.push(section)
  }
  for (const line of content.replace(/\r\n/g, '\n').split('\n')) {
    if (codeLines !== null) {
      if (/^```\s*$/.test(line)) {
        section.blocks.push({ type: 'code', language, code: codeLines.join('\n') })
        codeLines = null
      } else codeLines.push(line)
      continue
    }
    const fence = /^```([a-zA-Z0-9_+#.-]*)\s*$/.exec(line)
    const heading = /^#{2,3}\s+(.+)$/.exec(line)
    if (fence) {
      flushText()
      codeLines = []
      language = fence[1] || 'text'
    } else if (heading) {
      flushSection()
      section = { title: heading[1].trim(), blocks: [] }
    } else if (!line.trim()) flushText()
    else lines.push(line)
  }
  if (codeLines !== null) section.blocks.push({ type: 'code', language, code: codeLines.join('\n') })
  flushSection()
  return sections
}
