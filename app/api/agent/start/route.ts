import { NextRequest, NextResponse } from 'next/server';
import { activeSessions } from '@/lib/interview/store';

export async function POST(req: NextRequest) {
  try {
    const { sessionId } = await req.json();
    if (typeof sessionId !== 'string' || !sessionId) return NextResponse.json({ error: 'Session ID is required.' }, { status: 400 });
    const session = activeSessions.get(sessionId);
    if (!session) return NextResponse.json({ error: 'Invitation not found or expired.' }, { status: 404 });
    if (session.isCompleted) return NextResponse.json({ error: 'This interview is already complete.' }, { status: 409 });

    if (!session.candidateStarted) {
      session.candidateStarted = true;
      session.startTime = new Date().toISOString();
      session.elapsedSeconds = 0;
    }

    return NextResponse.json({ sessionId: session.sessionId, startedAt: session.startTime, status: 'IN_PROGRESS' });
  } catch {
    return NextResponse.json({ error: 'Could not start the interview.' }, { status: 500 });
  }
}
