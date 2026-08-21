import { NextRequest, NextResponse } from 'next/server';
import { InterviewEngine } from '@/lib/interview/engine';
import { activeSessions } from '@/lib/interview/store';

export async function POST(req: NextRequest) {
  const requestId = crypto.randomUUID().slice(0, 8);
  const startedAt = Date.now();
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
    if (!session.candidateStarted) {
      return NextResponse.json({ error: 'The candidate has not started this interview yet.' }, { status: 409 });
    }

    console.info('[interview-turn]', { requestId, stage: 'processing', sessionId, turnNumber: session.turnNumber + 1, answerCharacters: answer.length });
    const turnResult = await InterviewEngine.processTurn(session, answer);
    console.info('[interview-turn]', {
      requestId,
      stage: 'completed',
      sessionId,
      turnNumber: session.turnNumber,
      durationMs: Date.now() - startedAt,
      provider: turnResult.modelTrace?.provider,
      model: turnResult.modelTrace?.model,
      usedFallback: turnResult.modelTrace?.usedFallback,
      isCompleted: session.isCompleted,
    });

    return NextResponse.json({
      turnResult,
      currentPhase: session.currentPhase,
      elapsedSeconds: session.elapsedSeconds,
      isCompleted: session.isCompleted,
    });
  } catch (error) {
    console.error('[interview-turn]', { requestId, stage: 'failed', durationMs: Date.now() - startedAt, error: error instanceof Error ? error.message : 'Unknown turn error' });
    return NextResponse.json({ error: 'Failed to process turn.' }, { status: 500 });
  }
}
