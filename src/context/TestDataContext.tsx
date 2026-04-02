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

// New enhanced Atterberg types for multiple test types
export type AtterbergTestType = "liquidLimit" | "plasticLimit" | "shrinkageLimit";

export interface LiquidLimitRow {
  trialNo: string;
  blows: string;
  moisture: string;
}

export interface PlasticLimitRow {
  trialNo: string;
  moisture: string;
}

export interface ShrinkageLimitRow {
  initialVolume: string;
  finalVolume: string;
  moisture: string;
}

export interface CalculatedResults {
  liquidLimit?: number;
  plasticLimit?: number;
  shrinkageLimit?: number;
  plasticityIndex?: number;
}

export interface AtterbergInstance {
  // Legacy fields (kept for backward compatibility)
  boreholeId: string;
  rows: AtterbergRow[];
}

// Enhanced Atterberg test instance supporting multiple test types
export interface EnhancedAtterbergTest {
  id: string;
  testTitle: string;
  testType: AtterbergTestType;
  isExpanded: boolean;
  liquidLimitRows: LiquidLimitRow[];
  plasticLimitRows: PlasticLimitRow[];
  shrinkageLimitRows: ShrinkageLimitRow[];
  calculatedResults: CalculatedResults;
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
  // Enhanced Atterberg test methods
  enhancedAtterbergTests: EnhancedAtterbergTest[];
  addEnhancedAtterbergTest: (testType: AtterbergTestType) => void;
  removeEnhancedAtterbergTest: (testId: string) => void;
  updateEnhancedTestTitle: (testId: string, title: string) => void;
  updateEnhancedTestType: (testId: string, type: AtterbergTestType) => void;
  toggleEnhancedTestExpanded: (testId: string) => void;
  addLiquidLimitRow: (testId: string) => void;
  removeLiquidLimitRow: (testId: string, rowIndex: number) => void;
  updateLiquidLimitRow: (testId: string, rowIndex: number, field: keyof LiquidLimitRow, value: string) => void;
  addPlasticLimitRow: (testId: string) => void;
  removePlasticLimitRow: (testId: string, rowIndex: number) => void;
  updatePlasticLimitRow: (testId: string, rowIndex: number, field: keyof PlasticLimitRow, value: string) => void;
  addShrinkageLimitRow: (testId: string) => void;
  removeShrinkageLimitRow: (testId: string, rowIndex: number) => void;
  updateShrinkageLimitRow: (testId: string, rowIndex: number, field: keyof ShrinkageLimitRow, value: string) => void;
  updateCalculatedResults: (testId: string, results: CalculatedResults) => void;
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
  // Enhanced Atterberg defaults
  enhancedAtterbergTests: [],
  addEnhancedAtterbergTest: () => {},
  removeEnhancedAtterbergTest: () => {},
  updateEnhancedTestTitle: () => {},
  updateEnhancedTestType: () => {},
  toggleEnhancedTestExpanded: () => {},
  addLiquidLimitRow: () => {},
  removeLiquidLimitRow: () => {},
  updateLiquidLimitRow: () => {},
  addPlasticLimitRow: () => {},
  removePlasticLimitRow: () => {},
  updatePlasticLimitRow: () => {},
  addShrinkageLimitRow: () => {},
  removeShrinkageLimitRow: () => {},
  updateShrinkageLimitRow: () => {},
  updateCalculatedResults: () => {},
});

export const useTestData = () => useContext(TestDataContext);

