'use client';

import { Check } from 'lucide-react';
import { InterviewPhase } from '@/lib/interview/types';

const phases: { id: InterviewPhase; label: string }[] = [
  { id: 'WARMUP', label: 'Warmup & context' },
  { id: 'TECHNICAL_PROBING', label: 'Technical depth' },
  { id: 'BEHAVIORAL', label: 'Behavioral evidence' },
  { id: 'CLOSING', label: 'Closing & Q&A' },
];

export default function PhaseIndicator({ currentPhase }: { currentPhase: InterviewPhase }) {
  const currentIndex = currentPhase === 'COMPLETED' ? phases.length : Math.max(0, phases.findIndex((phase) => phase.id === currentPhase));
  return (
    <div className="surface-card rounded-2xl p-3 flex items-center gap-2 overflow-x-auto">
      {phases.map((phase, index) => {
        const active = index === currentIndex;
        const passed = index < currentIndex;
        return (
          <div key={phase.id} className="flex items-center gap-2 flex-1 min-w-[150px]">
            <div className={`w-7 h-7 shrink-0 rounded-full flex items-center justify-center text-xs font-bold ${active ? 'bg-cyan-300 text-slate-950 shadow-lg shadow-cyan-400/25' : passed ? 'bg-emerald-400/15 border border-emerald-400/30 text-emerald-300' : 'bg-slate-800 border border-slate-700 text-slate-500'}`}>
              {passed ? <Check className="w-3.5 h-3.5" /> : index + 1}
            </div>
            <span className={`text-[11px] font-semibold whitespace-nowrap ${active ? 'text-cyan-200' : passed ? 'text-emerald-300/80' : 'text-slate-500'}`}>{phase.label}</span>
            {index < phases.length - 1 && <div className={`h-px min-w-4 flex-1 ${passed ? 'bg-emerald-400/30' : 'bg-slate-800'}`} />}
          </div>
        );
      })}
    </div>
  );
}
