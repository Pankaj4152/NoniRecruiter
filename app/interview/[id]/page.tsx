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

  if (loading) return <main className="grid min-h-[calc(100vh-3.5rem)] place-items-center"><Loader2 className="h-5 w-5 animate-spin text-slate-400" /></main>;
  if (!session) return <main className="grid min-h-[calc(100vh-3.5rem)] place-items-center text-sm text-red-600">{error || 'Interview not found.'}</main>;

  return (
    <main className="mx-auto flex h-[calc(100vh-3.5rem)] w-full max-w-3xl flex-col px-4 py-5 sm:px-5 sm:py-7">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div className="min-w-0">
          <h1 className="truncate text-base font-semibold text-slate-900">Interview with {session.candidate.name}</h1>
          <p className="mt-0.5 truncate text-xs text-slate-500">{session.job.roleTitle} · {session.job.companyName}</p>
        </div>
        <button onClick={() => void finishInterview()} disabled={processing} className="shrink-0 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50">End interview</button>
      </div>

      <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3 text-xs text-slate-500"><span className="h-2 w-2 rounded-full bg-emerald-500" /> Interview in progress</div>
        <div className="flex-1 space-y-5 overflow-y-auto p-4 sm:p-6">
          {turns.map((turn) => {
            const candidate = turn.speaker === 'candidate';
            return (
              <div key={`${turn.turnId}-${turn.speaker}`} className={`flex ${candidate ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[88%] px-4 py-3 sm:max-w-[78%] ${candidate ? 'rounded-2xl rounded-br-md bg-slate-900 text-white' : 'rounded-2xl rounded-bl-md bg-slate-100 text-slate-800'}`}>
                  {!candidate && <div className="mb-1.5 flex items-center justify-between gap-3"><p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Interviewer</p><button type="button" onClick={() => speakMessage(turn)} aria-label={speakingTurnId === turn.turnId ? 'Stop speaking' : 'Read message aloud'} className="rounded-md p-1 text-slate-400 transition hover:bg-white hover:text-slate-700">{speakingTurnId === turn.turnId ? <Square className="h-3.5 w-3.5 fill-current" /> : <Volume2 className="h-4 w-4" />}</button></div>}
                  <p className="whitespace-pre-wrap text-sm leading-6">{turn.text}</p>
                </div>
              </div>
            );
          })}
          {processing && <div className="flex justify-start"><div className="rounded-2xl rounded-bl-md bg-slate-100 px-4 py-3 text-sm text-slate-400"><span className="animate-pulse">● ● ●</span></div></div>}
          <div ref={bottomRef} />
        </div>

        <form onSubmit={submitAnswer} className="border-t border-slate-200 bg-white p-3 sm:p-4">
          <div className="flex items-end gap-2 rounded-xl border border-slate-300 p-1.5 focus-within:border-slate-500 focus-within:ring-2 focus-within:ring-slate-100">
            <button type="button" onClick={toggleMicrophone} disabled={processing} aria-label={listening ? 'Stop voice typing' : 'Start voice typing'} className={`mb-0.5 rounded-lg p-2.5 transition disabled:opacity-30 ${listening ? 'bg-red-50 text-red-600 ring-1 ring-red-200' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'}`}>{listening ? <Square className="h-4 w-4 fill-current" /> : <Mic className="h-4 w-4" />}</button>
            <textarea autoFocus rows={2} value={answer} disabled={processing} onChange={(event) => setAnswer(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); event.currentTarget.form?.requestSubmit(); } }} placeholder={listening ? 'Listening… click stop when finished' : 'Type your answer…'} className="max-h-32 flex-1 resize-none bg-transparent px-2 py-2 text-sm leading-5 text-slate-800 outline-none placeholder:text-slate-400 disabled:opacity-60" />
            <button disabled={processing || !answer.trim()} aria-label="Send answer" className="rounded-lg bg-slate-900 p-2.5 text-white transition hover:bg-slate-800 disabled:opacity-30"><ArrowUp className="h-4 w-4" /></button>
          </div>
          <p className={`mt-2 text-center text-[11px] ${listening ? 'font-medium text-red-500' : 'text-slate-400'}`}>{listening ? 'Listening — click the stop button when you are done' : 'Enter to send · Shift + Enter for a new line'}</p>
        </form>
      </section>
      {error && <p role="alert" className="mt-3 text-sm text-red-600">{error}</p>}
    </main>
  );
}
