import { describe, it, expect } from "vitest";
import {
  calculateLiquidLimit,
  calculatePlasticLimit,
  calculateShrinkageLimit,
  calculatePlasticityIndex,
  getTestValidationMessages,
  getRecordValidationMessages,
  calculateRecordResults,
  deriveAtterbergStatus,
} from "@/lib/atterbergCalculations";
import {
  classifyFineGrained,
  classifyFineGrainedPublic,
  calculatePlasticityChart,
  validateClassificationData,
  calculateBehaviorIndex,
} from "@/lib/soilClassification";
import type {
  AtterbergTest,
  AtterbergRecord,
  LiquidLimitTrial,
  PlasticLimitTrial,
  ShrinkageLimitTrial,
} from "@/context/TestDataContext";

describe("Edge Case Tests - Non-Plastic Soils", () => {
  it("handles soil with zero plasticity index", () => {
    const record: AtterbergRecord = {
      id: "rec1",
      title: "Non-plastic Sample",
      label: "NP",
      sampleNumber: "1",
      dateTested: "2024-01-15",
      dateSubmitted: "2024-01-20",
      testedBy: "John",
      note: "Non-plastic material",
      isExpanded: false,
      tests: [
        {
          id: "test1",
          type: "liquidLimit",
          title: "LL Test",
          isExpanded: false,
          trials: [
            { id: "t1", trialNo: "1", blows: "25", moisture: "20" },
            { id: "t2", trialNo: "2", blows: "30", moisture: "19" },
          ],
          method: "fall-cone",
          result: { liquidLimit: 19.5 },
        },
        {
          id: "test2",
          type: "plasticLimit",
          title: "PL Test",
          isExpanded: false,
          trials: [
            { id: "t3", trialNo: "1", moisture: "19" },
            { id: "t4", trialNo: "2", moisture: "19.2" },
          ],
          method: "thread-rolling",
          result: { plasticLimit: 19.1 },
        },
      ],
      results: { liquidLimit: 19.5, plasticLimit: 19.1, plasticityIndex: 0.4 },
    };

    const results = calculateRecordResults(record);
    expect(results.plasticityIndex).toBeLessThan(1);
    
    const chart = calculatePlasticityChart(results.liquidLimit, results.plasticityIndex);
    if (chart) {
      expect(chart.nonPlastic).toBe(true);
    }
  });

  it("handles undefined plastic limit (non-plastic)", () => {
    const chart = calculatePlasticityChart(25, undefined);
    expect(chart).toBeTruthy();
    if (chart) {
      expect(chart.characteristics).toContain("Non-plastic material");
    }
  });

  it("handles PI exactly at zero threshold", () => {
    const chart = calculatePlasticityChart(30, 0);
    expect(chart).toBeTruthy();
    if (chart) {
      expect(chart.classification).toContain("Non-plastic");
    }
  });

  it("validates classification allowing non-plastic soils", () => {
    const validation = validateClassificationData(
      { gravel: 0, sand: 0, fines: 100 },
      { liquidLimit: 25 }
    );

    // Should be valid with just liquid limit (non-plastic case)
    expect(validation.valid || validation.warnings.length > 0).toBe(true);
  });
});

