import { NextRequest, NextResponse } from 'next/server';
import { activeSessions } from '@/lib/interview/store';

export async function POST(req: NextRequest) {
  try {
    const { sessionId } = await req.json();
    if (typeof sessionId !== 'string' || !sessionId) return NextResponse.json({ error: 'Session ID is required.' }, { status: 400 });
    const session = activeSessions.get(sessionId);
    if (!session) return NextResponse.json({ error: 'Session not found or expired.' }, { status: 404 });
    if (!session.candidateStarted) return NextResponse.json({ error: 'The interview has not started.' }, { status: 409 });
    if (!session.turns.some((turn) => turn.speaker === 'candidate' && turn.text.trim())) return NextResponse.json({ error: 'Submit at least one answer before ending the interview.' }, { status: 422 });

    if (!session.isCompleted) {
      session.isCompleted = true;
      session.currentPhase = 'COMPLETED';
      session.endTime = new Date().toISOString();
      session.elapsedSeconds = Math.max(0, Math.round((Date.now() - new Date(session.startTime).getTime()) / 1000));
      session.completionReason = 'Ended by candidate';
    }

    return NextResponse.json({ sessionId, status: 'COMPLETED' });
  } catch {
    return NextResponse.json({ error: 'Could not end the interview.' }, { status: 500 });
  }
}
