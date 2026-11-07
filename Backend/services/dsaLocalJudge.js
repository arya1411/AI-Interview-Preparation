const { spawn } = require('node:child_process');
const { existsSync, realpathSync } = require('node:fs');
const { mkdtemp, writeFile, rm } = require('node:fs/promises');
const { tmpdir } = require('node:os');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const { performance } = require('node:perf_hooks');
const { StringDecoder } = require('node:string_decoder');
const { buildHarness, PREFIX } = require('./dsaHarness');
const { DsaError, equalValues } = require('./dsaValidation');

const OUTPUT_LIMIT = 128 * 1024;
const ADDRESS_SPACE = 1024 * 1024 * 1024;
const JAVA_OPTIONS = ['-Xmx64m', '-XX:MaxMetaspaceSize=64m', '-XX:ReservedCodeCacheSize=32m', '-XX:+UseSerialGC', '-Xss256k', '-XX:-UseCompressedOops', '-XX:-UseCompressedClassPointers'];

function javaHome(env) {
  const bundled = path.resolve(__dirname, '../../.local-runtimes/java');
  if (env.DSA_JAVA_HOME) return path.resolve(env.DSA_JAVA_HOME);
  if (existsSync(path.join(bundled, 'bin/javac'))) return bundled;
  if (existsSync('/usr/bin/javac')) return path.dirname(path.dirname(realpathSync('/usr/bin/javac')));
  return null;
}
function availableLanguages(env = process.env) {
  if (process.platform !== 'linux' || !existsSync('/usr/bin/bwrap') || !existsSync('/usr/bin/prlimit')) return [];
  const home = javaHome(env);
  return [existsSync('/usr/bin/node') && 'javascript', existsSync('/usr/bin/python3') && 'python', existsSync('/usr/bin/g++') && 'cpp', home && existsSync(path.join(home, 'bin/java')) && existsSync(path.join(home, 'bin/javac')) && 'java'].filter(Boolean);
}

function sandboxArguments(directory, language, env) {
  const compiled = ['cpp', 'java'].includes(language);
  const args = [`--as=${ADDRESS_SPACE}`, `--cpu=${compiled ? 15 : 3}`, '--fsize=2097152', '--nofile=64', '--core=0', '--', '/usr/bin/bwrap',
    '--unshare-all', '--unshare-user', '--disable-userns', '--assert-userns-disabled', '--die-with-parent', '--new-session', '--cap-drop', 'ALL',
    '--ro-bind', '/usr', '/usr', '--ro-bind', '/lib', '/lib', '--ro-bind', '/lib64', '/lib64',
    '--symlink', 'usr/bin', '/bin', '--symlink', 'usr/sbin', '/sbin',
    '--proc', '/proc', '--dev', '/dev', '--size', '33554432', '--tmpfs', '/tmp', '--size', '33554432', '--tmpfs', '/work',
    '--ro-bind', directory, '/src', '--chdir', '/work', '--clearenv', '--setenv', 'PATH', '/usr/bin:/bin', '--setenv', 'HOME', '/tmp', '--setenv', 'LANG', 'C.UTF-8'];
  if (language === 'java') args.push('--ro-bind', javaHome(env), '/opt/java');
  args.push('--');
  const runLimits = `/usr/bin/prlimit --nproc=64 --as=${ADDRESS_SPACE} --cpu=3 -- /usr/bin/timeout --signal=KILL 5s`;
  if (language === 'javascript') args.push('/usr/bin/prlimit', '--nproc=64', '--', '/usr/bin/node', '--jitless', '--max-old-space-size=64', '/src/solution.js');
  if (language === 'python') args.push('/usr/bin/prlimit', '--nproc=64', '--', '/usr/bin/python3', '-I', '-B', '/src/solution.py');
  if (language === 'cpp') args.push('/usr/bin/sh', '-c', `/usr/bin/prlimit --nproc=64 -- /usr/bin/g++ -std=c++17 -O0 /src/solution.cpp -o /work/main 2>/work/compile.log || { /usr/bin/cat /work/compile.log >&2; exit 65; }; exec ${runLimits} /work/main`);
  if (language === 'java') {
    const compilerOptions = JAVA_OPTIONS.map(option => `-J${option}`).join(' ');
    args.push('/usr/bin/sh', '-c', `/usr/bin/prlimit --nproc=64 -- /opt/java/bin/javac ${compilerOptions} -d /work /src/Main.java 2>/work/compile.log || { /usr/bin/cat /work/compile.log >&2; exit 65; }; exec ${runLimits} /opt/java/bin/java ${JAVA_OPTIONS.join(' ')} -cp /work Main`);
  }
  return args;
}

