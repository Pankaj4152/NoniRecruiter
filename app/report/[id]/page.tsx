'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AlertTriangle, ArrowLeft, CheckCircle2, ChevronDown, Clock3, Download, FileCheck2, MessageSquareText, Quote, RotateCcw, ShieldCheck, Sparkles, Target, Trophy } from 'lucide-react';
import { FinalInterviewReport, TurnEvaluation } from '@/lib/interview/types';

type ReportTab = 'overview' | 'evidence' | 'transcript';

export default function ReportDashboardPage() {
  const { id: sessionId } = useParams<{ id: string }>();
  const router = useRouter();
  const [report, setReport] = useState<FinalInterviewReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<ReportTab>('overview');
  const [expandedTurn, setExpandedTurn] = useState<number | null>(null);

  useEffect(() => {
    fetch('/api/agent/report', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId }) })
      .then(async (response) => { const data = await response.json(); if (!response.ok || !data.report) throw new Error(data.error || 'Report could not be generated.'); setReport(data.report); })
      .catch((caught) => setError(caught instanceof Error ? caught.message : 'Report could not be generated.'))
      .finally(() => setLoading(false));
  }, [sessionId]);

  if (loading) return <main className="office-shell grid min-h-[calc(100vh-4rem)] place-items-center"><div className="hud-panel mission-card px-10 py-8 text-center"><Sparkles className="mx-auto h-6 w-6 animate-pulse text-[#f36b21]" /><p className="mt-4 system-kicker text-[#f4a275]">Building evidence report</p><div className="hud-bar mx-auto mt-4 w-56"><span className="animate-pulse" style={{ width: '72%' }} /></div></div></main>;
  if (!report) return <main className="office-shell grid min-h-[calc(100vh-4rem)] place-items-center px-5"><div className="hud-panel max-w-md p-7 text-center"><AlertTriangle className="mx-auto h-6 w-6 text-amber-400" /><p className="mt-3 text-sm text-[#d6d2ca]">{error || 'Report not found.'}</p><button onClick={() => router.push('/')} className="terminal-button mt-5 px-5 py-3">New interview</button></div></main>;

  const verdictTone = ['STRONG HIRE', 'HIRE'].includes(report.verdict) ? 'text-emerald-300 border-emerald-400/40 bg-emerald-400/10' : report.verdict === 'LEAN HIRE' ? 'text-amber-300 border-amber-400/40 bg-amber-400/10' : 'text-rose-300 border-rose-400/40 bg-rose-400/10';
  const duration = `${Math.floor(report.timing.actualDurationSeconds / 60)}m ${report.timing.actualDurationSeconds % 60}s`;
  const competencies = [['Role accuracy & depth', report.scores.technicalAccuracy, 'from-[#f36b21] to-[#ffc15c]'], ['Communication & structure', report.scores.communicationClarity, 'from-emerald-500 to-cyan-400'], ['Problem solving', report.scores.problemSolving, 'from-violet-500 to-fuchsia-400']] as const;

  function downloadReport() {
    if (!report) return;
    const lines = ['# NoniRecruiter Interview Report', '', `**Candidate:** ${report.candidateName}`, `**Role:** ${report.targetRole}`, `**Verdict:** ${report.verdict} (${report.overallScore}/100)`, '', '## Executive summary', report.executiveSummary, '', '## Strengths', ...report.strengths.map((item) => `- ${item}`), '', '## Areas for improvement', ...report.areasForImprovement.map((item) => `- ${item}`), '', '## Transcript', ...report.fullTranscript.map((turn) => `**${turn.speaker}:** ${turn.text}`)];
    const url = URL.createObjectURL(new Blob([lines.join('\n')], { type: 'text/markdown;charset=utf-8' }));
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = `noni-recruiter-${report.sessionId}.md`; anchor.click(); URL.revokeObjectURL(url);
  }

  return <main className="min-h-[calc(100vh-4rem)] bg-[#090908] text-[#f0eee9]">
    <section className="relative overflow-hidden border-b border-white/10 bg-[radial-gradient(circle_at_25%_10%,rgba(243,107,33,.2),transparent_35%),linear-gradient(180deg,#17100c,#090908)] px-4 py-8 sm:px-7">
      <div className="game-grid pointer-events-none absolute inset-0 opacity-70" />
      <div className="relative mx-auto max-w-6xl">
        <div className="flex flex-wrap items-center justify-between gap-3"><button onClick={() => router.push('/')} className="flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-wider text-[#99958e] hover:text-white"><ArrowLeft className="h-4 w-4" /> New interview</button><button onClick={downloadReport} className="terminal-button flex items-center gap-2 px-4 py-3"><Download className="h-4 w-4" /> Export report</button></div>
        <div className="mt-8 grid items-center gap-7 lg:grid-cols-[1fr_auto]">
          <div><span className="terminal-label"><Trophy className="mr-2 h-3.5 w-3.5" /> Interview complete</span><h1 className="mt-5 text-4xl font-black uppercase tracking-[-.045em] sm:text-6xl">{report.candidateName}</h1><p className="mt-2 font-mono text-xs uppercase tracking-[.14em] text-[#a9a49c]">{report.targetRole} · {report.date}</p><p className="mt-5 max-w-3xl text-sm leading-7 text-[#c5c0b7]">{report.executiveSummary}</p></div>
          <div className="flex items-center gap-5"><div className="relative grid h-36 w-36 place-items-center rounded-full" style={{ background: `conic-gradient(#f36b21 ${report.overallScore}%, rgba(255,255,255,.08) 0)` }}><div className="grid h-28 w-28 place-items-center rounded-full bg-[#0b0a09] text-center"><div><strong className="block text-4xl font-black text-white">{report.overallScore}</strong><span className="system-code">Overall XP</span></div></div></div><div><span className={`block border px-4 py-2 text-center font-mono text-sm font-black ${verdictTone}`}>{report.verdict}</span><p className="mt-2 text-center font-mono text-[9px] uppercase tracking-wider text-[#77736c]">{report.confidence} confidence</p></div></div>
        </div>
      </div>
    </section>

    <div className="sticky top-0 z-30 border-b border-white/10 bg-[#090908]/95 px-4 backdrop-blur-xl sm:px-7"><nav className="mx-auto flex max-w-6xl gap-1 overflow-x-auto py-2">{([['overview', Target, 'Overview'], ['evidence', ShieldCheck, 'Evidence audit'], ['transcript', MessageSquareText, 'Transcript']] as const).map(([value, Icon, label]) => <button key={value} onClick={() => setActiveTab(value)} className={`flex items-center gap-2 whitespace-nowrap border px-4 py-3 font-mono text-[10px] font-bold uppercase tracking-wider transition ${activeTab === value ? 'border-[#f36b21]/60 bg-[#f36b21]/10 text-[#ff9a61]' : 'border-transparent text-[#77736c] hover:text-white'}`}><Icon className="h-4 w-4" />{label}</button>)}</nav></div>

    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-7">
      {activeTab === 'overview' && <>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{[[Clock3, 'Duration', duration], [FileCheck2, 'Evidence turns', String(report.turnEvaluations.length)], [ShieldCheck, 'Completion', report.timing.completionReason], [Sparkles, 'AI runtime', report.modelUsage.models.join(', ') || 'Not tracked']].map(([Icon, label, value]) => <div key={String(label)} className="hud-panel p-4"><Icon className="h-4 w-4 text-[#f08b53]" /><p className="system-code mt-4">{String(label)}</p><p className="mt-1 truncate text-sm font-bold text-[#e9e5dd]" title={String(value)}>{String(value)}</p></div>)}</div>
        <section className="mission-card bg-[#11110f] p-6 sm:p-8"><div className="flex items-center justify-between"><div><p className="system-kicker text-[#f08b53]">Capability map</p><h2 className="mt-2 text-xl font-black uppercase">Competency scores</h2></div><span className="system-code">Verified / 100</span></div><div className="mt-7 grid gap-5 md:grid-cols-3">{competencies.map(([label, score, color]) => <div key={label}><div className="mb-2 flex justify-between text-xs"><span className="text-[#bbb6ae]">{label}</span><strong className="text-white">{score}</strong></div><div className="h-2 overflow-hidden bg-white/[.06]"><div className={`h-full bg-gradient-to-r ${color} transition-all duration-1000`} style={{ width: `${score}%` }} /></div></div>)}</div></section>
        <div className="grid gap-6 lg:grid-cols-2"><InsightCard positive title="Evidence-backed strengths" items={report.strengths} /><InsightCard title="Growth opportunities" items={report.areasForImprovement} /></div>
        <section className="hud-panel flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between"><div><p className="system-kicker text-[#f08b53]">Recommended action</p><p className="mt-2 text-sm leading-6 text-[#d4d0c8]">{report.recommendedNextStep}</p></div><button onClick={() => router.push('/')} className="terminal-button flex shrink-0 items-center justify-center gap-2 px-5 py-3"><RotateCcw className="h-4 w-4" /> Run another</button></section>
      </>}

      {activeTab === 'evidence' && <section><div className="mb-5"><p className="system-kicker text-[#f08b53]">Decision trace</p><h2 className="mt-2 text-2xl font-black uppercase">Turn-by-turn audit</h2><p className="mt-2 text-sm text-[#85817a]">Open any turn to inspect the answer, verifier quote, feedback, and score inputs.</p></div><div className="space-y-3">{report.turnEvaluations.length ? report.turnEvaluations.map((item) => <EvidenceTurn key={item.turnId} item={item} open={expandedTurn === item.turnId} onToggle={() => setExpandedTurn(expandedTurn === item.turnId ? null : item.turnId)} />) : <p className="hud-panel p-5 text-sm text-[#88847d]">No candidate answers were captured.</p>}</div></section>}

      {activeTab === 'transcript' && <section><div className="mb-5"><p className="system-kicker text-[#f08b53]">Complete record</p><h2 className="mt-2 text-2xl font-black uppercase">Interview transcript</h2></div><div className="mission-card space-y-4 bg-[#10100e] p-5 sm:p-7">{report.fullTranscript.map((turn) => <div key={turn.turnId} className={`max-w-[90%] border p-4 ${turn.speaker === 'candidate' ? 'ml-auto border-[#f36b21]/25 bg-[#f36b21]/[.08]' : 'border-white/10 bg-white/[.025]'}`}><p className="system-code mb-2">{turn.speaker} · {turn.phase.replaceAll('_', ' ')}</p><p className="text-sm leading-6 text-[#d5d1c9]">{turn.text}</p></div>)}</div></section>}
    </div>
  </main>;
}