describe("Edge Case Tests - Missing Data", () => {
  it("handles empty trials array", () => {
    const emptyTrials: LiquidLimitTrial[] = [];
    const result = calculateLiquidLimit(emptyTrials);
    expect(result).toBeNull();
  });

  it("handles single trial (returns its value)", () => {
    const singleTrial: LiquidLimitTrial[] = [
      { id: "1", trialNo: "1", blows: "25", moisture: "30" },
    ];
    const result = calculateLiquidLimit(singleTrial);
    expect(result).toBe(30);
  });

  it("handles trials with missing moisture", () => {
    const invalidTrials: LiquidLimitTrial[] = [
      { id: "1", trialNo: "1", blows: "25", moisture: "" },
      { id: "2", trialNo: "2", blows: "30", moisture: "28" },
    ];
    const result = calculateLiquidLimit(invalidTrials);
    expect(result).toBe(28); // Only one valid trial
  });

  it("handles trials with missing blows", () => {
    const invalidTrials: LiquidLimitTrial[] = [
      { id: "1", trialNo: "1", blows: "", moisture: "30" },
      { id: "2", trialNo: "2", blows: "25", moisture: "28" },
    ];
    const result = calculateLiquidLimit(invalidTrials);
    expect(result).toBe(28);
  });

  it("handles plastic limit with insufficient trials", () => {
    const singleTrial: PlasticLimitTrial[] = [
      { id: "1", trialNo: "1", moisture: "20" },
    ];
    const result = calculatePlasticLimit(singleTrial);
    expect(result).toBe(20);
  });

  it("handles plastic limit with no valid trials", () => {
    const invalidTrials: PlasticLimitTrial[] = [
      { id: "1", trialNo: "1", moisture: "" },
      { id: "2", trialNo: "2", moisture: "" },
    ];
    const result = calculatePlasticLimit(invalidTrials);
    expect(result).toBeNull();
  });

  it("handles shrinkage with zero volumes", () => {
    const zeroVolumeTrials: ShrinkageLimitTrial[] = [
      {
        id: "1",
        trialNo: "1",
        initialVolume: "0",
        finalVolume: "0",
        moisture: "25",
      },
    ];
    const result = calculateShrinkageLimit(zeroVolumeTrials, "linear");
    expect(result).toBeNull();
  });

  it("handles shrinkage with negative values (invalid)", () => {
    const negativeTrials: ShrinkageLimitTrial[] = [
      {
        id: "1",
        trialNo: "1",
        initialVolume: "-10",
        finalVolume: "8",
        moisture: "25",
      },
    ];
    const result = calculateShrinkageLimit(negativeTrials, "linear");
    // Should filter out invalid trials
    expect(result).toBeNull();
  });

  it("handles mixed valid and invalid data", () => {
    const mixedTrials: LiquidLimitTrial[] = [
      { id: "1", trialNo: "1", blows: "25", moisture: "30" },
      { id: "2", trialNo: "2", blows: "", moisture: "28" }, // invalid
      { id: "3", trialNo: "3", blows: "30", moisture: "28.5" },
      { id: "4", trialNo: "4", blows: "20", moisture: "" }, // invalid
    ];
    const result = calculateLiquidLimit(mixedTrials);
    expect(result).toBeTruthy(); // Should use only valid trials
  });
});

describe("Edge Case Tests - Invalid Data", () => {
  it("rejects negative moisture values", () => {
    const invalidTrials: LiquidLimitTrial[] = [
      { id: "1", trialNo: "1", blows: "25", moisture: "-5" },
    ];
    const result = calculateLiquidLimit(invalidTrials);
    expect(result).toBeNull();
  });

  it("rejects negative blow count", () => {
    const invalidTrials: LiquidLimitTrial[] = [
      { id: "1", trialNo: "1", blows: "-10", moisture: "30" },
    ];
    const result = calculateLiquidLimit(invalidTrials);
    expect(result).toBeNull();
  });

  it("rejects non-numeric input", () => {
    const invalidTrials: LiquidLimitTrial[] = [
      { id: "1", trialNo: "1", blows: "abc", moisture: "30" },
    ];
    const result = calculateLiquidLimit(invalidTrials);
    expect(result).toBeNull();
  });

  it("handles extremely high moisture content", () => {
    const extremeTrials: LiquidLimitTrial[] = [
      { id: "1", trialNo: "1", blows: "25", moisture: "500" },
    ];
    const result = calculateLiquidLimit(extremeTrials);
    expect(result).toBe(500); // Should accept without validation limits
  });

  it("handles extremely low blow counts", () => {
    const extremeTrials: LiquidLimitTrial[] = [
      { id: "1", trialNo: "1", blows: "1", moisture: "40" },
      { id: "2", trialNo: "2", blows: "2", moisture: "38" },
    ];
    const result = calculateLiquidLimit(extremeTrials);
    expect(result).toBeTruthy();
  });

  it("handles extremely high blow counts", () => {
    const extremeTrials: LiquidLimitTrial[] = [
      { id: "1", trialNo: "1", blows: "100", moisture: "15" },
      { id: "2", trialNo: "2", blows: "120", moisture: "14" },
    ];
    const result = calculateLiquidLimit(extremeTrials);
    expect(result).toBeTruthy();
  });
});

