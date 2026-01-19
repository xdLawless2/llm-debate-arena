import { BUILT_IN_STYLES, getBuiltInStyleById, listBuiltInStyles } from './prompts';

export const CUSTOM_STYLES_STORAGE_KEY = 'debate_custom_styles';
export const STYLE_DEFAULTS_STORAGE_KEY = 'debate_style_defaults';

export const DEFAULT_STYLE_DEFAULTS = {
  proStyleId: 'flamboyant',
  conStyleId: 'flamboyant',
  judgeStyleId: 'flamboyant',
};

const isPlainObject = (value) => {
  if (!value || typeof value !== 'object') {
    return false;
  }

  return !Array.isArray(value);
};

const normalizeStyleId = (id) => (typeof id === 'string' ? id.trim() : '');

const readStoredJson = (key) => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      return null;
    }
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

const writeStoredJson = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage failures in restricted contexts.
  }
};

const BUILT_IN_ID_SET = new Set(Object.keys(BUILT_IN_STYLES));

const sanitizeCustomStyle = (style) => {
  if (!isPlainObject(style)) {
    return null;
  }

  const id = normalizeStyleId(style.id);
  const name = typeof style.name === 'string' ? style.name.trim() : '';

  if (!id || !name) {
    return null;
  }

  if (!isPlainObject(style.promptsByRole)) {
    return null;
  }

  if (BUILT_IN_ID_SET.has(id)) {
    return null;
  }

  return {
    ...style,
    id,
    name,
    description: typeof style.description === 'string' ? style.description : '',
    builtIn: false,
  };
};

const loadCustomStyles = () => {
  const parsed = readStoredJson(CUSTOM_STYLES_STORAGE_KEY);
  if (!Array.isArray(parsed)) {
    return [];
  }

  const customStyles = [];
  const seen = new Set();

  parsed.forEach((entry) => {
    const sanitized = sanitizeCustomStyle(entry);
    if (!sanitized || seen.has(sanitized.id)) {
      return;
    }
    seen.add(sanitized.id);
    customStyles.push(sanitized);
  });

  return customStyles;
};

const saveCustomStyles = (styles) => {
  writeStoredJson(CUSTOM_STYLES_STORAGE_KEY, styles);
};

const normalizeDefaults = (defaults) => {
  if (!isPlainObject(defaults)) {
    return { ...DEFAULT_STYLE_DEFAULTS };
  }

  const getId = (value, fallback) => {
    const normalized = normalizeStyleId(value);
    return normalized || fallback;
  };

  return {
    proStyleId: getId(defaults.proStyleId, DEFAULT_STYLE_DEFAULTS.proStyleId),
    conStyleId: getId(defaults.conStyleId, DEFAULT_STYLE_DEFAULTS.conStyleId),
    judgeStyleId: getId(defaults.judgeStyleId, DEFAULT_STYLE_DEFAULTS.judgeStyleId),
  };
};

export function listCustomStyles() {
  return loadCustomStyles();
}

export function listAllStyles() {
  return [...listBuiltInStyles(), ...loadCustomStyles()];
}

export function getStyleById(id) {
  const normalizedId = normalizeStyleId(id);
  if (!normalizedId) {
    return getBuiltInStyleById(normalizedId);
  }

  const customMatch = loadCustomStyles().find((style) => style.id === normalizedId);
  return customMatch ?? getBuiltInStyleById(normalizedId);
}

export function saveCustomStyle(style) {
  const sanitized = sanitizeCustomStyle(style);
  if (!sanitized) {
    return loadCustomStyles();
  }

  const current = loadCustomStyles();
  const existingIndex = current.findIndex((entry) => entry.id === sanitized.id);

  if (existingIndex >= 0) {
    current[existingIndex] = sanitized;
  } else {
    current.push(sanitized);
  }

  saveCustomStyles(current);
  return current;
}

export function updateCustomStyle(style) {
  const sanitized = sanitizeCustomStyle(style);
  if (!sanitized) {
    return loadCustomStyles();
  }

  const current = loadCustomStyles();
  const existingIndex = current.findIndex((entry) => entry.id === sanitized.id);

  if (existingIndex === -1) {
    return current;
  }

  current[existingIndex] = sanitized;
  saveCustomStyles(current);
  return current;
}

export function deleteCustomStyle(id) {
  const normalizedId = normalizeStyleId(id);
  if (!normalizedId || BUILT_IN_ID_SET.has(normalizedId)) {
    return loadCustomStyles();
  }

  const current = loadCustomStyles();
  const next = current.filter((style) => style.id !== normalizedId);

  if (next.length !== current.length) {
    saveCustomStyles(next);
  }

  return next;
}

export function getStyleDefaults() {
  const stored = readStoredJson(STYLE_DEFAULTS_STORAGE_KEY);
  return normalizeDefaults(stored);
}

export function saveStyleDefaults(defaults) {
  const normalized = normalizeDefaults(defaults);
  writeStoredJson(STYLE_DEFAULTS_STORAGE_KEY, normalized);
  return normalized;
}
