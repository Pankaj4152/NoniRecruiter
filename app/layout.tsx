import './globals.css';
import React from 'react';

export const metadata = {
  title: 'NoniRecruiter — AI Interviewer',
  description: 'Adaptive interviews with evidence-backed evaluation reports.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased selection:bg-indigo-100 selection:text-indigo-950">
        <div className="min-h-screen">
          <header className="border-b border-slate-200 bg-white">
            <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-5">
              <div className="flex items-center gap-2.5">
                <span className="grid h-7 w-7 place-items-center rounded-lg bg-slate-900 text-xs font-bold text-white">N</span>
                <span className="text-sm font-semibold tracking-tight text-slate-900">NoniRecruiter</span>
              </div>
              <span className="text-xs text-slate-400">AI interview demo</span>
            </div>
          </header>
          {children}
        </div>
      </body>
    </html>
  );
}
