export type InterviewPhase = 
  | 'WARMUP' 
  | 'TECHNICAL_PROBING' 
  | 'CODING_CHALLENGE'
  | 'BEHAVIORAL' 
  | 'CLOSING' 
  | 'COMPLETED';

export interface ResumeExperience {
  company: string;
  role: string;
  duration: string;
  highlights: string[];
}

export interface ResumeProject {
  title: string;
  technologies: string[];
  description: string;
  highlights: string[];
}

export interface ResumeSkills {
  languages: string[];
  ai_ml: string[];
  frameworks_libraries: string[];
  backend_databases: string[];
  tools_infrastructure: string[];
}

export interface ParsedResumeJSON {
  fullName: string;
  contact: {
    email?: string;
    phone?: string;
    github?: string;
    linkedin?: string;
  };
  experience: ResumeExperience[];
  projects: ResumeProject[];
  skills: ResumeSkills;
  achievements: string[];
  education: {
    degree: string;
    institution: string;
    year: string;
  };
}

export interface GithubRepoSummary {
  repoName: string;
  owner: string;
  repoUrl: string;
  description?: string;
  primaryLanguage?: string;
  languages: string[];
  keyFiles: string[];
  topics: string[];
  summaryText: string;
}

export interface RubricWeights {
  technicalAccuracy: number; // weight % e.g. 40
  coding: number;            // weight % e.g. 30
  communication: number;     // weight % e.g. 15
  problemSolving: number;    // weight % e.g. 15
}

export interface SandboxExecutionResult {
  language: string;
  stdout: string;
  stderr: string;
  exitCode: number;
  executionTimeMs: number;
  status: 'SUCCESS' | 'ERROR';
}

export interface IntegrityMetrics {
  pasteEventsCount: number;
  maxPastedLength: number;
  flaggedCopyPaste: boolean;
  averageResponseDelaySec: number;
  integrityScore: number; // 0 - 100
  integrityVerdict: 'HIGH INTEGRITY' | 'MODERATE' | 'PASTE ANOMALY FLAGGED';
}

export interface CandidateProfile {
  name: string;
  targetRole: string;
  experienceLevel: 'Junior' | 'Mid' | 'Senior' | 'Lead';
  skills: string[];
  resumeText: string;
  structuredResume?: ParsedResumeJSON;
  enableGithubGrounding?: boolean;
  githubRepoUrl?: string;
  githubSummary?: GithubRepoSummary;
  rubricWeights?: RubricWeights;
}

export interface JobDescription {
  roleTitle: string;
  companyName: string;
  keyRequirements: string[];
  responsibilities: string[];
  fullText?: string;                          // Full Job Description text
  customInterviewerInstructions?: string;   // Custom directives for the AI interviewer persona
  enableGithubGrounding?: boolean;
  githubRepoUrl?: string;
  rubricWeights?: RubricWeights;
}

export interface InterviewTurn {
  turnId: number;
  speaker: 'interviewer' | 'candidate';
  text: string;
  timestamp: string;
  phase: InterviewPhase;
  modelTrace?: ModelTrace;
  probeSequence?: ActiveProbeSequence;
  sandboxExecution?: SandboxExecutionResult;
}

export interface ModelTrace {
  provider: 'gemini' | 'openai' | 'demo-fallback';
  model: string;
  latencyMs: number;
  usedFallback: boolean;
  fallbackReason?: string;
}

export interface ActiveProbeSequence {
  topic: string;
  depth: number;       // 1, 2, or 3
  maxDepth: number;    // default 3
  probeObjective: string;
}

export interface CodingEvaluation {
  problemPrompt: string;
  codeSnippet: string;
  language?: string;
  syntaxCorrectnessScore: number; // 0 - 10
  algorithmicEfficiencyScore: number; // 0 - 10
  edgeCaseHandlingScore: number; // 0 - 10
  feedback: string;
  sandboxExecution?: SandboxExecutionResult;
}

