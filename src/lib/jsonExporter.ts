import type {
  AtterbergProjectState,
  AtterbergRecord,
  AtterbergTest,
  AtterbergTestType,
  CalculatedResults,
  LiquidLimitTrial,
  PlasticLimitTrial,
  ShrinkageLimitTrial,
} from "@/context/TestDataContext";

export type { AtterbergProjectState, AtterbergRecord };

export interface AtterbergExportPayload {
  exportDate: string;
  version: string;
  project: {
    title?: string;
    clientName?: string;
    date?: string;
    labOrganization?: string;
    dateReported?: string;
    checkedBy?: string;
    records: AtterbergRecord[];
  };
}

const isObject = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null;
const makeId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const readString = (value: unknown) => (typeof value === "string" ? value : "");
const readNumber = (value: unknown) => (typeof value === "number" && Number.isFinite(value) ? value : undefined);

const normalizeResults = (value: unknown): CalculatedResults => {
  if (!isObject(value)) return {};

  return {
    liquidLimit: readNumber(value.liquidLimit),
    plasticLimit: readNumber(value.plasticLimit),
    shrinkageLimit: readNumber(value.shrinkageLimit),
    plasticityIndex: readNumber(value.plasticityIndex),
  };
};

const normalizeLiquidLimitTrials = (value: unknown): LiquidLimitTrial[] => {
  const trials = Array.isArray(value) ? value : [];
  if (trials.length === 0) {
    return [{ id: makeId("trial"), trialNo: "1", blows: "", moisture: "" }];
  }

  return trials.map((trial, index) => {
    const item = isObject(trial) ? trial : {};
    return {
      id: makeId("trial"),
      trialNo: readString(item.trialNo) || String(index + 1),
      blows: readString(item.blows),
      moisture: readString(item.moisture),
      cupMass: readString(item.cupMass),
      wetMass: readString(item.wetMass),
      dryMass: readString(item.dryMass),
    };
  });
};

const normalizePlasticLimitTrials = (value: unknown): PlasticLimitTrial[] => {
  const trials = Array.isArray(value) ? value : [];
  if (trials.length === 0) {
    return [{ id: makeId("trial"), trialNo: "1", moisture: "" }];
  }

  return trials.map((trial, index) => {
    const item = isObject(trial) ? trial : {};
    return {
      id: makeId("trial"),
      trialNo: readString(item.trialNo) || String(index + 1),
      moisture: readString(item.moisture),
      cupMass: readString(item.cupMass),
      wetMass: readString(item.wetMass),
      dryMass: readString(item.dryMass),
    };
  });
};

const normalizeShrinkageLimitTrials = (value: unknown): ShrinkageLimitTrial[] => {
  const trials = Array.isArray(value) ? value : [];
  if (trials.length === 0) {
    return [{ id: makeId("trial"), trialNo: "1", initialVolume: "", finalVolume: "", moisture: "" }];
  }

  return trials.map((trial, index) => {
    const item = isObject(trial) ? trial : {};
    return {
      id: makeId("trial"),
      trialNo: readString(item.trialNo) || String(index + 1),
      initialVolume: readString(item.initialVolume),
      finalVolume: readString(item.finalVolume),
      moisture: readString(item.moisture),
    };
  });
};

// Backwards compatibility for legacy shrinkage data
const migrateLegacyShrinkageData = (trial: unknown): ShrinkageLimitTrial => {
  const item = isObject(trial) ? trial : {};

  // Handle legacy format where shrinkage data might be stored differently
  let initialVolume = readString(item.initialVolume) || readString(item.initialLength) || "";
  let finalVolume = readString(item.finalVolume) || readString(item.finalLength) || "";

  // Support alternative field names for backwards compatibility
  if (!initialVolume && item.volume1) {
    initialVolume = readString(item.volume1);
  }
  if (!finalVolume && item.volume2) {
    finalVolume = readString(item.volume2);
  }

  return {
    id: makeId("trial"),
    trialNo: readString(item.trialNo) || String(1),
    initialVolume: initialVolume,
    finalVolume: finalVolume,
    moisture: readString(item.moisture) || "",
    initialMass: readString(item.initialMass),
    finalMass: readString(item.finalMass),
    dryMass: readString(item.dryMass),
  };
};

const normalizeShrinkageLimitTrialsWithMigration = (value: unknown): ShrinkageLimitTrial[] => {
  const trials = Array.isArray(value) ? value : [];
  if (trials.length === 0) {
    return [{ id: makeId("trial"), trialNo: "1", initialVolume: "", finalVolume: "", moisture: "" }];
  }

  return trials.map((trial) => migrateLegacyShrinkageData(trial));
};

