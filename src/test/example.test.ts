import {
  averageNumbers,
  buildAtterbergSummaryFields,
  calculateLiquidLimit,
  calculatePlasticLimit,
  calculatePlasticityIndex,
  calculateProjectResults,
  calculateRecordResults,
  calculateShrinkageLimit,
  calculateTestResult,
  countCompletedTests,
  countRecordDataPoints,
  deriveAtterbergStatus,
  getActiveResultValue,
  getLiquidLimitGraphData,
  getValidLiquidLimitTrials,
  getValidPlasticLimitTrials,
  getValidShrinkageLimitTrials,
  isAtterbergTestComplete,
  isLiquidLimitTestComplete,
  isLiquidLimitTrialStarted,
  isLiquidLimitTrialValid,
  isPlasticLimitTestComplete,
  isPlasticLimitTrialStarted,
  isPlasticLimitTrialValid,
  isShrinkageLimitTestComplete,
  isShrinkageLimitTrialStarted,
  isShrinkageLimitTrialValid,
  sanitizeNumericInput,
  areCalculatedResultsEqual,
} from "@/lib/atterbergCalculations";
import type { AtterbergRecord, AtterbergTest, LiquidLimitTest, PlasticLimitTest, ShrinkageLimitTest, LiquidLimitTrial, PlasticLimitTrial, ShrinkageLimitTrial } from "@/context/TestDataContext";

const liquidLimitTest = (trials: LiquidLimitTrial[]): LiquidLimitTest => ({
  id: "ll-1",
  title: "Liquid Limit 1",
  type: "liquidLimit",
  isExpanded: true,
  trials,
  result: {},
});

const plasticLimitTest = (trials: PlasticLimitTrial[]): PlasticLimitTest => ({
  id: "pl-1",
  title: "Plastic Limit 1",
  type: "plasticLimit",
  isExpanded: true,
  trials,
  result: {},
});

const shrinkageLimitTest = (trials: ShrinkageLimitTrial[]): ShrinkageLimitTest => ({
  id: "sl-1",
  title: "Shrinkage Limit 1",
  type: "shrinkageLimit",
  isExpanded: true,
  trials,
  result: {},
});

describe("Atterberg calculations", () => {

  it("keeps liquid and plastic tests previewable before they are complete", () => {
    const ll = liquidLimitTest([{ id: "1", trialNo: "1", penetration: "15", moisture: "30" }]);
    const pl = plasticLimitTest([{ id: "1", trialNo: "1", moisture: "18" }]);

    expect(calculateTestResult(ll)).toEqual({ liquidLimit: 30 });
    expect(calculateTestResult(pl)).toEqual({ plasticLimit: 18 });
    expect(isLiquidLimitTestComplete(ll)).toBe(false);
    expect(isPlasticLimitTestComplete(pl)).toBe(false);
  });

  it("requires the minimum valid trials before counting tests as complete", () => {
    const record: AtterbergRecord = {
      id: "record-1",
      title: "Record 1",
      label: "BH-1",
      note: "",
      isExpanded: true,
      tests: [
        liquidLimitTest([
          { id: "1", trialNo: "1", penetration: "15", moisture: "30" },
          { id: "2", trialNo: "2", penetration: "25", moisture: "20" },
        ]),
        plasticLimitTest([
          { id: "3", trialNo: "1", moisture: "18" },
          { id: "4", trialNo: "2", moisture: "22" },
        ]),
        shrinkageLimitTest([{ id: "5", trialNo: "1", initialLength: "140", finalLength: "130" }]),
      ],
      results: {},
    };

    expect(isAtterbergTestComplete(record.tests[0])).toBe(true);
    expect(isAtterbergTestComplete(record.tests[1])).toBe(true);
    expect(isAtterbergTestComplete(record.tests[2])).toBe(true);
    expect(isShrinkageLimitTestComplete(record.tests[2] as ShrinkageLimitTest)).toBe(true);
    expect(countCompletedTests(record)).toBe(3);
  });

  it("tracks status transitions using completion readiness", () => {
    expect(deriveAtterbergStatus(0, 0, 0)).toBe("not-started");
    expect(deriveAtterbergStatus(2, 0, 1)).toBe("in-progress");
    expect(deriveAtterbergStatus(4, 2, 2)).toBe("completed");
  });

  it("calculates record PI from liquid and plastic limit results", () => {
    const record: AtterbergRecord = {
      id: "record-2",
      title: "Record 2",
      label: "BH-2",
      note: "",
      isExpanded: true,
      tests: [
        liquidLimitTest([
          { id: "1", trialNo: "1", penetration: "15", moisture: "30" },
          { id: "2", trialNo: "2", penetration: "25", moisture: "20" },
        ]),
        plasticLimitTest([
          { id: "3", trialNo: "1", moisture: "18" },
          { id: "4", trialNo: "2", moisture: "22" },
        ]),
      ],
      results: {},
    };

    expect(calculateRecordResults(record)).toEqual({ liquidLimit: 25, plasticLimit: 20, plasticityIndex: 5 });
  });
});