export const TestDataProvider = ({ children }: { children: ReactNode }) => {
  const [tests, setTests] = useState<Record<string, TestSummary>>(defaultTests);
  const [atterbergTests, setAtterbergTests] = useState<AtterbergInstance[]>([]);
  const [enhancedAtterbergTests, setEnhancedAtterbergTests] = useState<EnhancedAtterbergTest[]>([]);

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

  // Enhanced Atterberg test methods
  const addEnhancedAtterbergTest = useCallback((testType: AtterbergTestType) => {
    const newTest: EnhancedAtterbergTest = {
      id: `test-${Date.now()}`,
      testTitle: `Test ${enhancedAtterbergTests.length + 1}`,
      testType,
      isExpanded: true,
      liquidLimitRows: [{ trialNo: "1", blows: "", moisture: "" }],
      plasticLimitRows: [{ trialNo: "1", moisture: "" }],
      shrinkageLimitRows: [{ initialVolume: "", finalVolume: "", moisture: "" }],
      calculatedResults: {},
    };
    setEnhancedAtterbergTests(prev => [...prev, newTest]);
  }, [enhancedAtterbergTests.length]);

  const removeEnhancedAtterbergTest = useCallback((testId: string) => {
    setEnhancedAtterbergTests(prev => prev.filter(test => test.id !== testId));
  }, []);

  const updateEnhancedTestTitle = useCallback((testId: string, title: string) => {
    setEnhancedAtterbergTests(prev =>
      prev.map(test => test.id === testId ? { ...test, testTitle: title } : test)
    );
  }, []);

  const updateEnhancedTestType = useCallback((testId: string, type: AtterbergTestType) => {
    setEnhancedAtterbergTests(prev =>
      prev.map(test => test.id === testId ? { ...test, testType: type } : test)
    );
  }, []);

  const toggleEnhancedTestExpanded = useCallback((testId: string) => {
    setEnhancedAtterbergTests(prev =>
      prev.map(test => test.id === testId ? { ...test, isExpanded: !test.isExpanded } : test)
    );
  }, []);

  const addLiquidLimitRow = useCallback((testId: string) => {
    setEnhancedAtterbergTests(prev =>
      prev.map(test => {
        if (test.id === testId) {
          const newTrialNo = (test.liquidLimitRows.length + 1).toString();
          return {
            ...test,
            liquidLimitRows: [...test.liquidLimitRows, { trialNo: newTrialNo, blows: "", moisture: "" }],
          };
        }
        return test;
      })
    );
  }, []);

  const removeLiquidLimitRow = useCallback((testId: string, rowIndex: number) => {
    setEnhancedAtterbergTests(prev =>
      prev.map(test => {
        if (test.id === testId) {
          return {
            ...test,
            liquidLimitRows: test.liquidLimitRows.filter((_, i) => i !== rowIndex),
          };
        }
        return test;
      })
    );
  }, []);

  const updateLiquidLimitRow = useCallback((testId: string, rowIndex: number, field: keyof LiquidLimitRow, value: string) => {
    setEnhancedAtterbergTests(prev =>
      prev.map(test => {
        if (test.id === testId) {
          return {
            ...test,
            liquidLimitRows: test.liquidLimitRows.map((row, i) =>
              i === rowIndex ? { ...row, [field]: value } : row
            ),
          };
        }
        return test;
      })
    );
  }, []);

  const addPlasticLimitRow = useCallback((testId: string) => {
    setEnhancedAtterbergTests(prev =>
      prev.map(test => {
        if (test.id === testId) {
          const newTrialNo = (test.plasticLimitRows.length + 1).toString();
          return {
            ...test,
            plasticLimitRows: [...test.plasticLimitRows, { trialNo: newTrialNo, moisture: "" }],
          };
        }
        return test;
      })
    );
  }, []);

  const removePlasticLimitRow = useCallback((testId: string, rowIndex: number) => {
    setEnhancedAtterbergTests(prev =>
      prev.map(test => {
        if (test.id === testId) {
          return {
            ...test,
            plasticLimitRows: test.plasticLimitRows.filter((_, i) => i !== rowIndex),
          };
        }
        return test;
      })
    );
  }, []);

  const updatePlasticLimitRow = useCallback((testId: string, rowIndex: number, field: keyof PlasticLimitRow, value: string) => {
    setEnhancedAtterbergTests(prev =>
      prev.map(test => {
        if (test.id === testId) {
          return {
            ...test,
            plasticLimitRows: test.plasticLimitRows.map((row, i) =>
              i === rowIndex ? { ...row, [field]: value } : row
            ),
          };
        }
        return test;
      })
    );
  }, []);

  const addShrinkageLimitRow = useCallback((testId: string) => {
    setEnhancedAtterbergTests(prev =>
      prev.map(test => {
        if (test.id === testId) {
          return {
            ...test,
            shrinkageLimitRows: [...test.shrinkageLimitRows, { initialVolume: "", finalVolume: "", moisture: "" }],
          };
        }
        return test;
      })
    );
  }, []);

  const removeShrinkageLimitRow = useCallback((testId: string, rowIndex: number) => {
    setEnhancedAtterbergTests(prev =>
      prev.map(test => {
        if (test.id === testId) {
          return {
            ...test,
            shrinkageLimitRows: test.shrinkageLimitRows.filter((_, i) => i !== rowIndex),
          };
        }
        return test;
      })
    );
  }, []);

  const updateShrinkageLimitRow = useCallback((testId: string, rowIndex: number, field: keyof ShrinkageLimitRow, value: string) => {
    setEnhancedAtterbergTests(prev =>
      prev.map(test => {
        if (test.id === testId) {
          return {
            ...test,
            shrinkageLimitRows: test.shrinkageLimitRows.map((row, i) =>
              i === rowIndex ? { ...row, [field]: value } : row
            ),
          };
        }
        return test;
      })
    );
  }, []);

  const updateCalculatedResults = useCallback((testId: string, results: CalculatedResults) => {
    setEnhancedAtterbergTests(prev =>
      prev.map(test => test.id === testId ? { ...test, calculatedResults: results } : test)
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
        enhancedAtterbergTests,
        addEnhancedAtterbergTest,
        removeEnhancedAtterbergTest,
        updateEnhancedTestTitle,
        updateEnhancedTestType,
        toggleEnhancedTestExpanded,
        addLiquidLimitRow,
        removeLiquidLimitRow,
        updateLiquidLimitRow,
        addPlasticLimitRow,
        removePlasticLimitRow,
        updatePlasticLimitRow,
        addShrinkageLimitRow,
        removeShrinkageLimitRow,
        updateShrinkageLimitRow,
        updateCalculatedResults,
      }}
    >
      {children}
    </TestDataContext.Provider>
  );
};
