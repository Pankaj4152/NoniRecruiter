import readline from 'readline';
import { InterviewEngine } from '../lib/interview/engine';
import { loadResumeContent, parseCandidateProfile } from '../lib/interview/parser';
import { CandidateEvaluator } from '../lib/interview/evaluator';
import { ReportGenerator } from '../lib/interview/report';
import { JobDescription } from '../lib/interview/types';

const cli = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (prompt: string) => new Promise<string>((resolve) => cli.question(prompt, resolve));
const cleanCandidateInput = (value: string) => value
  .replace(/(?:^|\s)>>?\s*/g, '\n')
  .split('\n')
  .map((line) => line.trim())
  .filter(Boolean)
  .join('\n\n')
  .trim();

async function run() {
  console.log('\nNoniRecruiter — Adaptive CLI Interview\n');

  const name = (await ask('Candidate name: ')).trim() || 'Candidate';
  const role = (await ask('Job title: ')).trim() || 'Software Engineer';
  const company = (await ask('Company: ')).trim() || 'Company';
  const requestedDuration = Number.parseInt(await ask('Duration in minutes (5/10/15): '), 10);
  const duration = [5, 10, 15].includes(requestedDuration) ? requestedDuration : 10;
  const jobText = (await ask('Job description: ')).trim() || `Interview for the ${role} role at ${company}.`;
  const instructions = (await ask('Interviewer instructions (optional): ')).trim() ||
    'Focus on architecture decisions, implementation depth, trade-offs, failure handling, and measurable outcomes.';
  const resumeInput = (await ask('Resume file path or pasted text (optional): ')).trim();
  const resumeText = resumeInput
    ? await loadResumeContent(resumeInput)
    : 'Software engineer with experience building applications, backend services, and AI workflows.';

  console.log('\nPreparing candidate context...');
  const candidate = await parseCandidateProfile(resumeText, name, role);
  const job: JobDescription = {
    roleTitle: role,
    companyName: company,
    keyRequirements: ['Role-specific technical depth', 'Problem solving and trade-off analysis', 'Clear communication'],
    responsibilities: ['Deliver reliable systems and collaborate effectively'],
    fullText: jobText,
    customInterviewerInstructions: instructions,
  };
  const session = InterviewEngine.createSession(candidate, job, duration);

  console.log(`\nStarting ${duration}-minute interview for ${role} at ${company}.`);
  console.log('Type "exit" at any time to finish and generate the report.\n');

  let result = await InterviewEngine.processTurn(session);
  const runtime = result.modelTrace;
  if (runtime) {
    console.log(`AI runtime: ${runtime.provider} / ${runtime.model}`);
    if (runtime.usedFallback) console.log(`Demo fallback active: ${runtime.fallbackReason}`);
  }
  printTurn(result);

  while (!session.isCompleted) {
    const rawAnswer = await ask(`${name}> `);
    if (rawAnswer.trim().toLowerCase() === 'exit') break;
    const answer = cleanCandidateInput(rawAnswer);
    if (!answer) continue;
    console.log('\nInterviewer is thinking...');
    result = await InterviewEngine.processTurn(session, answer);
    printTurn(result);
  }

  console.log('\nGenerating evidence report...');
  const evaluations = await CandidateEvaluator.evaluateSession(session);
  const report = ReportGenerator.createReportData(session, evaluations);
  const reportPath = ReportGenerator.saveMarkdownReport(report);
  console.log(`Score: ${report.overallScore}/100`);
  console.log(`Verdict: ${report.verdict}`);
  console.log(`Report: ${reportPath}\n`);
  cli.close();

  function printTurn(turn: typeof result) {
    console.log(`\nInterviewer> ${turn.interviewerResponse}\n`);
  }
}

run().catch((error) => {
  console.error(error);
  cli.close();
  process.exitCode = 1;
});
