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
    
    // Coding Score (if applicable)
    const codingEvals = evaluations.map((e) => e.codingEvaluation).filter((ce): ce is NonNullable<typeof ce> => Boolean(ce));
    let codingScore: number | undefined = undefined;
    let codingSummary: FinalInterviewReport['codingSummary'] = undefined;
    if (codingEvals.length > 0) {
      const avgSyntax = Math.round((codingEvals.reduce((s, c) => s + c.syntaxCorrectnessScore, 0) / codingEvals.length) * 10);
      const avgEfficiency = Math.round((codingEvals.reduce((s, c) => s + c.algorithmicEfficiencyScore, 0) / codingEvals.length) * 10);
      codingScore = Math.round((avgSyntax + avgEfficiency) / 2);
      codingSummary = {
        problemsPresented: codingEvals.length,
        averageSyntaxScore: avgSyntax,
        averageEfficiencyScore: avgEfficiency,
      };
    }

    // Phase 2: Calibrated Role-Based Scoring Rubrics
    const rubric = session.job.rubricWeights || session.candidate.rubricWeights || {
      technicalAccuracy: 45,
      communication: 30,
      problemSolving: 25,
      coding: codingScore !== undefined ? 30 : 0,
    };

    let overallScore: number;
    if (codingScore !== undefined) {
      // Normalize when coding is present
      const techW = rubric.technicalAccuracy || 35;
      const commW = rubric.communication || 25;
      const probW = rubric.problemSolving || 20;
      const codeW = rubric.coding || 20;
      const totalW = techW + commW + probW + codeW;
      overallScore = Math.round(
        (technicalAccuracy * techW + communicationClarity * commW + problemSolving * probW + codingScore * codeW) / totalW
      );
    } else {
      const techW = rubric.technicalAccuracy || 45;
      const commW = rubric.communication || 30;
      const probW = rubric.problemSolving || 25;
      const totalW = techW + commW + probW;
      overallScore = Math.round(
        (technicalAccuracy * techW + communicationClarity * commW + problemSolving * probW) / totalW
      );
    }

    const hasUnvalidatedEvaluation = evaluations.some((evaluation) => !evaluation.modelTrace || evaluation.modelTrace.usedFallback);
    if (hasUnvalidatedEvaluation) overallScore = 0;

    let verdict: HiringVerdict = hasUnvalidatedEvaluation ? 'INCONCLUSIVE' : 'NO HIRE';
    if (overallScore >= 85) verdict = 'STRONG HIRE';
    else if (overallScore >= 75) verdict = 'HIRE';
    else if (overallScore >= 65) verdict = 'LEAN HIRE';

    // Anti-Hallucination & Skill Discovery summary
    const additionalSkills = evaluations.flatMap((e) => e.antiHallucination?.unsupportedTechOrClaims || []);
    const flaggedClaims = evaluations.flatMap((e) => e.antiHallucination?.hallucinatedClaims || []);
    const totalContradictions = flaggedClaims.length;
    const groundednessScore = Math.max(0, 100 - totalContradictions * 25);
    const antiHallucinationSummary = {
      totalHallucinationFlags: totalContradictions,
      flaggedClaims: unique(flaggedClaims),
      additionalSkillsDiscovered: unique(additionalSkills),
      overallGroundednessScore: groundednessScore,
    };

    // Phase 3: Integrity & Anti-Cheat Summary
    const integritySummary = session.integrityMetrics || {
      pasteEventsCount: 0,
      maxPastedLength: 0,
      flaggedCopyPaste: false,
      averageResponseDelaySec: 0,
      integrityScore: 100,
      integrityVerdict: 'HIGH INTEGRITY',
    };

    const modelUsage = buildModelUsage(session, evaluations);
    const timing = buildTimingSummary(session);
    const confidence = hasUnvalidatedEvaluation ? 'LOW' : getConfidence(evaluations.length, modelUsage.fallbackCalls, timing);
    const strengths = unique([
      ...(hasUnvalidatedEvaluation ? [] : evaluations.flatMap((evaluation) => evaluation.strengthsEvidence)),
    ].filter(Boolean)).slice(0, 5);
    const concerns = unique([
      ...evaluations.flatMap((evaluation) => evaluation.redFlagsEvidence),
      ...antiHallucinationSummary.flaggedClaims.map((c) => `Transcript contradiction: ${c}`),
      ...antiHallucinationSummary.additionalSkillsDiscovered.map((s) => `Unverified claim: ${s}`),
      ...(hasUnvalidatedEvaluation ? ['Live evaluator unavailable; heuristic scores are excluded from hiring decisions.'] : []),
      ...(integritySummary.flaggedCopyPaste ? [`Candidate Integrity Warning: Detected ${integritySummary.pasteEventsCount} copy-paste events (Max pasted chunk: ${integritySummary.maxPastedLength} chars)`] : []),
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
      scores: { technicalAccuracy, communicationClarity, problemSolving, codingScore },
      antiHallucinationSummary,
      codingSummary,
      rubricWeights: rubric,
      integritySummary,
      strengths,
      areasForImprovement: concerns,
      turnEvaluations: evaluations,
      fullTranscript: session.turns,
    };
  }

  public static saveMarkdownReport(report: FinalInterviewReport): string {
    const evidenceRows = report.turnEvaluations.map((evaluation) => {
      const evidence = evaluation.strengthsEvidence[0] || evaluation.feedbackNotes;
      const groundedBadge = evaluation.antiHallucination?.isGroundedInResume === false ? ' ⚠️ [Contradiction Detected]' : '';
      return `| ${evaluation.turnId} | ${formatPhase(evaluation.phase)} | ${evaluation.technicalAccuracyScore}/10 | ${evaluation.communicationScore}/10 | ${evaluation.problemSolvingScore}/10 | ${escapeTable(evidence)}${groundedBadge} |`;
    }).join('\n');

    const transcript = report.fullTranscript.map((turn) =>
      `**Turn ${turn.turnId} - ${turn.speaker === 'interviewer' ? 'NoniRecruiter' : report.candidateName}** | ${formatPhase(turn.phase)}\n\n${turn.text}\n`
    ).join('\n');

    const codingSection = report.scores.codingScore !== undefined ? `
## Coding & Technical Challenge Scorecard

| Problem Count | Average Syntax Score | Average Efficiency Score | Overall Coding Score |
|---:|---:|---:|---:|
| ${report.codingSummary?.problemsPresented || 0} | ${report.codingSummary?.averageSyntaxScore || 0}/100 | ${report.codingSummary?.averageEfficiencyScore || 0}/100 | ${report.scores.codingScore}/100 |
` : '';

    const hallucinationSection = report.antiHallucinationSummary ? `
## Fact Checking & Resume Verification Matrix

- **Overall Transcript Groundedness Score**: ${report.antiHallucinationSummary.overallGroundednessScore}/100
- **Direct Transcript Contradictions**: ${report.antiHallucinationSummary.totalHallucinationFlags}
${renderList(report.antiHallucinationSummary.flaggedClaims, 'No direct contradictions detected across transcript turns.')}
` : '';

    const integritySection = report.integritySummary ? `
## Candidate Integrity & Anti-Cheat Audit

| Integrity Verdict | Score | Copy-Paste Events | Max Pasted Chunk | Anti-Cheat Status |
|---|---:|---:|---:|---|
| **${report.integritySummary.integrityVerdict}** | ${report.integritySummary.integrityScore}/100 | ${report.integritySummary.pasteEventsCount} | ${report.integritySummary.maxPastedLength} chars | ${report.integritySummary.flaggedCopyPaste ? '⚠️ FLAGGED ANOMALY' : '✅ PASSED'} |
` : '';

    const markdown = `# NoniRecruiter Interview Report

## Candidate

| Candidate | Role | Date | Session |
|---|---|---|---|
| ${escapeTable(report.candidateName)} | ${escapeTable(report.targetRole)} | ${report.date} | \`${report.sessionId}\` |

## Executive Recommendation

**${report.verdict} | ${report.overallScore}/100 | ${report.confidence} confidence**

${report.verdict === 'INCONCLUSIVE' ? '> This report is for demonstration only. Live evaluator output was unavailable, so no hiring recommendation was produced.' : ''}

${report.executiveSummary}

**Recommended next step:** ${report.recommendedNextStep}

## Competency Scorecard

| Competency | Score |
|---|---:|
| Technical accuracy and depth | ${report.scores.technicalAccuracy}/100 |
| Communication and structure | ${report.scores.communicationClarity}/100 |
| Problem solving and systems thinking | ${report.scores.problemSolving}/100 |
${report.scores.codingScore !== undefined ? `| Live coding and algorithmic logic | ${report.scores.codingScore}/100 |\n` : ''}
${codingSection}
${hallucinationSection}
${integritySection}

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
  if (verdict === 'INCONCLUSIVE') return 'Enable a live evaluator and repeat the interview before making any hiring decision.';
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