function InsightCard({ title, items, positive = false }: { title: string; items: string[]; positive?: boolean }) {
  return <section className="hud-panel p-6"><h3 className={`flex items-center gap-2 text-sm font-bold ${positive ? 'text-emerald-300' : 'text-amber-300'}`}>{positive ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}{title}</h3><div className="mt-4 space-y-3">{items.length ? items.map((item, index) => <div key={index} className="border border-white/10 bg-black/20 p-4 text-xs leading-6 text-[#c9c5bd]"><Quote className="mb-2 h-3.5 w-3.5 text-[#f08b53]" />{item}</div>) : <p className="text-xs italic text-[#77736c]">No significant concerns recorded.</p>}</div></section>;
}

function EvidenceTurn({ item, open, onToggle }: { item: TurnEvaluation; open: boolean; onToggle: () => void }) {
  return <article className="hud-panel overflow-hidden"><button onClick={onToggle} className="flex w-full items-center gap-4 p-5 text-left"><span className="grid h-9 w-9 shrink-0 place-items-center border border-[#f36b21]/35 bg-[#f36b21]/10 font-mono text-xs font-black text-[#ff9a61]">{item.turnId}</span><div className="min-w-0 flex-1"><p className="system-code">{item.phase.replaceAll('_', ' ')}</p><p className="mt-1 truncate text-sm text-[#d2cec6]">{item.candidateAnswer}</p></div><div className="hidden grid-cols-3 gap-2 sm:grid">{[['Role', item.technicalAccuracyScore], ['Comm', item.communicationScore], ['Solve', item.problemSolvingScore]].map(([label, score]) => <span key={String(label)} className="min-w-14 bg-black/30 px-2 py-1 text-center"><strong className="block text-xs text-white">{score}</strong><small className="system-code">{label}</small></span>)}</div><ChevronDown className={`h-4 w-4 text-[#77736c] transition ${open ? 'rotate-180' : ''}`} /></button>{open && <div className="grid gap-4 border-t border-white/10 bg-black/20 p-5 md:grid-cols-[1fr_260px]"><div><p className="system-code">Candidate answer</p><p className="mt-2 text-sm leading-7 text-[#cbc7bf]">{item.candidateAnswer}</p>{item.strengthsEvidence[0] && <blockquote className="mt-4 border-l-2 border-emerald-400 bg-emerald-400/[.05] p-3 text-xs leading-6 text-emerald-200">“{item.strengthsEvidence[0]}”</blockquote>}</div><div className="border border-white/10 bg-white/[.025] p-4"><p className="system-code">Evaluator notes</p><p className="mt-2 text-xs leading-6 text-[#aaa69e]">{item.feedbackNotes}</p></div></div>}</article>;
}
