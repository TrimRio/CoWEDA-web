import { useState, useEffect, useMemo, useCallback } from 'react';
import { PSDACalculator }       from '../utils/psda/PSDACalculator.js';
import { PSDACalculatorInput }  from '../utils/psda/PSDACalculatorInput.js';
import { calculateEnsembleValues } from '../utils/clothingCalculations.js';

// ─────────────────────────────────────────────────────────────────────────────
// Default subject parameters
// ─────────────────────────────────────────────────────────────────────────────
const DEFAULT_SUBJECT = {
  height_m:       1.75,
  weight_kg:      83.5,
  bodyFat_pct:    24.9,
  age:            29,
  vo2max:         60.4,
};

// ─────────────────────────────────────────────────────────────────────────────
// buildInputs — shared input construction for both live and plot runs
// ─────────────────────────────────────────────────────────────────────────────
function buildInputs({ temp, humidity, wind, activityWatts, isRest, simTimeHours, selectedItems, subject, RH2, PIM2 }) {
  const envArray = (value) => new Array(6).fill(value);
  const humidityDecimal = humidity / 100;

  // Rest mode: pass 0 for both ETA2 and WORKOUT2 so model falls through to basal MR
  const eta2     = isRest ? 0 : activityWatts;
  const workout2 = isRest ? 0 : 0.2 * activityWatts;

  return new PSDACalculatorInput({
    NAW2: 1,
    T02:  envArray(temp),
    TE2:  envArray(temp),
    RF02: envArray(humidityDecimal),
    RFE2: envArray(humidityDecimal),
    VL02: envArray(wind),
    VLE2: envArray(wind),
    ETA2:     eta2,
    WORKOUT2: workout2,
    TTE2:  simTimeHours,
    TTA02: 10,
    NCLTH2: selectedItems.length > 0 ? 1 : 2,
    NHW2:  2,
    HEG2:  subject.height_m,
    WEG2:  subject.weight_kg,
    NFS2:  1,
    BFAT2: subject.bodyFat_pct,
    NVA2:  2,
    VO2MAX2: subject.vo2max,
    AGE2:  subject.age,
    NSTART2: 1,
    RH2,
    PIM2,
    WRITESIMOUTPUT: 2,
    WRINOUT2:       2,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// runCalculator — runs the model and returns the enriched output object
// ─────────────────────────────────────────────────────────────────────────────
function runCalculator(inputs) {
  const calculator = new PSDACalculator(inputs);
  const output = calculator.GetResults();

  output.TT_Tshand_crit = calculator.TT_Tshand_crit;
  output.TT_Tsfoot_crit = calculator.TT_Tsfoot_crit;
  output.TT_Ts_min      = calculator.TT_Ts_min;
  output.TT_Ts_max      = calculator.TT_Ts_max;
  output.TT_WSK_crit    = calculator.TT_WSK_crit;
  output.TT_Tc_crit     = calculator.TT_Tc_crit;
  output.simRows        = calculator.simRows;

  return output;
}

// ─────────────────────────────────────────────────────────────────────────────
// usePSDA
//
// Returns:
//   results        — live summary results (updates on every slider change)
//   isCalculating  — true while live run is in progress
//   error          — any error from the live run
//   simRows        — time-series rows from the most recent plot run (null until Plot clicked)
//   isPlotting     — true while the plot run is in progress
//   runPlot        — call this when the user clicks the Plot button
// ─────────────────────────────────────────────────────────────────────────────
export function usePSDA({ temp, humidity, wind, activityWatts, isRest, simTimeHours, selectedItems, subject = DEFAULT_SUBJECT }) {

  const [results,       setResults]       = useState(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [error,         setError]         = useState(null);

  const [simRows,    setSimRows]    = useState(null);
  const [isPlotting, setIsPlotting] = useState(false);

  const { RH2, PIM2 } = useMemo(
    () => calculateEnsembleValues(selectedItems),
    [selectedItems]
  );

  // clothing values for the exposed-skin run: same ensemble but no foot items
  const { RH2: RH2_exposed, PIM2: PIM2_exposed } = useMemo(
    () => calculateEnsembleValues(selectedItems.filter(i => i.bodySection !== 5)),
    [selectedItems]
  );

  // ── Live run — fires on every input change ────────────────────────────────
  useEffect(() => {
    // Allow rest mode (activityWatts may be 0), but skip if both are 0 in active mode
    if (!isRest && !activityWatts) return;

    setIsCalculating(true);
    setError(null);

    try {
      // Main simulation
      const inputs = buildInputs({ temp, humidity, wind, activityWatts, isRest, simTimeHours, selectedItems, subject, RH2, PIM2 });
      const output = runCalculator(inputs);
      const { simRows: _ignored, ...summaryOutput } = output;

      // Exposed-skin simulation — identical but bare feet (bodySection 5 stripped).
      const inputsExposed = buildInputs({
        temp, humidity, wind, activityWatts, isRest, simTimeHours, selectedItems, subject,
        RH2: RH2_exposed, PIM2: PIM2_exposed,
      });
      const outputExposed = runCalculator(inputsExposed);
      summaryOutput.TT_exposed_skin = outputExposed.TT_Tsfoot_crit;

      setResults(summaryOutput);
    } catch (err) {
      console.error('PSDA calculation error:', err);
      setError(err.message);
    } finally {
      setIsCalculating(false);
    }
  }, [temp, humidity, wind, activityWatts, isRest, simTimeHours, RH2, PIM2, RH2_exposed, PIM2_exposed, subject]);

  // ── Plot run — fires only when the user clicks the Plot button ────────────
  // setTimeout(0) lets React flush the isPlotting spinner before the
  // synchronous calculator run blocks the main thread.
  const runPlot = useCallback(() => {
    if (!isRest && !activityWatts) return;
    setIsPlotting(true);
    setTimeout(() => {
      try {
        const inputs = buildInputs({ temp, humidity, wind, activityWatts, isRest, simTimeHours, selectedItems, subject, RH2, PIM2 });
        const output = runCalculator(inputs);
        setSimRows(output.simRows);
      } catch (err) {
        console.error('PSDA plot run error:', err);
      } finally {
        setIsPlotting(false);
      }
    }, 0);
  }, [temp, humidity, wind, activityWatts, isRest, simTimeHours, selectedItems, subject, RH2, PIM2]);

  return { results, isCalculating, error, simRows, isPlotting, runPlot };
}
