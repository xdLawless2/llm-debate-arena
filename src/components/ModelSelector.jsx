import { Brain } from 'lucide-react';

export function ModelSelector({ label, value, onChange, color, thinking, onThinkingChange, disabled = false }) {
  return (
    <div className={`model-selector ${color} ${disabled ? 'locked' : ''}`}>
      <div className="model-selector-header">
        <label>{label}</label>
        <button
          type="button"
          className={`thinking-toggle ${thinking ? 'active' : ''}`}
          onClick={() => onThinkingChange(!thinking)}
          title={thinking ? 'Thinking enabled' : 'Thinking disabled'}
          disabled={disabled}
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
        disabled={disabled}
      />
    </div>
  );
}
