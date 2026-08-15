import { InterviewEngine } from '../lib/interview/engine';
import { CandidateEvaluator } from '../lib/interview/evaluator';
import { ReportGenerator } from '../lib/interview/report';
import { CandidateProfile, JobDescription } from '../lib/interview/types';

/**
 * Isolated Candidate Simulator
 * Allows instant automated testing of the interview engine, evaluator, and report card generator
 * without requiring manual terminal typing.
 */
async function runSimulation() {
  console.log('\n=============================================================');
  console.log('  🧪 AUTOMATED CANDIDATE SIMULATOR & BENCHMARK SUITE          ');
  console.log('=============================================================\n');

  const simulatedCandidate: CandidateProfile = {
    name: 'Pankaj Kumar Goyal (Simulated)',
    targetRole: 'AI Engineer Intern',
    experienceLevel: 'Junior',
    skills: ['Python', 'FastAPI', 'TypeScript', 'React', 'LiteLLM', 'PyTorch', 'RAG'],
    resumeText: 'AI Engineer Trainee at AIPlaneTech. Built KAIROS (3-tier LiteLLM routing architecture for persistent memory), Scratchers (Transformer & NumPy neural net from first principles), and Issuenix.',
    structuredResume: {
      fullName: 'Pankaj Kumar Goyal',
      contact: { email: 'pankaj@example.com' },
      experience: [
        {
          company: 'AIPlaneTech Pvt. Ltd.',
          role: 'AI Engineer Trainee',
          duration: 'Jun 2025 – Jul 2025',
          highlights: ['Built AI Insight Pro platform', 'Improved PII detection from 60% to 80%'],
        },
      ],
      projects: [
        {
          title: 'KAIROS – Persistent Engineering Memory Layer',
          technologies: ['Python', 'FastAPI', 'React', 'TypeScript', 'LiteLLM'],
          description: 'Multi-channel persistent memory & LiteLLM routing architecture',
          highlights: ['3-tier LiteLLM routing architecture', 'Supported Telegram, web, and voice channels'],
        },
      ],
      skills: {
        languages: ['Python', 'C++', 'SQL', 'TypeScript'],
        ai_ml: ['LLMs', 'AI Agents', 'RAG', 'Transformers', 'PyTorch'],
        frameworks_libraries: ['FastAPI', 'LiteLLM', 'React'],
        backend_databases: ['PostgreSQL', 'REST APIs'],
        tools_infrastructure: ['Docker', 'Git', 'GCP'],
      },
      achievements: ['Ranked 29th in IIT Bombay Entrepreneurship Challenge 2025'],
      education: { degree: 'B.E. Computer Science', institution: 'MBM University Jodhpur', year: '2023 - 2027' },
    },
  };

  const jobDescription: JobDescription = {
    roleTitle: 'AI Engineering Intern',
    companyName: 'Nonilion.com',
    keyRequirements: [
      'Hands-on experience with LLM agents, LiteLLM, or real-time WebRTC/LiveKit voice workflows',
      'Proficiency in Python/FastAPI and TypeScript/Next.js',
    ],
    responsibilities: [
      'Develop persistent AI agent teammates in shared virtual offices',
    ],
  };

  const session = InterviewEngine.createSession(simulatedCandidate, jobDescription, 5);

  // Turn 1: Initialization
  console.log('[Turn 1] Initializing interview session...');
  const t1 = await InterviewEngine.processTurn(session);
  console.log(`🤖 Interviewer: "${t1.interviewerResponse}"\n`);

  // Turn 2: Warmup candidate response
  const candidateAns1 = "Hi! I'm Pankaj, a Computer Science student at MBM University. Recently I built KAIROS, a persistent engineering memory layer for AI-native teams featuring a 3-tier LiteLLM routing architecture across Telegram, Web, and Voice channels.";
  console.log(`👤 Candidate: "${candidateAns1}"`);
  const t2 = await InterviewEngine.processTurn(session, candidateAns1);
  console.log(`🤖 Interviewer: "${t2.interviewerResponse}"\n`);

  // Turn 3: Technical probing response
  const candidateAns2 = "For real-time voice, I manage interaction as an asynchronous state machine with states like connecting, listening, processing, speaking, and disconnected. On user interruption, I immediately cancel current LLM/TTS tasks. For LiteLLM routing, we fall back from cloud models to local Ollama models based on latency and cost metrics.";
  console.log(`👤 Candidate: "${candidateAns2}"`);
  const t3 = await InterviewEngine.processTurn(session, candidateAns2);
  console.log(`🤖 Interviewer: "${t3.interviewerResponse}"\n`);

  // Turn 4: Behavioral STAR response
  const candidateAns3 = "During my AIPlaneTech internship, PII detection accuracy was stuck at 60% due to regex limitations. I replaced regex-only matching with a hybrid LLM and rule-based classification pipeline, boosting accuracy to 80% while staying within latency budgets.";
  console.log(`👤 Candidate: "${candidateAns3}"`);
  const t4 = await InterviewEngine.processTurn(session, candidateAns3);
  console.log(`🤖 Interviewer: "${t4.interviewerResponse}"\n`);

  // Generate Automated Evaluation & Evidence Report
  console.log('=============================================================');
  console.log('📊 RUNNING AUTOMATED EVALUATION ENGINE...');
  console.log('=============================================================\n');

  const evaluations = await CandidateEvaluator.evaluateSession(session);
  const reportData = ReportGenerator.createReportData(session, evaluations);
  const reportFilePath = ReportGenerator.saveMarkdownReport(reportData);

  console.log(`🏆 OVERALL CANDIDATE SCORE: ${reportData.overallScore} / 100`);
  console.log(`📌 VERDICT:               ${reportData.verdict}`);
  console.log(`-------------------------------------------------------------`);
  console.log(`📈 Technical Accuracy:     ${reportData.scores.technicalAccuracy} / 100`);
  console.log(`💬 Communication Clarity: ${reportData.scores.communicationClarity} / 100`);
  console.log(`💡 Problem Solving:       ${reportData.scores.problemSolving} / 100`);
  console.log(`-------------------------------------------------------------`);
  console.log(`📄 Saved Evidence Report: ${reportFilePath}`);
  console.log('=============================================================\n');
}

runSimulation().catch(console.error);