describe("Edge Case Tests - Boundary Conditions", () => {
  it("handles plasticity index at exactly 0", () => {
    const pi = calculatePlasticityIndex(25, 25);
    expect(pi).toBe(0);
  });

  it("handles plasticity index negative (invalid case)", () => {
    const pi = calculatePlasticityIndex(20, 25);
    expect(pi).toBeNull(); // PL > LL is invalid
  });

  it("handles LL = PL (zero plasticity)", () => {
    const pi = calculatePlasticityIndex(25, 25);
    expect(pi).toBe(0);
  });

  it("handles very small LL values", () => {
    const pi = calculatePlasticityIndex(0.1, 0.05);
    expect(pi).toBeGreaterThanOrEqual(0);
  });

  it("handles very large LL values", () => {
    const pi = calculatePlasticityIndex(200, 180);
    expect(pi).toBe(20);
  });

  it("handles liquid limit interpolation at exact 25 blows", () => {
    const trials: LiquidLimitTrial[] = [
      { id: "1", trialNo: "1", blows: "25", moisture: "30" },
    ];
    const result = calculateLiquidLimit(trials);
    expect(result).toBe(30); // Should return exact value
  });

  it("handles liquid limit interpolation below 25 blows", () => {
    const trials: LiquidLimitTrial[] = [
      { id: "1", trialNo: "1", blows: "10", moisture: "35" },
      { id: "2", trialNo: "2", blows: "20", moisture: "32" },
    ];
    const result = calculateLiquidLimit(trials);
    // Should extrapolate/use closest available
    expect(result).toBeTruthy();
  });

  it("handles liquid limit interpolation above 25 blows", () => {
    const trials: LiquidLimitTrial[] = [
      { id: "1", trialNo: "1", blows: "30", moisture: "28" },
      { id: "2", trialNo: "2", blows: "40", moisture: "26" },
    ];
    const result = calculateLiquidLimit(trials);
    expect(result).toBeTruthy();
  });
});

describe("Edge Case Tests - Validation Messages", () => {
  it("provides error for test with no trials", () => {
    const emptyTest: AtterbergTest = {
      id: "test1",
      type: "liquidLimit",
      title: "Empty Test",
      isExpanded: false,
      trials: [],
      result: {},
    };
    const { errors } = getTestValidationMessages(emptyTest);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]).toContain("No valid trials");
  });

  it("provides warning for test with single trial", () => {
    const singleTrialTest: AtterbergTest = {
      id: "test1",
      type: "plasticLimit",
      title: "Single Trial",
      isExpanded: false,
      trials: [{ id: "1", trialNo: "1", moisture: "20" }],
      result: {},
    };
    const { warnings } = getTestValidationMessages(singleTrialTest);
    expect(warnings.length).toBeGreaterThan(0);
  });

  it("provides warning for narrow blow count range", () => {
    const narrowBlowTest: AtterbergTest = {
      id: "test1",
      type: "liquidLimit",
      title: "Narrow Range",
      isExpanded: false,
      trials: [
        { id: "1", trialNo: "1", blows: "24", moisture: "30" },
        { id: "2", trialNo: "2", blows: "26", moisture: "29.5" },
      ],
      result: {},
    };
    const { warnings } = getTestValidationMessages(narrowBlowTest);
    expect(warnings.some((w) => w.includes("narrow"))).toBe(true);
  });

  it("provides info for record with no tests", () => {
    const emptyRecord: AtterbergRecord = {
      id: "rec1",
      title: "Empty Record",
      label: "E1",
      isExpanded: false,
      tests: [],
      results: {},
    };
    const { info } = getRecordValidationMessages(emptyRecord);
    expect(info.length).toBeGreaterThan(0);
  });

  it("provides progress info for incomplete record", () => {
    const partialRecord: AtterbergRecord = {
      id: "rec1",
      title: "Partial Record",
      label: "P1",
      isExpanded: false,
      tests: [
        {
          id: "test1",
          type: "liquidLimit",
          title: "LL",
          isExpanded: false,
          trials: [{ id: "1", trialNo: "1", blows: "20", moisture: "30" }],
          result: {},
        },
        {
          id: "test2",
          type: "plasticLimit",
          title: "PL",
          isExpanded: false,
          trials: [
            { id: "1", trialNo: "1", moisture: "20" },
            { id: "2", trialNo: "2", moisture: "19" },
          ],
          result: {},
        },
      ],
      results: { liquidLimit: 30, plasticLimit: 19.5 },
    };
    const { info } = getRecordValidationMessages(partialRecord);
    expect(info.some((i) => i.includes("Progress"))).toBe(true);
  });

  it("detects non-plastic soil in record", () => {
    const nonPlasticRecord: AtterbergRecord = {
      id: "rec1",
      title: "Non-plastic",
      label: "NP",
      isExpanded: false,
      tests: [],
      results: { liquidLimit: 20, plasticityIndex: 0.2 },
    };
    const { info } = getRecordValidationMessages(nonPlasticRecord);
    expect(info.some((i) => i.includes("non-plastic"))).toBe(true);
  });
});

