/**
 * Default ensembles shipped with the application.
 *
 * Keys follow the itemKey() convention: `"${bodySection}-${itemNo}"`
 *   bodySection 1 = head
 *   bodySection 2 = torso_arms
 *   bodySection 3 = hands
 *   bodySection 4 = legs
 *   bodySection 5 = feet
 *
 * To change which items belong to a default ensemble, edit the arrays below.
 * Add new ensembles by adding another entry to DEFAULT_ENSEMBLES.
 */
export const DEFAULT_ENSEMBLES = [
  {
    name: 'Default Ensemble',
    items: {
      head:       ['1-2'],           // CW Cap
      torso_arms: ['2-8', '2-5'],    // LW Undershirt, Soft Shell Jacket
      hands:      ['3-2'],           // Glove Liner
      legs:       ['4-5', '4-6'],    // LW Cold Weather Drawers, MARS Boxer Brief
      feet:       ['5-3', '5-4'],    // CW Combat Boot, LW Boot Sock
    },
  },
  {
    name: 'Arctic Kit',
    items: {
      head:       ['1-3', '1-2'],    // Lightweight Balaclava, CW Cap
      torso_arms: ['2-8', '2-7', '2-1'],  // LW Undershirt, Midweight Shirt, ECW Parka (stowed hood)
      hands:      ['3-2', '3-1'],    // Glove Liner, Cold/Wet Glove
      legs:       ['4-5', '4-4', '4-1'],  // LW Drawers, Midweight Drawers, ECW Trouser
      feet:       ['5-1', '5-5'],    // Vapor Barrier Boot, Heavyweight Wool Sock
    },
  },
  {
    name: 'Light Layer',
    items: {
      head:       [],
      torso_arms: ['2-9', '2-5'],    // T-Shirt, Soft Shell Jacket
      hands:      [],
      legs:       ['4-6', '4-2'],    // MARS Boxer Brief, Soft Shell Trouser
      feet:       ['5-3', '5-4'],    // CW Combat Boot, LW Boot Sock
    },
  },
];

/**
 * Returns the items map for a given ensemble name, or null if not found.
 */
export function getDefaultEnsembleItems(name) {
  const found = DEFAULT_ENSEMBLES.find(e => e.name === name);
  return found ? found.items : null;
}

/** Convenience: just the names, for initializing state. */
export const DEFAULT_ENSEMBLE_NAMES = DEFAULT_ENSEMBLES.map(e => e.name);