describe("Atterberg calculations - Utility functions", () => {
  describe("sanitizeNumericInput", () => {
    it("removes non-numeric characters except decimal point", () => {
      expect(sanitizeNumericInput("123abc")).toBe("123");
      expect(sanitizeNumericInput("12.5abc")).toBe("12.5");
    });

    it("converts commas to decimal points", () => {
      expect(sanitizeNumericInput("12,5")).toBe("12.5");
    });

    it("preserves multiple decimal points (keeps all fractions)", () => {
      expect(sanitizeNumericInput("12.5.6")).toBe("12.56");
    });

    it("handles empty string", () => {
      expect(sanitizeNumericInput("")).toBe("");
    });

    it("handles integers without decimals", () => {
      expect(sanitizeNumericInput("123")).toBe("123");
    });
  });

  describe("Trial validators", () => {
    describe("isLiquidLimitTrialStarted", () => {
      it("returns true when penetration is filled", () => {
        expect(isLiquidLimitTrialStarted({ id: "1", trialNo: "1", penetration: "20", moisture: "" })).toBe(true);
      });

      it("returns true when moisture is filled", () => {
        expect(isLiquidLimitTrialStarted({ id: "1", trialNo: "1", penetration: "", moisture: "30" })).toBe(true);
      });

      it("returns false when both are empty", () => {
        expect(isLiquidLimitTrialStarted({ id: "1", trialNo: "1", penetration: "", moisture: "" })).toBe(false);
      });

      it("returns false for whitespace only", () => {
        expect(isLiquidLimitTrialStarted({ id: "1", trialNo: "1", penetration: "   ", moisture: "" })).toBe(false);
      });
    });

    describe("isPlasticLimitTrialStarted", () => {
      it("returns true when moisture is filled", () => {
        expect(isPlasticLimitTrialStarted({ id: "1", trialNo: "1", moisture: "18" })).toBe(true);
      });

      it("returns false when empty", () => {
        expect(isPlasticLimitTrialStarted({ id: "1", trialNo: "1", moisture: "" })).toBe(false);
      });
    });

    describe("isShrinkageLimitTrialStarted", () => {
      it("returns true when initialLength is filled", () => {
        expect(isShrinkageLimitTrialStarted({ id: "1", trialNo: "1", initialLength: "140", finalLength: "" })).toBe(true);
      });

      it("returns true when finalLength is filled", () => {
        expect(isShrinkageLimitTrialStarted({ id: "1", trialNo: "1", initialLength: "", finalLength: "130" })).toBe(true);
      });

      it("returns false when all are empty", () => {
        expect(isShrinkageLimitTrialStarted({ id: "1", trialNo: "1", initialLength: "", finalLength: "" })).toBe(false);
      });
    });

    describe("isLiquidLimitTrialValid", () => {
      it("returns true when both penetration and moisture are valid numbers", () => {
        expect(isLiquidLimitTrialValid({ id: "1", trialNo: "1", penetration: "20", moisture: "30" })).toBe(true);
      });

      it("returns false when penetration is missing", () => {
        expect(isLiquidLimitTrialValid({ id: "1", trialNo: "1", penetration: "", moisture: "30" })).toBe(false);
      });

      it("returns false when moisture is missing", () => {
        expect(isLiquidLimitTrialValid({ id: "1", trialNo: "1", penetration: "20", moisture: "" })).toBe(false);
      });

      it("returns false for non-numeric values", () => {
        expect(isLiquidLimitTrialValid({ id: "1", trialNo: "1", penetration: "abc", moisture: "30" })).toBe(false);
      });
    });

    describe("isPlasticLimitTrialValid", () => {
      it("returns true when moisture is a valid number", () => {
        expect(isPlasticLimitTrialValid({ id: "1", trialNo: "1", moisture: "18" })).toBe(true);
      });

      it("returns false when moisture is missing", () => {
        expect(isPlasticLimitTrialValid({ id: "1", trialNo: "1", moisture: "" })).toBe(false);
      });

      it("returns false for non-numeric values", () => {
        expect(isPlasticLimitTrialValid({ id: "1", trialNo: "1", moisture: "abc" })).toBe(false);
      });
    });

    describe("isShrinkageLimitTrialValid", () => {
      it("returns true when both length fields are valid", () => {
        expect(isShrinkageLimitTrialValid({ id: "1", trialNo: "1", initialLength: "140", finalLength: "130" })).toBe(true);
      });

      it("returns false when any field is missing", () => {
        expect(isShrinkageLimitTrialValid({ id: "1", trialNo: "1", initialLength: "", finalLength: "130" })).toBe(false);
      });

      it("returns false for non-numeric values", () => {
        expect(isShrinkageLimitTrialValid({ id: "1", trialNo: "1", initialLength: "abc", finalLength: "130" })).toBe(false);
      });
    });
  });

  describe("Valid trials getters", () => {
    describe("getValidLiquidLimitTrials", () => {
      it("filters and sorts by penetration ascending", () => {
        const trials: LiquidLimitTrial[] = [
          { id: "1", trialNo: "1", penetration: "25", moisture: "20" },
          { id: "2", trialNo: "2", penetration: "15", moisture: "30" },
        ];

        const result = getValidLiquidLimitTrials(trials);
        expect(result).toHaveLength(2);
        expect(result[0].penetration).toBe(15);
        expect(result[1].penetration).toBe(25);
      });

      it("filters out invalid trials", () => {
        const trials: LiquidLimitTrial[] = [
          { id: "1", trialNo: "1", penetration: "20", moisture: "30" },
          { id: "2", trialNo: "2", penetration: "", moisture: "20" },
        ];

        expect(getValidLiquidLimitTrials(trials)).toHaveLength(1);
      });
    });

    describe("getValidPlasticLimitTrials", () => {
      it("filters and returns moisture values as numbers", () => {
        const trials: PlasticLimitTrial[] = [
          { id: "1", trialNo: "1", moisture: "18" },
          { id: "2", trialNo: "2", moisture: "22" },
        ];

        expect(getValidPlasticLimitTrials(trials)).toEqual([18, 22]);
      });

      it("filters out invalid trials", () => {
        const trials: PlasticLimitTrial[] = [
          { id: "1", trialNo: "1", moisture: "18" },
          { id: "2", trialNo: "2", moisture: "" },
        ];

        expect(getValidPlasticLimitTrials(trials)).toEqual([18]);
      });
    });

    describe("getValidShrinkageLimitTrials", () => {
      it("filters valid trials", () => {
        const trials: ShrinkageLimitTrial[] = [
          { id: "1", trialNo: "1", initialLength: "140", finalLength: "130" },
          { id: "2", trialNo: "2", initialLength: "140", finalLength: "125" },
        ];

        const result = getValidShrinkageLimitTrials(trials);
        expect(result).toHaveLength(2);
        expect(result[0].initialLength).toBe(140);
      });

      it("filters out invalid trials", () => {
        const trials: ShrinkageLimitTrial[] = [
          { id: "1", trialNo: "1", initialLength: "140", finalLength: "130" },
          { id: "2", trialNo: "2", initialLength: "", finalLength: "125" },
        ];

        expect(getValidShrinkageLimitTrials(trials)).toHaveLength(1);
      });
    });
  });

  describe("averageNumbers", () => {
    it("calculates average of multiple numbers", () => {
      expect(averageNumbers([10, 20, 30])).toBe(20);
    });

    it("returns single number as-is", () => {
      expect(averageNumbers([25])).toBe(25);
    });

    it("returns null for empty array", () => {
      expect(averageNumbers([])).toBeNull();
    });

    it("rounds to 2 decimal places", () => {
      expect(averageNumbers([10.111, 20.222, 30.333])).toBe(20.22);
    });

    it("handles decimal values correctly", () => {
      expect(averageNumbers([18.5, 21.5])).toBe(20);
    });
  });

  describe("calculateLiquidLimit", () => {
    it("interpolates at 20mm penetration correctly", () => {
      const trials: LiquidLimitTrial[] = [
        { id: "1", trialNo: "1", penetration: "15", moisture: "30" },
        { id: "2", trialNo: "2", penetration: "25", moisture: "20" },
      ];

      expect(calculateLiquidLimit(trials)).toBe(25);
    });

    it("returns exact value when trial is at 20mm penetration", () => {
      const trials: LiquidLimitTrial[] = [
        { id: "1", trialNo: "1", penetration: "20", moisture: "28" },
      ];

      expect(calculateLiquidLimit(trials)).toBe(28);
    });

    it("returns closest lower value when no upper bound exists", () => {
      const trials: LiquidLimitTrial[] = [
        { id: "1", trialNo: "1", penetration: "15", moisture: "30" },
      ];

      expect(calculateLiquidLimit(trials)).toBe(30);
    });

    it("returns null for empty trials", () => {
      expect(calculateLiquidLimit([])).toBeNull();
    });

    it("returns null for invalid trials", () => {
      const trials: LiquidLimitTrial[] = [
        { id: "1", trialNo: "1", penetration: "abc", moisture: "xyz" },
      ];

      expect(calculateLiquidLimit(trials)).toBeNull();
    });
  });

  describe("calculatePlasticLimit", () => {
    it("calculates average of moisture values", () => {
      const trials: PlasticLimitTrial[] = [
        { id: "1", trialNo: "1", moisture: "18" },
        { id: "2", trialNo: "2", moisture: "22" },
      ];

      expect(calculatePlasticLimit(trials)).toBe(20);
    });

    it("returns null for empty trials", () => {
      expect(calculatePlasticLimit([])).toBeNull();
    });

    it("returns null when no valid trials", () => {
      const trials: PlasticLimitTrial[] = [
        { id: "1", trialNo: "1", moisture: "" },
      ];

      expect(calculatePlasticLimit(trials)).toBeNull();
    });
  });

  describe("calculateShrinkageLimit (Linear)", () => {
    it("calculates linear shrinkage correctly", () => {
      const trials: ShrinkageLimitTrial[] = [
        { id: "1", trialNo: "1", initialLength: "140", finalLength: "126" },
      ];

      // ((140 - 126) / 140) * 100 = 10
      expect(calculateShrinkageLimit(trials)).toBe(10);
    });

    it("averages multiple valid trials", () => {
      const trials: ShrinkageLimitTrial[] = [
        { id: "1", trialNo: "1", initialLength: "140", finalLength: "126" },
        { id: "2", trialNo: "2", initialLength: "140", finalLength: "126" },
      ];

      expect(calculateShrinkageLimit(trials)).toBe(10);
    });

    it("filters out trials with zero initial length", () => {
      const trials: ShrinkageLimitTrial[] = [
        { id: "1", trialNo: "1", initialLength: "0", finalLength: "130" },
        { id: "2", trialNo: "2", initialLength: "140", finalLength: "126" },
      ];

      expect(calculateShrinkageLimit(trials)).toBe(10);
    });

    it("returns null for empty trials", () => {
      expect(calculateShrinkageLimit([])).toBeNull();
    });
  });

  describe("calculatePlasticityIndex", () => {
    it("calculates PI as LL - PL", () => {
      expect(calculatePlasticityIndex(30, 20)).toBe(10);
    });

    it("returns null when LL is null", () => {
      expect(calculatePlasticityIndex(null, 20)).toBeNull();
    });

    it("returns null when PL is null", () => {
      expect(calculatePlasticityIndex(30, null)).toBeNull();
    });

    it("rounds to 2 decimal places", () => {
      expect(calculatePlasticityIndex(25.555, 20.333)).toBe(5.22);
    });
  });

  describe("getActiveResultValue", () => {
    it("returns liquidLimit for liquid limit test", () => {
      const test = liquidLimitTest([{ id: "1", trialNo: "1", penetration: "20", moisture: "30" }]);
      expect(getActiveResultValue(test, { liquidLimit: 28 })).toBe(28);
    });

    it("returns plasticLimit for plastic limit test", () => {
      const test = plasticLimitTest([{ id: "1", trialNo: "1", moisture: "20" }]);
      expect(getActiveResultValue(test, { plasticLimit: 20 })).toBe(20);
    });

    it("returns linearShrinkage for shrinkage limit test", () => {
      const test = shrinkageLimitTest([{ id: "1", trialNo: "1", initialLength: "140", finalLength: "130" }]);
      expect(getActiveResultValue(test, { linearShrinkage: 7.14 })).toBe(7.14);
    });

    it("returns null when result value is missing", () => {
      const test = liquidLimitTest([{ id: "1", trialNo: "1", penetration: "20", moisture: "30" }]);
      expect(getActiveResultValue(test, {})).toBeNull();
    });

    it("uses test.result as fallback", () => {
      const test = liquidLimitTest([{ id: "1", trialNo: "1", penetration: "20", moisture: "30" }]);
      test.result = { liquidLimit: 25 };
      expect(getActiveResultValue(test)).toBe(25);
    });
  });

  describe("countRecordDataPoints", () => {
    it("counts all valid trials in record", () => {
      const record: AtterbergRecord = {
        id: "record-1",
        title: "Record 1",
        label: "BH-1",
        note: "",
        isExpanded: true,
        tests: [
          liquidLimitTest([
            { id: "1", trialNo: "1", penetration: "15", moisture: "30" },
            { id: "2", trialNo: "2", penetration: "25", moisture: "20" },
          ]),
          plasticLimitTest([{ id: "3", trialNo: "1", moisture: "18" }]),
        ],
        results: {},
      };

      expect(countRecordDataPoints(record)).toBe(3);
    });

    it("returns 0 for empty record", () => {
      const record: AtterbergRecord = {
        id: "record-1",
        title: "Record 1",
        label: "BH-1",
        note: "",
        isExpanded: true,
        tests: [],
        results: {},
      };

      expect(countRecordDataPoints(record)).toBe(0);
    });
  });

  describe("calculateProjectResults", () => {
    it("averages results across multiple records", () => {
      const records: AtterbergRecord[] = [
        {
          id: "record-1",
          title: "Record 1",
          label: "BH-1",
          note: "",
          isExpanded: true,
          tests: [],
          results: { liquidLimit: 30, plasticLimit: 20 },
        },
        {
          id: "record-2",
          title: "Record 2",
          label: "BH-2",
          note: "",
          isExpanded: true,
          tests: [],
          results: { liquidLimit: 20, plasticLimit: 10 },
        },
      ];

      const result = calculateProjectResults(records);
      expect(result.liquidLimit).toBe(25);
      expect(result.plasticLimit).toBe(15);
      expect(result.plasticityIndex).toBe(10);
    });

    it("returns empty object for no records", () => {
      expect(calculateProjectResults([])).toEqual({});
    });

    it("handles missing result fields", () => {
      const records: AtterbergRecord[] = [
        {
          id: "record-1",
          title: "Record 1",
          label: "BH-1",
          note: "",
          isExpanded: true,
          tests: [],
          results: { liquidLimit: 30 },
        },
        {
          id: "record-2",
          title: "Record 2",
          label: "BH-2",
          note: "",
          isExpanded: true,
          tests: [],
          results: { plasticLimit: 20 },
        },
      ];

      const result = calculateProjectResults(records);
      expect(result.liquidLimit).toBe(30);
      expect(result.plasticLimit).toBe(20);
    });
  });

  describe("buildAtterbergSummaryFields", () => {
    it("builds summary fields with all results", () => {
      const results = { liquidLimit: 25, plasticLimit: 20, plasticityIndex: 5 };
      const fields = buildAtterbergSummaryFields(results, 2, 8);

      expect(fields).toContainEqual({ label: "Avg LL", value: "25%" });
      expect(fields).toContainEqual({ label: "Avg PL", value: "20%" });
      expect(fields).toContainEqual({ label: "Avg PI", value: "5%" });
      expect(fields).toContainEqual({ label: "Records", value: "2" });
      expect(fields).toContainEqual({ label: "Valid Data Points", value: "8" });
    });

    it("handles missing result values", () => {
      const results = { liquidLimit: 25 };
      const fields = buildAtterbergSummaryFields(results, 1, 2);

      expect(fields.find((f) => f.label === "Avg LL")?.value).toBe("25%");
      expect(fields.find((f) => f.label === "Avg PL")?.value).toBe("");
    });
  });

  describe("areCalculatedResultsEqual", () => {
    it("returns true for identical results", () => {
      const results = { liquidLimit: 25, plasticLimit: 20, plasticityIndex: 5 };
      expect(areCalculatedResultsEqual(results, results)).toBe(true);
    });

    it("returns false for different values", () => {
      const results1 = { liquidLimit: 25, plasticLimit: 20, plasticityIndex: 5 };
      const results2 = { liquidLimit: 26, plasticLimit: 20, plasticityIndex: 6 };
      expect(areCalculatedResultsEqual(results1, results2)).toBe(false);
    });

    it("returns false for different keys", () => {
      const results1 = { liquidLimit: 25 };
      const results2 = { liquidLimit: 25, plasticLimit: 20 };
      expect(areCalculatedResultsEqual(results1, results2)).toBe(false);
    });

    it("treats undefined and missing keys as equal", () => {
      const results1 = { liquidLimit: 25, plasticLimit: undefined };
      const results2 = { liquidLimit: 25 };
      expect(areCalculatedResultsEqual(results1, results2)).toBe(true);
    });
  });

  describe("getLiquidLimitGraphData", () => {
    it("formats valid trials for graphing", () => {
      const trials: LiquidLimitTrial[] = [
        { id: "1", trialNo: "1", penetration: "15", moisture: "30" },
        { id: "2", trialNo: "2", penetration: "25", moisture: "20" },
      ];

      const graphData = getLiquidLimitGraphData(trials);
      expect(graphData).toHaveLength(2);
      expect(graphData[0]).toEqual({ penetration: 15, moisture: 30, trial: "1" });
      expect(graphData[1]).toEqual({ penetration: 25, moisture: 20, trial: "2" });
    });

    it("filters out invalid trials", () => {
      const trials: LiquidLimitTrial[] = [
        { id: "1", trialNo: "1", penetration: "15", moisture: "30" },
        { id: "2", trialNo: "2", penetration: "", moisture: "20" },
      ];

      expect(getLiquidLimitGraphData(trials)).toHaveLength(1);
    });

    it("returns empty array for no valid trials", () => {
      const trials: LiquidLimitTrial[] = [
        { id: "1", trialNo: "1", penetration: "", moisture: "" },
      ];

      expect(getLiquidLimitGraphData(trials)).toEqual([]);
    });
  });
});
