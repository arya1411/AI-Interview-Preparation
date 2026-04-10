export const parseQuestionsResponse = (payload) => {
  if (!payload) return []
  if (Array.isArray(payload)) return payload
  if (Array.isArray(payload.questions)) return payload.questions
  if (Array.isArray(payload.data)) return payload.data
  return []
}

export const normalizeQuestions = (questions) =>
  questions
    .filter((q) => q?.question)
    .map((q) => ({
      _id: q._id,
      question: q.question,
      answer: q.answer || '',
      note: q.note || '',
      isPinned: Boolean(q.isPinned),
    }))

export const getErrorMessage = (error, fallback = 'Something went wrong') => {
  return error?.response?.data?.message || error?.message || fallback
}
