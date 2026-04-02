import type {
  AtterbergRecord,
  AtterbergTest,
  CalculatedResults,
  LiquidLimitTrial,
  PlasticLimitTrial,
  ShrinkageLimitTrial,
  TestStatus,
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

export const averageNumbers = (values: number[]) => {
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
      // Support dual-method: linear or volumetric (default)
      const shrinkageLimit = test.method === "linear"
        ? calculateLinearShrinkage(test.trials)
        : calculateVolumetricShrinkage(test.trials);
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

export const isLiquidLimitTestComplete = (test: Extract<AtterbergTest, { type: "liquidLimit" }>) => countValidTrials(test) >= 2;
export const isPlasticLimitTestComplete = (test: Extract<AtterbergTest, { type: "plasticLimit" }>) => countValidTrials(test) >= 2;
export const isShrinkageLimitTestComplete = (test: Extract<AtterbergTest, { type: "shrinkageLimit" }>) =>
  getValidShrinkageLimitTrials(test.trials).some((trial) => trial.initialVolume > 0);

export const isAtterbergTestComplete = (test: AtterbergTest) => {
  switch (test.type) {
    case "liquidLimit":
      return isLiquidLimitTestComplete(test);
    case "plasticLimit":
      return isPlasticLimitTestComplete(test);
    case "shrinkageLimit":
      return isShrinkageLimitTestComplete(test);
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

export const countCompletedTests = (record: AtterbergRecord) =>
  record.tests.reduce((sum, test) => sum + (isAtterbergTestComplete(test) ? 1 : 0), 0);

export const calculateProjectResults = (records: AtterbergRecord[]): CalculatedResults => {
  const liquidLimit = averageNumbers(records.map((record) => record.results.liquidLimit).filter(isNumber));
  const plasticLimit = averageNumbers(records.map((record) => record.results.plasticLimit).filter(isNumber));
  const shrinkageLimit = averageNumbers(records.map((record) => record.results.shrinkageLimit).filter(isNumber));
  const plasticityIndex = calculatePlasticityIndex(liquidLimit, plasticLimit);

  return {
    ...(liquidLimit !== null ? { liquidLimit } : {}),
    ...(plasticLimit !== null ? { plasticLimit } : {}),
    ...(shrinkageLimit !== null ? { shrinkageLimit } : {}),
    ...(plasticityIndex !== null ? { plasticityIndex } : {}),
  };
};

export const deriveAtterbergStatus = (dataPoints: number, completedTests: number, totalTests: number): TestStatus => {
  if (dataPoints === 0) return "not-started";
  if (totalTests > 0 && completedTests === totalTests) return "completed";
  return "in-progress";
};

export const buildAtterbergSummaryFields = (results: CalculatedResults, recordCount: number, totalDataPoints: number) => [
  { label: "Avg LL", value: results.liquidLimit !== undefined ? `${results.liquidLimit}%` : "" },
  { label: "Avg PL", value: results.plasticLimit !== undefined ? `${results.plasticLimit}%` : "" },
  { label: "Avg SL", value: results.shrinkageLimit !== undefined ? `${results.shrinkageLimit}%` : "" },
  { label: "Avg PI", value: results.plasticityIndex !== undefined ? `${results.plasticityIndex}%` : "" },
  { label: "Records", value: String(recordCount) },
  { label: "Valid Data Points", value: String(totalDataPoints) },
];

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

// ===== Mass Calculation Helpers (Phase 2) =====

export const calculateMoistureFromMass = (wetMass: number, dryMass: number): number | null => {
  if (!isNumber(wetMass) || !isNumber(dryMass) || dryMass <= 0 || wetMass <= dryMass) {
    return null;
  }
  const waterMass = wetMass - dryMass;
  return round((waterMass / dryMass) * 100);
};

export const validateLiquidLimitTrialMass = (trial: LiquidLimitTrial): boolean => {
  const hasRequiredMass = isFiniteNumber(trial.wetMass) && isFiniteNumber(trial.dryMass);
  if (!hasRequiredMass) return true; // Mass is optional

  const wetMass = Number(trial.wetMass);
  const dryMass = Number(trial.dryMass);
  return dryMass > 0 && wetMass > dryMass;
};

export const validatePlasticLimitTrialMass = (trial: PlasticLimitTrial): boolean => {
  const hasRequiredMass = isFiniteNumber(trial.wetMass) && isFiniteNumber(trial.dryMass);
  if (!hasRequiredMass) return true; // Mass is optional

  const wetMass = Number(trial.wetMass);
  const dryMass = Number(trial.dryMass);
  return dryMass > 0 && wetMass > dryMass;
};

export const validateShrinkageLimitTrialMass = (trial: ShrinkageLimitTrial): boolean => {
  const hasRequiredMass = isFiniteNumber(trial.initialMass) && isFiniteNumber(trial.finalMass) && isFiniteNumber(trial.dryMass);
  if (!hasRequiredMass) return true; // Mass is optional

  const initialMass = Number(trial.initialMass);
  const finalMass = Number(trial.finalMass);
  const dryMass = Number(trial.dryMass);
  return dryMass > 0 && initialMass > 0 && finalMass > 0;
};

export const getAverageMoisture = (trials: (LiquidLimitTrial | PlasticLimitTrial)[]): number | null => {
  const validMoistures = trials
    .map((trial) => Number(trial.moisture))
    .filter(isNumber);

  if (validMoistures.length === 0) return null;
  return round(validMoistures.reduce((sum, m) => sum + m, 0) / validMoistures.length);
};

export const getMassDataSummary = (trials: (LiquidLimitTrial | PlasticLimitTrial)[]): {
  totalWithMass: number;
  totalTrials: number;
} | null => {
  if (trials.length === 0) return null;

  const trialsWithMass = trials.filter((trial) =>
    isFiniteNumber(trial.wetMass) && isFiniteNumber(trial.dryMass)
  );

  return {
    totalWithMass: trialsWithMass.length,
    totalTrials: trials.length,
  };
};

// ===== Linear Shrinkage Calculations (Phase 3) =====

export const isLinearShrinkageTrialValid = (trial: ShrinkageLimitTrial): boolean => {
  const initialLength = Number(trial.initialVolume);
  const finalLength = Number(trial.finalVolume);
  return (
    isFiniteNumber(trial.initialVolume) &&
    isFiniteNumber(trial.finalVolume) &&
    isFiniteNumber(trial.moisture) &&
    initialLength > 0 &&
    finalLength > 0 &&
    finalLength <= initialLength
  );
};

export const calculateLinearShrinkage = (trials: ShrinkageLimitTrial[]): number | null => {
  const validTrials = trials.filter(isLinearShrinkageTrialValid);
  if (validTrials.length === 0) return null;

  const shrinkages = validTrials.map((trial) => {
    const initialLength = Number(trial.initialVolume);
    const finalLength = Number(trial.finalVolume);
    return ((initialLength - finalLength) / initialLength) * 100;
  });

  const average = shrinkages.reduce((sum, s) => sum + s, 0) / shrinkages.length;
  return round(average);
};

export const getValidLinearShrinkageTrials = (trials: ShrinkageLimitTrial[]) =>
  trials
    .filter(isLinearShrinkageTrialValid)
    .map((trial) => ({
      initialLength: Number(trial.initialVolume),
      finalLength: Number(trial.finalVolume),
      moisture: Number(trial.moisture),
      trialNo: trial.trialNo,
    }));

// ===== Volumetric Shrinkage (Original) (Phase 3) =====

export const isVolumetricShrinkageTrialValid = (trial: ShrinkageLimitTrial): boolean => {
  return isShrinkageLimitTrialValid(trial);
};

export const calculateVolumetricShrinkage = (trials: ShrinkageLimitTrial[]): number | null => {
  const validTrials = trials.filter(isVolumetricShrinkageTrialValid);
  if (validTrials.length === 0) return null;

  const shrinkages = validTrials.map((trial) => {
    const initialVolume = Number(trial.initialVolume);
    const finalVolume = Number(trial.finalVolume);
    return ((initialVolume - finalVolume) / initialVolume) * 100;
  });

  const average = shrinkages.reduce((sum, s) => sum + s, 0) / shrinkages.length;
  return round(average);
};