export interface InterviewSession {
  sessionId: string;
  candidate: CandidateProfile;
  job: JobDescription;
  currentPhase: InterviewPhase;
  turnNumber: number;
  maxTurns: number;
  targetDurationMinutes: number; // e.g. 10 - 15 mins
  startTime: string;            // ISO timestamp
  elapsedSeconds: number;       // Tracks real elapsed time
  candidateStarted: boolean;
  invitationCreatedAt: string;
  isDemo?: boolean;
  demoLabel?: string;
  turns: InterviewTurn[];
  isCompleted: boolean;
  activeProbe?: ActiveProbeSequence;
  integrityMetrics?: IntegrityMetrics;
  endTime?: string;
  completionReason?: string;
}

export interface EngineTurnResult {
  interviewerResponse: string;
  nextPhase: InterviewPhase;
  shouldProbeDeeper: boolean;
  activeProbe?: ActiveProbeSequence;
  shouldEndInterview: boolean;
  terminationReason?: string;
  reasoning: string;
  timeBudget?: InterviewTimeBudget;
  modelTrace?: ModelTrace;
}

export interface InterviewTimeBudget {
  targetSeconds: number;
  elapsedSeconds: number;
  remainingSeconds: number;
  remainingPercent: number;
  depth: 'DEEP' | 'FOCUSED' | 'HIGH_LEVEL' | 'CLOSING';
  recommendedPhase: InterviewPhase;
  coveredAreas: string[];
  remainingAreas: string[];
}

export interface AntiHallucinationCheck {
  isGroundedInResume: boolean;
  isConsistentWithPriorTurns: boolean;
  hallucinatedClaims: string[];
  unsupportedTechOrClaims: string[];
  verificationConfidence: 'HIGH' | 'MODERATE' | 'LOW';
}

export interface TurnEvaluation {
  turnId: number;
  phase: InterviewPhase;
  candidateAnswer: string;
  technicalAccuracyScore: number; // 0 - 10
  communicationScore: number;       // 0 - 10
  problemSolvingScore: number;     // 0 - 10
  strengthsEvidence: string[];     // Direct verifier quotes
  redFlagsEvidence: string[];     // Direct verifier quotes
  feedbackNotes: string;
  codingEvaluation?: CodingEvaluation;
  antiHallucination?: AntiHallucinationCheck;
  modelTrace?: ModelTrace;
}

export type HiringVerdict = 'STRONG HIRE' | 'HIRE' | 'LEAN HIRE' | 'NO HIRE' | 'INCONCLUSIVE';

export interface FinalInterviewReport {
  sessionId: string;
  candidateName: string;
  targetRole: string;
  date: string;
  overallScore: number; // 0 - 100
  verdict: HiringVerdict;
  confidence: 'LOW' | 'MODERATE' | 'HIGH';
  executiveSummary: string;
  recommendedNextStep: string;
  timing: {
    requestedDurationMinutes: number;
    actualDurationSeconds: number;
    startedAt: string;
    endedAt: string;
    completionReason: string;
    phasesCovered: InterviewPhase[];
  };
  modelUsage: {
    providers: string[];
    models: string[];
    fallbackCalls: number;
    totalTrackedCalls: number;
    averageLatencyMs: number;
  };
  scores: {
    technicalAccuracy: number; // 0 - 100
    communicationClarity: number; // 0 - 100
    problemSolving: number; // 0 - 100
    codingScore?: number; // 0 - 100 (if coding challenge took place)
  };
  antiHallucinationSummary?: {
    totalHallucinationFlags: number;
    flaggedClaims: string[];
    overallGroundednessScore: number; // 0 - 100
  };
  codingSummary?: {
    problemsPresented: number;
    averageSyntaxScore: number;
    averageEfficiencyScore: number;
    averageEdgeCaseScore: number;
  };
  rubricWeights?: RubricWeights;
  integritySummary?: IntegrityMetrics;
  strengths: string[];
  areasForImprovement: string[];
  turnEvaluations: TurnEvaluation[];
  fullTranscript: InterviewTurn[];
}

