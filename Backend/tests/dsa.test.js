const test = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { spawnSync } = require('node:child_process');
const { mkdtempSync, writeFileSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const path = require('node:path');
const { runInNewContext } = require('node:vm');
const sample = require('../../shared/dsa-sheet.json');
const { validateSheet, validateContent } = require('../services/dsaValidation');
const { buildHarness, PREFIX } = require('../services/dsaHarness');
const { createJudge } = require('../services/dsaJudge');
const { createDsaHandlers } = require('../controllers/dsaController');
const { protect } = require('../middlewares/authMiddleware');

test('shared sheet validates and every language has starter code',()=> {
  assert.equal(validateSheet(sample),sample);
  for(const q of sample.questions) for(const language of ['javascript','python','cpp','java']) assert.ok(q.starters[language]);
});
test('sheet validation rejects unsafe IDs, invalid signatures and mismatched tests',()=> {
  for(const mutate of [s=>s.questions[0].id='__proto__',s=>s.questions[0].signature.args[0]='object',s=>s.questions[0].tests[0].args[1]='9',s=>s.questions[0].tests=[],s=>s.questions[1].id=s.questions[0].id]) {
    const s=structuredClone(sample); mutate(s); assert.throws(()=>validateSheet(s));
  }
});
test('content validation only accepts known problems/languages and strips solved state',()=> {
  const content={drafts:{'two-sum:python':'def solution(): pass'},notes:{'two-sum':'hash map'},bookmarks:{'two-sum':true},solved:{'two-sum':true}};
  assert.equal(validateContent(content,sample).solved,undefined);
  assert.throws(()=>validateContent({...content,drafts:{'two-sum:ruby':'puts 1'}},sample));
  assert.throws(()=>validateContent({...content,notes:{'unknown':'note'}},sample));
});

async function runTrusted(language,code,t,signature) {
  if (language === 'javascript') {
    const output=[];
    const source=buildHarness(language,code,t,signature);
    await runInNewContext(source,{console:{log:value=>output.push(value),error:value=>assert.fail(value)},process:{exitCode:0}},{timeout:1000});
    const line=output.find(value=>value.startsWith(PREFIX));
    assert.ok(line,JSON.stringify(output));
    assert.deepEqual(JSON.parse(line.slice(PREFIX.length)),t.expected);
    return;
  }
  const dir=mkdtempSync(path.join(tmpdir(),'prepai-harness-'));
  try {
    const source=buildHarness(language,code,t,signature);
    let command,args;
    if(language==='javascript') { command=process.execPath; args=['-e',source]; }
    else if(language==='python') { command='python3'; args=['-c',source]; }
    else if(language==='cpp') {
      const file=path.join(dir,'main.cpp'); const executable=path.join(dir,'main'); writeFileSync(file,source);
      const compiled=spawnSync('g++',['-std=c++17',file,'-o',executable],{encoding:'utf8',timeout:20000});
      assert.equal(compiled.status,0,compiled.stderr); command=executable; args=[];
    } else {
      const file=path.join(dir,'Main.java'); writeFileSync(file,source);
      const compiled=spawnSync('javac',[file],{encoding:'utf8',timeout:20000});
      assert.equal(compiled.status,0,compiled.stderr); command='java'; args=['-cp',dir,'Main'];
    }
    const result=spawnSync(command,args,{encoding:'utf8',timeout:5000});
    assert.equal(result.status,0,result.stderr);
    const line=result.stdout.split(/\r?\n/).find(l=>l.startsWith(PREFIX));
    assert.ok(line,result.stdout);
    assert.deepEqual(JSON.parse(line.slice(PREFIX.length)),t.expected);
  } finally { rmSync(dir,{recursive:true,force:true}); }
}
for(const language of ['javascript','python','cpp','java']) {
  const command=language==='java'?'javac':language==='cpp'?'g++':language==='python'?'python3':process.execPath;
  const available=language==='javascript' || !spawnSync(command,['--version']).error;
  test(`${language} generated harness executes typed array, boolean and escaped Unicode string outputs`,{skip:!available},async()=> {
    const code=language==='javascript'?'function solution(a) { return a; }':language==='python'?'def solution(a):\n    return a':language==='cpp'?'TYPE solution(TYPE a) { return a; }':'class Solution { public static TYPE solution(TYPE a) { return a; }}';
    const types={cpp:{'int[]':'vector<int>',bool:'bool',string:'string'},java:{'int[]':'int[]',bool:'boolean',string:'String'}};
    for(const [type,value] of [['int[]',[1,-2,3]],['bool',true],['string','héllo\n"\\\u0000😀']]) {
      const source=code.replaceAll('TYPE',types[language]?.[type] || type);
      await runTrusted(language,source,{args:[value],expected:value},{args:[type],returns:type});
    }
  });
}
test('all sample expectations match trusted JavaScript solutions through the production harness',async()=> {
  const solutions={
    'two-sum':'function solution(a,t){for(let i=0;i<a.length;i++)for(let j=i+1;j<a.length;j++)if(a[i]+a[j]===t)return [i,j]}',
    'contains-duplicate':'function solution(a){return new Set(a).size!==a.length}',
    'valid-anagram':'function solution(a,b){return [...a].sort().join(\'\')===[...b].sort().join(\'\')}',
    'binary-search':'function solution(a,t){return a.indexOf(t)}',
    'valid-parentheses':'function solution(s){let st=[];let p={\')\':\'(\',\']\':\'[\',\'}\':\'{\'};for(const c of s){if(\'([{\'.includes(c))st.push(c);else if(st.pop()!==p[c])return false}return !st.length}',
    'max-subarray':'function solution(a){let s=a[0],b=s;for(let n of a.slice(1)){s=Math.max(n,s+n);b=Math.max(b,s)}return b}',
    'product-except-self':'function solution(a){return a.map((_,i)=>a.reduce((p,n,j)=>j===i?p:p*n,1))}',
    'trapping-rain-water':'function solution(a){return a.reduce((s,n,i)=>s+Math.max(0,Math.min(Math.max(...a.slice(0,i+1)),Math.max(...a.slice(i)))-n),0)}',
  };
  for(const q of sample.questions) for(const t of q.tests) await runTrusted('javascript',solutions[q.id],t,q.signature);
});
test('Java harness generates typed calls, safe Unicode literals, and a Main entry point',()=> {
  const source=buildHarness('java','import java.util.Arrays;\npublic class Solution { public static String solution(String s) { return s; }}',{args:['"\\😀'],expected:'"\\😀'},{args:['string'],returns:'string'});
  assert.match(source,/public class Main/);
  assert.match(source,/class Solution/);
  assert.doesNotMatch(source,/public class Solution/);
  assert.match(source,/new String\(new int\[\]\{34,92,128512\},0,3\)/);
  assert.match(source,/new Solution\(\)\.solution\(arg0\)/);
  const array=buildHarness('java',sample.questions[0].starters.java,sample.questions[0].tests[0],sample.questions[0].signature);
  assert.match(array,/new int\[\]\{2,7,11,15\}/);
  assert.match(array,/int arg1 = 9/);
});

const b64=s=>Buffer.from(s).toString('base64');
const judgeEnv={JUDGE0_URL:'https://judge.example',JUDGE0_AUTH_TOKEN:'test-only-token'};
test('local execution mode enables the local provider without a Judge0 endpoint',()=> {
  const judge=createJudge(null,{DSA_EXECUTION_MODE:'local'});
  assert.equal(judge.engine,'local');
  assert.ok(Array.isArray(judge.languages()));
});
test('judge submits base64 source with bounded resources and network disabled',async()=> {
  let request;
  const judge=createJudge({post:async(url,body,options)=> {request={url,body,options};return {data:[{token:'test-token'}]}}},judgeEnv);
  const tokens=await judge.start('python','def solution(a): return a',[{args:[1],expected:1}],{args:['int'],returns:'int'});
  assert.deepEqual(tokens,['test-token']);
  const job=request.body.submissions[0];
  assert.equal(job.enable_network,false); assert.equal(job.cpu_time_limit,3); assert.equal(job.wall_time_limit,5); assert.equal(job.memory_limit,256000); assert.equal(job.max_file_size,128);
  assert.match(Buffer.from(job.source_code,'base64').toString(),/def solution/);
  assert.equal(request.options.headers['X-Auth-Token'],'test-only-token');
});
test('unconfigured judge fails clearly without a provider call',async()=> {
  const judge=createJudge({post:()=>assert.fail('must not call provider')},{});
  await assert.rejects(()=>judge.start('javascript','',[],null),e=>e.status===503);
});
test('judge waits for pending cases and restores provider token order before comparison',async()=> {
  const tests=[{args:[1],expected:{a:1,b:2}},{args:[2],expected:2}];
  const judge=createJudge({get:async()=>({data:{submissions:[
    {token:'b',status:{id:3,description:'Accepted'},stdout:b64(PREFIX+'2'),time:'0.01',memory:1000},
    {token:'a',status:{id:3,description:'Accepted'},stdout:b64('debug output\n'+PREFIX+'{"b":2,"a":1}'),time:'0.02',memory:1000},
  ]}})},judgeEnv);
  const result=await judge.poll(['a','b'],tests);
  assert.ok(result.results.every(r=>r.passed)); assert.equal(result.results[0].ms,20);
  const pending=createJudge({get:async()=>({data:{submissions:[{token:'a',status:{id:2}}]}})},judgeEnv);
  assert.equal(await pending.poll(['a'],tests.slice(0,1)),null);
});
test('judge reports wrong answers, compile failures, timeouts and invalid output',async()=> {
  const cases=[{status:{id:3},stdout:b64(PREFIX+'99')},{status:{id:6,description:'Compilation Error'},compile_output:b64('compile failed')},{status:{id:5,description:'Time Limit Exceeded'}},{status:{id:3},stdout:b64('no result')}];
  for(const c of cases) {
    const judge=createJudge({get:async()=>({data:{submissions:[{token:'a',...c}]}})},judgeEnv);
    const result=await judge.poll(['a'],[{args:[],expected:1}]);
    assert.equal(result.results[0].passed,false);
    if(c.status.id!==3 || !c.stdout.includes(b64(PREFIX+'99'))) assert.ok(result.results[0].error);
  }
});

function fixture() {
  const ws=new Map(),subs=new Map();
  const row=values=>Object.assign(values,{async update(update){Object.assign(this,update);this.updatedAt=new Date();return this}});
  const workspaces={
    async findOrCreate({where,defaults}) {if(!ws.has(where.userId))ws.set(where.userId,row({...structuredClone(defaults),userId:where.userId}));return [ws.get(where.userId),false]},
    async findOne({where}) {return ws.get(where.userId)||null},
  };
  const submissions={
    async create(values) {const value=row({...structuredClone(values),id:randomUUID(),createdAt:new Date(),result:null});subs.set(value.id,value);return value},
    async findOne({where}) {const value=subs.get(where.id);return value?.userId===where.userId?value:null},
    async findAll({where}) {return [...subs.values()].filter(s=>Object.entries(where).every(([key,value])=>s[key]===value)).reverse().slice(0,30)},
  };
  const db={transaction:async fn=>fn({LOCK:{UPDATE:'update'}})};
  const judge={configured:()=>true,start:async()=>['test-token'],poll:async(tokens,tests)=>({results:tests.map(t=>({passed:true,actual:JSON.stringify(t.expected)}))})};
  const handlers=createDsaHandlers({db,workspaces,submissions,judge});
  const response=()=>({statusCode:200,status(code){this.statusCode=code;return this},json(value){this.data=value;return this}});
  const req=(userId,body={},params={})=>({user:{id:userId},body,params,query:{}});
  const workspace=async userId=> {const res=response();await handlers.workspace(req(userId),res);return res.data};
  return {ws,subs,handlers,judge,req,response,workspace};
}
test('workspace initialization is isolated per account and content survives reload',async()=> {
  const f=fixture(); const a=await f.workspace(1); const b=await f.workspace(2);
  assert.notEqual(a.sheetKey,b.sheetKey);
  const content={drafts:{'two-sum:python':'def solution(): pass'},bookmarks:{'two-sum':true},notes:{'two-sum':'remember complements'}};
  const res=f.response();await f.handlers.save(f.req(1,{sheetKey:a.sheetKey,revision:0,content}),res);
  assert.equal(res.data.revision,1);assert.deepEqual((await f.workspace(1)).notes,content.notes);assert.deepEqual((await f.workspace(2)).notes,{});
});
test('stale saves are rejected and cannot overwrite newer drafts or mark solved',async()=> {
  const f=fixture();const a=await f.workspace(1);const content={drafts:{},notes:{},bookmarks:{},solved:{'two-sum':true}};
  await f.handlers.save(f.req(1,{sheetKey:a.sheetKey,revision:0,content}),f.response());
  await assert.rejects(()=>f.handlers.save(f.req(1,{sheetKey:a.sheetKey,revision:0,content}),f.response()),e=>e.status===409);
  assert.deepEqual((await f.workspace(1)).solved,{});
});
test('submission IDs cannot be used to read another account’s code or results',async()=> {
  const f=fixture();const a=await f.workspace(1);const res=f.response();
  await f.handlers.execute(f.req(1,{sheetKey:a.sheetKey,problemId:'two-sum',language:'javascript',code:'function solution(){}',kind:'submit'}),res);
  await assert.rejects(()=>f.handlers.submission(f.req(2,{}, {id:res.data.id}),f.response()),e=>e.status===404);
});
test('only server-verified full submissions mark solved; sample runs do not',async()=> {
  const f=fixture();const a=await f.workspace(1);
  for(const kind of ['run','submit']) {
    const res=f.response();await f.handlers.execute(f.req(1,{sheetKey:a.sheetKey,problemId:'two-sum',language:'javascript',code:'function solution(){}',kind}),res);
    const result=f.response();await f.handlers.submission(f.req(1,{}, {id:res.data.id}),result);
    assert.equal(result.data.result.accepted,kind==='submit');
    assert.equal(Boolean((await f.workspace(1)).solved['two-sum']),kind==='submit');
  }
});
test('wrong answers do not mark a problem solved',async()=> {
  const f=fixture();const a=await f.workspace(1);f.judge.poll=async()=>({results:[{passed:false}]});
  const res=f.response();await f.handlers.execute(f.req(1,{sheetKey:a.sheetKey,problemId:'two-sum',language:'python',code:'def solution(): pass',kind:'submit'}),res);
  const result=f.response();await f.handlers.submission(f.req(1,{}, {id:res.data.id}),result);
  assert.equal(result.data.status,'wrong_answer');assert.deepEqual((await f.workspace(1)).solved,{});
});
test('import rotates sheet identity and old in-flight submissions cannot solve new sheet',async()=> {
  const f=fixture();const a=await f.workspace(1);const execution=f.response();
  await f.handlers.execute(f.req(1,{sheetKey:a.sheetKey,problemId:'two-sum',language:'java',code:'class Solution {}',kind:'submit'}),execution);
  await f.handlers.importSheet(f.req(1,{sheet:sample,sheetKey:a.sheetKey,revision:0}),f.response());
  const imported=await f.workspace(1);assert.notEqual(a.sheetKey,imported.sheetKey);
  await f.handlers.submission(f.req(1,{}, {id:execution.data.id}),f.response());
  assert.deepEqual((await f.workspace(1)).solved,{});
  await assert.rejects(()=>f.handlers.execute(f.req(1,{sheetKey:a.sheetKey,problemId:'two-sum',language:'java',code:'class Solution {}',kind:'submit'}),f.response()),e=>e.status===409);
});
test('provider failures persist as service errors and never mark solved',async()=> {
  const f=fixture();const a=await f.workspace(1);f.judge.start=async()=>{throw new Error('provider unavailable')};
  await assert.rejects(()=>f.handlers.execute(f.req(1,{sheetKey:a.sheetKey,problemId:'two-sum',language:'javascript',code:'function solution(){}',kind:'submit'}),f.response()));
  assert.equal([...f.subs.values()][0].status,'service_error');assert.deepEqual((await f.workspace(1)).solved,{});
});
test('execution ignores caller-provided tests and uses stored sheet cases',async()=> {
  const f=fixture();const a=await f.workspace(1);let received;
  f.judge.start=async(language,code,tests)=>{received=tests;return tests.map(()=>randomUUID())};
  await f.handlers.execute(f.req(1,{sheetKey:a.sheetKey,problemId:'two-sum',language:'cpp',code:'int solution(){}',kind:'submit',tests:[{args:[],expected:true}]}),f.response());
  assert.deepEqual(received,sample.questions[0].tests);
});
test('existing authentication guard rejects missing bearer tokens before database access',async()=> {
  const res={status(code){this.code=code;return this},json(value){this.data=value}};
  await protect({headers:{}},res,()=>assert.fail('must not authorize'));
  assert.equal(res.code,401);
});
