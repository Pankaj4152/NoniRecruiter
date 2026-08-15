# NoniRecruiter

NoniRecruiter is a resume-aware AI technical interviewer built as an integration prototype for Nonilion.

It takes a candidate resume, job description, interview duration, and recruiter instructions; conducts an adaptive interview; and generates an evidence-backed hiring report.

## Current capabilities

- PDF, TXT, Markdown, or pasted resume context
- Questions adapted to the role and previous answers
- Time-aware control of question depth and coverage
- Duplicate-question prevention
- Technical and behavioral interview phases
- Turn-by-turn evaluation with transcript evidence
- Markdown hiring report with scores, timing, and transcript
- Gemini, OpenAI, and offline demo modes

## Run the CLI demo

```powershell
cd "F:\Projects\AI Interview"
npm install
Copy-Item .env.example .env
npm run test:interactive
```

Configure an optional provider in `.env`.

Gemini is currently used for the low-cost demo:

```env
LLM_PROVIDER=gemini
GEMINI_API_KEY=your_key
```

OpenAI is also supported:

```env
LLM_PROVIDER=openai
OPENAI_API_KEY=your_key
```

Without a valid key, the project uses a deterministic fallback so the demo remains runnable.

## Example

```text
Interviewer> Which architecture decision had the largest impact on reliability?

Pankaj> I moved long-running work behind a queue because...

Interviewer> What alternatives did you consider, and how did you measure the result?
```

When the interview finishes, a report is generated in the repository root:

```text
interview_report_candidate_name_<timestamp>.md
```

## Nonilion integration direction

The current CLI validates the core interview engine. The proposed Nonilion integration would:

- run the TypeScript engine as a Node.js workspace service;
- use OpenAI or another provider through Nonilion's BYOK configuration;
- join interview rooms through LiveKit when audio is added;
- store sessions, transcripts, evidence, and reports through Supabase/Prisma;
- inherit workspace identity and authorization through Clerk;
- return the final report as a persistent workspace artifact.

These are proposed integration steps, not features claimed to be connected to Nonilion today.

## Documentation

- **[Architecture Diagram](docs/ARCHITECTURE.md)** — current prototype and proposed Nonilion teammate flow.
- **[Nonilion Integration Plan](docs/NONILION_INTEGRATION.md)** — current-versus-target architecture, provider migration, LiveKit audio path, persistence, events, roadmap, and pilot requirements.
- **[Demo Guide](docs/DEMO_GUIDE.md)** — recommended walkthrough, pitch, test scenarios, and limitations.
- **[Evidence and Assumptions](docs/NONILION_EVIDENCE.md)** — confirmed public technologies versus derived or proposed choices.

## Useful commands

| Command | Purpose |
|---|---|
| `npm run test:interactive` | Run the CLI interview |
| `npm run test:simulate` | Run an automated simulation |
| `npm run test:engine` | Test adaptive questions and deduplication |
| `npm run test:time` | Test time management and closing |
| `npm run test:provider` | Test provider and fallback visibility |
| `npm run typecheck` | Validate TypeScript |
| `npm run build` | Build the optional Next.js interface |

## Project structure

```text
lib/interview/
├── engine.ts       # interview state, timing, and question policy
├── parser.ts       # resume and candidate context
├── llm.ts          # Gemini/OpenAI abstraction
├── evaluator.ts    # scoring and evidence verification
├── report.ts       # report generation
└── types.ts        # shared contracts

scripts/
├── interactive-interview.ts
├── test-engine.ts
└── test-time-budget.ts
```

## Scope

This repository demonstrates the interview workflow and its integration shape. Production use would still require durable storage, authentication, consent and retention policies, observability, rubric calibration, and human review of hiring recommendations.
