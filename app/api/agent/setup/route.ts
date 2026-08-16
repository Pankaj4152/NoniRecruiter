import { NextRequest, NextResponse } from 'next/server';
import { parseCandidateProfile } from '@/lib/interview/parser';
import { InterviewEngine } from '@/lib/interview/engine';
import { JobDescription } from '@/lib/interview/types';
import { activeSessions } from '@/lib/interview/store';

export async function POST(req: NextRequest) {
  const requestId = crypto.randomUUID().slice(0, 8);
  const requestStartedAt = Date.now();
  const log = (stage: string, startedAt = requestStartedAt, details: Record<string, unknown> = {}) =>
    console.info('[interview-setup]', { requestId, stage, durationMs: Date.now() - startedAt, ...details });

  try {
    log('request-received');
    const formData = await req.formData();
    const name = (formData.get('name') as string) || 'Candidate';
    const role = (formData.get('role') as string) || 'AI Engineering Intern';
    const company = ((formData.get('company') as string) || 'Company').trim();
    const fullJobDescription = ((formData.get('jobDescription') as string) || '').trim();
    const requestedDuration = parseInt((formData.get('duration') as string) || '10', 10);
    const targetDurationMinutes = [5, 10, 15].includes(requestedDuration) ? requestedDuration : 10;
    const customInstructions = (formData.get('customInstructions') as string) || 'Focus on implementation depth, architecture trade-offs, failure handling, and measurable outcomes.';

    let rawResumeText = 'Software engineering candidate with experience in full-stack development, backend systems, and LLM orchestration.';
    const resumeFile = formData.get('resumeFile') as File | null;
    const resumeTextRaw = formData.get('resumeText') as string | null;
    const hasProvidedResume = Boolean((resumeFile && resumeFile.name) || (resumeTextRaw && resumeTextRaw.trim()));
    log('input-validated', requestStartedAt, {
      hasResume: hasProvidedResume,
      resumeType: resumeFile?.name ? resumeFile.name.split('.').pop()?.toLowerCase() : resumeTextRaw ? 'text' : 'none',
      targetDurationMinutes,
    });

    if (resumeFile && resumeFile.name) {
      const extractionStartedAt = Date.now();
      if (resumeFile.size > 5 * 1024 * 1024) {
        return NextResponse.json({ error: 'Resume must be smaller than 5 MB.' }, { status: 413 });
      }
      const extension = resumeFile.name.toLowerCase().split('.').pop();
      if (!extension || !['pdf', 'txt', 'md'].includes(extension)) {
        return NextResponse.json({ error: 'Only PDF, TXT, and Markdown resumes are supported.' }, { status: 415 });
      }
      const buffer = Buffer.from(await resumeFile.arrayBuffer());
      if (extension === 'pdf') {
        const pdfParseModule = await import('pdf-parse');
        const pdfParse = pdfParseModule.default || pdfParseModule;
        const parsed = await pdfParse(buffer);
        rawResumeText = parsed.text || rawResumeText;
      } else {
        rawResumeText = buffer.toString('utf-8');
      }
      log('resume-text-extracted', extractionStartedAt, { characters: rawResumeText.length });
    } else if (resumeTextRaw && resumeTextRaw.trim().length > 0) {
      rawResumeText = resumeTextRaw;
    }

    const parsingStartedAt = Date.now();
    const candidateProfile = await parseCandidateProfile(rawResumeText, name, role, { useLLM: hasProvidedResume });
    log('candidate-profile-ready', parsingStartedAt, {
      parser: hasProvidedResume ? 'llm-with-local-fallback' : 'local',
      skillCount: candidateProfile.skills.length,
    });

    const jobDescription: JobDescription = {
      roleTitle: role,
      companyName: company,
      keyRequirements: [
        'Experience building AI agents & web workflows',
        'Knowledge of TypeScript, Node.js, and modern application architecture',
        'Understanding of LLM orchestration and persistent memory architectures',
      ],
      responsibilities: [
        'Collaborate with human team members inside persistent virtual office spaces',
      ],
      fullText: fullJobDescription || `Interview for the ${role} role at ${company}.`,
      customInterviewerInstructions: customInstructions,
    };

    const session = InterviewEngine.createSession(candidateProfile, jobDescription, targetDurationMinutes);
    activeSessions.set(session.sessionId, session);
    log('session-created', requestStartedAt, { sessionId: session.sessionId });

    const firstTurnStartedAt = Date.now();
    const firstTurn = await InterviewEngine.processTurn(session);
    log('opening-question-ready', firstTurnStartedAt, {
      provider: firstTurn.modelTrace?.provider,
      model: firstTurn.modelTrace?.model,
      usedFallback: firstTurn.modelTrace?.usedFallback,
    });
    log('request-completed', requestStartedAt, { sessionId: session.sessionId });

    return NextResponse.json({
      sessionId: session.sessionId,
      candidate: candidateProfile,
      job: jobDescription,
      firstTurn,
    });
  } catch (error) {
    console.error('[interview-setup]', {
      requestId,
      stage: 'request-failed',
      durationMs: Date.now() - requestStartedAt,
      error: error instanceof Error ? error.message : 'Unknown setup error',
    });
    return NextResponse.json({ error: 'Failed to initialize candidate session.' }, { status: 500 });
  }
}
