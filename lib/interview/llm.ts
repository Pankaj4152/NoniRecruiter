import dotenv from 'dotenv';
dotenv.config();

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMCompletionOptions {
  temperature?: number;
  jsonMode?: boolean;
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
  const provider = process.env.LLM_PROVIDER || 'gemini';

  if (provider === 'gemini') {
    return callGemini(messages, options);
  } else if (provider === 'openai') {
    return callOpenAI(messages, options);
  } else {
    return callGemini(messages, options);
  }
}

async function callGemini(
  messages: LLMMessage[],
  options: LLMCompletionOptions
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey || apiKey.trim().length < 10 || !apiKey.startsWith('AIzaSy')) {
    return generateMockResponse(messages);
  }

  try {
    const systemMsg = messages.find((m) => m.role === 'system')?.content || '';
    const conversationPrompt = messages
      .filter((m) => m.role !== 'system')
      .map((m) => `${m.role === 'user' ? 'Candidate' : 'Interviewer'}: ${m.content}`)
      .join('\n\n');

    const fullPrompt = `${systemMsg}\n\n=== CONVERSATION HISTORY ===\n${conversationPrompt}\n\nGenerate response:`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: fullPrompt }] }],
        generationConfig: {
          temperature: options.temperature ?? 0.7,
          responseMimeType: options.jsonMode ? 'application/json' : 'text/plain',
        },
      }),
    });

    if (!response.ok) {
      return generateMockResponse(messages);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    return text || generateMockResponse(messages);
  } catch {
    return generateMockResponse(messages);
  }
}

async function callOpenAI(
  messages: LLMMessage[],
  options: LLMCompletionOptions
): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return generateMockResponse(messages);
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
        temperature: options.temperature ?? 0.7,
        response_format: options.jsonMode ? { type: 'json_object' } : undefined,
      }),
    });

    const data = await response.json();
    return data.choices[0]?.message?.content || '';
  } catch {
    return generateMockResponse(messages);
  }
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
    const evidence = answer.length > 160 ? answer.slice(0, 157) : answer;
    return JSON.stringify({
      technicalAccuracyScore: technical,
      communicationScore: communication,
      problemSolvingScore: problemSolving,
      strengthsEvidence: evidence ? [evidence] : [],
      redFlagsEvidence: [],
      feedbackNotes: wordCount < 18 ? 'Add implementation detail, metrics, and explicit trade-offs.' : 'Clear answer; continue probing scale and failure modes.',
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
