import { SandboxExecutionResult } from './types';

const PISTON_API_URL = process.env.NEXT_PUBLIC_PISTON_URL || 'https://emkc.org/api/v2/piston/execute';
const LANGUAGES: Record<string, { version: string; filename: string }> = {
  typescript: { version: '5.0.3', filename: 'solution.ts' },
  javascript: { version: '18.15.0', filename: 'solution.js' },
  python: { version: '3.10.0', filename: 'solution.py' },
  cpp: { version: '10.2.0', filename: 'solution.cpp' },
};

/** Preview execution only. Browser results must never be trusted as grading evidence. */
export async function executeCodeInSandbox(code: string, language = 'typescript'): Promise<SandboxExecutionResult> {
  const startedAt = Date.now();
  const normalized = language.toLowerCase().trim();
  const config = LANGUAGES[normalized];
  const unavailable = (message: string): SandboxExecutionResult => ({
    language: normalized, stdout: '', stderr: message, exitCode: -1,
    executionTimeMs: Date.now() - startedAt, status: 'ERROR',
  });
  if (!config) return unavailable('Unsupported language.');
  if (!code.trim() || code.length > 12000) return unavailable('Enter between 1 and 12,000 characters of code.');
  try {
    const response = await fetch(PISTON_API_URL, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(20000),
      body: JSON.stringify({ language: normalized, version: config.version,
        files: [{ name: config.filename, content: code }], run_timeout: 5000, compile_timeout: 10000 }),
    });
    if (!response.ok) return unavailable(`Execution service unavailable (HTTP ${response.status}). Code was not verified.`);
    const data = await response.json();
    const result = data.compile && (data.compile.code !== 0 || data.compile.signal)
      ? data.compile : data.run;
    if (!result || !Number.isInteger(result.code)) return unavailable('Execution did not complete. Code was not verified.');
    return {
      language: normalized,
      stdout: typeof result.stdout === 'string' ? result.stdout.slice(0, 20000) : '',
      stderr: typeof result.stderr === 'string' ? result.stderr.slice(0, 20000) : '',
      exitCode: result.code, executionTimeMs: Date.now() - startedAt,
      status: result.code === 0 && !result.signal ? 'SUCCESS' : 'ERROR',
    };
  } catch {
    return unavailable('Execution service could not be reached or timed out. Code was not verified.');
  }
}
