'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, FileUp, Loader2, X } from 'lucide-react';

export default function SetupPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [form, setForm] = useState({ name: '', role: '', company: '', duration: '10', jobDescription: '', customInstructions: '' });

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

  const fieldClass = 'mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-500 focus:ring-2 focus:ring-slate-100';

  return (
    <main className="mx-auto w-full max-w-2xl px-5 py-10 sm:py-14">
      <div className="mb-7">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-950">Set up an interview</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">Add the candidate and role context. The interview will adapt automatically.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-medium text-slate-700">Candidate name
            <input required autoComplete="name" placeholder="e.g. Pankaj Kumar" value={form.name} onChange={(e) => update('name', e.target.value)} className={fieldClass} />
          </label>
          <label className="text-sm font-medium text-slate-700">Job title
            <input required placeholder="e.g. AI Engineering Intern" value={form.role} onChange={(e) => update('role', e.target.value)} className={fieldClass} />
          </label>
          <label className="text-sm font-medium text-slate-700">Company
            <input required placeholder="e.g. Nonilion" value={form.company} onChange={(e) => update('company', e.target.value)} className={fieldClass} />
          </label>
          <label className="text-sm font-medium text-slate-700">Interview length
            <select value={form.duration} onChange={(e) => update('duration', e.target.value)} className={fieldClass}>
              <option value="5">5 minutes</option><option value="10">10 minutes</option><option value="15">15 minutes</option>
            </select>
          </label>
        </div>

        <label className="block text-sm font-medium text-slate-700">Job description
          <textarea required rows={4} placeholder="Paste the role requirements and responsibilities…" value={form.jobDescription} onChange={(e) => update('jobDescription', e.target.value)} className={`${fieldClass} resize-y`} />
        </label>
        <label className="block text-sm font-medium text-slate-700">Interview instructions <span className="font-normal text-slate-400">(optional)</span>
          <textarea rows={2} placeholder="Topics to prioritize, experience level, or anything to avoid…" value={form.customInstructions} onChange={(e) => update('customInstructions', e.target.value)} className={`${fieldClass} resize-y`} />
        </label>

        <div>
          <span className="text-sm font-medium text-slate-700">Resume <span className="font-normal text-slate-400">(optional)</span></span>
          {file ? (
            <div className="mt-1.5 flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
              <span className="truncate text-sm text-slate-700">{file.name}</span>
              <button type="button" onClick={() => setFile(null)} aria-label="Remove resume" className="ml-3 rounded p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700"><X className="h-4 w-4" /></button>
            </div>
          ) : (
            <label className="mt-1.5 flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 px-4 py-3 text-sm text-slate-500 transition hover:border-slate-400 hover:bg-slate-50">
              <input type="file" accept=".pdf,.txt,.md" className="sr-only" onChange={(e) => setFile(e.target.files?.[0] || null)} />
              <FileUp className="h-4 w-4" /> Upload PDF, TXT, or Markdown
            </label>
          )}
        </div>

        {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <button disabled={isLoading} className="flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60">
          {isLoading ? <><Loader2 className="h-4 w-4 animate-spin" /> Preparing interview…</> : <>Start interview <ArrowRight className="h-4 w-4" /></>}
        </button>
      </form>
      <p className="mt-4 text-center text-xs text-slate-400">Text-only demo · A report is generated when the interview ends</p>
    </main>
  );
}
