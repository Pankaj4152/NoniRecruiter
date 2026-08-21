import { 
  CandidateProfile, 
  JobDescription, 
  InterviewSession, 
  InterviewPhase, 
  EngineTurnResult,
  InterviewTimeBudget,
} from './types';
import { generateLLMCompletionDetailed, LLMMessage } from './llm';

export class InterviewEngine {
  /**
   * Initializes a new interview session with dynamic time tracking
   */
  public static createSession(
    candidate: CandidateProfile,
    job: JobDescription,
    targetDurationMinutes: number = 10
  ): InterviewSession {
    return {
      sessionId: `session_${Date.now()}`,
      candidate,
      job,
      currentPhase: 'WARMUP',
      turnNumber: 0,
      maxTurns: Math.max(8, Math.min(30, Math.round(targetDurationMinutes * 2))),
      targetDurationMinutes,
      startTime: new Date().toISOString(),
      elapsedSeconds: 0,
      candidateStarted: false,
      invitationCreatedAt: new Date().toISOString(),
      turns: [],
      isCompleted: false,
    };
  }

  public static getTimeBudget(session: InterviewSession): InterviewTimeBudget {
    const targetSeconds = Math.max(60, session.targetDurationMinutes * 60);
    const elapsedSeconds = Math.max(0, session.elapsedSeconds);
    const remainingSeconds = Math.max(0, targetSeconds - elapsedSeconds);
    const remainingPercent = Math.round((remainingSeconds / targetSeconds) * 100);
    const progress = Math.min(1, elapsedSeconds / targetSeconds);

    let depth: InterviewTimeBudget['depth'] = 'DEEP';
    let recommendedPhase: InterviewPhase = 'WARMUP';
    if (progress >= 0.9) {
      depth = 'CLOSING';
      recommendedPhase = 'CLOSING';
    } else if (progress >= 0.72) {
      depth = 'HIGH_LEVEL';
      recommendedPhase = 'BEHAVIORAL';
    } else if (progress >= 0.45) {
      depth = 'FOCUSED';
      recommendedPhase = 'TECHNICAL_PROBING';
    } else if (progress >= 0.12) {
      depth = 'DEEP';
      recommendedPhase = 'TECHNICAL_PROBING';
    }

    const candidateTurns = session.turns.filter((turn) => turn.speaker === 'candidate');
    const candidatePhases = new Set(candidateTurns.map((turn) => turn.phase));
    const coverage = [
      { phase: 'WARMUP' as InterviewPhase, label: 'Background and role fit' },
      { phase: 'TECHNICAL_PROBING' as InterviewPhase, label: 'Role-specific depth and problem solving' },
      { phase: 'BEHAVIORAL' as InterviewPhase, label: 'Behavioral evidence and communication' },
    ];
    // The first answer supplies background evidence even when the model advances the phase early.
    // A second substantive answer counts as technical coverage; behavioral evidence still requires its phase.
    const areaCovered = (phase: InterviewPhase) => {
      if (phase === 'WARMUP') return candidateTurns.length >= 1;
      if (phase === 'TECHNICAL_PROBING') return candidateTurns.length >= 2 || candidatePhases.has(phase);
      return candidatePhases.has(phase);
    };
    const coveredAreas = coverage.filter((area) => areaCovered(area.phase)).map((area) => area.label);
    const remainingAreas = coverage.filter((area) => !areaCovered(area.phase)).map((area) => area.label);

    return { targetSeconds, elapsedSeconds, remainingSeconds, remainingPercent, depth, recommendedPhase, coveredAreas, remainingAreas };
  }

