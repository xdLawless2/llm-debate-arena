import { useState, useCallback, useEffect, useMemo } from 'react';
import { Swords, Play, Square, RotateCcw, AlertCircle, Copy, Check, Sparkles, Shield, Users, Brain, Landmark, Zap, Info, Sun, Moon, FastForward, Pause } from 'lucide-react';
import { ApiKeyInput } from './components/ApiKeyInput';
import { DebateConfig } from './components/DebateConfig';
import { DebateMessage } from './components/DebateMessage';
import { JudgeVerdict } from './components/JudgeVerdict';
import { StylesManager } from './components/StylesManager';
import { useDebate } from './hooks/useDebate';
import { DEFAULT_STYLE_DEFAULTS, getStyleDefaults, listAllStyles, saveStyleDefaults } from './services/styleStorage';
import './App.css';

const readStoredValue = (key, fallback = '') => {
  try {
    const value = localStorage.getItem(key);
    return value || fallback;
  } catch {
    return fallback;
  }
};

const writeStoredValue = (key, value) => {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Ignore storage failures in restricted contexts.
  }
};

const SUGGESTED_TOPICS = [
  { icon: Shield, label: 'AI Safety', desc: 'Should we slow down AI development?' },
  { icon: Users, label: 'Remote Work', desc: 'Is remote work the future of employment?' },
  { icon: Landmark, label: 'Universal Basic Income', desc: 'Should everyone receive a guaranteed income?' },
  { icon: Brain, label: 'Brain-Computer Interfaces', desc: 'Should we embrace neural implants?' },
  { icon: Zap, label: 'Nuclear Energy', desc: 'Is nuclear essential for clean energy?' },
  { icon: Sparkles, label: 'Space Colonization', desc: 'Should we prioritize settling Mars?' },
];

const normalizeStyleSelection = (selection, styleMap) => {
  const safeSelection = selection ?? {};
  const getValidId = (value, fallback) => (styleMap.has(value) ? value : fallback);

  return {
    proStyleId: getValidId(safeSelection.proStyleId, DEFAULT_STYLE_DEFAULTS.proStyleId),
    conStyleId: getValidId(safeSelection.conStyleId, DEFAULT_STYLE_DEFAULTS.conStyleId),
    judgeStyleId: getValidId(safeSelection.judgeStyleId, DEFAULT_STYLE_DEFAULTS.judgeStyleId),
  };
};

