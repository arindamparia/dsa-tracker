import { getAuthEmail, unauthorized } from "./clerk-auth.mjs";
import { getDb } from "./db.mjs";
import { CORS_HEADERS as CORS } from "./cors.mjs";
import { aiGate } from "./ai-gate.mjs";
import { callAI } from "./ai-service.mjs";

export const handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers: CORS, body: "" };
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

  let userEmail;
  try { userEmail = await getAuthEmail(event); }
  catch (err) { return { ...unauthorized(err.message), headers: CORS }; }

  const blocked = await aiGate(userEmail, CORS);
  if (blocked) return blocked;

  try {
    const { problemTitle, difficulty, history } = JSON.parse(event.body);
    
    if (!problemTitle || !history || !Array.isArray(history)) {
      return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Missing required parameters' }) };
    }

    const systemPrompt = `You are "Snowy", an elite Staff Software Engineer and strict but supportive MAANG interviewer. The candidate is solving: "${problemTitle}" (${difficulty} difficulty).

CRITICAL CONSTRAINTS:
1. NEVER WRITE CODE. Your ONLY purpose is to help the candidate build the logic and approach. If the user asks for code or the exact solution, refuse politely and ask a guiding question instead.
2. STAY ON TOPIC. You must ONLY discuss the problem "${problemTitle}". If the user talks about anything else (general chat, other topics, off-topic questions), redirect them immediately back to the interview problem.
3. Use the Socratic method: Ask guiding questions, give subtle hints, and point out logical flaws. 
4. Keep responses extremely concise (1-2 sentences max). Do not break character. Maintain a professional but friendly mentor tone without excessive dog puns.
5. NO MARKDOWN: Send PLAIN TEXT ONLY. Never use backticks, asterisks, bold, italics, or code blocks. The output is displayed in a raw conversational window.

Start by asking them how they would approach the problem if this is the first message.`;

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
