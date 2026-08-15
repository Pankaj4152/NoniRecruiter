# NoniRecruiter → Nonilion Integration Plan

## Purpose

This document describes how the current NoniRecruiter proof of concept could become a persistent interview teammate inside Nonilion. It separates:

- what exists in this repository now;
- what public evidence says about Nonilion;
- what must be adapted with the Nonilion engineering team;
- and what remains an unverified architectural proposal.

## Executive proposal

Keep the interview domain engine as a TypeScript/Node.js module. Replace the terminal transport with a Nonilion workspace adapter, use LiveKit for room participation, resolve models through Nonilion's provider/BYOK configuration, and persist interview artifacts through the existing Supabase/Prisma layer.

```text
Recruiter in Nonilion
        │ configures role, rubric, duration, candidate
        ▼
Workspace interview session
        │
        ├── Clerk identity + workspace authorization
        ├── LiveKit room + agent participant
        └── Resume/job context
                │
                ▼
       NoniRecruiter Node.js service
        ├── resume parser
        ├── interview/time engine
        ├── provider adapter / BYOK
        └── evidence evaluator
                │
                ▼
       Supabase/Postgres via Prisma
        ├── interview session
        ├── transcript turns
        ├── evidence and scores
        └── final report
```

## Current implementation

### Ready to reuse

| Capability | Current module | Integration value |
|---|---|---|
| Candidate context parsing | `lib/interview/parser.ts` | Converts resume content into interview context |
| Adaptive interview state | `lib/interview/engine.ts` | Generates questions and controls phase transitions |
| Time-budget policy | `lib/interview/engine.ts` | Trades depth for coverage as time decreases |
| Provider abstraction | `lib/interview/llm.ts` | Supports Gemini, OpenAI, and a fallback |
| Evidence evaluation | `lib/interview/evaluator.ts` | Scores turns and verifies evidence against answers |
| Report aggregation | `lib/interview/report.ts` | Produces structured report data and Markdown |
| Domain types | `lib/interview/types.ts` | Candidate, job, session, turn, timing, and report contracts |

### Prototype-only parts

| Current choice | Why it exists | Production replacement |
|---|---|---|
| CLI interaction | Fastest way to prove interview logic | Nonilion workspace and LiveKit adapter |
| Gemini as default | Accessible free tier for demonstrations | Nonilion provider/BYOK selection; OpenAI as aligned default |
| Process-local session map | Minimal demo persistence | Supabase/Postgres through Prisma |
| Local Markdown reports | Easy artifact inspection | Stored report plus workspace artifact/event |
| Candidate name only | No auth needed for local demo | Clerk principal and workspace authorization |
| `agent/agent.json` | Illustrates agent metadata | Must conform to Nonilion's actual agent registration contract |

## Proposed integration boundaries

### 1. Workspace adapter

Create a thin adapter around `InterviewEngine`; do not put room, authentication, or database logic inside the engine.

Suggested responsibilities:

```ts
interface NonilionInterviewAdapter {
  createSession(input: WorkspaceInterviewInput): Promise<string>;
  acceptTranscript(sessionId: string, text: string): Promise<AgentReply>;
  finishSession(sessionId: string, reason: CompletionReason): Promise<ReportReference>;
}
```

The adapter should translate Nonilion room events into the existing candidate/job/session types and translate engine results into room messages, audio responses, and persisted events.

### 2. Identity and authorization

Public Nonilion documentation says account authentication uses Clerk. The integration should therefore receive identity from the host application rather than implement a second login.

Minimum authorization context:

```ts
interface WorkspacePrincipal {
  clerkUserId: string;
  workspaceId: string;
  roomId: string;
  role: 'recruiter' | 'candidate' | 'admin';
}
```

Authorization rules to confirm with Nonilion:

- who may create or configure an interview agent;
- who may view the resume and final report;
- whether candidates can see the transcript or evaluation;
- which workspace members can export or delete an interview;
- how long resumes, audio, transcripts, and reports are retained.

