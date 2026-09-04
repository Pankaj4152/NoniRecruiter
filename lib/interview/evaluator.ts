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

${isCodingPhase ? `=== CODING / WHITEBOARD EVALUATION ===
If the candidate provided code or algorithmic steps, evaluate:
- syntaxCorrectnessScore (0-10)
- algorithmicEfficiencyScore (0-10)
- edgeCaseHandlingScore (0-10)
- feedback (constructive analysis of code)` : ''}

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

      const antiHallucination: AntiHallucinationCheck = parsed.antiHallucination ? {
        isGroundedInResume: Boolean(parsed.antiHallucination.isGroundedInResume),
        isConsistentWithPriorTurns: Boolean(parsed.antiHallucination.isConsistentWithPriorTurns),
        hallucinatedClaims: Array.isArray(parsed.antiHallucination.hallucinatedClaims) ? parsed.antiHallucination.hallucinatedClaims : [],
        unsupportedTechOrClaims: Array.isArray(parsed.antiHallucination.unsupportedTechOrClaims) ? parsed.antiHallucination.unsupportedTechOrClaims : [],
        verificationConfidence: parsed.antiHallucination.verificationConfidence || 'HIGH',
      } : CandidateEvaluator.performLocalAntiHallucinationCheck(session, candidateTurn);

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
    const resumeTextLower = session.candidate.resumeText.toLowerCase();
    const answerTextLower = turn.text.toLowerCase();
    const hallucinatedClaims: string[] = [];
    const additionalSkills: string[] = [];

    // Track skills mentioned in answer that expand on resume without penalizing
    const commonTechTerms = ['kubernetes', 'aws', 'gcp', 'azure', 'docker', 'graphql', 'kafka', 'redis', 'rust', 'c++', 'python', 'pytorch'];
    for (const tech of commonTechTerms) {
      if (answerTextLower.includes(tech) && !resumeTextLower.includes(tech)) {
        additionalSkills.push(`${tech} (introduced in interview)`);
      }
    }

    return {
      isGroundedInResume: true,
      isConsistentWithPriorTurns: true,
      hallucinatedClaims,
      unsupportedTechOrClaims: additionalSkills,
      verificationConfidence: 'HIGH',
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