  /**
   * Processes candidate response and lets AI dynamically determine phase transitions & session termination
   */
  public static async processTurn(
    session: InterviewSession,
    latestCandidateAnswer?: string
  ): Promise<EngineTurnResult> {
    // Update real elapsed time
    const startMs = new Date(session.startTime).getTime();
    session.elapsedSeconds = Math.max(0, Math.round((Date.now() - startMs) / 1000));
    const elapsedMinutes = (session.elapsedSeconds / 60).toFixed(1);

    // Record candidate turn if provided
    if (latestCandidateAnswer && latestCandidateAnswer.trim().length > 0) {
      session.turnNumber += 1;
      session.turns.push({
        turnId: session.turnNumber,
        speaker: 'candidate',
        text: latestCandidateAnswer,
        timestamp: new Date().toISOString(),
        phase: session.currentPhase,
      });
    }

    const timeBudget = InterviewEngine.getTimeBudget(session);

    // Preserve the latest answer, then close as soon as the requested budget is reached.
    if (session.turnNumber >= session.maxTurns || session.elapsedSeconds >= timeBudget.targetSeconds) {
      const closingText = 'Thank you for your time. We have reached the end of the interview, so I will close here and prepare the evidence-based report.';
      session.currentPhase = 'COMPLETED';
      session.isCompleted = true;
      session.endTime = new Date().toISOString();
      session.completionReason = session.elapsedSeconds >= timeBudget.targetSeconds ? 'Target duration reached' : 'Maximum turn limit reached';
      session.turnNumber += 1;
      session.turns.push({
        turnId: session.turnNumber,
        speaker: 'interviewer',
        text: closingText,
        timestamp: new Date().toISOString(),
        phase: 'COMPLETED',
      });
      return {
        interviewerResponse: closingText,
        nextPhase: 'COMPLETED',
        shouldProbeDeeper: false,
        shouldEndInterview: true,
        terminationReason: session.elapsedSeconds >= timeBudget.targetSeconds ? 'Target duration reached.' : 'Turn safety limit reached.',
        reasoning: 'Session concluded by the deterministic time-budget policy.',
        timeBudget,
      };
    }

    // Format structured JSON resume context
    let structuredResumeText = `Raw resume source (authoritative):\n${session.candidate.resumeText}`;
    if (session.candidate.structuredResume) {
      const sr = session.candidate.structuredResume;
      structuredResumeText += `

Parsed resume index (use only when supported by the raw source above):
- Experience: ${sr.experience.map((e) => `${e.company} (${e.role}): ${e.highlights.join('; ')}`).join('\n  ')}
- Key Projects: ${sr.projects.map((p) => `${p.title} [Tech: ${p.technologies.join(', ')}]: ${p.highlights.join('; ')}`).join('\n  ')}
- Skills explicitly found in resume: ${[
        ...sr.skills.languages,
        ...sr.skills.ai_ml,
        ...sr.skills.frameworks_libraries,
        ...sr.skills.backend_databases,
        ...sr.skills.tools_infrastructure,
      ].join(', ')}
- Achievements: ${sr.achievements.join('; ')}
- Education: ${sr.education.degree} at ${sr.education.institution} (${sr.education.year})
`;
    }

    // Construct Context & System Prompt
    const customDirectives = session.job.customInterviewerInstructions
      ? `\n=== RECRUITER CUSTOM DIRECTIVES & INTERVIEWER PERSONA ===\n${session.job.customInterviewerInstructions}\n`
      : '';

    const fullJdText = session.job.fullText
      ? `\n=== FULL JOB DESCRIPTION ===\n${session.job.fullText}\n`
      : '';

    const systemPrompt = `You are NoniRecruiter, a structured interviewer representing ${session.job.companyName}.
Your objective is to conduct a natural, realistic, and highly engaging role-specific interview for the position of ${session.job.roleTitle}.
${customDirectives}
=== CANDIDATE PROFILE & STRUCTURED RESUME JSON ===
Name: ${session.candidate.name}
Target Role: ${session.candidate.targetRole}
${structuredResumeText}

=== JOB DESCRIPTION & REQUIREMENTS ===
Role Title: ${session.job.roleTitle}
Key Requirements: ${session.job.keyRequirements.join('; ')}
${fullJdText}

=== TIME & ADAPTIVE DECISION METRICS ===
Start Time: ${session.startTime}
Elapsed Time: ${elapsedMinutes} mins (${session.elapsedSeconds} seconds)
Target Interview Duration: ${session.targetDurationMinutes} mins
Remaining Time: ${Math.floor(timeBudget.remainingSeconds / 60)}m ${timeBudget.remainingSeconds % 60}s (${timeBudget.remainingPercent}%)
Question Depth: ${timeBudget.depth}
Recommended Phase Now: ${timeBudget.recommendedPhase}
Competencies Covered: ${timeBudget.coveredAreas.length ? timeBudget.coveredAreas.join('; ') : 'None yet'}
Competencies Still Required: ${timeBudget.remainingAreas.length ? timeBudget.remainingAreas.join('; ') : 'All essential areas covered'}
Total Turns Completed: ${session.turnNumber}
Current Phase: ${session.currentPhase}

=== REALISTIC CONVERSATIONAL INTERVIEW FLOW RULES ===
0. SOURCE GROUNDING — HIGHEST PRIORITY:
   - The raw resume, full job description, custom directives, and candidate answers are the only factual sources.
   - Never claim the resume or job description mentions a skill, project, employer, technology, or domain unless those exact facts are present in the supplied source.
   - Never introduce AI, LLMs, agents, LiveKit, WebRTC, TypeScript, or any other technology unless it appears in the supplied source or the candidate introduces it.
   - If no resume was supplied, say nothing about seeing or reviewing resume experience.
   - The parsed resume index may omit information. If it conflicts with the raw resume, trust the raw resume.

1. ACTIVE LISTENING & CONVERSATIONAL CONTINUITY:
   - NEVER ask generic, disconnected questions. ALWAYS actively listen to the candidate's last answer.
   - Start your response by acknowledging a specific technical decision or concept from the candidate's last answer.
   - Connect questions only to projects, responsibilities, and skills explicitly present in the supplied source.

2. ADAPTIVE BRANCHING & PROBING:
   - Deep Role Probing: Ask about decisions, trade-offs, difficult situations, scale, validation, or measurable outcomes only when relevant to the supplied role and the candidate's previous response.
   - Real-World Scenario Challenge: Present a realistic system design challenge related to the supplied role and job description.
   - If candidate's response is surface-level or brief, set "shouldProbeDeeper": true and ask a targeted follow-up probe.

3. AUTONOMOUS PHASE & TERMINATION MANAGEMENT:
   - Treat the time metrics above as a hard scheduling policy. Follow Recommended Phase Now and never move backward.
   - DEEP: ask a targeted follow-up about implementation, alternatives, failure modes, or metrics.
   - FOCUSED: ask one concise question covering the highest-value missing competency.
   - HIGH_LEVEL: do not open a new deep topic; cover missing evidence with a broad question.
   - CLOSING: ask no new technical question. Thank the candidate and set shouldEndInterview true.
   - Ask exactly one question per response. Prefer coverage over depth when remaining time is low.
   - Phase Order: WARMUP ➔ TECHNICAL_PROBING ➔ BEHAVIORAL ➔ CLOSING ➔ COMPLETED.
   - Track elapsed time (${elapsedMinutes} mins / ${session.targetDurationMinutes} mins target). As target duration approaches or when all key competencies are proven, transition to CLOSING and set "shouldEndInterview": true.

Return strictly JSON with this EXACT structure:
{
  "interviewerResponse": "<Natural, conversational text spoken by interviewer>",
  "nextPhase": "<WARMUP | TECHNICAL_PROBING | BEHAVIORAL | CLOSING | COMPLETED>",
  "shouldProbeDeeper": <true | false>,
  "shouldEndInterview": <true | false>,
  "terminationReason": "<Reason if ending, otherwise leave empty>",
  "reasoning": "<Short internal reasoning for phase choice & dynamic decision>"
}`;

    const messages: LLMMessage[] = [{ role: 'system', content: systemPrompt }];

    for (const turn of session.turns) {
      messages.push({
        role: turn.speaker === 'candidate' ? 'user' : 'assistant',
        content: turn.text,
      });
    }

    if (session.turnNumber === 0) {
      messages.push({
        role: 'user',
        content: 'Please initialize the interview with a welcome and your first warmup question.',
      });
    }

    const llmCompletion = await generateLLMCompletionDetailed(messages, {
      temperature: 0.7,
      jsonMode: true,
    });
    const llmRawResponse = llmCompletion.text;

    let result: EngineTurnResult;
    try {
      result = JSON.parse(llmRawResponse);
    } catch {
      result = {
        interviewerResponse: llmRawResponse,
        nextPhase: session.currentPhase,
        shouldProbeDeeper: false,
        shouldEndInterview: false,
        reasoning: 'Extracted plain response',
      };
    }

    const allowedPhases: InterviewPhase[] = ['WARMUP', 'TECHNICAL_PROBING', 'BEHAVIORAL', 'CLOSING', 'COMPLETED'];
    if (!result.interviewerResponse || !allowedPhases.includes(result.nextPhase)) {
      result = {
        interviewerResponse: result.interviewerResponse || 'Thank you. Could you expand on the choices you considered and why you selected that approach?',
        nextPhase: session.currentPhase,
        shouldProbeDeeper: true,
        shouldEndInterview: false,
        reasoning: 'Recovered from an invalid model response.',
      };
    }

    const phaseOrder: InterviewPhase[] = ['WARMUP', 'TECHNICAL_PROBING', 'BEHAVIORAL', 'CLOSING', 'COMPLETED'];
    const recommendedIndex = phaseOrder.indexOf(timeBudget.recommendedPhase);
    const resultIndex = phaseOrder.indexOf(result.nextPhase);

    if (timeBudget.depth === 'CLOSING') {
      result = {
        interviewerResponse: 'Thank you. We have covered the key areas within our scheduled time, so I will close the interview here and prepare the report.',
        nextPhase: 'CLOSING',
        shouldProbeDeeper: false,
        shouldEndInterview: true,
        terminationReason: 'Closing window reached.',
        reasoning: `The interview has ${timeBudget.remainingSeconds} seconds remaining, reserved for closing.`,
      };
    } else if (result.shouldEndInterview || result.nextPhase === 'CLOSING' || result.nextPhase === 'COMPLETED') {
      result = {
        interviewerResponse: InterviewEngine.getCoverageQuestion(timeBudget, session),
        nextPhase: InterviewEngine.getCoveragePhase(timeBudget, session),
        shouldProbeDeeper: timeBudget.depth === 'DEEP',
        shouldEndInterview: false,
        reasoning: 'Prevented premature closing while scheduled interview time and competency coverage remain.',
      };
    } else if (resultIndex < recommendedIndex) {
      result.nextPhase = timeBudget.recommendedPhase;
      result.reasoning = `${result.reasoning} Advanced phase to stay aligned with the remaining time budget.`;
    }

    const previousQuestions = session.turns
      .filter((turn) => turn.speaker === 'interviewer')
      .map((turn) => InterviewEngine.normalizeQuestion(turn.text));
    const proposedQuestion = InterviewEngine.normalizeQuestion(result.interviewerResponse);
    if (previousQuestions.some((question) => InterviewEngine.questionsAreSimilar(question, proposedQuestion))) {
      result.interviewerResponse = InterviewEngine.getDistinctQuestion(timeBudget, session);
      result.reasoning = `${result.reasoning} Replaced a duplicate question with a new competency probe.`;
    }

    result.timeBudget = timeBudget;
    result.modelTrace = llmCompletion.trace;

    session.currentPhase = result.nextPhase;
    session.turnNumber += 1;
    session.turns.push({
      turnId: session.turnNumber,
      speaker: 'interviewer',
      text: result.interviewerResponse,
      timestamp: new Date().toISOString(),
      phase: result.nextPhase,
      modelTrace: llmCompletion.trace,
    });

    if (result.shouldEndInterview || result.nextPhase === 'COMPLETED') {
      session.isCompleted = true;
      session.currentPhase = 'COMPLETED';
      session.endTime = new Date().toISOString();
      session.completionReason = result.terminationReason || 'Interview completed by interviewer';
    }

    return result;
  }

