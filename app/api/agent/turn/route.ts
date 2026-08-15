import { NextRequest, NextResponse } from 'next/server';
import { InterviewEngine } from '@/lib/interview/engine';
import { activeSessions } from '@/lib/interview/store';

export async function POST(req: NextRequest) {
  try {
    const { sessionId, answer } = await req.json();

    if (typeof sessionId !== 'string' || typeof answer !== 'string' || !answer.trim()) {
      return NextResponse.json({ error: 'A valid session and answer are required.' }, { status: 400 });
    }
    if (answer.length > 12_000) {
      return NextResponse.json({ error: 'Answer is too long.' }, { status: 413 });
    }

    const session = activeSessions.get(sessionId);
    if (!session) {
      return NextResponse.json({ error: 'Session not found or expired.' }, { status: 404 });
    }
    if (session.isCompleted) {
      return NextResponse.json({ error: 'Interview is already complete.' }, { status: 409 });
    }

    const turnResult = await InterviewEngine.processTurn(session, answer);

    return NextResponse.json({
      turnResult,
      currentPhase: session.currentPhase,
      elapsedSeconds: session.elapsedSeconds,
      isCompleted: session.isCompleted,
    });
  } catch (error) {
    console.error('[Agent Turn API Error]:', error);
    return NextResponse.json({ error: 'Failed to process turn.' }, { status: 500 });
  }
}
