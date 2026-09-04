'use client';

import { useState } from 'react';
import { Code2, Play, X, Check, Copy } from 'lucide-react';

interface CodeEditorProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitCode: (code: string, language: string) => void;
  disabled?: boolean;
}

const LANGUAGE_TEMPLATES: Record<string, string> = {
  typescript: `// Write your TypeScript solution here
function solveProblem(input: string[]): Record<string, any> {
  const result = {};
  
  // Implementation
  
  return result;
}`,
  python: `# Write your Python solution here
def solve_problem(data: list) -> dict:
    result = {}
    
    # Implementation
    
    return result
`,
  javascript: `// Write your JavaScript solution here
function solveProblem(input) {
  const result = {};
  
  // Implementation
  
  return result;
}`,
  cpp: `// Write your C++ solution here
#include <iostream>
#include <vector>

void solveProblem() {
    // Implementation
}
`,
};

export default function CodeEditor({ isOpen, onClose, onSubmitCode, disabled }: CodeEditorProps) {
  const [language, setLanguage] = useState<string>('typescript');
  const [code, setCode] = useState<string>(LANGUAGE_TEMPLATES.typescript);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  function handleLanguageChange(newLang: string) {
    setLanguage(newLang);
    setCode(LANGUAGE_TEMPLATES[newLang] || `// Write your solution in ${newLang}`);
  }

  function handleCopy() {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleSubmit() {
    if (!code.trim() || disabled) return;
    const formattedSubmission = `\`\`\`${language}\n${code.trim()}\n\`\`\``;
    onSubmitCode(formattedSubmission, language);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="hud-panel w-full max-w-4xl rounded-2xl border border-[#f36b21]/40 bg-[#0d0d0f] shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/15 px-5 py-3.5 bg-black/40">
          <div className="flex items-center gap-3">
            <span className="grid h-8 w-8 place-items-center rounded-lg border border-[#f36b21]/40 bg-[#f36b21]/15 text-[#f4a275]">
              <Code2 className="h-4 w-4" />
            </span>
            <div>
              <h3 className="font-mono text-sm font-bold uppercase tracking-wider text-[#f0eee9]">Live Code Editor</h3>
              <p className="text-[11px] text-[#88847d]">Write & submit code solution to interviewer</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <select
              value={language}
              onChange={(e) => handleLanguageChange(e.target.value)}
              className="terminal-input px-3 py-1.5 text-xs font-mono bg-black/50 text-[#f4a275] border border-white/20 rounded-md"
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

        {/* Code Area */}
        <div className="relative flex-1 p-4 bg-[#08080a] font-mono text-xs overflow-auto">
          <textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            disabled={disabled}
            spellCheck={false}
            rows={16}
            className="w-full h-full bg-transparent text-[#e2ded6] outline-none resize-none font-mono text-xs leading-6 selection:bg-[#f36b21]/30"
            placeholder="Type your code solution here..."
          />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-white/15 px-5 py-3 bg-black/40">
          <span className="text-[11px] font-mono text-[#77736c]">
            Pressing Submit formats & evaluates your solution in the interview log.
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-mono uppercase tracking-wider text-[#aaa7a0] hover:text-white"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={disabled || !code.trim()}
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
