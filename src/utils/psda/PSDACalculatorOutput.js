/**
 * Output data container for the PSDA thermal model calculator.
 * All time values are in hours. -1 indicates the event never occurred.
 */
export class PSDACalculatorOutput {
  constructor() {
    /** Whether the calculator returned a valid result */
    this.IsResultValid = false;

    /** Final core temperature (°C) */
    this.TC2 = -1;

    /** Final mean skin temperature (°C) */
    this.TS2 = -1;

    /** Total sweat loss (kg) */
    this.TSW2 = -1;

    /** Time when core temperature reaches 34°C (hours) */
    this.TC34 = -1;

    /** Time when core temperature reaches 30°C (hours) */
    this.TC30 = -1;

    /** Time when water loss reaches 20% of body weight (hours) */
    this.WL20 = -1;

    /** Estimated time for water loss to reach 20% (Adolph data) (hours) */
    this.WL20EST = -1;

    /** Half-life of survival probability (hours) */
    this.TTPOS50 = -1;

    /** Final simulation time (hours) */
    this.TTOUT2 = -1;

    /** Probability of survival at functional time */
    this.POSTC34 = -1;
  }
}
