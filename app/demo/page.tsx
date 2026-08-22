'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Braces, BrainCircuit, Database, Loader2, Sparkles } from 'lucide-react';

const demos = [
  { id: 'junior-full-stack', level: 'Junior', role: 'Full-Stack Developer', candidate: 'Aarav Mehta', description: 'React, Node.js APIs, SQL fundamentals, debugging, and learning ability.', skills: ['React', 'Node.js', 'PostgreSQL', 'Debugging'], icon: Braces, color: 'text-cyan-300 border-cyan-400/30 bg-cyan-400/[.06]' },
  { id: 'backend-systems', level: 'Mid-level', role: 'Backend Systems Engineer', candidate: 'Nisha Rao', description: 'Service design, PostgreSQL performance, queues, failures, and operational trade-offs.', skills: ['FastAPI', 'PostgreSQL', 'Queues', 'Reliability'], icon: Database, color: 'text-emerald-300 border-emerald-400/30 bg-emerald-400/[.06]' },
  { id: 'senior-ai-engineer', level: 'Senior', role: 'AI Engineer', candidate: 'Elena Park', description: 'LLM evaluation, retrieval, model routing, reliability, cost, and technical leadership.', skills: ['Evaluation', 'RAG', 'LLM systems', 'Leadership'], icon: BrainCircuit, color: 'text-violet-300 border-violet-400/30 bg-violet-400/[.06]' },
];

export default function DemoSelectionPage() {
  const router = useRouter();
  const [launching, setLaunching] = useState<string | null>(null);
  const [error, setError] = useState('');

  async function launchDemo(scenarioId: string) {
    setLaunching(scenarioId); setError('');
    try { const response = await fetch('/api/agent/demo', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ scenarioId }) }); const data = await response.json(); if (!response.ok || !data.inviteUrl) throw new Error(data.error || 'Could not prepare demo.'); router.push(data.inviteUrl); }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Could not prepare demo.'); setLaunching(null); }
  }

  return <main className="office-shell min-h-[calc(100vh-4rem)] overflow-y-auto"><div className="game-grid pointer-events-none absolute inset-0" /><div className="relative mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-14">
    <Link href="/" className="inline-flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-wider text-[#8f8a82] hover:text-white"><ArrowLeft className="h-4 w-4" /> Back home</Link>
    <div className="mt-8 text-center"><span className="terminal-label"><Sparkles className="mr-2 h-3.5 w-3.5" /> Instant demo mode</span><h1 className="mt-5 text-4xl font-black uppercase tracking-[-.045em] text-white sm:text-6xl">Choose your interview quest</h1><p className="mx-auto mt-4 max-w-2xl text-sm leading-6 text-[#aaa69e]">Each five-minute scenario uses a fictional resume, role-specific JD, and distinct interviewer guidance. No setup required.</p></div>
    <div className="mt-10 grid gap-5 lg:grid-cols-3">{demos.map((demo) => { const Icon = demo.icon; const active = launching === demo.id; return <article key={demo.id} className="mission-card setup-overlay flex flex-col p-6"><div className="flex items-start justify-between"><span className={`grid h-12 w-12 place-items-center border ${demo.color}`}><Icon className="h-5 w-5" /></span><span className="system-code border border-white/10 bg-black/30 px-2 py-1">{demo.level}</span></div><p className="mt-6 system-kicker text-[#f08b53]">{demo.candidate} · Fictional</p><h2 className="mt-2 text-xl font-black uppercase text-white">{demo.role}</h2><p className="mt-3 min-h-16 text-xs leading-6 text-[#99958d]">{demo.description}</p><div className="mt-5 flex flex-wrap gap-2">{demo.skills.map((skill) => <span key={skill} className="quest-chip px-2 py-1 font-mono text-[9px] uppercase tracking-wider">{skill}</span>)}</div><button onClick={() => void launchDemo(demo.id)} disabled={Boolean(launching)} className="terminal-button mt-7 flex w-full items-center justify-center gap-2 px-4 py-4 disabled:opacity-50">{active ? <><Loader2 className="h-4 w-4 animate-spin" /> Preparing demo</> : <>Start this demo <ArrowRight className="h-4 w-4" /></>}</button></article>; })}</div>
    {error && <p role="alert" className="mx-auto mt-5 max-w-xl border border-red-500/30 bg-red-500/10 p-3 text-center text-xs text-red-300">{error}</p>}
    <p className="mt-7 text-center font-mono text-[9px] uppercase tracking-wider text-[#65615b]">Demo profiles and companies are fictional · Reports are for product demonstration only</p>
  </div></main>;
}
