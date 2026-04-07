import { describe, it, expect } from "vitest";
import {
  isLinearShrinkageTrialValid,
  calculateLinearShrinkage,
  getValidLinearShrinkageTrials,
  isShrinkageLimitTrialValid,
} from "@/lib/atterbergCalculations";
import type { ShrinkageLimitTrial } from "@/context/TestDataContext";

describe("Linear Shrinkage Validation", () => {
  describe("isShrinkageLimitTrialValid / isLinearShrinkageTrialValid", () => {
    it("should validate trial with all required fields", () => {
      const trial: ShrinkageLimitTrial = {
        id: "test", trialNo: "1", initialLength: "140", finalLength: "130",
      };
      expect(isShrinkageLimitTrialValid(trial)).toBe(true);
      expect(isLinearShrinkageTrialValid(trial)).toBe(true);
    });

    it("should reject trial with missing initialLength", () => {
      const trial: ShrinkageLimitTrial = {
        id: "test", trialNo: "1", initialLength: "", finalLength: "130",
      };
      expect(isLinearShrinkageTrialValid(trial)).toBe(false);
    });

    it("should reject trial with finalLength greater than initialLength", () => {
      const trial: ShrinkageLimitTrial = {
        id: "test", trialNo: "1", initialLength: "130", finalLength: "140",
      };
      expect(isLinearShrinkageTrialValid(trial)).toBe(false);
    });

    it("should reject trial with zero initialLength", () => {
      const trial: ShrinkageLimitTrial = {
        id: "test", trialNo: "1", initialLength: "0", finalLength: "0",
      };
      expect(isLinearShrinkageTrialValid(trial)).toBe(false);
    });

    it("should accept trial with equal initial and final length (0% shrinkage)", () => {
      const trial: ShrinkageLimitTrial = {
        id: "test", trialNo: "1", initialLength: "140", finalLength: "140",
      };
      expect(isLinearShrinkageTrialValid(trial)).toBe(true);
    });
  });
});

describe("Linear Shrinkage Calculations", () => {
  describe("calculateLinearShrinkage", () => {
    it("should calculate single trial linear shrinkage", () => {
      const trials: ShrinkageLimitTrial[] = [
        { id: "1", trialNo: "1", initialLength: "140", finalLength: "126" },
      ];
      const result = calculateLinearShrinkage(trials);
      expect(result).toBe(10); // (140-126)/140*100 = 10%
    });

    it("should calculate average of multiple trials", () => {
      const trials: ShrinkageLimitTrial[] = [
        { id: "1", trialNo: "1", initialLength: "140", finalLength: "126" },
        { id: "2", trialNo: "2", initialLength: "140", finalLength: "119" },
        { id: "3", trialNo: "3", initialLength: "140", finalLength: "112" },
      ];
      const result = calculateLinearShrinkage(trials);
      expect(result).toBe(15); // (10 + 15 + 20) / 3 = 15%
    });

    it("should ignore incomplete trials", () => {
      const trials: ShrinkageLimitTrial[] = [
        { id: "1", trialNo: "1", initialLength: "140", finalLength: "126" },
        { id: "2", trialNo: "2", initialLength: "", finalLength: "130" },
      ];
      const result = calculateLinearShrinkage(trials);
      expect(result).toBe(10);
    });

    it("should return null for no valid trials", () => {
      const trials: ShrinkageLimitTrial[] = [
        { id: "1", trialNo: "1", initialLength: "", finalLength: "" },
      ];
      expect(calculateLinearShrinkage(trials)).toBeNull();
    });

    it("should handle zero shrinkage", () => {
      const trials: ShrinkageLimitTrial[] = [
        { id: "1", trialNo: "1", initialLength: "140", finalLength: "140" },
      ];
      expect(calculateLinearShrinkage(trials)).toBe(0);
    });
  });

  describe("getValidLinearShrinkageTrials", () => {
    it("should return only valid trials with computed values", () => {
      const trials: ShrinkageLimitTrial[] = [
        { id: "1", trialNo: "1", initialLength: "140", finalLength: "130" },
        { id: "2", trialNo: "2", initialLength: "", finalLength: "130" },
      ];
      const valid = getValidLinearShrinkageTrials(trials);
      expect(valid).toHaveLength(1);
      expect(valid[0].initialLength).toBe(140);
      expect(valid[0].finalLength).toBe(130);
    });
  });
});

describe("Sample Data from BS 1377", () => {
  it("should calculate linear shrinkage for typical soil sample", () => {
    const trials: ShrinkageLimitTrial[] = [
      { id: "1", trialNo: "1", initialLength: "140", finalLength: "127.83" },
      { id: "2", trialNo: "2", initialLength: "140", finalLength: "128.40" },
      { id: "3", trialNo: "3", initialLength: "140", finalLength: "128.80" },
    ];
    const result = calculateLinearShrinkage(trials);
    expect(result).not.toBeNull();
    expect(result!).toBeGreaterThan(7);
    expect(result!).toBeLessThan(9);
  });

  it("should handle high shrinkage samples", () => {
    const trials: ShrinkageLimitTrial[] = [
      { id: "1", trialNo: "1", initialLength: "140", finalLength: "70" },
    ];
    expect(calculateLinearShrinkage(trials)).toBe(50);
  });
});
