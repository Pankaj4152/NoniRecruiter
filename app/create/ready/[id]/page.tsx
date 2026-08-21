'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Check, Clipboard, ExternalLink, Link2, Loader2, ShieldCheck } from 'lucide-react';

interface InviteSummary { candidate: { name: string }; job: { companyName: string; roleTitle: string }; targetDurationMinutes: number; status: string }

export default function InvitationReadyPage() {
  const { id } = useParams<{ id: string }>();
  const [summary, setSummary] = useState<InviteSummary | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const invitePath = `/invite/${id}`;

  useEffect(() => { fetch(`/api/agent/session?sessionId=${encodeURIComponent(id)}`).then(async (response) => { const data = await response.json(); if (!response.ok) throw new Error(data.error); setSummary(data); }).catch((caught) => setError(caught instanceof Error ? caught.message : 'Could not load invitation.')); }, [id]);

  async function copyInvite() {
    await navigator.clipboard.writeText(`${window.location.origin}${invitePath}`);
    setCopied(true); window.setTimeout(() => setCopied(false), 1800);
  }

  return <main className="office-shell grid min-h-[calc(100vh-4rem)] place-items-center px-5 py-10"><div className="game-grid pointer-events-none absolute inset-0" />
    {!summary ? <div className="hud-panel p-7 text-center">{error ? <p className="text-sm text-red-300">{error}</p> : <><Loader2 className="mx-auto h-6 w-6 animate-spin text-[#f36b21]" /><p className="mt-3 system-code">Preparing invitation</p></>}</div> :
    <section className="mission-card setup-overlay relative w-full max-w-2xl p-6 sm:p-9">
      <div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center bg-emerald-400/10 text-emerald-300"><Check className="h-5 w-5" /></span><div><p className="system-kicker text-emerald-300">Interview ready</p><h1 className="mt-1 text-2xl font-black uppercase text-white">Candidate invitation created</h1></div></div>
      <div className="mt-7 grid gap-3 sm:grid-cols-2"><Info label="Candidate" value={summary.candidate.name} /><Info label="Role" value={summary.job.roleTitle} /><Info label="Company" value={summary.job.companyName} /><Info label="Duration" value={`${summary.targetDurationMinutes} minutes`} /></div>
      <div className="mt-6 border border-[#f36b21]/30 bg-black/35 p-4"><div className="flex items-center gap-2"><Link2 className="h-4 w-4 text-[#f08b53]" /><span className="system-kicker">Candidate link</span></div><p className="mt-3 truncate font-mono text-xs text-[#aaa69e]">{typeof window !== 'undefined' ? window.location.origin : ''}{invitePath}</p><div className="mt-4 grid gap-2 sm:grid-cols-2"><button onClick={copyInvite} className="terminal-button flex items-center justify-center gap-2 px-4 py-3">{copied ? <Check className="h-4 w-4" /> : <Clipboard className="h-4 w-4" />}{copied ? 'Copied' : 'Copy invite link'}</button><Link href={invitePath} target="_blank" className="flex items-center justify-center gap-2 border border-white/15 px-4 py-3 font-mono text-[10px] font-bold uppercase tracking-wider text-[#cbc7bf] hover:border-[#f36b21]"><ExternalLink className="h-4 w-4" /> Candidate preview</Link></div></div>
      <div className="mt-3 text-center"><Link href={`/report/${id}`} className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#8d8981] hover:text-[#f08b53]">Open recruiter report →</Link></div>
      <p className="mt-5 flex items-start gap-2 text-[10px] leading-5 text-[#77736c]"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" /> Prototype invitations use temporary in-memory storage and may expire after a server restart. Durable invitations and recruiter authentication arrive in the database phase.</p>
    </section>}
  </main>;
}

function Info({ label, value }: { label: string; value: string }) { return <div className="border border-white/10 bg-white/[.025] p-4"><p className="system-code">{label}</p><p className="mt-1 text-sm font-bold text-[#e5e1d9]">{value}</p></div>; }
