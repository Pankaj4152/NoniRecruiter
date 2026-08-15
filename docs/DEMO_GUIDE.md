# Demo and Evaluation Guide

## Goal

Demonstrate the part that is already real: a reusable interview engine that converts candidate and role context into an adaptive, time-managed conversation and an evidence-backed report.

Do not present the CLI as the intended final Nonilion interface. Present it as the fastest way to inspect and test the domain engine before connecting workspace, identity, persistence, and audio transports.

## Before sharing the repository

Run:

```powershell
npm install
npm run typecheck
npm run test:time
npm run test:engine
npm run build
```

Confirm that:

- `.env` is not committed;
- no real candidate resume is committed;
- generated `interview_report_*.md` files remain ignored;
- the example environment file contains no credentials;
- the latest CLI session does not expose internal scheduling metadata;
- the generated report opens correctly as UTF-8 Markdown.

## Five-minute walkthrough

### 1. Frame the problem

> Interviews often lose consistency because questions are generic, time is poorly managed, and hiring reports are disconnected from what the candidate actually said.

### 2. Explain the prototype boundary

> I built the interview engine first and exposed it through a CLI so every state transition and report can be tested quickly. The engine is TypeScript/Node.js and is intentionally independent of the final Nonilion transport.

### 3. Start the interview

```powershell
npm run test:interactive
```

Use:

- Duration: `5`
- A real job title and concise job description
- Instructions such as: `Focus on architecture trade-offs, reliability, and measurable outcomes.`
- A sanitized resume or pasted project summary

### 4. Demonstrate adaptivity

In the first answer, name a specific project and architecture choice. Show that the next question refers to that decision.

Give one intentionally shallow answer. Show that the engine asks for failure modes, alternatives, measurements, or implementation detail rather than moving to an unrelated generic question.

### 5. Explain hidden time management

> Before every question, the engine calculates remaining time and uncovered competencies. Candidates do not see those internals; recruiters receive the timing audit in the final report.

### 6. Open the report

Highlight:

- requested versus actual duration;
- completion reason and phases covered;
- competency scores;
- direct evidence quotes;
- per-turn audit;
- complete transcript.

### 7. Connect it to Nonilion

> The next step is not to rewrite the engine. It is to replace the CLI adapter with a Nonilion workspace adapter, resolve OpenAI or another model through BYOK settings, persist through Supabase/Prisma, inherit Clerk identity, and join the room through LiveKit when audio is enabled.

## Suggested short pitch

> NoniRecruiter is a proof of how I would build persistent, role-aware AI teammates for Nonilion. The current CLI isolates and validates the difficult domain logic: resume grounding, adaptive follow-ups, time budgeting, duplicate prevention, and auditable evaluation. Because that logic is transport-independent TypeScript, it can be integrated behind Nonilion's existing Node.js, LiveKit, OpenAI/BYOK, Supabase/Prisma, and Clerk boundaries rather than introduced as a disconnected application.

## What to say about Gemini and OpenAI

> Gemini is the current default only because its free tier makes the public demo inexpensive. The repository already has an OpenAI adapter. For a Nonilion integration, I would resolve the provider from the workspace's BYOK configuration and use OpenAI as the aligned default where no provider is selected.

Avoid saying that Gemini is a production recommendation or that Nonilion is limited to OpenAI.

## What to say about LiveKit

> Audio is a proposed transport layer. Nonilion publicly identifies LiveKit and WebRTC, so the engine can consume final transcript events from a room participant and publish the interviewer response back through an agent participant. I have intentionally left STT and TTS provider selection open because I could not verify Nonilion's internal choice.

Avoid saying the current repository already contains a working Nonilion voice agent.

## Current limitations to acknowledge

- Sessions are not durable across process restarts.
- Evaluation rubrics need human calibration before hiring use.
- Local Markdown is the output artifact; workspace delivery is proposed.
- Authentication and authorization are not implemented in the standalone demo.
- Audio is an integration roadmap item.
- The manifest is illustrative until the team provides its actual agent contract.
- Hiring recommendations require human review.

Clear limitations make the proposal more credible and give the team concrete integration questions to discuss.

## Evaluation scenarios

### Adaptive depth

Give a vague technical answer. Expected result: a targeted deeper probe.

### Duplicate prevention

Refer the interviewer back to a previous answer. Expected result: a different question covering another competency.

### Time closure

Run `npm run test:time`. Expected result: final answers are preserved and the engine closes at the time boundary.

### Provider failure

Run without an API key. Expected result: the deterministic fallback completes the interview instead of crashing.

### Evidence integrity

Open the final report. Expected result: verifier quotes occur in the candidate transcript rather than being invented by the evaluator.

## Repository review path

For an engineering review, suggest this order:

1. `README.md`
2. `docs/NONILION_INTEGRATION.md`
3. `lib/interview/types.ts`
4. `lib/interview/engine.ts`
5. `lib/interview/llm.ts`
6. `lib/interview/evaluator.ts`
7. `scripts/test-time-budget.ts`
8. A generated local report
