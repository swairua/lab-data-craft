import { createContext, useContext, useState, useCallback, ReactNode } from "react";

export type TestStatus = "not-started" | "in-progress" | "completed";

export interface TestSummary {
  id: string;
  name: string;
  category: "soil" | "concrete" | "rock" | "special";
  status: TestStatus;
  dataPoints: number;
  keyResults: { label: string; value: string }[];
}

// Tests are now keyed by `${boreholeId}::${testId}`
interface TestDataContextType {
  tests: Record<string, TestSummary>;
  updateTest: (id: string, data: Partial<Omit<TestSummary, "id">>) => void;
  getBoreholeTests: (boreholeId: string) => Record<string, TestSummary>;
  getAllTests: () => Record<string, TestSummary>;
}

const defaultTestDefs: Omit<TestSummary, "id">[] = [
  { name: "Grading (Sieve Analysis)", category: "soil", status: "not-started", dataPoints: 0, keyResults: [] },
  { name: "Atterberg Limits", category: "soil", status: "not-started", dataPoints: 0, keyResults: [] },
  { name: "Proctor Test", category: "soil", status: "not-started", dataPoints: 0, keyResults: [] },
  { name: "CBR", category: "soil", status: "not-started", dataPoints: 0, keyResults: [] },
  { name: "Shear Test", category: "soil", status: "not-started", dataPoints: 0, keyResults: [] },
  { name: "Consolidation", category: "soil", status: "not-started", dataPoints: 0, keyResults: [] },
  { name: "Slump Test", category: "concrete", status: "not-started", dataPoints: 0, keyResults: [] },
  { name: "Compressive Strength", category: "concrete", status: "not-started", dataPoints: 0, keyResults: [] },
  { name: "UPVT", category: "concrete", status: "not-started", dataPoints: 0, keyResults: [] },
  { name: "Schmidt Hammer", category: "concrete", status: "not-started", dataPoints: 0, keyResults: [] },
  { name: "Coring", category: "concrete", status: "not-started", dataPoints: 0, keyResults: [] },
  { name: "Concrete Cubes", category: "concrete", status: "not-started", dataPoints: 0, keyResults: [] },
  { name: "UCS", category: "rock", status: "not-started", dataPoints: 0, keyResults: [] },
  { name: "Point Load", category: "rock", status: "not-started", dataPoints: 0, keyResults: [] },
  { name: "Porosity", category: "rock", status: "not-started", dataPoints: 0, keyResults: [] },
  { name: "SPT", category: "special", status: "not-started", dataPoints: 0, keyResults: [] },
  { name: "DCP", category: "special", status: "not-started", dataPoints: 0, keyResults: [] },
];

const testKeys = [
  "grading", "atterberg", "proctor", "cbr", "shear", "consolidation",
  "slump", "compressive", "upvt", "schmidt", "coring", "cubes",
  "ucs", "pointload", "porosity", "spt", "dcp",
];

export function buildDefaultTestsForBorehole(boreholeId: string): Record<string, TestSummary> {
  const result: Record<string, TestSummary> = {};
  testKeys.forEach((key, i) => {
    const compositeKey = `${boreholeId}::${key}`;
    result[compositeKey] = { id: compositeKey, ...defaultTestDefs[i] };
  });
  return result;
}

const initialTests = buildDefaultTestsForBorehole("bh-1");

const TestDataContext = createContext<TestDataContextType>({
  tests: initialTests,
  updateTest: () => {},
  getBoreholeTests: () => ({}),
  getAllTests: () => ({}),
});

export const useTestData = () => useContext(TestDataContext);

export const TestDataProvider = ({ children }: { children: ReactNode }) => {
  const [tests, setTests] = useState<Record<string, TestSummary>>(initialTests);

  const updateTest = useCallback((id: string, data: Partial<Omit<TestSummary, "id">>) => {
    setTests(prev => {
      // Auto-initialize if key doesn't exist yet (new borehole)
      const existing = prev[id];
      if (!existing) {
        const parts = id.split("::");
        const testKey = parts[1] || parts[0];
        const idx = testKeys.indexOf(testKey);
        const base = idx >= 0 ? defaultTestDefs[idx] : { name: testKey, category: "soil" as const, status: "not-started" as const, dataPoints: 0, keyResults: [] };
        return { ...prev, [id]: { id, ...base, ...data } };
      }
      return { ...prev, [id]: { ...existing, ...data } };
    });
  }, []);

  const getBoreholeTests = useCallback((boreholeId: string): Record<string, TestSummary> => {
    const prefix = `${boreholeId}::`;
    const result: Record<string, TestSummary> = {};
    for (const [key, val] of Object.entries(tests)) {
      if (key.startsWith(prefix)) {
        // Strip prefix for backward-compat display
        const shortKey = key.slice(prefix.length);
        result[shortKey] = { ...val, id: shortKey };
      }
    }
    return result;
  }, [tests]);

  const getAllTests = useCallback(() => tests, [tests]);

  return (
    <TestDataContext.Provider value={{ tests, updateTest, getBoreholeTests, getAllTests }}>
      {children}
    </TestDataContext.Provider>
  );
};
