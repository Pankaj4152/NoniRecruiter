import { 
  InterviewSession, 
  TurnEvaluation, 
  InterviewTurn 
} from './types';
import { generateLLMCompletion } from './llm';

export class CandidateEvaluator {
  /**
   * Evaluates a candidate's answer for a specific turn
   */
  public static async evaluateTurn(
    session: InterviewSession,
    candidateTurn: InterviewTurn,
    questionText: string
  ): Promise<TurnEvaluation> {
    const prompt = `Evaluate the candidate's interview answer for the role of ${session.job.roleTitle}.

=== QUESTION ASKED ===
"${questionText}"

=== CANDIDATE ANSWER ===
"${candidateTurn.text}"

=== EVALUATION CRITERIA ===
Score each area from 0 to 10:
1. technicalAccuracyScore: Depth, correctness, and technical relevance.
2. communicationScore: Clarity, structure, and articulate explanation.
3. problemSolvingScore: Logic, trade-off understanding, and practical approach.

Extract exact verifier quotes for strengths and red flags.

Return strictly JSON matching this structure:
{
  "technicalAccuracyScore": 8,
  "communicationScore": 8,
  "problemSolvingScore": 7,
  "strengthsEvidence": ["Exact quote from answer showing strong knowledge"],
  "redFlagsEvidence": ["Exact quote showing hesitation or missing technical detail"],
  "feedbackNotes": "Short constructive note"
}`;

    try {
      const response = await generateLLMCompletion(
        [
          { role: 'system', content: 'You are an objective AI Interview Evaluator. Return JSON.' },
          { role: 'user', content: prompt }
        ],
        { jsonMode: true, temperature: 0.2 }
      );

      const parsed = JSON.parse(response);

      const exactQuotes = (value: unknown): string[] => Array.isArray(value)
        ? value.filter((quote): quote is string => typeof quote === 'string' && candidateTurn.text.includes(quote))
        : [];
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
      };
    } catch {
      // Local Fallback Evaluation
      return CandidateEvaluator.createFallbackEvaluation(candidateTurn);
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

  private static createFallbackEvaluation(turn: InterviewTurn): TurnEvaluation {
    const textLen = turn.text.length;
    const techScore = textLen > 100 ? 8 : textLen > 40 ? 7 : 5;
    const commScore = textLen > 80 ? 8 : 6;
    const probScore = textLen > 120 ? 8 : 6;

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
    };
  }
}
