import { NextRequest, NextResponse } from 'next/server';
import { CandidateEvaluator } from '@/lib/interview/evaluator';
import { ReportGenerator } from '@/lib/interview/report';
import { activeSessions, interviewReports } from '@/lib/interview/store';

export async function POST(req: NextRequest) {
  const requestId = crypto.randomUUID().slice(0, 8);
  const startedAt = Date.now();
  try {
    const { sessionId } = await req.json();

    const session = activeSessions.get(sessionId);
    if (!session) {
      return NextResponse.json({ error: 'Session not found.' }, { status: 404 });
    }
    if (!session.isCompleted) {
      return NextResponse.json({ error: 'The report will be available after the interview is completed.' }, { status: 409 });
    }
    if (!session.turns.some((turn) => turn.speaker === 'candidate' && turn.text.trim())) {
      return NextResponse.json({ error: 'A report cannot be generated because no candidate answers were submitted.' }, { status: 422 });
    }

    let reportData = interviewReports.get(sessionId);
    let reportFilePath: string | undefined;
    if (!reportData) {
      console.info('[interview-report]', { requestId, stage: 'evaluation-started', sessionId, turnCount: session.turns.length });
      const evaluationStartedAt = Date.now();
      const evaluations = await CandidateEvaluator.evaluateSession(session);
      console.info('[interview-report]', { requestId, stage: 'evaluation-completed', sessionId, durationMs: Date.now() - evaluationStartedAt, evaluationCount: evaluations.length });
      reportData = ReportGenerator.createReportData(session, evaluations);
      interviewReports.set(sessionId, reportData);
      reportFilePath = ReportGenerator.saveMarkdownReport(reportData);
    }

    console.info('[interview-report]', { requestId, stage: 'completed', sessionId, durationMs: Date.now() - startedAt, cached: !reportFilePath });

    return NextResponse.json({
      report: reportData,
      reportFilePath,
    });
  } catch (error) {
    console.error('[interview-report]', { requestId, stage: 'failed', durationMs: Date.now() - startedAt, error: error instanceof Error ? error.message : 'Unknown report error' });
    return NextResponse.json({ error: 'Failed to generate report card.' }, { status: 500 });
  }
}
