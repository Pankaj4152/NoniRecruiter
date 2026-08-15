import fs from 'fs';
import path from 'path';
import { 
  InterviewSession, 
  TurnEvaluation, 
  FinalInterviewReport, 
  HiringVerdict 
} from './types';

export class ReportGenerator {
  /**
   * Generates structured FinalInterviewReport data object
   */
  public static createReportData(
    session: InterviewSession,
    evaluations: TurnEvaluation[]
  ): FinalInterviewReport {
    if (evaluations.length === 0) {
      return ReportGenerator.createEmptyReport(session);
    }

    const avgTech = Math.round(
      (evaluations.reduce((sum, e) => sum + e.technicalAccuracyScore, 0) / evaluations.length) * 10
    );
    const avgComm = Math.round(
      (evaluations.reduce((sum, e) => sum + e.communicationScore, 0) / evaluations.length) * 10
    );
    const avgProb = Math.round(
      (evaluations.reduce((sum, e) => sum + e.problemSolvingScore, 0) / evaluations.length) * 10
    );

    const overallScore = Math.round(avgTech * 0.45 + avgComm * 0.3 + avgProb * 0.25);

    let verdict: HiringVerdict = 'NO HIRE';
    if (overallScore >= 85) verdict = 'STRONG HIRE';
    else if (overallScore >= 75) verdict = 'HIRE';
    else if (overallScore >= 65) verdict = 'LEAN HIRE';

    const allStrengths = evaluations.flatMap((e) => e.strengthsEvidence).filter(Boolean);
    const allRedFlags = evaluations.flatMap((e) => e.redFlagsEvidence).filter(Boolean);

    return {
      sessionId: session.sessionId,
      candidateName: session.candidate.name,
      targetRole: session.candidate.targetRole,
      date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
      overallScore,
      verdict,
      timing: buildTimingSummary(session),
      scores: {
        technicalAccuracy: avgTech,
        communicationClarity: avgComm,
        problemSolving: avgProb,
      },
      strengths: Array.from(new Set(allStrengths)).slice(0, 5),
      areasForImprovement: Array.from(new Set(allRedFlags)).slice(0, 5),
      turnEvaluations: evaluations,
      fullTranscript: session.turns,
    };
  }

  /**
   * Formats report data into GitHub Markdown format and writes to file
   */
  public static saveMarkdownReport(report: FinalInterviewReport): string {
    const verdictEmoji = 
      report.verdict === 'STRONG HIRE' ? '🟢' :
      report.verdict === 'HIRE' ? '🟢' :
      report.verdict === 'LEAN HIRE' ? '🟡' : '🔴';

    const markdownContent = `# NoniRecruiter Interview Evaluation Report

**Candidate Name**: ${report.candidateName}  
**Target Role**: ${report.targetRole}  
**Date**: ${report.date}  
**Session ID**: \`${report.sessionId}\`  

---

## Interview Timing Audit

| Requested | Actual | Started | Ended | Completion reason |
| :---: | :---: | :--- | :--- | :--- |
| ${report.timing.requestedDurationMinutes} min | ${formatDuration(report.timing.actualDurationSeconds)} | ${formatTimestamp(report.timing.startedAt)} | ${formatTimestamp(report.timing.endedAt)} | ${report.timing.completionReason} |

**Phases covered:** ${report.timing.phasesCovered.join(' -> ')}

---

## 🎯 Executive Verdict

| Overall Score | Verdict | Recommendation |
| :---: | :---: | :--- |
| **${report.overallScore} / 100** | ${verdictEmoji} **${report.verdict}** | Candidate demonstrated ${report.verdict.toLowerCase()} suitability for the role. |

---

## 📊 Competency Breakdown

- **Technical Accuracy & Depth**: \`${report.scores.technicalAccuracy} / 100\` ${renderProgressBar(report.scores.technicalAccuracy)}
- **Communication & Structure**: \`${report.scores.communicationClarity} / 100\` ${renderProgressBar(report.scores.communicationClarity)}
- **Problem Solving & Systems**: \`${report.scores.problemSolving} / 100\` ${renderProgressBar(report.scores.problemSolving)}

---

## 💡 Key Strengths & Evidence
${report.strengths.length > 0 ? report.strengths.map((s) => `- ✅ "${s}"`).join('\n') : '- Candidate demonstrated solid domain foundation.'}

## ⚠️ Areas for Improvement
${report.areasForImprovement.length > 0 ? report.areasForImprovement.map((a) => `- 🔍 "${a}"`).join('\n') : '- No major red flags identified during the session.'}

---

## 💬 Per-Turn Evidence Audit

| Turn | Phase | Technical Score | Communication | Evidence Quote / Note |
| :---: | :---: | :---: | :---: | :--- |
${report.turnEvaluations
  .map(
    (e) =>
      `| Turn ${e.turnId} | \`${e.phase}\` | ${e.technicalAccuracyScore}/10 | ${e.communicationScore}/10 | "${(e.strengthsEvidence[0] || e.feedbackNotes).replace(/\|/g, '-')}" |`
  )
  .join('\n')}

---

## 📝 Full Transcript

${report.fullTranscript
  .map(
    (t) =>
      `**[Turn ${t.turnId} - ${t.speaker === 'interviewer' ? '🤖 NoniRecruiter' : '👤 ' + report.candidateName}]** (\`${t.phase}\`)\n"${t.text}"\n`
  )
  .join('\n')}

---
*Report generated automatically by Nonilion AI Interview Engine.*
`;

    const fileName = `interview_report_${report.candidateName.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}.md`;
    const filePath = path.join(process.cwd(), fileName);
    fs.writeFileSync(filePath, markdownContent, 'utf-8');

    return filePath;
  }
  private static createEmptyReport(session: InterviewSession): FinalInterviewReport {
    return {
      sessionId: session.sessionId,
      candidateName: session.candidate.name,
      targetRole: session.candidate.targetRole,
      date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
      overallScore: 0,
      verdict: 'NO HIRE',
      timing: buildTimingSummary(session),
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
    completionReason: session.completionReason || (session.isCompleted ? 'Interview completed' : 'Ended manually by the interviewer'),
    phasesCovered: Array.from(new Set(session.turns.map((turn) => turn.phase))),
  };
}

function renderProgressBar(score: number): string {
  const totalBars = 10;
  const filledBars = Math.round((score / 100) * totalBars);
  return '`[' + '█'.repeat(filledBars) + '░'.repeat(totalBars - filledBars) + ']`';
}

function formatDuration(totalSeconds: number): string {
  return `${Math.floor(totalSeconds / 60)}m ${totalSeconds % 60}s`;
}

function formatTimestamp(value: string): string {
  return new Date(value).toLocaleString('en-US');
}
