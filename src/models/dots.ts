// DOTS coefficients as published by the IPF / used by OpenPowerlifting.
const maleCoefficients = [-0.000001093, 0.0007391293, -0.1918759221, 24.0900756, -307.75076];
const femaleCoefficients = [-0.0000010706, 0.0005158568, -0.1126655495, 13.6175032, -57.96288];

const minBodyweightKg = 40;
const maxBodyweightKg = { male: 210, female: 150 };

export function Dots_score(totalKg: number, bodyweightKg: number, sex: "male" | "female"): number {
  const [a, b, c, d, e] = sex === "male" ? maleCoefficients : femaleCoefficients;
  const bw = Math.min(Math.max(bodyweightKg, minBodyweightKg), maxBodyweightKg[sex]);
  const denominator = a * bw ** 4 + b * bw ** 3 + c * bw ** 2 + d * bw + e;
  return (totalKg * 500) / denominator;
}
