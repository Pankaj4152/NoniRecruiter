'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowUp, Clock3, Code2, Keyboard, Loader2, Mic, Radio, Sparkles, Square, Volume2, VolumeX, Zap } from 'lucide-react';
import { InterviewPhase, InterviewTurn } from '@/lib/interview/types';
import CodeEditor from '@/components/CodeEditor';

interface SessionView {
  candidate: { name: string; targetRole: string };
  job: { companyName: string; roleTitle: string };
  currentPhase: InterviewPhase;
  elapsedSeconds: number;
  targetDurationMinutes: number;
  candidateStarted: boolean;
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
  const [elapsed, setElapsed] = useState(0);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [listening, setListening] = useState(false);
  const [showCodeEditor, setShowCodeEditor] = useState(false);
  const [showKeyboardFallback, setShowKeyboardFallback] = useState(false);
  const [speakingTurnId, setSpeakingTurnId] = useState<number | null>(null);
  const [autoSpeak, setAutoSpeak] = useState(true);
  const [interviewerSpeaking, setInterviewerSpeaking] = useState(false);
  const [revealedCharacters, setRevealedCharacters] = useState(0);
  const [error, setError] = useState('');
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const dictationPrefixRef = useRef('');
  const automaticallySpokenTurnRef = useRef<number | null>(null);
  const latestInterviewerTurn = [...turns].reverse().find((turn) => turn.speaker === 'interviewer');

