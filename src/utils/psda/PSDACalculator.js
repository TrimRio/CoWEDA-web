import { VAP, SECH, dubois, calculateBMI } from './PSDAHelpers.js';
import { PSDACalculatorOutput } from './PSDACalculatorOutput.js';

// ─────────────────────────────────────────────────────────────────────────────
// Internal class: stores neutral-condition initial state for the simulation
// ─────────────────────────────────────────────────────────────────────────────
class NewStart {
  constructor() {
    this.ArterialTemp                        = new Array(2).fill(0);
    this.VenousTemps                         = new Array(6).fill(0);
    this.SkinBloodFlowRates                  = new Array(6).fill(0);
    this.MetabolicHeatProductionCore         = new Array(6).fill(0);
    this.SweatProductionRates                = new Array(6).fill(0);
    this.MaxEvaporationRates                 = new Array(6).fill(0);
    this.MuscleBloodFlowRates                = new Array(6).fill(0);
    this.MuscleMetabolicHeatProductionRates  = new Array(6).fill(0);
    this.CoreBloodFlowRates                  = new Array(6).fill(0);
    this.T       = Array.from({ length: 6 }, () => Array.from({ length: 104 }, () => new Array(2).fill(0)));
    this.STORAG  = new Array(6).fill(0);
    this.TotalSweatLoss = 0;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PSDACalculator
// Six-cylinder thermoregulation model for cold-weather survival prediction.
// Takes PSDACalculatorInput, returns PSDACalculatorOutput via GetResults().
// ─────────────────────────────────────────────────────────────────────────────
export class PSDACalculator {

  // ── Simulation control ──────────────────────────────────────────────────────
  /** @type {number} */ Work_Output_W;
  /** @type {number} */ Total_Metabolic_Rate;
  /** @type {number} */ Real_Time_Final_H = 720.0;
  /** @type {number} */ Time_Interval_Output_Basal_H;

  // ── Subject parameters ──────────────────────────────────────────────────────
  /** @type {boolean} */ Is_Clothed;
  /** @type {boolean} */ Is_Height_Weight;
  /** @type {number}  */ Height_m;
  /** @type {number}  */ Weight_kg;
  /** @type {boolean} */ Is_Body_Fat_Input;
  /** @type {number}  */ Body_Fat_Percent;
  /** @type {boolean} */ Is_VO2_Age_Input;
  /** @type {number}  */ Age;

  // ── Environmental state ─────────────────────────────────────────────────────
  /** @type {number}  */ is_air_water;           // 1=air, 2-9=various immersion modes
  /** @type {boolean} */ Is_Initial_Condition_Neutral;

  // ── Grid / numerical parameters ─────────────────────────────────────────────
  /** @type {number[][]} */ L0 = Array.from({ length: 3 }, () => Array(6).fill(0));
  /** @type {boolean}    */ Is_Write_In_Out_Check;
  /** @type {boolean}    */ Is_Write_Output;

  // ── Integer state variables ─────────────────────────────────────────────────
  /** @type {number} */ JXR = 100;
  /** @type {number} */ K;
  /** @type {number} */ K2 = 1;
  /** @type {number} */ M  = 1;
  /** @type {number} */ NCL0;
  /** @type {number} */ KCIVD;
  /** @type {number} */ is_Shivering;
  /** @type {number} */ NRAD;

  // ── Physiological state variables ───────────────────────────────────────────
  /** @type {number} */ DTMAX;
  /** @type {number} */ chamber_time;
  /** @type {number} */ basal_metabolic_rate;
  /** @type {number} */ TT;
  /** @type {number} */ output_time_interval;
  /** @type {number} */ mean_skin_temp;
  /** @type {number} */ TC;
  /** @type {number} */ total_time_immersion;
  /** @type {number} */ total_time_air;
  /** @type {number} */ TEX;
  /** @type {number} */ total_metabolic_rate_wmNeg2;
  /** @type {number} */ work_output_from_exercise_W;
  /** @type {number} */ XJ;
  /** @type {number} */ init_time_step;
  /** @type {number} */ respiratory_heatloss_W = 10.47;
  /** @type {number} */ YR = 0;

  // ── Shivering state ─────────────────────────────────────────────────────────
  /** @type {number} */ max_shivering_wm3;
  /** @type {number} */ muscle_volume_coreTorso;
  /** @type {number} */ time_shivering_h;
  /** @type {number} */ time_endurance_h;
  /** @type {number} */ init_shivering_wm3;
  /** @type {number} */ secondary_shivering_wm3;
  /** @type {number} */ total_time_shivering_steps;
  /** @type {number} */ ratio_shivering;
  /** @type {number} */ BFCD;
  /** @type {number} */ SHTEND0 = 0;

  // ── VO2 / metabolism ────────────────────────────────────────────────────────
  /** @type {number} */ v02max;
  /** @type {number} */ work_output_end;
  /** @type {number} */ water_loss_percent;

  // ── Threshold / critical values ─────────────────────────────────────────────
  /** @type {number} */ crit_core_temp;
  /** @type {number} */ crit_core_temp_34;
  /** @type {number} */ crit_core_temp_28;
  /** @type {number} */ crit_hand_temp;
  /** @type {number} */ crit_feet_temp;
  /** @type {number} */ water_loss_percent_20;
  /** @type {number} */ TT_Tc_crit      = 9999.0;
  /** @type {number} */ time_core_temp_34 = 9999.0;
  /** @type {number} */ time_core_temp_30 = 9999.0;
  /** @type {number} */ TT_WL20         = 9999.0;
  /** @type {number} */ min_skin_temp;
  /** @type {number} */ max_skin_temp;
  /** @type {number} */ WSK_crit;
  /** @type {number} */ TT_Ts_min       = 9999;
  /** @type {number} */ TT_Ts_max       = 9999.9;
  /** @type {number} */ TT_Tshand_crit  = 9999;
  /** @type {number} */ TT_Tsfoot_crit  = 9999;
  /** @type {number} */ TT_WSK_crit     = 9999;

  // ── Working variables (carried over from original Fortran naming) ────────────
  /** @type {number} */ XF1 = 0;
  /** @type {number} */ MZ1; /** @type {number} */ MZ2;
  /** @type {number} */ CIVD; /** @type {number} */ CIVD0;
  /** @type {number} */ PRES; /** @type {number} */ PV;
  /** @type {number} */ QG1;  /** @type {number} */ QG2;
  /** @type {number} */ QKGES;/** @type {number} */ ROCA;
  /** @type {number} */ TB;   /** @type {number} */ TPCD;
  /** @type {number} */ TRES; /** @type {number} */ TV1;
  /** @type {number} */ TV2;  /** @type {number} */ TV3;
  /** @type {number} */ TTCD; /** @type {number} */ WMIG;
  /** @type {number} */ XF2;  /** @type {number} */ XG1 = 0;
  /** @type {number} */ XG2;  /** @type {number} */ XMCA;
  /** @type {number} */ YR0;  /** @type {number} */ YR1GES;
  /** @type {number} */ YR2GES; /** @type {number} */ YR3GES;
  /** @type {number} */ YRTS; /** @type {number} */ Z;
  /** @type {number} */ Z1;   /** @type {number} */ Z2;
  /** @type {number} */ PI = Math.PI;

  // ── Evaporation / skin wetness ───────────────────────────────────────────────
  /** @type {number} */ TOEVA = 0;   // total evaporation
  /** @type {number} */ TOEMX = 0;   // total max evaporation
  /** @type {number} */ WSK   = 0;   // skin wetness

  // ── Per-segment arrays (index 0–5 = head, torso, arms, hands, legs, feet) ───
  /** @type {number[]} */ Fat_Blood_Flow_m3_Hm3                   = new Array(6).fill(0);
  /** @type {number[]} */ Muscle_Blood_Flow_Initial_m3_Hm3        = new Array(6).fill(0);
  /** @type {number[]} */ Muscle_Metabolic_Heat_Production_Basal_Wm3 = new Array(6).fill(0);
  /** @type {number[]} */ clothing_thickness_mm                   = new Array(6).fill(0);
  /** @type {number[]} */ H                                       = new Array(6).fill(0);
  /** @type {number[]} */ Core_Blood_Flow_Indifferent_Basal_M3_Hm3 = [17.52, 6.6257, 0.4982, 0.6060, 0.3508, 0.1960];
  /** @type {number[]} */ relative_humidity                       = new Array(6).fill(0);
  /** @type {number[]} */ Cylinder_Radius_m                       = new Array(6).fill(0);
  /** @type {number[]} */ TL                                      = new Array(6).fill(0);
  /** @type {number[]} */ TRA                                     = new Array(6).fill(0);
  /** @type {number[]} */ UF                                      = new Array(6).fill(0);
  /** @type {number[]} */ Shell_Heat_Production_Wm3               = new Array(6).fill(0);
  /** @type {number[]} */ wind_speed_ms                           = new Array(6).fill(0);
  /** @type {number[]} */ evaporative_heat_transfer_coefficient   = new Array(6).fill(0);
  /** @type {number[]} */ init_evaporative_heat_transfer_coefficient = new Array(6).fill(0);
  /** @type {number[]} */ Cylinder_Surface_Area_m                 = new Array(6).fill(0);
  /** @type {number[]} */ convective_heat_transfer_coefficient_VL = new Array(6).fill(0);
  /** @type {number[]} */ radiation_convective_coefficient        = new Array(6).fill(0);
  /** @type {number[]} */ init_radiation_convective_coefficient   = new Array(6).fill(0);
  /** @type {number[]} */ Cylinder_Length_m                       = new Array(6).fill(0);
  /** @type {number[]} */ radiation_heat_transfer_coefficient     = new Array(6).fill(0);
  /** @type {number[]} */ basal_skin_blood_flow                   = [3.125, 4.6, 0.97, 5.04, 0.89, 4.78];
  /** @type {number[]} */ Core_Metabolic_Heat_Production_Wm3      = new Array(6).fill(0);
  /** @type {number[]} */ max_sweat_production                    = new Array(6).fill(0);
  /** @type {number[]} */ YR3B                                    = new Array(6).fill(0);

  // ── Environmental input arrays ───────────────────────────────────────────────
  /** @type {number|number[]} */ init_air_temp_c         = 0;
  /** @type {number|number[]} */ final_air_temp_c        = 0;
  /** @type {number|number[]} */ init_relative_humidity  = 0;
  /** @type {number|number[]} */ final_relative_humidity = 0;
  /** @type {number|number[]} */ init_wind_speed_ms      = 0;
  /** @type {number|number[]} */ final_wind_speed_ms     = 0;
  /** @type {number}          */ RH  = 0;
  /** @type {number}          */ PIM = 0;
  /** @type {number[]}        */ air_temp = new Array(6).fill(0);

  // ── Multi-layer geometry arrays ─────────────────────────────────────────────
  /** @type {number[][]} */ B1 = Array.from({ length: 4 }, () => new Array(6).fill(0));
  /** @type {number[][]} */ B2 = Array.from({ length: 4 }, () => new Array(6).fill(0));
  /** @type {number[][]} */ B3 = Array.from({ length: 4 }, () => new Array(6).fill(0));
  /** @type {number[][]} */ H1 = Array.from({ length: 3 }, () => new Array(6).fill(0));
  /** @type {number[][]} */ H2 = Array.from({ length: 3 }, () => new Array(6).fill(0));
  /** @type {number[][]} */ Cylinder_Normal_Radius_Core_m             = Array.from({ length: 3 }, () => new Array(6).fill(0));
  /** @type {number[][]} */ All_Layers_Density_Specific_Heat_Wh_Km3  = Array.from({ length: 4 }, () => new Array(6).fill(0));
  /** @type {number[][]} */ All_Layers_Volume_m3                      = Array.from({ length: 4 }, () => new Array(6).fill(0));
  /** @type {number[][]} */ X                                         = Array.from({ length: 6 }, () => new Array(6).fill(0));
  /** @type {number[][]} */ All_Layers_Heat_Conductivity_WmK         = Array.from({ length: 4 }, () => new Array(6).fill(0));

  // ── Clothing arrays ─────────────────────────────────────────────────────────
  /** @type {number[]} */ KCL   = new Array(6).fill(0);
  /** @type {number[]} */ FCL   = [1, 1, 1, 1, 1, 1];
  /** @type {number[]} */ FCLS  = new Array(6).fill(0);
  /** @type {number[]} */ RHCLE = new Array(6).fill(0);
  /** @type {number[]} */ RHSCL = new Array(6).fill(0);
  /** @type {number[]} */ RVCLE = new Array(6).fill(0);
  /** @type {number[]} */ RVSCL = new Array(6).fill(0);
  /** @type {number[]} */ RV    = new Array(6).fill(0);

  // ── Thermal state arrays (updated each time step) ───────────────────────────
  /** @type {number}   */ total_sweat_loss_kg = 0;
  /** @type {number[]} */ arterial_temp       = new Array(2).fill(0);
  /** @type {number[]} */ venous_temp         = new Array(6).fill(0);
  /** @type {number[]} */ Skin_Blood_Flow_Lm3H                      = new Array(6).fill(0);
  /** @type {number[]} */ init_metabolic_heat_production_core        = new Array(6).fill(0);
  /** @type {number[]} */ sweat_production                           = new Array(6).fill(0);
  /** @type {number[]} */ max_evaporation_rate_w                     = new Array(6).fill(0);
  /** @type {number[]} */ Muscle_Blood_Flow_Basal_m3_Hm3             = new Array(6).fill(0);
  /** @type {number[]} */ Muscle_Metabolic_Heat_Production_Initial_Wm3 = new Array(6).fill(0);
  /** @type {number[]} */ init_core_blood_flow_indifferent           = new Array(6).fill(0);
  /** @type {number[]} */ STORAG                                     = new Array(6).fill(0);

  // ── 3D temperature array: [segment][radial node][time step] ─────────────────
  /** @type {number[][][]} */ T = Array.from({ length: 6 }, () =>
    Array.from({ length: 104 }, () => new Array(2).fill(0))
  );

  /** @type {NewStart}    */ static NewStartData = null;
  /** @type {Object[]}    */ ModelSteps = [];

  // ─────────────────────────────────────────────────────────────────────────────
  // Constructor
  // ─────────────────────────────────────────────────────────────────────────────
  /**
   * @param {import('./PSDACalculatorInput.js').PSDACalculatorInput} inputs
   */
  constructor(inputs) {
    this.ModelSteps = [];
    this.RH  = inputs.RH2.map(Number);
    this.PIM = inputs.PIM2.map(Number);

    // Store original clo and Im values before CLOTH() mutates this.RH / this.PIM
    // These are used for CSV export (Iclo.* and Im.* columns)
    this._iclo_orig = inputs.RH2.map(Number);   // clo units, segments 0–5
    this._im_orig   = inputs.PIM2.map(Number);  // dimensionless

    // Environmental inputs
    this.is_air_water          = inputs.NAW2;
    this.init_air_temp_c       = inputs.T02.map(Number);
    this.final_air_temp_c      = inputs.TE2.map(Number);
    this.init_relative_humidity  = inputs.RF02.map(Number);
    this.final_relative_humidity = inputs.RFE2.map(Number);
    this.init_wind_speed_ms    = inputs.VL02.map(Number);
    this.final_wind_speed_ms   = inputs.VLE2.map(Number);

    // Work/metabolism
    this.Total_Metabolic_Rate = inputs.ETA2;
    this.Work_Output_W      = inputs.WORKOUT2;

    // Simulation time limits (minutes, converted to hours in GetResults)
    // 240 hours max for air, 120 hours max for immersion
    this.Real_Time_Final_H           = inputs.NAW2 === 1 ? 14400 : 7200;
    this.Time_Interval_Output_Basal_H = 10;

    // Subject parameters
    this.Is_Clothed         = inputs.NCLTH2 === 1;
    this.Is_Height_Weight   = false;
    this.Height_m           = inputs.HEG2;
    this.Weight_kg          = inputs.WEG2;
    this.Is_Body_Fat_Input  = true;
    this.Body_Fat_Percent   = inputs.BFAT2;
    this.Is_VO2_Age_Input   = false;
    this.v02max             = inputs.VO2MAX2;
    this.Age                = inputs.AGE2;
    this.Is_Initial_Condition_Neutral = true;

    this.Is_Write_Output      = inputs.WRITESIMOUTPUT === 1;
    this.Is_Write_In_Out_Check = inputs.WRINOUT2 === 1;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Public entry point
  // ─────────────────────────────────────────────────────────────────────────────
  /**
   * Runs the full thermoregulation simulation and returns results.
   * @returns {PSDACalculatorOutput}
   */
  GetResults() {
    let psdaOutput = new PSDACalculatorOutput();
    psdaOutput.IsResultValid = false;

    // Initialize the model with neutral-condition starting state
    this.GetInitialResult();

    // Convert time values from minutes to hours
    this.Time_Interval_Output_Basal_H /= 60;
    this.Real_Time_Final_H /= 60;

    // Set initial simulation parameters
    this.init_time_step      = 1 / 1000;
    this.output_time_interval = this.Time_Interval_Output_Basal_H;
    this.TT  = 0;
    this.K2  = 1;

    // Time-series rows for plotting — populated by OUTPUT() on every output interval
    this.simRows = [];
    this.M   = 1;
    this.NRAD = 1; // 0 = separate air/radiation temps, 1 = combined

    this.total_time_air       = this.Real_Time_Final_H;
    this.total_time_immersion = this.Real_Time_Final_H;
    this.output_time_interval = this.Time_Interval_Output_Basal_H;

    // Initialize body geometry and physiological parameters
    this.HMAN();

    // Define physiological threshold values
    this.crit_core_temp      = 36;
    this.crit_core_temp_34   = 34;
    this.crit_core_temp_28   = 28;
    this.water_loss_percent_20 = 0.2;
    this.crit_hand_temp      = 5;
    this.crit_feet_temp      = 5;
    this.WSK_crit            = 0.5;  // skin wetness threshold

    // ISO 11079: calculate Ts criteria based on metabolic rate
    if (this.Total_Metabolic_Rate > this.basal_metabolic_rate) {
      this.min_skin_temp = 33.34 - 0.0354 * this.Total_Metabolic_Rate / this.Dubois();
      if (this.min_skin_temp >= 29) this.min_skin_temp = 29;
      this.max_skin_temp = 35.7 - 0.0285 * this.Total_Metabolic_Rate / this.Dubois();
    } else {
      this.min_skin_temp = 29;
      this.max_skin_temp = 29;
    }

    // Initialize environment at t=0
    this.ENVIRONHC();
    if (this.is_air_water !== 1) this.IMMERSIONHC();

    // Initial heat production (M=1)
    this.WORKM();

    if (this.Is_Clothed) {
      this.NCL0 = 1;
      this.CLOTH();
    }

    this.OUTPUT();
    this.SIGNAL();

    // Switch to update mode for subsequent time steps
    this.NCL0 = 2;
    this.M    = 2;
    this.K2   = 2;

    // ── Main simulation loop ──────────────────────────────────────────────────
    let increaseTimeStep = true;
    do {
      if (increaseTimeStep) this.TT += this.init_time_step;

      this.WORKM();
      this.ENVIRONHC();
      if (this.is_air_water !== 1) this.IMMERSIONHC();
      if (this.Is_Clothed)         this.CLOTH();
      this.NEWTEM();

      // Compute max temperature change across segments (adaptive time step)
      this.DTMAX = 0;
      for (let i = 0; i < 6; i++) {
        const L = this.L0[0][i] - 1;
        if (this.DTMAX - Math.abs(this.T[i][L][0] - this.T[i][L][1]) < 0) {
          this.DTMAX = Math.abs(this.T[i][L][0] - this.T[i][L][1]);
        }
      }

      // Update evaporation totals and skin wetness
      this.TOEVA = 0;
      this.TOEMX = 0;
      this.WSK   = 1;
      for (let i = 0; i < 6; i++) {
        this.TOEVA += this.sweat_production[i];
        this.TOEMX += this.max_evaporation_rate_w[i];
      }
      this.WSK = this.TOEMX < 0.001 ? 1 : this.TOEVA / this.TOEMX;

      // Check threshold crossings
      if (this.TT_Tc_crit >= 9998      && this.T[1][0][this.K2 - 1] <= this.crit_core_temp)    this.TT_Tc_crit      = this.TT;
      if (this.time_core_temp_34 >= 9998 && this.T[1][0][this.K2 - 1] <= this.crit_core_temp_34) this.time_core_temp_34 = this.TT;
      if (this.time_core_temp_30 >= 9998 && this.T[1][0][this.K2 - 1] <= this.crit_core_temp_28) this.time_core_temp_30 = this.TT;

      this.mean_skin_temp = 0.07 * this.T[0][100][1] + 0.36 * this.T[1][100][1] + 0.134 * this.T[2][100][1]
        + 0.05 * this.T[3][100][1] + 0.317 * this.T[4][100][1] + 0.069 * this.T[5][100][1];

      if (this.TT_Ts_min >= 9998       && this.mean_skin_temp <= this.min_skin_temp)             this.TT_Ts_min       = this.TT;
      if (this.TT_Ts_max >= 9998       && this.mean_skin_temp <= this.max_skin_temp)             this.TT_Ts_max       = this.TT;
      if (this.TT_Tshand_crit >= 9998  && this.T[3][100][this.K2 - 1] <= this.crit_hand_temp)   this.TT_Tshand_crit  = this.TT;
      if (this.TT_Tsfoot_crit >= 9998  && this.T[5][100][this.K2 - 1] <= this.crit_feet_temp)   this.TT_Tsfoot_crit  = this.TT;
      if (this.TT_WSK_crit >= 9998     && this.WSK >= this.WSK_crit)                             this.TT_WSK_crit     = this.TT;

      // Adaptive time step adjustment
      if (this.init_time_step - 1.5E-2 < 0 && this.DTMAX - 0.025 <= 0) this.init_time_step *= 2;

      if (this.DTMAX - 0.05 >= 0) {
        this.init_time_step /= 2;
        this.TT -= this.init_time_step;
        increaseTimeStep = false;
        continue;
      } else {
        increaseTimeStep = true;
      }

      this.SIGNAL();

      // Write output at specified intervals
      if (this.TT - this.output_time_interval >= 0) {
        this.OUTPUT();
        this.output_time_interval += this.Time_Interval_Output_Basal_H;
      }

      // Continue if within time/temperature bounds, otherwise stop
      if (this.TT - this.Real_Time_Final_H < 0
          && this.T[1][0][this.K2 - 1] - 43 <= 0
          && this.T[1][0][this.K2 - 1] - 25 >= 0
          && this.water_loss_percent - 0.25 <= 0) {
        this.arterial_temp[0] = this.arterial_temp[1];
        for (let i = 0; i < 6; i++)
          for (let j = 0; j < this.JXR + 1; j++)
            this.T[i][j][0] = this.T[i][j][1];
        continue;
      } else {
        break;
      }
    } while (true);

    // ── Finalize outputs ──────────────────────────────────────────────────────
    this.mean_skin_temp = 0.07 * this.T[0][100][1] + 0.36 * this.T[1][100][1] + 0.134 * this.T[2][100][1]
      + 0.05 * this.T[3][100][1] + 0.317 * this.T[4][100][1] + 0.069 * this.T[5][100][1];
    this.TC = this.T[1][0][1];

    // Clamp output times to simulation max
    if (this.is_air_water === 1) {
      if (this.TT_Tc_crit      > 9998.0) this.TT_Tc_crit      = this.total_time_air;
      if (this.TT_Ts_min       > 9998.0) this.TT_Ts_min       = this.total_time_air;
      if (this.TT_Ts_max       > 9998.0) this.TT_Ts_max       = this.total_time_air;
      if (this.TT_Tshand_crit  > 9998.0) this.TT_Tshand_crit  = this.total_time_air;
      if (this.TT_Tsfoot_crit  > 9998.0) this.TT_Tsfoot_crit  = this.total_time_air;
      if (this.TT_WSK_crit     > 9998.0) this.TT_WSK_crit     = this.total_time_air;
      if (this.time_core_temp_34 > 9998.0) this.time_core_temp_34 = this.total_time_air;
      if (this.time_core_temp_30 > 9998.0) this.time_core_temp_30 = this.total_time_air;
      if (this.TT_WL20         > 9998.0) this.TT_WL20         = this.total_time_air;
    } else {
      if (this.time_core_temp_34 > 9998.0) this.time_core_temp_34 = this.total_time_immersion;
      if (this.time_core_temp_30 > 9998.0) this.time_core_temp_30 = this.total_time_immersion;
    }

    psdaOutput.TC34           = this.time_core_temp_34;
    psdaOutput.TC30           = this.time_core_temp_30;
    psdaOutput.TC2            = 9999;
    psdaOutput.POSTC34        = 9999;
    psdaOutput.TSW2           = 9999;
    psdaOutput.TTOUT2         = 9999;
    psdaOutput.TTPOS50        = 9999;
    psdaOutput.TS2            = 9999;
    psdaOutput.WL20           = this.TT_WL20;
    psdaOutput.WL20EST        = this.CalculateWL20EST();
    psdaOutput.IsResultValid  = true;

    return psdaOutput;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Delegate helper methods to imported functions
  // ─────────────────────────────────────────────────────────────────────────────

  /** Saturated water vapour pressure (Pa) */
  VAP(x)        { return VAP(x); }

  /** Hyperbolic secant */
  SECH(x)       { return SECH(x); }

  /** DuBois body surface area (m²) */
  Dubois()      { return dubois(this.Weight_kg, this.Height_m); }

  /** Body mass index */
  Calculate_BMI() { return calculateBMI(this.Height_m, this.Weight_kg); }

  // ─────────────────────────────────────────────────────────────────────────────
  // All remaining methods below are unchanged from the original SCTM.js.
  // They are kept here because they share heavy internal state (this.*) and
  // are not suitable for extraction without a full rewrite.
  // ─────────────────────────────────────────────────────────────────────────────

  GetInitialResult() {
    if (this.NewStartData == null) {
      let temp = [0.364202E+02];
      this.arterial_temp[0] = temp[0];
      temp = [0.366394E+02,0.366117E+02,0.338089E+02,0.319998E+02,0.350021E+02,0.319287E+02];
      for (let i = 0; i < temp.length; i++) this.venous_temp[i] = temp[i];
      temp = [0.129788E+01,0.185931E+01,0.613254E+00,0.268986E+01,0.571167E+00,0.304263E+01];
      for (let i = 0; i < temp.length; i++) this.Skin_Blood_Flow_Lm3H[i] = temp[i];
      temp = [0.628631E+04,0.258480E+04,0.579432E+03,0.493388E+03,0.483686E+03,0.319256E+03];
      for (let i = 0; i < temp.length; i++) this.init_metabolic_heat_production_core[i] = temp[i];
      temp = [0.930000E+00,0.878000E+01,0.639000E+01,0.520000E+00,0.103200E+02,0.720000E+00];
      for (let i = 0; i < temp.length; i++) this.sweat_production[i] = temp[i];
      temp = [0.564107E+01,0.633572E+02,0.503670E+02,0.189330E+02,0.119752E+03,0.230863E+02];
      for (let i = 0; i < temp.length; i++) this.max_evaporation_rate_w[i] = temp[i];
      temp = [0.972466E+00,0.192786E+01,0.814385E+00,0.115063E+01,0.816383E+00,0.144754E+01];
      for (let i = 0; i < temp.length; i++) this.Muscle_Blood_Flow_Initial_m3_Hm3[i] = temp[i];
      temp = [0.103785E+04,0.106097E+04,0.100289E+04,0.957880E+03,0.100621E+04,0.957880E+03];
      for (let i = 0; i < temp.length; i++) this.Muscle_Metabolic_Heat_Production_Initial_Wm3[i] = temp[i];
      temp = [0.175200E+02,0.662570E+01,0.498200E+00,0.606000E+00,0.350800E+00,0.196000E+00];
      for (let i = 0; i < temp.length; i++) this.init_core_blood_flow_indifferent[i] = temp[i];

      // Initial temperature distribution — full NEWSTART data (lines 10-111)
      // 102 rows × 6 columns, loaded into T[segment][node][0]
      const tempData = [
        [0.367626E+02,0.367626E+02,0.367626E+02,0.367626E+02,0.367626E+02,0.367626E+02],
        [0.367625E+02,0.367625E+02,0.367625E+02,0.367625E+02,0.367624E+02,0.367624E+02],
        [0.367624E+02,0.367623E+02,0.367623E+02,0.367622E+02,0.367621E+02,0.367620E+02],
        [0.367620E+02,0.367619E+02,0.367618E+02,0.367617E+02,0.367615E+02,0.367614E+02],
        [0.367612E+02,0.367611E+02,0.367609E+02,0.367606E+02,0.367604E+02,0.367601E+02],
        [0.367599E+02,0.367595E+02,0.367592E+02,0.367588E+02,0.367583E+02,0.367578E+02],
        [0.367573E+02,0.367567E+02,0.367560E+02,0.367553E+02,0.367544E+02,0.367535E+02],
        [0.367525E+02,0.367514E+02,0.367501E+02,0.367487E+02,0.367471E+02,0.367454E+02],
        [0.367435E+02,0.367413E+02,0.367390E+02,0.367363E+02,0.367334E+02,0.367301E+02],
        [0.367264E+02,0.367224E+02,0.367179E+02,0.367128E+02,0.367072E+02,0.367010E+02],
        [0.366941E+02,0.366864E+02,0.366778E+02,0.366682E+02,0.366575E+02,0.366456E+02],
        [0.366324E+02,0.366177E+02,0.366012E+02,0.365829E+02,0.365625E+02,0.365398E+02],
        [0.365145E+02,0.364862E+02,0.364548E+02,0.364197E+02,0.363806E+02,0.363304E+02],
        [0.362758E+02,0.362209E+02,0.361656E+02,0.361098E+02,0.360534E+02,0.359965E+02],
        [0.359390E+02,0.358808E+02,0.358219E+02,0.357622E+02,0.356797E+02,0.355622E+02],
        [0.354453E+02,0.353292E+02,0.352136E+02,0.350987E+02,0.349916E+02,0.349329E+02],
        [0.348727E+02,0.348107E+02,0.347471E+02,0.346817E+02,0.346145E+02,0.363638E+02],
        [0.367929E+02,0.367929E+02,0.367929E+02,0.367929E+02,0.367929E+02,0.367929E+02],
        [0.367929E+02,0.367929E+02,0.367929E+02,0.367929E+02,0.367929E+02,0.367929E+02],
        [0.367929E+02,0.367929E+02,0.367929E+02,0.367928E+02,0.367928E+02,0.367928E+02],
        [0.367928E+02,0.367928E+02,0.367927E+02,0.367927E+02,0.367927E+02,0.367926E+02],
        [0.367926E+02,0.367926E+02,0.367925E+02,0.367925E+02,0.367924E+02,0.367923E+02],
        [0.367922E+02,0.367921E+02,0.367920E+02,0.367919E+02,0.367918E+02,0.367916E+02],
        [0.367914E+02,0.367912E+02,0.367910E+02,0.367907E+02,0.367904E+02,0.367901E+02],
        [0.367897E+02,0.367892E+02,0.367887E+02,0.367881E+02,0.367875E+02,0.367867E+02],
        [0.367859E+02,0.367849E+02,0.367838E+02,0.367825E+02,0.367810E+02,0.367793E+02],
        [0.367774E+02,0.367753E+02,0.367728E+02,0.367699E+02,0.367667E+02,0.367630E+02],
        [0.367588E+02,0.367539E+02,0.367484E+02,0.367421E+02,0.367349E+02,0.367267E+02],
        [0.367158E+02,0.367026E+02,0.366879E+02,0.366716E+02,0.366535E+02,0.366336E+02],
        [0.366118E+02,0.365879E+02,0.365618E+02,0.365333E+02,0.365022E+02,0.364684E+02],
        [0.364316E+02,0.363916E+02,0.363481E+02,0.363010E+02,0.362498E+02,0.361942E+02],
        [0.361340E+02,0.360126E+02,0.358841E+02,0.357545E+02,0.356238E+02,0.354921E+02],
        [0.353593E+02,0.352255E+02,0.350905E+02,0.349545E+02,0.348174E+02,0.347079E+02],
        [0.346264E+02,0.345319E+02,0.344240E+02,0.343022E+02,0.341656E+02,0.367233E+02],
        [0.349252E+02,0.349250E+02,0.349244E+02,0.349234E+02,0.349221E+02,0.349204E+02],
        [0.349183E+02,0.349158E+02,0.349129E+02,0.349096E+02,0.349060E+02,0.349019E+02],
        [0.348975E+02,0.348927E+02,0.348875E+02,0.348819E+02,0.348759E+02,0.348695E+02],
        [0.348627E+02,0.348556E+02,0.348480E+02,0.348400E+02,0.348316E+02,0.348229E+02],
        [0.348137E+02,0.348041E+02,0.347941E+02,0.347837E+02,0.347728E+02,0.347616E+02],
        [0.347499E+02,0.347379E+02,0.347253E+02,0.347124E+02,0.346990E+02,0.346852E+02],
        [0.346710E+02,0.346563E+02,0.346412E+02,0.346256E+02,0.346096E+02,0.345932E+02],
        [0.345762E+02,0.345589E+02,0.345410E+02,0.345227E+02,0.345039E+02,0.344846E+02],
        [0.344649E+02,0.344447E+02,0.344240E+02,0.344027E+02,0.343810E+02,0.343588E+02],
        [0.343361E+02,0.343128E+02,0.342891E+02,0.342648E+02,0.342400E+02,0.342146E+02],
        [0.341888E+02,0.341623E+02,0.341353E+02,0.341078E+02,0.340797E+02,0.340510E+02],
        [0.340217E+02,0.339919E+02,0.339615E+02,0.339304E+02,0.338988E+02,0.338666E+02],
        [0.338260E+02,0.337835E+02,0.337393E+02,0.336933E+02,0.336457E+02,0.335963E+02],
        [0.335452E+02,0.334924E+02,0.334378E+02,0.333813E+02,0.333231E+02,0.332630E+02],
        [0.331747E+02,0.330548E+02,0.329357E+02,0.328175E+02,0.327002E+02,0.325837E+02],
        [0.324680E+02,0.323531E+02,0.322389E+02,0.321255E+02,0.320128E+02,0.319007E+02],
        [0.318325E+02,0.317752E+02,0.317162E+02,0.316555E+02,0.315931E+02,0.338651E+02],
        [0.323200E+02,0.323200E+02,0.323199E+02,0.323197E+02,0.323195E+02,0.323193E+02],
        [0.323190E+02,0.323186E+02,0.323182E+02,0.323177E+02,0.323172E+02,0.323166E+02],
        [0.323159E+02,0.323152E+02,0.323144E+02,0.323136E+02,0.323127E+02,0.323118E+02],
        [0.323108E+02,0.323097E+02,0.323086E+02,0.323075E+02,0.323062E+02,0.323050E+02],
        [0.323036E+02,0.323022E+02,0.323008E+02,0.322993E+02,0.322977E+02,0.322961E+02],
        [0.322944E+02,0.322927E+02,0.322909E+02,0.322890E+02,0.322871E+02,0.322851E+02],
        [0.322831E+02,0.322810E+02,0.322789E+02,0.322767E+02,0.322742E+02,0.322712E+02],
        [0.322680E+02,0.322646E+02,0.322611E+02,0.322573E+02,0.322534E+02,0.322493E+02],
        [0.322451E+02,0.322406E+02,0.322360E+02,0.322312E+02,0.322262E+02,0.322211E+02],
        [0.322158E+02,0.322103E+02,0.322043E+02,0.321934E+02,0.321827E+02,0.321722E+02],
        [0.321618E+02,0.321515E+02,0.321413E+02,0.321313E+02,0.321214E+02,0.321116E+02],
        [0.321019E+02,0.320923E+02,0.320829E+02,0.320735E+02,0.320642E+02,0.320551E+02],
        [0.320460E+02,0.320370E+02,0.320281E+02,0.320193E+02,0.320105E+02,0.320018E+02],
        [0.319933E+02,0.319847E+02,0.319763E+02,0.319679E+02,0.319596E+02,0.319513E+02],
        [0.319432E+02,0.319350E+02,0.319270E+02,0.319190E+02,0.319110E+02,0.319040E+02],
        [0.318996E+02,0.318946E+02,0.318892E+02,0.318832E+02,0.318768E+02,0.318698E+02],
        [0.318624E+02,0.318545E+02,0.318462E+02,0.318373E+02,0.318280E+02,0.322754E+02],
        [0.361867E+02,0.361866E+02,0.361862E+02,0.361855E+02,0.361846E+02,0.361834E+02],
        [0.361820E+02,0.361803E+02,0.361783E+02,0.361760E+02,0.361735E+02,0.361708E+02],
        [0.361677E+02,0.361644E+02,0.361608E+02,0.361570E+02,0.361528E+02,0.361484E+02],
        [0.361437E+02,0.361388E+02,0.361336E+02,0.361281E+02,0.361223E+02,0.361163E+02],
        [0.361099E+02,0.361033E+02,0.360964E+02,0.360892E+02,0.360817E+02,0.360740E+02],
        [0.360659E+02,0.360576E+02,0.360489E+02,0.360400E+02,0.360307E+02,0.360212E+02],
        [0.360114E+02,0.360012E+02,0.359907E+02,0.359800E+02,0.359689E+02,0.359575E+02],
        [0.359458E+02,0.359337E+02,0.359214E+02,0.359087E+02,0.358956E+02,0.358823E+02],
        [0.358686E+02,0.358545E+02,0.358401E+02,0.358254E+02,0.358103E+02,0.357940E+02],
        [0.357734E+02,0.357514E+02,0.357281E+02,0.357034E+02,0.356772E+02,0.356497E+02],
        [0.356207E+02,0.355904E+02,0.355585E+02,0.355253E+02,0.354906E+02,0.354543E+02],
        [0.354166E+02,0.353773E+02,0.353365E+02,0.352942E+02,0.352502E+02,0.352046E+02],
        [0.351573E+02,0.351083E+02,0.350577E+02,0.350052E+02,0.349510E+02,0.348950E+02],
        [0.348371E+02,0.347773E+02,0.347155E+02,0.346518E+02,0.345860E+02,0.345182E+02],
        [0.344482E+02,0.343761E+02,0.343017E+02,0.342071E+02,0.340583E+02,0.339104E+02],
        [0.337633E+02,0.336170E+02,0.334714E+02,0.333266E+02,0.332321E+02,0.331584E+02],
        [0.330830E+02,0.330058E+02,0.329269E+02,0.328462E+02,0.327636E+02,0.357984E+02],
        [0.322130E+02,0.322129E+02,0.322129E+02,0.322129E+02,0.322128E+02,0.322127E+02],
        [0.322126E+02,0.322124E+02,0.322123E+02,0.322121E+02,0.322119E+02,0.322117E+02],
        [0.322114E+02,0.322112E+02,0.322109E+02,0.322106E+02,0.322102E+02,0.322099E+02],
        [0.322095E+02,0.322091E+02,0.322087E+02,0.322082E+02,0.322078E+02,0.322073E+02],
        [0.322068E+02,0.322063E+02,0.322057E+02,0.322052E+02,0.322046E+02,0.322040E+02],
        [0.322033E+02,0.322027E+02,0.322020E+02,0.322013E+02,0.322006E+02,0.321999E+02],
        [0.321991E+02,0.321983E+02,0.321975E+02,0.321967E+02,0.321957E+02,0.321943E+02],
        [0.321927E+02,0.321907E+02,0.321885E+02,0.321860E+02,0.321833E+02,0.321802E+02],
        [0.321769E+02,0.321734E+02,0.321696E+02,0.321655E+02,0.321612E+02,0.321567E+02],
        [0.321519E+02,0.321468E+02,0.321383E+02,0.321281E+02,0.321181E+02,0.321082E+02],
        [0.320984E+02,0.320888E+02,0.320793E+02,0.320699E+02,0.320606E+02,0.320514E+02],
        [0.320423E+02,0.320333E+02,0.320244E+02,0.320156E+02,0.320069E+02,0.319983E+02],
        [0.319898E+02,0.319813E+02,0.319729E+02,0.319646E+02,0.319564E+02,0.319483E+02],
        [0.319402E+02,0.319321E+02,0.319242E+02,0.319163E+02,0.319084E+02,0.319007E+02],
        [0.318929E+02,0.318853E+02,0.318777E+02,0.318701E+02,0.318626E+02,0.318584E+02],
        [0.318541E+02,0.318492E+02,0.318437E+02,0.318376E+02,0.318310E+02,0.318238E+02],
        [0.318160E+02,0.318077E+02,0.317988E+02,0.317893E+02,0.317793E+02,0.321966E+02],
      ];

      // Load tempData into T array using original SCTM.js loop logic
      let count = 0;
      for (let i = 0; i <= 5; i++) {
        for (let j = 0; j <= 101; j += 6) {
          if (count >= tempData.length) break;
          const row = tempData[count++];
          for (let k = 0; k < row.length; k++) {
            if (j + k <= 101) {
              this.T[i][j + k][0] = row[k];
            }
          }
        }
      }

      // STORAG — line 112 of NEWSTART
      const storagData = [-0.295700E-01, -0.834749E+00, -0.334682E+00, -0.638274E-01, -0.135299E+01, -0.507884E-01];
      for (let s = 0; s < storagData.length; s++) {
        this.STORAG[s] = storagData[s];
      }

      // Total sweat loss — line 113 of NEWSTART
      this.total_sweat_loss_kg = 0.0;

      this.NewStartData = new NewStart();
      this.NewStartData.ArterialTemp = this.arterial_temp.slice();
      this.NewStartData.VenousTemps = this.venous_temp.slice();
      this.NewStartData.SkinBloodFlowRates = this.Skin_Blood_Flow_Lm3H.slice();
      this.NewStartData.MetabolicHeatProductionCore = this.init_metabolic_heat_production_core.slice();
      this.NewStartData.SweatProductionRates = this.sweat_production.slice();
      this.NewStartData.MaxEvaporationRates = this.max_evaporation_rate_w.slice();
      this.NewStartData.MuscleBloodFlowRates = this.Muscle_Blood_Flow_Initial_m3_Hm3.slice();
      this.NewStartData.MuscleMetabolicHeatProductionRates = this.Muscle_Metabolic_Heat_Production_Initial_Wm3.slice();
      this.NewStartData.CoreBloodFlowRates = this.init_core_blood_flow_indifferent.slice();
      this.NewStartData.T = this.T.map(seg => seg.map(node => node.slice()));
      this.NewStartData.STORAG = this.STORAG.slice();
      this.NewStartData.TotalSweatLoss = this.total_sweat_loss_kg;

    } else {
      this.arterial_temp = this.NewStartData.ArterialTemp.slice();
      this.venous_temp = this.NewStartData.VenousTemps.slice();
      this.Skin_Blood_Flow_Lm3H = this.NewStartData.SkinBloodFlowRates.slice();
      this.init_metabolic_heat_production_core = this.NewStartData.MetabolicHeatProductionCore.slice();
      this.sweat_production = this.NewStartData.SweatProductionRates.slice();
      this.max_evaporation_rate_w = this.NewStartData.MaxEvaporationRates.slice();
      this.Muscle_Blood_Flow_Initial_m3_Hm3 = this.NewStartData.MuscleBloodFlowRates.slice();
      this.Muscle_Metabolic_Heat_Production_Initial_Wm3 = this.NewStartData.MuscleMetabolicHeatProductionRates.slice();
      this.init_core_blood_flow_indifferent = this.NewStartData.CoreBloodFlowRates.slice();
      this.T = this.NewStartData.T.map(seg => seg.map(node => node.slice()));
      this.STORAG = this.NewStartData.STORAG.slice();
      this.total_sweat_loss_kg = this.NewStartData.TotalSweatLoss;
    }
  }

  ENVIRONHC() {
    let XXH = [0.66, 1.50, 3.95, 3.89, 3.6, 3.48];
    this.radiation_heat_transfer_coefficient = [6.4, 5.2, 5.2, 3.5, 5.2, 4.65];
    this.chamber_time = 0.08;
    this.TEX = this.TT / this.chamber_time;
    if (this.TEX - 80.0 > 0.0) this.TEX = 80.0;
    for (let i = 0; i < 6; i++) {
      this.relative_humidity[i] = this.final_relative_humidity[i] + (this.init_relative_humidity[i] - this.final_relative_humidity[i]) * Math.exp(-this.TEX);
      this.wind_speed_ms[i]     = this.final_wind_speed_ms[i]     + (this.init_wind_speed_ms[i]     - this.final_wind_speed_ms[i])     * Math.exp(-this.TEX);
      this.TL[i]                = this.final_air_temp_c[i]        + (this.init_air_temp_c[i]        - this.final_air_temp_c[i])        * Math.exp(-this.TEX);
      this.air_temp[i]          = this.TL[i];
      if (this.NRAD === 1) this.TRA[i] = this.TL[i];
      this.convective_heat_transfer_coefficient_VL[i] = 3.16 * XXH[i] * Math.pow(this.wind_speed_ms[i], 0.5);
      this.radiation_convective_coefficient[i]        = this.radiation_heat_transfer_coefficient[i] + this.convective_heat_transfer_coefficient_VL[i];
      this.init_radiation_convective_coefficient[i]   = this.radiation_convective_coefficient[i];
      this.evaporative_heat_transfer_coefficient[i]      = 0.0166 * this.convective_heat_transfer_coefficient_VL[i];
      this.init_evaporative_heat_transfer_coefficient[i] = this.evaporative_heat_transfer_coefficient[i];
    }
  }

  IMMERSIONHC() {
    const XHIMM = [
      [1.0, 1.0, 1.0, 1.0, 1.0, 1.0],
      [0.0, 160.0, 160.0, 160.0, 160.0, 160.0],
      [0.0, 152.0, 0.0, 0.0, 153.0, 167.0],
      [0.0, 34.0, 0.0, 0.0, 153.0, 167.0],
      [0.0, 0.0, 0.0, 0.0, 76.5, 167.0],
      [160.0, 160.0, 160.0, 160.0, 160.0, 160.0],
      [0.0, 460.0, 460.0, 460.0, 460.0, 460.0],
      [0.0, 460.0, 0.0, 0.0, 460.0, 460.0],
      [0.0, 89.0, 0.0, 0.0, 460.0, 460.0],
    ];
    for (let i = 0; i < 6; i++) {
      const h = XHIMM[this.is_air_water - 1][i];
      if (h > 90.0) {
        this.evaporative_heat_transfer_coefficient[i]      = 0.0;
        this.init_evaporative_heat_transfer_coefficient[i] = 0.0;
        this.convective_heat_transfer_coefficient_VL[i]    = parseInt(h);
        this.radiation_convective_coefficient[i]           = this.convective_heat_transfer_coefficient_VL[i];
        this.init_radiation_convective_coefficient[i]      = this.radiation_convective_coefficient[i];
      } else if (h > 5.0) {
        this.convective_heat_transfer_coefficient_VL[i] = h;
        this.radiation_convective_coefficient[i]        = h + this.radiation_heat_transfer_coefficient[i];
        this.init_radiation_convective_coefficient[i]   = this.radiation_convective_coefficient[i];
      }
    }
  }

  WORKM() {

    // console.log('WORKM called:', {
    //   M: this.M,
    //   Total_Metabolic_Rate: this.Total_Metabolic_Rate,
    //   Work_Output_W: this.Work_Output_W,
    //   basal_metabolic_rate: this.basal_metabolic_rate,
    //   work_output_end: this.work_output_end,
    //   work_output_from_exercise_W: this.work_output_from_exercise_W,
    // });

    const WDYN = 0.04;
    if (this.M === 1) {
      if (this.Work_Output_W > this.Total_Metabolic_Rate) this.Work_Output_W = 0.0;
      if (this.Work_Output_W < 0.0)                       this.Work_Output_W = 0.0;
      if (this.Work_Output_W > 0.3 * this.Total_Metabolic_Rate) this.Work_Output_W = 0.3 * this.Total_Metabolic_Rate;
      if (this.Total_Metabolic_Rate <= this.basal_metabolic_rate) this.Total_Metabolic_Rate = 0.0;
      this.work_output_end = this.Total_Metabolic_Rate - this.Work_Output_W - this.basal_metabolic_rate;
      if (this.work_output_end < 0.1) this.work_output_end = 0.0;
      this.total_metabolic_rate_wmNeg2 = this.basal_metabolic_rate + this.Work_Output_W + 0.0;
    } else {
      this.work_output_from_exercise_W = this.work_output_end * (1.0 - Math.exp(-this.TT / WDYN));
    }
  }

  CLOTH() {
    if (this.NCL0 === 1) {
      for (let i = 0; i < 6; i++) {
        this.KCL[i] = 0;
        this.RH[i]  = 0.155 * this.RH[i];
        this.clothing_thickness_mm[i] = 0.042 * this.RH[i];
        this.RV[i]  = this.PIM[i];
        if (this.clothing_thickness_mm[i] < 1.0E-4) this.KCL[i] = 1;
      }
      for (let i = 0; i < 6; i++) {
        if (this.KCL[i] === 0) {
          this.FCLS[i]  = 1.0 + 0.3 * this.RH[i];
          this.FCL[i]   = 1.0;
          this.RHSCL[i] = 0.5 * this.RH[i] / this.FCL[i];
          this.RHCLE[i] = 0.5 * this.RH[i] / this.FCL[i] + 1 / (this.init_radiation_convective_coefficient[i] * this.FCLS[i]);
          this.RVSCL[i] = 0.5 * this.RV[i] / this.FCL[i];
          this.RVCLE[i] = this.init_evaporative_heat_transfer_coefficient[i] > 1.0E-5
            ? 0.5 * this.RV[i] / this.FCL[i] + 1.0 / (this.init_evaporative_heat_transfer_coefficient[i] * this.FCLS[i])
            : 1.0E10;
          this.radiation_convective_coefficient[i]      = 1.0 / (this.RHSCL[i] + this.RHCLE[i]);
          this.evaporative_heat_transfer_coefficient[i] = 1.0 / (this.RVSCL[i] + this.RVCLE[i]);
        }
      }
    }
    for (let i = 0; i < 6; i++) {
      if (this.KCL[i] === 0) {
        this.RHCLE[i] = 0.5 * this.RH[i] / this.FCL[i] + 1.0 / (this.init_radiation_convective_coefficient[i] * this.FCLS[i]);
        this.RVCLE[i] = this.init_evaporative_heat_transfer_coefficient[i] > 1.0E-5
          ? 0.5 * this.RV[i] / this.FCL[i] + 1.0 / (this.init_evaporative_heat_transfer_coefficient[i] * this.FCLS[i])
          : 1.0E10;
        this.radiation_convective_coefficient[i]      = 1.0 / (this.RHSCL[i] + this.RHCLE[i]);
        this.evaporative_heat_transfer_coefficient[i] = 1.0 / (this.RVSCL[i] + this.RVCLE[i]);
      }
    }
  }

  HMAN() {

      // ------------ HMAN VARS ----------------- //
      /** @type {number} HMAN VAR*/ let BSUM;
      /** @type {number} HMAN VAR*/ let HSUM;
      /** @type {number} HMAN VAR*/ let HSUMT;
      /** @type {number} HMAN VAR*/ let BMI;
      /** @type {number} HMAN VAR*/ let ROCA;
      /** @type {number} HMAN VAR*/ let TFTRUN;
      /** @type {number} HMAN VAR*/ let VFS;
      /** @type {number} HMAN VAR*/ let VFSUM;
      /** @type {number} HMAN VAR*/ let VSUM;
      /** @type {number} HMAN VAR*/ let VSM;

      /** @type {number[]} HMAN VAR*/ let ALF = new Array(6);
      /** @type {number[]} HMAN VAR*/ let FTSM = new Array(6);
      /** @type {number[]} HMAN VAR*/ let FS6 = new Array(6);
      /** @type {number[]} HMAN VAR*/ let SP6 = new Array(6);
      /** @type {number[]} HMAN VAR*/ let V6 = new Array(6);
      /** @type {number[]} HMAN VAR*/ let V621 = new Array(6);
      /** @type {number[]} HMAN VAR*/ let V622 = new Array(6);
      /** @type {number[]} HMAN VAR*/ let VP6 = new Array(6);
      /** @type {number[]} HMAN VAR*/ let VPFS = new Array(6);
      /** @type {number[]} HMAN VAR*/ let VPMK = new Array(6);
      // ------------------------------------------- //

      // ALF = COUNTER CURRENT FACTOR
      // ROCA = DENSITY * SPEC.HEAT OF ART. BLOOD IN (W H)/ (C M3)
      ROCA = 1046.7;
      ALF =  [1, 1, 1, 0.8, 0.95, 0.8 ]

      // RELATIVE VOLUME OF EACH CYLINDER
      VP6 = [0.05417, 0.55293, 0.09170, 0.00949, 0.27864, 0.01307];

      // RELATIVE VOLUME, CORE TO (CORE AND MUSCLE)
      VPMK = [0.76, 0.604, 0.723, 0.5, 0.37, 0.5];

      // RELATIVE VOLUME, FAT TO (FAT AND SKIN)
      VPFS = [0.4886, 0.64, 0.6912, 0.6912, 0.4774, 0.6774];

      // RELATIVE SURFACE AREAS OF EACH CYLINDER
      SP6 = [0.0702, 0.3594, 0.1342, 0.0502, 0.3171, 0.06871];

      // RELATIVE VOLUME OF EACH (SKIN AND FAT) LAYER
      // Original one FS6
      // DATA FS6/ 0.044,0.566,0.0968,0.0228,0.241,0.0317 /
      // 01 / 12 / 2007 FS6 modified to avoid error when fat is high, > 40%
      FS6 = [0.054, 0.566, 0.0968, 0.0115, 0.251, 0.0207];

      // Moved from main to here, 1/12/2006
      // RADIAL GRID: 100 STEPS FOR EACH CYLINDER
      this.XJ = 1 / this.JXR;

      // HEIGHT AND WEIGHT OF STANDARD HUMAN
      // is_standard_man=1 standard model man height=1.7 and weight=78.0kg
      // is_standard_man=2 height and weight are input 
      if (this.Is_Height_Weight)
      {
          this.Height_m = 1.702;
          this.Weight_kg = 77.984;
      }

      // VOLUME FORMULA
      VSM = (1.015 * this.Weight_kg - 4.937) / 1000;

      // is_body_fat_known=1 body fat is input, is_body_fat_known=2 body fat is calculated
      if (this.Is_Body_Fat_Input)
          VFS = this.Body_Fat_Percent / 100.0 * VSM;
      else
      {
          // caculate fat % from height and weight, if it is not input
          this.Body_Fat_Percent = this.Calculate_BMI();

          // VOLUME OF FAT AND SKIN
          VFS = this.Body_Fat_Percent / 100.0 * VSM;
      }
      //COMP. GEOMETRICAL PARAMETERS
      for (let i = 0; i < 6; i++) {
          V6[i] = VP6[i] * VSM;
          V621[i] = V6[i] - VFS * FS6[i];
          V622[i] = VFS * FS6[i];
          this.All_Layers_Volume_m3[0][i] = V621[i] * VPMK[i];
          this.All_Layers_Volume_m3[1][i] = V621[i] - this.All_Layers_Volume_m3[0][i];
          this.All_Layers_Volume_m3[2][i] = V622[i] * VPFS[i];
          this.All_Layers_Volume_m3[3][i] = V622[i] - this.All_Layers_Volume_m3[2][i];
          this.Cylinder_Surface_Area_m[i] = SP6[i] * this.Dubois();
          this.Cylinder_Radius_m[i] = 2 * V6[i] / this.Cylinder_Surface_Area_m[i];
          this.Cylinder_Length_m[i] = this.Cylinder_Surface_Area_m[i] / (2 * Math.PI * this.Cylinder_Radius_m[i]);
          this.Cylinder_Normal_Radius_Core_m[0][i] = Math.sqrt(this.All_Layers_Volume_m3[0][i] / (Math.PI * this.Cylinder_Length_m[i]));
          this.Cylinder_Normal_Radius_Core_m[1][i] = Math.sqrt((this.All_Layers_Volume_m3[0][i] + this.All_Layers_Volume_m3[1][i]) / (Math.PI * this.Cylinder_Length_m[i]));
          this.Cylinder_Normal_Radius_Core_m[2][i] = Math.sqrt((this.All_Layers_Volume_m3[0][i] + this.All_Layers_Volume_m3[1][i] + this.All_Layers_Volume_m3[2][i]) / (Math.PI * this.Cylinder_Length_m[i]));
          FTSM[i] = this.Cylinder_Normal_Radius_Core_m[2][i] - this.Cylinder_Normal_Radius_Core_m[0][i];
      }

      //FAT THICKNESS OF TRUNCK CYLINDER IN MM
      TFTRUN = (this.Cylinder_Normal_Radius_Core_m[2][1] - this.Cylinder_Normal_Radius_Core_m[1][1]) * 1000;

      //PHYSICAL AND PHYSIOLOGICAL PARRAMETERS
      this.All_Layers_Density_Specific_Heat_Wh_Km3[0][0] = 877.4;
      this.All_Layers_Density_Specific_Heat_Wh_Km3[0][1] = 926.4;
      this.All_Layers_Density_Specific_Heat_Wh_Km3[0][2] = 920.8;
      this.All_Layers_Density_Specific_Heat_Wh_Km3[0][3] = 704.8;
      this.All_Layers_Density_Specific_Heat_Wh_Km3[0][4] = 917.4;
      this.All_Layers_Density_Specific_Heat_Wh_Km3[0][5] = 337.2;

      for (let i = 0; i < 6; i++)
      {
          this.All_Layers_Density_Specific_Heat_Wh_Km3[1][i] = 1155;
          this.All_Layers_Density_Specific_Heat_Wh_Km3[2][i] = 587.8;
          this.All_Layers_Density_Specific_Heat_Wh_Km3[3][i] = 1109;
          this.All_Layers_Heat_Conductivity_WmK[0][i] = 0.51;
          this.All_Layers_Heat_Conductivity_WmK[1][i] = 0.41;
          this.All_Layers_Heat_Conductivity_WmK[2][i] = 0.21;
          this.All_Layers_Heat_Conductivity_WmK[3][i] = 0.42;
          this.Cylinder_Normal_Radius_Core_m[0][i] = this.Cylinder_Normal_Radius_Core_m[0][i] / this.Cylinder_Radius_m[i];
          this.Cylinder_Normal_Radius_Core_m[1][i] = this.Cylinder_Normal_Radius_Core_m[1][i] / this.Cylinder_Radius_m[i];
          this.Cylinder_Normal_Radius_Core_m[2][i] = this.Cylinder_Normal_Radius_Core_m[2][i] / this.Cylinder_Radius_m[i];
          // UF MET. HEAT PRODUCTION IN FET W/M3
          this.UF[i] = 368.4;
          // Fat_Blood_Flow_m3_Hm3 BLOOD FLOW IN FET M3/(M3 H)
          this.Fat_Blood_Flow_m3_Hm3[i] = 0.0;
      }

      
      //Shell_Heat_Production_Wm3 MET. HEAT PRODUCTION IN SKIN W/M3
      this.Shell_Heat_Production_Wm3 = [363.44, 349.45, 242.29, 273.64, 243.53, 278.11]

      // Muscle_Blood_Flow_Basal_m3_Hm3 MET. HEAT PRODUCTION IN MUSKEL W/M3
      this.Muscle_Blood_Flow_Basal_m3_Hm3 = Array(6).fill(684.2);

      // Core_Metabolic_Heat_Production_Wm3 MET.HEAT PRODUCTION IN CORE W/M3
      this.Core_Metabolic_Heat_Production_Wm3 = [4438.67, 1798.01, 413.88, 352.42, 345.49, 228.04];

      // BLOOD FLOW IN MUSKEL M3/(M3 H)
      this.Muscle_Metabolic_Heat_Production_Basal_Wm3 = [0.97, 1.98, 0.97, 1.95, 0.97, 1.95];

      // old Muscle_Metabolic_Heat_Production_Basal_Wm3(5)=0.97*2
      // new Muscle_Metabolic_Heat_Production_Basal_Wm3[5] = 1.95;

      //take from old code, need to be comfirned ?
      for (let i = 0; i < 6; i++)
      {
          this.Core_Metabolic_Heat_Production_Wm3[i] = this.Core_Metabolic_Heat_Production_Wm3[i] * 1.4;
          this.Muscle_Blood_Flow_Basal_m3_Hm3[i] = this.Muscle_Blood_Flow_Basal_m3_Hm3[i] * 1.4;
          this.Shell_Heat_Production_Wm3[i] = this.Shell_Heat_Production_Wm3[i] * 1.4;
      }

      // COMP. COEFFICIENTS OF EQUATIONS
      for (let i = 0; i < 6; i++) {
          this.H[i] = this.Cylinder_Radius_m[i] / (this.All_Layers_Heat_Conductivity_WmK[3][i] * this.Cylinder_Surface_Area_m[i]);
          for (let j = 0; j < 4; j++) {
              this.B1[j][i] = this.All_Layers_Heat_Conductivity_WmK[j][i] / Math.pow((this.Cylinder_Radius_m[i] * this.XJ), 2);
              this.B2[j][i] = this.All_Layers_Heat_Conductivity_WmK[j][i] / (Math.pow((this.Cylinder_Radius_m[i]), 2) * 2 * this.XJ);
              this.B3[j][i] = ALF[i] * ROCA;
          }
      }

      // DO-LOOP FOR 6 CYLINDERS
      for (let i = 0; i < 6; i++) {
          // DO-LOOP IN RADIAL DIRECTION
          for (let kxj = 0; kxj < 3; kxj++) {
              // TRANSITION FROM CORE TO MUSCLE KXJ=1
              // TRANSITION FROM MUSCLE TO FAT  KXJ=2
              // TRANSITION FROM CORE TO SHELL  KXJ=3
              for (let k = 1; k <= this.JXR; k++) {
                  if ((this.XJ * (k - 1) - this.Cylinder_Normal_Radius_Core_m[kxj][i]) >= 0) {
                      this.L0[kxj][i] = k - 1;
                      this.H1[kxj][i] = this.Cylinder_Normal_Radius_Core_m[kxj][i] - this.XJ * (k - 2);
                      this.H2[kxj][i] = this.XJ * (k - 1) - this.Cylinder_Normal_Radius_Core_m[kxj][i];
                      break;
                  }
              } // end for k
          } // end for kxj
          for (let kj = 0; kj < 3; kj++) {
              this.X[2 * kj][i] = this.All_Layers_Heat_Conductivity_WmK[kj][i] * this.H2[kj][i] / 
              (this.All_Layers_Heat_Conductivity_WmK[kj][i] * this.H2[kj][i] + this.All_Layers_Heat_Conductivity_WmK[kj + 1][i] * this.H1[kj][i]);
              this.X[2 * kj + 1][i] = this.All_Layers_Heat_Conductivity_WmK[kj + 1][i] * this.H1[kj][i] / 
              (this.All_Layers_Heat_Conductivity_WmK[kj][i] * this.H2[kj][i] + this.All_Layers_Heat_Conductivity_WmK[kj + 1][i] * this.H1[kj][i]);
          } // end for kj
      } // end for i

      VFSUM = 0.0;
      VSUM = 0.0;
      BSUM = 0.0;
      HSUM = 0.0;
      HSUMT = 0.0;
      this.muscle_volume_coreTorso = 0.0;

      for (let i = 0; i < 6; i++) {
          VFSUM += this.All_Layers_Volume_m3[2][i];
          VSUM += this.All_Layers_Volume_m3[0][i] + this.All_Layers_Volume_m3[1][i] + this.All_Layers_Volume_m3[2][i] + this.All_Layers_Volume_m3[3][i];
          this.muscle_volume_coreTorso += this.All_Layers_Volume_m3[1][i];

          BSUM += this.All_Layers_Volume_m3[0][i] * this.Core_Blood_Flow_Indifferent_Basal_M3_Hm3[i] + this.All_Layers_Volume_m3[1][i] *
          this.Muscle_Metabolic_Heat_Production_Basal_Wm3[i] + this.All_Layers_Volume_m3[2][i] * this.Fat_Blood_Flow_m3_Hm3[i] + this.All_Layers_Volume_m3[3][i] * this.basal_skin_blood_flow[i];

          HSUM += this.All_Layers_Volume_m3[0][i] * this.Core_Metabolic_Heat_Production_Wm3[i] + this.All_Layers_Volume_m3[1][i] * 
          this.Muscle_Blood_Flow_Basal_m3_Hm3[i] + this.All_Layers_Volume_m3[2][i] * this.UF[i] + this.All_Layers_Volume_m3[3][i] * this.Shell_Heat_Production_Wm3[i];

          HSUMT += this.All_Layers_Volume_m3[0][i] * this.Core_Metabolic_Heat_Production_Wm3[i] + this.All_Layers_Volume_m3[1][i] *
          this.Muscle_Blood_Flow_Basal_m3_Hm3[i] + this.All_Layers_Volume_m3[2][i] * this.UF[i] + this.All_Layers_Volume_m3[3][i] * this.Shell_Heat_Production_Wm3[i];
      }

      // Add torso core volume to total muscle volume
      this.muscle_volume_coreTorso = this.muscle_volume_coreTorso + this.All_Layers_Volume_m3[0][1];

      // is_v02_age_known=1, then Take v02max, age from input file
      if (this.Is_VO2_Age_Input) {
          BMI = this.Weight_kg / (this.Height_m * this.Height_m);
          this.max_shivering_wm3 = 30.5 + 0.348 * this.v02max - 0.909 * BMI - 0.233 * this.Age;
          this.max_shivering_wm3 = this.max_shivering_wm3 * this.Weight_kg * 69.7 * (4.809) / 1000.0 / this.muscle_volume_coreTorso;
      } else {
          this.max_shivering_wm3 = 4.5 * HSUMT / this.muscle_volume_coreTorso;
      }

      this.basal_metabolic_rate = HSUM;

  }//HMAN
  OUTPUT(){

      /** @type {number} */let BLMUSC = 0;
      /** @type {number} */let BSUM = 0;
      /** @type {number} */let COREBL = 0;
      /** @type {number} */let HF;
      /** @type {number} */let HSUM = 0;
      /** @type {number} */let HSUMX;
      /** @type {number} */let SKINBL = 0;
      /** @type {number} */let SVK;
      /** @type {number} */let SVMAX;
      /** @type {number} */let SVMID;
      /** @type {number} */let SVMIN;
      /** @type {number} */let USGES = 0;
      /** @type {number} */let YR3BGE = 0;

      /** @type {number[]} */let BFMABS = new Array(6);
      /** @type {number[]} */let QKABS = new Array(6);
      /** @type {number[]} */let REVA = new Array(6);
      /** @type {number[]} */let UMABS = new Array(6);
      /** @type {number[]} */let YR1ABS = new Array(6);
      /** @type {number[]} */let YR2ABS = new Array(6);

      //Urine loss 0.5 kg / day, 0.5 / 24.0 kg / h
      /** @type {number} */let WLD = 0.5 / 24.0;

      for (let i = 0; i < 6; i++) {
          YR1ABS[i] = this.Skin_Blood_Flow_Lm3H[i] * 1000 * this.All_Layers_Volume_m3[3][i];
          BFMABS[i] = this.Muscle_Blood_Flow_Initial_m3_Hm3[i] * 1000 * this.All_Layers_Volume_m3[1][i];
          UMABS[i] = this.Muscle_Metabolic_Heat_Production_Initial_Wm3[i] * this.All_Layers_Volume_m3[1][i];
          YR2ABS[i] = this.init_metabolic_heat_production_core[i] * this.All_Layers_Volume_m3[0][i];
          USGES += this.Shell_Heat_Production_Wm3[i] * this.All_Layers_Volume_m3[1][i];
          QKABS[i] = this.init_core_blood_flow_indifferent[i] * this.All_Layers_Volume_m3[0][i] * 1000;
          this.QKGES += QKABS[i];
          SKINBL += YR1ABS[i];
          BLMUSC += BFMABS[i];
          COREBL += QKABS[i];
          BSUM += this.All_Layers_Volume_m3[0][i] * this.init_core_blood_flow_indifferent[i] + this.All_Layers_Volume_m3[1][i] * 
          this.Muscle_Blood_Flow_Initial_m3_Hm3[i] + this.All_Layers_Volume_m3[2][i] * this.Fat_Blood_Flow_m3_Hm3[i] + this.All_Layers_Volume_m3[3][i] * this.Skin_Blood_Flow_Lm3H[i];
          HSUM += this.All_Layers_Volume_m3[0][i] * this.init_metabolic_heat_production_core[i] + this.All_Layers_Volume_m3[1][i] * 
          this.Muscle_Metabolic_Heat_Production_Initial_Wm3[i] + this.All_Layers_Volume_m3[2][i] * this.UF[i] + this.All_Layers_Volume_m3[3][i] * this.Shell_Heat_Production_Wm3[i];
          this.YR3GES += this.sweat_production[i];
          YR3BGE += this.YR3B[i];
      }

      // add the work out put to total heat production,
      // workout not add to total HP at time 0
      // CALCULATE TOTAL HEAT LOSS total_sweat_loss_kg KG, HEAT OF VAPORATION 2430 KJ / KG, basal_time_interval H->S
      if (this.K2 == 1)
      {
          //HSUM = HSUM;
          // NSTAET = 1, new start, 2 start from previous results

          if (this.Is_Initial_Condition_Neutral) this.total_sweat_loss_kg = 0.0;
      }
      else
      {
          HSUM = HSUM + this.Work_Output_W;
          // Using value orginal sweat_production(before < Emax) to caculate total sweat loss

          this.total_sweat_loss_kg = this.total_sweat_loss_kg + (YR3BGE + this.respiratory_heatloss_W) / 2430.0 / 1000.0 * this.Time_Interval_Output_Basal_H * 3600 + WLD * this.Time_Interval_Output_Basal_H;
          // total_sweat_loss_kg = total_sweat_loss_kg + (YR3GES + respiratory_heatloss_W) / 2430.0 / 1000.0 * basal_time_interval * 3600
      }

      this.water_loss_percent = this.total_sweat_loss_kg / this.Weight_kg;

      if (this.TT_WL20 > 9998 && this.water_loss_percent > this.water_loss_percent_20){
          this.TT_WL20 = this.TT;
      }

      //TEST HOW THIS AFFECT respiratory_heatloss_W, RESPIRATORY HEAT LOSS
      //     total_metabolic_rate_wmNeg2 = HSUM + workout_output + work_output_from_exercise_W

      // compute stroke volume SV depending on total metabolic heat production

      SVMAX = 0.13;
      SVMIN = 0.07;
      HSUMX = 250;
      SVMID = (SVMAX + SVMIN) / 2;
      SVK = -HSUMX / Math.log(1 - (SVMID - SVMIN) / (SVMAX - SVMIN));
      //     SV = (SVMAX - SVMIN) * (1.- EXP(-HSUM / SVK)) + SVMIN
      //     HF = BSUM * 1000./ (60.* SV)
      //    use constant SV = 0.07 08 / 11 / 02
      HF = BSUM * 1000 / (60 * 0.07);
      this.mean_skin_temp = 0.07 * this.T[0][100][this.K2 - 1] + 0.36 * this.T[1][100][this.K2 - 1] + 0.134 * this.T[2][100][this.K2 - 1]
      + 0.05 * this.T[3][100][this.K2 - 1] + 0.317 * this.T[4][100][this.K2 - 1] + 0.069 * this.T[5][100][this.K2 - 1];
      //TOEVA total evaopration, TOEMX total max evaporate, Wsk skin wedness
      /** @type {number} */let TOEVA = 0.0;
      /** @type {number} */let TOEMX = 0.0;

      for (let i = 0; i < 6; i++) {
          TOEVA += this.sweat_production[i];
          TOEMX += this.max_evaporation_rate_w[i];
          if (this.max_evaporation_rate_w[i] < 0.001) 
          {
              REVA[i] = 1;
          } else
          {
              REVA[i] = this.sweat_production[i] / this.max_evaporation_rate_w[i];
          }
      }

      /** @type {number} */let WSK;

      if (TOEMX < 0.001){
          WSK = 1.0;
      }else
      {
          WSK = TOEVA / TOEMX;
      }

      // Push one time-series row — matches CWEDOUTPUT.csv column layout.
      // Segments: 0=head, 1=torso, 2=arm, 3=hand, 4=leg, 5=foot
      this.simRows.push({
        // Time
        Time:         this.TT * 60,
        // Environmental (torso segment representative)
        Ta_head:      this.air_temp[0],
        Ta_torso:     this.air_temp[1],
        RH_torso:     this.relative_humidity[1],
        Wind_torso:   this.wind_speed_ms[1],
        // Core temperatures
        Tc:           this.T[1][0][this.K2 - 1],
        Tsk:          this.mean_skin_temp,
        // Metabolism
        Mtot:         HSUM,
        Mext:         this.Work_Output_W,
        // Sweat / evaporation
        SW:           this.total_sweat_loss_kg,
        Evap:         TOEVA,
        Wsk:          WSK,
        WLP:          this.water_loss_percent * 100,
        // Mean segment temps (venous = best available mean for limbs)
        Tm_arm:       this.venous_temp[2],
        Tm_leg:       this.venous_temp[4],
        // Skin temperatures
        Ts_head:      this.T[0][100][this.K2 - 1],
        Ts_torso:     this.T[1][100][this.K2 - 1],
        Ts_arm:       this.T[2][100][this.K2 - 1],
        Ts_hand:      this.T[3][100][this.K2 - 1],
        Ts_leg:       this.T[4][100][this.K2 - 1],
        Ts_foot:      this.T[5][100][this.K2 - 1],
        // Subject parameters (constant per run)
        Height:       this.Height_m,
        Weight:       this.Weight_kg,
        Body_fat:     this.Body_Fat_Percent,
        Clothed:      this.Is_Clothed ? 1 : 2,
        Immersed:     this.is_air_water,
        // Clothing thermal resistance (clo) — original input values
        Iclo_head:    this._iclo_orig[0],
        Iclo_torso:   this._iclo_orig[1],
        Iclo_arm:     this._iclo_orig[2],
        Iclo_hand:    this._iclo_orig[3],
        Iclo_leg:     this._iclo_orig[4],
        Iclo_feet:    this._iclo_orig[5],
        // Moisture permeability index (dimensionless)
        Im_head:      this._im_orig[0],
        Im_torso:     this._im_orig[1],
        Im_arm:       this._im_orig[2],
        Im_hand:      this._im_orig[3],
        Im_leg:       this._im_orig[4],
        Im_feet:      this._im_orig[5],
      });

  }//OUTPUT()
  /**
  * @returns {void} // calculates initial parameters M=1
  */
  SIGNAL(){
      // -------------------- SIGNAL VARS ------------------- //
      /** @type {number[]} */ let ALF = new Array(6);
      /** @type {number[]} */ let BFMMAX = new Array(6);
      /** @type {number[]} */ let BFMMIN = new Array(6);
      /** @type {number[]} */ let EMAXA = new Array(6);
      /** @type {number[]} */ let EMAXF = new Array(6);
      /** @type {number[]} */ let F1 = new Array(6);
      /** @type {number[]} */ let F1M = new Array(6);
      /** @type {number[]} */ let F2 = new Array(6);
      /** @type {number[]} */ let F2M = new Array(6);
      /** @type {number[]} */ let F3 = new Array(6);
      /** @type {number[]} */ let F4 = new Array(6);
      /** @type {number[]} */ let FBFM = new Array(6);
      /** @type {number[]} */ let FQK = new Array(6);
      /** @type {number[]} */ let FSH = new Array(6);
      /** @type {number[]} */ let FWYR1 = new Array(6);
      /** @type {number[]} */ let FYR = new Array(6);
      /** @type {number[]} */ let FWBFM = new Array(6);
      /** @type {number[]} */ let GK = new Array(6);
      /** @type {number[]} */ let GM = new Array(6);
      /** @type {number[]} */ let GS = new Array(6);
      /** @type {number[]} */ let QG = new Array(6);
      /** @type {number[]} */ let QKABS = new Array(6);
      /** @type {number[]} */ let UMMAX = new Array(6);
      /** @type {number[]} */ let WDD = new Array(6);
      /** @type {number[]} */ let WDDMAX = new Array(6);
      /** @type {number[]} */ let WORK = new Array(6);
      /** @type {number[]} */ let WS = new Array(6);
      /** @type {number[]} */ let WORKF = new Array(6);
      /** @type {number[]} */ let WY = new Array(5);
      /** @type {number[]} */ let YR1ABS = new Array(6);
      /** @type {number[]} */ let YR1AX = new Array(6);
      /** @type {number[]} */ let YR1IN = new Array(6);
      /** @type {number[]} */ let YR2ABS = new Array(6);
      /** @type {number[]} */ let YR2AX = new Array(6);
      /** @type {number[]} */ let YR3X0 = new Array(6);
      /** @type {number[]} */ let YR30 = new Array(6);
      // ----------------------------------------------- //

      //INTRINSIC AMOD, IFIX, SIN
      // ALF= COUNTER CURRENT FACTOR
      ALF = [1.00, 1.00, 1.00, 0.80, 0.95, 0.80];
      // Core_Blood_Flow_Indifferent_Basal_M3_Hm3 = CORE BLOOD FLOW IN INDIFFERENT STATUS IN M3/(H M3)
      this.Core_Blood_Flow_Indifferent_Basal_M3_Hm3 = [17.52, 6.6257, 0.4982, 0.6060, 0.3508, 0.1960];
      // F1 = GAIN FACTOR FOR SKIN BLOOD FLOW IN COLD IN M3/(H M3 C)
      F1 = [8.000, 12.00, 1.562, 10.29, 1.396, 7.607];
      F1M = [0.2, 0.50, 0.8, 3.5, 0.8, 2.2];
      // F2 = GAIN FACTOR FOR METABOLIC HEAT PROD. IN COLD IN W/(M3 C)
      F2 = [316.0, 2888, 0, 0, 0, 0];
      F2M = [316.0, 6188, 6188, 108, 6196, 108];
      // F3 = GAIN FACTOR FOR EVAPORATIVE HEAT LOSS IN W/C, original May 05 2004
      // DATA F3/35.00,120.00,40., 5.,  105.67, 12./
      // new F3 May 05, 2004
      F3 = [35.0, 60.0, 20.0, 5.0, 50.0, 12];
      // F4 = GAIN FACTOR FOR SKIN BLOOD FLOW IN HEAT IN M3/(H M3 C)
      F4 = [24.23, 36.635, 24.325, 30.87, 40.94, 22.821];
      // TB = THRESHOLD FOR MEAN BODY TEMPERATURE IN C
      // test the different initial TB
      this.TB = 36.8;
      // DATA TB/36.5/
      // FMCBF= GAIN IN MUSCLE BLOOD FLOW DUE TO WORK & SHIV. IN M3/(H W)
      /** @type {number} */let FMCBF = 0.00086;
      // WORKF= PORTION OF WORKING MUSCLES
      WORKF = [0.0, 0.3, 0.08, 0.01, 0.6, 0.01];
      // YRJMAX= MAX. OF SKIN BLOOD FLOW IN M3/(M3 H), OF MET. HEAT PROD. IN
      //      IN CORE IN W/ M3, SWEAT PRODUCTION IN G/(M2 H)
      // UMMAX= MAX. OF MET HEAT PROD. IN MUSCLE W/M3
      YR1AX = [257.8, 29.59, 114.6, 485.5, 46.09, 358.7];
      YR2AX = [4540.0, 9061, 800, 352.42, 474, 228.04];
      YR3X0 = [600, 600, 600, 600, 600, 600];
      UMMAX = [4540.0, 9644.0, 4347, 850.42, 6878.0, 793.04];
      // YR1IN= MIN. OF SKIN BLOOD FLOW IN L/(M3 H)
      YR1IN = [0.80, 0.46, 0.46, 2.58, 0.46, 2.58];
      this.basal_skin_blood_flow = [3.125, 4.6, 0.97, 5.04, 0.89, 4.78 ];
      YR30 = [0.93, 8.78, 6.39, 0.52, 10.32, 0.72 ];
      // XMCA= MASS * SPEC. HEAT OF ART. BLOOD IN (W H)/C,
      // ROCA= DENSITY * SPEC. HEAT OF ART. BLOOD IN (W H)/(// M3),
      // respiratory_heatloss_W= RESPIRATORY HEAT LOSS IN W, SHOULD BE MADE VARIABLE.
      this.XMCA = 2.616;
      this.ROCA = 1046.7;
      this.respiratory_heatloss_W = 10.47;
      // GS,GK= WEIGHTING FACTOR SHELL AND CORE FOR SENSOR SIGNALS
      GS = [0.007, 0.049, 0.015, 0.007, 0.019, 0.003];
      GK = [0.54, 0.285, 0.0, 0, 0, 0];
      GM = [0, 0.03, 0.005, 0, 0.04, 0];
      // WY= COEFFICIENTS FOR COMPUT. OF SAT. WATER VAPOR PRESSURE,
      //      IN PA, PA/C, PA/C2, PA/C3, PA/C4
      WY = [585.5027772, 46.103123, 1.612492, 9.606613E-3, 6.705676E-4];
      // FQK= VASOCONSTRICTION  COEFFICIENT OF CORE DUE TO THERMAL STRESS
      // FBFM=VASOCONSTRICTION  COEFFICIENT OF MUSCLE DUE TO THERMAL STRESS
      // FWYR1=VASOCONSTRICTION COEFFICIENT OF SKIN DUE TO EXERCISE
      // FWBFM=VASODILATION COEFFICIENT OF MUSCLE DUE TO EXERCISE
      // FYW  =DYNAMIC SENSETIVITY OF SKIN EFFECTORS
      // BFMMAX=MAX BLOOD FLOW IN MUSCLE L/(M3H)
      FQK = [0.0, 0.1, 0.18, 0.18, 0.18, 0.18];
      FBFM = [0.16, 0.36, 0.3, 0.3, 0.14, 0.14];
      FWYR1 = [0.0, 0.5, 0.1, 0.8, 0.2, 0.7];
      FWBFM = [0.0, 1, 1, 1, 1, 1];

      FYR =  [0, 10, 0.1, 5.0, 0.1, 3.0];
      BFMMAX = [63, 63, 63, 63, 63, 63];
      // reduce min blood flow in extremity to 0 M. Toner's paper in 
      // experimental physiology
      // test impact of muscle BF in Tc
      BFMMIN = [0.194, 0.396, 0.02, 0.04, 0.02, 0.04];
      FSH = [0.02, 0.8, 0.02, 0.0, 0.16, 0.0];
      // SWETA= PORTION OF NOT DRIPPING SWEAT, SHOULD BE MADE VARIABLE,
      // ENTH= EVAP. ENTHALPY IN (W H)/G,
      /** @type {number} */let SWETA = 0.8;
      /** @type {number} */let ENTH = 0.67454;

      // M=1, ONLY CALCULATE INITIAL INFORMATION
      if (this.M === 1)
      {
          this.KCIVD = 0;
          // Moved from Main to Singal 12/1/2006
          // SHERVIERING CONTROL PARAMETERS is_Shivering=0, NO SHIVERING
          //                               is_Shivering=1, SHIVERING 	 
          // SET is_Shivering=0, as initial when M=1
          this.is_Shivering = 0;
      }

      else
      {
          // prepare computations
          for (let i = 0; i < 6; i++) {
              WORK[i] = this.work_output_from_exercise_W * WORKF[i];
          }
          // venous_temp(i) = 0;

          // compute afferent signals
          this.YR0 = this.YR;
          this.YR = 0;

          for (let i = 0; i < 6; i++) {
              this.Z1 = (this.L0[0][i] + this.L0[1][i]) / 2.0;
              this.MZ1 = Math.floor(this.Z1) - 1;
              this.Z2 = (this.L0[2][i] + this.JXR + 1) / 2.0;
              this.MZ2 = Math.floor(this.Z2);
              this.YR = this.YR + this.T[i][2][1] * GK[i] + this.T[i][this.MZ1][1] * GM[i] + this.T[i][this.MZ2][1] * GS[i];
          }
          this.YR = this.YR - this.TB + 0.2;
          // calculate mean skin temp
          this.mean_skin_temp = 0.07 * this.T[0][100][1] + 0.36 * this.T[1][100][1] + 0.134 * this.T[2][100][1]
          + 0.05 * this.T[3][100][1] + 0.317 * this.T[4][100][1] + 0.069 * this.T[5][100][1];

          // calculate shivering metabolism and CIVD
          this.SHIVCIVD();
          // compute effector signals:
          this.YRTS = (this.YR - this.YR0) / this.init_time_step;
          if ((this.YRTS < 0) && (this.YRTS > -10))
          {
              this.YRTS = -this.YRTS;
          }
          else
          {
              this.YRTS = 0;
          }

          for (let i = 0; i < 6; i++)
          {
              if (this.YR < 0)
              {
                  // is_Shivering=1 shivering
                  this.is_Shivering = 1;
                  this.Skin_Blood_Flow_Lm3H[i] = F1[i] * this.YR + this.basal_skin_blood_flow[i] - WORK[i] * FWYR1[i];
                  // IF (init_skin_blood_flow[i] < YR1IN[i]) init_skin_blood_flow[i]= YR1IN[i]
                  // reduce skin blood flow by 10,  11/14/02
                  if (this.Skin_Blood_Flow_Lm3H[i] < YR1IN[i] * 0.5) {
                      this.Skin_Blood_Flow_Lm3H[i] = YR1IN[i] * 0.5;
                  }
                  this.init_metabolic_heat_production_core[i] = F2[i] * (-this.YR) + this.Core_Metabolic_Heat_Production_Wm3[i];
                  // 11/05/02
                  // shivering heat production add to muscle, convert to W for distribution
                  // secondary_shivering_wm3 calculated from subroutine SHIVCIVD
                  this.Muscle_Metabolic_Heat_Production_Initial_Wm3[i] =this. Muscle_Blood_Flow_Basal_m3_Hm3[i] + this.secondary_shivering_wm3 * FSH[i] / this.All_Layers_Volume_m3[1][i] * this.muscle_volume_coreTorso;
                  //       Muscle_Blood_Flow_Initial_m3_Hm3[i]= Muscle_Metabolic_Heat_Production_Basal_Wm3[i]+WORK[i]*FWBFM[i]*FMCBF/V(2,i)	
                  // considering shivering in core of the torso  
                  if (i == 1) {
                      this.Muscle_Metabolic_Heat_Production_Initial_Wm3[1] = this.Muscle_Blood_Flow_Basal_m3_Hm3[1] + this.secondary_shivering_wm3 * FSH[1] * (1.0 - 0.5) / this.All_Layers_Volume_m3[1][1] * this.muscle_volume_coreTorso;
                      this.init_metabolic_heat_production_core[1] = this.Core_Metabolic_Heat_Production_Wm3[1] + FSH[1] * this.secondary_shivering_wm3 * 0.5 / this.All_Layers_Volume_m3[0][1] * this.muscle_volume_coreTorso;
                  }
                  this.sweat_production[i] = YR30[i];
                  this.init_core_blood_flow_indifferent[i] = this.Core_Blood_Flow_Indifferent_Basal_M3_Hm3[i];
                  // calculate heat production when Tcore<28C, Q10
                  if (this.T[1][2][1] < 28.0) {
                      this.Muscle_Metabolic_Heat_Production_Initial_Wm3[i] = this.Muscle_Metabolic_Heat_Production_Initial_Wm3[i] * Math.pow(2.0, ((this.T[1][2][1] - 28.0) / 10.0));
                      this.init_metabolic_heat_production_core[i] = this.init_metabolic_heat_production_core[i] * Math.pow(2.0, ((this.T[1][2][1] - 28.0) / 10.0));
                  }

                  this.Muscle_Metabolic_Heat_Production_Initial_Wm3[i] = this.Muscle_Metabolic_Heat_Production_Initial_Wm3[i] + WORK[i] / this.All_Layers_Volume_m3[1][i];

                  this.sweat_production[i] = YR30[i];

                  this.YR3B[i] = this.sweat_production[i];
                  this.init_core_blood_flow_indifferent[i] = this.Core_Blood_Flow_Indifferent_Basal_M3_Hm3[i];
                  this.Muscle_Blood_Flow_Initial_m3_Hm3[i] = this.Muscle_Metabolic_Heat_Production_Basal_Wm3[i] + F1M[i] * this.YR + (this.Muscle_Metabolic_Heat_Production_Initial_Wm3[i] - this.Muscle_Blood_Flow_Basal_m3_Hm3[i]) * FMCBF * 0.7;

                  if (this.Muscle_Blood_Flow_Initial_m3_Hm3[i] < BFMMIN[i]) {
                      this.Muscle_Blood_Flow_Initial_m3_Hm3[i] = BFMMIN[i];
                  }

              }//if
              else {
                  
                  // calculation for warm conditions
                  // BFCM to determine if there is blood competition between Muscle and Core, 11/15/06
                  /** @type {number} */let BFCM = 1.0;
                  this.is_Shivering = 0;
                  this.Skin_Blood_Flow_Lm3H[i] = (F4[i] - this.YRTS * FYR[i] * 0.0) * this.YR + this.basal_skin_blood_flow[i] - WORK[i] * FWYR1[i] / this.All_Layers_Volume_m3[3][i] * FMCBF * BFCM;

                  if (this.Skin_Blood_Flow_Lm3H[i] < YR1IN[i]) {
                      this.Skin_Blood_Flow_Lm3H[i] = YR1IN[i];
                  }

                  // Q10 2->10 06.04
                  this.init_metabolic_heat_production_core[i] = this.Core_Metabolic_Heat_Production_Wm3[i] * Math.pow(2, (this.YR / 10));
                  this.sweat_production[i] = F3[i] * this.YR + YR30[i];

                  this.YR3B[i] = this.sweat_production[i];
                  this.Muscle_Metabolic_Heat_Production_Initial_Wm3[i] = this.Muscle_Blood_Flow_Basal_m3_Hm3[i] * Math.pow(2, (this.YR / 10)) + WORK[i] / this.All_Layers_Volume_m3[1][i];
                  this.init_core_blood_flow_indifferent[i] = this.Core_Blood_Flow_Indifferent_Basal_M3_Hm3[i] * (1 - FQK[i] * this.YR * BFCM);

                  this.Muscle_Blood_Flow_Initial_m3_Hm3[i] = this.Muscle_Metabolic_Heat_Production_Basal_Wm3[i] - FBFM[i] * this.YR * this.Muscle_Metabolic_Heat_Production_Basal_Wm3[i] + WORK[i] * FMCBF / this.All_Layers_Volume_m3[1][i] * (1 - 0.1 * this.YR * BFCM) * FWBFM[i];

                  if (this.Muscle_Blood_Flow_Initial_m3_Hm3[i] > BFMMAX[i]) {
                      this.Muscle_Blood_Flow_Initial_m3_Hm3[i] = BFMMAX[i];
                  }

                  // 9/1/06 set minimal Muscle_Blood_Flow_Initial_m3_Hm3 in warm
                  if (this.Muscle_Blood_Flow_Initial_m3_Hm3[i] < BFMMIN[i]) {
                      this.Muscle_Blood_Flow_Initial_m3_Hm3[i] = BFMMIN[i];
                  }
              }//else
          }//for i

          // Lewis relation, calculated from subroutine SHIVCIVD
          this.Skin_Blood_Flow_Lm3H[3] = this.Skin_Blood_Flow_Lm3H[3] + this.BFCD;

          // Test whether maximum values are reached
          for (let i = 0; i < 6; i++) 
          {
              if ((this.Skin_Blood_Flow_Lm3H[i] - YR1AX[i]) >= 0) this.Skin_Blood_Flow_Lm3H[i] = YR1AX[i];

              // max_sweat_production NOW IN W
              this.max_sweat_production[i] = SWETA * this.Cylinder_Surface_Area_m[i] * ENTH * YR3X0[i];
              // sweat_production CAN NOT EXCEED THE PHYSIOLOGICAL LIMIT
              if ((this.sweat_production[i] - this.max_sweat_production[i]) >= 0) this.sweat_production[i] = this.max_sweat_production[i];
              WS[i] = this.VAP(this.air_temp[i]);
              WDD[i] = this.relative_humidity[i] * WS[i];
              WS[i] = this.VAP(this.T[i][100][1]);
              WDDMAX[i] = 1 * WS[i];
              EMAXF[i] = this.evaporative_heat_transfer_coefficient[i] * (WDDMAX[i] - WDD[i]);
              EMAXA[i] = EMAXF[i] * this.Cylinder_Surface_Area_m[i];

              if (EMAXF[i] <= 0) EMAXF[i] = 0;

              if ((EMAXF[i] - this.max_sweat_production[i] / this.Cylinder_Surface_Area_m[i]) < 0) {
                  this.max_evaporation_rate_w[i] = EMAXF[i] * this.Cylinder_Surface_Area_m[i];
              } else {
                  this.max_evaporation_rate_w[i] = this.max_sweat_production[i];
              }

              if ((this.sweat_production[i] - this.max_evaporation_rate_w[i]) >= 0) this.sweat_production[i] = this.max_evaporation_rate_w[i];
          }//for i 

          // compute absolut and total effector values
          this.YR1GES = 0;
          this.YR2GES = 0;
          this.YR3GES = 0;

          for (let i = 0; i < 6; i++) {
              YR1ABS[i] = this.Skin_Blood_Flow_Lm3H[i] * this.All_Layers_Volume_m3[3][i] * 1000;
              this.YR1GES = this.YR1GES + YR1ABS[i];
              YR2ABS[i] = this.init_metabolic_heat_production_core[i] * this.All_Layers_Volume_m3[0][i];
              this.YR2GES = this.YR2GES + YR2ABS[i];
              this.YR3GES = this.YR3GES + this.sweat_production[i];
          }
          
          this.QKGES = 0;
          for (let i = 0; i < 6; i++) {
              QKABS[i] = this.init_core_blood_flow_indifferent[i] * this.All_Layers_Volume_m3[0][i] * 1000;
              this.QKGES = this.QKGES + QKABS[i];
          }
      } //m ! === 1

      // CALCULATE BLOOD FLOWS AND VEIN TEMPERATURES
      this.XG2 = 0;
      this.XF2 = 0;

      // Moved from Main to Signal on 12/1/2006
      // Set the initial venous_temp[I]
      for (let i = 0; i < 6; i++){
          this.venous_temp[i] = 0.0;
      }
      for (let i = 0; i < 6; i++){

          /** @type {number} */let L = this.L0[0][i] - 1;
          this.K = this.L0[0][i];
          QG[i] = this.init_core_blood_flow_indifferent[i] * Math.pow(this.Cylinder_Normal_Radius_Core_m[0][i], 2) / 2 + 
          this.Muscle_Blood_Flow_Initial_m3_Hm3[i] * (Math.pow(this.Cylinder_Normal_Radius_Core_m[1][i], 2) - Math.pow(this.Cylinder_Normal_Radius_Core_m[0][i], 2)) / 2 + 
          this.Fat_Blood_Flow_m3_Hm3[i] * (Math.pow(this.Cylinder_Normal_Radius_Core_m[2][i], 2) - Math.pow(this.Cylinder_Normal_Radius_Core_m[1][i], 2)) / 2 + 
          this.Skin_Blood_Flow_Lm3H[i] * (1 - Math.pow(this.Cylinder_Normal_Radius_Core_m[2][i], 2)) / 2;
          this.T[i][this.JXR + 1][this.M - 1] = this.X[1][i] * this.T[i][L + 1][this.M - 1] + this.X[0][i] * this.T[i][L][this.M - 1];
          this.TV1 = this.Cylinder_Normal_Radius_Core_m[0][i] * this.Muscle_Blood_Flow_Initial_m3_Hm3[i] * this.T[i][this.JXR + 1][this.M - 1];
          this.TV2 = L * this.XJ * this.init_core_blood_flow_indifferent[i] * this.T[i][L][this.M - 1] + this.Cylinder_Normal_Radius_Core_m[0][i] * this.init_core_blood_flow_indifferent[i] * this.T[i][this.JXR + 1][this.M - 1];
          this.TV3 = (L + 1) * this.XJ * this.Muscle_Blood_Flow_Initial_m3_Hm3[i] * this.T[i][this.K][this.M - 1];
          this.venous_temp[i] = (0 + this.TV2) * this.H1[0][i] / 2 + (this.TV1 + this.TV3) * this.H2[0][i] / 2;

          L = this.L0[1][i] - 1;
          this.K = this.L0[1][i];
          this.T[i][this.JXR + 2][this.M - 1] = this.X[3][i] * this.T[i][L + 1][this.M - 1] + this.X[2][i] * this.T[i][L][this.M - 1];
          this.TV1 = this.Cylinder_Normal_Radius_Core_m[1][i] * this.Fat_Blood_Flow_m3_Hm3[i] * this.T[i][this.JXR + 1][this.M - 1];
          this.TV2 = L * this.XJ * this.Muscle_Blood_Flow_Initial_m3_Hm3[i] * this.T[i][L][this.M - 1] + this.Cylinder_Normal_Radius_Core_m[1][i] * this.Muscle_Blood_Flow_Initial_m3_Hm3[i] * this.T[i][this.JXR + 2][this.M - 1];
          this.TV3 = (L + 1) * this.XJ * this.Fat_Blood_Flow_m3_Hm3[i] * this.T[i][this.K][this.M - 1];
          this.venous_temp[i] = this.venous_temp[i] + (0 + this.TV2) * this.H1[1][i] / 2 + (this.TV1 + this.TV3) * this.H2[1][i] / 2;

          L = this.L0[2][i] - 1;
          this.K = this.L0[2][i];
          this.T[i][this.JXR + 3][this.M - 1] = this.X[5][i] * this.T[i][L + 1][this.M - 1] + this.X[4][i] * this.T[i][L][this.M - 1];
          this.TV1 = this.Cylinder_Normal_Radius_Core_m[2][i] * this.Skin_Blood_Flow_Lm3H[i] * this.T[i][this.JXR + 2][this.M - 1];
          this.TV2 = L * this.XJ * this.Fat_Blood_Flow_m3_Hm3[i] * this.T[i][L][this.M - 1] + this.Cylinder_Normal_Radius_Core_m[2][i] * this.Fat_Blood_Flow_m3_Hm3[i] * this.T[i][this.JXR + 3][this.M - 1];
          this.TV3 = (L + 1) * this.XJ * this.Skin_Blood_Flow_Lm3H[i] * this.T[i][this.K][this.M - 1];
          this.venous_temp[i] = this.venous_temp[i] + (0 + this.TV2) * this.H1[2][i] / 2 + (this.TV1 + this.TV3) * this.H2[2][i] / 2;

          // index changed too here.

          
          for (let K = 0; K < this.JXR; K++)
          {
              if (K < this.L0[0][i] - 1) {
                  this.TV1 = K * this.XJ * this.init_core_blood_flow_indifferent[i] * this.T[i][K][this.M - 1];
                  this.TV2 = (K + 1) * this.XJ * this.init_core_blood_flow_indifferent[i] * this.T[i][K + 1][this.M - 1];
                  this.venous_temp[i] = this.venous_temp[i] + (this.TV1 + this.TV2) * this.XJ / 2;
              }
              else if ((K > this.L0[0][i] - 1) && (K < this.L0[1][i] - 1)) {
                  this.TV1 = K * this.XJ * this.Muscle_Blood_Flow_Initial_m3_Hm3[i] * this.T[i][K][this.M - 1];
                  this.TV2 = (K + 1) * this.XJ * this.Muscle_Blood_Flow_Initial_m3_Hm3[i] * this.T[i][K + 1][this.M - 1];
                  this.venous_temp[i] = this.venous_temp[i] + (this.TV1 + this.TV2) * this.XJ / 2;
              } else if ((K > this.L0[1][i] - 1) && (K < this.L0[2][i] - 1)) {
                  this.TV1 = K * this.XJ * this.Fat_Blood_Flow_m3_Hm3[i] * this.T[i][K][this.M - 1];
                  this.TV2 = (K + 1) * this.XJ * this.Fat_Blood_Flow_m3_Hm3[i] * this.T[i][K + 1][this.M - 1];
                  this.venous_temp[i] = this.venous_temp[i] + (this.TV1 + this.TV2) * this.XJ / 2;
              } else if (K > this.L0[2][i] - 1) {
                  this.QG1 = K * this.XJ * this.Skin_Blood_Flow_Lm3H[i];
                  this.QG2 = (K + 1) * this.XJ * this.Skin_Blood_Flow_Lm3H[i];
                  this.TV1 = this.QG1 * this.T[i][K][this.M - 1];
                  this.TV2 = this.QG2 * this.T[i][K + 1][this.M - 1];
                  this.venous_temp[i] = this.venous_temp[i] + (this.TV1 + this.TV2) * this.XJ / 2;
              }
          }
          QG[i] = 2 * Math.PI * this.Cylinder_Length_m[i] * QG[i] * Math.pow(this.Cylinder_Radius_m[i], 2);
          this.venous_temp[i] = this.venous_temp[i] * 2 * Math.PI * this.Cylinder_Length_m[i] * Math.pow(this.Cylinder_Radius_m[i], 2) / QG[i];
          this.XG2 = this.XG2 + this.venous_temp[i] * ALF[i] * this.ROCA / this.XMCA * QG[i];
          this.XF2 = this.XF2 + QG[i] * ALF[i] * this.ROCA / this.XMCA;

      }//for i

      //  calculating respiratory heat loss
      //    HSUM=0.0
      // DO 4082 I=1,6
      //     HSUM= HSUM+V(1,I)*init_metabolic_heat_production_core[I]+V(2,I)*Muscle_Metabolic_Heat_Production_Initial_Wm3[I]+V(3,I)*UF[I]
      //    +	      +V(4,I)*Shell_Heat_Production_Wm3[I]
      // 4082  CONTINUE
      // total_metabolic_rate_wmNeg2=HSUM

      // test TRES=34, P=44mmhg

      this.TRES = this.T[1][2][1];
      // TRES=34, PRES=44 MMHG ARE FROM FANGER'S BOOK
      // TRES=34
      if (this.TRES < this.air_temp[1]) this.TRES = this.air_temp[1];
      this.PRES = this.VAP(this.TRES);
      // PRES=44*133.32
      this.PV = this.relative_humidity[0] * this.VAP(this.air_temp[1]);
      if (this.PRES < this.PV) this.PRES = this.PV;
      /** @type {number} */let CRES = 0.0014 * this.total_metabolic_rate_wmNeg2 * (this.TRES - this.air_temp[1]);
      this.respiratory_heatloss_W = 0.0023 * this.total_metabolic_rate_wmNeg2 * (this.PRES - this.PV) / 133.32 + CRES;

      this.XG2 = this.XG2 - this.respiratory_heatloss_W / this.XMCA;
      if (this.M === 1) {
          this.XG1 = this.XG2;
          this.XF1 = this.XF2;
      } else {
          this.Z = (this.XF1 + this.XF2) / 2;
          this.Z1 = Math.exp(-this.Z * this.init_time_step);
          this.Z2 = (this.XG2 - this.XG1 * this.Z1) / this.Z;
          this.arterial_temp[1] = this.arterial_temp[0] * this.Z1 + this.Z2 - (this.XG2 - this.XG1) * (1 - this.Z1) / (this.init_time_step * this.Z * this.Z);
          this.XG1 = this.XG2;
          this.XF1 = this.XF2;
      }
              
  }//SIGNAL()
  NEWTEM(){

      // ------------------ NEWTEM VARS ----------------- //
      /** @type {number} */ let J3;
      /** @type {number} */ let KCMS;
      /** @type {number} */ let N;
      /** @type {number} */ let NEND;

      /** @type {number} */ let BLF = 0;
      /** @type {number} */ let BLF1 = 0;
      /** @type {number} */ let CC;
      /** @type {number} */ let R1;
      /** @type {number} */ let WPRON = 0;
      /** @type {number} */ let WPRON1 = 0;
      /** @type {number} */ let XA;

      /** @type {number[]} */ let E = new Array(102);
      /** @type {number[]} */ let F = new Array(6);
      /** @type {number[]} */ let S = new Array(102);
      /** @type {number[]} */ let TSA = new Array(6);
      // ------------------------------------------------- //

      //  Radial grid: 100 steps for each cylinder:
      //      JXR= 101
      //      J1= JXR+1
      //      J2= JXR+2
      J3 = this.JXR - 1;

      //  DO-Loop for 6 cylinders:
      for (let I = 5; I >= 0; I--)
      {
          /** @type {number} */ let L = this.L0[0][I] - 1;
          E[0] = this.All_Layers_Density_Specific_Heat_Wh_Km3[0][I] * this.T[I][0][0] / this.init_time_step + this.init_metabolic_heat_production_core[I] + this.B3[0][I] * this.init_core_blood_flow_indifferent[I] * (this.arterial_temp[0] - this.T[I][0][0]);
          R1 = this.All_Layers_Density_Specific_Heat_Wh_Km3[0][I] / this.init_time_step + 4 * this.B1[0][I];
          E[0] = E[0] / R1;
          S[0] = 4 * this.B1[0][I] / R1;
          R1 = this.All_Layers_Density_Specific_Heat_Wh_Km3[0][I] / this.init_time_step + this.B1[0][I] * 2;

          // ****GOOD!****
          //  nested DO-Loop for core:
          for (let K = 1; K < L; K++) {
              XA = this.B1[0][I] - this.B2[0][I] / (this.XJ * K);
              CC = this.B1[0][I] + this.B2[0][I] / (this.XJ * K);
              E[K] = this.All_Layers_Density_Specific_Heat_Wh_Km3[0][I] * this.T[I][K][0] / this.init_time_step + this.init_metabolic_heat_production_core[I] + this.B3[0][I] * this.init_core_blood_flow_indifferent[I] * (this.arterial_temp[0] - this.T[I][K][0]);
              E[K] = (E[K] + XA * E[K - 1]) / (R1 - XA * S[K - 1]);
              S[K] = CC / (R1 - XA * S[K - 1]);
          }

          //  method of central differences is used to solve partial
          //  differential equation

          //  transition from core to muscle:  kcms= 1
          //  nested DO-Loop for muscle:
          //                muscle to fat      kcms= 2
          //                fat
          //                fat to skin        kcms= 3
          //   

          for (KCMS = 0; KCMS < 3; KCMS++)
          {
              if (KCMS === 0) {
                  WPRON = this.init_metabolic_heat_production_core[I];
                  BLF = this.init_core_blood_flow_indifferent[I];
                  WPRON1 = this.Muscle_Metabolic_Heat_Production_Initial_Wm3[I];
                  BLF1 = this.Muscle_Blood_Flow_Initial_m3_Hm3[I];
              } else if (KCMS === 1) {
                  WPRON = this.Muscle_Metabolic_Heat_Production_Initial_Wm3[I];
                  BLF = this.Muscle_Blood_Flow_Initial_m3_Hm3[I];
                  WPRON1 = this.UF[I];
                  BLF1 = this.Fat_Blood_Flow_m3_Hm3[I];
              } else if (KCMS === 2) {
                  WPRON = this.UF[I];
                  BLF = this.Fat_Blood_Flow_m3_Hm3[I];
                  WPRON1 = this.Shell_Heat_Production_Wm3[I];
                  BLF1 = this.Skin_Blood_Flow_Lm3H[I];
              }
              L = this.L0[KCMS][I] - 1;
              XA = this.B1[KCMS][I] - this.B2[KCMS][I] / (this.XJ * L);
              CC = this.B1[KCMS + 1][I] - this.B1[KCMS][I] + (this.B2[KCMS + 1][I] - this.B2[KCMS][I]) / (this.XJ * L);

              R1 = this.All_Layers_Density_Specific_Heat_Wh_Km3[KCMS][I] / this.init_time_step + 2 * this.B1[KCMS][I] + CC * this.X[(2 * (KCMS + 1)) - 2][I];
              CC = this.B1[KCMS + 1][I] + this.B2[KCMS + 1][I] / (this.XJ * L) - CC * this.X[(2 * (KCMS + 1)) - 1][I];

              E[L] = WPRON + this.B3[KCMS][I] * BLF * (this.arterial_temp[0] - this.T[I][L][0]);
              E[L] += this.All_Layers_Density_Specific_Heat_Wh_Km3[KCMS][I] * this.T[I][L][0] / this.init_time_step;
              E[L] = (E[L] + XA * E[L - 1]) / (R1 - XA * S[L - 1]);
              S[L] = CC / (R1 - XA * S[L - 1]);   
              // GOOD TO HERE
              L = this.L0[KCMS][I];

              XA = this.B1[KCMS + 1][I] - this.B1[KCMS][I] - (this.B2[KCMS + 1][I] - this.B2[KCMS][I]) / (this.XJ * L);
              R1 = this.All_Layers_Density_Specific_Heat_Wh_Km3[KCMS + 1][I] / this.init_time_step + 2 * this.B1[KCMS + 1][I] - XA * this.X[(2 * (KCMS + 1)) - 1][I];

              XA = this.B1[KCMS][I] - this.B2[KCMS][I] / (this.XJ * L) + XA * this.X[(2 * (KCMS + 1)) - 2][I];
              CC = this.B1[KCMS + 1][I] + this.B2[KCMS + 1][I] / (this.XJ * L);
              E[L] = this.All_Layers_Density_Specific_Heat_Wh_Km3[KCMS + 1][I] * this.T[I][L][0] / this.init_time_step + WPRON1 + this.B3[KCMS + 1][I] * BLF1 * (this.arterial_temp[0] - this.T[I][L][0]);
              E[L] = (E[L] + XA * E[L - 1]) / (R1 - XA * S[L - 1]);
              S[L] = CC / (R1 - XA * S[L - 1]);
              N = this.L0[KCMS][I] + 1;
              R1 = this.All_Layers_Density_Specific_Heat_Wh_Km3[KCMS + 1][I] / this.init_time_step + this.B1[KCMS + 1][I] * 2;

              if (KCMS === 2) {
                  NEND = J3;
              } else {
                  NEND = this.L0[KCMS + 1][I] - 1;
              }
              
              for (let K = N; K <= NEND; K++) {
                  XA = this.B1[KCMS + 1][I] - this.B2[KCMS + 1][I] / (this.XJ * K);
                  CC = this.B1[KCMS + 1][I] + this.B2[KCMS + 1][I] / (this.XJ * K);
                  E[K] = this.All_Layers_Density_Specific_Heat_Wh_Km3[KCMS + 1][I] * this.T[I][K][0] / this.init_time_step + WPRON1 + this.B3[KCMS + 1][I] * BLF1 * (this.arterial_temp[0] - this.T[I][K][0]);
                  E[K] = (E[K] + XA * E[K - 1]) / (R1 - XA * S[K - 1]);
                  S[K] = CC / (R1 - XA * S[K - 1]);
              }
          }//for KCMS
          
          TSA[I] = this.T[I][100][1] + 273.15;

          // Transfer coefficient for radiation:
          F[I] = this.radiation_convective_coefficient[I] * this.Cylinder_Radius_m[I] / this.All_Layers_Heat_Conductivity_WmK[3][I];

          // if clothed is_clothed=1, cloth temp. used
          if (this.Is_Clothed && this.clothing_thickness_mm[I] > 1E-4) {
              E[this.JXR] = this.XJ * (F[I] * this.TL[I] - this.H[I] * this.sweat_production[I]);
          } else {
              E[this.JXR] = this.XJ * (F[I] * (this.TRA[I] * this.radiation_heat_transfer_coefficient[I] + this.convective_heat_transfer_coefficient_VL[I] * this.TL[I]) / this.radiation_convective_coefficient[I] - this.H[I] * this.sweat_production[I]);
          }

          R1 = 1 + F[I] * this.XJ;
          E[this.JXR] = (E[this.JXR] + E[this.JXR - 1]) / (R1 - S[this.JXR - 1]);
          this.T[I][this.JXR][1] = E[this.JXR];
          // nested Do-Loop for computation of new temperature:
          for (let K = 0; K <= J3; K++) {
              L = this.JXR - K - 1;
              this.T[I][L][1] = S[L] * this.T[I][L + 1][1] + E[L];
          }

          L = this.L0[0][I] - 1;
          this.T[I][this.JXR + 1][1] = this.X[1][I] * this.T[I][L + 1][1] + this.X[0][I] * this.T[I][L][1];


      }//for I=5
  }//NEWTEM()
  SHIVCIVD(){

      // ------------------- SHIVCVID VARS ---------------- //
      // constant for shivering endurance calculation
      /** @type {number} */ let SHALFA = 18;
      /** @type {number} */ let SHBETA = 0.6;
      //double[] SECH = new double[6];
      // -------------------------------------------------- //

      this.mean_skin_temp = 0.07 * this.T[0][100][1] + 0.36 * this.T[1][100][1] + 0.134 * this.T[2][100][1] +
          0.05 * this.T[3][100][1] + 0.317 * this.T[4][100][1] + 0.069 * this.T[5][100][1];

      // calculate shivering metabolic heat production (primary, 1) in W/m3
      // TRE>=32C, Tikuisis and Giesbrecht's paper
      // TRE>=30C and <=32C using peter's equation Eq(3)in the paper
      // TRE<30C, no shivering 
      //     init_shivering_wm3=(155.5*(36.7-T(2,3,2))+47.0*(33.62-mean_skin_temp)
      //     +       -1.56*(33.62-mean_skin_temp)*(33.62-mean_skin_temp))/body_fat**0.5*S/muscle_volume_coreTorso

      this.init_shivering_wm3 = (155.5 * (36.7 - this.T[1][2][1]) + 47.0 * (33.62 - this.mean_skin_temp) - 1.56 *
              (33.62 - this.mean_skin_temp) * (33.62 - this.mean_skin_temp)) / Math.sqrt(this.Body_Fat_Percent) * this.Dubois() / this.muscle_volume_coreTorso;

      if (this.T[1][2][1] < 32.0 && this.T[1][2][1] >= 30.0) {
          /** @type {number} */ let x = 2 * Math.pow((32.0 - this.T[1][2][1]), 1.4);
          this.init_shivering_wm3 *= this.SECH(x);
      } else if (this.T[1][2][1] < 30.0) {
          this.init_shivering_wm3 = 0.0;
      }
      // shivering can not exceed maximal values
      if (this.init_shivering_wm3 > this.max_shivering_wm3) {
          this.init_shivering_wm3 = this.max_shivering_wm3;
      }
      // shivering can not be negative
      if (this.init_shivering_wm3 < 0.0) {
          this.init_shivering_wm3 = 0.0;
      }
      // convert primary to secondary, the secondary will be used in calculation
      this.secondary_shivering_wm3 = this.init_shivering_wm3;

      // is_Shivering=0 no shivering, starting point for shivering
      if (this.is_Shivering === 0) {
          this.time_shivering_h = 0.0;
          this.total_time_shivering_steps = 0.0;
          this.SHTEND0 = 1700.0;
      }

      if ((this.is_Shivering === 1) && (this.secondary_shivering_wm3 > 1.0)) {
          if (this.total_time_shivering_steps > 1.0) {
              /** @type {number} */let x = (this.total_time_shivering_steps - 1.0) / SHBETA;
              this.secondary_shivering_wm3 = this.init_shivering_wm3 * this.SECH(x);
          }
      } else if (this.secondary_shivering_wm3 < 1.0) {
          this.secondary_shivering_wm3 = 0.0;
      }
      
      // calculate time of shivering
      if ((this.YR < 0.0) && (this.is_Shivering === 1) && (this.secondary_shivering_wm3 > 1.0)) {
          this.ratio_shivering = this.init_shivering_wm3 / this.max_shivering_wm3;
          this.time_endurance_h = SHALFA / this.ratio_shivering * Math.exp(-4.0 * this.ratio_shivering);
      
          if (this.SHTEND0 > this.time_endurance_h) {
              this.SHTEND0 = this.time_endurance_h;
          } else {
              this.time_endurance_h = this.SHTEND0;
          }
          this.time_shivering_h += this.init_time_step;
          this.total_time_shivering_steps += this.init_time_step / this.time_endurance_h;
      }
      this.CIVD = 2 * (15 + 10 * (this.T[1][2][1] - 36.8) - this.T[3][100][1]) * 60 / 100;

      if ((this.CIVD > 0) || (this.KCIVD >= 1)) {
          if (this.KCIVD === 0) {
              this.CIVD0 = this.CIVD;
              this.TPCD = Math.pow(2, (3 + (36.8 - this.T[1][2][1]) / 0.8)) / 60; // xu 11/1/2021
              this.WMIG = 2 * Math.PI / this.TPCD;
              this.TTCD = 0;
          }
          this.BFCD = this.CIVD0 * Math.sin(this.WMIG * this.TTCD / 2);
          if (this.TTCD < this.TPCD) {
              this.KCIVD += 1;
              this.TTCD += this.init_time_step;
          } else {
              this.TTCD = this.TPCD;
              this.BFCD = this.CIVD0 * Math.sin(this.WMIG * this.TTCD / 2);
              this.KCIVD = 0;
          }
      } else {
          this.BFCD = 0;
          this.KCIVD = 0;
      }

  }//SHIVCIVD()

  CalculateWL20EST() {
    let wl20EST = 9999;
    if (this.is_air_water === 1 && this.final_air_temp_c[2] >= 5 && this.final_air_temp_c[2] <= 35) {
      const wlpd = 1.8575 + 0.008 * Math.exp(0.1771 * this.final_air_temp_c[2]);
      wl20EST = 24.0 * (20.0 / wlpd);
      if (wl20EST >= this.total_time_air) wl20EST = this.total_time_air;
    }
    return wl20EST;
  }

} // PSDACalculator