async function executeCase(language, code, test, signature, env) {
  const directory = await mkdtemp(path.join(tmpdir(), 'prepai-dsa-run-'));
  try {
    const filename = { javascript: 'solution.js', python: 'solution.py', cpp: 'solution.cpp', java: 'Main.java' }[language];
    await writeFile(path.join(directory, filename), buildHarness(language, code, test, signature), { mode: 0o600 });
    const started = performance.now();
    const execution = await new Promise(resolve => {
      // Only a private source directory and read-only system runtimes enter the
      // sandbox. No application environment, project directory, or credentials.
      const child = spawn('/usr/bin/prlimit', sandboxArguments(directory, language, env), { env: { PATH: '/usr/bin:/bin', LANG: 'C.UTF-8' }, stdio: ['ignore', 'pipe', 'pipe'] });
      let stdout = '', stderr = '', bytes = 0, failure = null;
      const decoders = { stdout: new StringDecoder('utf8'), stderr: new StringDecoder('utf8') };
      let finished = false;
      const finish = value => { if (!finished) { finished = true; clearTimeout(timer); resolve(value); } };
      const timer = setTimeout(() => { failure = 'Time limit exceeded.'; child.kill('SIGKILL'); }, ['cpp', 'java'].includes(language) ? 20000 : 5000);
      const read = name => chunk => {
        bytes += chunk.length;
        if (bytes > OUTPUT_LIMIT) { failure = 'Output limit exceeded (128 KB).'; child.kill('SIGKILL'); return; }
        if (name === 'stdout') stdout += decoders.stdout.write(chunk); else stderr += decoders.stderr.write(chunk);
      };
      child.stdout.on('data', read('stdout'));
      child.stderr.on('data', read('stderr'));
      child.on('error', () => finish({ error: 'Unable to start the local sandbox. Check Bubblewrap permissions and local runner setup.' }));
      child.on('close', (status, signal) => {
        stdout += decoders.stdout.end(); stderr += decoders.stderr.end();
        if (failure) return finish({ error: failure });
        if (signal === 'SIGXCPU' || status === 137 || status === 152 || status === 124) return finish({ error: 'Time limit exceeded.' });
        if (status !== 0) return finish({ error: `${status === 65 ? 'Compilation error' : 'Runtime error'}: ${stderr.trim() || signal || `exit ${status}`}` });
        const line = stdout.split(/\r?\n/).findLast(value => value.startsWith(PREFIX));
        try { finish({ actual: JSON.parse(line?.slice(PREFIX.length)) }); }
        catch { finish({ error: 'The solution did not return a JSON-compatible value.' }); }
      });
    });
    return { passed: !execution.error && equalValues(execution.actual, test.expected), input: JSON.stringify(test.args), expected: JSON.stringify(test.expected), actual: execution.actual === undefined ? 'undefined' : JSON.stringify(execution.actual), ...(execution.error ? { error: execution.error } : {}), ms: +(performance.now() - started).toFixed(2), memoryKb: null };
  } finally { await rm(directory, { recursive: true, force: true }); }
}

function createLocalJudge(env = process.env) {
  const jobs = new Map();
  const queue = [];
  let active = false;
  const pump = async () => {
    if (active || !queue.length) return;
    active = true;
    const job = queue.shift();
    try {
      const results = [];
      const started = Date.now();
      for (const test of job.tests) {
        if (Date.now() - started > 60000) results.push({ passed: false, input: JSON.stringify(test.args), expected: JSON.stringify(test.expected), error: 'Submission batch exceeded its 60-second execution budget.' });
        else results.push(await executeCase(job.language, job.code, test, job.signature, env));
      }
      job.result = { results };
    } catch { job.result = { results: job.tests.map(test => ({ passed: false, input: JSON.stringify(test.args), expected: JSON.stringify(test.expected), error: 'Local runner failed. Check runtime installation and sandbox permissions.' })) }; }
    finally { job.code = null; job.tests = null; job.signature = null; active = false; pump(); }
  };
  return {
    engine: 'local',
    languages: () => availableLanguages(env),
    configured: () => availableLanguages(env).length > 0,
    async start(language, code, tests, signature) {
      if (!availableLanguages(env).includes(language)) throw new DsaError('This language is unavailable in the local runner. Install its runtime first.', 503);
      if (queue.length >= 3) throw new DsaError('The local runner queue is full. Wait for an earlier submission to finish.', 429);
      for (const [id, job] of jobs) if (job.result && Date.now() - job.created > 15 * 60 * 1000) jobs.delete(id);
      if (jobs.size >= 64) { const old = [...jobs].find(([,job]) => job.result); if (old) jobs.delete(old[0]); }
      const token = randomUUID();
      const job = { created: Date.now(), code, language, tests: structuredClone(tests), signature: structuredClone(signature), result: null };
      jobs.set(token, job); queue.push(job); pump();
      return [token];
    },
    async poll(tokens) {
      const job = jobs.get(tokens[0]);
      if (!job) throw new DsaError('This local execution was interrupted by a backend restart. Run or submit the solution again.', 409);
      return job.result;
    },
  };
}
module.exports = { createLocalJudge, availableLanguages, executeCase, sandboxArguments };
