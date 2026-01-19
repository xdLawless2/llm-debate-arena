import { X } from 'lucide-react';
import { listBuiltInStyles } from '../services/prompts';

export function StylesManager({
  open = false,
  onClose,
  disabled = false,
  styleDefaults,
  onSetDefaults,
}) {
  if (!open) {
    return null;
  }

  const styles = listBuiltInStyles();

  const handleSetDefault = (roleKey, styleId) => {
    if (disabled) {
      return;
    }
    onSetDefaults?.(roleKey, styleId);
  };

  return (
    <div className="styles-manager-overlay" onClick={onClose}>
      <div
        className="styles-manager-panel"
        role="dialog"
        aria-modal="true"
        aria-label="Styles Manager"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="styles-manager-header">
          <div>
            <h2>Styles Manager</h2>
            <p>Set default debate styles for each role.</p>
          </div>
          <button
            type="button"
            className="styles-manager-close"
            onClick={onClose}
            aria-label="Close styles manager"
          >
            <X size={18} />
          </button>
        </div>

        <div className="styles-manager-grid">
          {styles.map((style) => (
            <div key={style.id} className="style-card">
              <div className="style-card-header">
                <span className="style-card-title">{style.name}</span>
                <span className="style-badge">Built-in</span>
              </div>
              <p className="style-card-desc">{style.description}</p>
              <div className="style-card-actions">
                <button
                  type="button"
                  className={`style-role-btn pro ${styleDefaults?.proStyleId === style.id ? 'active' : ''}`}
                  onClick={() => handleSetDefault('proStyleId', style.id)}
                  disabled={disabled}
                >
                  Set Pro
                </button>
                <button
                  type="button"
                  className={`style-role-btn con ${styleDefaults?.conStyleId === style.id ? 'active' : ''}`}
                  onClick={() => handleSetDefault('conStyleId', style.id)}
                  disabled={disabled}
                >
                  Set Con
                </button>
                <button
                  type="button"
                  className={`style-role-btn judge ${styleDefaults?.judgeStyleId === style.id ? 'active' : ''}`}
                  onClick={() => handleSetDefault('judgeStyleId', style.id)}
                  disabled={disabled}
                >
                  Set Judge
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
