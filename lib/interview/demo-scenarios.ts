export interface DemoScenario {
  id: string;
  level: string;
  candidateName: string;
  roleTitle: string;
  companyName: string;
  summary: string;
  focusAreas: string[];
  resumeText: string;
  jobDescription: string;
  keyRequirements: string[];
  customInstructions: string;
}

export const demoScenarios: DemoScenario[] = [
  {
    id: 'junior-full-stack', level: 'Junior', candidateName: 'Aarav Mehta', roleTitle: 'Junior Full-Stack Developer', companyName: 'PixelForge Labs',
    summary: 'A practical early-career interview covering React, APIs, databases, debugging, and learning ability.',
    focusAreas: ['React', 'Node.js APIs', 'SQL', 'Debugging'],
    resumeText: `Aarav Mehta — Junior Full-Stack Developer
Built CampusConnect, a student collaboration application using React, Node.js, Express, and PostgreSQL. Implemented authentication, REST APIs, responsive pages, and database queries. Reduced the dashboard load time from 2.8 seconds to 1.6 seconds by removing duplicate API requests and adding pagination. Completed a three-month software internship where he fixed production UI defects, wrote API tests, and worked through GitHub pull requests. Skills: JavaScript, TypeScript, React, Node.js, Express, PostgreSQL, Git, HTML, CSS.`,
    jobDescription: `Build and maintain responsive React interfaces and Node.js APIs. Work with relational databases, debug defects, write maintainable code, participate in reviews, and learn unfamiliar tools with support from senior engineers.`,
    keyRequirements: ['React interface development', 'Node.js REST APIs', 'Relational database fundamentals', 'Debugging and testing', 'Ability to learn and collaborate'],
    customInstructions: 'Keep the level appropriate for a junior candidate. Prioritize fundamentals, debugging approach, ownership, and learning ability over advanced system design.',
  },
  {
    id: 'backend-systems', level: 'Mid-level', candidateName: 'Nisha Rao', roleTitle: 'Backend Systems Engineer', companyName: 'OrbitStack',
    summary: 'A backend-focused interview covering service design, PostgreSQL, queues, reliability, and operational trade-offs.',
    focusAreas: ['API design', 'PostgreSQL', 'Queues', 'Reliability'],
    resumeText: `Nisha Rao — Backend Engineer
Four years of experience building Python and FastAPI services backed by PostgreSQL and Redis. At Northstar Commerce, redesigned order processing around a queue to isolate slow third-party calls, reducing API p95 latency from 1.9 seconds to 420 milliseconds. Added idempotency keys, retry limits, structured logging, and failure dashboards. Led a database indexing review that reduced a reporting query from 12 seconds to under 2 seconds. Skills: Python, FastAPI, PostgreSQL, Redis, Docker, RabbitMQ, REST APIs, Linux, Git.`,
    jobDescription: `Design reliable backend services and APIs, model data in PostgreSQL, use asynchronous processing where appropriate, diagnose production failures, and communicate architecture trade-offs. Experience with Python, queues, caching, containers, and observability is valuable.`,
    keyRequirements: ['Reliable backend service design', 'PostgreSQL data modeling and performance', 'Asynchronous processing and queues', 'Failure handling and observability', 'Architecture trade-off communication'],
    customInstructions: 'Probe one concrete production incident. Ask for alternatives, failure modes, operational metrics, and what the candidate would redesign at greater scale.',
  },
  {
    id: 'senior-ai-engineer', level: 'Senior', candidateName: 'Elena Park', roleTitle: 'Senior AI Engineer', companyName: 'SignalWorks AI',
    summary: 'A senior interview covering LLM systems, evaluation, retrieval, reliability, cost, and technical leadership.',
    focusAreas: ['LLM evaluation', 'RAG', 'Reliability', 'Technical leadership'],
    resumeText: `Elena Park — Senior AI Engineer
Seven years in machine learning and backend systems. Led development of a retrieval-augmented support assistant using Python, FastAPI, PostgreSQL with pgvector, and an LLM gateway. Created an offline evaluation set of 1,200 reviewed queries and improved grounded-answer precision from 71% to 88%. Introduced model routing, prompt versioning, citation validation, latency budgets, and fallback behavior, reducing inference cost by 34%. Mentored five engineers and partnered with security and product teams on launch criteria. Skills: Python, PyTorch, FastAPI, PostgreSQL, vector search, LLM evaluation, RAG, Docker, Kubernetes, observability.`,
    jobDescription: `Lead production AI systems from experimentation through reliable deployment. Define evaluation methodology, design retrieval and model-routing systems, manage latency and cost, establish safety controls, and guide engineers across ML and backend concerns.`,
    keyRequirements: ['Production LLM system architecture', 'Evaluation and groundedness measurement', 'Retrieval system design', 'Latency, reliability, and cost controls', 'Cross-functional technical leadership'],
    customInstructions: 'Interview at senior level. Challenge evaluation validity, retrieval failure modes, model-routing trade-offs, incident readiness, and leadership decisions. Require measurable evidence.',
  },
];

export function getDemoScenario(id: string): DemoScenario | undefined { return demoScenarios.find((scenario) => scenario.id === id); }
