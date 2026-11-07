const { randomUUID } = require('node:crypto');
const sampleSheet = require('../../shared/dsa-sheet.json');
const { DsaError, LANGUAGES, validateSheet, validateContent } = require('../services/dsaValidation');
const { createJudge } = require('../services/dsaJudge');
const { sequelize } = require('../config/database');
const Workspace = require('../models/DsaWorkspace');
const Submission = require('../models/DsaSubmission');

function createDsaHandlers({ db = sequelize, workspaces = Workspace, submissions = Submission, judge = createJudge() } = {}) {
  async function getWorkspace(userId) {
    const [workspace] = await workspaces.findOrCreate({ where: { userId }, defaults: { sheetKey: randomUUID(), sheet: sampleSheet, content: { drafts: {}, bookmarks: {}, notes: {} }, solved: {}, revision: 0 } });
    return workspace;
  }
  const responseWorkspace = workspace => ({ ...workspace.content, sheet: workspace.sheet, solved: workspace.solved, sheetKey: workspace.sheetKey, revision: workspace.revision, executionConfigured: judge.configured(), executionEngine: judge.engine || 'judge0', languages: judge.languages ? judge.languages() : LANGUAGES });
  const ownedSubmission = async (req) => {
    if (!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(req.params.id)) throw new DsaError('Submission not found.',404);
    const submission = await submissions.findOne({ where: { id: req.params.id, userId: req.user.id } });
    if (!submission) throw new DsaError('Submission not found.',404);
    return submission;
  };
  return {
    async workspace(req,res) { res.json(responseWorkspace(await getWorkspace(req.user.id))); },
    async save(req,res) {
      const { sheetKey, revision, content } = req.body;
      if (!Number.isSafeInteger(revision) || revision < 0) throw new DsaError('Invalid workspace revision.');
      const saved = await db.transaction(async transaction => {
        const workspace = await workspaces.findOne({ where: { userId: req.user.id }, transaction, lock: transaction.LOCK.UPDATE });
        if (!workspace || workspace.sheetKey !== sheetKey || workspace.revision !== revision) throw new DsaError('Your workspace changed on another device. Reload before saving to avoid overwriting it.',409);
        const clean = validateContent(content,workspace.sheet);
        await workspace.update({ content: clean, revision: workspace.revision + 1 }, { transaction });
        return { revision: workspace.revision, updatedAt: workspace.updatedAt };
      });
      res.json(saved);
    },
    async importSheet(req,res) {
      const sheet = validateSheet(req.body.sheet);
      const workspace = await db.transaction(async transaction => {
        const current = await workspaces.findOne({ where: { userId: req.user.id }, transaction, lock: transaction.LOCK.UPDATE });
        if (!current || current.sheetKey !== req.body.sheetKey || current.revision !== req.body.revision) throw new DsaError('Your workspace changed. Reload before importing.',409);
        return current.update({ sheet, sheetKey: randomUUID(), revision: current.revision+1, content: { drafts:{}, bookmarks:{}, notes:{} }, solved:{} }, { transaction });
      });
      res.json(responseWorkspace(workspace));
    },
    async execute(req,res) {
      const { sheetKey, problemId, language, code, kind } = req.body;
      if (!LANGUAGES.includes(language) || !['run','submit'].includes(kind) || typeof code !== 'string' || !code.trim() || Buffer.byteLength(code)>64000) throw new DsaError('Provide a supported language, execution kind, and code up to 64 KB.');
      if (!judge.configured()) throw new DsaError('Code execution is not configured. Enable the local runner or configure a Judge0 endpoint.',503);
      const workspace = await getWorkspace(req.user.id);
      if (workspace.sheetKey !== sheetKey) throw new DsaError('The sheet has changed. Reload your workspace.',409);
      const question = workspace.sheet.questions.find(q=>q.id===problemId);
      if (!question) throw new DsaError('Problem not found.',404);
      if (['java','cpp'].includes(language) && !question.signature) throw new DsaError('C++ and Java require a typed function signature for this imported problem.');
      const tests = kind === 'run' ? question.tests.slice(0,2) : question.tests;
      const submission = await submissions.create({ userId:req.user.id, sheetKey, problemId, language, code, kind, tests, status:'starting', tokens:[] });
      try {
        const tokens = await judge.start(language,code,tests,question.signature);
        await submission.update({ tokens, status:'pending' });
        res.status(202).json({ id:submission.id, status:'pending' });
      } catch (error) {
        await submission.update({ status:'service_error', result:{ error:error.message, submitted:kind==='submit', accepted:false } });
        throw error;
      }
    },
    async submission(req,res) {
      const submission = await ownedSubmission(req);
      let result = submission.result;
      if (['starting','pending'].includes(submission.status)) {
        if (Date.now()-new Date(submission.createdAt).getTime()>5*60*1000) {
          result={ error:'Execution expired. Please submit again.',accepted:false,submitted:submission.kind==='submit' };
        } else if (submission.tokens.length) {
          result = await judge.poll(submission.tokens,submission.tests);
          if (result) { result.submitted=submission.kind==='submit'; result.accepted=result.submitted && result.results.every(r=>r.passed); }
        }
        if (result) {
          await db.transaction(async transaction => {
            const locked = await submissions.findOne({ where:{id:submission.id,userId:req.user.id},transaction,lock:transaction.LOCK.UPDATE });
            if (locked.result) { result=locked.result; submission.status=locked.status; return; }
            const status = result.error ? 'execution_error' : result.results.some(r=>r.error) ? 'execution_error' : result.results.every(r=>r.passed) ? 'accepted' : 'wrong_answer';
            await locked.update({ result,status },{transaction});
            submission.status=status;
            if (result.accepted) {
              const workspace=await workspaces.findOne({where:{userId:req.user.id},transaction,lock:transaction.LOCK.UPDATE});
              if (workspace?.sheetKey===submission.sheetKey) await workspace.update({solved:{...workspace.solved,[submission.problemId]:true}},{transaction});
            }
          });
        }
      }
      res.json({ id:submission.id, problemId:submission.problemId, sheetKey:submission.sheetKey, language:submission.language, code:submission.code, kind:submission.kind, status:submission.status, createdAt:submission.createdAt, result });
    },
    async history(req,res) {
      const workspace=await getWorkspace(req.user.id);
      const where={userId:req.user.id,sheetKey:workspace.sheetKey};
      if (req.query.problemId) {
        if (!workspace.sheet.questions.some(q=>q.id===req.query.problemId)) throw new DsaError('Problem not found.',404);
        where.problemId=req.query.problemId;
      }
      const rows=await submissions.findAll({where,attributes:['id','problemId','language','kind','status','createdAt'],order:[['createdAt','DESC']],limit:30});
      res.json({submissions:rows});
    },
  };
}
function handle(fn) {
  return async (req,res) => {
    try { req.body = req.body || {}; await fn(req,res); }
    catch(error) {
      if (!(error instanceof DsaError)) console.error('DSA request failed:',error.name);
      res.status(error.status || 500).json({message:error.status ? error.message : 'Unable to complete this DSA request. Please retry.'});
    }
  };
}
module.exports={createDsaHandlers,handle};
