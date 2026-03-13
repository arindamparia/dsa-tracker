const fetch = require('node-fetch');

exports.handler = async (event, context) => {
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
          content: `You are an expert algorithm analyzer. Analyze the provided code for the problem: "${title}". Respond strictly in JSON format with exactly these three keys:
1. "time_complexity": The Big O time complexity. MUST be exactly one of: ["O(1)", "O(log n)", "O(log(m+n))", "O(n)", "O(n log n)", "O(n+m)", "O(V+E)", "O(n²)", "O(n³)", "O(2^n)", "O(n!)"].
2. "space_complexity": The Big O space complexity. MUST be exactly one of: ["O(1)", "O(log n)", "O(log(m+n))", "O(n)", "O(n log n)", "O(n+m)", "O(V+E)", "O(n²)", "O(n³)", "O(2^n)", "O(n!)"].
3. "feedback": A very concise 1-3 sentence review of the approach, or any edge cases missed.`
        },
        { role: 'user', content: code }
      ];
    } else {
      return { statusCode: 400, body: JSON.stringify({ error: 'Invalid action' }) };
    }

    const requestBody = {
      model: 'gpt-5-mini',
      messages: messages
    };

    if (action === 'analyze') {
      requestBody.response_format = { type: 'json_object' };
    }

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
      } catch (err) {
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
