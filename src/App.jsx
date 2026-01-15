import { useState, useCallback } from 'react';
import { Swords, Play, Square, RotateCcw, AlertCircle, Copy, Check, Sparkles, Shield, Users, Brain, Landmark, Zap, Info } from 'lucide-react';
import { ApiKeyInput } from './components/ApiKeyInput';
import { DebateConfig } from './components/DebateConfig';
import { DebateMessage } from './components/DebateMessage';
import { JudgeVerdict } from './components/JudgeVerdict';
import { useDebate } from './hooks/useDebate';
import './App.css';

const SUGGESTED_TOPICS = [
  { icon: Shield, label: 'AI Safety', desc: 'Should we slow down AI development?' },
  { icon: Users, label: 'Remote Work', desc: 'Is remote work the future of employment?' },
  { icon: Landmark, label: 'Universal Basic Income', desc: 'Should everyone receive a guaranteed income?' },
  { icon: Brain, label: 'Brain-Computer Interfaces', desc: 'Should we embrace neural implants?' },
  { icon: Zap, label: 'Nuclear Energy', desc: 'Is nuclear essential for clean energy?' },
  { icon: Sparkles, label: 'Space Colonization', desc: 'Should we prioritize settling Mars?' },
];

function App() {
  const [apiKey, setApiKey] = useState(() =>
    localStorage.getItem('openrouter_api_key') || ''
  );
  const [topic, setTopic] = useState('');
  const [proModel, setProModel] = useState('anthropic/claude-opus-4.5');
  const [conModel, setConModel] = useState('anthropic/claude-opus-4.5');
  const [judgeModel, setJudgeModel] = useState('anthropic/claude-opus-4.5');
  const [proThinking, setProThinking] = useState(false);
  const [conThinking, setConThinking] = useState(false);
  const [judgeThinking, setJudgeThinking] = useState(false);
  const [preset, setPreset] = useState('medium');
  const [customRounds, setCustomRounds] = useState(4);
  const [copied, setCopied] = useState(false);

  const {
    messages,
    streamingMessage,
    isDebating,
    currentPhase,
    isJudging,
    verdict,
    error,
    startDebate,
    stopDebate,
    resetDebate,
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
    });
  };

  const formatMessagesAsMarkdown = useCallback(() => {
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

    messages.forEach((msg) => {
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
  }, [messages, verdict, topic, proModel, conModel, judgeModel]);

  const handleCopy = async () => {
    const markdown = formatMessagesAsMarkdown();
    await navigator.clipboard.writeText(markdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const allMessages = streamingMessage
    ? [...messages, streamingMessage]
    : messages;

  const hasStarted = messages.length > 0 || isDebating;

  return (
    <div className="app">
      <header className="app-header">
        <div className="logo">
          <Swords size={24} />
          <h1>LLM Debate Arena</h1>
        </div>
        <p className="tagline">Watch AI models battle it out in intellectual combat</p>
      </header>

      <main className="app-main">
        <aside className="sidebar">
          <ApiKeyInput apiKey={apiKey} setApiKey={setApiKey} />

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
          />

          <div className="controls">
            {!isDebating ? (
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
                {hasStarted && (
                  <button className="btn secondary" onClick={resetDebate}>
                    <RotateCcw size={16} />
                    New Debate
                  </button>
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
          {hasStarted && (
            <div className="arena-toolbar">
              <button
                className={`copy-btn ${copied ? 'copied' : ''}`}
                onClick={handleCopy}
                disabled={messages.length === 0}
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
                {copied ? 'Copied!' : 'Copy as Markdown'}
              </button>
            </div>
          )}

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

          {currentPhase && isDebating && (
            <div className="phase-indicator">
              <span className="phase-dot"></span>
              {currentPhase}
            </div>
          )}

          <div className="messages-container">
            {allMessages.map((msg, index) => (
              <DebateMessage
                key={msg.id || index}
                message={msg}
                isStreaming={streamingMessage?.id === msg.id}
              />
            ))}
          </div>

          <JudgeVerdict
            verdict={verdict}
            judgeModel={judgeModel}
            isJudging={isJudging}
          />
        </section>
      </main>
    </div>
  );
}

export default App;
