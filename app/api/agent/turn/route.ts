import { NextRequest, NextResponse } from 'next/server';
import { InterviewEngine } from '@/lib/interview/engine';
import { activeSessions } from '@/lib/interview/store';

export async function POST(req: NextRequest) {
  const requestId = crypto.randomUUID().slice(0, 8);
  const startedAt = Date.now();
  try {
    const { sessionId, answer, pasteLength } = await req.json();

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

    // Phase 3 Integrity Tracking
    if (typeof pasteLength === 'number' && pasteLength > 0) {
      if (!session.integrityMetrics) {
        session.integrityMetrics = {
          pasteEventsCount: 0,
          maxPastedLength: 0,
          flaggedCopyPaste: false,
          averageResponseDelaySec: 0,
          integrityScore: 100,
          integrityVerdict: 'HIGH INTEGRITY',
        };
      }
      session.integrityMetrics.pasteEventsCount += 1;
      session.integrityMetrics.maxPastedLength = Math.max(session.integrityMetrics.maxPastedLength, pasteLength);
      if (session.integrityMetrics.maxPastedLength > 200 || session.integrityMetrics.pasteEventsCount >= 3) {
        session.integrityMetrics.flaggedCopyPaste = true;
        session.integrityMetrics.integrityScore = Math.max(30, 100 - session.integrityMetrics.pasteEventsCount * 20 - (session.integrityMetrics.maxPastedLength > 300 ? 30 : 0));
        session.integrityMetrics.integrityVerdict = session.integrityMetrics.integrityScore < 60 ? 'PASTE ANOMALY FLAGGED' : 'MODERATE';
      }
    }

    console.info('[interview-turn]', { requestId, stage: 'processing', sessionId, turnNumber: session.turnNumber + 1, answerCharacters: answer.length });
    const turnResult = await InterviewEngine.processTurn(session, answer);
    
    // Browser execution previews are untrusted and are excluded from grading.
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
