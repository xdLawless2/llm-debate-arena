const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

export async function streamCompletion(apiKey, model, messages, onChunk, options = {}) {
  const { thinking = false } = options;

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
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'API request failed');
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
      } catch (e) {
        // Skip invalid JSON chunks
      }
    }
  }

  return { content: fullContent, thinking: fullThinking };
}

export async function getCompletion(apiKey, model, messages, options = {}) {
  const { thinking = false } = options;

  const body = {
    model,
    messages,
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
  });

  const text = await response.text();

  let data;
  try {
    data = JSON.parse(text);
  } catch (e) {
    throw new Error('Failed to parse API response');
  }

  if (!response.ok) {
    throw new Error(data.error?.message || 'API request failed');
  }

  const message = data.choices?.[0]?.message;
  if (!message) {
    throw new Error('Invalid API response format');
  }

  return {
    content: message.content || '',
    thinking: message.reasoning || '',
  };
}
