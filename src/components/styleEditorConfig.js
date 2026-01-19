export const ROLE_DEFINITIONS = [
  {
    key: 'pro',
    label: 'Pro Debater',
    tone: 'pro',
    fields: [
      { key: 'system', label: 'System Prompt' },
      { key: 'opening', label: 'Opening Statement' },
      { key: 'round', label: 'Round Response' },
      { key: 'rapidFire', label: 'Rapid Fire' },
      { key: 'closing', label: 'Closing Statement' },
    ],
  },
  {
    key: 'con',
    label: 'Con Debater',
    tone: 'con',
    fields: [
      { key: 'system', label: 'System Prompt' },
      { key: 'opening', label: 'Opening Statement' },
      { key: 'round', label: 'Round Response' },
      { key: 'rapidFire', label: 'Rapid Fire' },
      { key: 'closing', label: 'Closing Statement' },
    ],
  },
  {
    key: 'judge',
    label: 'Judge',
    tone: 'judge',
    fields: [
      { key: 'system', label: 'System Prompt' },
      { key: 'evaluation', label: 'Evaluation Prompt' },
    ],
  },
];
