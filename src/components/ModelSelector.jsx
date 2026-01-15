import { Brain } from 'lucide-react';

export function ModelSelector({ label, value, onChange, color, thinking, onThinkingChange }) {
  return (
    <div className={`model-selector ${color}`}>
      <div className="model-selector-header">
        <label>{label}</label>
        <button
          type="button"
          className={`thinking-toggle ${thinking ? 'active' : ''}`}
          onClick={() => onThinkingChange(!thinking)}
          title={thinking ? 'Thinking enabled' : 'Thinking disabled'}
        >
          <Brain size={12} />
          <span>Think</span>
        </button>
      </div>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="e.g., anthropic/claude-opus-4.5"
        spellCheck={false}
      />
    </div>
  );
}
