export const handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  if (!OPENAI_API_KEY) {
    return { statusCode: 500, body: JSON.stringify({ error: 'OPENAI_API_KEY environment variable is missing.' }) };
  }

  try {
    const { source, candidates } = JSON.parse(event.body);

    if (!source || !candidates || !candidates.length) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing source problem or candidates list' }) };
    }

    const candidateList = candidates.map((c, i) =>
      `${i}. [${c.difficulty}] ${c.name} (Topic: ${c.topic}, Tags: ${c.tags.join(', ')})`
    ).join('\n');

    const sourceDetails = `[${source.difficulty}] ${source.name} (Topic: ${source.topic}, Tags: ${source.tags.join(', ')})`;

    const messages = [
      {
        role: 'system',
        content: `You are a senior competitive programming coach. Given a source LeetCode problem (with difficulty, topic, and tags) and a ranked list of candidate problems (also with difficulty, topic, and tags), pick the 3 that are MOST similar in terms of underlying algorithm pattern, data structure, and problem-solving technique.

Consider not just the explicit topic/tags, but the actual algorithm usually required to solve them (e.g. if the source is a 2D matrix BFS, pick other 2D matrix BFS problems).
Assume the candidates are already somewhat filtered, but you act as the final tiebreaker for true algorithmic equivalence.

Respond ONLY with a JSON object: { "picks": [i, j, k] } where each value is a 0-based index from the provided candidate list. Do not provide any explanations.`
      },
      {
        role: 'user',
        content: `Source problem:\n${sourceDetails}\n\nCandidates:\n${candidateList}`
      }
    ];

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-5.4-mini',
        messages,
        response_format: { type: 'json_object' }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI Error in rank-similar-problems:', errorText);
      return { statusCode: response.status, body: JSON.stringify({ error: 'OpenAI API request failed' }) };
    }

    const data = await response.json();
    const content = data.choices[0].message.content;

    try {
      const parsed = JSON.parse(content);
      return { statusCode: 200, body: JSON.stringify({ ok: true, data: parsed }) };
    } catch {
      return { statusCode: 500, body: JSON.stringify({ error: 'Failed to parse JSON from OpenAI' }) };
    }

  } catch (err) {
    console.error('rank-similar-problems error:', err);
    return { statusCode: 500, body: JSON.stringify({ error: 'Internal server error' }) };
  }
};
