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

interface TestDataContextType {
  tests: Record<string, TestSummary>;
  updateTest: (id: string, data: Partial<Omit<TestSummary, "id">>) => void;
}

const defaultTests: Record<string, TestSummary> = {
  grading: { id: "grading", name: "Grading (Sieve Analysis)", category: "soil", status: "not-started", dataPoints: 0, keyResults: [] },
  atterberg: { id: "atterberg", name: "Atterberg Limits", category: "soil", status: "not-started", dataPoints: 0, keyResults: [] },
  proctor: { id: "proctor", name: "Proctor Test", category: "soil", status: "not-started", dataPoints: 0, keyResults: [] },
  cbr: { id: "cbr", name: "CBR", category: "soil", status: "not-started", dataPoints: 0, keyResults: [] },
  shear: { id: "shear", name: "Shear Test", category: "soil", status: "not-started", dataPoints: 0, keyResults: [] },
  consolidation: { id: "consolidation", name: "Consolidation", category: "soil", status: "not-started", dataPoints: 0, keyResults: [] },
  slump: { id: "slump", name: "Slump Test", category: "concrete", status: "not-started", dataPoints: 0, keyResults: [] },
  compressive: { id: "compressive", name: "Compressive Strength", category: "concrete", status: "not-started", dataPoints: 0, keyResults: [] },
  ucs: { id: "ucs", name: "UCS", category: "rock", status: "not-started", dataPoints: 0, keyResults: [] },
  pointload: { id: "pointload", name: "Point Load", category: "rock", status: "not-started", dataPoints: 0, keyResults: [] },
  porosity: { id: "porosity", name: "Porosity", category: "rock", status: "not-started", dataPoints: 0, keyResults: [] },
  spt: { id: "spt", name: "SPT", category: "special", status: "not-started", dataPoints: 0, keyResults: [] },
  dcp: { id: "dcp", name: "DCP", category: "special", status: "not-started", dataPoints: 0, keyResults: [] },
};

const TestDataContext = createContext<TestDataContextType>({
  tests: defaultTests,
  updateTest: () => {},
});

export const useTestData = () => useContext(TestDataContext);

export const TestDataProvider = ({ children }: { children: ReactNode }) => {
  const [tests, setTests] = useState<Record<string, TestSummary>>(defaultTests);

  const updateTest = useCallback((id: string, data: Partial<Omit<TestSummary, "id">>) => {
    setTests(prev => ({
      ...prev,
      [id]: { ...prev[id], ...data },
    }));
  }, []);

  return (
    <TestDataContext.Provider value={{ tests, updateTest }}>
      {children}
    </TestDataContext.Provider>
  );
};