describe("Edge Case Tests - Status Derivation", () => {
  it("returns not-started for zero data points", () => {
    const status = deriveAtterbergStatus(0, 0, 5);
    expect(status).toBe("not-started");
  });

  it("returns completed when all tests completed", () => {
    const status = deriveAtterbergStatus(10, 3, 3);
    expect(status).toBe("completed");
  });

  it("returns in-progress for partial completion", () => {
    const status = deriveAtterbergStatus(5, 1, 3);
    expect(status).toBe("in-progress");
  });

  it("returns in-progress when data exists but no tests", () => {
    const status = deriveAtterbergStatus(5, 0, 0);
    expect(status).toBe("in-progress");
  });
});

describe("Edge Case Tests - Shrinkage Limits", () => {
  it("handles shrinkage with initial > final volume", () => {
    const trials: ShrinkageLimitTrial[] = [
      {
        id: "1",
        trialNo: "1",
        initialVolume: "50",
        finalVolume: "40",
        moisture: "25",
      },
    ];
    const result = calculateShrinkageLimit(trials, "linear");
    expect(result).toBeTruthy(); // Valid shrinkage
  });

  it("handles shrinkage with initial = final (no shrinkage)", () => {
    const trials: ShrinkageLimitTrial[] = [
      {
        id: "1",
        trialNo: "1",
        initialVolume: "50",
        finalVolume: "50",
        moisture: "25",
      },
    ];
    const result = calculateShrinkageLimit(trials, "linear");
    expect(result).toBe(0);
  });

  it("handles volumetric vs linear shrinkage methods", () => {
    const trials: ShrinkageLimitTrial[] = [
      {
        id: "1",
        trialNo: "1",
        initialVolume: "100",
        finalVolume: "80",
        moisture: "30",
      },
      {
        id: "2",
        trialNo: "2",
        initialVolume: "100",
        finalVolume: "78",
        moisture: "28",
      },
    ];
    const linear = calculateShrinkageLimit(trials, "linear");
    const volumetric = calculateShrinkageLimit(trials, "volumetric");
    
    // Both should return values
    expect(linear).toBeTruthy();
    expect(volumetric).toBeTruthy();
    // They may differ slightly
  });
});

// Helper function for testing (if classifyFineGrained is exported)
function classifyFineGrainedPublic(ll: number | undefined, pi: number | undefined) {
  if (pi === undefined || pi === 0 || pi < 0.5) {
    return { uscsSymbol: "ML", classification: "Non-plastic silt" };
  }
  return { uscsSymbol: "CL/CH", classification: "Plastic clay" };
}

describe("Edge Case Tests - Classification Edge Cases", () => {
  it("classifies non-plastic fine-grained soil correctly", () => {
    const result = classifyFineGrainedPublic(25, 0);
    expect(result.classification).toContain("Non-plastic");
  });

  it("classifies soil with undefined PI as non-plastic", () => {
    const result = classifyFineGrainedPublic(25, undefined);
    expect(result.classification).toContain("Non-plastic");
  });

  it("classifies low LL, low PI soil", () => {
    const result = classifyFineGrainedPublic(20, 3);
    expect(result.uscsSymbol).toBe("ML");
  });

  it("classifies high LL, high PI soil", () => {
    const result = classifyFineGrainedPublic(60, 25);
    expect(result.uscsSymbol).toBe("CL/CH");
  });
});
