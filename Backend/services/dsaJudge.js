const axios = require('axios');
const { buildHarness, PREFIX } = require('./dsaHarness');
const { DsaError, equalValues } = require('./dsaValidation');
const DEFAULT_IDS = { javascript: 63, python: 71, cpp: 54, java: 62 };
function configuration(env = process.env) {
  if (!env.JUDGE0_URL) throw new DsaError('Code execution is not configured. Set JUDGE0_URL and the judge credentials on the backend.', 503);
  const baseURL = env.JUDGE0_URL.replace(/\/$/,'');
  const url = new URL(baseURL);
  if (!['https:','http:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) throw new DsaError('Invalid judge configuration.',503);
  const headers = {};
  if (env.JUDGE0_AUTH_TOKEN) headers['X-Auth-Token'] = env.JUDGE0_AUTH_TOKEN;
  if (env.JUDGE0_RAPIDAPI_KEY) { headers['X-RapidAPI-Key'] = env.JUDGE0_RAPIDAPI_KEY; headers['X-RapidAPI-Host'] = url.host; }
  return { baseURL, headers, ids: Object.fromEntries(Object.entries(DEFAULT_IDS).map(([key,id])=>[key,Number(env[`JUDGE0_${key.toUpperCase()}_ID`] || id)])) };
}
function createJudge(client = axios, env = process.env) {
  if (env.DSA_EXECUTION_MODE === 'local') return require('./dsaLocalJudge').createLocalJudge(env);
  return {
    configured: () => Boolean(env.JUDGE0_URL),
    async start(language, code, tests, signature) {
      const config = configuration(env);
      const submissions = tests.map(t => ({
        language_id: config.ids[language], source_code: Buffer.from(buildHarness(language,code,t,signature)).toString('base64'),
        cpu_time_limit: 3, wall_time_limit: 5, memory_limit: 256000,
        max_file_size: 128, enable_network: false,
        enable_per_process_and_thread_time_limit: false,
        enable_per_process_and_thread_memory_limit: false,
      }));
      try {
        const { data } = await client.post(`${config.baseURL}/submissions/batch?base64_encoded=true`, { submissions }, { headers: config.headers, timeout: 15000, maxContentLength: 256000 });
        if (!Array.isArray(data) || data.length !== tests.length || data.some(r => !r || typeof r.token !== 'string' || !/^[a-zA-Z0-9-]{1,100}$/.test(r.token))) throw new Error('Invalid batch response');
        return data.map(r=>r.token);
      } catch { throw new DsaError('The code execution service is unavailable or rejected the execution limits. Check judge configuration and try again.',503); }
    },
    async poll(tokens, tests) {
      const config = configuration(env);
      let submissions;
      try {
        const response = await client.get(`${config.baseURL}/submissions/batch`, { headers: config.headers, params: { tokens: tokens.join(','), base64_encoded: true, fields: 'token,status,stdout,stderr,compile_output,time,memory' }, timeout: 15000, maxContentLength: 8 * 1024 * 1024 });
        submissions = response.data.submissions;
        if (!Array.isArray(submissions) || submissions.length !== tokens.length || submissions.some(s=>!s?.status?.id)) throw new Error('Invalid judge response');
      } catch { throw new DsaError('Unable to retrieve execution results. Retry from submission history.',503); }
      const byToken = new Map(submissions.map(s=>[s.token,s]));
      const ordered = tokens.map(t=>byToken.get(t));
      if (ordered.some(s=>!s)) throw new DsaError('Incomplete judge response. Please retry.',503);
      if (ordered.some(s=>s.status.id<=2)) return null;
      const decode = value => value ? Buffer.from(value,'base64').toString('utf8').slice(0,131072) : '';
      const results = ordered.map((s,i)=> {
        const output = decode(s.stdout);
        const line = output.split(/\r?\n/).findLast(line=>line.startsWith(PREFIX));
        let actual;
        let error;
        if (s.status.id !== 3) error = decode(s.compile_output) || decode(s.stderr) || s.status.description || 'Execution failed';
        else {
          try { actual = JSON.parse(line?.slice(PREFIX.length)); }
          catch { error = 'Your solution did not return a JSON-compatible value, or its output exceeded the limit.'; }
        }
        return { passed: !error && equalValues(actual,tests[i].expected), input: JSON.stringify(tests[i].args), expected: JSON.stringify(tests[i].expected), actual: actual === undefined ? 'undefined' : JSON.stringify(actual), ...(error ? {error} : {}), ms: Number(s.time || 0)*1000, memoryKb: s.memory ?? null, status: s.status.description };
      });
      return { results };
    },
  };
}
module.exports = { createJudge, configuration };
