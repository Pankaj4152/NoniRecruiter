import dotenv from 'dotenv';
import { ModelTrace } from './types';
dotenv.config();

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMCompletionOptions {
  temperature?: number;
  jsonMode?: boolean;
}

export interface LLMCompletionResult {
  text: string;
  trace: ModelTrace;
}

/**
 * Modular LLM Completion Function
 * Default provider: Gemini (via GEMINI_API_KEY)
 * Switch provider by setting process.env.LLM_PROVIDER = 'openai'
 */
export async function generateLLMCompletion(
  messages: LLMMessage[],
  options: LLMCompletionOptions = {}
): Promise<string> {
  return (await generateLLMCompletionDetailed(messages, options)).text;
}

export async function generateLLMCompletionDetailed(
  messages: LLMMessage[],
  options: LLMCompletionOptions = {}
): Promise<LLMCompletionResult> {
  const provider = process.env.LLM_PROVIDER || 'gemini';
  const callId = crypto.randomUUID().slice(0, 8);
  const startedAt = Date.now();
  console.info('[llm] request started', {
    callId,
    provider,
    messageCount: messages.length,
    jsonMode: Boolean(options.jsonMode),
  });

  let result: LLMCompletionResult;
  if (provider === 'gemini') {
    result = await callGemini(messages, options);
  } else if (provider === 'openai') {
    result = await callOpenAI(messages, options);
  } else {
    result = await callGemini(messages, options);
  }

  console.info('[llm] request completed', {
    callId,
    provider: result.trace.provider,
    model: result.trace.model,
    latencyMs: Date.now() - startedAt,
    usedFallback: result.trace.usedFallback,
    fallbackReason: result.trace.fallbackReason,
  });
  return result;
}

async function callGemini(
  messages: LLMMessage[],
  options: LLMCompletionOptions
): Promise<LLMCompletionResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL || 'gemini-3.6-flash';
  const startedAt = Date.now();

  if (!apiKey || apiKey.trim().length < 10) {
    return fallbackResult(messages, startedAt, 'Gemini API key is missing or invalid.');
  }

  try {
    const systemMsg = messages.find((m) => m.role === 'system')?.content || '';
    const conversationPrompt = messages
      .filter((m) => m.role !== 'system')
      .map((m) => `${m.role === 'user' ? 'Candidate' : 'Interviewer'}: ${m.content}`)
      .join('\n\n');

    const fullPrompt = `${systemMsg}\n\n=== CONVERSATION HISTORY ===\n${conversationPrompt}\n\nGenerate response:`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({
        contents: [{ parts: [{ text: fullPrompt }] }],
        generationConfig: {
          temperature: options.temperature ?? 0.7,
          responseMimeType: options.jsonMode ? 'application/json' : 'text/plain',
        },
      }),
    });

    if (!response.ok) {
      return fallbackResult(messages, startedAt, `Gemini request failed with HTTP ${response.status}.`);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) return fallbackResult(messages, startedAt, 'Gemini returned an empty response.');
    return { text, trace: { provider: 'gemini', model, latencyMs: Date.now() - startedAt, usedFallback: false } };
  } catch (error) {
    return fallbackResult(messages, startedAt, error instanceof Error ? error.message : 'Gemini request failed.');
  }
}

async function callOpenAI(
  messages: LLMMessage[],
  options: LLMCompletionOptions
): Promise<LLMCompletionResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
  const startedAt = Date.now();

  if (!apiKey) {
    return fallbackResult(messages, startedAt, 'OpenAI API key is missing.');
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
        temperature: options.temperature ?? 0.7,
        response_format: options.jsonMode ? { type: 'json_object' } : undefined,
      }),
    });

    if (!response.ok) return fallbackResult(messages, startedAt, `OpenAI request failed with HTTP ${response.status}.`);
    const data = await response.json();
    const text = data.choices?.[0]?.message?.content;
    if (!text) return fallbackResult(messages, startedAt, 'OpenAI returned an empty response.');
    return { text, trace: { provider: 'openai', model, latencyMs: Date.now() - startedAt, usedFallback: false } };
  } catch (error) {
    return fallbackResult(messages, startedAt, error instanceof Error ? error.message : 'OpenAI request failed.');
  }
}

function fallbackResult(messages: LLMMessage[], startedAt: number, reason: string): LLMCompletionResult {
  return {
    text: generateMockResponse(messages),
    trace: {
      provider: 'demo-fallback',
      model: 'deterministic-v1',
      latencyMs: Date.now() - startedAt,
      usedFallback: true,
      fallbackReason: reason,
    },
  };
}

/**
 * Intelligent Response Generator adapting to Candidate turn history & content
 */
