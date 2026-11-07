const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { executeCase, availableLanguages, createLocalJudge } = require('../services/dsaLocalJudge');
const languages = availableLanguages();
const basic = { args: [2], expected: 3 };
const signature = { args: ['int'], returns: 'int' };
for (const [language, code] of [
  ['javascript','function solution(a) { return a+1; }'],
  ['python','def solution(a):\n    return a+1'],
  ['cpp','int solution(int a) { return a+1; }'],
  ['java','class Solution { public static int solution(int a) { return a+1; }}'],
]) {
  test(`isolated local ${language} solution returns its actual output`, {skip: !languages.includes(language)}, async()=> {
    const result = await executeCase(language,code,basic,signature,process.env);
    assert.equal(result.passed,true,JSON.stringify(result)); assert.equal(result.actual,'3');
  });
}
test('local execution reports wrong answers, runtime errors, and compilation errors', async()=> {
  const wrong=await executeCase('javascript','function solution() { return 99; }',basic,signature,process.env);
  assert.equal(wrong.passed,false); assert.equal(wrong.actual,'99');
  const runtime=await executeCase('python','def solution(a):\n    raise ValueError("test error")',basic,signature,process.env);
  assert.match(runtime.error,/test error/);
  const compile=await executeCase('cpp','int solution(int a) { syntax error }',basic,signature,process.env);
  assert.match(compile.error,/Compilation error/);
});
test('local runtimes preserve Unicode and escaped string outputs',async()=> {
  const inputs={javascript:'function solution(s) { return s; }',python:'def solution(s):\n    return s',cpp:'string solution(string s) { return s; }',java:'class Solution { public static String solution(String s) { return s; }}'};
  const value='héllo\n"\\😀';
  for(const language of languages) {
    const result=await executeCase(language,inputs[language],{args:[value],expected:value},{args:['string'],returns:'string'},process.env);
    assert.equal(result.passed,true,JSON.stringify({language,...result}));
  }
});
test('local sandbox hides host project files and credentials and blocks network access',async()=> {
  const project=path.resolve(__dirname,'../..');
  const code=`async function solution() { const fs=require('fs'); const net=require('net'); const blocked=await new Promise(resolve=>{const s=net.createConnection({host:'1.1.1.1',port:80});s.on('error',()=>resolve(true));s.on('connect',()=>{s.destroy();resolve(false)});}); return { secret: Boolean(process.env.JWT_SECRET), project:fs.existsSync(${JSON.stringify(project)}), networkBlocked:blocked }; }`;
  const result=await executeCase('javascript',code,{args:[],expected:{secret:false,project:false,networkBlocked:true}},null,{...process.env,JWT_SECRET:'verification-secret'});
  assert.equal(result.passed,true,JSON.stringify(result));
});
test('local source mount is read-only',async()=> {
  const code='def solution():\n    try:\n        open("/src/solution.py", "w").write("changed")\n        return False\n    except OSError:\n        return True';
  const result=await executeCase('python',code,{args:[],expected:true},null,process.env);
  assert.equal(result.passed,true,JSON.stringify(result));
});
test('local execution terminates infinite loops and excessive output',async()=> {
  const timeout=await executeCase('javascript','function solution() { while(true) {} }',{args:[],expected:null},null,process.env);
  assert.match(timeout.error,/Time limit/);
  const output=await executeCase('javascript','function solution() { console.log("x".repeat(150000)); return 1; }',{args:[],expected:1},null,process.env);
  assert.match(output.error,/Output limit/);
});
test('local queue returns pending jobs and then completed test results',async()=> {
  const judge=createLocalJudge();
  const tokens=await judge.start('javascript','function solution(a) { return a+1; }',[basic],signature);
  assert.equal(tokens.length,1); assert.equal(await judge.poll(tokens),null);
  let result;
  for(let i=0;i<100;i++) { result=await judge.poll(tokens); if(result)break; await new Promise(resolve=>setTimeout(resolve,30)); }
  assert.ok(result?.results[0].passed,JSON.stringify(result));
  await assert.rejects(()=>judge.poll(['unknown-token']),/backend restart/);
});
