import Link from 'next/link';
import { ArrowRight, BriefcaseBusiness, Play, ShieldCheck, Sparkles } from 'lucide-react';

export default function LandingPage() {
  return <main className="office-shell min-h-[calc(100vh-4rem)]">
    <div className="game-grid pointer-events-none absolute inset-0" />
    <div className="relative mx-auto flex min-h-[calc(100vh-4rem)] max-w-6xl items-center px-5 py-12 sm:px-8">
      <div className="grid w-full items-center gap-10 lg:grid-cols-[1.05fr_.95fr]">
        <section>
          <span className="terminal-label"><Sparkles className="mr-2 h-3.5 w-3.5" /> Autonomous interview workspace</span>
          <h1 className="mt-6 max-w-3xl text-5xl font-black uppercase leading-[.92] tracking-[-.055em] text-white sm:text-7xl">Turn role context into a focused interview.</h1>
          <p className="mt-6 max-w-xl text-base leading-7 text-[#bbb6ad]">Configure the role once, generate a candidate invitation, and receive a quote-backed hiring report after the interview.</p>
          <div className="mt-7 flex flex-wrap gap-3 text-[10px] font-bold uppercase tracking-wider text-[#9b968e]"><span className="quest-chip quest-chip-active px-3 py-2">Resume grounded</span><span className="quest-chip px-3 py-2">Time aware</span><span className="quest-chip px-3 py-2">Evidence backed</span></div>
        </section>
        <section className="mission-card setup-overlay p-5 sm:p-7">
          <p className="system-kicker text-[#f08b53]">Choose your path</p>
          <div className="mt-5 space-y-3">
            <Link href="/create" className="group block border border-[#f36b21]/45 bg-[#f36b21]/10 p-5 transition hover:bg-[#f36b21]/15"><div className="flex items-start gap-4"><span className="grid h-11 w-11 shrink-0 place-items-center bg-[#f36b21] text-black"><BriefcaseBusiness className="h-5 w-5" /></span><div className="flex-1"><h2 className="font-black uppercase text-white">Create an interview</h2><p className="mt-1 text-xs leading-5 text-[#aaa69e]">For recruiters · add a resume, role context, duration, and private guidance.</p></div><ArrowRight className="mt-3 h-4 w-4 text-[#f08b53] transition group-hover:translate-x-1" /></div></Link>
            <Link href="/demo" className="group block border border-white/15 bg-black/25 p-5 transition hover:border-[#f36b21]/45 hover:bg-[#f36b21]/[.06]"><div className="flex items-start gap-4"><span className="grid h-11 w-11 shrink-0 place-items-center border border-white/15 text-[#f08b53]"><Play className="h-5 w-5" /></span><div className="flex-1"><div className="flex items-center gap-2"><h2 className="font-black uppercase text-[#e2ded6]">Try a sample interview</h2><span className="system-code border border-emerald-400/20 px-2 py-1 text-emerald-300">3 roles</span></div><p className="mt-1 text-xs leading-5 text-[#88847d]">Launch a fictional five-minute tech interview with no setup.</p></div><ArrowRight className="mt-3 h-4 w-4 text-[#f08b53] transition group-hover:translate-x-1" /></div></Link>
          </div>
          <div className="mt-5 flex items-center gap-2 border-t border-white/10 pt-4 text-[10px] text-[#77736c]"><ShieldCheck className="h-4 w-4 text-emerald-400" /><span>Recruiter configuration stays separate from the candidate experience.</span></div>
        </section>
      </div>
    </div>
  </main>;
}
