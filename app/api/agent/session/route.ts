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
    candidate: session.candidate,
    job: session.job,
    currentPhase: session.currentPhase,
    elapsedSeconds: session.elapsedSeconds,
    turns: session.turns,
    isCompleted: session.isCompleted,
  });
}