### 3. Provider and BYOK migration

The prototype currently defaults to Gemini because the free tier lowers demo cost. `lib/interview/llm.ts` already isolates provider calls and includes an OpenAI adapter.

Migration sequence:

1. Replace direct environment-key lookup with a `ModelProvider` interface.
2. Resolve provider settings from the Nonilion workspace/BYOK configuration.
3. Make OpenAI the default only when the workspace has not selected another provider.
4. Pass model, temperature, context length, and token limit from workspace policy.
5. Record provider/model metadata with each generated turn for auditability.
6. Add timeout, retry, rate-limit, and structured-output validation policies.

Suggested boundary:

```ts
interface ModelProvider {
  complete(input: {
    messages: LLMMessage[];
    responseSchema?: unknown;
    temperature: number;
    workspaceId: string;
    purpose: 'resume_parse' | 'interview_turn' | 'evaluation';
  }): Promise<{
    text: string;
    provider: string;
    model: string;
    usage?: { inputTokens: number; outputTokens: number };
  }>;
}
```

Why OpenAI first for the integrated version:

- OpenAI API is publicly identified as a critical Nonilion dependency.
- It reduces integration novelty relative to introducing a new mandatory provider.
- The provider interface preserves Gemini, Anthropic, or other BYOK choices.

This does **not** mean Gemini should be removed. It remains useful for local development and workspaces that select it.

### 4. LiveKit audio evolution

The current repository is text-first. LiveKit and WebRTC are publicly confirmed parts of Nonilion's realtime platform, so audio should be implemented as a transport around the existing engine.

```text
Candidate microphone
      │
      ▼
Nonilion LiveKit room
      │ audio track
      ▼
Speech-to-text adapter
      │ final transcript event
      ▼
NoniRecruiter engine
      │ interviewer response text
      ▼
Text-to-speech adapter
      │ audio track
      ▼
LiveKit agent participant
```

Recommended behavior:

- join the existing room as a named agent participant;
- consume only the authorized candidate audio track;
- send final transcript segments into `processTurn`;
- publish agent status (`listening`, `thinking`, `speaking`, `complete`) as room data;
- publish synthesized speech as an agent audio track;
- preserve text transcript fallback for accessibility and provider failure;
- allow interruption while the agent is speaking;
- stop opening new deep topics during the closing time window.

STT/TTS should remain adapter interfaces. Public evidence confirms LiveKit/WebRTC but does not confirm Nonilion's transcription or synthesis provider. Do not hard-code claims about Deepgram, AssemblyAI, Whisper, or another service until the team confirms its preference.

### 5. Persistence through Supabase and Prisma

Supabase and Prisma are publicly identified Nonilion dependencies. The following is a proposed model, not a claim about their existing schema.

```prisma
model InterviewSession {
  id                    String   @id
  workspaceId           String
  roomId                String?
  recruiterUserId       String
  candidateDisplayName  String
  roleTitle             String
  companyName           String
  targetDurationSeconds Int
  startedAt             DateTime
  endedAt               DateTime?
  status                String
  completionReason      String?
  turns                 InterviewTurn[]
  report                InterviewReport?
}

model InterviewTurn {
  id          String   @id
  sessionId   String
  sequence    Int
  speaker     String
  phase       String
  text        String
  occurredAt  DateTime
  provider    String?
  model       String?
  session     InterviewSession @relation(fields: [sessionId], references: [id])
}

model InterviewReport {
  id          String   @id
  sessionId   String   @unique
  verdict     String
  confidence  String?
  score       Int
  payload     Json
  createdAt   DateTime
  session     InterviewSession @relation(fields: [sessionId], references: [id])
}
```

Store structured report JSON as the canonical artifact. Generate Markdown or UI views from that JSON rather than treating the Markdown file as the database record.

### 6. Workspace events

Suggested events:

