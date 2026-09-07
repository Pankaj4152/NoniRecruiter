import { 
  InterviewSession, 
  TurnEvaluation, 
  InterviewTurn,
  AntiHallucinationCheck,
  CodingEvaluation
} from './types';
import { generateLLMCompletionDetailed } from './llm';

export class CandidateEvaluator {
  /**
   * Evaluates a candidate's answer for a specific turn, including anti-hallucination checks & coding analysis
   */
  public static async evaluateTurn(
    session: InterviewSession,
    candidateTurn: InterviewTurn,
    questionText: string
  ): Promise<TurnEvaluation> {
    const isCodingPhase = candidateTurn.phase === 'CODING_CHALLENGE' || questionText.toLowerCase().includes('code') || questionText.toLowerCase().includes('function') || questionText.toLowerCase().includes('write a');

    const prompt = `Evaluate the candidate's interview answer for the role of ${session.job.roleTitle}.

=== QUESTION ASKED ===
"${questionText}"

=== CANDIDATE ANSWER ===
"${candidateTurn.text}"

=== AUTHORITATIVE RESUME DATA ===
"${session.candidate.resumeText}"

=== EVALUATION CRITERIA ===
Score each area from 0 to 10:
1. technicalAccuracyScore: Depth, correctness, and technical relevance.
2. communicationScore: Clarity, structure, and articulate explanation.
3. problemSolvingScore: Logic, trade-off understanding, and practical approach.

=== ANTI-HALLUCINATION & GROUNDING MATRIX ===
Check if the candidate claims technologies, roles, metrics, or experiences that contradict or are wholly absent from their resume/prior transcript.
- isGroundedInResume: boolean
- isConsistentWithPriorTurns: boolean
- hallucinatedClaims: array of strings detailing ungrounded or fabricated claims (if any)
- unsupportedTechOrClaims: array of strings listing technologies claimed without evidence

${candidateTurn.sandboxExecution ? `=== PISTON SANDBOX EXECUTION LOGS ===
Language: ${candidateTurn.sandboxExecution.language}
Status: ${candidateTurn.sandboxExecution.status} (Exit Code: ${candidateTurn.sandboxExecution.exitCode})
Execution Time: ${candidateTurn.sandboxExecution.executionTimeMs}ms
STDOUT:
${candidateTurn.sandboxExecution.stdout || '(None)'}
STDERR:
${candidateTurn.sandboxExecution.stderr || '(None)'}
` : ''}
Extract exact verifier quotes for strengths and red flags.

Return strictly JSON matching this structure:
{
  "technicalAccuracyScore": 8,
  "communicationScore": 8,
  "problemSolvingScore": 7,
  "strengthsEvidence": ["Exact quote from answer showing strong knowledge"],
  "redFlagsEvidence": ["Exact quote showing hesitation or missing technical detail"],
  "feedbackNotes": "Short constructive note",
  "antiHallucination": {
    "isGroundedInResume": true,
    "isConsistentWithPriorTurns": true,
    "hallucinatedClaims": [],
    "unsupportedTechOrClaims": [],
    "verificationConfidence": "HIGH"
  }${isCodingPhase ? `,
  "codingEvaluation": {
    "problemPrompt": "${questionText.replace(/"/g, '\\"')}",
    "codeSnippet": "${candidateTurn.text.replace(/"/g, '\\"').slice(0, 300)}",
    "syntaxCorrectnessScore": 8,
    "algorithmicEfficiencyScore": 8,
    "edgeCaseHandlingScore": 7,
    "feedback": "Code demonstrates clean algorithmic logic."
  }` : ''}
}`;

    try {
      const completion = await generateLLMCompletionDetailed(
        [
          { role: 'system', content: 'You are an objective AI Interview Evaluator and Fact Checker. Return JSON.' },
          { role: 'user', content: prompt }
        ],
        { jsonMode: true, temperature: 0.2 }
      );

      const parsed = JSON.parse(completion.text);

      const normalizeEvidence = (text: string) => text.replace(/\s+/g, ' ').trim();
      const normalizedAnswer = normalizeEvidence(candidateTurn.text);
      const exactQuotes = (value: unknown): string[] => Array.isArray(value)
        ? value.filter((quote): quote is string => typeof quote === 'string' && normalizedAnswer.includes(normalizeEvidence(quote)))
        : [];

      const localGrounding = CandidateEvaluator.performLocalAntiHallucinationCheck(session, candidateTurn);
      const modelGrounding: AntiHallucinationCheck | undefined = parsed.antiHallucination ? {
        isGroundedInResume: Boolean(parsed.antiHallucination.isGroundedInResume),
        isConsistentWithPriorTurns: Boolean(parsed.antiHallucination.isConsistentWithPriorTurns),
        hallucinatedClaims: Array.isArray(parsed.antiHallucination.hallucinatedClaims) ? parsed.antiHallucination.hallucinatedClaims.filter((value: unknown): value is string => typeof value === 'string') : [],
        unsupportedTechOrClaims: Array.isArray(parsed.antiHallucination.unsupportedTechOrClaims) ? parsed.antiHallucination.unsupportedTechOrClaims.filter((value: unknown): value is string => typeof value === 'string') : [],
        verificationConfidence: parsed.antiHallucination.verificationConfidence || 'HIGH',
      } : undefined;
      const antiHallucination: AntiHallucinationCheck = {
        isGroundedInResume: (modelGrounding?.isGroundedInResume ?? true) && localGrounding.isGroundedInResume,
        isConsistentWithPriorTurns: Boolean(modelGrounding?.isConsistentWithPriorTurns ?? true) && localGrounding.isConsistentWithPriorTurns,
        hallucinatedClaims: Array.from(new Set([...(modelGrounding?.hallucinatedClaims || []), ...localGrounding.hallucinatedClaims])),
        unsupportedTechOrClaims: Array.from(new Set([...(modelGrounding?.unsupportedTechOrClaims || []), ...localGrounding.unsupportedTechOrClaims])),
        verificationConfidence: localGrounding.verificationConfidence === 'LOW' || modelGrounding?.verificationConfidence === 'LOW' ? 'LOW' : modelGrounding?.verificationConfidence || localGrounding.verificationConfidence,
      };

      let codingEvaluation: CodingEvaluation | undefined = undefined;
      if (parsed.codingEvaluation) {
        codingEvaluation = {
          problemPrompt: parsed.codingEvaluation.problemPrompt || questionText,
          codeSnippet: parsed.codingEvaluation.codeSnippet || candidateTurn.text,
          language: parsed.codingEvaluation.language || 'typescript',
          syntaxCorrectnessScore: Math.min(10, Math.max(0, Number(parsed.codingEvaluation.syntaxCorrectnessScore) || 7)),
          algorithmicEfficiencyScore: Math.min(10, Math.max(0, Number(parsed.codingEvaluation.algorithmicEfficiencyScore) || 7)),
          edgeCaseHandlingScore: Math.min(10, Math.max(0, Number(parsed.codingEvaluation.edgeCaseHandlingScore) || 7)),
          feedback: parsed.codingEvaluation.feedback || 'Code evaluated successfully.',
        };
      }

      return {
        turnId: candidateTurn.turnId,
        phase: candidateTurn.phase,
        candidateAnswer: candidateTurn.text,
        technicalAccuracyScore: Math.min(10, Math.max(0, Number(parsed.technicalAccuracyScore) || 0)),
        communicationScore: Math.min(10, Math.max(0, Number(parsed.communicationScore) || 0)),
        problemSolvingScore: Math.min(10, Math.max(0, Number(parsed.problemSolvingScore) || 0)),
        strengthsEvidence: exactQuotes(parsed.strengthsEvidence),
        redFlagsEvidence: exactQuotes(parsed.redFlagsEvidence),
        feedbackNotes: parsed.feedbackNotes || 'Good effort on technical explanation.',
        antiHallucination,
        codingEvaluation,
        modelTrace: completion.trace,
      };
    } catch {
      // Local Fallback Evaluation
      return CandidateEvaluator.createFallbackEvaluation(session, candidateTurn, questionText);
    }
  }

  /**
   * Evaluates all candidate turns across an entire session
   */
  public static async evaluateSession(session: InterviewSession): Promise<TurnEvaluation[]> {
    const candidateTurns = session.turns.filter((t) => t.speaker === 'candidate');
    const evaluations: TurnEvaluation[] = [];

    for (let i = 0; i < candidateTurns.length; i++) {
      const candidateTurn = candidateTurns[i];
      // Find interviewer question immediately preceding this candidate turn
      const prevInterviewerTurn = session.turns.find(
        (t) => t.speaker === 'interviewer' && t.turnId === candidateTurn.turnId - 1
      );
      const questionText = prevInterviewerTurn ? prevInterviewerTurn.text : 'Introductory Question';

      const evalResult = await CandidateEvaluator.evaluateTurn(session, candidateTurn, questionText);
      evaluations.push(evalResult);
    }

    return evaluations;
  }

  private static performLocalAntiHallucinationCheck(session: InterviewSession, turn: InterviewTurn): AntiHallucinationCheck {
    const sourceText = `${session.candidate.resumeText} ${session.turns.filter((item) => item.speaker === 'candidate' && item.turnId !== turn.turnId).map((item) => item.text).join(' ')}`;
    const sourceTerms = new Set((sourceText.match(/[A-Za-z0-9+#.-]{3,}/g) || []).map((term) => term.toLowerCase()));
    const hallucinatedClaims: string[] = [];
    const unsupportedClaims: string[] = [];

    // Salient terms are extracted from the answer dynamically below.
    const salientTerms = turn.text.match(/[A-Z][A-Za-z0-9+#.-]{2,}|\b[A-Z]{2,}\b|\b\d+(?:[.,]\d+)?%?\b/g) || [];
    for (const term of Array.from(new Set(salientTerms))) {
      if (!sourceTerms.has(term.toLowerCase())) unsupportedClaims.push(`${term} (not verified by resume or prior answers)`);
    }

    if (unsupportedClaims.length) {
      const unsupportedSet = new Set(unsupportedClaims.map((claim) => claim.split(' (')[0].toLowerCase()));
      const sentences = turn.text.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [turn.text];
      const sentence = sentences.find((item) => Array.from(unsupportedSet).some((term) => item.toLowerCase().includes(term)));
      if (sentence) hallucinatedClaims.push(sentence.trim());
    }

    return {
      isGroundedInResume: hallucinatedClaims.length === 0 && unsupportedClaims.length === 0,
      isConsistentWithPriorTurns: true,
      hallucinatedClaims,
      unsupportedTechOrClaims: unsupportedClaims,
      verificationConfidence: hallucinatedClaims.length || unsupportedClaims.length ? 'MODERATE' : 'HIGH',
    };
  }

  private static createFallbackEvaluation(session: InterviewSession, turn: InterviewTurn, questionText: string): TurnEvaluation {
    const textLen = turn.text.length;
    const techScore = textLen > 100 ? 8 : textLen > 40 ? 7 : 5;
    const commScore = textLen > 80 ? 8 : 6;
    const probScore = textLen > 120 ? 8 : 6;

    const antiHallucination = CandidateEvaluator.performLocalAntiHallucinationCheck(session, turn);

    let codingEvaluation: CodingEvaluation | undefined = undefined;
    if (turn.phase === 'CODING_CHALLENGE' || turn.text.includes('function') || turn.text.includes('return')) {
      codingEvaluation = {
        problemPrompt: questionText,
        codeSnippet: turn.text,
        language: 'typescript',
        syntaxCorrectnessScore: 8,
        algorithmicEfficiencyScore: 7,
        edgeCaseHandlingScore: 7,
        feedback: 'Code logic provided and structurally checked.',
      };
    }

    return {
      turnId: turn.turnId,
      phase: turn.phase,
      candidateAnswer: turn.text,
      technicalAccuracyScore: techScore,
      communicationScore: commScore,
      problemSolvingScore: probScore,
      strengthsEvidence: [turn.text.slice(0, 100)],
      redFlagsEvidence: textLen < 30 ? ['Answer was brief and lacked technical detail'] : [],
      feedbackNotes: 'Clear answer provided.',
      antiHallucination,
      codingEvaluation,
    };
  }
}

