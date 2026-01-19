import { useState } from 'react';
import { Plus, Shuffle, X } from 'lucide-react';
import { deleteCustomStyle, saveCustomStyle, updateCustomStyle } from '../services/styleStorage';
import { StyleEditor } from './StyleEditor';
import { ROLE_DEFINITIONS } from './styleEditorConfig';

const createCustomStyleId = () => (
  `custom-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
);

const normalizeDraft = (style) => {
  const promptsByRole = {};

  ROLE_DEFINITIONS.forEach((role) => {
    const base = style?.promptsByRole?.[role.key] ?? {};
    const nextFields = {};

    role.fields.forEach((field) => {
      nextFields[field.key] = typeof base[field.key] === 'string' ? base[field.key] : '';
    });

    promptsByRole[role.key] = nextFields;
  });

  return {
    id: typeof style?.id === 'string' ? style.id : createCustomStyleId(),
    name: typeof style?.name === 'string' ? style.name : '',
    description: typeof style?.description === 'string' ? style.description : '',
    builtIn: Boolean(style?.builtIn),
    promptsByRole,
  };
};

const createDraftFromStyle = (style, overrides = {}) => {
  const normalized = normalizeDraft(style);
  const baseName = normalized.name || 'Custom Style';

  return {
    ...normalized,
    id: createCustomStyleId(),
    name: overrides.name ?? `${baseName} Remix`,
    description: overrides.description ?? normalized.description,
    builtIn: false,
  };
};

const validateDraft = (draft) => {
  const errors = {};

  if (!draft?.name?.trim()) {
    errors.name = 'Style name is required.';
  }

  const promptErrors = {};

  ROLE_DEFINITIONS.forEach((role) => {
    role.fields.forEach((field) => {
      const value = draft?.promptsByRole?.[role.key]?.[field.key];
      if (!value || !value.trim()) {
        if (!promptErrors[role.key]) {
          promptErrors[role.key] = {};
        }
        promptErrors[role.key][field.key] = 'Required.';
      }
    });
  });

  if (Object.keys(promptErrors).length > 0) {
    errors.promptsByRole = promptErrors;
  }

  return Object.keys(errors).length > 0 ? errors : null;
};

export function StylesManager({
  open = false,
  onClose,
  disabled = false,
  styles = [],
  styleDefaults,
  onSetDefaults,
  onStylesUpdated,
}) {
  const styleList = Array.isArray(styles) ? styles : [];
  const [selectedStyleId, setSelectedStyleId] = useState(styleList[0]?.id ?? null);
  const [editorMode, setEditorMode] = useState('view');
  const [draft, setDraft] = useState(styleList[0] ? normalizeDraft(styleList[0]) : null);
  const [draftBaseName, setDraftBaseName] = useState('');
  const [validationErrors, setValidationErrors] = useState(null);

  if (!open) {
    return null;
  }

  const handleSetDefault = (roleKey, styleId) => {
    if (disabled) {
      return;
    }
    onSetDefaults?.(roleKey, styleId);
  };

  const handleSelectStyle = (style) => {
    setSelectedStyleId(style.id);
    setDraft(normalizeDraft(style));
    setEditorMode(style.builtIn ? 'view' : 'edit');
    setDraftBaseName('');
    setValidationErrors(null);
  };

  const resolveSelectedStyle = () => (
    styleList.find((style) => style.id === selectedStyleId)
      ?? styleList[0]
      ?? null
  );

  const handleCreateCustom = () => {
    const baseStyle = resolveSelectedStyle();

    if (!baseStyle) {
      return;
    }

    setDraft(createDraftFromStyle(baseStyle, { name: '' }));
    setEditorMode('create');
    setDraftBaseName(baseStyle.name);
    setValidationErrors(null);
  };

  const handleRemix = (style, event) => {
    event?.stopPropagation();
    setSelectedStyleId(style.id);
    setDraft(createDraftFromStyle(style));
    setEditorMode('create');
    setDraftBaseName(style.name);
    setValidationErrors(null);
  };

  const updateDraft = (nextDraft) => {
    setDraft(nextDraft);
    if (validationErrors) {
      setValidationErrors(validateDraft(nextDraft));
    }
  };

  const handleMetaChange = (field, value) => {
    updateDraft({
      ...draft,
      [field]: value,
    });
  };

  const handlePromptChange = (roleKey, fieldKey, value) => {
    updateDraft({
      ...draft,
      promptsByRole: {
        ...draft.promptsByRole,
        [roleKey]: {
          ...draft.promptsByRole[roleKey],
          [fieldKey]: value,
        },
      },
    });
  };

  const handleSave = () => {
    if (!draft || disabled || editorMode === 'view') {
      return;
    }

    const errors = validateDraft(draft);
    if (errors) {
      setValidationErrors(errors);
      return;
    }

    if (editorMode === 'create') {
      saveCustomStyle(draft);
    } else {
      updateCustomStyle(draft);
    }

    onStylesUpdated?.();
    setSelectedStyleId(draft.id);
    setEditorMode('edit');
    setDraftBaseName('');
    setValidationErrors(null);
  };

  const handleCancelDraft = () => {
    const selected = resolveSelectedStyle();

    if (!selected) {
      return;
    }

    setDraft(normalizeDraft(selected));
    setEditorMode(selected.builtIn ? 'view' : 'edit');
    setDraftBaseName('');
    setValidationErrors(null);
  };

  const handleDelete = () => {
    if (!draft || draft.builtIn) {
      return;
    }

    deleteCustomStyle(draft.id);
    onStylesUpdated?.();

    const remaining = styleList.filter((style) => style.id !== draft.id);
    const fallback = remaining[0];

    if (fallback) {
      setSelectedStyleId(fallback.id);
      setDraft(normalizeDraft(fallback));
      setEditorMode(fallback.builtIn ? 'view' : 'edit');
      setDraftBaseName('');
      setValidationErrors(null);
    }
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
            <p>Create custom styles and set defaults for each role.</p>
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

        <div className="styles-manager-body">
          <div className="styles-list-panel">
            <div className="styles-list-header">
              <div>
                <h3>Styles Library</h3>
              </div>
              <button
                type="button"
                className="styles-create-btn"
                onClick={handleCreateCustom}
                disabled={disabled}
              >
                <Plus size={14} />
                Create custom style
              </button>
            </div>

            <div className="styles-list-scroll">
              {styleList.map((style) => (
                <div
                  key={style.id}
                  className={`style-card ${style.id === selectedStyleId ? 'selected' : ''}`}
                  onClick={() => handleSelectStyle(style)}
                >
                  <div className="style-card-header">
                    <span className="style-card-title">{style.name}</span>
                    <span className={`style-badge ${style.builtIn ? 'built-in' : 'custom'}`}>
                      {style.builtIn ? 'Built-in' : 'Custom'}
                    </span>
                  </div>
                  {style.description && (
                    <p className="style-card-desc">
                      {style.description}
                    </p>
                  )}
                  <div className="style-card-actions">
                    <button
                      type="button"
                      className={`style-role-btn pro ${styleDefaults?.proStyleId === style.id ? 'active' : ''}`}
                      onClick={(event) => {
                        event.stopPropagation();
                        handleSetDefault('proStyleId', style.id);
                      }}
                      disabled={disabled}
                    >
                      Set Pro
                    </button>
                    <button
                      type="button"
                      className={`style-role-btn con ${styleDefaults?.conStyleId === style.id ? 'active' : ''}`}
                      onClick={(event) => {
                        event.stopPropagation();
                        handleSetDefault('conStyleId', style.id);
                      }}
                      disabled={disabled}
                    >
                      Set Con
                    </button>
                    <button
                      type="button"
                      className={`style-role-btn judge ${styleDefaults?.judgeStyleId === style.id ? 'active' : ''}`}
                      onClick={(event) => {
                        event.stopPropagation();
                        handleSetDefault('judgeStyleId', style.id);
                      }}
                      disabled={disabled}
                    >
                      Set Judge
                    </button>
                  </div>
                  <div className="style-card-footer">
                    <button
                      type="button"
                      className="style-remix-btn"
                      onClick={(event) => handleRemix(style, event)}
                      disabled={disabled}
                    >
                      <Shuffle size={12} />
                      Remix
                    </button>
                    <span className="style-card-note">
                      {style.builtIn ? 'Read-only' : 'Editable'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <StyleEditor
            key={`${draft?.id ?? 'empty'}-${editorMode}`}
            draft={draft}
            mode={editorMode}
            baseStyleName={draftBaseName}
            disabled={disabled}
            errors={validationErrors}
            onMetaChange={handleMetaChange}
            onPromptChange={handlePromptChange}
            onSave={handleSave}
            onCancel={editorMode === 'create' ? handleCancelDraft : null}
            onDelete={handleDelete}
          />
        </div>
      </div>
    </div>
  );
}
