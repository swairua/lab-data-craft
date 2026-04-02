import { describe, it, expect } from "vitest";
import {
  isLinearShrinkageTrialValid,
  isVolumetricShrinkageTrialValid,
  calculateLinearShrinkage,
  calculateVolumetricShrinkage,
  getValidLinearShrinkageTrials,
} from "@/lib/atterbergCalculations";
import type { ShrinkageLimitTrial } from "@/context/TestDataContext";

describe("Linear Shrinkage Calculations", () => {
  describe("isLinearShrinkageTrialValid", () => {
    it("should validate trial with all required fields", () => {
      const trial: ShrinkageLimitTrial = {
        id: "test",
        trialNo: "1",
        initialVolume: "100",
        finalVolume: "95",
        moisture: "18",
      };
      expect(isLinearShrinkageTrialValid(trial)).toBe(true);
    });

    it("should reject trial with missing initialVolume", () => {
      const trial: ShrinkageLimitTrial = {
        id: "test",
        trialNo: "1",
        initialVolume: "",
        finalVolume: "95",
        moisture: "18",
      };
      expect(isLinearShrinkageTrialValid(trial)).toBe(false);
    });

    it("should reject trial with finalVolume greater than initialVolume", () => {
      const trial: ShrinkageLimitTrial = {
        id: "test",
        trialNo: "1",
        initialVolume: "95",
        finalVolume: "100",
        moisture: "18",
      };
      expect(isLinearShrinkageTrialValid(trial)).toBe(false);
    });

    it("should reject trial with zero or negative initialVolume", () => {
      const trial: ShrinkageLimitTrial = {
        id: "test",
        trialNo: "1",
        initialVolume: "0",
        finalVolume: "0",
        moisture: "18",
      };
      expect(isLinearShrinkageTrialValid(trial)).toBe(false);
    });

    it("should accept trial with equal initial and final volume (0% shrinkage)", () => {
      const trial: ShrinkageLimitTrial = {
        id: "test",
        trialNo: "1",
        initialVolume: "100",
        finalVolume: "100",
        moisture: "18",
      };
      expect(isLinearShrinkageTrialValid(trial)).toBe(true);
    });
  });

  describe("calculateLinearShrinkage", () => {
    it("should calculate single trial linear shrinkage", () => {
      const trials: ShrinkageLimitTrial[] = [
        {
          id: "1",
          trialNo: "1",
          initialVolume: "100",
          finalVolume: "90",
          moisture: "18",
        },
      ];
      const result = calculateLinearShrinkage(trials);
      expect(result).toBe(10); // (100-90)/100*100 = 10%
    });

    it("should calculate average of multiple trials", () => {
      const trials: ShrinkageLimitTrial[] = [
        {
          id: "1",
          trialNo: "1",
          initialVolume: "100",
          finalVolume: "90",
          moisture: "18",
        },
        {
          id: "2",
          trialNo: "2",
          initialVolume: "100",
          finalVolume: "85",
          moisture: "17",
        },
        {
          id: "3",
          trialNo: "3",
          initialVolume: "100",
          finalVolume: "80",
          moisture: "19",
        },
      ];
      const result = calculateLinearShrinkage(trials);
      expect(result).toBe(15); // (10 + 15 + 20) / 3 = 15%
    });

    it("should ignore incomplete trials", () => {
      const trials: ShrinkageLimitTrial[] = [
        {
          id: "1",
          trialNo: "1",
          initialVolume: "100",
          finalVolume: "90",
          moisture: "18",
        },
        {
          id: "2",
          trialNo: "2",
          initialVolume: "",
          finalVolume: "85",
          moisture: "17",
        },
      ];
      const result = calculateLinearShrinkage(trials);
      expect(result).toBe(10); // Only first trial is valid
    });

    it("should return null for no valid trials", () => {
      const trials: ShrinkageLimitTrial[] = [
        {
          id: "1",
          trialNo: "1",
          initialVolume: "",
          finalVolume: "",
          moisture: "",
        },
      ];
      const result = calculateLinearShrinkage(trials);
      expect(result).toBeNull();
    });

    it("should round result to 2 decimal places", () => {
      const trials: ShrinkageLimitTrial[] = [
        {
          id: "1",
          trialNo: "1",
          initialVolume: "100.5",
          finalVolume: "91.666",
          moisture: "18",
        },
      ];
      const result = calculateLinearShrinkage(trials);
      expect(result).toBe(8.84); // (100.5-91.666)/100.5*100 = 8.837...
    });
  });

  describe("getValidLinearShrinkageTrials", () => {
    it("should return only valid trials with computed values", () => {
      const trials: ShrinkageLimitTrial[] = [
        {
          id: "1",
          trialNo: "1",
          initialVolume: "100",
          finalVolume: "90",
          moisture: "18",
        },
        {
          id: "2",
          trialNo: "2",
          initialVolume: "",
          finalVolume: "85",
          moisture: "17",
        },
      ];
      const valid = getValidLinearShrinkageTrials(trials);
      expect(valid).toHaveLength(1);
      expect(valid[0].initialLength).toBe(100);
      expect(valid[0].finalLength).toBe(90);
      expect(valid[0].moisture).toBe(18);
    });

    it("should compute correct shrinkage percentage", () => {
      const trials: ShrinkageLimitTrial[] = [
        {
          id: "1",
          trialNo: "1",
          initialVolume: "50",
          finalVolume: "45",
          moisture: "20",
        },
      ];
      const valid = getValidLinearShrinkageTrials(trials);
      expect(valid[0].initialLength).toBe(50);
      expect(valid[0].finalLength).toBe(45);
    });
  });
});

