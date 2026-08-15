import assert from 'node:assert/strict';
import { InterviewEngine } from '../lib/interview/engine';
import { ReportGenerator } from '../lib/interview/report';
import { CandidateProfile, JobDescription } from '../lib/interview/types';

const candidate: CandidateProfile = {
  name: 'Time Test',
  targetRole: 'Engineer',
  experienceLevel: 'Mid',
  skills: ['TypeScript'],
  resumeText: 'Engineer experienced in backend systems.',
};
const job: JobDescription = {
  roleTitle: 'Engineer',
  companyName: 'Demo',
  keyRequirements: ['System design'],
  responsibilities: ['Build reliable systems'],
};

const session = InterviewEngine.createSession(candidate, job, 10);

session.elapsedSeconds = 30;
assert.equal(InterviewEngine.getTimeBudget(session).depth, 'DEEP');
assert.equal(InterviewEngine.getTimeBudget(session).recommendedPhase, 'WARMUP');

session.elapsedSeconds = 300;
assert.equal(InterviewEngine.getTimeBudget(session).depth, 'FOCUSED');
assert.equal(InterviewEngine.getTimeBudget(session).remainingSeconds, 300);

session.elapsedSeconds = 450;
assert.equal(InterviewEngine.getTimeBudget(session).depth, 'HIGH_LEVEL');
assert.equal(InterviewEngine.getTimeBudget(session).recommendedPhase, 'BEHAVIORAL');

session.elapsedSeconds = 550;
assert.equal(InterviewEngine.getTimeBudget(session).depth, 'CLOSING');
assert.equal(InterviewEngine.getTimeBudget(session).recommendedPhase, 'CLOSING');

session.startTime = new Date(Date.now() - 10 * 60 * 1000).toISOString();
const result = await InterviewEngine.processTurn(session, 'My final answer is preserved before closing.');
assert.equal(result.shouldEndInterview, true);
assert.equal(result.nextPhase, 'COMPLETED');
assert.equal(session.isCompleted, true);
assert.ok(session.turns.some((turn) => turn.speaker === 'candidate' && turn.text.includes('final answer')));
const report = ReportGenerator.createReportData(session, []);
assert.equal(report.timing.requestedDurationMinutes, 10);
assert.equal(report.timing.completionReason, 'Target duration reached');
assert.ok(report.timing.actualDurationSeconds >= 600);
assert.ok(report.timing.phasesCovered.includes('COMPLETED'));

console.log('Time-budget policy tests passed.');
