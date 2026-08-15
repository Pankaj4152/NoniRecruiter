import assert from 'node:assert/strict';
import { generateLLMCompletionDetailed } from '../lib/interview/llm';

const previousProvider = process.env.LLM_PROVIDER;
const previousGeminiKey = process.env.GEMINI_API_KEY;
process.env.LLM_PROVIDER = 'gemini';
process.env.GEMINI_API_KEY = '';

const completion = await generateLLMCompletionDetailed([
  { role: 'system', content: 'You are an interviewer. Name: Trace Test' },
  { role: 'user', content: 'Initialize the interview.' },
], { jsonMode: true });

assert.equal(completion.trace.provider, 'demo-fallback');
assert.equal(completion.trace.model, 'deterministic-v1');
assert.equal(completion.trace.usedFallback, true);
assert.ok(completion.trace.fallbackReason);
assert.ok(completion.text.includes('interviewerResponse'));

if (previousProvider === undefined) delete process.env.LLM_PROVIDER;
else process.env.LLM_PROVIDER = previousProvider;
if (previousGeminiKey === undefined) delete process.env.GEMINI_API_KEY;
else process.env.GEMINI_API_KEY = previousGeminiKey;

console.log('Provider trace and fallback visibility tests passed.');
