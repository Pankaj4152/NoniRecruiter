import './globals.css';
import React from 'react';

export const metadata = {
  title: 'NoniRecruiter - AI Interview Workspace',
  description: 'Adaptive AI technical interview agent with evidence-backed evaluation reports.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-slate-950 text-slate-100 antialiased selection:bg-indigo-500 selection:text-white">
        <div className="min-h-screen flex flex-col">
          {/* Top Bar Navigation Header */}
          <header className="h-16 border-b border-white/[0.07] bg-[#070b12]/80 backdrop-blur-xl px-6 flex items-center justify-between sticky top-0 z-50">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-cyan-400 flex items-center justify-center font-bold text-slate-950 shadow-lg shadow-indigo-500/20">
                N
              </div>
              <div>
                <span className="font-bold text-lg tracking-tight text-white">NoniRecruiter</span>
                <span className="ml-2 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                  Concept Agent
                </span>
              </div>
            </div>
            <div className="flex items-center gap-4 text-xs text-slate-400">
              <span className="hidden sm:flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-indigo-400"></span>
                Demo environment ready
              </span>
            </div>
          </header>

          <main className="flex-1 flex flex-col">{children}</main>
        </div>
      </body>
    </html>
  );
}
