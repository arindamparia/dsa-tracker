import { AI_CONFIG, AIProvider } from "./ai-config.mjs";

const getFeatureConfig = (featureKey) => {
  return AI_CONFIG[featureKey] || { provider: AIProvider.OPENAI, model: 'gpt-4o-mini' };
};

export const callAI = async (featureKey, messages, options = {}, forceProvider = null) => {
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
    const error = new Error(`API key missing for provider: ${provider}`);
    error.status = 503;
    throw error;
  }

  const payload = {
    model: model,
    messages: messages,
    ...options
  };

  // Parameter Normalization: OpenAI replaced max_tokens with max_completion_tokens
  if (provider === AIProvider.OPENAI && payload.max_tokens !== undefined) {
    payload.max_completion_tokens = payload.max_tokens;
    delete payload.max_tokens;
  }

  const MAX_RETRIES = 3;
  let attempt = 0;
  
  while (attempt < MAX_RETRIES) {
    try {
      const response = await fetch(baseURL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const isRetryable = response.status === 429 || response.status >= 500;
        
        if (isRetryable && attempt < MAX_RETRIES - 1) {
          const errText = await response.text().catch(() => '');
          
          // Exponential backoff: 1s, 2s, 4s...
          const delay = Math.pow(2, attempt) * 1000;
          await new Promise(res => setTimeout(res, delay));
          attempt++;
          continue;
        }

        const errText = await response.text().catch(() => '');
        if (provider === AIProvider.GEMINI && !options._isFallback) {
          return await callAI(featureKey, messages, { ...options, _isFallback: true }, AIProvider.OPENAI);
        }

        const error = new Error(`AI service returned an error.`);
        error.status = response.status;
        throw error;
      }

      return response; // Return the raw response so callers can process `.json()`
    } catch (e) {
      if (attempt < MAX_RETRIES - 1 && (!e.status || e.status >= 500 || e.status === 429)) {
        // Network error (e.g. timeout, DNS resolution)
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise(res => setTimeout(res, delay));
        attempt++;
        continue;
      }
      
      if (provider === AIProvider.GEMINI && !options._isFallback) {
        return await callAI(featureKey, messages, { ...options, _isFallback: true }, AIProvider.OPENAI);
      }
      
      throw e;
    }
  }
};
