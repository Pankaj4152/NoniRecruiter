import assert from 'node:assert/strict';
import { groundParsedResume } from '../lib/interview/parser';
import { ParsedResumeJSON } from '../lib/interview/types';

const source = `Riya Sharma
Retail Operations Associate at Northwind Stores.
Managed inventory reconciliation and trained six new team members.
Skills: Excel, customer service, inventory management.
Bachelor of Commerce, Delhi University, 2024.`;

const contaminated: ParsedResumeJSON = {
  fullName: 'Wrong Name',
  contact: {},
  experience: [{ company: 'Northwind Stores', role: 'Retail Operations Associate', duration: '', highlights: ['Managed inventory reconciliation', 'Built LLM agents'] }],
  projects: [{ title: 'AI Assistant', technologies: ['Python', 'LLM'], description: 'Built an AI agent', highlights: [] }],
  skills: {
    languages: ['Python'],
    ai_ml: ['LLM', 'AI Agents'],
    frameworks_libraries: [],
    backend_databases: [],
    tools_infrastructure: ['Excel'],
  },
  achievements: [],
  education: { degree: 'Bachelor of Commerce', institution: 'Delhi University', year: '2024' },
};

const grounded = groundParsedResume(contaminated, source, 'Riya Sharma');
assert.equal(grounded.fullName, 'Riya Sharma');
assert.deepEqual(grounded.skills.ai_ml, []);
assert.deepEqual(grounded.skills.languages, []);
assert.deepEqual(grounded.skills.tools_infrastructure, ['Excel']);
assert.deepEqual(grounded.projects, []);
assert.equal(grounded.experience[0]?.highlights.includes('Built LLM agents'), false);
assert.equal(grounded.education.institution, 'Delhi University');

console.log('Resume and interview source-grounding tests passed.');
