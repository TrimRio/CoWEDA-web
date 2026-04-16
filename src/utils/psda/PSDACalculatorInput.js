/**
 * Input data container for the PSDA thermal model calculator.
 * All array inputs correspond to 6 body segments:
 * [head, torso, arms, hands, legs, feet]
 */
export class PSDACalculatorInput {
  constructor(inputs) {
    /** Immersion state (1 = air, 2 = water) */
    this.NAW2 = inputs.NAW2;

    /** Initial temperature for each body segment (°C) */
    this.T02 = inputs.T02.map(Number);

    /** Final temperature for each body segment (°C) */
    this.TE2 = inputs.TE2.map(Number);

    /** Initial relative humidity for each segment (e.g. 0.40 = 40%) */
    this.RF02 = inputs.RF02.map(Number);

    /** Final relative humidity for each segment */
    this.RFE2 = inputs.RFE2.map(Number);

    /** Initial wind speed for each segment (m/s) */
    this.VL02 = inputs.VL02.map(Number);

    /** Final wind speed for each segment (m/s) */
    this.VLE2 = inputs.VLE2.map(Number);

    /** Mechanical work output (W) */
    this.WORKOUT2 = Number(inputs.WORKOUT2);

    /** Work efficiency (ratio, e.g. 0.2) */
    this.ETA2 = Number(inputs.ETA2);

    /** Total simulation time (hours) */
    this.TTE2 = Number(inputs.TTE2);

    /** Output time step (hours) */
    this.TTA02 = Number(inputs.TTA02);

    /** Clothed flag (1 = clothed, 2 = unclothed) */
    this.NCLTH2 = inputs.NCLTH2;

    /** Height/weight source (1 = model default, 2 = user input) */
    this.NHW2 = inputs.NHW2;

    /** User height (meters) */
    this.HEG2 = Number(inputs.HEG2);

    /** User weight (kg) */
    this.WEG2 = Number(inputs.WEG2);

    /** Body fat source (1 = user input, 2 = model default) */
    this.NFS2 = inputs.NFS2;

    /** Body fat percentage (e.g. 17.67 for 17.67%) */
    this.BFAT2 = Number(inputs.BFAT2);

    /** VO2 source (1 = known, 2 = unknown/default) */
    this.NVA2 = inputs.NVA2;

    /** VO2 max value (used when NVA2 = 1) */
    this.VO2MAX2 = Number(inputs.VO2MAX2);

    /** User age */
    this.AGE2 = inputs.AGE2;

    /** Interval flag (1 = first interval, 2 = continuing) */
    this.NSTART2 = inputs.NSTART2;

    /** CLO values for each body segment (thermal resistance) */
    this.RH2 = inputs.RH2.map(Number);

    /** Im values for each body segment (evaporative resistance, m²Pa/W) */
    this.PIM2 = inputs.PIM2.map(Number);

    /** Write simulation output flag (1 = yes, 2 = no) */
    this.WRITESIMOUTPUT = inputs.WRITESIMOUTPUT;

    /** Write in/out check flag (1 = yes, 2 = no) */
    this.WRINOUT2 = inputs.WRINOUT2;
  }
}
