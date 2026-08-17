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

  const latestInterviewerTurn = [...turns].reverse().find((turn) => turn.speaker === 'interviewer');
  const answeredQuestions = turns.filter((turn) => turn.speaker === 'candidate').length;

  return (
    <main className="office-shell h-[calc(100vh-4rem)] min-h-[650px]">
      <div className="absolute left-4 right-4 top-4 flex items-start justify-between gap-4 sm:left-7 sm:right-7 sm:top-6">
        <div className="terminal-panel px-4 py-3">
          <div className="flex items-center gap-2"><span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" /><span className="system-kicker text-[#e3dfd7]">Live interview</span></div>
          <p className="mt-1 text-xs text-[#8f8c85]">{session.candidate.name} · {session.job.roleTitle}</p>
        </div>
        <button onClick={() => void finishInterview()} disabled={processing} className="terminal-panel px-4 py-3 font-mono text-[10px] font-bold uppercase tracking-wider text-[#c8c4bc] hover:border-[#f36b21] hover:text-[#f08b53] disabled:opacity-50">End session</button>
      </div>

      <section className="question-bubble z-10 p-5 sm:p-6">
        <div className="mb-3 flex items-center justify-between gap-4">
          <div><span className="terminal-label">Noni · AI Recruiter</span><span className="ml-3 system-code">Question {answeredQuestions + 1}</span></div>
          {latestInterviewerTurn && <button type="button" onClick={() => speakMessage(latestInterviewerTurn)} aria-label={speakingTurnId === latestInterviewerTurn.turnId ? 'Stop speaking' : 'Read question aloud'} className="border border-white/15 p-2 text-[#8d8a84] hover:border-[#f36b21] hover:text-[#f08b53]">{speakingTurnId === latestInterviewerTurn.turnId ? <Square className="h-4 w-4 fill-current" /> : <Volume2 className="h-4 w-4" />}</button>}
        </div>
        <p className="text-sm leading-6 text-[#e7e3dc] sm:text-base sm:leading-7">{processing ? <span className="animate-pulse font-mono text-xs uppercase tracking-wider text-[#f08b53]">Preparing the next question…</span> : latestInterviewerTurn?.text}</p>
      </section>

      <div className="absolute bottom-5 left-1/2 z-20 w-[calc(100%-2rem)] max-w-4xl -translate-x-1/2 sm:bottom-7">
        <form onSubmit={submitAnswer} className="answer-dock p-3 sm:p-4">
          <div className="mb-2 flex items-center justify-between"><span className="system-kicker">Your response</span><span className="system-code">Review before sending</span></div>
          <div className="flex items-end gap-2 border border-white/15 bg-black/35 p-1.5 focus-within:border-[#f36b21]">
            <button type="button" onClick={toggleMicrophone} disabled={processing} aria-label={listening ? 'Stop voice typing' : 'Start voice typing'} className={`border p-2.5 transition disabled:opacity-30 ${listening ? 'animate-pulse border-red-500 bg-red-500/15 text-red-400' : 'border-white/10 text-[#7e7b75] hover:border-[#f36b21] hover:text-[#f08b53]'}`}>{listening ? <Square className="h-4 w-4 fill-current" /> : <Mic className="h-4 w-4" />}</button>
            <textarea autoFocus rows={2} value={answer} disabled={processing} onChange={(event) => setAnswer(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); event.currentTarget.form?.requestSubmit(); } }} placeholder={listening ? 'Listening… click stop when finished' : 'Type your answer or use the microphone…'} className="max-h-32 flex-1 resize-none bg-transparent px-2 py-2 text-sm leading-5 text-[#e7e3dc] outline-none placeholder:text-[#686660] disabled:opacity-60" />
            <button disabled={processing || !answer.trim()} aria-label="Send answer" className="terminal-button p-3 disabled:opacity-30"><ArrowUp className="h-4 w-4" /></button>
          </div>
          <p className={`mt-2 text-center font-mono text-[9px] uppercase tracking-wider ${listening ? 'font-bold text-red-400' : 'text-[#66635e]'}`}>{listening ? 'Microphone active · click stop when done' : 'Enter to send · Shift + Enter for a new line'}</p>
        </form>
        {error && <p role="alert" className="mt-2 border border-red-500/30 bg-[#180b0b]/95 px-4 py-2 text-xs text-red-300">{error}</p>}
      </div>
    </main>
  );
}
