/**
 * Clothing ensemble calculations — converted from clothing.cs
 *
 * Takes an array of selected clothing items and computes the combined
 * thermal resistance (RH2) and evaporative resistance (PIM2) arrays
 * that feed directly into PSDACalculatorInput.
 *
 * Body segment indices (used throughout):
 *   0 = head, 1 = torso, 2 = arms, 3 = hands, 4 = legs, 5 = feet
 */

// ─────────────────────────────────────────────────────────────────────────────
// Layering correction factors (from T21-03 research, updated 5/3/2023)
// Applied when more than one garment covers a segment — accounts for the fact
// that layered insulation is not simply additive.
// ─────────────────────────────────────────────────────────────────────────────
const LAYERING_FACTORS = {
  thermalResistance: {
    torso: 0.836,
    arms:  0.809,
    legs:  0.961,
  },
  evaporativeResistance: {
    torso: 0.999,
    arm:   0.737,
    leg:   0.950,
  },
};

/**
 * Calculates combined RH2 (thermal resistance) and PIM2 (evaporative resistance)
 * arrays from a list of selected clothing items.
 *
 * @param {Object[]} selectedItems - Clothing items selected by the user.
 *   Each item should have the shape from clothingData.js (Rcl_*, Recl_*, etc.)
 * @param {boolean} [isWet=false] - Whether to apply wet clothing coefficients.
 * @returns {{ RH2: number[], PIM2: number[] }}
 *   Arrays of length 6 (one value per body segment) ready for PSDACalculatorInput.
 */
export function calculateEnsembleValues(selectedItems, isWet = false) {

  // Handle naked / no clothing case
  if (!selectedItems || selectedItems.length === 0) {
    return {
      RH2:  new Array(6).fill(0),
      PIM2: new Array(6).fill(0),
    };
  }

  // ── Step 1: Sum raw values from all selected items ──────────────────────────
  let TR_RCL_Head  = 0, TR_Rcl_Torso = 0, TR_Rcl_Arm  = 0;
  let TR_Rcl_Hand  = 0, TR_Rcl_Leg   = 0, TR_Rcl_Foot = 0;

  let ER_RECL_Head  = 0, ER_RECL_Torso = 0, ER_RECL_Arm  = 0;
  let ER_RECL_Hand  = 0, ER_RECL_Leg   = 0, ER_RECL_Foot = 0;

  // Socks and boots are handled separately for foot insulation
  let socksRcl = 0;
  let bootsRcl = 0;

  // Count garments per segment (needed for layering correction)
  const segmentCounts = [0, 0, 0, 0, 0, 0]; // [head, torso, arms, hands, legs, feet]

  for (const item of selectedItems) {
    const wetFactor = isWet ? item.wetCloCoeff : 1;

    TR_RCL_Head  += item.Rcl_head_clo   * wetFactor;
    TR_Rcl_Torso += item.Rcl_torso_clo  * wetFactor;
    TR_Rcl_Arm   += item.Rcl_arm_clo    * wetFactor;
    TR_Rcl_Hand  += item.Rcl_hand_clo   * wetFactor;
    TR_Rcl_Leg   += item.Rcl_leg_clo    * wetFactor;

    ER_RECL_Head  += item['Recl_head_m^2Pa/W'];
    ER_RECL_Torso += item['Recl_torso_m^2Pa/W'];
    ER_RECL_Arm   += item['Recl_arm_m^2Pa/W'];
    ER_RECL_Hand  += item['Recl_hand_m^2Pa/W'];
    ER_RECL_Leg   += item['Recl_leg_m^2Pa/W'];
    ER_RECL_Foot  += item['Recl_foot_m^2Pa/W'];

    // Track socks vs. boots separately for foot calculation
    if (item.itemDescription.toLowerCase().includes('sock')) {
      socksRcl += item.Rcl_foot_clo * wetFactor;
    } else {
      bootsRcl += item.Rcl_foot_clo * wetFactor;
    }

    // Count garments per segment (only count items that actually cover a segment)
    if (item.Rcl_head_clo  > 0) segmentCounts[0]++;
    if (item.Rcl_torso_clo > 0) segmentCounts[1]++;
    if (item.Rcl_arm_clo   > 0) segmentCounts[2]++;
    if (item.Rcl_hand_clo  > 0) segmentCounts[3]++;
    if (item.Rcl_leg_clo   > 0) segmentCounts[4]++;
    if (item.Rcl_foot_clo  > 0) segmentCounts[5]++;
  }

  // ── Step 2: Apply layering corrections when multiple garments cover a segment ─
  // Thermal resistance (Rcl)
  if (segmentCounts[1] > 1) TR_Rcl_Torso *= LAYERING_FACTORS.thermalResistance.torso;
  if (segmentCounts[2] > 1) TR_Rcl_Arm   *= LAYERING_FACTORS.thermalResistance.arms;
  if (segmentCounts[4] > 1) TR_Rcl_Leg   *= LAYERING_FACTORS.thermalResistance.legs;

  // Evaporative resistance (Recl)
  ER_RECL_Torso *= LAYERING_FACTORS.evaporativeResistance.torso;
  ER_RECL_Arm   *= LAYERING_FACTORS.evaporativeResistance.arm;
  ER_RECL_Leg   *= LAYERING_FACTORS.evaporativeResistance.leg;

  // ── Step 3: Special foot calculation — socks + boots are not simply additive ─
  // If boots provide more insulation than socks, use boots + 11% of socks.
  // If socks provide more, use just the sock value.
  if (bootsRcl <= socksRcl && socksRcl > 0) {
    TR_Rcl_Foot = socksRcl;
  } else {
    TR_Rcl_Foot = bootsRcl + 0.11 * socksRcl;
  }

  // ── Step 4: Build output arrays ─────────────────────────────────────────────
  let RH2  = [TR_RCL_Head, TR_Rcl_Torso, TR_Rcl_Arm, TR_Rcl_Hand, TR_Rcl_Leg, TR_Rcl_Foot];
  let PIM2 = [ER_RECL_Head, ER_RECL_Torso, ER_RECL_Arm, ER_RECL_Hand, ER_RECL_Leg, ER_RECL_Foot];

  // ── Step 5: Zero out negligible values (noise threshold) ────────────────────
  // Threshold 0.5 works for all regions per 5/3/2023 update
  for (let i = 0; i < 6; i++) {
    if (RH2[i]  <= 0.001) RH2[i]  = 0;
    if (PIM2[i] <= 0.50)  PIM2[i] = 0;
  }

  // ── Step 6: If all values are zero, keep as zero (naked condition) ───────────
  const allRHZero  = RH2.every(v  => v === 0);
  const allPIMZero = PIM2.every(v => v === 0);
  if (allRHZero)  RH2  = new Array(6).fill(0);
  if (allPIMZero) PIM2 = new Array(6).fill(0);

  return { RH2, PIM2 };
}
