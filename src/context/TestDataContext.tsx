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

// Atterberg Limits specific types
export interface AtterbergRow {
  depth: string;
  ll: string;
  pl: string;
}

export interface AtterbergInstance {
  boreholeId: string;
  rows: AtterbergRow[];
}

interface TestDataContextType {
  tests: Record<string, TestSummary>;
  updateTest: (id: string, data: Partial<Omit<TestSummary, "id">>) => void;
  atterbergTests: AtterbergInstance[];
  addAtterbergInstance: (boreholeId: string) => void;
  removeAtterbergInstance: (boreholeId: string) => void;
  addAtterbergRow: (boreholeId: string) => void;
  removeAtterbergRow: (boreholeId: string, rowIndex: number) => void;
  updateAtterbergRow: (boreholeId: string, rowIndex: number, field: keyof AtterbergRow, value: string) => void;
  updateBoreholeId: (oldId: string, newId: string) => void;
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
  upvt: { id: "upvt", name: "UPVT", category: "concrete", status: "not-started", dataPoints: 0, keyResults: [] },
  schmidt: { id: "schmidt", name: "Schmidt Hammer", category: "concrete", status: "not-started", dataPoints: 0, keyResults: [] },
  coring: { id: "coring", name: "Coring", category: "concrete", status: "not-started", dataPoints: 0, keyResults: [] },
  cubes: { id: "cubes", name: "Concrete Cubes", category: "concrete", status: "not-started", dataPoints: 0, keyResults: [] },
  ucs: { id: "ucs", name: "UCS", category: "rock", status: "not-started", dataPoints: 0, keyResults: [] },
  pointload: { id: "pointload", name: "Point Load", category: "rock", status: "not-started", dataPoints: 0, keyResults: [] },
  porosity: { id: "porosity", name: "Porosity", category: "rock", status: "not-started", dataPoints: 0, keyResults: [] },
  spt: { id: "spt", name: "SPT", category: "special", status: "not-started", dataPoints: 0, keyResults: [] },
  dcp: { id: "dcp", name: "DCP", category: "special", status: "not-started", dataPoints: 0, keyResults: [] },
};

const TestDataContext = createContext<TestDataContextType>({
  tests: defaultTests,
  updateTest: () => {},
  atterbergTests: [],
  addAtterbergInstance: () => {},
  removeAtterbergInstance: () => {},
  addAtterbergRow: () => {},
  removeAtterbergRow: () => {},
  updateAtterbergRow: () => {},
  updateBoreholeId: () => {},
});

export const useTestData = () => useContext(TestDataContext);

export const TestDataProvider = ({ children }: { children: ReactNode }) => {
  const [tests, setTests] = useState<Record<string, TestSummary>>(defaultTests);
  const [atterbergTests, setAtterbergTests] = useState<AtterbergInstance[]>([]);

  const updateTest = useCallback((id: string, data: Partial<Omit<TestSummary, "id">>) => {
    setTests(prev => ({
      ...prev,
      [id]: { ...prev[id], ...data },
    }));
  }, []);

  const addAtterbergInstance = useCallback((boreholeId: string) => {
    setAtterbergTests(prev => [...prev, { boreholeId, rows: [{ depth: "", ll: "", pl: "" }] }]);
  }, []);

  const removeAtterbergInstance = useCallback((boreholeId: string) => {
    setAtterbergTests(prev => prev.filter(instance => instance.boreholeId !== boreholeId));
  }, []);

  const addAtterbergRow = useCallback((boreholeId: string) => {
    setAtterbergTests(prev =>
      prev.map(instance =>
        instance.boreholeId === boreholeId
          ? { ...instance, rows: [...instance.rows, { depth: "", ll: "", pl: "" }] }
          : instance
      )
    );
  }, []);

  const removeAtterbergRow = useCallback((boreholeId: string, rowIndex: number) => {
    setAtterbergTests(prev =>
      prev.map(instance =>
        instance.boreholeId === boreholeId
          ? { ...instance, rows: instance.rows.filter((_, i) => i !== rowIndex) }
          : instance
      )
    );
  }, []);

  const updateAtterbergRow = useCallback((boreholeId: string, rowIndex: number, field: keyof AtterbergRow, value: string) => {
    setAtterbergTests(prev =>
      prev.map(instance =>
        instance.boreholeId === boreholeId
          ? {
              ...instance,
              rows: instance.rows.map((row, i) =>
                i === rowIndex ? { ...row, [field]: value } : row
              ),
            }
          : instance
      )
    );
  }, []);

  const updateBoreholeId = useCallback((oldId: string, newId: string) => {
    setAtterbergTests(prev =>
      prev.map(instance =>
        instance.boreholeId === oldId ? { ...instance, boreholeId: newId } : instance
      )
    );
  }, []);

  return (
    <TestDataContext.Provider
      value={{
        tests,
        updateTest,
        atterbergTests,
        addAtterbergInstance,
        removeAtterbergInstance,
        addAtterbergRow,
        removeAtterbergRow,
        updateAtterbergRow,
        updateBoreholeId,
      }}
    >
      {children}
    </TestDataContext.Provider>
  );
};
