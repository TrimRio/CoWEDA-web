import { describe, it, expect } from 'vitest';
import { calculateEnsembleValues } from './src/utils/clothingCalculations.js';

// ─────────────────────────────────────────────────────────────────────────────
// Test fixture helpers
// Creates minimal clothing item shapes matching the real CSV data structure.
// Segments: 0=head, 1=torso, 2=arms, 3=hands, 4=legs, 5=feet
// ─────────────────────────────────────────────────────────────────────────────

function makeItem(overrides = {}) {
  return {
    itemNo: 1,
    bodySection: 2,
    itemDescription: 'Test Item',
    wetCloCoeff: 0.2,
    Rcl_head_clo:  0, Rcl_torso_clo: 0, Rcl_arm_clo:  0,
    Rcl_hand_clo:  0, Rcl_leg_clo:   0, Rcl_foot_clo: 0,
    'Recl_head_m^2Pa/W':  0, 'Recl_torso_m^2Pa/W': 0, 'Recl_arm_m^2Pa/W':  0,
    'Recl_hand_m^2Pa/W':  0, 'Recl_leg_m^2Pa/W':   0, 'Recl_foot_m^2Pa/W': 0,
    ...overrides,
  };
}

// Realistic items loosely based on the Default Ensemble clothing values
const CW_CAP = makeItem({
  itemDescription: 'CW Cap',
  bodySection: 1,
  Rcl_head_clo: 0.38,
  'Recl_head_m^2Pa/W': 1.2,
});

const LW_UNDERSHIRT = makeItem({
  itemDescription: 'LW Undershirt',
  bodySection: 2,
  Rcl_torso_clo: 0.20, Rcl_arm_clo: 0.10,
  'Recl_torso_m^2Pa/W': 0.8, 'Recl_arm_m^2Pa/W': 0.4,
});

const SOFT_SHELL_JACKET = makeItem({
  itemDescription: 'Soft Shell Jacket',
  bodySection: 2,
  Rcl_torso_clo: 0.55, Rcl_arm_clo: 0.30,
  'Recl_torso_m^2Pa/W': 2.1, 'Recl_arm_m^2Pa/W': 1.1,
});

const GLOVE_LINER = makeItem({
  itemDescription: 'Glove Liner',
  bodySection: 3,
  Rcl_hand_clo: 0.18,
  'Recl_hand_m^2Pa/W': 0.6,
});

const LW_DRAWERS = makeItem({
  itemDescription: 'LW Cold Weather Drawers',
  bodySection: 4,
  Rcl_leg_clo: 0.30,
  'Recl_leg_m^2Pa/W': 1.0,
});

const CW_COMBAT_BOOT = makeItem({
  itemDescription: 'CW Combat Boot',
  bodySection: 5,
  Rcl_foot_clo: 0.65,
  'Recl_foot_m^2Pa/W': 2.0,
});

