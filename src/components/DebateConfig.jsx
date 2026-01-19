import { MessageSquare, Clock, Palette } from 'lucide-react';
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
  styles = [],
  styleSelection,
  styleDefaults,
  onStyleChange,
  onSaveStyleDefaults,
  onResetStyleSelection,
  onOpenStylesManager,
  disabled = false,
}) {
  const styleMap = new Map(styles.map((style) => [style.id, style]));
  const resolveStyleName = (id) => styleMap.get(id)?.name ?? 'Flamboyant';

  const hasOverrides = styleSelection && styleDefaults
    ? styleSelection.proStyleId !== styleDefaults.proStyleId
      || styleSelection.conStyleId !== styleDefaults.conStyleId
      || styleSelection.judgeStyleId !== styleDefaults.judgeStyleId
    : false;

  const getStatus = (roleKey) => (
    styleSelection?.[roleKey] === styleDefaults?.[roleKey] ? 'default' : 'override'
  );

  const summaryText = hasOverrides
    ? `Overrides active: Pro ${resolveStyleName(styleSelection.proStyleId)}, Con ${resolveStyleName(styleSelection.conStyleId)}, Judge ${resolveStyleName(styleSelection.judgeStyleId)}.`
    : 'Using default styles for all roles.';

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

      <div className="styles-section">
        <div className="styles-header">
          <label>
            <Palette size={14} />
            Debate Styles
          </label>
          <button
            type="button"
            className="styles-manage-btn"
            onClick={onOpenStylesManager}
            disabled={disabled}
            data-tooltip="Edit tone presets for Pro, Con, and Judge."
          >
            Manage styles
          </button>
        </div>
        <div className="styles-selectors">
          <div className={`style-selector pro ${getStatus('proStyleId')}`}>
            <div className="style-selector-header">
              <span className="style-role">Pro</span>
              <span className={`style-status ${getStatus('proStyleId')}`}>
                {getStatus('proStyleId') === 'override' ? 'Override' : 'Default'}
              </span>
            </div>
            <select
              value={styleSelection?.proStyleId || ''}
              onChange={(e) => onStyleChange?.('proStyleId', e.target.value)}
              disabled={disabled}
            >
              {styles.map((style) => (
                <option key={style.id} value={style.id}>
                  {style.name}
                </option>
              ))}
            </select>
          </div>

          <div className={`style-selector con ${getStatus('conStyleId')}`}>
            <div className="style-selector-header">
              <span className="style-role">Con</span>
              <span className={`style-status ${getStatus('conStyleId')}`}>
                {getStatus('conStyleId') === 'override' ? 'Override' : 'Default'}
              </span>
            </div>
            <select
              value={styleSelection?.conStyleId || ''}
              onChange={(e) => onStyleChange?.('conStyleId', e.target.value)}
              disabled={disabled}
            >
              {styles.map((style) => (
                <option key={style.id} value={style.id}>
                  {style.name}
                </option>
              ))}
            </select>
          </div>

          <div className={`style-selector judge ${getStatus('judgeStyleId')}`}>
            <div className="style-selector-header">
              <span className="style-role">Judge</span>
              <span className={`style-status ${getStatus('judgeStyleId')}`}>
                {getStatus('judgeStyleId') === 'override' ? 'Override' : 'Default'}
              </span>
            </div>
            <select
              value={styleSelection?.judgeStyleId || ''}
              onChange={(e) => onStyleChange?.('judgeStyleId', e.target.value)}
              disabled={disabled}
            >
              {styles.map((style) => (
                <option key={style.id} value={style.id}>
                  {style.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <p className={`styles-summary ${hasOverrides ? 'active' : ''}`}>
          {summaryText}
        </p>
        <div className="styles-actions">
          <button
            type="button"
            className="styles-action-btn primary"
            onClick={onSaveStyleDefaults}
            disabled={disabled || !hasOverrides}
          >
            Save as defaults
          </button>
          <button
            type="button"
            className="styles-action-btn ghost"
            onClick={onResetStyleSelection}
            disabled={disabled || !hasOverrides}
          >
            Reset to defaults
          </button>
        </div>
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
