// ── Activity options ──────────────────────────────────────────────────────────
export const ACTIVITIES = [
  { label: '— choose activity —', value: 0   },
  { label: 'Sleeping / Rest',      value: 58  },
  { label: 'Seated, quiet',        value: 70  },
  { label: 'Standing, light work', value: 93  },
  { label: 'Walking, slow',        value: 116 },
  { label: 'Walking with load',    value: 150 },
  { label: 'Hiking / moderate',    value: 200 },
  { label: 'Shoveling / heavy',    value: 290 },
  { label: 'Running',              value: 440 },
];

export const RISK_THRESHOLDS = { CRITICAL_HOURS: 2, LIMITED_HOURS: 8 };

export const RISK_COLORS = {
  crit: '#D64045', warn: '#e6a817', ok: '#4C9A5A', neutral: '#9ca3af',
};

export const RISK_BADGES = {
  crit: 'Critical', warn: 'Limited', ok: 'Ideal', neutral: 'Neutral',
};

export function getRiskStatus(timeHours) {
  if (timeHours == null || timeHours <= 0)        return 'neutral';
  if (timeHours < RISK_THRESHOLDS.CRITICAL_HOURS) return 'crit';
  if (timeHours < RISK_THRESHOLDS.LIMITED_HOURS)  return 'warn';
  return 'ok';
}

export function formatRiskTime(timeHours) {
  if (timeHours == null || timeHours <= 0 || timeHours >= 9998) return '—';
  return `${timeHours.toFixed(1)} hrs`;
}

export const ZONE_LABELS = {
  head: 'Head', torso: 'Torso', arms: 'Arms',
  hands: 'Hands', legs: 'Legs', feet: 'Feet',
};

export const ZONE_ORDER = ['head', 'torso', 'arms', 'hands', 'legs', 'feet'];
