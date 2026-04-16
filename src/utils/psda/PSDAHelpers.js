/**
 * Calculates saturated water vapour pressure (Pa).
 * Used in evaporative heat transfer calculations.
 * @param {number} x - Temperature (°C)
 * @returns {number} Saturated vapour pressure (Pa)
 */
export function VAP(x) {
  return Math.exp(18.956 - 4030 / (235 + x)) * 100.0;
}

/**
 * Hyperbolic secant function.
 * Used in shivering endurance calculations.
 * @param {number} x
 * @returns {number}
 */
export function SECH(x) {
  return 2.0 / (Math.exp(x) + Math.exp(-x));
}

/**
 * Calculates body surface area using the DuBois formula.
 * @param {number} weight_kg
 * @param {number} height_m
 * @returns {number} Surface area (m²)
 */
export function dubois(weight_kg, height_m) {
  return 0.202 * Math.pow(weight_kg, 0.425) * Math.pow(height_m, 0.725);
}

/**
 * Calculates Body Mass Index (BMI).
 * @param {number} height_m
 * @param {number} weight_kg
 * @returns {number} BMI value
 */
export function calculateBMI(height_m, weight_kg) {
  return -0.2087 * height_m * 100 + 0.697 * weight_kg - 0.0425;
}
