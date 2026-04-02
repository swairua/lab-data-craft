import {
  calculateRecordResults,
  calculateTestResult,
  countCompletedTests,
  deriveAtterbergStatus,
  isAtterbergTestComplete,
  isLiquidLimitTestComplete,
  isPlasticLimitTestComplete,
  isShrinkageLimitTestComplete,
} from "@/lib/atterbergCalculations";
import type { AtterbergRecord, AtterbergTest, LiquidLimitTrial, PlasticLimitTrial, ShrinkageLimitTrial } from "@/context/TestDataContext";

describe("Atterberg calculations", () => {
  const liquidLimitTest = (trials: LiquidLimitTrial[]): AtterbergTest => ({
    id: "ll-1",
    title: "Liquid Limit 1",
    type: "liquidLimit",
    isExpanded: true,
    trials,
    result: {},
  });

  const plasticLimitTest = (trials: PlasticLimitTrial[]): AtterbergTest => ({
    id: "pl-1",
    title: "Plastic Limit 1",
    type: "plasticLimit",
    isExpanded: true,
    trials,
    result: {},
  });

  const shrinkageLimitTest = (trials: ShrinkageLimitTrial[]): AtterbergTest => ({
    id: "sl-1",
    title: "Shrinkage Limit 1",
    type: "shrinkageLimit",
    isExpanded: true,
    trials,
    result: {},
  });

  it("keeps liquid and plastic tests previewable before they are complete", () => {
    const liquidLimit = liquidLimitTest([{ id: "1", trialNo: "1", blows: "20", moisture: "30" }]);
    const plasticLimit = plasticLimitTest([{ id: "1", trialNo: "1", moisture: "18" }]);

    expect(calculateTestResult(liquidLimit)).toEqual({ liquidLimit: 30 });
    expect(calculateTestResult(plasticLimit)).toEqual({ plasticLimit: 18 });
    expect(isLiquidLimitTestComplete(liquidLimit)).toBe(false);
    expect(isPlasticLimitTestComplete(plasticLimit)).toBe(false);
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
          { id: "1", trialNo: "1", blows: "20", moisture: "30" },
          { id: "2", trialNo: "2", blows: "30", moisture: "20" },
        ]),
        plasticLimitTest([
          { id: "3", trialNo: "1", moisture: "18" },
          { id: "4", trialNo: "2", moisture: "22" },
        ]),
        shrinkageLimitTest([{ id: "5", trialNo: "1", initialVolume: "20", finalVolume: "15", moisture: "12" }]),
      ],
      results: {},
    };

    expect(isAtterbergTestComplete(record.tests[0])).toBe(true);
    expect(isAtterbergTestComplete(record.tests[1])).toBe(true);
    expect(isAtterbergTestComplete(record.tests[2])).toBe(true);
    expect(isShrinkageLimitTestComplete(record.tests[2] as Extract<AtterbergTest, { type: "shrinkageLimit" }>)).toBe(true);
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
          { id: "1", trialNo: "1", blows: "20", moisture: "30" },
          { id: "2", trialNo: "2", blows: "30", moisture: "20" },
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
