import { NextRequest, NextResponse } from 'next/server';
import { CandidateEvaluator } from '@/lib/interview/evaluator';
import { ReportGenerator } from '@/lib/interview/report';
import { activeSessions, interviewReports } from '@/lib/interview/store';

export async function POST(req: NextRequest) {
  try {
    const { sessionId } = await req.json();

    const session = activeSessions.get(sessionId);
    if (!session) {
      return NextResponse.json({ error: 'Session not found.' }, { status: 404 });
    }

    let reportData = interviewReports.get(sessionId);
    let reportFilePath: string | undefined;
    if (!reportData) {
      const evaluations = await CandidateEvaluator.evaluateSession(session);
      reportData = ReportGenerator.createReportData(session, evaluations);
      interviewReports.set(sessionId, reportData);
      reportFilePath = ReportGenerator.saveMarkdownReport(reportData);
    }

    return NextResponse.json({
      report: reportData,
      reportFilePath,
    });
  } catch (error) {
    console.error('[Agent Report API Error]:', error);
    return NextResponse.json({ error: 'Failed to generate report card.' }, { status: 500 });
  }
}
