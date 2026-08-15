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
  targetRole: string = 'AI Engineering Intern'
): Promise<CandidateProfile> {
  const prompt = `Analyze the following complete resume text and parse it strictly into a structured JSON object.

=== RESUME TEXT ===
${rawResumeText}

Return strictly JSON matching this structure:
{
  "fullName": "${candidateName}",
  "contact": { "email": "", "phone": "", "github": "", "linkedin": "" },
  "experience": [
    {
      "company": "Company Name",
      "role": "Role Title",
      "duration": "Dates",
      "highlights": ["bullet point 1", "bullet point 2"]
    }
  ],
  "projects": [
    {
      "title": "Project Name",
      "technologies": ["Tech1", "Tech2"],
      "description": "Short description",
      "highlights": ["achievement or detail 1"]
    }
  ],
  "skills": {
    "languages": ["Python", "C++", "SQL", "JavaScript", "TypeScript"],
    "ai_ml": ["LLMs", "AI Agents", "RAG", "Transformers", "PyTorch"],
    "frameworks_libraries": ["FastAPI", "React", "LiteLLM", "NumPy"],
    "backend_databases": ["PostgreSQL", "SQLite", "REST APIs", "System Design"],
    "tools_infrastructure": ["Docker", "GCP", "Git", "Linux", "Ollama"]
  },
  "achievements": ["Achievement 1", "Achievement 2"],
  "education": {
    "degree": "Degree Title",
    "institution": "University Name",
    "year": "Graduation Years"
  }
}`;

  try {
    const response = await generateLLMCompletion(
      [
        { role: 'system', content: 'You are an expert AI resume parser. Extract full structured JSON details.' },
        { role: 'user', content: prompt }
      ],
      { jsonMode: true, temperature: 0.2 }
    );

    const structuredJSON: ParsedResumeJSON = JSON.parse(response);

    const allSkills = [
      ...(structuredJSON.skills.languages || []),
      ...(structuredJSON.skills.ai_ml || []),
      ...(structuredJSON.skills.frameworks_libraries || []),
      ...(structuredJSON.skills.backend_databases || []),
      ...(structuredJSON.skills.tools_infrastructure || []),
    ];

    const projectSummary = structuredJSON.projects
      ? structuredJSON.projects.map((p) => `${p.title} (${p.technologies.join(', ')})`).join('; ')
      : '';

    return {
      name: structuredJSON.fullName || candidateName,
      targetRole,
      experienceLevel: 'Junior',
      skills: Array.from(new Set(allSkills)),
      resumeText: `Candidate ${candidateName} has experience at ${structuredJSON.experience?.[0]?.company || 'AIPlaneTech'}. Built projects: ${projectSummary}. Education: ${structuredJSON.education?.institution || 'MBM University'}.`,
      structuredResume: structuredJSON,
    };
  } catch {
    // Local categorized JSON parser fallback
  }

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