const LW_BOOT_SOCK = makeItem({
  itemDescription: 'LW Boot Sock',  // contains 'sock' — triggers special foot logic
  bodySection: 5,
  Rcl_foot_clo: 0.20,
  'Recl_foot_m^2Pa/W': 0.7,
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('calculateEnsembleValues', () => {

  // ── Empty / naked ──────────────────────────────────────────────────────────

  describe('empty input', () => {
    it('returns zero arrays when no items are selected', () => {
      const { RH2, PIM2 } = calculateEnsembleValues([]);
      expect(RH2).toEqual([0, 0, 0, 0, 0, 0]);
      expect(PIM2).toEqual([0, 0, 0, 0, 0, 0]);
    });

    it('returns zero arrays when called with null', () => {
      const { RH2, PIM2 } = calculateEnsembleValues(null);
      expect(RH2).toEqual([0, 0, 0, 0, 0, 0]);
      expect(PIM2).toEqual([0, 0, 0, 0, 0, 0]);
    });

    it('returns arrays of length 6', () => {
      const { RH2, PIM2 } = calculateEnsembleValues([]);
      expect(RH2).toHaveLength(6);
      expect(PIM2).toHaveLength(6);
    });
  });

  // ── Single item ────────────────────────────────────────────────────────────

  describe('single item', () => {
    it('correctly maps head item to RH2[0]', () => {
      const { RH2 } = calculateEnsembleValues([CW_CAP]);
      expect(RH2[0]).toBeCloseTo(0.38, 5);
      // All other segments should be zero
      expect(RH2[1]).toBe(0);
      expect(RH2[2]).toBe(0);
    });

    it('correctly maps hand item to RH2[3]', () => {
      const { RH2 } = calculateEnsembleValues([GLOVE_LINER]);
      expect(RH2[3]).toBeCloseTo(0.18, 5);
      expect(RH2[0]).toBe(0);
    });

    it('correctly maps leg item to RH2[4]', () => {
      const { RH2 } = calculateEnsembleValues([LW_DRAWERS]);
      expect(RH2[4]).toBeCloseTo(0.30, 5);
    });

    it('no layering correction applied with a single torso item', () => {
      const { RH2 } = calculateEnsembleValues([LW_UNDERSHIRT]);
      // With only one torso item, no layering factor should be applied
      expect(RH2[1]).toBeCloseTo(0.20, 5);
      expect(RH2[2]).toBeCloseTo(0.10, 5);
    });
  });

  // ── Layering corrections ───────────────────────────────────────────────────

  describe('layering corrections', () => {
    it('applies torso layering factor (0.836) when two torso items selected', () => {
      const { RH2 } = calculateEnsembleValues([LW_UNDERSHIRT, SOFT_SHELL_JACKET]);
      const rawTorso = LW_UNDERSHIRT.Rcl_torso_clo + SOFT_SHELL_JACKET.Rcl_torso_clo;
      expect(RH2[1]).toBeCloseTo(rawTorso * 0.836, 4);
    });

    it('applies arm layering factor (0.809) when two torso items cover arms', () => {
      const { RH2 } = calculateEnsembleValues([LW_UNDERSHIRT, SOFT_SHELL_JACKET]);
      const rawArm = LW_UNDERSHIRT.Rcl_arm_clo + SOFT_SHELL_JACKET.Rcl_arm_clo;
      expect(RH2[2]).toBeCloseTo(rawArm * 0.809, 4);
    });

    it('does not apply layering correction to head (no head layering factor)', () => {
      const secondCap = makeItem({ ...CW_CAP, itemNo: 2 });
      const { RH2 } = calculateEnsembleValues([CW_CAP, secondCap]);
      // Head has no layering correction — should be simple sum
      expect(RH2[0]).toBeCloseTo(CW_CAP.Rcl_head_clo * 2, 5);
    });
  });

  // ── Foot calculation (socks vs boots) ─────────────────────────────────────

  describe('foot insulation (socks vs boots)', () => {
    it('uses boot + 11% of sock when boots have more insulation', () => {
      // CW_COMBAT_BOOT (0.65) > LW_BOOT_SOCK (0.20), so: 0.65 + 0.11 * 0.20
      const { RH2 } = calculateEnsembleValues([CW_COMBAT_BOOT, LW_BOOT_SOCK]);
      const expected = 0.65 + 0.11 * 0.20;
      expect(RH2[5]).toBeCloseTo(expected, 4);
    });

    it('uses sock value alone when sock has more insulation than boot', () => {
      const heavySock = makeItem({
        itemDescription: 'Heavyweight Wool Sock',
        bodySection: 5,
        Rcl_foot_clo: 0.90,
        'Recl_foot_m^2Pa/W': 2.5,
      });
      const lightBoot = makeItem({
        itemDescription: 'Light Boot',
        bodySection: 5,
        Rcl_foot_clo: 0.40,
        'Recl_foot_m^2Pa/W': 1.5,
      });
      const { RH2 } = calculateEnsembleValues([heavySock, lightBoot]);
      expect(RH2[5]).toBeCloseTo(0.90, 4);
    });

    it('uses boot value alone when no socks selected', () => {
      const { RH2 } = calculateEnsembleValues([CW_COMBAT_BOOT]);
      // bootsRcl=0.65, socksRcl=0 → bootsRcl + 0.11 * 0 = 0.65
      expect(RH2[5]).toBeCloseTo(0.65, 4);
    });
  });

  // ── Wet clothing ───────────────────────────────────────────────────────────

  describe('wet clothing', () => {
    it('reduces thermal resistance when isWet=true', () => {
      const dry = calculateEnsembleValues([LW_UNDERSHIRT], false);
      const wet  = calculateEnsembleValues([LW_UNDERSHIRT], true);
      // wetCloCoeff is 0.2, so wet values should be 20% of dry
      expect(wet.RH2[1]).toBeCloseTo(dry.RH2[1] * LW_UNDERSHIRT.wetCloCoeff, 4);
    });

    it('does not apply wet factor to evaporative resistance', () => {
      const dry = calculateEnsembleValues([LW_UNDERSHIRT], false);
      const wet  = calculateEnsembleValues([LW_UNDERSHIRT], true);
      // Evaporative resistance is not scaled by wetCloCoeff
      expect(wet.PIM2[1]).toBeCloseTo(dry.PIM2[1], 4);
    });
  });

  // ── Noise threshold ────────────────────────────────────────────────────────

  describe('noise threshold', () => {
    it('zeroes out RH2 values at or below 0.001', () => {
      const tinyItem = makeItem({ Rcl_torso_clo: 0.001 });
      const { RH2 } = calculateEnsembleValues([tinyItem]);
      expect(RH2[1]).toBe(0);
    });

    it('preserves RH2 values above 0.001', () => {
      const { RH2 } = calculateEnsembleValues([LW_UNDERSHIRT]);
      expect(RH2[1]).toBeGreaterThan(0);
    });

    it('zeroes out PIM2 values at or below 0.50', () => {
      const lowEvapItem = makeItem({ 'Recl_torso_m^2Pa/W': 0.5 });
      const { PIM2 } = calculateEnsembleValues([lowEvapItem]);
      expect(PIM2[1]).toBe(0);
    });
  });

  // ── Full ensemble (Default Ensemble) ──────────────────────────────────────

  describe('full ensemble', () => {
    const defaultEnsemble = [
      CW_CAP, LW_UNDERSHIRT, SOFT_SHELL_JACKET, GLOVE_LINER, LW_DRAWERS,
      CW_COMBAT_BOOT, LW_BOOT_SOCK,
    ];

    it('returns valid RH2 and PIM2 arrays for a full ensemble', () => {
      const { RH2, PIM2 } = calculateEnsembleValues(defaultEnsemble);
      expect(RH2).toHaveLength(6);
      expect(PIM2).toHaveLength(6);
    });

    it('all RH2 values are non-negative', () => {
      const { RH2 } = calculateEnsembleValues(defaultEnsemble);
      RH2.forEach(v => expect(v).toBeGreaterThanOrEqual(0));
    });

    it('head segment reflects CW Cap insulation', () => {
      const { RH2 } = calculateEnsembleValues(defaultEnsemble);
      expect(RH2[0]).toBeCloseTo(CW_CAP.Rcl_head_clo, 4);
    });

    it('torso segment has layering correction applied', () => {
      const { RH2 } = calculateEnsembleValues(defaultEnsemble);
      const rawTorso = LW_UNDERSHIRT.Rcl_torso_clo + SOFT_SHELL_JACKET.Rcl_torso_clo;
      expect(RH2[1]).toBeCloseTo(rawTorso * 0.836, 3);
    });
  });

});
