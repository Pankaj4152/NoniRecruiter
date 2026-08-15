import fs from 'fs';
import path from 'path';
import {
  FinalInterviewReport,
  HiringVerdict,
  InterviewSession,
  ModelTrace,
  TurnEvaluation,
} from './types';

export class ReportGenerator {
  public static createReportData(session: InterviewSession, evaluations: TurnEvaluation[]): FinalInterviewReport {
    if (!evaluations.length) return ReportGenerator.createEmptyReport(session);

    const average = (selector: (evaluation: TurnEvaluation) => number) =>
      Math.round((evaluations.reduce((sum, evaluation) => sum + selector(evaluation), 0) / evaluations.length) * 10);
    const technicalAccuracy = average((evaluation) => evaluation.technicalAccuracyScore);
    const communicationClarity = average((evaluation) => evaluation.communicationScore);
    const problemSolving = average((evaluation) => evaluation.problemSolvingScore);
    const overallScore = Math.round(technicalAccuracy * 0.45 + communicationClarity * 0.3 + problemSolving * 0.25);

    let verdict: HiringVerdict = 'NO HIRE';
    if (overallScore >= 85) verdict = 'STRONG HIRE';
    else if (overallScore >= 75) verdict = 'HIRE';
    else if (overallScore >= 65) verdict = 'LEAN HIRE';

    const modelUsage = buildModelUsage(session, evaluations);
    const timing = buildTimingSummary(session);
    const confidence = getConfidence(evaluations.length, modelUsage.fallbackCalls, timing);
    const strengths = unique(evaluations.flatMap((evaluation) => evaluation.strengthsEvidence).filter(Boolean)).slice(0, 5);
    const concerns = unique([
      ...evaluations.flatMap((evaluation) => evaluation.redFlagsEvidence),
      ...evaluations
        .filter((evaluation) => Math.min(evaluation.technicalAccuracyScore, evaluation.communicationScore, evaluation.problemSolvingScore) < 7)
        .map((evaluation) => evaluation.feedbackNotes),
    ].filter(Boolean)).slice(0, 5);

    if (!concerns.length && overallScore < 75) {
      concerns.push('The evidence was adequate but not consistently detailed or measurable; use a focused follow-up to validate depth.');
    }

    return {
      sessionId: session.sessionId,
      candidateName: session.candidate.name,
      targetRole: session.candidate.targetRole,
      date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
      overallScore,
      verdict,
      confidence,
      executiveSummary: buildExecutiveSummary(session, verdict, confidence, strengths, concerns),
      recommendedNextStep: getRecommendedNextStep(verdict, confidence),
      timing,
      modelUsage,
      scores: { technicalAccuracy, communicationClarity, problemSolving },
      strengths,
      areasForImprovement: concerns,
      turnEvaluations: evaluations,
      fullTranscript: session.turns,
    };
  }

  public static saveMarkdownReport(report: FinalInterviewReport): string {
    const evidenceRows = report.turnEvaluations.map((evaluation) => {
      const evidence = evaluation.strengthsEvidence[0] || evaluation.feedbackNotes;
      return `| ${evaluation.turnId} | ${formatPhase(evaluation.phase)} | ${evaluation.technicalAccuracyScore}/10 | ${evaluation.communicationScore}/10 | ${evaluation.problemSolvingScore}/10 | ${escapeTable(evidence)} |`;
    }).join('\n');
    const transcript = report.fullTranscript.map((turn) =>
      `**Turn ${turn.turnId} - ${turn.speaker === 'interviewer' ? 'NoniRecruiter' : report.candidateName}** | ${formatPhase(turn.phase)}\n\n${turn.text}\n`
    ).join('\n');

    const markdown = `# NoniRecruiter Interview Report

## Candidate

| Candidate | Role | Date | Session |
|---|---|---|---|
| ${escapeTable(report.candidateName)} | ${escapeTable(report.targetRole)} | ${report.date} | \`${report.sessionId}\` |

## Executive Recommendation

**${report.verdict} | ${report.overallScore}/100 | ${report.confidence} confidence**

${report.executiveSummary}

**Recommended next step:** ${report.recommendedNextStep}

## Competency Scorecard

| Competency | Score |
|---|---:|
| Technical accuracy and depth | ${report.scores.technicalAccuracy}/100 |
| Communication and structure | ${report.scores.communicationClarity}/100 |
| Problem solving and systems thinking | ${report.scores.problemSolving}/100 |

## Evidence-Backed Strengths

${renderList(report.strengths, 'No sufficiently specific strength evidence was captured.')}

## Development and Follow-up Areas

${renderList(report.areasForImprovement, 'No major concern was identified in the available evidence.')}

## Interview Audit

| Requested | Actual | Started | Ended | Completion |
|---:|---:|---|---|---|
| ${report.timing.requestedDurationMinutes}m | ${formatDuration(report.timing.actualDurationSeconds)} | ${formatTimestamp(report.timing.startedAt)} | ${formatTimestamp(report.timing.endedAt)} | ${escapeTable(report.timing.completionReason)} |

**Phases covered:** ${report.timing.phasesCovered.map(formatPhase).join(' -> ')}

**AI runtime:** ${report.modelUsage.providers.join(', ') || 'not tracked'} | ${report.modelUsage.models.join(', ') || 'not tracked'}  
**Fallback calls:** ${report.modelUsage.fallbackCalls}/${report.modelUsage.totalTrackedCalls} | **Average latency:** ${report.modelUsage.averageLatencyMs}ms

## Per-Turn Evidence

| Turn | Phase | Technical | Communication | Problem solving | Evidence or evaluator note |
|---:|---|---:|---:|---:|---|
${evidenceRows || '| — | — | — | — | — | No evaluated candidate turns |'}

## Full Transcript

${transcript}

---

*Generated by NoniRecruiter. This report is decision support and requires human review.*
`;

    const safeName = report.candidateName.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') || 'candidate';
    const filePath = path.join(process.cwd(), `interview_report_${safeName}_${Date.now()}.md`);
    fs.writeFileSync(filePath, markdown, 'utf-8');
    return filePath;
  }

