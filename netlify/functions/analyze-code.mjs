export const handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  if (!OPENAI_API_KEY) {
    return { statusCode: 500, body: JSON.stringify({ error: 'OPENAI_API_KEY environment variable is missing.' }) };
  }

  try {
    const { action, title, code } = JSON.parse(event.body);
    if (!action || !title) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing action or title' }) };
    }

    let messages = [];

    if (action === 'hint') {
      messages = [
        {
          role: 'system',
          content: `You are a strict, concise coding interviewer. The user needs a hint for the data structure/algorithm problem: "${title}". Provide a single nudge or concept or direction to think about. DO NOT write code. DO NOT give the direct answer. Maximum 3 sentences.`
        },
        { role: 'user', content: `Can I get a hint for ${title}?` }
      ];
    } else if (action === 'analyze') {
      if (!code) return { statusCode: 400, body: JSON.stringify({ error: 'Code is required for analysis' }) };

      messages = [
        {
          role: 'system',
          content: `You are an elite algorithm interview coach. Analyze the submitted code for the LeetCode problem: "${title}".
Be direct, specific, and encouraging — like a senior engineer doing a real code review.
Respond ONLY with valid JSON using exactly this schema (no extra keys, no markdown):
{
  "time_complexity": "<Big-O string using standard notation, e.g. 'O(n)'>",
  "space_complexity": "<Big-O string>",
  "summary": "<1-2 sentence overall verdict. Start with 'Congratulations!' if current_time_complexity equals suggested_time_complexity (already optimal), or 'Good attempt!' if a strictly better complexity exists. Name the specific algorithm and what was impressive or what can improve.>",
  "approach": {
    "current": "<Algorithm/technique name only, e.g. 'Two Pointers', 'Hash Map + Sliding Window', 'Bottom-Up DP'>",
    "suggested": "<Most optimal algorithm name. Identical to current if already optimal.>",
    "key_idea": "<One precise sentence: the core insight of the optimal approach.>",
    "consider": "<One sentence follow-up question to deepen understanding — about edge cases, scaling, or a harder variant.>"
  },
  "efficiency": {
    "current_time_complexity": "<Big-O of the submitted code>",
    "suggested_time_complexity": "<The BEST possible time complexity for this problem. MUST be equal to or strictly better (lower) than current_time_complexity. NEVER suggest a worse complexity as an improvement.>",
    "current_space_complexity": "<Big-O of the submitted code>",
    "suggested_space_complexity": "<The BEST possible space complexity. MUST be equal to or strictly better than current_space_complexity.>",
    "time_suggestions": "<1-2 sentences specifically about TIME complexity. If suggested_time equals current_time, celebrate and say it is optimal. Otherwise explain the concrete algorithmic change needed to achieve the better time complexity.>",
    "space_suggestions": "<1-2 sentences specifically about SPACE complexity. If suggested_space equals current_space, celebrate and say it is optimal. Otherwise explain the concrete change needed to reduce memory usage.>"
  },
  "code_style": {
    "readability": <integer 1, 2, or 3>,
    "structure": <integer 1, 2, or 3>,
    "suggestions": "<1-2 concrete sentences on naming, spacing, comments, or logical organisation.>"
  }
}
Scoring guide for code_style integers:
- readability 1 = hard to follow (cryptic names, zero spacing)  2 = acceptable but improvable  3 = clean and self-documenting
- structure 1 = monolithic / hard to trace logic  2 = reasonable flow  3 = excellent organisation
Complexity strings: prefer standard formats — O(1), O(log n), O(sqrt(n)), O(n), O(n log n), O(n+m), O(n²), O(2^n) etc. Use custom format only if genuinely more precise.`
        },
        { role: 'user', content: code }
      ];
    } else {
      return { statusCode: 400, body: JSON.stringify({ error: 'Invalid action' }) };
    }

    const requestBody = { model: 'gpt-5.4-mini', messages };
    if (action === 'analyze') requestBody.response_format = { type: 'json_object' };

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI Error:', errorText);
      return { statusCode: response.status, body: JSON.stringify({ error: 'OpenAI API request failed' }) };
    }

    const data = await response.json();
    const content = data.choices[0].message.content;

    if (action === 'analyze') {
      try {
        const parsed = JSON.parse(content);
        return { statusCode: 200, body: JSON.stringify({ ok: true, data: parsed }) };
      } catch {
        return { statusCode: 500, body: JSON.stringify({ error: 'Failed to parse JSON from OpenAI' }) };
      }
    } else {
      return { statusCode: 200, body: JSON.stringify({ ok: true, data: content }) };
    }

  } catch (err) {
    console.error('Function error:', err);
    return { statusCode: 500, body: JSON.stringify({ error: 'Internal server error' }) };
  }
};
