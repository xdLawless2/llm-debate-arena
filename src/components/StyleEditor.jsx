import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { ROLE_DEFINITIONS } from './styleEditorConfig';

export function StyleEditor({
  draft,
  mode,
  baseStyleName,
  disabled,
  errors,
  onMetaChange,
  onPromptChange,
  onSave,
  onCancel,
  onDelete,
}) {
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  if (!draft) {
    return (
      <div className="style-editor-panel empty">
        Select a style to begin editing.
      </div>
    );
  }

  const isReadOnly = mode === 'view' || disabled;
  const isCreate = mode === 'create';
  const isEdit = mode === 'edit';
  const badgeLabel = mode === 'view' ? 'Built-in' : isCreate ? 'Draft' : 'Custom';

  const description = mode === 'view'
    ? 'Built-in styles are read-only. Remix to create an editable copy.'
    : isCreate
      ? `Remix of ${baseStyleName || 'a built-in style'}.`
      : 'Edit prompts and rename your custom style.';

  const handleDeleteConfirm = () => {
    setConfirmingDelete(false);
    onDelete?.();
  };

  return (
    <div className="style-editor-panel">
      <div className="style-editor-header">
        <div>
          <h3>{isCreate ? 'Create Custom Style' : draft.name || 'Style Editor'}</h3>
          <p>{description}</p>
        </div>
        <span className={`style-badge ${badgeLabel === 'Built-in' ? 'built-in' : badgeLabel === 'Draft' ? 'draft' : 'custom'}`}>
          {badgeLabel}
        </span>
      </div>

      {mode === 'view' && (
        <div className="style-editor-banner">
          Built-in styles cannot be edited or deleted.
        </div>
      )}

      <div className="style-editor-meta">
        <div className={`style-editor-field ${errors?.name ? 'error' : ''}`}>
          <label htmlFor="style-name">
            Style Name<span className="required">*</span>
          </label>
          <input
            id="style-name"
            type="text"
            className="style-editor-input"
            value={draft.name}
            onChange={(event) => onMetaChange?.('name', event.target.value)}
            placeholder="Name your style"
            disabled={isReadOnly}
            aria-invalid={Boolean(errors?.name)}
          />
          {errors?.name && <span className="field-error">{errors.name}</span>}
        </div>
        <div className="style-editor-field">
          <label htmlFor="style-description">Description</label>
          <input
            id="style-description"
            type="text"
            className="style-editor-input"
            value={draft.description}
            onChange={(event) => onMetaChange?.('description', event.target.value)}
            placeholder="Optional summary for this style"
            disabled={isReadOnly}
          />
        </div>
      </div>

      <div className="style-editor-sections">
        {ROLE_DEFINITIONS.map((role) => (
          <div key={role.key} className={`style-editor-section ${role.tone}`}>
            <div className="style-editor-section-header">
              <h4>{role.label}</h4>
              <span className="style-editor-section-note">All prompts required</span>
            </div>
            <div className="style-editor-fields">
              {role.fields.map((field) => {
                const fieldError = errors?.promptsByRole?.[role.key]?.[field.key];
                return (
                  <div key={field.key} className={`style-editor-field ${fieldError ? 'error' : ''}`}>
                    <label htmlFor={`${role.key}-${field.key}`}>
                      {field.label}
                      <span className="required">*</span>
                    </label>
                    <textarea
                      id={`${role.key}-${field.key}`}
                      className="style-editor-textarea"
                      value={draft.promptsByRole?.[role.key]?.[field.key] ?? ''}
                      onChange={(event) => onPromptChange?.(role.key, field.key, event.target.value)}
                      placeholder={`Write the ${field.label.toLowerCase()}...`}
                      disabled={isReadOnly}
                      aria-invalid={Boolean(fieldError)}
                      rows={field.key === 'system' ? 6 : 4}
                    />
                    {fieldError && <span className="field-error">{fieldError}</span>}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="style-editor-actions">
        {isCreate && onCancel && (
          <button type="button" className="styles-action-btn ghost" onClick={onCancel} disabled={disabled}>
            Cancel draft
          </button>
        )}
        {(isCreate || isEdit) && (
          <button type="button" className="styles-action-btn primary" onClick={onSave} disabled={disabled}>
            {isCreate ? 'Save style' : 'Save changes'}
          </button>
        )}
        {isEdit && !confirmingDelete && (
          <button
            type="button"
            className="styles-action-btn danger"
            onClick={() => setConfirmingDelete(true)}
            disabled={disabled}
          >
            <Trash2 size={14} />
            Delete style
          </button>
        )}
      </div>

      {isEdit && confirmingDelete && (
        <div className="style-delete-confirmation">
          <div>
            <strong>Delete this style?</strong>
            <p>This cannot be undone and will remove it from selectors.</p>
          </div>
          <div className="style-delete-actions">
            <button type="button" className="styles-action-btn danger" onClick={handleDeleteConfirm} disabled={disabled}>
              Confirm delete
            </button>
            <button type="button" className="styles-action-btn ghost" onClick={() => setConfirmingDelete(false)} disabled={disabled}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
