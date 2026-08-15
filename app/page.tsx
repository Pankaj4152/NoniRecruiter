'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, FileText, Loader2 } from 'lucide-react';

export default function SetupPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [form, setForm] = useState({
    name: 'Pankaj Kumar Goyal',
    role: 'AI Engineering Intern',
    company: 'Nonilion',
    duration: '10',
    jobDescription: 'Build and integrate AI agents for persistent virtual workspaces. Work with real-time systems, agent orchestration, TypeScript, Node.js, and LLM APIs.',
    customInstructions: 'Focus on architecture decisions, implementation depth, trade-offs, failure handling, and measurable outcomes.',
  });

  const update = (field: keyof typeof form, value: string) => setForm((current) => ({ ...current, [field]: value }));

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      const body = new FormData();
      Object.entries(form).forEach(([key, value]) => body.append(key, value));
      if (file) body.append('resumeFile', file);
      const response = await fetch('/api/agent/setup', { method: 'POST', body });
      const data = await response.json();
      if (!response.ok || !data.sessionId) throw new Error(data.error || 'Could not create the interview.');
      router.push(`/interview/${data.sessionId}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not create the interview.');
      setIsLoading(false);
    }
  }

  const fieldClass = 'w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-100 outline-none transition focus:border-cyan-500 placeholder:text-slate-600';

  return (
    <main className="w-full max-w-3xl mx-auto px-5 py-12 sm:py-16">
      <div className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-400">New interview</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-white">Configure the interview</h1>
        <p className="mt-2 text-sm text-slate-400">Provide the hiring context. The interviewer will adapt its questions to the candidate and role.</p>
      </div>

      <form onSubmit={handleSubmit} className="rounded-xl border border-slate-800 bg-slate-900/70 p-5 sm:p-7 space-y-5">
        <div className="grid sm:grid-cols-2 gap-4">
          <label className="text-xs font-medium text-slate-300">
            Candidate name
            <input required value={form.name} onChange={(e) => update('name', e.target.value)} className={`${fieldClass} mt-2`} />
          </label>
          <label className="text-xs font-medium text-slate-300">
            Job title
            <input required value={form.role} onChange={(e) => update('role', e.target.value)} className={`${fieldClass} mt-2`} />
          </label>
          <label className="text-xs font-medium text-slate-300">
            Company
            <input required value={form.company} onChange={(e) => update('company', e.target.value)} className={`${fieldClass} mt-2`} />
          </label>
          <label className="text-xs font-medium text-slate-300">
            Duration
            <select value={form.duration} onChange={(e) => update('duration', e.target.value)} className={`${fieldClass} mt-2`}>
              <option value="5">5 minutes</option>
              <option value="10">10 minutes</option>
              <option value="15">15 minutes</option>
            </select>
          </label>
        </div>

        <label className="block text-xs font-medium text-slate-300">
          Job description
          <textarea required rows={5} value={form.jobDescription} onChange={(e) => update('jobDescription', e.target.value)} className={`${fieldClass} mt-2 resize-y`} />
        </label>

        <label className="block text-xs font-medium text-slate-300">
          Interview instructions <span className="text-slate-600">(optional)</span>
          <textarea rows={3} value={form.customInstructions} onChange={(e) => update('customInstructions', e.target.value)} className={`${fieldClass} mt-2 resize-y`} />
        </label>

        <label className="block rounded-lg border border-dashed border-slate-700 bg-slate-950/60 p-4 cursor-pointer hover:border-slate-600">
          <input type="file" accept=".pdf,.txt,.md" className="sr-only" onChange={(e) => setFile(e.target.files?.[0] || null)} />
          <span className="flex items-center gap-3">
            <FileText className="h-5 w-5 text-slate-500" />
            <span>
              <span className="block text-sm text-slate-200">{file ? file.name : 'Attach candidate resume'}</span>
              <span className="block text-xs text-slate-500 mt-0.5">PDF, TXT or Markdown · optional</span>
            </span>
          </span>
        </label>

        {error && <p role="alert" className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-300">{error}</p>}

        <button disabled={isLoading} className="w-full rounded-lg bg-cyan-400 px-4 py-3 text-sm font-bold text-slate-950 transition hover:bg-cyan-300 disabled:opacity-60 flex items-center justify-center gap-2">
          {isLoading ? <><Loader2 className="h-4 w-4 animate-spin" /> Preparing interview…</> : <>Start interview <ArrowRight className="h-4 w-4" /></>}
        </button>
      </form>
    </main>
  );
}
