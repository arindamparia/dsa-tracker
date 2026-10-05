import { AI_CONFIG, AIProvider } from "./ai-config.mjs";

const getFeatureConfig = (featureKey) => {
  return AI_CONFIG[featureKey] || { provider: AIProvider.OPENAI, model: 'gpt-4o-mini' };
};

// Per-attempt ceiling so a stalled provider can't eat the whole function timeout.
const DEFAULT_TIMEOUT_MS = 12000;

/**
 * Parses a model's JSON reply, tolerating ```json fences and surrounding prose.
 * Throws if no JSON object can be recovered.
 */
export const parseAIJson = (raw) => {
  const text = String(raw ?? '').trim();
  try { return JSON.parse(text); } catch { /* try to salvage below */ }
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) return JSON.parse(fenced[1].trim());
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start !== -1 && end > start) return JSON.parse(text.slice(start, end + 1));
  throw new SyntaxError('No JSON object in AI response');
};

export const callAI = async (featureKey, messages, options = {}, forceProvider = null) => {
  // Internal flags must never be forwarded to the provider (OpenAI rejects unknown params).
  const { _isFallback, timeoutMs = DEFAULT_TIMEOUT_MS, maxAttempts, ...providerOptions } = options;
  const config = getFeatureConfig(featureKey);
  const provider = forceProvider || config.provider;
  const model = forceProvider === AIProvider.OPENAI ? 'gpt-5.4-mini' : config.model;

  let baseURL = '';
  let apiKey = '';

  if (provider === AIProvider.GEMINI || provider === 'google') {
    baseURL = 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions';
    apiKey = process.env.GEMINI_API_KEY;
  } else if (provider === AIProvider.OPENROUTER) {
    baseURL = 'https://openrouter.ai/api/v1/chat/completions';
    apiKey = process.env.OPENROUTER_API_KEY;
  } else {
    // Default to OpenAI
    baseURL = 'https://api.openai.com/v1/chat/completions';
    apiKey = process.env.OPENAI_API_KEY;
  }

  if (!apiKey) {
    if ((provider === AIProvider.GEMINI || provider === 'google') && !_isFallback) {
      return callAI(featureKey, messages, { ...providerOptions, timeoutMs, maxAttempts, _isFallback: true }, AIProvider.OPENAI);
    }
    const error = new Error(`API key missing for provider: ${provider}`);
    error.status = 503;
    throw error;
  }

  const payload = {
    model: model,
    messages: messages,
    ...providerOptions
  };

  // Parameter Normalization: OpenAI replaced max_tokens with max_completion_tokens
  if (provider === AIProvider.OPENAI && payload.max_tokens !== undefined) {
    payload.max_completion_tokens = payload.max_tokens;
    delete payload.max_tokens;
  }

  // Gemini has an OpenAI fallback, so fail over immediately instead of burning
  // seconds on backoff retries; OpenAI itself gets one retry.
  const canFallback = provider === AIProvider.GEMINI && !_isFallback;
  const fallback = () => callAI(featureKey, messages, { ...providerOptions, timeoutMs, maxAttempts, _isFallback: true }, AIProvider.OPENAI);
  const MAX_RETRIES = maxAttempts ?? (canFallback || _isFallback ? 1 : 2);
  let attempt = 0;
  
  while (attempt < MAX_RETRIES) {
    try {
      const response = await fetch(baseURL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(timeoutMs)
      });

      if (!response.ok) {
        const isRetryable = response.status === 429 || response.status >= 500;
        
        if (isRetryable && attempt < MAX_RETRIES - 1) {
          // Exponential backoff: 1s, 2s, 4s...
          const delay = Math.pow(2, attempt) * 1000;
          await new Promise(res => setTimeout(res, delay));
          attempt++;
          continue;
        }

        if (canFallback) return await fallback();

        const error = new Error(`AI service returned an error.`);
        error.status = response.status;
        throw error;
      }

      return response; // Return the raw response so callers can process `.json()`
    } catch (err) {
      let e = err;
      if (e?.name === 'TimeoutError' || e?.name === 'AbortError') {
        // DOMException fields are read-only — wrap rather than mutate.
        e = new Error('AI service timed out.');
        e.status = 504;
      }
      if (attempt < MAX_RETRIES - 1 && (!e.status || e.status >= 500 || e.status === 429)) {
        // Network error (e.g. timeout, DNS resolution)
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise(res => setTimeout(res, delay));
        attempt++;
        continue;
      }
      
      // Missing key (503) is a config problem on this provider only — still try the fallback.
      if (canFallback) return await fallback();

      throw e;
    }
  }
};
