import { LiquidLimitRow, PlasticLimitRow, ShrinkageLimitRow } from "@/context/TestDataContext";

/**
 * Calculate Liquid Limit (LL) using interpolation at 25 blows
 * Uses linear interpolation between two closest data points to 25 blows
 * If only one point is available, uses that as LL
 */
export const calculateLiquidLimit = (trials: LiquidLimitRow[]): number | null => {
  // Filter valid trials (both blows and moisture must be numbers)
  const validTrials = trials
    .filter(t => t.blows && t.moisture && !isNaN(parseFloat(t.blows)) && !isNaN(parseFloat(t.moisture)))
    .map(t => ({ blows: parseFloat(t.blows), moisture: parseFloat(t.moisture) }))
    .sort((a, b) => a.blows - b.blows);

  if (validTrials.length === 0) return null;
  if (validTrials.length === 1) return validTrials[0].moisture;

  // Find two closest points to 25 blows
  const targetBlows = 25;
  let lower: (typeof validTrials)[0] | null = null;
  let upper: (typeof validTrials)[0] | null = null;

  for (let i = 0; i < validTrials.length; i++) {
    if (validTrials[i].blows <= targetBlows) {
      lower = validTrials[i];
    }
    if (validTrials[i].blows >= targetBlows && !upper) {
      upper = validTrials[i];
    }
  }

  // If we have exact match at 25 blows
  if (lower && lower.blows === targetBlows) return lower.moisture;
  if (upper && upper.blows === targetBlows) return upper.moisture;

  // Linear interpolation between lower and upper
  if (lower && upper && lower.blows !== upper.blows) {
    const slope = (upper.moisture - lower.moisture) / (upper.blows - lower.blows);
    const ll = lower.moisture + slope * (targetBlows - lower.blows);
    return parseFloat(ll.toFixed(2));
  }

  // If we only have points on one side, use the closest one
  if (lower) return lower.moisture;
  if (upper) return upper.moisture;

  return null;
};

/**
 * Calculate Plastic Limit (PL) as average of moisture contents from multiple trials
 */
export const calculatePlasticLimit = (trials: PlasticLimitRow[]): number | null => {
  const validTrials = trials
    .filter(t => t.moisture && !isNaN(parseFloat(t.moisture)))
    .map(t => parseFloat(t.moisture));

  if (validTrials.length === 0) return null;

  const average = validTrials.reduce((sum, val) => sum + val, 0) / validTrials.length;
  return parseFloat(average.toFixed(2));
};

/**
 * Calculate Shrinkage Limit (SL)
 * Formula: SL = [(Initial Volume - Final Volume) / Initial Volume] × Moisture Content
 * Simplified: Uses average moisture content from trials
 */
export const calculateShrinkageLimit = (trials: ShrinkageLimitRow[]): number | null => {
  const validTrials = trials.filter(
    t => t.initialVolume && t.finalVolume && t.moisture &&
        !isNaN(parseFloat(t.initialVolume)) &&
        !isNaN(parseFloat(t.finalVolume)) &&
        !isNaN(parseFloat(t.moisture))
  );

  if (validTrials.length === 0) return null;

  let totalSL = 0;
  for (const trial of validTrials) {
    const initialVol = parseFloat(trial.initialVolume);
    const finalVol = parseFloat(trial.finalVolume);
    const moisture = parseFloat(trial.moisture);

    if (initialVol > 0) {
      const volumeChange = (initialVol - finalVol) / initialVol;
      // SL = volumetric shrinkage × moisture content (as percentage)
      totalSL += volumeChange * 100 * (moisture / 100);
    }
  }

  const averageSL = totalSL / validTrials.length;
  return parseFloat(averageSL.toFixed(2));
};

/**
 * Calculate Plasticity Index (PI)
 * PI = LL - PL
 */
export const calculatePlasticityIndex = (ll: number | null, pl: number | null): number | null => {
  if (ll === null || pl === null) return null;
  const pi = ll - pl;
  return parseFloat(pi.toFixed(2));
};

/**
 * Get graph data for Liquid Limit (blows vs moisture)
 */
export const getLiquidLimitGraphData = (trials: LiquidLimitRow[]) => {
  const validData = trials
    .filter(t => t.blows && t.moisture && !isNaN(parseFloat(t.blows)) && !isNaN(parseFloat(t.moisture)))
    .map(t => ({
      blows: parseFloat(t.blows),
      moisture: parseFloat(t.moisture),
      trial: t.trialNo,
    }))
    .sort((a, b) => a.blows - b.blows);

  return validData;
};
