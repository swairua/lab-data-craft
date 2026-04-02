import type { CalculatedResults, EnhancedAtterbergTest } from "@/context/TestDataContext";

export interface AtterbergRecord {
  id: string;
  recordTitle: string;
  isExpanded: boolean;
  tests: EnhancedAtterbergTest[];
  results: CalculatedResults;
}

export interface AtterbergProjectState {
  records: AtterbergRecord[];
}

export interface AtterbergExportPayload {
  exportDate: string;
  version: string;
  project: {
    title?: string;
    clientName?: string;
    date?: string;
    records: AtterbergRecord[];
  };
}

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const normalizeResults = (value: unknown): CalculatedResults => {
  if (!isObject(value)) return {};

  return {
    liquidLimit: typeof value.liquidLimit === "number" ? value.liquidLimit : undefined,
    plasticLimit: typeof value.plasticLimit === "number" ? value.plasticLimit : undefined,
    shrinkageLimit: typeof value.shrinkageLimit === "number" ? value.shrinkageLimit : undefined,
    plasticityIndex: typeof value.plasticityIndex === "number" ? value.plasticityIndex : undefined,
  };
};

const normalizeTest = (value: unknown, index: number): EnhancedAtterbergTest => {
  const test = isObject(value) ? value : {};

  return {
    id: typeof test.id === "string" && test.id ? test.id : `test-${Date.now()}-${index}`,
    testTitle: typeof test.testTitle === "string" && test.testTitle ? test.testTitle : `Test ${index + 1}`,
    testType:
      test.testType === "liquidLimit" || test.testType === "plasticLimit" || test.testType === "shrinkageLimit"
        ? test.testType
        : "liquidLimit",
    isExpanded: typeof test.isExpanded === "boolean" ? test.isExpanded : true,
    liquidLimitRows: Array.isArray(test.liquidLimitRows) ? test.liquidLimitRows : [{ trialNo: "1", blows: "", moisture: "" }],
    plasticLimitRows: Array.isArray(test.plasticLimitRows) ? test.plasticLimitRows : [{ trialNo: "1", moisture: "" }],
    shrinkageLimitRows: Array.isArray(test.shrinkageLimitRows)
      ? test.shrinkageLimitRows
      : [{ initialVolume: "", finalVolume: "", moisture: "" }],
    calculatedResults: normalizeResults(test.calculatedResults),
  };
};

const normalizeRecord = (value: unknown, index: number): AtterbergRecord => {
  const record = isObject(value) ? value : {};
  const tests = Array.isArray(record.tests) ? record.tests.map((test, testIndex) => normalizeTest(test, testIndex)) : [];

  return {
    id: typeof record.id === "string" && record.id ? record.id : `record-${Date.now()}-${index}`,
    recordTitle: typeof record.recordTitle === "string" && record.recordTitle ? record.recordTitle : `Record ${index + 1}`,
    isExpanded: typeof record.isExpanded === "boolean" ? record.isExpanded : true,
    tests,
    results: normalizeResults(record.results),
  };
};

/**
 * Export nested Atterberg project data as JSON
 */
export const exportAsJSON = (data: AtterbergExportPayload): string => {
  return JSON.stringify(data, null, 2);
};

/**
 * Download JSON file
 */
export const downloadJSON = (jsonString: string, filename: string = "atterberg-project.json") => {
  const element = document.createElement("a");
  element.setAttribute("href", `data:text/plain;charset=utf-8,${encodeURIComponent(jsonString)}`);
  element.setAttribute("download", filename);
  element.style.display = "none";
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
};

/**
 * Parse and validate imported JSON
 */
export const importFromJSON = (jsonString: string): AtterbergProjectState | null => {
  try {
    const data = JSON.parse(jsonString);

    if (isObject(data) && isObject(data.project) && Array.isArray(data.project.records)) {
      return {
        records: data.project.records.map((record, index) => normalizeRecord(record, index)),
      };
    }

    if (isObject(data) && Array.isArray(data.records)) {
      return {
        records: data.records.map((record, index) => normalizeRecord(record, index)),
      };
    }

    if (isObject(data) && Array.isArray(data.tests)) {
      return {
        records: [
          {
            id: `record-${Date.now()}`,
            recordTitle: "Record 1",
            isExpanded: true,
            tests: data.tests.map((test, index) => normalizeTest(test, index)),
            results: {},
          },
        ],
      };
    }

    console.error("Invalid JSON structure: records array not found");
    return null;
  } catch (error) {
    console.error("Failed to parse JSON:", error);
    return null;
  }
};

/**
 * Create a data URL for JSON download (for use in href)
 */
export const createJSONDataUrl = (jsonString: string): string => {
  return `data:text/plain;charset=utf-8,${encodeURIComponent(jsonString)}`;
};
