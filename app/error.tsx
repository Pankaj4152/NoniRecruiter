'use client';

import { useEffect } from 'react';

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('[client-error]', { message: error.message, digest: error.digest, stack: error.stack });
  }, [error]);

  return (
    <main className="mx-auto grid min-h-[calc(100vh-3.5rem)] max-w-lg place-items-center px-5 text-center">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Something went wrong</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">{error.message || 'The interview screen could not be loaded.'}</p>
        {error.digest && <p className="mt-2 font-mono text-xs text-slate-400">Error ID: {error.digest}</p>}
        <div className="mt-5 flex justify-center gap-3">
          <button onClick={reset} className="rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white">Try again</button>
          <a href="/" className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700">New interview</a>
        </div>
      </div>
    </main>
  );
}