function App() {
  const [apiKey, setApiKey] = useState(() =>
    readStoredValue('openrouter_api_key', '')
  );
  const [topic, setTopic] = useState('');
  const [proModel, setProModel] = useState(() =>
    readStoredValue('debate_pro_model', 'anthropic/claude-opus-4.5')
  );
  const [conModel, setConModel] = useState(() =>
    readStoredValue('debate_con_model', 'anthropic/claude-opus-4.5')
  );
  const [judgeModel, setJudgeModel] = useState(() =>
    readStoredValue('debate_judge_model', 'anthropic/claude-opus-4.5')
  );
  const [proThinking, setProThinking] = useState(false);
  const [conThinking, setConThinking] = useState(false);
  const [judgeThinking, setJudgeThinking] = useState(false);
  const [preset, setPreset] = useState('medium');
  const [customRounds, setCustomRounds] = useState(4);
  const [copied, setCopied] = useState(false);
  const [isLightMode, setIsLightMode] = useState(false);
  const [isStylesManagerOpen, setIsStylesManagerOpen] = useState(false);

  const [allStyles, setAllStyles] = useState(() => listAllStyles());
  const styleMap = useMemo(
    () => new Map(allStyles.map((style) => [style.id, style])),
    [allStyles]
  );
  const [styleDefaults, setStyleDefaults] = useState(() =>
    normalizeStyleSelection(getStyleDefaults(), styleMap)
  );
  const [styleSelection, setStyleSelection] = useState(() =>
    normalizeStyleSelection(getStyleDefaults(), styleMap)
  );

  useEffect(() => {
    writeStoredValue('openrouter_api_key', apiKey);
  }, [apiKey]);

  useEffect(() => {
    writeStoredValue('debate_pro_model', proModel);
  }, [proModel]);

  useEffect(() => {
    writeStoredValue('debate_con_model', conModel);
  }, [conModel]);

  useEffect(() => {
    writeStoredValue('debate_judge_model', judgeModel);
  }, [judgeModel]);

  useEffect(() => {
    setStyleDefaults((prev) => {
      const normalized = normalizeStyleSelection(prev, styleMap);
      const hasChanged = !prev
        || prev.proStyleId !== normalized.proStyleId
        || prev.conStyleId !== normalized.conStyleId
        || prev.judgeStyleId !== normalized.judgeStyleId;
      if (hasChanged) {
        saveStyleDefaults(normalized);
      }
      return normalized;
    });
    setStyleSelection((prev) => normalizeStyleSelection(prev, styleMap));
  }, [styleMap]);

  const refreshStyles = useCallback(() => {
    setAllStyles(listAllStyles());
  }, []);

  const handleStyleChange = useCallback((roleKey, nextStyleId) => {
    if (!styleMap.has(nextStyleId)) {
      return;
    }
    setStyleSelection((prev) => ({
      ...prev,
      [roleKey]: nextStyleId,
    }));
  }, [styleMap]);

  const applyStyleDefaults = useCallback((nextDefaults) => {
    const normalizedDefaults = normalizeStyleSelection(nextDefaults, styleMap);
    setStyleDefaults(normalizedDefaults);
    saveStyleDefaults(normalizedDefaults);

    setStyleSelection((current) => ({
      proStyleId: current.proStyleId === styleDefaults.proStyleId
        ? normalizedDefaults.proStyleId
        : current.proStyleId,
      conStyleId: current.conStyleId === styleDefaults.conStyleId
        ? normalizedDefaults.conStyleId
        : current.conStyleId,
      judgeStyleId: current.judgeStyleId === styleDefaults.judgeStyleId
        ? normalizedDefaults.judgeStyleId
        : current.judgeStyleId,
    }));
  }, [styleDefaults, styleMap]);

  const {
    messages,
    streamingMessage,
    isDebating,
    currentPhase,
    isJudging,
    verdict,
    error,
    wasStopped,
    startDebate,
    stopDebate,
    resetDebate,
    continueDebate,
  } = useDebate();

  const handleStart = () => {
    startDebate({
      apiKey,
      topic,
      proModel,
      conModel,
      judgeModel,
      proThinking,
      conThinking,
      judgeThinking,
      preset,
      customRounds,
      styleSelection,
    });
  };

  const formatMessagesAsMarkdown = useCallback((messagesForExport) => {
    let md = `# LLM Debate Arena\n\n`;
    md += `**Topic:** ${topic}\n\n`;
    md += `**PRO:** ${proModel}\n`;
    md += `**CON:** ${conModel}\n`;
    md += `**Judge:** ${judgeModel}\n\n`;
    md += `---\n\n`;

    const getPhaseLabel = (msg) => {
      switch (msg.phase) {
        case 'opening': return 'Opening Statement';
        case 'round': return `Round ${msg.roundNumber}`;
        case 'rapid-fire': return 'Rapid Fire';
        case 'closing': return 'Closing Statement';
        default: return msg.phase;
      }
    };

    messagesForExport.forEach((msg) => {
      const side = msg.side === 'pro' ? 'PRO' : 'CON';
      md += `## ${side} - ${getPhaseLabel(msg)}\n`;
      md += `*Model: ${msg.model}*\n\n`;

      if (msg.thinking) {
        md += `<details>\n<summary>💭 Thinking</summary>\n\n${msg.thinking}\n\n</details>\n\n`;
      }

      md += `${msg.content}\n\n`;
      md += `---\n\n`;
    });

    if (verdict) {
      md += `## 🏆 Judge's Verdict\n`;
      md += `*Model: ${judgeModel}*\n\n`;
      md += `${verdict}\n`;
    }

    return md;
  }, [verdict, topic, proModel, conModel, judgeModel]);

  const handleCopy = async () => {
    const markdown = formatMessagesAsMarkdown(allMessages);
    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error('Clipboard unavailable');
      }
      await navigator.clipboard.writeText(markdown);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const allMessages = streamingMessage
    ? [...messages, streamingMessage]
    : messages;

  const hasStarted = messages.length > 0 || isDebating || wasStopped || streamingMessage;
  const isConfigLocked = hasStarted;
  const showPhase = currentPhase && (isDebating || wasStopped || isJudging);
  const phaseStatus = wasStopped ? 'paused' : isJudging ? 'judging' : '';

  return (
    <div className={`app ${isLightMode ? 'light-mode' : ''}`}>
      <header className="app-header">
        <div className="header-left">
          <div className="logo">
            <Swords size={24} />
            <h1>LLM Debate Arena</h1>
          </div>
          <p className="tagline">Watch AI models battle it out in intellectual combat</p>
        </div>
        <div className="header-right">
          {hasStarted && (
            <div className="debate-controls">
              {showPhase && (
                <div className={`phase-pill ${phaseStatus}`}>
                  {wasStopped ? (
                    <Pause size={12} />
                  ) : (
                    <span className="phase-dot"></span>
                  )}
                  <span className="phase-text">{currentPhase}</span>
                </div>
              )}
              <button
                className={`copy-icon-btn ${copied ? 'copied' : ''}`}
                onClick={handleCopy}
                disabled={allMessages.length === 0}
                title={copied ? 'Copied!' : 'Copy debate as markdown'}
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
              </button>
            </div>
          )}
          <button
            className="theme-toggle"
            onClick={() => setIsLightMode(!isLightMode)}
            title={isLightMode ? 'Switch to dark mode' : 'Switch to light mode'}
          >
            {isLightMode ? <Moon size={18} /> : <Sun size={18} />}
          </button>
        </div>
      </header>

      <main className="app-main">
        <aside className="sidebar">
          <ApiKeyInput apiKey={apiKey} setApiKey={setApiKey} disabled={isConfigLocked} />

          <DebateConfig
            topic={topic}
            setTopic={setTopic}
            proModel={proModel}
            setProModel={setProModel}
            conModel={conModel}
            setConModel={setConModel}
            judgeModel={judgeModel}
            setJudgeModel={setJudgeModel}
            proThinking={proThinking}
            setProThinking={setProThinking}
            conThinking={conThinking}
            setConThinking={setConThinking}
            judgeThinking={judgeThinking}
            setJudgeThinking={setJudgeThinking}
            preset={preset}
            setPreset={setPreset}
            customRounds={customRounds}
            setCustomRounds={setCustomRounds}
            styles={allStyles}
            styleSelection={styleSelection}
            styleDefaults={styleDefaults}
            onStyleChange={handleStyleChange}
            onSaveStyleDefaults={() => applyStyleDefaults(styleSelection)}
            onResetStyleSelection={() => setStyleSelection(styleDefaults)}
            onOpenStylesManager={() => setIsStylesManagerOpen(true)}
            disabled={isConfigLocked}
          />

          <div className="controls">
            {!isDebating ? (
              <>
                {wasStopped ? (
                  <>
                    <button
                      className="btn primary"
                      onClick={continueDebate}
                    >
                      <FastForward size={16} />
                      Continue Debate
                    </button>
                    <button className="btn secondary" onClick={resetDebate}>
                      <RotateCcw size={16} />
                      New Debate
                    </button>
                  </>
                ) : (
                  <>
                    {!hasStarted ? (
                      <>
                        <button
                          className="btn primary"
                          onClick={handleStart}
                          disabled={!apiKey || !topic}
                          title={!apiKey || !topic ? 'Enter a topic and API key to start' : ''}
                        >
                          <Play size={16} />
                          Start Debate
                        </button>
                        {!apiKey || !topic ? (
                          <p className="btn disabled-hint">
                            <Info size={12} />
                            {!topic && !apiKey ? 'Enter topic & API key' : !topic ? 'Enter a topic' : 'Enter API key'}
                          </p>
                        ) : null}
                      </>
                    ) : (
                      <button className="btn secondary" onClick={resetDebate}>
                        <RotateCcw size={16} />
                        New Debate
                      </button>
                    )}
                  </>
                )}
              </>
            ) : (
              <button className="btn danger" onClick={stopDebate}>
                <Square size={16} />
                Stop Debate
              </button>
            )}
          </div>
        </aside>

        <section className="arena">
          {!hasStarted && !error && (
            <div className="suggested-topics">
              <div className="suggested-header">
                <Sparkles size={20} />
                <h2>Choose a Topic</h2>
              </div>
              <div className="topics-grid">
                {SUGGESTED_TOPICS.map((topic) => (
                  <button
                    key={topic.label}
                    className="topic-card"
                    onClick={() => setTopic(topic.label)}
                  >
                    <topic.icon size={24} />
                    <span className="topic-label">{topic.label}</span>
                    <span className="topic-desc">{topic.desc}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {error && (
            <div className="error-banner">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          <div className="messages-container">
            {allMessages.map((msg, index) => (
              <DebateMessage
                key={msg.id || index}
                message={msg}
                isStreaming={isDebating && streamingMessage?.id === msg.id}
              />
            ))}
            <JudgeVerdict
              verdict={verdict}
              judgeModel={judgeModel}
              isJudging={isJudging}
            />
          </div>
        </section>
      </main>

      <StylesManager
        open={isStylesManagerOpen}
        onClose={() => setIsStylesManagerOpen(false)}
        disabled={isConfigLocked}
        styles={allStyles}
        styleDefaults={styleDefaults}
        onSetDefaults={(roleKey, styleId) => applyStyleDefaults({
          ...styleDefaults,
          [roleKey]: styleId,
        })}
        onStylesUpdated={refreshStyles}
      />

    </div>
  );
}

export default App;
