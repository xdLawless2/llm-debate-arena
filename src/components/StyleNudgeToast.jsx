import { Palette, X } from 'lucide-react';

export function StyleNudgeToast({ visible = false, onAction, onDismiss }) {
  if (!visible) {
    return null;
  }

  return (
    <div className="style-nudge-toast" role="status" aria-live="polite">
      <div className="style-nudge-icon" aria-hidden="true">
        <Palette size={16} />
      </div>
      <div className="style-nudge-body">
        <p className="style-nudge-title">Explore debate styles</p>
        <p className="style-nudge-text">Switch the tone for Pro, Con, and Judge.</p>
      </div>
      <div className="style-nudge-actions">
        <button
          type="button"
          className="style-nudge-cta"
          onClick={onAction}
        >
          Change debate style
        </button>
        <button
          type="button"
          className="style-nudge-dismiss"
          onClick={onDismiss}
          aria-label="Dismiss style tip"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
