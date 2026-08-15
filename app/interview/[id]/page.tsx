'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowUp, Loader2, Square } from 'lucide-react';
import PhaseIndicator from '@/components/PhaseIndicator';
import { InterviewPhase, InterviewTurn } from '@/lib/interview/types';

interface SessionView {
  candidate: { name: string; targetRole: string };
  job: { companyName: string; roleTitle: string };
  currentPhase: InterviewPhase;
  elapsedSeconds: number;
  targetDurationMinutes?: number;
  turns: InterviewTurn[];
  isCompleted: boolean;
}

export default function InterviewPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [session, setSession] = useState<SessionView | null>(null);
  const [turns, setTurns] = useState<InterviewTurn[]>([]);
  const [phase, setPhase] = useState<InterviewPhase>('WARMUP');
  const [answer, setAnswer] = useState('');
  const [elapsed, setElapsed] = useState(0);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`/api/agent/session?sessionId=${encodeURIComponent(id)}`)
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Interview session not found.');
        setSession(data);
        setTurns(data.turns || []);
        setPhase(data.currentPhase || 'WARMUP');
        setElapsed(data.elapsedSeconds || 0);
      })
      .catch((caught) => setError(caught instanceof Error ? caught.message : 'Could not load interview.'))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!session?.isCompleted) {
      const timer = window.setInterval(() => setElapsed((value) => value + 1), 1000);
      return () => window.clearInterval(timer);
    }
  }, [session?.isCompleted]);

  useEffect(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), [turns, processing]);

  async function finishInterview() {
    setProcessing(true);
    setError('');
    try {
      const response = await fetch('/api/agent/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: id }),
      });
      if (!response.ok) throw new Error('Could not generate the report.');
      router.push(`/report/${id}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not finish interview.');
      setProcessing(false);
    }
  }

  async function submitAnswer(event: FormEvent) {
    event.preventDefault();
    const text = answer.trim();
    if (!text || processing) return;
    setAnswer('');
    setError('');
    setProcessing(true);

    const localCandidateTurn: InterviewTurn = {
      turnId: turns.length + 1,
      speaker: 'candidate',
      text,
      timestamp: new Date().toISOString(),
      phase,
    };
    setTurns((current) => [...current, localCandidateTurn]);

    try {
      const response = await fetch('/api/agent/turn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: id, answer: text }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'The interviewer could not respond.');
      const interviewerTurn: InterviewTurn = {
        turnId: localCandidateTurn.turnId + 1,
        speaker: 'interviewer',
        text: data.turnResult.interviewerResponse,
        timestamp: new Date().toISOString(),
        phase: data.turnResult.nextPhase,
      };
      setTurns((current) => [...current, interviewerTurn]);
      setPhase(data.turnResult.nextPhase);
      setProcessing(false);
      if (data.isCompleted || data.turnResult.shouldEndInterview) {
        window.setTimeout(() => void finishInterview(), 700);
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'The interviewer could not respond.');
      setProcessing(false);
    }
  }

  const time = `${Math.floor(elapsed / 60).toString().padStart(2, '0')}:${(elapsed % 60).toString().padStart(2, '0')}`;

  if (loading) return <div className="flex-1 grid place-items-center text-sm text-slate-500"><Loader2 className="h-5 w-5 animate-spin" /></div>;
  if (!session) return <div className="flex-1 grid place-items-center text-sm text-red-300">{error || 'Interview not found.'}</div>;

  return (
    <main className="w-full max-w-4xl mx-auto px-5 py-6 flex-1 flex flex-col min-h-0">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold text-white">{session.candidate.name}</h1>
          <p className="text-xs text-slate-500 mt-1">{session.job.roleTitle} · {session.job.companyName}</p>
        </div>
        <div className="flex items-center gap-4">
          <span className="font-mono text-xs text-slate-400">{time}</span>
          <button onClick={() => void finishInterview()} disabled={processing} className="flex items-center gap-1.5 rounded-md border border-slate-700 px-3 py-2 text-xs text-slate-300 hover:bg-slate-800 disabled:opacity-50">
            <Square className="h-3 w-3" /> Finish
          </button>
        </div>
      </div>

      <PhaseIndicator currentPhase={phase} />

      <section className="mt-4 flex-1 min-h-[420px] rounded-xl border border-slate-800 bg-[#080c13] flex flex-col overflow-hidden">
        <div className="border-b border-slate-800 px-4 py-3 font-mono text-[11px] text-slate-500">
          interview/{id} <span className="text-emerald-400 ml-2">● active</span>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 font-mono">
          {turns.map((turn) => (
            <div key={`${turn.turnId}-${turn.speaker}`} className="grid grid-cols-[88px_1fr] gap-3 text-sm leading-6">
              <span className={`text-xs pt-0.5 ${turn.speaker === 'interviewer' ? 'text-cyan-400' : 'text-violet-400'}`}>
                {turn.speaker === 'interviewer' ? 'interviewer' : 'candidate'}
              </span>
              <p className="text-slate-300 whitespace-pre-wrap">{turn.text}</p>
            </div>
          ))}
          {processing && (
            <div className="grid grid-cols-[88px_1fr] gap-3 text-sm">
              <span className="text-xs text-cyan-400">interviewer</span>
              <span className="text-slate-500 animate-pulse">thinking…</span>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <form onSubmit={submitAnswer} className="border-t border-slate-800 p-3 flex items-end gap-2 bg-slate-950/70">
          <span className="font-mono text-cyan-400 px-1 py-2">›</span>
          <textarea
            autoFocus
            rows={2}
            value={answer}
            disabled={processing}
            onChange={(event) => setAnswer(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                event.currentTarget.form?.requestSubmit();
              }
            }}
            placeholder="Type your answer…  Enter to send · Shift+Enter for new line"
            className="flex-1 resize-none bg-transparent px-1 py-2 font-mono text-sm text-slate-200 outline-none placeholder:text-slate-600 disabled:opacity-60"
          />
          <button disabled={processing || !answer.trim()} aria-label="Send answer" className="rounded-md bg-cyan-400 p-2.5 text-slate-950 hover:bg-cyan-300 disabled:opacity-30">
            <ArrowUp className="h-4 w-4" />
          </button>
        </form>
      </section>
      {error && <p role="alert" className="mt-3 text-xs text-red-300">{error}</p>}
    </main>
  );
}
