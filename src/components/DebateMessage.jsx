import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Bot, Loader2, Brain, ChevronDown, ChevronUp } from 'lucide-react';

export function DebateMessage({ message, isStreaming }) {
  const { side, phase, content, thinking, model } = message;
  const [showThinking, setShowThinking] = useState(false);

  const getPhaseLabel = () => {
    switch (phase) {
      case 'opening':
        return 'Opening Statement';
      case 'round':
        return `Round ${message.roundNumber}`;
      case 'rapid-fire':
        return 'Rapid Fire';
      case 'closing':
        return 'Closing Statement';
      default:
        return phase;
    }
  };

  const hasThinking = thinking && thinking.length > 0;

  return (
    <div className={`debate-message ${side}`}>
      <div className="message-header">
        <div className="debater-info">
          <Bot size={16} />
          <span className="model-name">{model}</span>
          <span className={`side-badge ${side}`}>
            {side === 'pro' ? 'PRO' : 'CON'}
          </span>
          {hasThinking && (
            <button
              className="thinking-badge"
              onClick={() => setShowThinking(!showThinking)}
            >
              <Brain size={12} />
              <span>Thinking</span>
              {showThinking ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>
          )}
        </div>
        <span className="phase-label">{getPhaseLabel()}</span>
      </div>

      {hasThinking && showThinking && (
        <div className="thinking-content">
          <div className="thinking-header">
            <Brain size={14} />
            <span>Internal Reasoning</span>
          </div>
          <div className="thinking-text">
            <ReactMarkdown>{thinking}</ReactMarkdown>
          </div>
        </div>
      )}

      <div className="message-content">
        {content ? (
          <ReactMarkdown>{content}</ReactMarkdown>
        ) : (
          isStreaming && <span className="typing-indicator">Thinking...</span>
        )}
        {isStreaming && content && (
          <Loader2 size={12} className="streaming-indicator" />
        )}
      </div>
    </div>
  );
}
