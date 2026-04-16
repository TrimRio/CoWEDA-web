// ── Activity mode ─────────────────────────────────────────────────────────────
export const ACTIVITY_MODES = ['Rest', 'Active'];

// ── Exertion level → metabolic rate (W) ──────────────────────────────────────
// Rest mode forces ETA2=0 / WORKOUT2=0 (basal metabolic rate path in model)
export const EXERTION_WATTS = {
  Light:    200,
  Moderate: 350,
  Heavy:    500,
};

// ── Simulation time limits (hours) ───────────────────────────────────────────
export const SIM_TIME_REST   = 24;
export const SIM_TIME_ACTIVE = 4;

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

export function getRiskStatus(timeHours, maxHours = null) {
  if (timeHours == null || timeHours <= 0)        return 'neutral';
  const cap = maxHours ?? Infinity;
  if (timeHours >= cap)                           return 'ok';
  if (timeHours < RISK_THRESHOLDS.CRITICAL_HOURS) return 'crit';
  if (timeHours < RISK_THRESHOLDS.LIMITED_HOURS)  return 'warn';
  return 'ok';
}

export function formatRiskTime(timeHours, maxHours = null) {
  if (timeHours == null || timeHours <= 0)        return '—';
  const cap = maxHours ?? 9998;
  if (timeHours >= cap) {
    const hrs = Math.floor(cap);
    return `>${hrs} hrs`;
  }
  if (timeHours >= 9998) return '—';
  const totalMinutes = Math.round(timeHours * 60);
  const hrs = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  if (hrs === 0) return `${mins} min`;
  if (mins === 0) return `${hrs} hrs`;
  return `${hrs} hrs ${mins} min`;
}

export const ZONE_LABELS = {
  head:       'Head',
  torso_arms: 'Torso / Arms',
  hands:      'Hands',
  legs:       'Legs',
  feet:       'Feet',
};

export const ZONE_ORDER = ['head', 'torso_arms', 'hands', 'legs', 'feet'];

