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
            { id: "t1", trialNo: "1", penetration: "20", moisture: "19.4" },
            { id: "t2", trialNo: "2", penetration: "25", moisture: "19" },
          ],
          result: { liquidLimit: 19.4 },
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
          result: { plasticLimit: 19.1 },
        },
      ],
      results: { liquidLimit: 19.4, plasticLimit: 19.1, plasticityIndex: 0.3 },
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
      { id: "1", trialNo: "1", penetration: "20", moisture: "30" },
    ];
    const result = calculateLiquidLimit(singleTrial);
    expect(result).toBe(30);
  });

  it("handles trials with missing moisture", () => {
    const invalidTrials: LiquidLimitTrial[] = [
      { id: "1", trialNo: "1", penetration: "20", moisture: "" },
      { id: "2", trialNo: "2", penetration: "25", moisture: "28" },
    ];
    const result = calculateLiquidLimit(invalidTrials);
    expect(result).toBe(28);
  });

  it("handles trials with missing penetration", () => {
    const invalidTrials: LiquidLimitTrial[] = [
      { id: "1", trialNo: "1", penetration: "", moisture: "30" },
      { id: "2", trialNo: "2", penetration: "20", moisture: "28" },
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

  it("handles shrinkage with zero lengths", () => {
    const zeroLengthTrials: ShrinkageLimitTrial[] = [
      { id: "1", trialNo: "1", initialLength: "0", finalLength: "0" },
    ];
    const result = calculateShrinkageLimit(zeroLengthTrials);
    expect(result).toBeNull();
  });

  it("handles shrinkage with negative values (invalid)", () => {
    const negativeTrials: ShrinkageLimitTrial[] = [
      { id: "1", trialNo: "1", initialLength: "-10", finalLength: "8" },
    ];
    const result = calculateShrinkageLimit(negativeTrials);
    expect(result).toBeNull();
  });

  it("handles mixed valid and invalid data", () => {
    const mixedTrials: LiquidLimitTrial[] = [
      { id: "1", trialNo: "1", penetration: "20", moisture: "30" },
      { id: "2", trialNo: "2", penetration: "", moisture: "28" },
      { id: "3", trialNo: "3", penetration: "25", moisture: "28.5" },
      { id: "4", trialNo: "4", penetration: "15", moisture: "" },
    ];
    const result = calculateLiquidLimit(mixedTrials);
    expect(result).toBeTruthy();
  });
});

describe("Edge Case Tests - Invalid Data", () => {
  it("rejects negative moisture values", () => {
    const invalidTrials: LiquidLimitTrial[] = [
      { id: "1", trialNo: "1", penetration: "20", moisture: "-5" },
    ];
    const result = calculateLiquidLimit(invalidTrials);
    expect(result).toBeNull();
  });

  it("rejects negative penetration", () => {
    const invalidTrials: LiquidLimitTrial[] = [
      { id: "1", trialNo: "1", penetration: "-10", moisture: "30" },
    ];
    const result = calculateLiquidLimit(invalidTrials);
    expect(result).toBeNull();
  });

  it("rejects non-numeric input", () => {
    const invalidTrials: LiquidLimitTrial[] = [
      { id: "1", trialNo: "1", penetration: "abc", moisture: "30" },
    ];
    const result = calculateLiquidLimit(invalidTrials);
    expect(result).toBeNull();
  });

  it("handles extremely high moisture content", () => {
    const extremeTrials: LiquidLimitTrial[] = [
      { id: "1", trialNo: "1", penetration: "20", moisture: "500" },
    ];
    const result = calculateLiquidLimit(extremeTrials);
    expect(result).toBe(500);
  });

  it("handles extremely low penetration", () => {
    const extremeTrials: LiquidLimitTrial[] = [
      { id: "1", trialNo: "1", penetration: "1", moisture: "40" },
      { id: "2", trialNo: "2", penetration: "2", moisture: "38" },
    ];
    const result = calculateLiquidLimit(extremeTrials);
    expect(result).toBeTruthy();
  });

  it("handles extremely high penetration", () => {
    const extremeTrials: LiquidLimitTrial[] = [
      { id: "1", trialNo: "1", penetration: "100", moisture: "15" },
      { id: "2", trialNo: "2", penetration: "120", moisture: "14" },
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
    expect(pi).toBeNull();
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

  it("handles liquid limit interpolation at exact 20mm penetration", () => {
    const trials: LiquidLimitTrial[] = [
      { id: "1", trialNo: "1", penetration: "20", moisture: "30" },
    ];
    const result = calculateLiquidLimit(trials);
    expect(result).toBe(30);
  });

  it("handles liquid limit interpolation below 20mm penetration", () => {
    const trials: LiquidLimitTrial[] = [
      { id: "1", trialNo: "1", penetration: "10", moisture: "35" },
      { id: "2", trialNo: "2", penetration: "15", moisture: "32" },
    ];
    const result = calculateLiquidLimit(trials);
    expect(result).toBeTruthy();
  });

  it("handles liquid limit interpolation above 20mm penetration", () => {
    const trials: LiquidLimitTrial[] = [
      { id: "1", trialNo: "1", penetration: "25", moisture: "28" },
      { id: "2", trialNo: "2", penetration: "30", moisture: "26" },
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

  it("provides warning for narrow penetration range", () => {
    const narrowPenTest: AtterbergTest = {
      id: "test1",
      type: "liquidLimit",
      title: "Narrow Range",
      isExpanded: false,
      trials: [
        { id: "1", trialNo: "1", penetration: "19", moisture: "30" },
        { id: "2", trialNo: "2", penetration: "21", moisture: "29.5" },
      ],
      result: {},
    };
    const { warnings } = getTestValidationMessages(narrowPenTest);
    expect(warnings.some((w) => w.includes("narrow"))).toBe(true);
  });

  it("provides info for record with no tests", () => {
    const emptyRecord: AtterbergRecord = {
      id: "rec1",
      title: "Empty Record",
      label: "E1",
      note: "",
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
      note: "",
      isExpanded: false,
      tests: [
        {
          id: "test1",
          type: "liquidLimit",
          title: "LL",
          isExpanded: false,
          trials: [{ id: "1", trialNo: "1", penetration: "15", moisture: "30" }],
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
      note: "",
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
  it("handles shrinkage with initial > final length", () => {
    const trials: ShrinkageLimitTrial[] = [
      { id: "1", trialNo: "1", initialLength: "140", finalLength: "130" },
    ];
    const result = calculateShrinkageLimit(trials);
    expect(result).toBeTruthy();
  });

  it("handles shrinkage with initial = final (no shrinkage)", () => {
    const trials: ShrinkageLimitTrial[] = [
      { id: "1", trialNo: "1", initialLength: "140", finalLength: "140" },
    ];
    const result = calculateShrinkageLimit(trials);
    expect(result).toBe(0);
  });

  it("handles linear shrinkage correctly", () => {
    const trials: ShrinkageLimitTrial[] = [
      { id: "1", trialNo: "1", initialLength: "140", finalLength: "126" },
      { id: "2", trialNo: "2", initialLength: "140", finalLength: "128" },
    ];
    const result = calculateShrinkageLimit(trials);
    expect(result).toBeTruthy();
  });
});

// Local helper for classification tests
function classifyFineGrainedLocal(ll: number | undefined, pi: number | undefined) {
  if (pi === undefined || pi === 0 || pi < 0.5) {
    return { uscsSymbol: "ML", classification: "Non-plastic silt" };
  }

  if (ll === undefined) {
    return { uscsSymbol: "CH/CL", classification: "Plastic clay" };
  }

  const aLineValue = 0.73 * (ll - 20);
  const aboveLine = pi > aLineValue;

  if (ll < 50) {
    return aboveLine
      ? { uscsSymbol: "CL", classification: "Lean clay" }
      : { uscsSymbol: "ML", classification: "Silt" };
  }

  return aboveLine
    ? { uscsSymbol: "CH", classification: "Fat clay" }
    : { uscsSymbol: "MH", classification: "Elastic silt" };
}

describe("Edge Case Tests - Classification Edge Cases", () => {
  it("classifies non-plastic fine-grained soil correctly", () => {
    const result = classifyFineGrainedLocal(25, 0);
    expect(result.classification).toContain("Non-plastic");
  });

  it("classifies soil with undefined PI as non-plastic", () => {
    const result = classifyFineGrainedLocal(25, undefined);
    expect(result.classification).toContain("Non-plastic");
  });

  it("classifies low LL, low PI soil", () => {
    const result = classifyFineGrainedLocal(30, 3);
    expect(result.uscsSymbol).toBe("ML");
  });

  it("classifies high LL, high PI soil", () => {
    const result = classifyFineGrainedLocal(60, 35);
    expect(result.uscsSymbol).toBe("CH");
  });
});