function generateMockResponse(messages: LLMMessage[]): string {
  const userMessages = messages.filter((m) => m.role === 'user');
  const lastUserText = (userMessages[userMessages.length - 1]?.content || '').toLowerCase();
  const assistantTurns = messages.filter((m) => m.role === 'assistant').length;
  const systemText = messages.find((m) => m.role === 'system')?.content || '';
  const candidateName = systemText.match(/Name:\s*([^\n]+)/)?.[1]?.trim() || 'there';
  const isBrief = lastUserText.split(/\s+/).filter(Boolean).length < 18;

  if (systemText.includes('Interview Evaluator')) {
    const originalPrompt = userMessages[userMessages.length - 1]?.content || '';
    const answer = originalPrompt.match(/=== CANDIDATE ANSWER ===\s*"([\s\S]*?)"\s*=== EVALUATION CRITERIA ===/)?.[1]?.trim() || '';
    const wordCount = answer.split(/\s+/).filter(Boolean).length;
    const hasTradeoffs = /trade-?off|because|instead|alternative|chose/i.test(answer);
    const hasMeasurement = /latency|metric|measur|percent|ms\b|second/i.test(answer);
    const technical = Math.min(9, 5 + (wordCount > 18 ? 1 : 0) + (hasTradeoffs ? 1 : 0) + (hasMeasurement ? 1 : 0));
    const communication = Math.min(9, 5 + (wordCount > 12 ? 1 : 0) + (wordCount > 30 ? 1 : 0));
    const problemSolving = Math.min(9, 5 + (hasTradeoffs ? 2 : 0) + (hasMeasurement ? 1 : 0));
    const evidence = selectEvidenceQuote(answer);
    return JSON.stringify({
      technicalAccuracyScore: technical,
      communicationScore: communication,
      problemSolvingScore: problemSolving,
      strengthsEvidence: evidence ? [evidence] : [],
      redFlagsEvidence: [],
      feedbackNotes: wordCount < 18
        ? 'Add implementation detail, metrics, and explicit trade-offs.'
        : !hasTradeoffs && !hasMeasurement
          ? 'Follow up on architecture alternatives, validation method, and measurable outcomes.'
          : !hasTradeoffs
            ? 'Follow up on rejected alternatives and why the selected approach was preferable.'
            : !hasMeasurement
              ? 'Follow up on before-and-after metrics used to validate the decision.'
              : 'Evidence was specific and included both decision rationale and measurement.',
    });
  }

  // Initial Turn 0
  if (assistantTurns === 0) {
    return JSON.stringify({
      interviewerResponse: `Hello ${candidateName}! Welcome to your technical interview. To start, could you introduce yourself and highlight one project most relevant to this role?`,
      nextPhase: "WARMUP",
      shouldProbeDeeper: false,
      shouldEndInterview: false,
      reasoning: "Greeting candidate and starting warmup phase."
    });
  }

  // Turn 1 Response (Candidate introduction or project highlight)
  if (assistantTurns === 1) {
    return JSON.stringify({
      interviewerResponse: "Thanks for that overview. Pick the most technically difficult part of that project: what architecture did you choose, what alternatives did you reject, and why?",
      nextPhase: "TECHNICAL_PROBING",
      shouldProbeDeeper: true,
      shouldEndInterview: false,
      reasoning: "Transitioning to technical probing phase."
    });
  }

  // Turn 2 Response (Async Voice / Architecture Probing)
  if (assistantTurns === 2) {
    return JSON.stringify({
      interviewerResponse: isBrief
        ? "I’d like to go one level deeper. What failure modes did you observe, and how did the system detect, recover from, and measure them?"
        : "Building on those trade-offs, how did you measure latency and reliability, and what would you redesign at ten times the traffic?",
      nextPhase: "TECHNICAL_PROBING",
      shouldProbeDeeper: isBrief,
      shouldEndInterview: false,
      reasoning: "Probing technical depth based on answer specificity."
    });
  }

  // Turn 3 Response (Behavioral / STAR)
  if (assistantTurns >= 3) {
    return JSON.stringify({
      interviewerResponse: "Thank you for sharing those insights! That wraps up our technical interview session today. Our team will review your responses and generate your evidence report card.",
      nextPhase: "CLOSING",
      shouldProbeDeeper: false,
      shouldEndInterview: true,
      terminationReason: "Completed technical probing & background verification.",
      reasoning: "Closing interview session autonomously."
    });
  }

  return JSON.stringify({
    interviewerResponse: `Thanks for sharing that perspective! Building on what you said, can you describe a challenging technical situation you encountered and how you resolved it?`,
    nextPhase: "TECHNICAL_PROBING",
    shouldProbeDeeper: false,
    shouldEndInterview: false,
    reasoning: "Adapting question to candidate input."
  });
}

function selectEvidenceQuote(answer: string): string {
  const cleaned = answer.replace(/(?:^|\s)>>?\s*/g, ' ').replace(/\s+/g, ' ').trim();
  const sentences = cleaned.match(/[^.!?]+[.!?]+|[^.!?]+$/g)?.map((sentence) => sentence.trim()).filter(Boolean) || [];
  const meaningful = sentences.find((sentence) => sentence.split(/\s+/).length >= 10) || sentences[0] || '';
  if (meaningful.length <= 220) return meaningful;
  const words = meaningful.split(/\s+/);
  let quote = '';
  for (const word of words) {
    if (`${quote} ${word}`.trim().length > 217) break;
    quote = `${quote} ${word}`.trim();
  }
  return quote;
}
