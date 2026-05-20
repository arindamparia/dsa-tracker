export const AIProvider = {
  OPENAI: 'openai',
  GEMINI: 'gemini',
  OPENROUTER: 'openrouter'
};

export const AI_CONFIG = {
  analyze_code_hint: { provider: AIProvider.OPENAI, model: "gpt-5.4-mini" },
  analyze_code_mismatch: { provider: AIProvider.OPENAI, model: "gpt-5.4-mini" },
  analyze_code_full: { provider: AIProvider.GEMINI, model: "gemini-3-flash-preview" },
  generate_ghost_easy: { provider: AIProvider.OPENAI, model: "gpt-5.4-mini" },
  generate_ghost_hard: { provider: AIProvider.OPENAI, model: "gpt-5.5-2026-04-23" },
  submit_feedback: { provider: AIProvider.OPENAI, model: "gpt-5.4-mini" },
  rank_similar_problems: { provider: AIProvider.OPENAI, model: "gpt-5.4-mini" },
  mock_interview: { provider: AIProvider.OPENAI, model: "gpt-5.4-mini" },
  ghost_chat: { provider: AIProvider.OPENAI, model: "gpt-5.4-mini" }
};
