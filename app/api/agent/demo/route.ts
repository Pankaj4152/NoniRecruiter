import { NextRequest, NextResponse } from 'next/server';
import { getDemoScenario } from '@/lib/interview/demo-scenarios';
import { InterviewEngine } from '@/lib/interview/engine';
import { parseCandidateProfile } from '@/lib/interview/parser';
import { activeSessions } from '@/lib/interview/store';

export async function POST(req: NextRequest) {
  try {
    const { scenarioId } = await req.json();
    const scenario = typeof scenarioId === 'string' ? getDemoScenario(scenarioId) : undefined;
    if (!scenario) return NextResponse.json({ error: 'Unknown demo scenario.' }, { status: 400 });

    const candidate = await parseCandidateProfile(scenario.resumeText, scenario.candidateName, scenario.roleTitle, { useLLM: false });
    const session = InterviewEngine.createSession(candidate, {
      roleTitle: scenario.roleTitle,
      companyName: scenario.companyName,
      keyRequirements: scenario.keyRequirements,
      responsibilities: [],
      fullText: scenario.jobDescription,
      customInterviewerInstructions: scenario.customInstructions,
    }, 5);
    session.isDemo = true;
    session.demoLabel = scenario.level;
    activeSessions.set(session.sessionId, session);
    await InterviewEngine.processTurn(session);

    return NextResponse.json({ sessionId: session.sessionId, inviteUrl: `/invite/${session.sessionId}` });
  } catch (error) {
    console.error('[demo-setup]', { error: error instanceof Error ? error.message : 'Unknown demo setup error' });
    return NextResponse.json({ error: 'Could not prepare the sample interview.' }, { status: 500 });
  }
}
