import { MessageSquare, Clock } from 'lucide-react';
import { ModelSelector } from './ModelSelector';
import { DEBATE_PRESETS } from '../services/prompts';

export function DebateConfig({
  topic,
  setTopic,
  proModel,
  setProModel,
  conModel,
  setConModel,
  judgeModel,
  setJudgeModel,
  proThinking,
  setProThinking,
  conThinking,
  setConThinking,
  judgeThinking,
  setJudgeThinking,
  preset,
  setPreset,
  customRounds,
  setCustomRounds,
  disabled = false,
}) {
  return (
    <div className={`debate-config ${disabled ? 'locked' : ''}`}>
      <div className="topic-section">
        <label>
          <MessageSquare size={14} />
          Debate Topic
        </label>
        <textarea
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="Enter a debate topic, e.g., 'AI will have a net positive impact on society'"
          disabled={disabled}
        />
      </div>

      <div className="models-section">
        <ModelSelector
          label="PRO Debater"
          value={proModel}
          onChange={setProModel}
          color="pro"
          thinking={proThinking}
          onThinkingChange={setProThinking}
          disabled={disabled}
        />
        <ModelSelector
          label="CON Debater"
          value={conModel}
          onChange={setConModel}
          color="con"
          thinking={conThinking}
          onThinkingChange={setConThinking}
          disabled={disabled}
        />
      </div>

      <div className="judge-section">
        <ModelSelector
          label="Judge"
          value={judgeModel}
          onChange={setJudgeModel}
          color="judge"
          thinking={judgeThinking}
          onThinkingChange={setJudgeThinking}
          disabled={disabled}
        />
      </div>

      <div className="preset-section">
        <label>
          <Clock size={14} />
          Debate Length
        </label>
        <div className="presets">
          {Object.entries(DEBATE_PRESETS).map(([key, config]) => (
            <button
              key={key}
              type="button"
              className={`preset-btn ${preset === key ? 'active' : ''}`}
              onClick={() => setPreset(key)}
              disabled={disabled}
            >
              <span className="preset-name">{config.name}</span>
              <span className="preset-desc">{config.description}</span>
            </button>
          ))}
          <button
            type="button"
            className={`preset-btn ${preset === 'custom' ? 'active' : ''}`}
            onClick={() => setPreset('custom')}
            disabled={disabled}
          >
            <span className="preset-name">Custom</span>
            <span className="preset-desc">Set your own</span>
          </button>
        </div>
        {preset === 'custom' && (
          <div className="custom-rounds">
            <label>Rounds:</label>
            <input
              type="number"
              min={1}
              max={10}
              value={customRounds}
              onChange={(e) => setCustomRounds(parseInt(e.target.value) || 1)}
              disabled={disabled}
            />
          </div>
        )}
      </div>
    </div>
  );
}