  useEffect(() => {
    fetch(`/api/agent/session?sessionId=${encodeURIComponent(id)}`)
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Interview session not found.');
        if (!data.candidateStarted) { router.replace(`/invite/${id}`); return; }
        setSession(data);
        setTurns(data.turns || []);
        setPhase(data.currentPhase || 'WARMUP');
        setElapsed(data.elapsedSeconds || 0);
      })
      .catch((caught) => setError(caught instanceof Error ? caught.message : 'Could not load interview.'))
      .finally(() => setLoading(false));
  }, [id, router]);

  useEffect(() => {
    if (!session || session.isCompleted) return;
    const timer = window.setInterval(() => setElapsed((value) => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, [session]);

  useEffect(() => {
    if (!latestInterviewerTurn) return;
    const turn = latestInterviewerTurn;
    const text = turn.text;
    setRevealedCharacters(0);

    if (!autoSpeak || !('speechSynthesis' in window)) {
      setInterviewerSpeaking(false);
      let index = 0;
      const revealTimer = window.setInterval(() => {
        index = Math.min(text.length, index + 3);
        setRevealedCharacters(index);
        if (index >= text.length) window.clearInterval(revealTimer);
      }, 18);
      return () => window.clearInterval(revealTimer);
    }

    if (automaticallySpokenTurnRef.current === turn.turnId) {
      setRevealedCharacters(text.length);
      setInterviewerSpeaking(false);
      return;
    }
    automaticallySpokenTurnRef.current = turn.turnId;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1;
    setInterviewerSpeaking(true);
    utterance.onboundary = (event) => setRevealedCharacters(Math.min(text.length, event.charIndex + (event.charLength || 1)));
    utterance.onend = () => { setRevealedCharacters(text.length); setSpeakingTurnId(null); setInterviewerSpeaking(false); };
    utterance.onerror = () => { setRevealedCharacters(text.length); setSpeakingTurnId(null); setInterviewerSpeaking(false); };
    setSpeakingTurnId(turn.turnId);
    window.speechSynthesis.speak(utterance);
    return () => { window.speechSynthesis.cancel(); setInterviewerSpeaking(false); };
  }, [latestInterviewerTurn?.turnId, autoSpeak]);

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
      setRevealedCharacters(turn.text.length);
      setInterviewerSpeaking(false);
      return;
    }
    const utterance = new SpeechSynthesisUtterance(turn.text);
    utterance.rate = 1;
    setRevealedCharacters(0);
    setInterviewerSpeaking(true);
    utterance.onboundary = (event) => setRevealedCharacters(Math.min(turn.text.length, event.charIndex + (event.charLength || 1)));
    utterance.onend = () => { setRevealedCharacters(turn.text.length); setSpeakingTurnId(null); setInterviewerSpeaking(false); };
    utterance.onerror = () => {
      setRevealedCharacters(turn.text.length);
      setSpeakingTurnId(null);
      setInterviewerSpeaking(false);
      setError('The browser could not play this message.');
    };
    setError('');
    setSpeakingTurnId(turn.turnId);
    window.speechSynthesis.speak(utterance);
  }

  function toggleAutomaticVoice() {
    setAutoSpeak((enabled) => {
      const nextEnabled = !enabled;
      if (nextEnabled) automaticallySpokenTurnRef.current = null;
      if (!nextEnabled) {
        window.speechSynthesis?.cancel();
        setSpeakingTurnId(null);
        setInterviewerSpeaking(false);
        setRevealedCharacters(turns.find((turn) => turn.turnId === speakingTurnId)?.text.length || latestInterviewerTurn?.text.length || 0);
      }
      return nextEnabled;
    });
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
      setError('Voice recognition is not supported in this browser. Try Chrome or Edge.');
      setShowKeyboardFallback(true);
      return;
    }

    window.speechSynthesis?.cancel();
    setSpeakingTurnId(null);
    setInterviewerSpeaking(false);
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
      if (event.error !== 'aborted') setError(event.error === 'not-allowed' ? 'Microphone permission was denied. Allow microphone access or switch to keyboard.' : `Microphone error: ${event.error}`);
    };
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;
    setError('');
    setListening(true);
    try {
      recognition.start();
    } catch {
      setListening(false);
      setError('The microphone could not be started. Try again or switch to keyboard.');
    }
  }

  async function finishInterview() {
    setProcessing(true);
    setError('');
    try {
      if (!session?.isCompleted) {
        const finishResponse = await fetch('/api/agent/finish', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId: id }) });
        const finishData = await finishResponse.json();
        if (!finishResponse.ok) throw new Error(finishData.error || 'Could not end the interview.');
      }
      const response = await fetch('/api/agent/report', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId: id }) });
      const reportData = await response.json();
      if (!response.ok) throw new Error(reportData.error || 'Could not generate the report.');
      router.push(`/interview/${id}/complete`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not finish interview.');
      setProcessing(false);
    }
  }

  async function submitAnswerWithText(textToSubmit: string, sandboxExecution?: any, pasteLength?: number) {
    const text = textToSubmit.trim();
    if (!text || processing) return;
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
    }
    setAnswer(''); setError(''); setProcessing(true);

    const localCandidateTurn: InterviewTurn = { turnId: turns.length + 1, speaker: 'candidate', text, timestamp: new Date().toISOString(), phase, sandboxExecution };
    setTurns((current) => [...current, localCandidateTurn]);

    try {
      const response = await fetch('/api/agent/turn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: id, answer: text, sandboxExecution, pasteLength }),
      });
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

  async function submitAnswer(event: FormEvent) {
    event.preventDefault();
    await submitAnswerWithText(answer);
  }

  if (loading) return <main className="office-shell grid min-h-[calc(100vh-4rem)] place-items-center"><div className="text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-orange-500" /><p className="mt-3 font-mono text-xs uppercase tracking-wider text-slate-500">Opening interview room</p></div></main>;
  if (!session) return <main className="office-shell grid min-h-[calc(100vh-4rem)] place-items-center px-5 text-center text-sm text-red-300">{error || 'Interview not found.'}</main>;

  const answeredQuestions = turns.filter((turn) => turn.speaker === 'candidate').length;
  const remainingSeconds = Math.max(0, session.targetDurationMinutes * 60 - elapsed);
  const remainingTime = `${Math.floor(remainingSeconds / 60).toString().padStart(2, '0')}:${(remainingSeconds % 60).toString().padStart(2, '0')}`;
  const remainingPercent = Math.max(0, Math.min(100, (remainingSeconds / (session.targetDurationMinutes * 60)) * 100));

  return (
    <main className="office-shell h-[calc(100vh-4rem)] min-h-[650px]">
      <div className="game-grid pointer-events-none absolute inset-0 opacity-50" />
      <span className="pixel-dot absolute left-[9%] top-[30%]" /><span className="pixel-dot absolute right-[8%] top-[45%] [animation-delay:1.6s]" />
      <div className="absolute left-4 right-4 top-4 flex items-start justify-between gap-4 sm:left-7 sm:right-7 sm:top-6">
        <div className="hud-panel px-4 py-3">
          <div className="flex items-center gap-2"><Radio className="h-3.5 w-3.5 animate-pulse text-emerald-400" /><span className="system-kicker text-[#e3dfd7]">Live mission</span><span className="rounded-sm bg-[#f36b21]/15 px-2 py-1 font-mono text-[8px] font-bold uppercase tracking-wider text-[#f4a275]">{phase.replace('_', ' ')}</span></div>
          <p className="mt-1 text-xs text-[#8f8c85]">{session.candidate.name} · {session.job.roleTitle}</p>
        </div>
        <div className="flex items-stretch gap-2">
          <div className="hud-panel min-w-32 px-4 py-3"><div className="flex items-center gap-2"><Clock3 className="h-4 w-4 text-[#f08b53]" /><div><span className="system-code block">Time energy</span><span className="font-mono text-sm font-bold tabular-nums text-[#e7e3dc]">{remainingTime}</span></div></div><div className="hud-bar mt-2"><span style={{ width: `${remainingPercent}%` }} /></div></div>
          <button onClick={() => void finishInterview()} disabled={processing} className="terminal-panel px-4 py-3 font-mono text-[10px] font-bold uppercase tracking-wider text-[#c8c4bc] hover:border-[#f36b21] hover:text-[#f08b53] disabled:opacity-50">End session</button>
        </div>
      </div>

      {/* Question Speech Bubble */}
      <section className="question-bubble z-10 p-5 sm:p-6">
        <div className="mb-3 flex items-center justify-between gap-4">
          <div><span className="terminal-label"><Sparkles className="mr-1.5 h-3 w-3" /> Noni · Recruiter</span><span className="ml-3 system-code">Quest {answeredQuestions + 1}</span></div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setShowCodeEditor(true)} title="Open Live Code Sandbox" className={`border p-2 transition ${phase === 'CODING_CHALLENGE' ? 'border-[#f36b21] bg-[#f36b21]/20 text-[#f4a275] animate-pulse' : 'border-white/15 text-[#8d8a84] hover:border-[#f36b21] hover:text-[#f08b53]'}`}><Code2 className="h-4 w-4" /></button>
            <button type="button" onClick={toggleAutomaticVoice} aria-label={autoSpeak ? 'Disable automatic voice' : 'Enable automatic voice'} title={autoSpeak ? 'Automatic voice on' : 'Automatic voice off'} className={`border p-2 ${autoSpeak ? 'border-[#f36b21]/50 text-[#f08b53]' : 'border-white/15 text-[#77746e]'}`}>{autoSpeak ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}</button>
            {latestInterviewerTurn && <button type="button" onClick={() => speakMessage(latestInterviewerTurn)} aria-label={speakingTurnId === latestInterviewerTurn.turnId ? 'Stop speaking' : 'Replay question'} className="border border-white/15 p-2 text-[#8d8a84] hover:border-[#f36b21] hover:text-[#f08b53]">{speakingTurnId === latestInterviewerTurn.turnId ? <Square className="h-4 w-4 fill-current" /> : <Volume2 className="h-4 w-4" />}</button>}
          </div>
        </div>
        <p className="text-sm leading-6 text-[#e7e3dc] sm:text-base sm:leading-7">
          {processing ? (
            <span className="animate-pulse font-mono text-xs uppercase tracking-wider text-[#f08b53]">Interviewer evaluating & formulating next probe…</span>
          ) : (
            <>{latestInterviewerTurn?.text.slice(0, revealedCharacters)}{latestInterviewerTurn && revealedCharacters < latestInterviewerTurn.text.length && <span className="ml-0.5 animate-pulse text-[#f36b21]">|</span>}</>
          )}
        </p>
      </section>

      {/* Voice-First Primary Action Console */}
      <div className="absolute bottom-5 left-1/2 z-20 w-[calc(100%-2rem)] max-w-4xl -translate-x-1/2 sm:bottom-7">
        <form onSubmit={submitAnswer} className="answer-dock p-4 rounded-2xl border border-white/20 bg-[#0a0a0c]/95 shadow-2xl backdrop-blur-md">
          <div className="mb-3 flex items-center justify-between">
            <span className="system-kicker flex items-center gap-2 text-xs font-mono font-bold text-[#f4a275]">
              <Zap className="h-4 w-4 text-[#f36b21]" />
              {interviewerSpeaking ? 'Interviewer Speaking…' : listening ? 'Recording Voice Answer…' : 'Your Turn to Respond'}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowCodeEditor(true)}
                className={`flex items-center gap-1.5 px-3 py-1 text-xs font-mono rounded border transition ${phase === 'CODING_CHALLENGE' ? 'border-[#f36b21] bg-[#f36b21]/20 text-[#f4a275] animate-pulse' : 'border-white/15 text-[#bbb8b1] hover:border-[#f36b21]'}`}
              >
                <Code2 className="h-3.5 w-3.5" />
                <span>Code Sandbox</span>
              </button>

              <button
                type="button"
                onClick={() => setShowKeyboardFallback((prev) => !prev)}
                className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono text-[#88847d] hover:text-white border border-white/10 rounded"
                title="Toggle Text Input"
              >
                <Keyboard className="h-3.5 w-3.5" />
                <span>{showKeyboardFallback ? 'Hide Text' : 'Text Input'}</span>
              </button>
            </div>
          </div>

          {/* Voice Waveform & Central Mic Control Button */}
          <div className="flex flex-col items-center justify-center p-4 rounded-xl border border-white/10 bg-black/40 space-y-3">
            {interviewerSpeaking ? (
              <div className="flex items-center gap-3 py-3">
                <span className="grid h-12 w-12 place-items-center rounded-full border border-amber-500/40 bg-amber-500/10 text-amber-400 animate-pulse">
                  <Volume2 className="h-6 w-6" />
                </span>
                <span className="font-mono text-xs text-[#aaa7a0]">Listen to interviewer... mic unlocks automatically when done</span>
              </div>
            ) : (
              <div className="flex flex-col items-center space-y-3 w-full">
                <button
                  type="button"
                  onClick={toggleMicrophone}
                  disabled={processing}
                  className={`group relative flex items-center justify-center gap-3 px-8 py-4 rounded-full border text-sm font-mono font-bold uppercase tracking-wider transition-all shadow-xl disabled:opacity-40 ${
                    listening
                      ? 'border-rose-500 bg-rose-500/20 text-rose-300 animate-pulse scale-105 shadow-rose-900/50'
                      : 'border-[#f36b21] bg-[#f36b21]/15 text-[#f4a275] hover:bg-[#f36b21]/30 hover:scale-105 shadow-orange-950/40'
                  }`}
                >
                  {listening ? <Square className="h-5 w-5 fill-current" /> : <Mic className="h-5 w-5" />}
                  <span>{listening ? 'Stop & Submit Voice Answer' : 'Press Mic to Speak Answer'}</span>
                </button>

                {/* Real-time transcript preview */}
                {answer.trim() && (
                  <div className="w-full mt-2 p-3 rounded border border-white/10 bg-black/60 font-mono text-xs text-[#e7e3dc] flex items-center justify-between">
                    <span className="truncate italic max-w-[85%]">"{answer}"</span>
                    <button
                      type="submit"
                      disabled={processing || !answer.trim()}
                      className="px-3 py-1 text-xs font-mono font-bold bg-[#f36b21] text-black rounded uppercase tracking-wider hover:bg-[#ff7c35] disabled:opacity-50"
                    >
                      Send
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Optional Text Fallback Input */}
          {showKeyboardFallback && (
            <div className="mt-3 flex items-end gap-2 border border-white/15 bg-black/50 p-2 focus-within:border-[#f36b21]">
              <textarea
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
                placeholder="Type your answer fallback here..."
                className="max-h-32 flex-1 resize-none bg-transparent px-2 py-1 text-sm text-[#e7e3dc] outline-none placeholder:text-[#686660]"
              />
              <button disabled={processing || !answer.trim()} type="submit" className="terminal-button p-2.5 disabled:opacity-30">
                <ArrowUp className="h-4 w-4" />
              </button>
            </div>
          )}
        </form>

        {error && <p role="alert" className="mt-2 border border-red-500/30 bg-[#180b0b]/95 px-4 py-2 text-xs text-red-300">{error}</p>}
      </div>

      <CodeEditor
        isOpen={showCodeEditor}
        onClose={() => setShowCodeEditor(false)}
        onSubmitCode={(codeFormatted, lang, executionResult) => void submitAnswerWithText(codeFormatted, executionResult)}
        onPasteEvent={(pastedLen) => {
          if (pastedLen > 50) {
            console.warn(`[Anti-Cheat Audit] Large paste event detected (${pastedLen} chars)`);
          }
        }}
        disabled={processing}
      />
    </main>
  );
}