const normalizeLegacyTest = (value: Record<string, unknown>, index: number): AtterbergTest => {
  const type =
    value.testType === "liquidLimit" || value.testType === "plasticLimit" || value.testType === "shrinkageLimit"
      ? value.testType
      : "liquidLimit";

  if (type === "liquidLimit") {
    return {
      id: makeId("test"),
      title: readString(value.testTitle) || `Liquid Limit ${index + 1}`,
      type,
      isExpanded: typeof value.isExpanded === "boolean" ? value.isExpanded : true,
      trials: normalizeLiquidLimitTrials(value.liquidLimitRows),
      result: normalizeResults(value.calculatedResults),
    };
  }

  if (type === "plasticLimit") {
    return {
      id: makeId("test"),
      title: readString(value.testTitle) || `Plastic Limit ${index + 1}`,
      type,
      isExpanded: typeof value.isExpanded === "boolean" ? value.isExpanded : true,
      trials: normalizePlasticLimitTrials(value.plasticLimitRows),
      result: normalizeResults(value.calculatedResults),
    };
  }

  return {
    id: makeId("test"),
    title: readString(value.testTitle) || `Shrinkage Limit ${index + 1}`,
    type,
    isExpanded: typeof value.isExpanded === "boolean" ? value.isExpanded : true,
    trials: normalizeShrinkageLimitTrialsWithMigration(value.shrinkageLimitRows),
    result: normalizeResults(value.calculatedResults),
    method: readString(value.method) as "volumetric" | "linear" | undefined,
  };
};

const normalizeTest = (value: unknown, index: number): AtterbergTest => {
  const test = isObject(value) ? value : {};

  if (Array.isArray(test.trials) && (test.type === "liquidLimit" || test.type === "plasticLimit" || test.type === "shrinkageLimit")) {
    const base = {
      id: makeId("test"),
      title: readString(test.title) || `${test.type} ${index + 1}`,
      isExpanded: typeof test.isExpanded === "boolean" ? test.isExpanded : true,
      result: normalizeResults(test.result),
    };

    switch (test.type as AtterbergTestType) {
      case "liquidLimit":
        return { ...base, type: "liquidLimit", trials: normalizeLiquidLimitTrials(test.trials) };
      case "plasticLimit":
        return { ...base, type: "plasticLimit", trials: normalizePlasticLimitTrials(test.trials) };
      case "shrinkageLimit":
        return {
          ...base,
          type: "shrinkageLimit",
          trials: normalizeShrinkageLimitTrials(test.trials),
          method: readString(test.method) as "volumetric" | "linear" | undefined,
        };
    }
  }

  return normalizeLegacyTest(test, index);
};

const normalizeRecord = (value: unknown, index: number): AtterbergRecord => {
  const record = isObject(value) ? value : {};
  const tests = Array.isArray(record.tests) ? record.tests.map((test, testIndex) => normalizeTest(test, testIndex)) : [];

  return {
    id: makeId("record"),
    title: readString(record.title) || readString(record.recordTitle) || `Record ${index + 1}`,
    label: readString(record.label),
    note: readString(record.note),
    isExpanded: typeof record.isExpanded === "boolean" ? record.isExpanded : true,
    tests,
    results: normalizeResults(record.results),
    // Record metadata (Phase 1)
    sampleNumber: readString(record.sampleNumber),
    dateSubmitted: readString(record.dateSubmitted),
    dateTested: readString(record.dateTested),
    testedBy: readString(record.testedBy),
  };
};

export const normalizeAtterbergProjectState = (value: unknown): AtterbergProjectState | null => {
  if (!isObject(value)) return null;

  // Extract project-level metadata
  const getProjectMetadata = (obj: Record<string, unknown>) => ({
    clientName: readString(obj.clientName),
    projectName: readString(obj.projectName),
    labOrganization: readString(obj.labOrganization),
    dateReported: readString(obj.dateReported),
    checkedBy: readString(obj.checkedBy),
  });

  if (Array.isArray(value.records)) {
    return {
      records: value.records.map((record, index) => normalizeRecord(record, index)),
      ...getProjectMetadata(value),
    };
  }

  if (isObject(value.project) && Array.isArray(value.project.records)) {
    return {
      records: value.project.records.map((record, index) => normalizeRecord(record, index)),
      ...getProjectMetadata(value.project),
    };
  }

  if (Array.isArray(value.tests)) {
    return {
      records: [
        {
          id: makeId("record"),
          title: "Record 1",
          label: "",
          note: "",
          isExpanded: true,
          tests: value.tests.map((test, index) => normalizeTest(test, index)),
          results: {},
        },
      ],
      ...getProjectMetadata(value),
    };
  }

  return null;
};

export const exportAsJSON = (data: AtterbergExportPayload) => JSON.stringify(data, null, 2);

export const downloadJSON = (jsonString: string, filename = "atterberg-project.json") => {
  const element = document.createElement("a");
  element.setAttribute("href", `data:text/plain;charset=utf-8,${encodeURIComponent(jsonString)}`);
  element.setAttribute("download", filename);
  element.style.display = "none";
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
};

export const importFromJSON = (jsonString: string): AtterbergProjectState | null => {
  try {
    return normalizeAtterbergProjectState(JSON.parse(jsonString));
  } catch (error) {
    console.error("Failed to parse JSON:", error);
    return null;
  }
};

export const createJSONDataUrl = (jsonString: string) => `data:text/plain;charset=utf-8,${encodeURIComponent(jsonString)}`;
