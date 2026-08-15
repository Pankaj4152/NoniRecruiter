'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { CheckCircle, AlertTriangle, ArrowLeft, Download, ShieldCheck, Quote, MessageSquareText } from 'lucide-react';

export default function ReportDashboardPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.id as string;

  const [report, setReport] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchReport() {
      try {
        const res = await fetch('/api/agent/report', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId }),
        });
        const data = await res.json();
        if (data.report) {
          setReport(data.report);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchReport();
  }, [sessionId]);

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-3">
        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-sm font-medium">Generating Evidence-Based Report Card...</span>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-4">
        <p>No report found for session ID: {sessionId}</p>
        <button
          onClick={() => router.push('/')}
          className="px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl"
        >
          Back to Setup
        </button>
      </div>
    );
  }

  const getVerdictBadge = (verdict: string) => {
    switch (verdict) {
      case 'STRONG HIRE':
      case 'HIRE':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
      case 'LEAN HIRE':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      default:
        return 'bg-rose-500/20 text-rose-300 border-rose-500/40';
    }
  };

  const downloadReport = () => {
    const lines = [
      '# NoniRecruiter Interview Report',
      '',
      `**Candidate:** ${report.candidateName}`,
      `**Role:** ${report.targetRole}`,
      `**Verdict:** ${report.verdict} (${report.overallScore}/100)`,
      `**Requested duration:** ${report.timing.requestedDurationMinutes} minutes`,
      `**Actual duration:** ${Math.floor(report.timing.actualDurationSeconds / 60)}m ${report.timing.actualDurationSeconds % 60}s`,
      `**Started:** ${new Date(report.timing.startedAt).toLocaleString()}`,
      `**Ended:** ${new Date(report.timing.endedAt).toLocaleString()}`,
      `**Completion reason:** ${report.timing.completionReason}`,
      `**Phases covered:** ${report.timing.phasesCovered.join(' → ')}`,
      '',
      '## Competency scores',
      `- Technical accuracy: ${report.scores.technicalAccuracy}/100`,
      `- Communication: ${report.scores.communicationClarity}/100`,
      `- Problem solving: ${report.scores.problemSolving}/100`,
      '',
      '## Evidence-backed strengths',
      ...report.strengths.map((item: string) => `- “${item}”`),
      '',
      '## Areas for improvement',
      ...report.areasForImprovement.map((item: string) => `- ${item}`),
      '',
      '## Transcript',
      ...report.fullTranscript.map((turn: any) => `**${turn.speaker}:** ${turn.text}`),
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `noni-recruiter-${report.sessionId}.md`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-6xl w-full mx-auto px-6 py-10 flex-1 space-y-8">
      {/* Top Header & Actions */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => router.push('/')}
          className="flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Setup
        </button>

        <button
          onClick={downloadReport}
          className="flex items-center gap-2 py-2 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-indigo-600/20"
        >
          <Download className="w-4 h-4" />
          Export Report (.MD)
        </button>
      </div>

      {/* Executive Overview Hero Card */}
      <div className="glass-panel-glow rounded-2xl p-8 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-2 text-center md:text-left">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold">
            <ShieldCheck className="w-3.5 h-3.5" /> Verified Evidence Audit
          </div>
          <h2 className="text-3xl font-extrabold text-white">{report.candidateName}</h2>
          <p className="max-w-2xl text-sm leading-6 text-slate-300">{report.executiveSummary}</p>
          <p className="text-xs text-cyan-300"><strong>Next step:</strong> {report.recommendedNextStep}</p>
          <p className="text-sm text-slate-400">
            Target Role: <strong className="text-slate-200">{report.targetRole}</strong> • Session Date: {report.date}
          </p>
        </div>

        <div className="flex items-center gap-6 bg-slate-900/80 p-4 rounded-xl border border-slate-800">
          <div className="text-center">
            <div className="text-3xl font-black text-cyan-300">{report.overallScore}</div>
            <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Overall Score</div>
          </div>

          <div className="h-10 w-[1px] bg-slate-800" />

          <div className="text-center">
            <div className={`px-3 py-1 rounded-lg text-sm font-black border ${getVerdictBadge(report.verdict)}`}>
              {report.verdict}
            </div>
            <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mt-1">Verdict</div>
            <div className="text-[10px] text-slate-500 mt-1">{report.confidence} confidence</div>
          </div>
        </div>
      </div>

      <div className="surface-card rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Interview timing audit</p>
            <p className="text-sm text-slate-300 mt-1">Scheduling details are recorded for the recruiter, not shown to the candidate.</p>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div><p className="text-[10px] uppercase text-slate-500">Requested</p><p className="text-sm font-semibold text-white mt-1">{report.timing.requestedDurationMinutes} minutes</p></div>
          <div><p className="text-[10px] uppercase text-slate-500">Actual</p><p className="text-sm font-semibold text-white mt-1">{Math.floor(report.timing.actualDurationSeconds / 60)}m {report.timing.actualDurationSeconds % 60}s</p></div>
          <div><p className="text-[10px] uppercase text-slate-500">Started</p><p className="text-sm font-semibold text-white mt-1">{new Date(report.timing.startedAt).toLocaleTimeString()}</p></div>
          <div><p className="text-[10px] uppercase text-slate-500">Ended</p><p className="text-sm font-semibold text-white mt-1">{new Date(report.timing.endedAt).toLocaleTimeString()}</p></div>
        </div>
        <div className="mt-4 border-t border-white/[0.06] pt-4 flex flex-col md:flex-row gap-3 md:items-center md:justify-between text-xs">
          <span className="text-slate-400"><strong className="text-slate-200">Completion:</strong> {report.timing.completionReason}</span>
          <span className="text-indigo-300">{report.timing.phasesCovered.map((item: string) => item.replaceAll('_', ' ')).join(' → ')}</span>
        </div>
        <div className="mt-3 text-[11px] text-slate-500">
          AI runtime: {report.modelUsage.providers.join(', ') || 'not tracked'} · {report.modelUsage.models.join(', ') || 'not tracked'} · fallback {report.modelUsage.fallbackCalls}/{report.modelUsage.totalTrackedCalls} · avg {report.modelUsage.averageLatencyMs}ms
        </div>
      </div>

      {/* Competency Scores Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: 'Technical Accuracy & Depth', score: report.scores.technicalAccuracy, color: 'from-indigo-500 to-cyan-400' },
          { label: 'Communication & Structure', score: report.scores.communicationClarity, color: 'from-emerald-500 to-teal-400' },
          { label: 'Problem Solving & Systems', score: report.scores.problemSolving, color: 'from-purple-500 to-indigo-400' },
        ].map((c, i) => (
          <div key={i} className="glass-panel rounded-2xl p-5 space-y-3">
            <div className="flex justify-between items-center text-xs font-bold text-slate-300">
              <span>{c.label}</span>
              <span className="text-cyan-300 font-extrabold">{c.score} / 100</span>
            </div>
            <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden">
              <div className={`h-full bg-gradient-to-r ${c.color}`} style={{ width: `${c.score}%` }} />
            </div>
          </div>
        ))}
      </div>

      {/* Strengths vs Areas for Improvement */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Strengths */}
        <div className="glass-panel rounded-2xl p-6 space-y-4">
          <h3 className="text-sm font-bold text-emerald-400 flex items-center gap-2">
            <CheckCircle className="w-4 h-4" /> Key Strengths & Verifier Quotes
          </h3>
          <ul className="space-y-2 text-xs text-slate-300">
            {report.strengths.map((s: string, idx: number) => (
              <li key={idx} className="p-3 bg-emerald-950/20 border border-emerald-500/20 rounded-xl">
                "{s}"
              </li>
            ))}
          </ul>
        </div>

        {/* Areas for Improvement */}
        <div className="glass-panel rounded-2xl p-6 space-y-4">
          <h3 className="text-sm font-bold text-amber-400 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" /> Areas for Improvement
          </h3>
          <ul className="space-y-2 text-xs text-slate-300">
            {report.areasForImprovement.length > 0 ? (
              report.areasForImprovement.map((a: string, idx: number) => (
                <li key={idx} className="p-3 bg-amber-950/20 border border-amber-500/20 rounded-xl">
                  "{a}"
                </li>
              ))
            ) : (
              <li className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl text-slate-400 italic">
                No major red flags identified during the session.
              </li>
            )}
          </ul>
        </div>
      </div>

      <div className="surface-card rounded-3xl p-6 sm:p-8">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <div className="eyebrow">Decision trace</div>
            <h3 className="text-xl font-bold text-white mt-3">Turn-by-turn evidence audit</h3>
            <p className="text-xs text-slate-500 mt-1">Every score remains connected to the answer that produced it.</p>
          </div>
          <ShieldCheck className="w-6 h-6 text-cyan-300" />
        </div>
        <div className="space-y-3">
          {report.turnEvaluations.length > 0 ? report.turnEvaluations.map((evaluation: any) => (
            <div key={evaluation.turnId} className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4 grid md:grid-cols-[110px_1fr_180px] gap-4 items-start">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-slate-500">Turn {evaluation.turnId}</p>
                <p className="text-xs font-semibold text-indigo-300 mt-1">{evaluation.phase.replaceAll('_', ' ')}</p>
              </div>
              <div>
                <p className="text-sm text-slate-300 leading-6">{evaluation.candidateAnswer}</p>
                {evaluation.strengthsEvidence[0] && (
                  <p className="mt-3 flex gap-2 text-xs text-emerald-300"><Quote className="w-3.5 h-3.5 shrink-0" /> “{evaluation.strengthsEvidence[0]}”</p>
                )}
              </div>
              <div className="grid grid-cols-3 gap-1 text-center">
                {[['Tech', evaluation.technicalAccuracyScore], ['Comm', evaluation.communicationScore], ['Solve', evaluation.problemSolvingScore]].map(([label, score]) => (
                  <div key={String(label)} className="rounded-lg bg-slate-950/60 p-2">
                    <p className="text-sm font-bold text-white">{String(score)}</p>
                    <p className="text-[9px] uppercase text-slate-500">{String(label)}</p>
                  </div>
                ))}
              </div>
            </div>
          )) : <p className="text-sm text-slate-500">No candidate answers were captured for evaluation.</p>}
        </div>
      </div>

      <details className="surface-card rounded-3xl p-6 group">
        <summary className="list-none cursor-pointer flex items-center justify-between">
          <span className="flex items-center gap-2 text-sm font-semibold text-white"><MessageSquareText className="w-4 h-4 text-cyan-300" /> Full interview transcript</span>
          <span className="text-[10px] uppercase tracking-wider text-slate-500 group-open:hidden">Open transcript</span>
        </summary>
        <div className="mt-5 space-y-3 border-t border-white/[0.06] pt-5">
          {report.fullTranscript.map((turn: any) => (
            <div key={turn.turnId} className={`max-w-[88%] rounded-2xl p-4 text-sm leading-6 ${turn.speaker === 'candidate' ? 'ml-auto bg-indigo-500/10 border border-indigo-400/15 text-indigo-100' : 'bg-white/[0.025] border border-white/[0.06] text-slate-300'}`}>
              <p className="text-[9px] uppercase tracking-widest text-slate-500 mb-1">{turn.speaker} · {turn.phase.replaceAll('_', ' ')}</p>
              {turn.text}
            </div>
          ))}
        </div>
      </details>

      <div className="rounded-2xl border border-indigo-400/15 bg-indigo-400/[0.04] px-5 py-4 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between text-xs text-slate-400">
        <span><strong className="text-slate-200">Nonilion-ready concept:</strong> this report can be posted back into the persistent workspace as structured agent output.</span>
        <span className="text-indigo-300 whitespace-nowrap">agent.json · Workspace memory · BYOK</span>
      </div>
    </div>
  );
}
