export type InterviewPhase = 
  | 'WARMUP' 
  | 'TECHNICAL_PROBING' 
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

export interface CandidateProfile {
  name: string;
  targetRole: string;
  experienceLevel: 'Junior' | 'Mid' | 'Senior' | 'Lead';
  skills: string[];
  resumeText: string;
  structuredResume?: ParsedResumeJSON;
}

export interface JobDescription {
  roleTitle: string;
  companyName: string;
  keyRequirements: string[];
  responsibilities: string[];
  fullText?: string;                          // Full Job Description text
  customInterviewerInstructions?: string;   // Custom directives for the AI interviewer persona
}

export interface InterviewTurn {
  turnId: number;
  speaker: 'interviewer' | 'candidate';
  text: string;
  timestamp: string;
  phase: InterviewPhase;
  modelTrace?: ModelTrace;
}

export interface ModelTrace {
  provider: 'gemini' | 'openai' | 'demo-fallback';
  model: string;
  latencyMs: number;
  usedFallback: boolean;
  fallbackReason?: string;
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
  turns: InterviewTurn[];
  isCompleted: boolean;
  endTime?: string;
  completionReason?: string;
}

export interface EngineTurnResult {
  interviewerResponse: string;
  nextPhase: InterviewPhase;
  shouldProbeDeeper: boolean;
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
  modelTrace?: ModelTrace;
}

export type HiringVerdict = 'STRONG HIRE' | 'HIRE' | 'LEAN HIRE' | 'NO HIRE';

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
  };
  strengths: string[];
  areasForImprovement: string[];
  turnEvaluations: TurnEvaluation[];
  fullTranscript: InterviewTurn[];
}
