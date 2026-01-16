import { useState } from 'react';
import { Key, Eye, EyeOff } from 'lucide-react';

export function ApiKeyInput({ apiKey, setApiKey, disabled = false }) {
  const [showKey, setShowKey] = useState(false);

  const handleChange = (e) => {
    if (disabled) return;
    const value = e.target.value;
    setApiKey(value);
    localStorage.setItem('openrouter_api_key', value);
  };

  const isKeySet = apiKey && apiKey.length > 0;

  return (
    <div className={`api-key-input ${disabled ? 'locked' : ''}`}>
      <div className="input-header">
        <Key size={18} />
        <span>OpenRouter API Key</span>
        {isKeySet && <span className="key-status">Connected</span>}
      </div>
      <div className="input-row">
        <input
          type={showKey ? 'text' : 'password'}
          value={apiKey}
          onChange={handleChange}
          placeholder="sk-or-v1-..."
          className="key-input"
          disabled={disabled}
        />
        <button
          type="button"
          onClick={() => setShowKey(!showKey)}
          className="icon-btn"
          title={showKey ? 'Hide key' : 'Show key'}
          disabled={disabled}
        >
          {showKey ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
      <p className="helper-text">
        Get your API key from{' '}
        <a href="https://openrouter.ai/keys" target="_blank" rel="noopener noreferrer">
          openrouter.ai/keys
        </a>
      </p>
    </div>
  );
}
