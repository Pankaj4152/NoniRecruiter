import fs from 'fs';
import path from 'path';
import { CandidateProfile, ParsedResumeJSON } from './types';
import { generateLLMCompletion } from './llm';

/**
 * Loads raw text from a PDF, TXT, or MD file path.
 */
export async function loadResumeContent(filePathOrText: string): Promise<string> {
  const trimmed = filePathOrText.trim().replace(/^['"]|['"]$/g, '');

  if (fs.existsSync(trimmed)) {
    const ext = path.extname(trimmed).toLowerCase();

    if (ext === '.pdf') {
      try {
        const pdfParseModule = await import('pdf-parse');
        const pdfParse = pdfParseModule.default || pdfParseModule;
        const dataBuffer = fs.readFileSync(trimmed);
        const parsed = await pdfParse(dataBuffer);

        if (parsed.text && parsed.text.trim().length > 0) {
          return parsed.text.trim();
        }
      } catch (err) {
        console.warn(`[PDF Parser Warning] Fallback read:`, err);
      }
    }

    return fs.readFileSync(trimmed, 'utf-8');
  }

  return trimmed;
}

/**
 * Categorizes raw resume text into a structured JSON object and candidate profile.
 */
export async function parseCandidateProfile(
  rawResumeText: string,
  candidateName: string = 'Candidate',
  targetRole: string = 'AI Engineering Intern',
  options: { useLLM?: boolean } = {}
): Promise<CandidateProfile> {
  if (options.useLLM === false) {
    return createCandidateFromFallback(rawResumeText, candidateName, targetRole);
  }

  const prompt = `Extract only facts explicitly present in the resume text into structured JSON.

GROUNDING RULES:
- Never infer, assume, complete, or invent a skill, employer, project, achievement, technology, degree, date, or contact detail.
- Empty or absent categories must be returned as empty arrays or empty strings.
- The schema labels below are field names, not example facts to copy.

=== RESUME TEXT ===
${rawResumeText}

Return strictly JSON matching this structure:
{
  "fullName": "${candidateName}",
  "contact": { "email": "", "phone": "", "github": "", "linkedin": "" },
  "experience": [
    {
      "company": "",
      "role": "",
      "duration": "",
      "highlights": []
    }
  ],
  "projects": [
    {
      "title": "",
      "technologies": [],
      "description": "",
      "highlights": []
    }
  ],
  "skills": {
    "languages": [],
    "ai_ml": [],
    "frameworks_libraries": [],
    "backend_databases": [],
    "tools_infrastructure": []
  },
  "achievements": [],
  "education": {
    "degree": "",
    "institution": "",
    "year": ""
  }
}`;

  try {
    const response = await generateLLMCompletion(
      [
        { role: 'system', content: 'You are a source-grounded resume extractor. Output only facts directly supported by the supplied text. Never infer missing facts.' },
        { role: 'user', content: prompt }
      ],
      { jsonMode: true, temperature: 0.2 }
    );

    const structuredJSON = groundParsedResume(JSON.parse(response) as ParsedResumeJSON, rawResumeText, candidateName);

    const allSkills = [
      ...(structuredJSON.skills.languages || []),
      ...(structuredJSON.skills.ai_ml || []),
      ...(structuredJSON.skills.frameworks_libraries || []),
      ...(structuredJSON.skills.backend_databases || []),
      ...(structuredJSON.skills.tools_infrastructure || []),
    ];

    return {
      name: candidateName,
      targetRole,
      experienceLevel: 'Junior',
      skills: Array.from(new Set(allSkills)),
      resumeText: rawResumeText.replace(/\s+/g, ' ').trim(),
      structuredResume: structuredJSON,
    };
  } catch (error) {
    console.warn('[resume-parser] AI parsing failed; using local parser', {
      error: error instanceof Error ? error.message : 'Unknown parsing error',
    });
  }

  return createCandidateFromFallback(rawResumeText, candidateName, targetRole);
}

export function groundParsedResume(parsed: ParsedResumeJSON, rawText: string, candidateName: string): ParsedResumeJSON {
  const normalizedSource = normalizeEvidence(rawText);
  const supported = (value?: string) => Boolean(value && normalizeEvidence(value).length > 1 && normalizedSource.includes(normalizeEvidence(value)));
  const substantiallySupported = (value?: string) => {
    if (!value) return false;
    const words = normalizeEvidence(value).split(' ').filter((word) => word.length > 3);
    if (!words.length) return supported(value);
    return words.filter((word) => normalizedSource.includes(word)).length / words.length >= 0.65;
  };
  const list = (value: unknown): string[] => Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
  const groundedSkills = (skills: Partial<ParsedResumeJSON['skills']> = {}) => ({
    languages: list(skills.languages).filter(supported),
    ai_ml: list(skills.ai_ml).filter(supported),
    frameworks_libraries: list(skills.frameworks_libraries).filter(supported),
    backend_databases: list(skills.backend_databases).filter(supported),
    tools_infrastructure: list(skills.tools_infrastructure).filter(supported),
  });

  return {
    fullName: candidateName,
    contact: {
      email: supported(parsed.contact?.email) ? parsed.contact.email : undefined,
      phone: supported(parsed.contact?.phone) ? parsed.contact.phone : undefined,
      github: supported(parsed.contact?.github) ? parsed.contact.github : undefined,
      linkedin: supported(parsed.contact?.linkedin) ? parsed.contact.linkedin : undefined,
    },
    experience: (Array.isArray(parsed.experience) ? parsed.experience : [])
      .filter((item) => supported(item.company) || supported(item.role))
      .map((item) => ({
        company: supported(item.company) ? item.company : '',
        role: supported(item.role) ? item.role : '',
        duration: supported(item.duration) ? item.duration : '',
        highlights: list(item.highlights).filter(substantiallySupported),
      })),
    projects: (Array.isArray(parsed.projects) ? parsed.projects : [])
      .filter((item) => supported(item.title))
      .map((item) => ({
        title: item.title,
        technologies: list(item.technologies).filter(supported),
        description: substantiallySupported(item.description) ? item.description : '',
        highlights: list(item.highlights).filter(substantiallySupported),
      })),
    skills: groundedSkills(parsed.skills),
    achievements: list(parsed.achievements).filter(substantiallySupported),
    education: {
      degree: supported(parsed.education?.degree) ? parsed.education.degree : '',
      institution: supported(parsed.education?.institution) ? parsed.education.institution : '',
      year: supported(parsed.education?.year) ? parsed.education.year : '',
    },
  };
}

function normalizeEvidence(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9+#.]+/g, ' ').replace(/\s+/g, ' ').trim();
}

function createCandidateFromFallback(rawResumeText: string, candidateName: string, targetRole: string): CandidateProfile {
  const fallbackJSON = createLocalCategorizedJSON(rawResumeText, candidateName);

  const allSkills = [
    ...fallbackJSON.skills.languages,
    ...fallbackJSON.skills.ai_ml,
    ...fallbackJSON.skills.frameworks_libraries,
    ...fallbackJSON.skills.backend_databases,
    ...fallbackJSON.skills.tools_infrastructure,
  ];

  return {
    name: candidateName,
    targetRole,
    experienceLevel: 'Junior',
    skills: allSkills,
    resumeText: rawResumeText.replace(/\s+/g, ' ').trim(),
    structuredResume: fallbackJSON,
  };
}

/**
 * Local Rule-Based Categorized JSON Extractor (Pankaj's resume specialized fallback)
 */
function createLocalCategorizedJSON(rawText: string, name: string): ParsedResumeJSON {
  const normalized = rawText.replace(/\s+/g, ' ').trim();
  const email = normalized.match(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/)?.[0];
  const phone = normalized.match(/(?:\+?\d[\d\s()-]{7,}\d)/)?.[0];
  const catalog: Record<keyof ParsedResumeJSON['skills'], string[]> = {
    languages: ['Python', 'C++', 'Java', 'JavaScript', 'TypeScript', 'Go', 'Rust', 'SQL'],
    ai_ml: ['LLM', 'RAG', 'Transformers', 'PyTorch', 'TensorFlow', 'Machine Learning'],
    frameworks_libraries: ['React', 'Next.js', 'FastAPI', 'Node.js', 'Express', 'LiteLLM'],
    backend_databases: ['PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'SQLite'],
    tools_infrastructure: ['Docker', 'Kubernetes', 'AWS', 'GCP', 'Azure', 'Git', 'Linux', 'LiveKit'],
  };
  const skills = Object.fromEntries(
    Object.entries(catalog).map(([category, terms]) => [
      category,
      terms.filter((term) => normalized.toLowerCase().includes(term.toLowerCase())),
    ])
  ) as unknown as ParsedResumeJSON['skills'];
  return {
    fullName: name,
    contact: { email, phone },
    experience: [],
    projects: [],
    skills,
    achievements: [],
    education: { degree: '', institution: '', year: '' },
  };
}

// Kept separate from the generic fallback so older demo data is never returned for a real candidate.
function createLocalCategorizedJSONLegacy(rawText: string, name: string): ParsedResumeJSON {
  return {
    fullName: name,
    contact: {
      email: 'pankajgoyal4152@gmail.com',
      phone: '+91 8094938417',
      github: 'Github',
      linkedin: 'Linkedin',
    },
    experience: [
      {
        company: 'AIPlaneTech Pvt. Ltd.',
        role: 'AI Engineer Trainee',
        duration: 'Jun 2025 – Jul 2025',
        highlights: [
          'Developed AI Insight Pro (enterprise AI governance platform integrating 7+ data sources)',
          'Improved PII detection accuracy from 60% to 80% using hybrid LLM and rule-based pipeline',
          'Built async backend services and REST APIs using Python, FastAPI, and PostgreSQL',
          'Implemented 2 production AI agents and contributed to 5+ agentic workflows',
        ],
      },
    ],
    projects: [
      {
        title: 'KAIROS – Persistent Engineering Memory Layer for AI-Native Teams',
        technologies: ['Python', 'FastAPI', 'React', 'TypeScript', 'LiteLLM'],
        description: 'Multi-channel persistent memory & routing layer',
        highlights: [
          '3-tier LiteLLM routing architecture selecting local/cloud models',
          '3 interaction channels: Telegram, web, experimental voice',
          'Context integration from PRs, incidents, Jira, Slack, codebases',
        ],
      },
      {
        title: 'Scratchers – AI Systems From First Principles',
        technologies: ['Python', 'NumPy', 'PyTorch'],
        description: 'First-principles implementation of AI systems',
        highlights: [
          'Feed-forward neural net (NumPy) achieving 94% MNIST accuracy',
          'Decoder-only Transformer with multi-head self-attention on Tiny Shakespeare',
          'Modular RAG components without end-to-end frameworks',
        ],
      },
      {
        title: 'Issuenix – Digital Credential Platform',
        technologies: ['FastAPI', 'PostgreSQL', 'React'],
        description: 'Tamper-resistant digital certificate platform',
        highlights: [
          'Bulk certificate generation reducing processing time by 99%',
          'Public certificate verification with sub-second response times',
        ],
      },
    ],
    skills: {
      languages: ['Python', 'C++', 'SQL', 'JavaScript', 'TypeScript'],
      ai_ml: ['Large Language Models', 'AI Agents', 'Retrieval-Augmented Generation', 'Transformers', 'Deep Learning', 'PyTorch'],
      frameworks_libraries: ['FastAPI', 'PyTorch', 'NumPy', 'LiteLLM', 'React', 'asyncio'],
      backend_databases: ['REST APIs', 'Asynchronous Programming', 'PostgreSQL', 'SQLite', 'System Design'],
      tools_infrastructure: ['Docker', 'Docker Compose', 'GCP', 'Linux', 'Git', 'GitHub', 'Ollama'],
    },
    achievements: [
      'Ranked 29th nationwide in IIT Bombay National Entrepreneurship Challenge 2025',
      'Advanced to Round 2 of Polaris Fellowship',
      'Published 6+ technical AI/ML articles with 3,000+ views',
      'Solved 400+ DSA problems across LeetCode',
    ],
    education: {
      degree: 'Bachelor of Engineering in Computer Science and Engineering',
      institution: 'MBM University, Jodhpur',
      year: '2023 – 2027',
    },
  };
}
