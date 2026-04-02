import { describe, it, expect } from "vitest";
import {
  calculateMoistureFromMass,
  validateLiquidLimitTrialMass,
  validatePlasticLimitTrialMass,
  validateShrinkageLimitTrialMass,
  getAverageMoisture,
  getMassDataSummary,
} from "@/lib/atterbergCalculations";
import type { LiquidLimitTrial, PlasticLimitTrial, ShrinkageLimitTrial } from "@/context/TestDataContext";

describe("Mass Calculation Helpers", () => {
  describe("calculateMoistureFromMass", () => {
    it("should calculate moisture content from wet and dry mass", () => {
      const moisture = calculateMoistureFromMass(25.5, 20.0);
      expect(moisture).toBe(27.5); // (25.5 - 20.0) / 20.0 * 100 = 27.5%
    });

    it("should return null for equal wet and dry mass", () => {
      const moisture = calculateMoistureFromMass(20.0, 20.0);
      expect(moisture).toBeNull();
    });

    it("should return null for wet mass less than dry mass", () => {
      const moisture = calculateMoistureFromMass(15.0, 20.0);
      expect(moisture).toBeNull();
    });

    it("should return null for zero or negative dry mass", () => {
      expect(calculateMoistureFromMass(20.0, 0)).toBeNull();
      expect(calculateMoistureFromMass(20.0, -5.0)).toBeNull();
    });

    it("should round result to 2 decimal places", () => {
      const moisture = calculateMoistureFromMass(25.456, 20.123);
      expect(moisture).toBe(26.4); // Rounded to 2 decimals
    });

    it("should handle very small moisture contents", () => {
      const moisture = calculateMoistureFromMass(20.1, 20.0);
      expect(moisture).toBe(0.5);
    });
  });
});

describe("Trial Mass Validation", () => {
  describe("validateLiquidLimitTrialMass", () => {
    it("should accept trial with valid mass values", () => {
      const trial: LiquidLimitTrial = {
        id: "test",
        trialNo: "1",
        blows: "25",
        moisture: "35",
        wetMass: "25.5",
        dryMass: "20.0",
      };
      expect(validateLiquidLimitTrialMass(trial)).toBe(true);
    });

    it("should accept trial without mass values", () => {
      const trial: LiquidLimitTrial = {
        id: "test",
        trialNo: "1",
        blows: "25",
        moisture: "35",
      };
      expect(validateLiquidLimitTrialMass(trial)).toBe(true);
    });

    it("should reject trial with wet mass less than dry mass", () => {
      const trial: LiquidLimitTrial = {
        id: "test",
        trialNo: "1",
        blows: "25",
        moisture: "35",
        wetMass: "15.0",
        dryMass: "20.0",
      };
      expect(validateLiquidLimitTrialMass(trial)).toBe(false);
    });

    it("should reject trial with zero dry mass", () => {
      const trial: LiquidLimitTrial = {
        id: "test",
        trialNo: "1",
        blows: "25",
        moisture: "35",
        wetMass: "20.0",
        dryMass: "0",
      };
      expect(validateLiquidLimitTrialMass(trial)).toBe(false);
    });

    it("should accept trial with only one mass field", () => {
      const trial: LiquidLimitTrial = {
        id: "test",
        trialNo: "1",
        blows: "25",
        moisture: "35",
        cupMass: "10.0",
      };
      expect(validateLiquidLimitTrialMass(trial)).toBe(true);
    });
  });

  describe("validatePlasticLimitTrialMass", () => {
    it("should accept trial with valid mass values", () => {
      const trial: PlasticLimitTrial = {
        id: "test",
        trialNo: "1",
        moisture: "25",
        wetMass: "22.5",
        dryMass: "20.0",
      };
      expect(validatePlasticLimitTrialMass(trial)).toBe(true);
    });

    it("should accept trial without mass values", () => {
      const trial: PlasticLimitTrial = {
        id: "test",
        trialNo: "1",
        moisture: "25",
      };
      expect(validatePlasticLimitTrialMass(trial)).toBe(true);
    });

    it("should reject trial with invalid mass relationship", () => {
      const trial: PlasticLimitTrial = {
        id: "test",
        trialNo: "1",
        moisture: "25",
        wetMass: "18.0",
        dryMass: "20.0",
      };
      expect(validatePlasticLimitTrialMass(trial)).toBe(false);
    });
  });

  describe("validateShrinkageLimitTrialMass", () => {
    it("should accept trial with valid mass values", () => {
      const trial: ShrinkageLimitTrial = {
        id: "test",
        trialNo: "1",
        initialVolume: "20",
        finalVolume: "18",
        moisture: "15",
        initialMass: "50.0",
        finalMass: "45.0",
        dryMass: "40.0",
      };
      expect(validateShrinkageLimitTrialMass(trial)).toBe(true);
    });

    it("should accept trial without mass values", () => {
      const trial: ShrinkageLimitTrial = {
        id: "test",
        trialNo: "1",
        initialVolume: "20",
        finalVolume: "18",
        moisture: "15",
      };
      expect(validateShrinkageLimitTrialMass(trial)).toBe(true);
    });

    it("should reject trial with zero masses", () => {
      const trial: ShrinkageLimitTrial = {
        id: "test",
        trialNo: "1",
        initialVolume: "20",
        finalVolume: "18",
        moisture: "15",
        initialMass: "0",
        finalMass: "45.0",
        dryMass: "40.0",
      };
      expect(validateShrinkageLimitTrialMass(trial)).toBe(false);
    });
  });
});

