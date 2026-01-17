const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

const parseErrorMessage = async (response) => {
  const text = await response.text();
  if (!text) {
    return `API request failed (${response.status})`;
  }
  try {
    const data = JSON.parse(text);
    return data.error?.message || data.message || text;
  } catch {
    return text;
  }
};

export async function streamCompletion(apiKey, model, messages, onChunk, options = {}) {
  const { thinking = false, signal } = options;

  const body = {
    model,
    messages,
    stream: true,
  };

  if (thinking) {
    body.reasoning = {
      effort: 'high',
    };
  }

  const response = await fetch(OPENROUTER_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': window.location.origin,
      'X-Title': 'LLM Debate Arena',
    },
    body: JSON.stringify(body),
    signal,
  });

  if (!response.ok) {
    const message = await parseErrorMessage(response);
    throw new Error(message);
  }

  if (!response.body || !response.body.getReader) {
    throw new Error('Streaming response body unavailable');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let fullContent = '';
  let fullThinking = '';
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const data = line.slice(6).trim();
      if (data === '[DONE]' || data === '') continue;

      try {
        const parsed = JSON.parse(data);
        const delta = parsed.choices?.[0]?.delta;

        if (delta?.reasoning) {
          fullThinking += delta.reasoning;
          onChunk(fullContent, fullThinking);
        }

        if (delta?.content) {
          fullContent += delta.content;
          onChunk(fullContent, fullThinking);
        }
      } catch {
        // Skip invalid JSON chunks
      }
    }
  }

  return { content: fullContent, thinking: fullThinking };
}
