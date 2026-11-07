import { API_PATH } from '../../utils/apiPath.js'

export async function loadAnalytics(client, signal) {
  const [summary, review] = await Promise.allSettled([
    client.get(API_PATH.ANALYTICS.GET, { signal }),
    client.get(API_PATH.ANALYTICS.GET_WEAK_TOPICS, { signal }),
  ])
  const stats = summary.status === 'fulfilled' && summary.value.data?.success === true
    && summary.value.data.stats && typeof summary.value.data.stats === 'object' && !Array.isArray(summary.value.data.stats)
    ? summary.value.data.stats : null
  const weakTopics = review.status === 'fulfilled' && review.value.data?.success === true
    && Array.isArray(review.value.data.weakTopics)
    && review.value.data.weakTopics.every(item => item && typeof item.topic === 'string'
      && Number.isFinite(item.avgScore) && Number.isInteger(item.count))
    ? review.value.data.weakTopics : null
  return { stats, weakTopics }
}
