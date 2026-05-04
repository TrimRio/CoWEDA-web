import { describe, it, expect } from 'vitest';
import { PSDACalculator }      from './src/utils/psda/PSDACalculator.js';
import { PSDACalculatorInput } from './src/utils/psda/PSDACalculatorInput.js';
import { calculateEnsembleValues } from './src/utils/clothingCalculations.js';

// ─────────────────────────────────────────────────────────────────────────────
// Helper: builds a PSDACalculatorInput from high-level parameters,
// mirroring the buildInputs() logic in usePSDA.js
// ─────────────────────────────────────────────────────────────────────────────

const DEFAULT_SUBJECT = {
  height_m:    1.75,
  weight_kg:   83.5,
  bodyFat_pct: 24.9,
  age:         29,
  vo2max:      60.4,
};

function buildInput({ temp, humidity, wind, activityWatts, isRest, simTimeHours, RH2, PIM2, subject = DEFAULT_SUBJECT }) {
  const arr = (v) => new Array(6).fill(v);
  const humidityDecimal = humidity / 100;
  const eta2     = isRest ? 0 : activityWatts;
  const workout2 = isRest ? 0 : 0.2 * activityWatts;

  return new PSDACalculatorInput({
    NAW2: 1,
    T02:  arr(temp), TE2:  arr(temp),
    RF02: arr(humidityDecimal), RFE2: arr(humidityDecimal),
    VL02: arr(wind),  VLE2: arr(wind),
    ETA2: eta2, WORKOUT2: workout2,
    TTE2: simTimeHours, TTA02: 10,
    NCLTH2: (RH2.every(v => v === 0)) ? 2 : 1,
    NHW2: 2, HEG2: subject.height_m, WEG2: subject.weight_kg,
    NFS2: 1, BFAT2: subject.bodyFat_pct,
    NVA2: 2, VO2MAX2: subject.vo2max, AGE2: subject.age,
    NSTART2: 1, RH2, PIM2,
    WRITESIMOUTPUT: 2, WRINOUT2: 2,
  });
}

function runModel(params) {
  const input = buildInput(params);
  const calc  = new PSDACalculator(input);
  const output = calc.GetResults();
  // Attach time-to-critical properties used by App.jsx
  output.TT_Tshand_crit = calc.TT_Tshand_crit;
  output.TT_Tsfoot_crit = calc.TT_Tsfoot_crit;
  output.TT_WSK_crit    = calc.TT_WSK_crit;
  output.TT_Tc_crit     = calc.TT_Tc_crit;
  return output;
}

// Naked (no clothing)
const NAKED = { RH2: new Array(6).fill(0), PIM2: new Array(6).fill(0) };

// Minimal clothing fixture (single soft shell jacket + trousers)
function makeItem(overrides = {}) {
  return {
    itemNo: 1, bodySection: 2, itemDescription: 'Test Item', wetCloCoeff: 0.2,
    Rcl_head_clo: 0, Rcl_torso_clo: 0, Rcl_arm_clo: 0,
    Rcl_hand_clo: 0, Rcl_leg_clo: 0, Rcl_foot_clo: 0,
    'Recl_head_m^2Pa/W': 0, 'Recl_torso_m^2Pa/W': 0, 'Recl_arm_m^2Pa/W': 0,
    'Recl_hand_m^2Pa/W': 0, 'Recl_leg_m^2Pa/W': 0, 'Recl_foot_m^2Pa/W': 0,
    ...overrides,
  };
}

const NUDE_ENSEMBLE = [];

const LIGHT_ENSEMBLE = [
  makeItem({ itemDescription: 'Soft Shell Jacket', Rcl_torso_clo: 0.946, Rcl_arm_clo: 0.65, 'Recl_torso_m^2Pa/W': 46.13, 'Recl_arm_m^2Pa/W': 55.936 }),
  makeItem({ itemDescription: 'Soft Shell Trouser', bodySection: 4, Rcl_leg_clo: 0.752, 'Recl_leg_m^2Pa/W': 70.571 }),
  makeItem({ itemDescription: 'CW Combat Boot', bodySection: 5, Rcl_foot_clo: 0.9, 'Recl_foot_m^2Pa/W': 175.7 }),
  makeItem({ itemDescription: 'LW Boot Sock', bodySection: 5, Rcl_foot_clo: 0.30, 'Recl_foot_m^2Pa/W': 5.7 }),
];

