// ── Unit conversion utilities ─────────────────────────────────────────────────
// All model inputs must be in SI. This module converts display values ↔ SI.

// Temperature
export const cToF = c => Math.round((c * 9) / 5 + 32);
export const fToC = f => Math.round((f - 32) * 5 / 9);      // rounds to 1 °C

// Wind speed
export const msToMph = ms => Math.round(ms * 2.23694 * 10) / 10;
export const mphToMs = mph => Math.round(mph / 2.23694 * 10) / 10;  // rounds to 0.1 m/s

// ── Unit system definitions ───────────────────────────────────────────────────
// Each entry describes how to render the slider for a given unit system,
// and how to convert slider display value → SI value for the model.

export const UNIT_SYSTEMS = {
  SI: {
    label: 'SI',
    temperature: {
      unit: '°C',
      min: -52,
      max: 5,
      step: 1,
      // display value IS the SI value
      toSI: v => v,
      fromSI: v => v,
      format: v => v,
    },
    wind: {
      unit: 'm/s',
      min: 0,
      max: 22.4,
      step: 0.1,
      toSI: v => v,
      fromSI: v => v,
      format: v => v,
    },
    humidity: {
      unit: '%',
      min: 0,
      max: 100,
      step: 1,
      toSI: v => v,
      fromSI: v => v,
      format: v => v,
    },
  },
  Imperial: {
    label: 'Imperial',
    temperature: {
      unit: '°F',
      min: cToF(-52),   // -62 °F
      max: cToF(5),     //  41 °F
      step: 1,
      toSI: fToC,       // slider value (°F) → model value (°C)
      fromSI: cToF,     // SI value (°C)    → slider value (°F)
      format: v => Math.round(v),
    },
    wind: {
      unit: 'mph',
      min: 0,
      max: Math.round(msToMph(22.4) * 10) / 10,  // ~50.1 mph
      step: 0.1,
      toSI: mphToMs,    // slider value (mph) → model value (m/s)
      fromSI: msToMph,  // SI value (m/s)     → slider value (mph)
      format: v => Math.round(v * 10) / 10,
    },
    humidity: {
      unit: '%',
      min: 0,
      max: 100,
      step: 1,
      toSI: v => v,
      fromSI: v => v,
      format: v => v,
    },
  },
};