  private static getCoverageQuestion(timeBudget: InterviewTimeBudget, session: InterviewSession): string {
    const nextArea = timeBudget.remainingAreas[0];
    if (nextArea === 'Role-specific depth and problem solving') {
      return `Let us use the remaining time for role-specific depth: describe one important decision relevant to the ${session.job.roleTitle} role, the alternatives you considered, and the measurable result.`;
    }
    if (nextArea === 'Behavioral evidence and communication') {
      return 'Before we close, describe a difficult collaboration or delivery challenge using the situation, your actions, and the measurable result.';
    }
    return InterviewEngine.getDistinctQuestion(timeBudget, session);
  }

  private static getCoveragePhase(timeBudget: InterviewTimeBudget, session: InterviewSession): InterviewPhase {
    const nextArea = timeBudget.remainingAreas[0];
    const desired: InterviewPhase = nextArea === 'Role-specific depth and problem solving'
      ? 'TECHNICAL_PROBING'
      : nextArea === 'Behavioral evidence and communication'
        ? 'BEHAVIORAL'
        : timeBudget.recommendedPhase;
    const order: InterviewPhase[] = ['WARMUP', 'TECHNICAL_PROBING', 'BEHAVIORAL', 'CLOSING', 'COMPLETED'];
    return order[Math.max(order.indexOf(session.currentPhase), order.indexOf(desired))];
  }

