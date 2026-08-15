# Architecture

## Current prototype

```mermaid
flowchart LR
    C[Recruiter configuration] --> P[Resume and JD parser]
    P --> E[Adaptive interview engine]
    E --> L{LLM provider}
    L --> G[Gemini]
    L --> O[OpenAI]
    L --> F[Visible demo fallback]
    E --> T[Candidate transcript]
    T --> V[Evidence evaluator]
    V --> R[Hiring report]
```

The CLI is an adapter around the interview engine. Provider, timing, coverage, evaluation, and report logic remain independent from the interface.

## Proposed Nonilion integration

```mermaid
flowchart TB
    subgraph N[Nonilion Workspace]
      R[Recruiter]
      W[Technical Interviewer teammate]
      C[Candidate room participant]
      A[Hiring report artifact]
    end

    R -->|Resume + JD + instructions| W
    C <-->|LiveKit room audio / text| W

    subgraph NR[NoniRecruiter Engine]
      CTX[Candidate context]
      INT[Adaptive questions]
      TIME[Time and coverage policy]
      EVAL[Evidence scoring]
    end

    W --> CTX
    CTX --> INT
    TIME --> INT
    INT --> W
    INT --> EVAL

    BYOK[Nonilion provider / BYOK] --> INT
    AUTH[Clerk identity context] --> W
    DB[Supabase + Prisma] <--> NR
    EVAL --> A
```

### Integration principle

NoniRecruiter should extend the platform rather than duplicate it:

- Nonilion owns workspace identity, rooms, provider settings, and persistence boundaries.
- NoniRecruiter owns interview policy, timing, adaptive probing, evidence evaluation, and report structure.
- LiveKit is a proposed transport around the existing text-first engine.
- STT and TTS remain provider adapters until Nonilion confirms its internal standard.

The proposed components are documented in detail in [NONILION_INTEGRATION.md](NONILION_INTEGRATION.md).
