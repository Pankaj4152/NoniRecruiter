'use client';

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  console.error('[global-client-error]', error);
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif', background: '#f6f7f9', color: '#172033' }}>
        <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 20, textAlign: 'center' }}>
          <div>
            <h1 style={{ fontSize: 22, margin: 0 }}>NoniRecruiter could not load</h1>
            <p style={{ color: '#64748b', fontSize: 14 }}>{error.message || 'An unexpected browser error occurred.'}</p>
            <button onClick={reset} style={{ border: 0, borderRadius: 8, background: '#0f172a', color: 'white', padding: '10px 16px', cursor: 'pointer' }}>Reload application</button>
          </div>
        </main>
      </body>
    </html>
  );
}