| Event | Producer | Consumers |
|---|---|---|
| `interview.created` | recruiter configuration | room UI, persistence |
| `interview.started` | agent adapter | room timeline, analytics |
| `interview.turn.completed` | interview engine | transcript UI, persistence |
| `interview.phase.changed` | interview engine | room status UI |
| `interview.completed` | scheduler or recruiter | evaluator, room UI |
| `interview.report.ready` | evaluator | recruiter notification, workspace artifact |
| `interview.failed` | any integration boundary | operations and recruiter UI |

Every event should include `workspaceId`, `sessionId`, timestamp, schema version, and an idempotency key.

## Migration roadmap

### Phase 0 — current proof of concept

- CLI interview
- Gemini free-tier default
- OpenAI adapter
- local session state
- Markdown report
- automated engine and timing tests

### Phase 1 — align the AI boundary

- introduce the `ModelProvider` interface;
- make provider configuration workspace-scoped;
- test OpenAI structured outputs;
- record provider, model, latency, and token usage;
- remove provider-specific assumptions from the domain engine.

**Deliverable:** the same CLI demo running through a Nonilion-compatible provider boundary.

### Phase 2 — durable service

- package the engine as a Node.js service/module;
- add Supabase/Prisma repositories;
- add idempotent turn writes and report jobs;
- add Clerk-derived authorization context;
- expose internal create/turn/finish/report operations.

**Deliverable:** authenticated text interviews that survive process restarts.

### Phase 3 — workspace integration

- embed recruiter configuration in a Nonilion workspace;
- post agent state and transcript events into the room;
- persist workspace, room, recruiter, and candidate associations;
- deliver the final report as a workspace artifact.

**Deliverable:** NoniRecruiter as a persistent text teammate.

### Phase 4 — LiveKit audio

- join the room as an agent participant;
- connect STT and TTS adapters;
- add interruption and turn-end detection;
- preserve text fallback and transcript audit;
- measure time-to-first-transcript and end-to-end response latency.

**Deliverable:** realtime spoken interviews using Nonilion's room infrastructure.

### Phase 5 — hiring workflow maturity

- versioned role rubrics;
- human calibration and override;
- confidence-aware recommendations;
- recruiter comments and report approval;
- retention, consent, deletion, and audit controls;
- fairness evaluation and monitoring.

## Definition of done for a Nonilion pilot

- A recruiter can configure an interview inside an authorized workspace.
- The agent joins or is associated with the correct room.
- Candidate context is scoped to that workspace and session.
- The agent conducts a time-managed interview without repeated questions.
- Every transcript turn is durably stored and ordered.
- The configured provider is resolved through workspace settings.
- The report links claims to transcript evidence.
- The report is visible only to authorized users.
- Provider or audio failure falls back to a recoverable text flow.
- The session can be deleted according to retention policy.

## Questions for the Nonilion team

These cannot be answered safely from public evidence:

1. What is the actual agent registration and lifecycle contract?
2. How are agents invited to or dispatched into LiveKit rooms?
3. Which room data/event conventions should an agent use?
4. How are workspace BYOK credentials resolved without exposing keys to the agent?
5. Which STT and TTS providers, if any, are already standardized?
6. What Prisma models or Supabase schemas should interview artifacts extend?
7. Which Clerk claims represent workspace membership and authorization?
8. What are the retention and consent requirements for resumes, transcripts, and audio?
9. How should completed reports appear inside the workspace?
10. Which observability and evaluation standards must a persistent agent meet?

## Architectural principles

- Keep interview policy independent of CLI, web, and LiveKit transports.
- Use Nonilion identity, rooms, provider configuration, and persistence instead of duplicating them.
- Treat model output as untrusted structured data and validate every response.
- Keep exact transcript evidence behind every hiring claim.
- Preserve human review and never make an irreversible hiring decision autonomously.
- Mark assumptions as assumptions until confirmed by the Nonilion team.
