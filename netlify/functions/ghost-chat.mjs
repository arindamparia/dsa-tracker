import { getAuthEmail, unauthorized } from "./clerk-auth.mjs";
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
    const { problemTitle, fullCode, ghostContext, history } = JSON.parse(event.body);
    
    if (!problemTitle || !history || !Array.isArray(history)) {
      return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Missing required parameters' }) };
    }

    const systemPrompt = `You are "Snowy", an elite Staff Software Engineer. The user is watching a code replay for problem "${problemTitle}". 
You do not have the optimal code, approach, or complexity details up front. If the user asks ANY question related to the code, logic, time/space complexity, or the approach, you MUST use the \`get_ghost_context\` tool to fetch the required information before answering.
Available context keys: 'optimal_code', 'time_complexity', 'space_complexity', 'intuition', 'naive_approach'.

Answer the user's question about the code or logic. 
CRITICAL CONSTRAINTS:
1. Provide comprehensive and detailed explanations for the user's exact question, but stay strictly on topic regarding the problem and the generated code. Do not introduce outside concepts unrelated to the problem.
2. ONLY answer questions related to the current problem or code. Refuse to answer off-topic questions.
3. If the user finds a proper bug, edge-case failure, or logic loophole in the code, you MUST explicitly appreciate them, recognize the flaw, and validate their observation before explaining.
4. If they ask for the full solution, refuse and encourage them to keep watching the replay.
5. Maintain a professional but friendly mentor tone without using excessive dog puns.
6. FORMATTING: You are replying in a basic chat window. DO NOT use markdown code blocks or backticks (\` or \`\`\`). Use plain text only.`;

    const messages = [
      { role: 'system', content: systemPrompt },
      ...history
    ];

    const tools = [
      {
        type: "function",
        function: {
          name: "get_ghost_context",
          description: "Retrieve specific context about the generated solution if needed. ONLY request the exact keys required to answer the user's question. Do NOT request 'naive_approach' unless the user specifically asks about brute-force or sub-optimal solutions.",
          parameters: {
            type: "object",
            properties: {
              keys: {
                type: "array",
                items: { type: "string", enum: ["optimal_code", "time_complexity", "space_complexity", "intuition", "naive_approach"] },
                description: "The pieces of context to retrieve."
              }
            },
            required: ["keys"]
          }
        }
      }
    ];

    let res = await callAI('ghost_chat', messages, { tools });

    if (!res.ok) {
      console.error('AI service error:', await res.text());
      return { statusCode: 502, headers: CORS, body: JSON.stringify({ error: 'AI service error.' }) };
    }

    let d = await res.json();
    let message = d?.choices?.[0]?.message;

    if (message?.tool_calls) {
      messages.push(message);
      
      for (const toolCall of message.tool_calls) {
        if (toolCall.function.name === 'get_ghost_context') {
          let args = { keys: [] };
          try { args = JSON.parse(toolCall.function.arguments); } catch (e) {}
          
          const toolResponse = {};
          for (const key of args.keys || []) {
            if (key === 'optimal_code') toolResponse[key] = fullCode || 'No code available';
            else if (key === 'naive_approach') toolResponse[key] = ghostContext?.naive_approach || 'Not available';
            else toolResponse[key] = ghostContext?.[key] || 'Not available';
          }
          
          const toolMsg = {
            role: 'tool',
            tool_call_id: toolCall.id,
            name: toolCall.function.name,
            content: JSON.stringify(toolResponse)
          };
          
          messages.push(toolMsg);
        }
      }
      
      res = await callAI('ghost_chat', messages, { tools });
      if (!res.ok) {
        return { statusCode: 502, headers: CORS, body: JSON.stringify({ error: 'AI service tool callback error.' }) };
      }
      d = await res.json();
      message = d?.choices?.[0]?.message;
    }

    const content = message?.content;
    
    if (!content) {
      return { statusCode: 502, headers: CORS, body: JSON.stringify({ error: 'Unexpected AI response.' }) };
    }

    return { statusCode: 200, headers: CORS, body: JSON.stringify({ ok: true, data: { reply: content.trim() } }) };

  } catch (err) {
    console.error('Ghost chat error:', err);
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: 'Internal server error.' }) };
  }
};
