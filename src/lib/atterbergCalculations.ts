import type {
  AtterbergRecord,
  AtterbergTest,
  CalculatedResults,
  LiquidLimitTrial,
  PlasticLimitTrial,
  ShrinkageLimitTrial,
} from "@/context/TestDataContext";

const round = (value: number) => Number(value.toFixed(2));

const isFilled = (value: string | null | undefined) => Boolean(value && value.trim().length > 0);
const isFiniteNumber = (value: string | null | undefined) => isFilled(value) && !Number.isNaN(Number(value));
const isNumber = (value: number | undefined | null): value is number => typeof value === "number" && Number.isFinite(value);

export const sanitizeNumericInput = (value: string) => {
  const normalized = value.replace(/,/g, ".").replace(/[^\d.]/g, "");
  const [whole = "", ...fraction] = normalized.split(".");
  return fraction.length > 0 ? `${whole}.${fraction.join("")}` : whole;
};

export const isLiquidLimitTrialStarted = (trial: LiquidLimitTrial) => isFilled(trial.blows) || isFilled(trial.moisture);
export const isPlasticLimitTrialStarted = (trial: PlasticLimitTrial) => isFilled(trial.moisture);
export const isShrinkageLimitTrialStarted = (trial: ShrinkageLimitTrial) =>
  isFilled(trial.initialVolume) || isFilled(trial.finalVolume) || isFilled(trial.moisture);

export const isLiquidLimitTrialValid = (trial: LiquidLimitTrial) => isFiniteNumber(trial.blows) && isFiniteNumber(trial.moisture);
export const isPlasticLimitTrialValid = (trial: PlasticLimitTrial) => isFiniteNumber(trial.moisture);
export const isShrinkageLimitTrialValid = (trial: ShrinkageLimitTrial) =>
  isFiniteNumber(trial.initialVolume) && isFiniteNumber(trial.finalVolume) && isFiniteNumber(trial.moisture);

export const getValidLiquidLimitTrials = (trials: LiquidLimitTrial[]) =>
  trials
    .filter(isLiquidLimitTrialValid)
    .map((trial) => ({
      blows: Number(trial.blows),
      moisture: Number(trial.moisture),
      trialNo: trial.trialNo,
    }))
    .sort((a, b) => a.blows - b.blows);

export const getValidPlasticLimitTrials = (trials: PlasticLimitTrial[]) =>
  trials.filter(isPlasticLimitTrialValid).map((trial) => Number(trial.moisture));

export const getValidShrinkageLimitTrials = (trials: ShrinkageLimitTrial[]) =>
  trials
    .filter(isShrinkageLimitTrialValid)
    .map((trial) => ({
      initialVolume: Number(trial.initialVolume),
      finalVolume: Number(trial.finalVolume),
      moisture: Number(trial.moisture),
      trialNo: trial.trialNo,
    }));

const averageNumbers = (values: number[]) => {
  if (values.length === 0) return null;
  return round(values.reduce((sum, value) => sum + value, 0) / values.length);
};

/**
 * Calculate Liquid Limit (LL) using interpolation at 25 blows.
 */
export const calculateLiquidLimit = (trials: LiquidLimitTrial[]): number | null => {
  const validTrials = getValidLiquidLimitTrials(trials);

  if (validTrials.length === 0) return null;
  if (validTrials.length === 1) return validTrials[0].moisture;

  const targetBlows = 25;
  let lower: (typeof validTrials)[number] | null = null;
  let upper: (typeof validTrials)[number] | null = null;

  for (const trial of validTrials) {
    if (trial.blows <= targetBlows) lower = trial;
    if (trial.blows >= targetBlows && !upper) upper = trial;
  }

  if (lower?.blows === targetBlows) return lower.moisture;
  if (upper?.blows === targetBlows) return upper.moisture;

  if (lower && upper && lower.blows !== upper.blows) {
    const slope = (upper.moisture - lower.moisture) / (upper.blows - lower.blows);
    return round(lower.moisture + slope * (targetBlows - lower.blows));
  }

  if (lower) return lower.moisture;
  if (upper) return upper.moisture;

  return null;
};

/**
 * Calculate Plastic Limit (PL) as average moisture content.
 */
export const calculatePlasticLimit = (trials: PlasticLimitTrial[]): number | null => {
  const validTrials = getValidPlasticLimitTrials(trials);
  return averageNumbers(validTrials);
};

