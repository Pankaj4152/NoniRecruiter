'use client';

import { useState } from 'react';
import { Code2, Play, X, Check, Copy, Terminal, Loader2 } from 'lucide-react';
import { executeCodeInSandbox } from '@/lib/interview/sandbox';
import { SandboxExecutionResult } from '@/lib/interview/types';

interface CodeEditorProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitCode: (code: string, language: string, executionResult?: SandboxExecutionResult) => void;
  onPasteEvent?: (pastedLength: number) => void;
  disabled?: boolean;
}

const LANGUAGE_TEMPLATES: Record<string, string> = {
  typescript: `// Write your TypeScript solution here
function solveProblem(input: number[]): number {
  return input.reduce((acc, curr) => acc + curr, 0);
}

console.log("Result:", solveProblem([10, 20, 30]));
`,
  javascript: `// Write your JavaScript solution here
function solveProblem(input) {
  return input.reduce((acc, curr) => acc + curr, 0);
}

console.log("Result:", solveProblem([10, 20, 30]));
`,
  python: `# Write your Python solution here
def solve_problem(data: list) -> int:
    return sum(data)

print("Result:", solve_problem([10, 20, 30]))
`,
  cpp: `// Write your C++ solution here
#include <iostream>
#include <vector>
#include <numeric>

int main() {
    std::vector<int> nums = {10, 20, 30};
    int sum = 0;
    for(int n : nums) sum += n;
    std::cout << "Result: " << sum << std::endl;
    return 0;
}
`,
};

export default function CodeEditor({ isOpen, onClose, onSubmitCode, onPasteEvent, disabled }: CodeEditorProps) {
  const [language, setLanguage] = useState<string>('typescript');
  const [code, setCode] = useState<string>(LANGUAGE_TEMPLATES.typescript);
  const [copied, setCopied] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [executionResult, setExecutionResult] = useState<SandboxExecutionResult | null>(null);

  if (!isOpen) return null;

  function handleLanguageChange(newLang: string) {
    setLanguage(newLang);
    setCode(LANGUAGE_TEMPLATES[newLang] || `// Write your solution in ${newLang}`);
    setExecutionResult(null);
  }

  function handleCopy() {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handlePaste(e: React.ClipboardEvent<HTMLTextAreaElement>) {
    const pastedText = e.clipboardData.getData('text');
    if (pastedText && onPasteEvent) {
      onPasteEvent(pastedText.length);
    }
  }

  async function handleRunCode() {
    if (!code.trim() || isRunning) return;
    setIsRunning(true);
    setExecutionResult(null);

    try {
      const result = await executeCodeInSandbox(code, language);
      setExecutionResult(result);
    } catch (err: any) {
      setExecutionResult({
        language,
        stdout: '',
        stderr: err.message || 'Sandbox execution error',
        exitCode: 1,
        executionTimeMs: 0,
        status: 'ERROR',
      });
    } finally {
      setIsRunning(false);
    }
  }

  function handleSubmit() {
    if (!code.trim() || disabled) return;
    const formattedSubmission = `\`\`\`${language}\n${code.trim()}\n\`\`\``;
    onSubmitCode(formattedSubmission, language, executionResult || undefined);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="hud-panel w-full max-w-4xl rounded-2xl border border-[#f36b21]/40 bg-[#0d0d0f] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/15 px-5 py-3.5 bg-black/40">
          <div className="flex items-center gap-3">
            <span className="grid h-8 w-8 place-items-center rounded-lg border border-[#f36b21]/40 bg-[#f36b21]/15 text-[#f4a275]">
              <Code2 className="h-4 w-4" />
            </span>
            <div>
              <h3 className="font-mono text-sm font-bold uppercase tracking-wider text-[#f0eee9]">Live Code Sandbox & Editor</h3>
              <p className="text-[11px] text-[#88847d]">Write code, execute in isolated Piston sandbox, and submit to interviewer</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <select
              value={language}
              onChange={(e) => handleLanguageChange(e.target.value)}
              className="terminal-input px-3 py-1.5 text-xs font-mono bg-black/50 text-[#f4a275] border border-white/20 rounded-md outline-none"
            >
              <option value="typescript">TypeScript</option>
              <option value="python">Python</option>
              <option value="javascript">JavaScript</option>
              <option value="cpp">C++</option>
            </select>

            <button
              onClick={handleCopy}
              className="p-1.5 text-[#88847d] hover:text-white transition"
              title="Copy code"
            >
              {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-[#88847d] hover:text-white transition"
              title="Close editor"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Code Input Area */}
        <div className="relative flex-1 p-4 bg-[#08080a] font-mono text-xs overflow-auto min-h-[220px]">
          <textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            onPaste={handlePaste}
            disabled={disabled || isRunning}
            spellCheck={false}
            rows={14}
            className="w-full h-full bg-transparent text-[#e2ded6] outline-none resize-none font-mono text-xs leading-6 selection:bg-[#f36b21]/30"
            placeholder="Type your code solution here..."
          />
        </div>

        {/* Terminal Sandbox Execution Output Panel */}
        {executionResult && (
          <div className="border-t border-white/15 bg-black/70 p-4 font-mono text-xs">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-[11px] font-bold tracking-wide uppercase text-amber-400">
                <Terminal className="h-3.5 w-3.5" />
                <span>Piston Sandbox Execution Logs</span>
                <span className={`px-2 py-0.5 rounded text-[10px] ${executionResult.status === 'SUCCESS' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'}`}>
                  {executionResult.status} ({executionResult.executionTimeMs}ms)
                </span>
              </div>
            </div>

            {executionResult.stdout && (
              <div className="mb-2">
                <span className="text-[10px] text-emerald-400 font-bold block mb-1">STDOUT:</span>
                <pre className="text-emerald-300/90 whitespace-pre-wrap bg-emerald-950/20 p-2.5 rounded border border-emerald-500/20 text-[11px] font-mono">
                  {executionResult.stdout}
                </pre>
              </div>
            )}

            {executionResult.stderr && (
              <div>
                <span className="text-[10px] text-rose-400 font-bold block mb-1">STDERR:</span>
                <pre className="text-rose-300/90 whitespace-pre-wrap bg-rose-950/20 p-2.5 rounded border border-rose-500/20 text-[11px] font-mono">
                  {executionResult.stderr}
                </pre>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-white/15 px-5 py-3 bg-black/40">
          <span className="text-[11px] font-mono text-[#77736c]">
            {isRunning ? 'Executing code in isolated Docker/Piston sandbox...' : 'Run code to verify logic before final submission.'}
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleRunCode}
              disabled={isRunning || !code.trim()}
              className="flex items-center gap-2 px-4 py-2 text-xs font-mono uppercase tracking-wider rounded border border-amber-500/40 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 disabled:opacity-50 transition"
            >
              {isRunning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Terminal className="h-3.5 w-3.5" />}
              {isRunning ? 'Running...' : 'Run Code'}
            </button>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={disabled || isRunning || !code.trim()}
              className="terminal-button flex items-center gap-2 px-5 py-2.5 text-xs font-mono font-bold uppercase tracking-wider disabled:opacity-50"
            >
              <Play className="h-3.5 w-3.5 fill-current" /> Submit Code Solution
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