  private static createEmptyReport(session: InterviewSession): FinalInterviewReport {
    const timing = buildTimingSummary(session);
    const modelUsage = buildModelUsage(session, []);
    return {
      sessionId: session.sessionId,
      candidateName: session.candidate.name,
      targetRole: session.candidate.targetRole,
      date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
      overallScore: 0,
      verdict: 'NO HIRE',
      confidence: 'LOW',
      executiveSummary: 'The session did not capture enough candidate evidence to support a hiring recommendation.',
      recommendedNextStep: 'Repeat the interview or conduct a structured human follow-up before making a decision.',
      timing,
      modelUsage,
      scores: { technicalAccuracy: 0, communicationClarity: 0, problemSolving: 0 },
      strengths: [],
      areasForImprovement: ['Insufficient interview evidence to make a hiring recommendation.'],
      turnEvaluations: [],
      fullTranscript: session.turns,
    };
  }
}

function buildTimingSummary(session: InterviewSession): FinalInterviewReport['timing'] {
  const endedAt = session.endTime || new Date().toISOString();
  const wallClockSeconds = Math.max(0, Math.round((new Date(endedAt).getTime() - new Date(session.startTime).getTime()) / 1000));
  return {
    requestedDurationMinutes: session.targetDurationMinutes,
    actualDurationSeconds: Math.max(session.elapsedSeconds, wallClockSeconds),
    startedAt: session.startTime,
    endedAt,
    completionReason: session.completionReason || (session.isCompleted ? 'Interview completed' : 'Ended manually'),
    phasesCovered: Array.from(new Set(session.turns.map((turn) => turn.phase))),
  };
}

function buildModelUsage(session: InterviewSession, evaluations: TurnEvaluation[]): FinalInterviewReport['modelUsage'] {
  const traces = [...session.turns.map((turn) => turn.modelTrace), ...evaluations.map((evaluation) => evaluation.modelTrace)]
    .filter((trace): trace is ModelTrace => Boolean(trace));
  return {
    providers: unique(traces.map((trace) => trace.provider)),
    models: unique(traces.map((trace) => trace.model)),
    fallbackCalls: traces.filter((trace) => trace.usedFallback).length,
    totalTrackedCalls: traces.length,
    averageLatencyMs: traces.length ? Math.round(traces.reduce((sum, trace) => sum + trace.latencyMs, 0) / traces.length) : 0,
  };
}

function getConfidence(evaluationCount: number, fallbackCalls: number, timing: FinalInterviewReport['timing']): FinalInterviewReport['confidence'] {
  const durationCoverage = timing.actualDurationSeconds / Math.max(60, timing.requestedDurationMinutes * 60);
  if (evaluationCount >= 5 && fallbackCalls === 0 && durationCoverage >= 0.75) return 'HIGH';
  if (evaluationCount >= 3 && durationCoverage >= 0.45) return 'MODERATE';
  return 'LOW';
}

function buildExecutiveSummary(
  session: InterviewSession,
  verdict: HiringVerdict,
  confidence: FinalInterviewReport['confidence'],
  strengths: string[],
  concerns: string[]
): string {
  const strengthText = strengths.length ? `The strongest evidence was: "${strengths[0]}"` : 'The interview captured limited specific strength evidence.';
  const concernText = concerns.length ? `The main follow-up area is: ${concerns[0]}` : 'No major concern was identified in the available evidence.';
  return `${session.candidate.name} received a ${verdict} recommendation with ${confidence.toLowerCase()} confidence for the ${session.candidate.targetRole} role. ${strengthText} ${concernText}`;
}

function getRecommendedNextStep(verdict: HiringVerdict, confidence: FinalInterviewReport['confidence']): string {
  if (confidence === 'LOW') return 'Run a focused follow-up interview before using this recommendation.';
  if (verdict === 'STRONG HIRE' || verdict === 'HIRE') return 'Proceed to the next hiring stage with human review of the evidence.';
  if (verdict === 'LEAN HIRE') return 'Run a focused follow-up on the identified development areas.';
  return 'Do not advance based on this interview alone; review the transcript and rubric with a human interviewer.';
}

function unique<T>(values: T[]): T[] {
  return Array.from(new Set(values));
}

function renderList(items: string[], emptyText: string): string {
  return items.length ? items.map((item) => `- ${item}`).join('\n') : `- ${emptyText}`;
}

function formatPhase(phase: string): string {
  return phase.replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDuration(seconds: number): string {
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}

function formatTimestamp(value: string): string {
  return new Date(value).toLocaleString('en-US');
}

function escapeTable(value: string): string {
  return value.replace(/\|/g, '\\|').replace(/\s+/g, ' ').trim();
}
