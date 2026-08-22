'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { BriefcaseBusiness, Building2, CheckCircle2, Clock3, FileCheck2, Loader2, Mic, Play, ShieldCheck, Sparkles } from 'lucide-react';

interface CandidateInvite { candidate: { name: string }; job: { companyName: string; roleTitle: string }; targetDurationMinutes: number; status: string; resumeReceived: boolean; topics: string[]; isDemo: boolean; demoLabel?: string }

export default function CandidateInvitePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [invite, setInvite] = useState<CandidateInvite | null>(null);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { fetch(`/api/agent/session?sessionId=${encodeURIComponent(id)}`).then(async (response) => { const data = await response.json(); if (!response.ok) throw new Error(data.error); setInvite(data); }).catch((caught) => setError(caught instanceof Error ? caught.message : 'Invitation could not be loaded.')); }, [id]);

  async function startInterview() {
    setStarting(true); setError('');
    try { const response = await fetch('/api/agent/start', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId: id }) }); const data = await response.json(); if (!response.ok) throw new Error(data.error); router.push(`/interview/${id}`); }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Could not start interview.'); setStarting(false); }
  }

  if (!invite) return <main className="office-shell grid min-h-[calc(100vh-4rem)] place-items-center px-5"><div className="hud-panel p-7 text-center">{error ? <p className="text-sm text-red-300">{error}</p> : <><Loader2 className="mx-auto h-6 w-6 animate-spin text-[#f36b21]" /><p className="mt-3 system-code">Opening invitation</p></>}</div></main>;
  if (invite.status === 'COMPLETED') return <main className="office-shell grid min-h-[calc(100vh-4rem)] place-items-center px-5"><div className="hud-panel max-w-md p-8 text-center"><CheckCircle2 className="mx-auto h-8 w-8 text-emerald-300" /><h1 className="mt-4 text-2xl font-black uppercase">Interview completed</h1><p className="mt-3 text-sm text-[#aaa69e]">Your responses have already been submitted.</p></div></main>;

  return <main className="office-shell min-h-[calc(100vh-4rem)] overflow-y-auto"><div className="game-grid pointer-events-none absolute inset-0" /><div className="relative mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl items-center gap-8 px-5 py-10 lg:grid-cols-[1fr_460px]">
    <section><span className="terminal-label"><Sparkles className="mr-2 h-3.5 w-3.5" /> {invite.isDemo ? `${invite.demoLabel || 'Sample'} demo interview` : 'Candidate invitation'}</span><h1 className="mt-6 text-5xl font-black uppercase leading-[.94] tracking-[-.05em] text-white sm:text-6xl">Welcome, {invite.candidate.name}.</h1><p className="mt-5 max-w-xl text-base leading-7 text-[#bcb7ae]">Your interview has been prepared. Review the format below; the timer starts only after you press Start Interview.</p><div className="mt-7 grid max-w-xl gap-3 sm:grid-cols-2"><Info icon={BriefcaseBusiness} label="Role" value={invite.job.roleTitle} /><Info icon={Building2} label="Company" value={invite.job.companyName} /><Info icon={Clock3} label="Estimated time" value={`${invite.targetDurationMinutes} minutes`} /><Info icon={FileCheck2} label="Resume" value={invite.resumeReceived ? 'Received' : 'Not received'} /></div></section>
    <section className="mission-card setup-overlay p-6 sm:p-8"><p className="system-kicker text-[#f08b53]">Before you begin</p><h2 className="mt-2 text-xl font-black uppercase">Interview format</h2><div className="mt-5 space-y-3">{invite.topics.map((topic) => <div key={topic} className="flex items-center gap-3 border border-white/10 bg-black/20 px-4 py-3 text-xs text-[#cbc7bf]"><CheckCircle2 className="h-4 w-4 text-emerald-400" />{topic}</div>)}</div><div className="mt-5 flex items-start gap-3 border border-white/10 bg-white/[.025] p-4"><Mic className="mt-0.5 h-4 w-4 shrink-0 text-[#f08b53]" /><p className="text-xs leading-5 text-[#928e86]">You can type answers or use push-to-talk voice input. Questions may be read aloud by your browser.</p></div><div className="mt-3 flex items-start gap-3 border border-white/10 bg-white/[.025] p-4"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" /><p className="text-xs leading-5 text-[#928e86]">By starting, you consent to your responses being evaluated and included in a recruiter-facing report.</p></div>{error && <p className="mt-4 text-xs text-red-300">{error}</p>}<button onClick={startInterview} disabled={starting} className="terminal-button mt-5 flex w-full items-center justify-center gap-2 px-5 py-4 disabled:opacity-60">{starting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4 fill-current" />}{invite.status === 'IN_PROGRESS' ? 'Continue interview' : 'Start interview'}</button></section>
  </div></main>;
}

function Info({ icon: Icon, label, value }: { icon: typeof BriefcaseBusiness; label: string; value: string }) { return <div className="hud-panel flex items-center gap-3 p-4"><Icon className="h-4 w-4 text-[#f08b53]" /><div><p className="system-code">{label}</p><p className="mt-1 text-sm font-bold text-[#e7e3dc]">{value}</p></div></div>; }
