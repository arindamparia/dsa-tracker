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
          content: `You are an expert algorithm analyzer. Analyze the provided code for the problem: "${title}". Respond strictly in JSON format with exactly this structure:
{
  "time_complexity": "The Big O time complexity. Prefer using one of these standard formats if applicable: ['O(1)', 'O(log n)', 'O(sqrt(n))', 'O(log(m+n))', 'O(n)', 'O(n log n)', 'O(n log m)', 'O(n+m)', 'O(m * n)', 'O(V+E)', 'O(n²)', 'O(n³)', 'O(2^n)', 'O(2^n * n²)', 'O(n!)', 'O(n^n)']. If the true complexity is strictly more accurate as something else (e.g. O(N * K)), use your custom format.",
  "space_complexity": "The Big O space complexity. Prefer using the standard formats listed above if applicable.",
  "approach": {
    "current": "The underlying algorithms used (e.g. 'Hash Table / Array')",
    "suggested": "The absolute most optimal algorithmic patterns (e.g. 'Hash Table / Sorting / String Matching')",
    "key_idea": "A 1 sentence explanation of the optimal core mechanism.",
    "consider": "A strict 1 sentence question pushing the candidate to think about an edge case or constraint."
  },
  "efficiency": {
    "current_time_complexity": "The parsed time complexity of their code.",
    "suggested_time_complexity": "The theoretical best possible time complexity.",
    "current_space_complexity": "The parsed space complexity of their code.",
    "suggested_space_complexity": "The theoretical best possible space complexity.",
    "suggestions": "A 1-2 sentence verdict on their efficiency, e.g. 'Your frequency array approach is actually optimal here, beating the sorting method!'"
  }
}`
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
