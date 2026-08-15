# Nonilion Evidence and Assumptions

This document records the public evidence used to shape the proposed integration. It prevents the repository from presenting compatible technologies as confirmed internal implementation details.

## Confidence labels

- **Confirmed** — explicitly stated in Nonilion, The Misty, or official product material.
- **Derived** — follows strongly from a confirmed dependency but was not stated directly.
- **Proposed** — a compatible choice for this project; not evidence of Nonilion's implementation.

## Confirmed

| Technology or behavior | Evidence used |
|---|---|
| Next.js, Three.js, WebRTC, Node.js, LiveKit | The Misty's official Nonilion launch post lists these technologies |
| LiveKit, Supabase, Prisma, OpenAI API, PixiJS/Three.js | Nonilion's AppSumo product response identifies them as critical third-party dependencies |
| Clerk authentication | Nonilion Getting Started documentation describes signup through Clerk |
| Google Calendar integration | Nonilion documentation and privacy material describe calendar connection behavior |
| Multi-provider/BYOK behavior | Nonilion product updates describe OpenAI, Anthropic, Gemini, Perplexity, and Cohere configuration |

## Derived

| Technology | Reasoning |
|---|---|
| PostgreSQL | Supabase provides PostgreSQL; Nonilion publicly identifies Supabase |
| React ecosystem | Next.js is confirmed, although React was not separately named in the cited material |
| TypeScript compatibility | Next.js, Node.js, and Prisma make it a natural fit, but public evidence supplied here does not explicitly confirm it |

## Proposed, not confirmed

- NoniRecruiter as a LiveKit agent participant
- The event names and TypeScript interfaces in the integration plan
- The proposed Prisma interview models
- The illustrative `agent/agent.json` schema
- Any particular STT or TTS provider
- Redis, queues, Docker, or a specific deployment platform
- How Nonilion resolves BYOK credentials internally

## Claims this repository should avoid

- “Nonilion uses Deepgram/AssemblyAI/Whisper.”
- “This manifest can already be installed in Nonilion.”
- “The current CLI is connected to Nonilion.”
- “NoniRecruiter uses Nonilion's production database.”
- “PostgreSQL or TypeScript was explicitly confirmed by Nonilion.”
- “The prototype is production-ready.”

## Sources

1. [The Misty — Introducing Nonilion](https://www.linkedin.com/posts/themisty_ai-technology-virtualmeetings-activity-7354941085053280256-im8b)
2. [Nonilion AppSumo product Q&A](https://appsumo.com/products/nonilion/questions/will-future-integrations-be-behind-paywa-1437219/1438892/)
3. [Nonilion Getting Started documentation](https://www.nonilion.com/documentation/getting-started)
4. [Nonilion Privacy Policy](https://www.nonilion.com/privacy)

These links reflect the evidence supplied for this project. Internal architecture and agent contracts must be confirmed directly with the Nonilion team before implementation.
