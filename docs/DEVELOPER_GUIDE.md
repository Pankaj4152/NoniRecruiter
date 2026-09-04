# NoniRecruiter Developer & Setup Guide

Welcome to the developer documentation for **NoniRecruiter** — an Adaptive Technical Evidence & Oral Defense Engine.

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Prerequisites & Quickstart](#prerequisites--quickstart)
3. [Environment Variables](#environment-variables)
4. [Engine Architecture](#engine-architecture)
5. [Piston Sandbox Integration (Phase 1)](#piston-sandbox-integration-phase-1)
6. [Scoring Rubric Calibration (Phase 2)](#scoring-rubric-calibration-phase-2)
7. [Anti-Cheat & Candidate Integrity Audit (Phase 3)](#anti-cheat--candidate-integrity-audit-phase-3)
8. [Voice-First UI & Web Speech API (Phase 5)](#voice-first-ui--web-speech-api-phase-5)
9. [CLI & Testing Commands](#cli--testing-commands)

---

## Architecture Overview

NoniRecruiter is constructed using Next.js 14 (App Router), TypeScript, and Tailwind CSS with a decoupled interview state machine engine.

```
NoniRecruiter Architecture
├── app/
│   ├── page.tsx               # Landing page & feature overview
│   ├── create/page.tsx        # Room setup, resume upload & rubric configuration
│   ├── interview/[id]/page.tsx# Voice-first interview room & live Piston sandbox
│   └── api/agent/             # Next.js API route handlers (setup, turn, finish, report)
├── lib/interview/
│   ├── engine.ts              # Time-budget policy, turn state machine & LLM prompt rules
│   ├── evaluator.ts           # Turn evaluation, scoring & resume fact-checking
│   ├── sandbox.ts             # Isolated Piston code execution API client
│   ├── github.ts              # Repository ingestor & summary extractor
│   ├── report.ts              # Evidence-backed Markdown report generator
│   └── types.ts               # Shared contracts & state definitions
└── components/
    └── CodeEditor.tsx         # Live Code Editor & Sandbox terminal component
```

---

## Prerequisites & Quickstart

- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher

### Local Development Setup

```bash
# 1. Clone repository
git clone https://github.com/Pankaj4152/NoniRecruiter.git
cd NoniRecruiter

# 2. Install dependencies
npm install

# 3. Create environment file
cp .env.example .env

# 4. Start Next.js development server
npm run dev
```

Open `http://localhost:3000` in your browser.

---

## Environment Variables

Configure your `.env` file for LLM provider access:

```env
# Primary Provider Choice: 'gemini' | 'openai' | 'demo-fallback'
LLM_PROVIDER=gemini

# Google Gemini API Key
GEMINI_API_KEY=your_gemini_api_key_here

# OpenAI API Key (Optional)
OPENAI_API_KEY=your_openai_api_key_here
```

*Note: If no API key is provided, NoniRecruiter automatically uses an offline, deterministic fallback mode so all features remain fully testable.*

---

## Engine Architecture

The core logic resides in `lib/interview/engine.ts`. Each interview turn evaluates real-time time budgets and transitions through 5 phases:

1. `WARMUP`: Candidate intro, background, and initial role fit.
2. `TECHNICAL_PROBING`: Deep role probing, technical trade-offs, and GitHub repo grounding.
3. `CODING_CHALLENGE`: Algorithmic logic and live isolated Piston code sandbox execution.
4. `BEHAVIORAL`: System design trade-offs, teamwork, and decision explainability.
5. `CLOSING`: Autonomous wrap-up and report generation.

---

## Piston Sandbox Integration (Phase 1)

Candidate code submissions are executed in real time using the **EMKC Piston API v2** (`https://emkc.org/api/v2/piston/execute`).

- **Supported Languages**: TypeScript, JavaScript, Python, C++, Java, Go, Rust.
- **Execution Payload**: Captures `stdout`, `stderr`, `exitCode`, and `executionTimeMs`.
- **Evaluator Feedback**: Sandbox execution logs are fed into `CandidateEvaluator` to grade code against actual runtime pass/fail output instead of pure syntax guessing.

---

## Scoring Rubric Calibration (Phase 2)

Recruiters can select or customize role-specific evaluation rubrics during room setup:

- **Balanced Generalist**: Technical 45%, Communication 30%, Problem Solving 25%
- **Systems Architect**: Technical 60%, System Scale 25%, Communication 15%
- **Frontend Specialist**: Coding 40%, UI Architecture 30%, Communication 30%
- **Engineering Manager**: Communication 50%, Problem Solving 30%, Technical 20%

---

## Anti-Cheat & Candidate Integrity Audit (Phase 3)

NoniRecruiter monitors candidate input behavior to ensure interview integrity:

- Tracks paste events, pasted character lengths, and time delays.
- Flags anomalous copy-paste chunks (>200 characters or >=3 paste events).
- Generates an **Integrity Verdict** (`HIGH INTEGRITY`, `MODERATE`, or `PASTE ANOMALY FLAGGED`) embedded inside the candidate's final hiring report.

---

## Voice-First UI & Web Speech API (Phase 5)

The interview room (`app/interview/[id]/page.tsx`) uses a voice-first turn handoff state machine:

1. **Interviewer Speaking**: Browser SpeechSynthesis speaks the question aloud. Input controls are locked.
2. **Candidate Turn Handoff**: Once the interviewer finishes, the Mic button unlocks automatically and pulses.
3. **Web Speech Recognition**: Captures live candidate voice responses in real time.
4. **Fallback Keyboard Input**: Allows text typing fallback if a microphone is unavailable.

---

## CLI & Testing Commands

```bash
# Typecheck TypeScript types
npm run typecheck

# Run interactive CLI interview demo
npm run test:interactive

# Run automated interview simulation
npm run test:simulate

# Test time-budget policy and phase transitions
npm run test:time

# Test provider fallback logic
npm run test:provider
```
