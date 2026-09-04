import { SandboxExecutionResult } from './types';

/**
 * Piston API integration for isolated, real-time code sandbox execution.
 * Free public multi-language execution engine (EMKC Piston v2 API).
 */
const PISTON_API_URL = 'https://emkc.org/api/v2/piston/execute';

// Map editor language names to Piston language identifiers and standard filenames
const LANGUAGE_CONFIG: Record<string, { pistonLang: string; version: string; filename: string }> = {
  typescript: { pistonLang: 'typescript', version: '5.0.3', filename: 'solution.ts' },
  javascript: { pistonLang: 'javascript', version: '18.15.0', filename: 'solution.js' },
  python: { pistonLang: 'python', version: '3.10.0', filename: 'solution.py' },
  cpp: { pistonLang: 'cpp', version: '10.2.0', filename: 'solution.cpp' },
  go: { pistonLang: 'go', version: '1.16.2', filename: 'solution.go' },
  java: { pistonLang: 'java', version: '15.0.2', filename: 'Solution.java' },
  rust: { pistonLang: 'rust', version: '1.68.2', filename: 'solution.rs' },
};

export async function executeCodeInSandbox(
  code: string,
  language: string = 'typescript'
): Promise<SandboxExecutionResult> {
  const startTime = Date.now();
  const normalizedLang = language.toLowerCase().trim();
  const config = LANGUAGE_CONFIG[normalizedLang] || LANGUAGE_CONFIG['typescript'];

  try {
    const response = await fetch(PISTON_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        language: config.pistonLang,
        version: config.version,
        files: [
          {
            name: config.filename,
            content: code,
          },
        ],
        run_timeout: 5000, // 5 second timeout limit
        compile_timeout: 10000,
      }),
    });

    const executionTimeMs = Date.now() - startTime;

    if (!response.ok) {
      return {
        language: config.pistonLang,
        stdout: '',
        stderr: `Piston sandbox HTTP error: ${response.status} ${response.statusText}`,
        exitCode: 1,
        executionTimeMs,
        status: 'ERROR',
      };
    }

    const data = await response.json();
    const runResult = data.run || {};
    const stdout = (runResult.stdout || '').trim();
    const stderr = (runResult.stderr || (data.compile ? data.compile.stderr : '') || '').trim();
    const exitCode = runResult.code ?? (stderr ? 1 : 0);

    return {
      language: config.pistonLang,
      stdout,
      stderr,
      exitCode,
      executionTimeMs,
      status: exitCode === 0 ? 'SUCCESS' : 'ERROR',
    };
  } catch (error: any) {
    return {
      language: config.pistonLang,
      stdout: '',
      stderr: `Sandbox execution failed: ${error.message || String(error)}`,
      exitCode: 1,
      executionTimeMs: Date.now() - startTime,
      status: 'ERROR',
    };
  }
}
