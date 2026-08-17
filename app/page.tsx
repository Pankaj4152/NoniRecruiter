'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, BriefcaseBusiness, Building2, Clock3, FileText, FileUp, Loader2, SlidersHorizontal, UserRound, X } from 'lucide-react';

export default function SetupPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [preparationMessage, setPreparationMessage] = useState('Preparing interview…');
  const [error, setError] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [form, setForm] = useState({ name: '', role: '', company: '', duration: '10', jobDescription: '', customInstructions: '' });
  const update = (field: keyof typeof form, value: string) => setForm((current) => ({ ...current, [field]: value }));

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!file) { setError('Please attach the candidate resume before entering the interview room.'); return; }
    setError(''); setIsLoading(true); setPreparationMessage('Reading interview details…');
    const timers = [
      window.setTimeout(() => setPreparationMessage(file ? 'Parsing the resume…' : 'Building candidate context…'), 1200),
      window.setTimeout(() => setPreparationMessage('Generating the opening question…'), 4500),
      window.setTimeout(() => setPreparationMessage('The AI is taking a little longer…'), 10000),
    ];
    try {
      const body = new FormData(); Object.entries(form).forEach(([key, value]) => body.append(key, value)); if (file) body.append('resumeFile', file);
      const response = await fetch('/api/agent/setup', { method: 'POST', body }); const data = await response.json();
      if (!response.ok || !data.sessionId) throw new Error(data.error || 'Could not create the interview.');
      timers.forEach((timer) => window.clearTimeout(timer)); router.push(`/interview/${data.sessionId}`);
    } catch (caught) {
      timers.forEach((timer) => window.clearTimeout(timer)); setError(caught instanceof Error ? caught.message : 'Could not create the interview.'); setIsLoading(false);
    }
  }

  const input = 'terminal-input mt-1.5 px-3 py-2.5 text-sm';
  return (
    <main className="office-shell min-h-[calc(100vh-4rem)] overflow-y-auto">
      <div className="setup-backdrop mx-auto flex min-h-[calc(100vh-4rem)] max-w-[1600px] flex-col px-4 py-7 sm:px-7 sm:py-9">
        <div className="text-center">
          <p className="system-kicker text-[#cfcbc3]">NoniRecruiter · Interview room configuration</p>
          <h1 className="mt-3 text-3xl font-extrabold uppercase tracking-[-.04em] text-[#f0eee9] sm:text-5xl">Brief the hiring agent</h1>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-[#aaa7a0]">The recruiter and candidate are ready. Add the role context to begin the session.</p>
        </div>

        <section className="setup-overlay mx-auto mt-7 w-full max-w-5xl">
          <div className="flex items-center justify-between border-b border-white/15 px-5 py-3 sm:px-7">
            <span className="terminal-label">Required information</span>
            <span className="system-code">Room · 01 / Setup</span>
          </div>
          <form onSubmit={handleSubmit} className="grid gap-4 p-4 sm:p-6 lg:grid-cols-[1fr_1fr]">
            <div className="setup-section space-y-4 p-4 sm:p-5">
              <p className="system-kicker flex items-center gap-2 text-[#f08b53]"><UserRound className="h-4 w-4" /> 01 / Candidate & role</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-xs font-semibold text-[#bbb8b1]">Candidate name<div className="relative"><UserRound className="field-icon" /><input required autoComplete="name" placeholder="e.g. Pankaj Kumar" value={form.name} onChange={(e) => update('name', e.target.value)} className={`${input} pl-10`} /></div></label>
                <label className="text-xs font-semibold text-[#bbb8b1]">Job title<div className="relative"><BriefcaseBusiness className="field-icon" /><input required placeholder="e.g. Operations Associate" value={form.role} onChange={(e) => update('role', e.target.value)} className={`${input} pl-10`} /></div></label>
                <label className="text-xs font-semibold text-[#bbb8b1]">Company<div className="relative"><Building2 className="field-icon" /><input required placeholder="e.g. Nonilion" value={form.company} onChange={(e) => update('company', e.target.value)} className={`${input} pl-10`} /></div></label>
                <label className="text-xs font-semibold text-[#bbb8b1]">Interview length<div className="relative"><Clock3 className="field-icon" /><select value={form.duration} onChange={(e) => update('duration', e.target.value)} className={`${input} pl-10`}><option value="5">5 minutes</option><option value="10">10 minutes</option><option value="15">15 minutes</option></select></div></label>
              </div>
              <div>
                <span className="text-xs font-semibold text-[#bbb8b1]">Candidate resume <span className="ml-1 text-[#f08b53]">Required</span></span>
                {file ? <div className="mt-1.5 flex items-center justify-between border border-[#f36b21]/50 bg-[#f36b21]/5 px-3 py-3"><span className="truncate font-mono text-xs text-[#f4a275]">{file.name}</span><button type="button" onClick={() => setFile(null)} aria-label="Remove resume" className="ml-3 text-[#77746e] hover:text-white"><X className="h-4 w-4" /></button></div> : <label className="mt-1.5 flex cursor-pointer items-center justify-center gap-2 border border-dashed border-white/20 bg-white/[.025] px-4 py-3 text-xs text-[#85827c] transition hover:border-[#f36b21] hover:text-[#ef9a69]"><input required type="file" accept=".pdf,.txt,.md" className="sr-only" onChange={(e) => setFile(e.target.files?.[0] || null)} /><FileUp className="h-4 w-4" /> Upload required resume · PDF, TXT, or Markdown</label>}
              </div>
            </div>

            <div className="setup-section space-y-4 p-4 sm:p-5">
              <p className="system-kicker flex items-center gap-2 text-[#f08b53]"><FileText className="h-4 w-4" /> 02 / Interview context</p>
              <label className="block text-xs font-semibold text-[#bbb8b1]"><span className="flex items-center gap-2"><FileText className="h-3.5 w-3.5 text-[#77746e]" /> Job description</span><textarea required rows={5} placeholder="Paste role requirements and responsibilities…" value={form.jobDescription} onChange={(e) => update('jobDescription', e.target.value)} className={`${input} resize-y`} /></label>
              <label className="block text-xs font-semibold text-[#bbb8b1]"><span className="flex items-center gap-2"><SlidersHorizontal className="h-3.5 w-3.5 text-[#77746e]" /> Agent instructions <span className="font-normal text-[#63615d]">Optional</span></span><textarea rows={3} placeholder="Focus areas, seniority, or topics to avoid…" value={form.customInstructions} onChange={(e) => update('customInstructions', e.target.value)} className={`${input} resize-y`} /></label>
              {error && <p role="alert" className="border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">{error}</p>}
              <button disabled={isLoading} className="terminal-button flex w-full items-center justify-center gap-2 px-4 py-4 disabled:cursor-not-allowed disabled:opacity-60">{isLoading ? <><Loader2 className="h-4 w-4 animate-spin" /> {preparationMessage}</> : <>Enter interview room <ArrowRight className="h-4 w-4" /></>}</button>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}
