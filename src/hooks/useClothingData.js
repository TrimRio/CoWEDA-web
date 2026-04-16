import { useState, useEffect, useMemo } from 'react';
import Papa from 'papaparse';

// ── Zone mapping ──────────────────────────────────────────────────────────────
// Maps bodySection ID from CSV to the zone key used in the UI.
// bodySection 2 (torso garments) maps to 'torso_arms' — a combined UI zone
// since torso garments also cover the arms (via Rcl_arm_clo).
export const BODY_SECTION_TO_ZONE = {
  1: 'head',
  2: 'torso_arms',
  3: 'hands',
  4: 'legs',
  5: 'feet',
};

/**
 * Returns the primary display clo value for an item given its UI zone.
 * For torso_arms we show Rcl_torso_clo as the primary per-item value;
 * the parallel weighted average is computed separately at the zone level.
 */
export function zonePrimaryClo(item, zone) {
  switch (zone) {
    case 'head':       return item.Rcl_head_clo;
    case 'torso_arms': return item.Rcl_torso_clo;
    case 'hands':      return item.Rcl_hand_clo;
    case 'legs':       return item.Rcl_leg_clo;
    case 'feet':       return item.Rcl_foot_clo;
    default:           return item.Rcl_torso_clo || item.Rcl_head_clo || 0;
  }
}

/**
 * Generates a unique key for a clothing item.
 */
export function itemKey(item) {
  return `${item.bodySection}-${item.itemNo}`;
}

function parseLayerConflict(raw) {
  if (!raw && raw !== 0) return [];
  return String(raw).split('|').map(Number).filter(Boolean);
}

function transformRow(row) {
  return {
    itemNo:          Number(row.itemNo),
    bodySection:     Number(row.bodySection),
    layer:           Number(row.layer),
    displayOrderNo:  Number(row.displayOrderNo),
    layerConflict:   parseLayerConflict(row.layerConflict),
    itemDescription: row.itemDescription?.trim() ?? '',
    itemWeight_kg:   Number(row.itemWeight_kg) || 0,
    NSN:             row.NSN || null,
    image:           row.image?.trim() ?? '',

    Rcl_head_clo:  Number(row.Rcl_head_clo)  || 0,
    Rcl_torso_clo: Number(row.Rcl_torso_clo) || 0,
    Rcl_arm_clo:   Number(row.Rcl_arm_clo)   || 0,
    Rcl_hand_clo:  Number(row.Rcl_hand_clo)  || 0,
    Rcl_leg_clo:   Number(row.Rcl_leg_clo)   || 0,
    Rcl_foot_clo:  Number(row.Rcl_foot_clo)  || 0,

    'Recl_head_m^2Pa/W':  Number(row['Recl_head_m^2Pa/W'])  || 0,
    'Recl_torso_m^2Pa/W': Number(row['Recl_torso_m^2Pa/W']) || 0,
    'Recl_arm_m^2Pa/W':   Number(row['Recl_arm_m^2Pa/W'])   || 0,
    'Recl_hand_m^2Pa/W':  Number(row['Recl_hand_m^2Pa/W'])  || 0,
    'Recl_leg_m^2Pa/W':   Number(row['Recl_leg_m^2Pa/W'])   || 0,
    'Recl_foot_m^2Pa/W':  Number(row['Recl_foot_m^2Pa/W'])  || 0,

    fcl_head:  Number(row.fcl_head)  || 1,
    fcl_torso: Number(row.fcl_torso) || 1,
    fcl_arm:   Number(row.fcl_arm)   || 1,
    fcl_hand:  Number(row.fcl_hand)  || 1,
    fcl_leg:   Number(row.fcl_leg)   || 1,
    fcl_foot:  Number(row.fcl_foot)  || 1,

    wetCloCoeff: Number(row.wetCloCoeff) || 0.2,
  };
}

export function useClothingData() {
  const [items,     setItems]     = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error,     setError]     = useState(null);

  useEffect(() => {
    setIsLoading(true);
    setError(null);

    fetch('/CIEdata.csv')
      .then(response => {
        if (!response.ok) throw new Error(`Failed to load CIEdata.csv (${response.status})`);
        return response.text();
      })
      .then(csvText => {
        const { data, errors } = Papa.parse(csvText, {
          header:         true,
          dynamicTyping:  false,
          skipEmptyLines: true,
        });

        if (errors.length > 0) console.warn('CSV parse warnings:', errors);

        const cleaned = data
          .map(transformRow)
          .filter(item => item.itemNo && item.bodySection && item.itemDescription);

        cleaned.sort((a, b) =>
          a.bodySection !== b.bodySection
            ? a.bodySection - b.bodySection
            : a.displayOrderNo - b.displayOrderNo
        );

        setItems(cleaned);
      })
      .catch(err => {
        console.error('useClothingData error:', err);
        setError(err.message);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const byZone = useMemo(() =>
    items.reduce((acc, item) => {
      const zone = BODY_SECTION_TO_ZONE[item.bodySection];
      if (zone) {
        if (!acc[zone]) acc[zone] = [];
        acc[zone].push(item);
      }
      return acc;
    }, {}),
    [items]
  );

  return { items, byZone, isLoading, error };
}
