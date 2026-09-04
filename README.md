# NoniRecruiter

NoniRecruiter is a resume-aware AI technical interviewer built as an integration prototype for Nonilion.

It takes a candidate resume, job description, interview duration, and recruiter instructions; conducts an adaptive interview; and generates an evidence-backed hiring report.

## Capabilities

- 🎙️ **Voice-First Interview Room**: Natural speech-to-text and text-to-speech auto turn handoff
- ⚡ **Live Code Sandbox**: Real-time code execution via Piston API (TypeScript, Python, JS, C++)
- 🧠 **Anti-Hallucination & Fact-Checking**: Resume source verification and transcript contradiction matrix
- 🐙 **GitHub Repository Grounding**: Repository ingestor probing real code implementations & architecture choices
- 📊 **Calibrated Role Rubrics**: Custom recruiter scoring weights (Systems Architect, Frontend, Leadership, Generalist)
- 🛡️ **Anti-Cheat Audit**: Copy-paste monitoring and integrity verdict scorecards
- ⏱️ **Time-Aware Adaptive Engine**: Dynamic time budgeting with strict question conciseness rules

## Documentation

- 📜 **[LICENSE](LICENSE)** — MIT License
- 🛠️ **[Developer Guide](docs/DEVELOPER_GUIDE.md)** — Architecture, setup, API routes, environment variables & code structure
- 👤 **[User & Candidate Guide](docs/USER_GUIDE.md)** — Voice room walkthrough, code sandbox usage & candidate expectations
- 🏗️ **[Architecture Diagram](docs/ARCHITECTURE.md)** — Component flow and state machine
- 🎯 **[Outreach & Pitch Master Plan](PLAN.md)** — 19 personalized founder outreach pitches for YC / Peak XV targets

## Quickstart

```bash
# Clone & install
git clone https://github.com/Pankaj4152/NoniRecruiter.git
cd NoniRecruiter
npm install

# Configure environment
cp .env.example .env

# Run development server
npm run dev
```

Open `http://localhost:3000` to launch the recruiter setup screen.

## Useful commands

| Command | Purpose |
|---|---|
| `npm run dev` | Start Next.js web application |
| `npm run typecheck` | Validate TypeScript contracts |
| `npm run test:interactive` | Run CLI interactive interview |
| `npm run test:simulate` | Run automated simulation |
| `npm run test:engine` | Test adaptive questions & deduplication |
| `npm run test:time` | Test time management policy |

## License

This project is licensed under the [MIT License](LICENSE).