describe("Moisture Statistics", () => {
  describe("getAverageMoisture", () => {
    it("should calculate average moisture from trials", () => {
      const trials: LiquidLimitTrial[] = [
        { id: "1", trialNo: "1", blows: "25", moisture: "30" },
        { id: "2", trialNo: "2", blows: "20", moisture: "32" },
        { id: "3", trialNo: "3", blows: "15", moisture: "34" },
      ];
      const avg = getAverageMoisture(trials);
      expect(avg).toBe(32); // (30 + 32 + 34) / 3 = 32
    });

    it("should return null for empty trials", () => {
      const avg = getAverageMoisture([]);
      expect(avg).toBeNull();
    });

    it("should handle mixed trial types", () => {
      const trials: (LiquidLimitTrial | PlasticLimitTrial)[] = [
        { id: "1", trialNo: "1", blows: "25", moisture: "28" } as LiquidLimitTrial,
        { id: "2", trialNo: "2", moisture: "26" } as PlasticLimitTrial,
      ];
      const avg = getAverageMoisture(trials);
      expect(avg).toBe(27); // (28 + 26) / 2 = 27
    });

    it("should round to 2 decimal places", () => {
      const trials: LiquidLimitTrial[] = [
        { id: "1", trialNo: "1", blows: "25", moisture: "30.11" },
        { id: "2", trialNo: "2", blows: "20", moisture: "30.22" },
      ];
      const avg = getAverageMoisture(trials);
      expect(avg).toBe(30.17); // (30.11 + 30.22) / 2 = 30.165, rounded to 30.17
    });
  });

  describe("getMassDataSummary", () => {
    it("should count trials with mass data", () => {
      const trials: LiquidLimitTrial[] = [
        { id: "1", trialNo: "1", blows: "25", moisture: "30", wetMass: "25", dryMass: "20" },
        { id: "2", trialNo: "2", blows: "20", moisture: "32" },
        { id: "3", trialNo: "3", blows: "15", moisture: "34", wetMass: "22", dryMass: "19" },
      ];
      const summary = getMassDataSummary(trials);
      expect(summary?.totalWithMass).toBe(2);
      expect(summary?.totalTrials).toBe(3);
    });

    it("should return null for empty trials", () => {
      const summary = getMassDataSummary([]);
      expect(summary).toBeNull();
    });

    it("should count trials with all mass fields present", () => {
      const trials: PlasticLimitTrial[] = [
        { id: "1", trialNo: "1", moisture: "25", wetMass: "22", dryMass: "20" },
        { id: "2", trialNo: "2", moisture: "26", wetMass: "23", dryMass: "21" },
        { id: "3", trialNo: "3", moisture: "27", cupMass: "10" }, // Only cup mass
      ];
      const summary = getMassDataSummary(trials);
      expect(summary?.totalWithMass).toBe(2); // Only first two have both wet and dry
      expect(summary?.totalTrials).toBe(3);
    });
  });
});

describe("Mass Field Optional Metadata", () => {
  it("should not require mass fields on liquid limit trials", () => {
    const trial: LiquidLimitTrial = {
      id: "test",
      trialNo: "1",
      blows: "25",
      moisture: "35",
    };
    expect(trial.cupMass).toBeUndefined();
    expect(trial.wetMass).toBeUndefined();
    expect(trial.dryMass).toBeUndefined();
  });

  it("should accept partial mass field data", () => {
    const trial: LiquidLimitTrial = {
      id: "test",
      trialNo: "1",
      blows: "25",
      moisture: "35",
      cupMass: "10.5",
    };
    expect(trial.cupMass).toBe("10.5");
    expect(trial.wetMass).toBeUndefined();
    expect(trial.dryMass).toBeUndefined();
  });

  it("should allow all mass fields on shrinkage limit trials", () => {
    const trial: ShrinkageLimitTrial = {
      id: "test",
      trialNo: "1",
      initialVolume: "20",
      finalVolume: "18",
      moisture: "15",
      initialMass: "50",
      finalMass: "45",
      dryMass: "40",
    };
    expect(trial.initialMass).toBe("50");
    expect(trial.finalMass).toBe("45");
    expect(trial.dryMass).toBe("40");
  });
});
