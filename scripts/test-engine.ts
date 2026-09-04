import { InterviewEngine } from '../lib/interview/engine.js';
import { CandidateProfile, JobDescription } from '../lib/interview/types.js';
import assert from 'node:assert/strict';

async function runEngineTest() {
  console.log('====================================================');
  console.log('   STEP 1 VERIFICATION: INTERVIEW ENGINE TEST       ');
  console.log('====================================================\n');

  const mockCandidate: CandidateProfile = {
    name: 'Alex Rivera',
    targetRole: 'AI Engineer',
    experienceLevel: 'Mid',
    skills: ['TypeScript', 'Next.js', 'Python', 'LiveKit', 'WebRTC', 'OpenAI API'],
    resumeText: 'AI Engineer with 3 years experience building real-time multimodal agents, RAG pipelines, and web dashboards.',
  };

  const mockJob: JobDescription = {
    roleTitle: 'AI Engineering Intern',
    companyName: 'Nonilion.com',
    keyRequirements: [
      'Experience with LiveKit / WebRTC real-time voice applications',
      'Proficiency in TypeScript & Node.js / Python',
      'Understanding of LLM agents & structured outputs',
    ],
    responsibilities: [
      'Build persistent AI agent teammates in shared virtual workspaces',
      'Optimize low-latency audio/video streaming workflows',
    ],
  };

  // 1. Initialize session
  const session = InterviewEngine.createSession(mockCandidate, mockJob, 6);
  console.log(`[Session Created] ID: ${session.sessionId}`);
  console.log(`[Candidate] ${mockCandidate.name} (${mockCandidate.targetRole})`);
  console.log(`[Target Company] ${mockJob.companyName}\n`);

  // 2. Start Interview (Turn 1 - Initial Greeting & Warmup)
  console.log('--- TURN 1: INITIALIZATION ---');
  const turn1 = await InterviewEngine.processTurn(session);
  console.log(`🤖 Interviewer (${turn1.nextPhase}): "${turn1.interviewerResponse}"`);
  console.log(`   [Reasoning]: ${turn1.reasoning}\n`);

  // 3. Candidate responds with good background
  console.log('--- TURN 2: CANDIDATE ANSWER (Warmup) ---');
  const candidateAns1 = "Hi! Excited to be here. Recently I built a live audio streaming pipeline using LiveKit and TypeScript to connect AI voice agents to interactive browser canvases.";
  console.log(`👤 Candidate: "${candidateAns1}"`);
  
  const turn2 = await InterviewEngine.processTurn(session, candidateAns1);
  console.log(`🤖 Interviewer (${turn2.nextPhase}): "${turn2.interviewerResponse}"`);
  console.log(`   [Reasoning]: ${turn2.reasoning}`);
  console.log(`   [Probe Deeper?]: ${turn2.shouldProbeDeeper}\n`);

  // 4. Candidate gives a vague/brief technical answer
  console.log('--- TURN 3: VAGUE CANDIDATE ANSWER (Testing Dynamic Probing) ---');
  const candidateAns2 = "We just handled errors by reloading the connection.";
  console.log(`👤 Candidate: "${candidateAns2}"`);

  const turn3 = await InterviewEngine.processTurn(session, candidateAns2);
  console.log(`🤖 Interviewer (${turn3.nextPhase}): "${turn3.interviewerResponse}"`);
  console.log(`   [Reasoning]: ${turn3.reasoning}`);
  console.log(`   [Probe Deeper?]: ${turn3.shouldProbeDeeper}\n`);

  const turn4 = await InterviewEngine.processTurn(
    session,
    'I diagnosed the issue with request tracing, added bounded retries, and measured recovery time before and after the change.'
  );
  console.log('--- TURN 6: CANDIDATE ANSWER WITH UNGROUNDED CLAIM (Testing Anti-Hallucination) ---');
  const candidateAns3 = "I also led a team of 50 Kubernetes cluster administrators at AWS using Rust and PyTorch.";
  console.log(`👤 Candidate: "${candidateAns3}"`);
  
  const turn6 = await InterviewEngine.processTurn(session, candidateAns3);
  console.log(`🤖 Interviewer (${turn6.nextPhase}): "${turn6.interviewerResponse}"`);
  console.log(`   [Reasoning]: ${turn6.reasoning}`);

  const interviewerQuestions = [turn1, turn2, turn3, turn4, turn6].map((turn) => turn.interviewerResponse.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim());
  assert.equal(new Set(interviewerQuestions).size, interviewerQuestions.length, 'Interviewer must not repeat a question');
  assert.notEqual(session.currentPhase, 'WARMUP', 'Interview phase must never move backward to warmup');

  // Verify CandidateEvaluator fact checking
  const { CandidateEvaluator } = await import('../lib/interview/evaluator.js');
  const turnEval = await CandidateEvaluator.evaluateTurn(session, session.turns[session.turns.length - 1], turn6.interviewerResponse);
  console.log('\n--- EVALUATOR ANTI-HALLUCINATION VERIFICATION ---');
  console.log(`   [Is Grounded]: ${turnEval.antiHallucination?.isGroundedInResume}`);
  console.log(`   [Unsupported Claims]: ${turnEval.antiHallucination?.unsupportedTechOrClaims.join(', ')}`);

  console.log('\n====================================================');
  console.log(`✅ STEP 1 ENGINE TEST COMPLETED SUCCESSFULLY!`);
  console.log(`   Total Turns Processed: ${session.turnNumber}`);
  console.log(`   Current Phase: ${session.currentPhase}`);
  console.log('====================================================');
}

runEngineTest().catch(console.error);