/**
 * Calculate Shrinkage Limit (SL) using the simplified volumetric shrinkage approach.
 */
export const calculateShrinkageLimit = (trials: ShrinkageLimitTrial[]): number | null => {
  const validTrials = getValidShrinkageLimitTrials(trials);
  if (validTrials.length === 0) return null;

  const values = validTrials
    .filter((trial) => trial.initialVolume > 0)
    .map((trial) => ((trial.initialVolume - trial.finalVolume) / trial.initialVolume) * trial.moisture);

  return averageNumbers(values);
};

/**
 * Calculate Plasticity Index (PI) = LL - PL.
 */
export const calculatePlasticityIndex = (liquidLimit: number | null, plasticLimit: number | null): number | null => {
  if (liquidLimit === null || plasticLimit === null) return null;
  return round(liquidLimit - plasticLimit);
};

export const calculateTestResult = (test: AtterbergTest): CalculatedResults => {
  switch (test.type) {
    case "liquidLimit": {
      const liquidLimit = calculateLiquidLimit(test.trials);
      return liquidLimit === null ? {} : { liquidLimit };
    }
    case "plasticLimit": {
      const plasticLimit = calculatePlasticLimit(test.trials);
      return plasticLimit === null ? {} : { plasticLimit };
    }
    case "shrinkageLimit": {
      const shrinkageLimit = calculateShrinkageLimit(test.trials);
      return shrinkageLimit === null ? {} : { shrinkageLimit };
    }
  }
};

export const countValidTrials = (test: AtterbergTest) => {
  switch (test.type) {
    case "liquidLimit":
      return test.trials.filter(isLiquidLimitTrialValid).length;
    case "plasticLimit":
      return test.trials.filter(isPlasticLimitTrialValid).length;
    case "shrinkageLimit":
      return test.trials.filter(isShrinkageLimitTrialValid).length;
  }
};

export const getActiveResultValue = (test: AtterbergTest, result: CalculatedResults = test.result) => {
  switch (test.type) {
    case "liquidLimit":
      return result.liquidLimit ?? null;
    case "plasticLimit":
      return result.plasticLimit ?? null;
    case "shrinkageLimit":
      return result.shrinkageLimit ?? null;
  }
};

export const calculateRecordResults = (record: AtterbergRecord): CalculatedResults => {
  const liquidLimitValues = record.tests
    .filter((test) => test.type === "liquidLimit")
    .map((test) => calculateTestResult(test).liquidLimit)
    .filter(isNumber);

  const plasticLimitValues = record.tests
    .filter((test) => test.type === "plasticLimit")
    .map((test) => calculateTestResult(test).plasticLimit)
    .filter(isNumber);

  const shrinkageLimitValues = record.tests
    .filter((test) => test.type === "shrinkageLimit")
    .map((test) => calculateTestResult(test).shrinkageLimit)
    .filter(isNumber);

  const liquidLimit = averageNumbers(liquidLimitValues);
  const plasticLimit = averageNumbers(plasticLimitValues);
  const shrinkageLimit = averageNumbers(shrinkageLimitValues);
  const plasticityIndex = calculatePlasticityIndex(liquidLimit, plasticLimit);

  return {
    ...(liquidLimit !== null ? { liquidLimit } : {}),
    ...(plasticLimit !== null ? { plasticLimit } : {}),
    ...(shrinkageLimit !== null ? { shrinkageLimit } : {}),
    ...(plasticityIndex !== null ? { plasticityIndex } : {}),
  };
};

export const countRecordDataPoints = (record: AtterbergRecord) => record.tests.reduce((sum, test) => sum + countValidTrials(test), 0);

export const areCalculatedResultsEqual = (left: CalculatedResults, right: CalculatedResults) =>
  left.liquidLimit === right.liquidLimit &&
  left.plasticLimit === right.plasticLimit &&
  left.shrinkageLimit === right.shrinkageLimit &&
  left.plasticityIndex === right.plasticityIndex;

export const getLiquidLimitGraphData = (trials: LiquidLimitTrial[]) =>
  getValidLiquidLimitTrials(trials).map((trial) => ({
    blows: trial.blows,
    moisture: trial.moisture,
    trial: trial.trialNo,
  }));
