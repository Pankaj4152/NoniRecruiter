import './globals.css';
import React from 'react';

export const metadata = {
  title: 'NoniRecruiter — AI Interviewer',
  description: 'Adaptive interviews with evidence-backed evaluation reports.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased selection:bg-orange-500 selection:text-black">
        <div className="min-h-screen bg-[#080a0d]">
          <header className="relative z-50 border-b border-white/10 bg-[#090b0e]/95">
            <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:px-7">
              <a href="/" className="flex items-center gap-3">
                <span className="grid h-8 w-8 place-items-center border border-white/20 bg-white/[.04] font-mono text-xs font-black text-[#f36b21]">NR</span>
                <span>
                  <span className="block text-sm font-bold tracking-tight text-[#f0eee9]">NoniRecruiter</span>
                  <span className="block font-mono text-[8px] uppercase tracking-[.16em] text-[#77746e]">Interview systems · v0.1</span>
                </span>
              </a>
              <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-slate-400">
                <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400 shadow-[0_0_10px_#4ade80]" />
                <span className="hidden sm:inline">System online</span>
              </div>
            </div>
          </header>
          {children}
        </div>
      </body>
    </html>
  );
}
