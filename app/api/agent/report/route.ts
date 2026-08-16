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
