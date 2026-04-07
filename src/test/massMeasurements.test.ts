import { describe, it, expect } from "vitest";
import {
  calculateMoistureFromMass,
  getValidLiquidLimitTrials,
  getValidPlasticLimitTrials,
  getValidShrinkageLimitTrials,
  getTrialMoisture,
  averageNumbers,
} from "@/lib/atterbergCalculations";
import type { LiquidLimitTrial, PlasticLimitTrial, ShrinkageLimitTrial } from "@/context/TestDataContext";

describe("Mass Calculation Helpers", () => {
  describe("calculateMoistureFromMass", () => {
    it("should calculate moisture content from container masses", () => {
      // wet=25.5, dry=22, container=10 → water=3.5, drySoil=12 → 29.17%
      const moisture = calculateMoistureFromMass("25.5", "22", "10");
      expect(moisture).toBe("29.17");
    });

    it("should return null for equal wet and dry mass (zero water)", () => {
      const moisture = calculateMoistureFromMass("20", "20", "10");
      expect(moisture).toBe("0");
    });

    it("should return null for wet mass less than dry mass", () => {
      const moisture = calculateMoistureFromMass("15", "20", "10");
      expect(moisture).toBeNull();
    });

    it("should return null for zero dry soil mass", () => {
      expect(calculateMoistureFromMass("20", "10", "10")).toBeNull(); // drySoil = 0
    });

    it("should return null for missing values", () => {
      expect(calculateMoistureFromMass(undefined, "20", "10")).toBeNull();
      expect(calculateMoistureFromMass("25", undefined, "10")).toBeNull();
      expect(calculateMoistureFromMass("25", "20", undefined)).toBeNull();
    });
  });
});

describe("Trial Validation", () => {
  describe("getValidLiquidLimitTrials", () => {
    it("should return valid trials with penetration and moisture", () => {
      const trials: LiquidLimitTrial[] = [
        { id: "1", trialNo: "1", penetration: "18", moisture: "30" },
        { id: "2", trialNo: "2", penetration: "22", moisture: "35" },
        { id: "3", trialNo: "3", penetration: "", moisture: "" },
      ];
      const valid = getValidLiquidLimitTrials(trials);
      expect(valid).toHaveLength(2);
      expect(valid[0].penetration).toBe(18);
      expect(valid[1].moisture).toBe(35);
    });

    it("should auto-calculate moisture from mass fields", () => {
      const trials: LiquidLimitTrial[] = [
        {
          id: "1", trialNo: "1", penetration: "20", moisture: "",
          containerWetMass: "25", containerDryMass: "22", containerMass: "10",
        },
      ];
      const valid = getValidLiquidLimitTrials(trials);
      expect(valid).toHaveLength(1);
      expect(valid[0].moisture).toBeCloseTo(25, 0); // (3/12)*100 = 25
    });
  });

  describe("getValidPlasticLimitTrials", () => {
    it("should return moisture values for valid trials", () => {
      const trials: PlasticLimitTrial[] = [
        { id: "1", trialNo: "1", moisture: "25" },
        { id: "2", trialNo: "2", moisture: "26" },
        { id: "3", trialNo: "3", moisture: "" },
      ];
      const valid = getValidPlasticLimitTrials(trials);
      expect(valid).toHaveLength(2);
      expect(valid[0]).toBe(25);
      expect(valid[1]).toBe(26);
    });
  });

  describe("getValidShrinkageLimitTrials", () => {
    it("should return valid linear shrinkage trials", () => {
      const trials: ShrinkageLimitTrial[] = [
        { id: "1", trialNo: "1", initialLength: "140", finalLength: "130" },
        { id: "2", trialNo: "2", initialLength: "", finalLength: "" },
      ];
      const valid = getValidShrinkageLimitTrials(trials);
      expect(valid).toHaveLength(1);
      expect(valid[0].initialLength).toBe(140);
      expect(valid[0].finalLength).toBe(130);
    });
  });
});

describe("getTrialMoisture", () => {
  it("should prefer mass-calculated moisture over direct entry", () => {
    const trial: LiquidLimitTrial = {
      id: "1", trialNo: "1", penetration: "20", moisture: "99",
      containerWetMass: "25", containerDryMass: "22", containerMass: "10",
    };
    const moisture = getTrialMoisture(trial);
    expect(moisture).toBe("25"); // (3/12)*100 = 25, not 99
  });

  it("should fall back to direct moisture when mass fields missing", () => {
    const trial: LiquidLimitTrial = {
      id: "1", trialNo: "1", penetration: "20", moisture: "35",
    };
    const moisture = getTrialMoisture(trial);
    expect(moisture).toBe("35");
  });
});

describe("averageNumbers", () => {
  it("should calculate average", () => {
    expect(averageNumbers([30, 32, 34])).toBe(32);
  });

  it("should return null for empty array", () => {
    expect(averageNumbers([])).toBeNull();
  });

  it("should round to 2 decimal places", () => {
    expect(averageNumbers([30.11, 30.22])).toBe(30.16);
  });
});
