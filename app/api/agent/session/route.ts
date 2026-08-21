import { NextRequest, NextResponse } from 'next/server';
import { activeSessions } from '@/lib/interview/store';

export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get('sessionId');
  if (!sessionId) {
    return NextResponse.json({ error: 'Session ID is required.' }, { status: 400 });
  }

  const session = activeSessions.get(sessionId);
  if (!session) {
    return NextResponse.json({ error: 'Session not found.' }, { status: 404 });
  }

  return NextResponse.json({
    sessionId: session.sessionId,
    candidate: { name: session.candidate.name, targetRole: session.candidate.targetRole },
    job: { companyName: session.job.companyName, roleTitle: session.job.roleTitle },
    currentPhase: session.currentPhase,
    elapsedSeconds: session.elapsedSeconds,
    targetDurationMinutes: session.targetDurationMinutes,
    turns: session.turns,
    isCompleted: session.isCompleted,
    candidateStarted: session.candidateStarted,
    status: session.isCompleted ? 'COMPLETED' : session.candidateStarted ? 'IN_PROGRESS' : 'NOT_STARTED',
    resumeReceived: Boolean(session.candidate.resumeText.trim()),
    topics: ['Relevant experience', 'Role-specific problem solving', 'Communication', 'Situational examples'],
  });
}