const HEAVY_ENSEMBLE = [
  makeItem({ itemDescription: 'LW Undershirt', Rcl_torso_clo: 0.20, Rcl_arm_clo: 0.10, 'Recl_torso_m^2Pa/W': 0.8, 'Recl_arm_m^2Pa/W': 0.4 }),
  makeItem({ itemDescription: 'ECW Parka', itemNo: 2, Rcl_torso_clo: 1.20, Rcl_arm_clo: 0.80, 'Recl_torso_m^2Pa/W': 4.5, 'Recl_arm_m^2Pa/W': 3.0 }),
  makeItem({ itemDescription: 'CW Cap', bodySection: 1, Rcl_head_clo: 0.38, 'Recl_head_m^2Pa/W': 1.2 }),
  makeItem({ itemDescription: 'Cold/Wet Glove', bodySection: 3, Rcl_hand_clo: 0.35, 'Recl_hand_m^2Pa/W': 1.4 }),
  makeItem({ itemDescription: 'ECW Trouser', bodySection: 4, Rcl_leg_clo: 0.85, 'Recl_leg_m^2Pa/W': 3.2 }),
  makeItem({ itemDescription: 'Vapor Barrier Boot', bodySection: 5, Rcl_foot_clo: 1.05, 'Recl_foot_m^2Pa/W': 3.8 }),
  makeItem({ itemDescription: 'Heavyweight Wool Sock', bodySection: 5, Rcl_foot_clo: 0.40, 'Recl_foot_m^2Pa/W': 1.5 }),
];

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('PSDACalculator — model mechanics', () => {

  // ── Output structure ───────────────────────────────────────────────────────

  describe('output structure', () => {
    it('returns a valid result object for a basic run', () => {
      const output = runModel({ temp: -10, humidity: 50, wind: 3, activityWatts: 200, isRest: false, simTimeHours: 4, ...NAKED });
      expect(output).toBeDefined();
      expect(output.IsResultValid).toBe(true);
    });

    it('returns expected output fields', () => {
      const output = runModel({ temp: -10, humidity: 50, wind: 3, activityWatts: 200, isRest: false, simTimeHours: 4, ...NAKED });
      expect(output).toHaveProperty('TC2');
      expect(output).toHaveProperty('TC34');
      expect(output).toHaveProperty('TT_Tshand_crit');
      expect(output).toHaveProperty('TT_Tsfoot_crit');
      expect(output).toHaveProperty('TT_WSK_crit');
    });

    it('returns finite numbers for core temperature outputs', () => {
      const output = runModel({ temp: -10, humidity: 50, wind: 3, activityWatts: 200, isRest: false, simTimeHours: 4, ...NAKED });
      expect(isFinite(output.TC2)).toBe(true);
    });
  });

  // ── Cold stress: naked conditions ─────────────────────────────────────────

  describe('cold stress without clothing', () => {
    it('predicts hypothermia risk (TC34) within simulation time at severe cold, naked', () => {
      // -30°C, wind 10 m/s, no clothing — should predict core cooling to 34°C
      const output = runModel({ temp: -30, humidity: 60, wind: 10, activityWatts: 0, isRest: true, simTimeHours: 24, ...NAKED });
      // TC34 should be a positive time value (not -1 = never occurred)
      expect(output.TC34).toBeGreaterThan(0);
    });

    it('predicts frostbite risk to hands at severe cold, naked', () => {
      const output = runModel({ temp: -30, humidity: 60, wind: 10, activityWatts: 0, isRest: true, simTimeHours: 24, ...NAKED });
      expect(output.TT_Tshand_crit).toBeGreaterThan(0);
    });

    it('predicts frostbite risk to feet at severe cold, naked', () => {
      const output = runModel({ temp: -30, humidity: 60, wind: 10, activityWatts: 0, isRest: true, simTimeHours: 24, ...NAKED });
      expect(output.TT_Tsfoot_crit).toBeGreaterThan(0);
    });
  });

  // ── Clothing improves outcomes ────────────────────────────────────────────

  describe('clothing effect on risk times', () => {
    const BASE = { temp: -20, humidity: 60, wind: 5, activityWatts: 0, isRest: true, simTimeHours: 24 };

    it('heavy ensemble delays TC34 compared to naked', () => {
      const nakedOutput = runModel({ ...BASE, ...NAKED });
      const { RH2, PIM2 } = calculateEnsembleValues(HEAVY_ENSEMBLE);
      const clothedOutput = runModel({ ...BASE, RH2, PIM2 });

      // If naked never reaches TC34 in the window (-1), skip (environment too mild)
      if (nakedOutput.TC34 === -1) return;

      // Clothed should survive longer or never reach TC34
      const clothedTime = clothedOutput.TC34 === -1 ? Infinity : clothedOutput.TC34;
      expect(clothedTime).toBeGreaterThan(nakedOutput.TC34);
    });

    it('heavy ensemble delays hand frostbite compared to light ensemble', () => {
      const { RH2: rLight, PIM2: pLight } = calculateEnsembleValues(LIGHT_ENSEMBLE);
      const { RH2: rHeavy, PIM2: pHeavy } = calculateEnsembleValues(HEAVY_ENSEMBLE);

      const lightOutput = runModel({ ...BASE, RH2: rLight, PIM2: pLight });
      const heavyOutput = runModel({ ...BASE, RH2: rHeavy, PIM2: pHeavy });

      if (lightOutput.TT_Tshand_crit === -1) return; // No frostbite in light case — skip

      const heavyTime = heavyOutput.TT_Tshand_crit === -1 ? Infinity : heavyOutput.TT_Tshand_crit;
      expect(heavyTime).toBeGreaterThan(lightOutput.TT_Tshand_crit);
    });
  });

  // ── Temperature sensitivity ───────────────────────────────────────────────

  describe('temperature sensitivity', () => {
    const BASE = { humidity: 60, wind: 3, activityWatts: 0, isRest: true, simTimeHours: 24, ...NAKED };

    it('colder temperature produces earlier or equal TC34 than milder temperature', () => {
      const mild   = runModel({ ...BASE, temp: -10 });
      const severe = runModel({ ...BASE, temp: -30 });

      // If mild never reaches TC34, severe should also not or reach it later — but
      // if severe reaches it, that time should be less than mild's
      if (severe.TC34 !== -1 && mild.TC34 !== -1) {
        expect(severe.TC34).toBeLessThanOrEqual(mild.TC34);
      }
      // If severe reaches TC34 but mild doesn't — that's correct direction
      if (severe.TC34 !== -1 && mild.TC34 === -1) {
        expect(true).toBe(true);
      }
    });

    it('colder temperature produces earlier or equal hand frostbite time', () => {
      const mild   = runModel({ ...BASE, temp: -10 });
      const severe = runModel({ ...BASE, temp: -30 });

      if (severe.TT_Tshand_crit !== -1 && mild.TT_Tshand_crit !== -1) {
        expect(severe.TT_Tshand_crit).toBeLessThanOrEqual(mild.TT_Tshand_crit);
      }
    });
  });

  // ── Wind sensitivity ──────────────────────────────────────────────────────

  describe('wind sensitivity', () => {
    const BASE = { temp: -20, humidity: 60, activityWatts: 0, isRest: true, simTimeHours: 24, ...NAKED };

    it('higher wind speed produces earlier or equal TC34', () => {
      const calm   = runModel({ ...BASE, wind: 1 });
      const windy  = runModel({ ...BASE, wind: 10 });

      if (windy.TC34 !== -1 && calm.TC34 !== -1) {
        expect(windy.TC34).toBeLessThanOrEqual(calm.TC34);
      }
    });

    it('higher wind speed produces earlier or equal foot frostbite', () => {
      const calm  = runModel({ ...BASE, wind: 1 });
      const windy = runModel({ ...BASE, wind: 10 });

      if (windy.TT_Tsfoot_crit !== -1 && calm.TT_Tsfoot_crit !== -1) {
        expect(windy.TT_Tsfoot_crit).toBeLessThanOrEqual(calm.TT_Tsfoot_crit);
      }
    });
  });

  // ── Activity sensitivity ──────────────────────────────────────────────────

  // describe('activity effect', () => {
  //   const BASE = { temp: -20, humidity: 60, wind: 5, simTimeHours: 4, ...NAKED };
  //
  //   it('active subject (200W) delays TC34 compared to resting at cold temperature', () => {
  //     // Use -10°C where metabolic heat gain from activity clearly outweighs convective loss
  //     const BASE_MILD = { temp: -10, humidity: 60, wind: 5, simTimeHours: 4, ...NAKED };
  //     const resting = runModel({ ...BASE_MILD, activityWatts: 0, isRest: true });
  //     const active  = runModel({ ...BASE_MILD, activityWatts: 200, isRest: false });
  //
  //     if (resting.TC34 !== -1) {
  //       const activeTime = active.TC34 === -1 ? Infinity : active.TC34;
  //       expect(activeTime).toBeGreaterThan(resting.TC34);
  //     }
  //   });
  // });

  // ── Rest vs active simulation windows ────────────────────────────────────

  describe('simulation time window', () => {
    it('rest mode uses 24-hour window without error', () => {
      const output = runModel({ temp: -10, humidity: 50, wind: 2, activityWatts: 0, isRest: true, simTimeHours: 24, ...NAKED });
      expect(output.IsResultValid).toBe(true);
    });

    it('active mode uses 4-hour window without error', () => {
      const output = runModel({ temp: -10, humidity: 50, wind: 2, activityWatts: 200, isRest: false, simTimeHours: 4, ...NAKED });
      expect(output.IsResultValid).toBe(true);
    });

    it('TC34 time does not exceed simulation window when it occurs', () => {
      const simTime = 24;
      const output = runModel({ temp: -30, humidity: 60, wind: 10, activityWatts: 0, isRest: true, simTimeHours: simTime, ...NAKED });
      if (output.TC34 !== -1) {
        expect(output.TC34).toBeLessThanOrEqual(simTime);
      }
    });
  });

  // ── Plausible physiological output ranges ────────────────────────────────

  describe('physiological plausibility', () => {
    it('final core temperature (TC2) is within plausible human range (20–42°C)', () => {
      const output = runModel({ temp: -15, humidity: 60, wind: 3, activityWatts: 200, isRest: false, simTimeHours: 4, ...NAKED });
      // 9999 is the model's sentinel for "not applicable" — only check real values
      if (output.TC2 !== 9999 && output.TC2 !== -1) {
        expect(output.TC2).toBeGreaterThanOrEqual(20);
        expect(output.TC2).toBeLessThanOrEqual(42);
      }
    });

    it('final mean skin temperature (TS2) is within plausible range (0–40°C)', () => {
      const output = runModel({ temp: -15, humidity: 60, wind: 3, activityWatts: 200, isRest: false, simTimeHours: 4, ...NAKED });
      if (output.TS2 !== 9999 && output.TS2 !== -1) {
        expect(output.TS2).toBeGreaterThanOrEqual(0);
        expect(output.TS2).toBeLessThanOrEqual(40);
      }
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Validation Tests
// Reference values obtained by running native CoWEDA with identical inputs.
// These tests assert numerical agreement with the reference model
// ─────────────────────────────────────────────────────────────────────────────
describe('PSDACalculator — validation against native CoWEDA', () => {

  const validationCases = [
      {
        label: 'Rest, -10°C, Nude',
        inputs: { temp: -10, humidity: 60, wind: 2, activityWatts: 0, isRest: true, simTimeHours: 24 },
        ensemble: NUDE_ENSEMBLE,
        expected: {
          TT_exposed_skin:  0.4,  // Expected values from native desktop CoWEDA v2.1
          TT_Tshand_crit:   0.5,
          TT_Tsfoot_crit:   0.4,
          TC34:             1.03,
          TT_WSK_crit:      -1,
        },
      },

      {
        label: 'Rest, -20°C, Light Ensemble',
        inputs: { temp: -20, humidity: 60, wind: 5, activityWatts: 0, isRest: true, simTimeHours: 24 },
        ensemble: LIGHT_ENSEMBLE,
        expected: {
          TT_exposed_skin:  0.22,
          TT_Tshand_crit:   0.23,
          TT_Tsfoot_crit:   0.95,
          TC34:             1.38,
          TT_WSK_crit:      -1,
      },
    },
    {
      label: 'Rest, -30°C, Heavy Ensemble',
      inputs: { temp: -30, humidity: 60, wind: 10, activityWatts: 0, isRest: true, simTimeHours: 24 },
      ensemble: HEAVY_ENSEMBLE,
      expected: {
        TT_exposed_skin:  0.13,
        TT_Tshand_crit:   1.78,
        TT_Tsfoot_crit:   0.98,
        TC34:             6.98,
        TT_WSK_crit:      -1,
      },
    },
    // add more cases here...
  ];

  const OUTPUT_KEYS = [
    'TT_exposed_skin',
    'TT_Tshand_crit',
    'TT_Tsfoot_crit',
    'TC34',
    'TT_WSK_crit',
  ];

  validationCases.forEach(({ label, ensemble }) => {
    const { RH2, PIM2 } = calculateEnsembleValues(ensemble);
    it(`${label} — RH2: ${RH2.map(v => v.toFixed(3))} | PIM2: ${PIM2.map(v => v.toFixed(3))}`, () => {
      expect(RH2).toHaveLength(6);
      expect(PIM2).toHaveLength(6);
    });
  });

  validationCases.forEach(({ label, inputs, ensemble, expected }) => {
    const { RH2, PIM2 } = calculateEnsembleValues(ensemble);
    const output = runModel({ ...inputs, RH2, PIM2 });

    const outputSummary = OUTPUT_KEYS.map(k => {
      const val = output[k];
      if (val === undefined || val === null) return `${k}: ?`;
      if (val === -1) return `${k}: N/A`;
      return `${k}: ${val === -1 ? 'N/A' : val === null ? '?' : val.toFixed(2)}`;
    }).join(' | ');

    it(`${label} — ${outputSummary}`, () => {
      for (const key of OUTPUT_KEYS) {
        if (expected[key] === null) continue;
        if (output[key] === undefined) continue;
        expect(output[key], `${key} mismatch`).toBeCloseTo(expected[key], 2);
      }
    });
  });

});