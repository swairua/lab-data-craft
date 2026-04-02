import { EnhancedAtterbergTest } from "@/context/TestDataContext";

/**
 * Export Atterberg tests as JSON
 */
export const exportAsJSON = (tests: EnhancedAtterbergTest[]): string => {
  const data = {
    exportDate: new Date().toISOString(),
    version: "1.0",
    tests: tests.map((test) => ({
      id: test.id,
      testTitle: test.testTitle,
      testType: test.testType,
      isExpanded: test.isExpanded,
      liquidLimitRows: test.liquidLimitRows,
      plasticLimitRows: test.plasticLimitRows,
      shrinkageLimitRows: test.shrinkageLimitRows,
      calculatedResults: test.calculatedResults,
    })),
  };

  return JSON.stringify(data, null, 2);
};

/**
 * Download JSON file
 */
export const downloadJSON = (jsonString: string, filename: string = "atterberg-tests.json") => {
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
export const importFromJSON = (jsonString: string): EnhancedAtterbergTest[] | null => {
  try {
    const data = JSON.parse(jsonString);

    // Validate structure
    if (!Array.isArray(data.tests)) {
      console.error("Invalid JSON structure: tests array not found");
      return null;
    }

    // Validate each test
    const tests: EnhancedAtterbergTest[] = data.tests.map((test: any) => {
      if (!test.id || !test.testTitle || !test.testType) {
        throw new Error("Invalid test data: missing required fields");
      }

      return {
        id: test.id,
        testTitle: test.testTitle,
        testType: test.testType,
        isExpanded: test.isExpanded ?? true,
        liquidLimitRows: Array.isArray(test.liquidLimitRows) ? test.liquidLimitRows : [],
        plasticLimitRows: Array.isArray(test.plasticLimitRows) ? test.plasticLimitRows : [],
        shrinkageLimitRows: Array.isArray(test.shrinkageLimitRows) ? test.shrinkageLimitRows : [],
        calculatedResults: test.calculatedResults ?? {},
      };
    });

    return tests;
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
