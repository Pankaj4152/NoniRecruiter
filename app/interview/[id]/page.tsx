'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowUp, Loader2, Mic, Square, Volume2 } from 'lucide-react';
import { InterviewPhase, InterviewTurn } from '@/lib/interview/types';

interface SessionView {
  candidate: { name: string; targetRole: string };
  job: { companyName: string; roleTitle: string };
  currentPhase: InterviewPhase;
  turns: InterviewTurn[];
  isCompleted: boolean;
}

interface BrowserSpeechRecognition {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: { results: ArrayLike<{ 0: { transcript: string }; isFinal: boolean }> }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
}

type SpeechRecognitionConstructor = new () => BrowserSpeechRecognition;

export default function InterviewPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [session, setSession] = useState<SessionView | null>(null);
  const [turns, setTurns] = useState<InterviewTurn[]>([]);
  const [phase, setPhase] = useState<InterviewPhase>('WARMUP');
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [listening, setListening] = useState(false);
  const [speakingTurnId, setSpeakingTurnId] = useState<number | null>(null);
  const [error, setError] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const dictationPrefixRef = useRef('');

  useEffect(() => {
    fetch(`/api/agent/session?sessionId=${encodeURIComponent(id)}`)
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Interview session not found.');
        setSession(data);
        setTurns(data.turns || []);
        setPhase(data.currentPhase || 'WARMUP');
      })
      .catch((caught) => setError(caught instanceof Error ? caught.message : 'Could not load interview.'))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [turns, processing]);

  useEffect(() => {
    return () => {
      recognitionRef.current?.abort();
      window.speechSynthesis?.cancel();
    };
  }, []);

  function speakMessage(turn: InterviewTurn) {
    if (!('speechSynthesis' in window)) {
      setError('Text-to-speech is not supported in this browser. Try Chrome or Edge.');
      return;
    }
    window.speechSynthesis.cancel();
    if (speakingTurnId === turn.turnId) {
      setSpeakingTurnId(null);
      return;
    }
    const utterance = new SpeechSynthesisUtterance(turn.text);
    utterance.rate = 1;
    utterance.onend = () => setSpeakingTurnId(null);
    utterance.onerror = () => {
      setSpeakingTurnId(null);
      setError('The browser could not play this message.');
    };
    setError('');
    setSpeakingTurnId(turn.turnId);
    window.speechSynthesis.speak(utterance);
  }

  function toggleMicrophone() {
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }

    const speechWindow = window as typeof window & {
      SpeechRecognition?: SpeechRecognitionConstructor;
      webkitSpeechRecognition?: SpeechRecognitionConstructor;
    };
    const Recognition = speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;
    if (!Recognition) {
      setError('Voice typing is not supported in this browser. Try Chrome or Edge.');
      return;
    }

    window.speechSynthesis?.cancel();
    setSpeakingTurnId(null);
    const recognition = new Recognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    dictationPrefixRef.current = answer.trim();
    recognition.onresult = (event) => {
      let transcript = '';
      for (let index = 0; index < event.results.length; index += 1) transcript += event.results[index][0].transcript;
      const prefix = dictationPrefixRef.current;
      setAnswer(`${prefix}${prefix && transcript.trim() ? ' ' : ''}${transcript.trimStart()}`);
    };
    recognition.onerror = (event) => {
      setListening(false);
      if (event.error !== 'aborted') setError(event.error === 'not-allowed' ? 'Microphone permission was denied. Allow microphone access and try again.' : `Microphone error: ${event.error}`);
    };
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;
    setError('');
    setListening(true);
    try {
      recognition.start();
    } catch {
      setListening(false);
      setError('The microphone could not be started. Please try again.');
    }
  }

  async function finishInterview() {
    setProcessing(true);
    setError('');
    try {
      const response = await fetch('/api/agent/report', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId: id }) });
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
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
    }
    setAnswer(''); setError(''); setProcessing(true);

    const localCandidateTurn: InterviewTurn = { turnId: turns.length + 1, speaker: 'candidate', text, timestamp: new Date().toISOString(), phase };
    setTurns((current) => [...current, localCandidateTurn]);

    try {
      const response = await fetch('/api/agent/turn', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId: id, answer: text }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'The interviewer could not respond.');
      setTurns((current) => [...current, { turnId: localCandidateTurn.turnId + 1, speaker: 'interviewer', text: data.turnResult.interviewerResponse, timestamp: new Date().toISOString(), phase: data.turnResult.nextPhase }]);
      setPhase(data.turnResult.nextPhase);
      setProcessing(false);
      if (data.isCompleted || data.turnResult.shouldEndInterview) window.setTimeout(() => void finishInterview(), 700);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'The interviewer could not respond.');
      setProcessing(false);
    }
  }

  if (loading) return <main className="office-shell grid min-h-[calc(100vh-4rem)] place-items-center"><div className="text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-orange-500" /><p className="mt-3 font-mono text-xs uppercase tracking-wider text-slate-500">Opening interview room</p></div></main>;
  if (!session) return <main className="office-shell grid min-h-[calc(100vh-4rem)] place-items-center px-5 text-center text-sm text-red-300">{error || 'Interview not found.'}</main>;

  return (
    <main className="office-shell h-[calc(100vh-4rem)] min-h-[620px]">
      <span className="office-window office-window--one" aria-hidden="true" />
      <span className="office-window office-window--two" aria-hidden="true" />
      <div className="mx-auto grid h-full max-w-7xl gap-5 px-4 py-5 lg:grid-cols-[260px_1fr] lg:px-7 lg:py-7">
        <aside className="terminal-panel hidden min-h-0 flex-col overflow-hidden lg:flex">
          <div className="border-b border-white/10 px-4 py-4"><p className="system-kicker">Interview agent</p><p className="system-code mt-1">NON · HR · 001</p></div>
          <div className="flex flex-1 flex-col px-5 py-7">
            <div className="grid h-20 w-20 place-items-center border border-[#f36b21] bg-[#f36b21] text-3xl font-black text-black">N</div>
            <h2 className="mt-5 text-xl font-bold tracking-tight text-[#f0eee9]">Noni Recruiter</h2>
            <p className="mt-1 text-xs uppercase tracking-[.12em] text-[#f08b53]">Autonomous hiring teammate</p>
            <p className="mt-5 text-xs leading-5 text-[#918f89]">Adapts question depth to the candidate, role, evidence quality, and remaining interview time.</p>
            <div className="mt-auto space-y-3 border-t border-white/10 pt-5">
              {[['Status', processing ? 'Thinking' : 'Listening'], ['Mode', 'Adaptive'], ['Output', 'Evidence report']].map(([label, value]) => <div key={label} className="flex items-center justify-between"><span className="system-code">{label}</span><span className="text-[11px] text-[#c6c2bb]">{value}</span></div>)}
            </div>
          </div>
        </aside>

        <section className="terminal-panel flex min-h-0 flex-col overflow-hidden">
          <div className="flex items-center justify-between gap-4 border-b border-white/10 bg-black/30 px-4 py-3 sm:px-5">
            <div className="min-w-0">
              <div className="flex items-center gap-2"><span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400 shadow-[0_0_10px_#4ade80]" /><h1 className="truncate font-mono text-xs font-black uppercase tracking-[.1em] text-white">Interview / {session.candidate.name}</h1></div>
              <p className="mt-1 truncate text-[10px] uppercase tracking-wider text-slate-500">{session.job.roleTitle} · {session.job.companyName}</p>
            </div>
            <button onClick={() => void finishInterview()} disabled={processing} className="shrink-0 border border-slate-600 bg-[#15191f] px-3 py-2 font-mono text-[10px] font-bold uppercase tracking-wider text-slate-300 transition hover:border-orange-500 hover:text-orange-300 disabled:opacity-50">End session</button>
          </div>

          <div className="flex-1 space-y-5 overflow-y-auto bg-[radial-gradient(circle_at_50%_0%,rgba(255,107,24,.05),transparent_30rem)] p-4 sm:p-6">
          {turns.map((turn) => {
            const candidate = turn.speaker === 'candidate';
            return (
              <div key={`${turn.turnId}-${turn.speaker}`} className={`flex ${candidate ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[92%] border px-4 py-3 sm:max-w-[78%] ${candidate ? 'border-orange-500/35 bg-orange-500/10 text-orange-50 shadow-[4px_4px_0_rgba(0,0,0,.3)]' : 'border-white/10 bg-[#171b21] text-slate-200 shadow-[4px_4px_0_#050607]'}`}>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <p className={`font-mono text-[9px] font-black uppercase tracking-[.14em] ${candidate ? 'text-orange-400' : 'text-slate-500'}`}>{candidate ? 'Candidate' : 'Noni · Interviewer'}</p>
                    {!candidate && <button type="button" onClick={() => speakMessage(turn)} aria-label={speakingTurnId === turn.turnId ? 'Stop speaking' : 'Read message aloud'} className="border border-white/10 bg-black/20 p-1.5 text-slate-500 transition hover:border-orange-500 hover:text-orange-400">{speakingTurnId === turn.turnId ? <Square className="h-3 w-3 fill-current" /> : <Volume2 className="h-3.5 w-3.5" />}</button>}
                  </div>
                  <p className="whitespace-pre-wrap text-sm leading-6">{turn.text}</p>
                </div>
              </div>
            );
          })}
          {processing && <div className="flex justify-start"><div className="border border-white/10 bg-[#171b21] px-4 py-3 font-mono text-xs text-orange-400 shadow-[4px_4px_0_#050607]"><span className="animate-pulse">PROCESSING ···</span></div></div>}
          <div ref={bottomRef} />
          </div>

          <form onSubmit={submitAnswer} className="border-t border-white/10 bg-[#0c0f13] p-3 sm:p-4">
            <div className="flex items-end gap-2 border border-[#343a44] bg-black/30 p-1.5 focus-within:border-orange-500 focus-within:shadow-[0_0_0_2px_rgba(255,107,24,.1)]">
              <button type="button" onClick={toggleMicrophone} disabled={processing} aria-label={listening ? 'Stop voice typing' : 'Start voice typing'} className={`mb-0.5 border p-2.5 transition disabled:opacity-30 ${listening ? 'animate-pulse border-red-500 bg-red-500/15 text-red-400' : 'border-white/10 text-slate-500 hover:border-orange-500 hover:text-orange-400'}`}>{listening ? <Square className="h-4 w-4 fill-current" /> : <Mic className="h-4 w-4" />}</button>
              <textarea autoFocus rows={2} value={answer} disabled={processing} onChange={(event) => setAnswer(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); event.currentTarget.form?.requestSubmit(); } }} placeholder={listening ? 'Listening… click stop when finished' : 'Type your answer…'} className="max-h-32 flex-1 resize-none bg-transparent px-2 py-2 text-sm leading-5 text-slate-200 outline-none placeholder:text-slate-600 disabled:opacity-60" />
              <button disabled={processing || !answer.trim()} aria-label="Send answer" className="terminal-button mb-0.5 p-2.5 disabled:opacity-30"><ArrowUp className="h-4 w-4" /></button>
            </div>
            <p className={`mt-2 text-center font-mono text-[9px] uppercase tracking-wider ${listening ? 'font-bold text-red-400' : 'text-slate-600'}`}>{listening ? 'Microphone active · click stop when done' : 'Enter to send · Shift + Enter for a new line · Mic for voice input'}</p>
          </form>
          {error && <p role="alert" className="border-t border-red-500/20 bg-red-500/10 px-4 py-2 text-xs text-red-300">{error}</p>}
        </section>
      </div>
    </main>
  );
}