  private static getDistinctQuestion(timeBudget: InterviewTimeBudget, session: InterviewSession): string {
    const deepQuestions = [
      'Choose one relevant piece of work: what went wrong in practice, how did you diagnose it, and what did you change?',
      'Describe the most important trade-off in one of your projects and the evidence that supported your choice.',
      'If the demand for the work you described increased tenfold, what would become difficult first and how would you adapt?',
      'Tell me about a professional decision you would make differently today and why.',
    ];
    const highLevelQuestions = [
      'What is the clearest measurable outcome from your work, and what was your personal contribution?',
      'Describe a difficult collaboration or delivery challenge, your actions, and the final result.',
      'Which requirement for this role is your strongest match, and which would require the most growth?',
    ];
    const bank = timeBudget.depth === 'DEEP' ? deepQuestions : highLevelQuestions;
    const previous = new Set(session.turns.filter((turn) => turn.speaker === 'interviewer').map((turn) => InterviewEngine.normalizeQuestion(turn.text)));
    return bank.find((question) => !previous.has(InterviewEngine.normalizeQuestion(question))) || bank[session.turnNumber % bank.length];
  }

  private static normalizeQuestion(text: string): string {
    return text.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
  }

  private static questionsAreSimilar(first: string, second: string): boolean {
    if (first === second) return true;
    const ignored = new Set(['the', 'a', 'an', 'and', 'or', 'to', 'of', 'in', 'on', 'for', 'your', 'you', 'one', 'with']);
    const words = (value: string) => new Set(value.split(' ').filter((word) => word.length > 2 && !ignored.has(word)));
    const firstWords = words(first);
    const secondWords = words(second);
    if (!firstWords.size || !secondWords.size) return false;
    const overlap = [...firstWords].filter((word) => secondWords.has(word)).length;
    return overlap / Math.min(firstWords.size, secondWords.size) >= 0.75;
  }
}