describe("Volumetric Shrinkage Calculations", () => {
  describe("isVolumetricShrinkageTrialValid", () => {
    it("should validate trial with all required fields", () => {
      const trial: ShrinkageLimitTrial = {
        id: "test",
        trialNo: "1",
        initialVolume: "50",
        finalVolume: "45",
        moisture: "18",
      };
      expect(isVolumetricShrinkageTrialValid(trial)).toBe(true);
    });

    it("should reject trial with missing fields", () => {
      const trial: ShrinkageLimitTrial = {
        id: "test",
        trialNo: "1",
        initialVolume: "50",
        finalVolume: "",
        moisture: "18",
      };
      expect(isVolumetricShrinkageTrialValid(trial)).toBe(false);
    });

    it("should reject trial with finalVolume > initialVolume", () => {
      const trial: ShrinkageLimitTrial = {
        id: "test",
        trialNo: "1",
        initialVolume: "45",
        finalVolume: "50",
        moisture: "18",
      };
      expect(isVolumetricShrinkageTrialValid(trial)).toBe(false);
    });
  });

  describe("calculateVolumetricShrinkage", () => {
    it("should calculate single trial volumetric shrinkage", () => {
      const trials: ShrinkageLimitTrial[] = [
        {
          id: "1",
          trialNo: "1",
          initialVolume: "50",
          finalVolume: "40",
          moisture: "18",
        },
      ];
      const result = calculateVolumetricShrinkage(trials);
      expect(result).toBe(20); // (50-40)/50*100 = 20%
    });

    it("should calculate average of multiple trials", () => {
      const trials: ShrinkageLimitTrial[] = [
        {
          id: "1",
          trialNo: "1",
          initialVolume: "50",
          finalVolume: "40",
          moisture: "18",
        },
        {
          id: "2",
          trialNo: "2",
          initialVolume: "50",
          finalVolume: "35",
          moisture: "17",
        },
      ];
      const result = calculateVolumetricShrinkage(trials);
      expect(result).toBe(25); // (20 + 30) / 2 = 25%
    });

    it("should return null for empty trials", () => {
      const trials: ShrinkageLimitTrial[] = [];
      const result = calculateVolumetricShrinkage(trials);
      expect(result).toBeNull();
    });
  });
});

describe("Sample Data from PDF References", () => {
  it("should calculate linear shrinkage for typical soil sample", () => {
    // Example: Sample with three trials
    const trials: ShrinkageLimitTrial[] = [
      {
        id: "1",
        trialNo: "1",
        initialVolume: "115",
        finalVolume: "105",
        moisture: "22.5",
      },
      {
        id: "2",
        trialNo: "2",
        initialVolume: "115",
        finalVolume: "106",
        moisture: "22.0",
      },
      {
        id: "3",
        trialNo: "3",
        initialVolume: "115",
        finalVolume: "107",
        moisture: "23.0",
      },
    ];
    
    const result = calculateLinearShrinkage(trials);
    // Expected: (10/115 + 9/115 + 8/115) / 3 * 100 = 8.7%
    expect(result).toBe(8.7);
  });

  it("should handle high shrinkage samples", () => {
    const trials: ShrinkageLimitTrial[] = [
      {
        id: "1",
        trialNo: "1",
        initialVolume: "100",
        finalVolume: "50",
        moisture: "35",
      },
    ];
    
    const result = calculateLinearShrinkage(trials);
    expect(result).toBe(50); // 50% shrinkage
  });

  it("should handle low shrinkage samples", () => {
    const trials: ShrinkageLimitTrial[] = [
      {
        id: "1",
        trialNo: "1",
        initialVolume: "100",
        finalVolume: "99",
        moisture: "10",
      },
    ];
    
    const result = calculateLinearShrinkage(trials);
    expect(result).toBe(1); // 1% shrinkage
  });

  it("should handle zero shrinkage (non-plastic or stable soil)", () => {
    const trials: ShrinkageLimitTrial[] = [
      {
        id: "1",
        trialNo: "1",
        initialVolume: "100",
        finalVolume: "100",
        moisture: "8",
      },
    ];
    
    const result = calculateLinearShrinkage(trials);
    expect(result).toBe(0); // 0% shrinkage
  });
});

describe("Dual Method Compatibility", () => {
  it("should differentiate between linear and volumetric methods", () => {
    const trials: ShrinkageLimitTrial[] = [
      {
        id: "1",
        trialNo: "1",
        initialVolume: "100",
        finalVolume: "80",
        moisture: "20",
      },
    ];
    
    const linear = calculateLinearShrinkage(trials);
    const volumetric = calculateVolumetricShrinkage(trials);
    
    // Both should give same result for single dimension measurement
    expect(linear).toBe(20);
    expect(volumetric).toBe(20);
  });

  it("should maintain trial data for both methods", () => {
    const trials: ShrinkageLimitTrial[] = [
      {
        id: "1",
        trialNo: "1",
        initialVolume: "115",
        finalVolume: "110",
        moisture: "22",
      },
    ];
    
    const validLinear = getValidLinearShrinkageTrials(trials);
    expect(validLinear).toHaveLength(1);
    expect(validLinear[0]).toHaveProperty("initialLength");
    expect(validLinear[0]).toHaveProperty("finalLength");
    expect(validLinear[0]).toHaveProperty("moisture");
  });
});
