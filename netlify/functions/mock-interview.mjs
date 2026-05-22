import { getAuthEmail, unauthorized } from "./clerk-auth.mjs";
import { getDb } from "./db.mjs";
import { CORS_HEADERS as CORS } from "./cors.mjs";
import { aiGate } from "./ai-gate.mjs";
import { callAI } from "./ai-service.mjs";
import { PROMPT_INJECTION_DEFENSE } from "./ai-config.mjs";

export const handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers: CORS, body: "" };
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

  let userEmail;
  try { userEmail = await getAuthEmail(event); }
  catch (err) { return { ...unauthorized(err.message), headers: CORS }; }

  const blocked = await aiGate(userEmail, CORS, { skipDailyLimit: true, fnName: 'mock_interview' });
  if (blocked) return blocked;

  try {
    const { problemTitle, difficulty, history, url, platform } = JSON.parse(event.body);
    
    if (!problemTitle || !history || !Array.isArray(history)) {
      return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Missing required parameters' }) };
    }

    const systemPrompt = `You are "Snowy", an elite Staff Software Engineer conducting a real placement interview. The candidate is solving: "${problemTitle}" (${difficulty} difficulty${platform ? ` on ${platform}` : ''})${url ? `\nProblem URL: ${url}` : ''}.

YOUR GOAL: Guide the candidate step-by-step until they arrive at the OPTIMAL solution on their own. Think of yourself as a GPS — you always know the destination and every message must move them one step closer to it.

GUIDANCE ARC — follow this progression in order:
Stage 1 (Opening): Ask how they would approach it. Listen for their initial idea.
Stage 2 (Brute Force): If they describe brute force, acknowledge it briefly ("Good start"), then immediately ask: "What is the time complexity of that? Can we do better?"
Stage 3 (Pattern Nudge): If stuck after brute force, give ONE concrete data-structure or algorithmic hint (e.g. "What if you used a hash map to avoid that inner loop?" or "Think about what stays constant as a window slides"). Never give two hints at once.
Stage 4 (Near Optimal): When they are close, ask them to state the final time and space complexity. Confirm if correct; if wrong, ask them to count operations again.
Stage 5 (Wrap-up): Once they have fully described the correct optimal approach, say exactly: "That is the intended solution — great answer." and stop guiding.

CRITICAL RULES:
1. NEVER WRITE CODE. If asked, say: "Tell me the logic in words and I will confirm if it is correct."
2. ALWAYS MOVE FORWARD. Every message must either confirm a correct step and push to the next stage, or correct a wrong path and re-steer. Never repeat the same hint twice.
3. CORRECT WRONG PATHS firmly but kindly: "That would miss some cases — think about what happens when..."
4. STAY ON TOPIC. Only discuss "${problemTitle}". Redirect anything off-topic back immediately.
5. BE CONCISE: 1 to 3 sentences per response. No walls of text.
6. NO MARKDOWN: Plain text only. No asterisks, backticks, bold, or code blocks.
7. REAL ENCOURAGEMENT: When the candidate makes genuine progress, say so ("Nice — that is the key insight").

8. ONE QUESTION AT A TIME: Never ask more than one question in a single response. Wait for the candidate to answer before moving forward.
9. SOCRATIC EXPLANATIONS: If you find yourself explaining a concept, immediately stop and turn that explanation into a question that asks the candidate to explain it instead.

If this is the first message, start with: "Walk me through your initial approach to ${problemTitle}."` + PROMPT_INJECTION_DEFENSE;

    const messages = [
      { role: 'system', content: systemPrompt },
      ...history
    ];



    const res = await callAI('mock_interview', messages, {});

    if (!res.ok) {
      console.error('AI service error:', await res.text());
      return { statusCode: 502, headers: CORS, body: JSON.stringify({ error: 'AI service error.' }) };
    }

    const d = await res.json();
    const content = d?.choices?.[0]?.message?.content;
    
    if (!content) {
      return { statusCode: 502, headers: CORS, body: JSON.stringify({ error: 'Unexpected AI response.' }) };
    }

    return { statusCode: 200, headers: CORS, body: JSON.stringify({ ok: true, data: { reply: content.trim() } }) };

  } catch (err) {
    console.error('Mock interview error:', err);
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: 'Internal server error.' }) };
  }
};
