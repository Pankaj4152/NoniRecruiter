import assert from 'node:assert/strict';
import { ReportGenerator } from '../lib/interview/report';
import { CandidateProfile, InterviewSession, TurnEvaluation } from '../lib/interview/types';

const candidate: CandidateProfile = {
  name: 'Fallback Test', targetRole: 'Engineer', experienceLevel: 'Mid', skills: ['TypeScript'],
  resumeText: 'Engineer experienced in backend systems.',
};
const session: InterviewSession = {
  sessionId: 'report-safety-test', candidate, job: {
    roleTitle: 'Engineer', companyName: 'Demo', keyRequirements: ['Systems'], responsibilities: [],
  }, currentPhase: 'COMPLETED', turnNumber: 2, maxTurns: 8, targetDurationMinutes: 5,
  startTime: new Date(Date.now() - 300_000).toISOString(), elapsedSeconds: 300,
  candidateStarted: true, invitationCreatedAt: new Date().toISOString(), turns: [], isCompleted: true,
  endTime: new Date().toISOString(), completionReason: 'test',
};
const evaluation: TurnEvaluation = {
  turnId: 1, phase: 'WARMUP', candidateAnswer: 'A long answer that is intentionally not a validated model assessment.',
  technicalAccuracyScore: 8, communicationScore: 8, problemSolvingScore: 8,
  strengthsEvidence: ['A long answer'], redFlagsEvidence: [], feedbackNotes: 'Heuristic fallback.',
  modelTrace: { provider: 'demo-fallback', model: 'deterministic-v1', latencyMs: 1, usedFallback: true },
};
const report = ReportGenerator.createReportData(session, [evaluation]);
assert.equal(report.verdict, 'INCONCLUSIVE');
assert.equal(report.confidence, 'LOW');
assert.equal(report.overallScore, 0);
assert.match(report.recommendedNextStep, /live evaluator/i);
console.log('Fallback evaluation safety test passed.');
