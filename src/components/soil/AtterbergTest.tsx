import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronRight, Download, Plus, Trash2, Upload } from "lucide-react";

import TestSection from "@/components/TestSection";
import AtterbergTestCard from "./AtterbergTestCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { useProject } from "@/context/ProjectContext";
import { useTestData } from "@/context/TestDataContext";
import { useTestReport } from "@/hooks/useTestReport";
import { generateTestCSV } from "@/lib/csvExporter";
import { generateTestPDF } from "@/lib/pdfGenerator";
import { calculatePlasticityIndex } from "@/lib/atterbergCalculations";
import {
  downloadJSON,
  exportAsJSON,
  importFromJSON,
  type AtterbergExportPayload,
  type AtterbergProjectState,
  type AtterbergRecord,
} from "@/lib/jsonExporter";
import { toast } from "sonner";
import type {
  CalculatedResults,
  EnhancedAtterbergTest,
  LiquidLimitRow,
  PlasticLimitRow,
  ShrinkageLimitRow,
} from "@/context/TestDataContext";

const STORAGE_KEY = "atterbergProjectState";

type AtterbergTestType = EnhancedAtterbergTest["testType"];
type ComputedRecord = AtterbergRecord & {
  results: CalculatedResults;
  dataPoints: number;
  completedTests: number;
};

const makeId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const createLiquidLimitRows = (): LiquidLimitRow[] => [{ trialNo: "1", blows: "", moisture: "" }];
const createPlasticLimitRows = (): PlasticLimitRow[] => [{ trialNo: "1", moisture: "" }];
const createShrinkageLimitRows = (): ShrinkageLimitRow[] => [{ initialVolume: "", finalVolume: "", moisture: "" }];

const getTestLabel = (type: AtterbergTestType) => {
  const labels: Record<AtterbergTestType, string> = {
    liquidLimit: "Liquid Limit",
    plasticLimit: "Plastic Limit",
    shrinkageLimit: "Shrinkage Limit",
  };
  return labels[type];
};

const createTest = (type: AtterbergTestType, index: number): EnhancedAtterbergTest => ({
  id: makeId("test"),
  testTitle: `${getTestLabel(type)} ${index + 1}`,
  testType: type,
  isExpanded: true,
  liquidLimitRows: createLiquidLimitRows(),
  plasticLimitRows: createPlasticLimitRows(),
  shrinkageLimitRows: createShrinkageLimitRows(),
  calculatedResults: {},
});

const createRecord = (index: number): AtterbergRecord => ({
  id: makeId("record"),
  recordTitle: `Record ${index + 1}`,
  isExpanded: true,
  tests: [],
  results: {},
});

const average = (values: number[]) => {
  if (values.length === 0) return null;
  return parseFloat((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(2));
};

const isFilled = (value: string | undefined | null) => Boolean(value && value.trim().length > 0);
const isLiquidRowValid = (row: LiquidLimitRow) => isFilled(row.blows) && isFilled(row.moisture) && !Number.isNaN(Number(row.blows)) && !Number.isNaN(Number(row.moisture));
const isPlasticRowValid = (row: PlasticLimitRow) => isFilled(row.moisture) && !Number.isNaN(Number(row.moisture));
const isShrinkageRowValid = (row: ShrinkageLimitRow) =>
  isFilled(row.initialVolume) && isFilled(row.finalVolume) && isFilled(row.moisture) &&
  !Number.isNaN(Number(row.initialVolume)) && !Number.isNaN(Number(row.finalVolume)) && !Number.isNaN(Number(row.moisture));

const countDataPoints = (test: EnhancedAtterbergTest) => {
  switch (test.testType) {
    case "liquidLimit":
      return test.liquidLimitRows.filter(isLiquidRowValid).length;
    case "plasticLimit":
      return test.plasticLimitRows.filter(isPlasticRowValid).length;
    case "shrinkageLimit":
      return test.shrinkageLimitRows.filter(isShrinkageRowValid).length;
    default:
      return 0;
  }
};

const getActiveResult = (test: EnhancedAtterbergTest) => {
  switch (test.testType) {
    case "liquidLimit":
      return test.calculatedResults.liquidLimit ?? null;
    case "plasticLimit":
      return test.calculatedResults.plasticLimit ?? null;
    case "shrinkageLimit":
      return test.calculatedResults.shrinkageLimit ?? null;
    default:
      return null;
  }
};

const computeRecordResults = (record: AtterbergRecord): CalculatedResults => {
  const llValues: number[] = [];
  const plValues: number[] = [];
  const slValues: number[] = [];

  record.tests.forEach((test) => {
    const result = getActiveResult(test);
    if (result === null) return;

    if (test.testType === "liquidLimit") llValues.push(result);
    if (test.testType === "plasticLimit") plValues.push(result);
    if (test.testType === "shrinkageLimit") slValues.push(result);
  });

  const liquidLimit = average(llValues);
  const plasticLimit = average(plValues);
  const shrinkageLimit = average(slValues);

  return {
    liquidLimit: liquidLimit ?? undefined,
    plasticLimit: plasticLimit ?? undefined,
    shrinkageLimit: shrinkageLimit ?? undefined,
    plasticityIndex: liquidLimit !== null && plasticLimit !== null ? calculatePlasticityIndex(liquidLimit, plasticLimit) ?? undefined : undefined,
  };
};

const computeRecordDataPoints = (record: AtterbergRecord) => record.tests.reduce((sum, test) => sum + countDataPoints(test), 0);

const stripEmptyRows = <T extends object>(rows: T[], predicate: (row: T) => boolean) => rows.filter(predicate);

const normalizeStoredState = (value: unknown): AtterbergProjectState | null => {
  if (!value || typeof value !== "object") return null;
  const data = value as Record<string, unknown>;

  if (Array.isArray(data.records)) {
    return { records: data.records as AtterbergRecord[] };
  }

  if (data.project && typeof data.project === "object" && Array.isArray((data.project as Record<string, unknown>).records)) {
    return { records: (data.project as Record<string, unknown>).records as AtterbergRecord[] };
  }

  if (Array.isArray(data.tests)) {
    return {
      records: [
        {
          id: makeId("record"),
          recordTitle: "Record 1",
          isExpanded: true,
          tests: data.tests as EnhancedAtterbergTest[],
          results: {},
        },
      ],
    };
  }

  return null;
};

const AtterbergTest = () => {
  const project = useProject();
  const { updateTest: updateTestSummary } = useTestData();
  const [projectState, setProjectState] = useState<AtterbergProjectState>({ records: [] });
  const hydratedRef = useRef(false);

  useEffect(() => {
    if (hydratedRef.current) return;
    hydratedRef.current = true;

    const saved = localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem("enhancedAtterbergTests");
    if (!saved) return;

    try {
      const parsed = normalizeStoredState(JSON.parse(saved));
      if (parsed) setProjectState(parsed);
    } catch (error) {
      console.error("Failed to restore Atterberg project:", error);
    }
  }, []);

  useEffect(() => {
    if (!hydratedRef.current) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projectState));
  }, [projectState]);

  const updateRecord = useCallback((recordId: string, updater: (record: AtterbergRecord) => AtterbergRecord) => {
    setProjectState((prev) => ({
      records: prev.records.map((record) => (record.id === recordId ? updater(record) : record)),
    }));
  }, []);

  const updateTestInRecord = useCallback(
    (recordId: string, testId: string, updater: (test: EnhancedAtterbergTest) => EnhancedAtterbergTest) => {
      updateRecord(recordId, (record) => ({
        ...record,
        tests: record.tests.map((test) => (test.id === testId ? updater(test) : test)),
      }));
    },
    [updateRecord]
  );

  const addRecord = useCallback(() => {
    setProjectState((prev) => ({ records: [...prev.records, createRecord(prev.records.length)] }));
  }, []);

  const removeRecord = useCallback((recordId: string) => {
    setProjectState((prev) => ({ records: prev.records.filter((record) => record.id !== recordId) }));
  }, []);

  const updateRecordTitle = useCallback((recordId: string, title: string) => {
    updateRecord(recordId, (record) => ({ ...record, recordTitle: title }));
  }, [updateRecord]);

  const toggleRecordExpanded = useCallback((recordId: string) => {
    updateRecord(recordId, (record) => ({ ...record, isExpanded: !record.isExpanded }));
  }, [updateRecord]);

  const addTest = useCallback((recordId: string, type: AtterbergTestType = "liquidLimit") => {
    updateRecord(recordId, (record) => ({
      ...record,
      isExpanded: true,
      tests: [...record.tests, createTest(type, record.tests.length)],
    }));
  }, [updateRecord]);

  const removeTest = useCallback((recordId: string, testId: string) => {
    updateRecord(recordId, (record) => ({
      ...record,
      tests: record.tests.filter((test) => test.id !== testId),
    }));
  }, [updateRecord]);

  const updateTestTitle = useCallback((recordId: string, testId: string, title: string) => {
    updateTestInRecord(recordId, testId, (test) => ({ ...test, testTitle: title }));
  }, [updateTestInRecord]);

  const updateTestType = useCallback((recordId: string, testId: string, type: AtterbergTestType) => {
    updateTestInRecord(recordId, testId, (test) => ({ ...test, testType: type, isExpanded: true }));
  }, [updateTestInRecord]);

  const toggleTestExpanded = useCallback((recordId: string, testId: string) => {
    updateTestInRecord(recordId, testId, (test) => ({ ...test, isExpanded: !test.isExpanded }));
  }, [updateTestInRecord]);

  const updateLiquidLimitRow = useCallback((recordId: string, testId: string, rowIndex: number, field: keyof LiquidLimitRow, value: string) => {
    updateTestInRecord(recordId, testId, (test) => ({
      ...test,
      liquidLimitRows: test.liquidLimitRows.map((row, index) => (index === rowIndex ? { ...row, [field]: value } : row)),
    }));
  }, [updateTestInRecord]);

  const addLiquidLimitRow = useCallback((recordId: string, testId: string) => {
    updateTestInRecord(recordId, testId, (test) => ({
      ...test,
      liquidLimitRows: [...test.liquidLimitRows, { trialNo: String(test.liquidLimitRows.length + 1), blows: "", moisture: "" }],
    }));
  }, [updateTestInRecord]);

  const removeLiquidLimitRow = useCallback((recordId: string, testId: string, rowIndex: number) => {
    updateTestInRecord(recordId, testId, (test) => {
      const nextRows = test.liquidLimitRows.length > 1 ? test.liquidLimitRows.filter((_, index) => index !== rowIndex) : createLiquidLimitRows();
      return { ...test, liquidLimitRows: nextRows.map((row, index) => ({ ...row, trialNo: String(index + 1) })) };
    });
  }, [updateTestInRecord]);

  const updatePlasticLimitRow = useCallback((recordId: string, testId: string, rowIndex: number, field: keyof PlasticLimitRow, value: string) => {
    updateTestInRecord(recordId, testId, (test) => ({
      ...test,
      plasticLimitRows: test.plasticLimitRows.map((row, index) => (index === rowIndex ? { ...row, [field]: value } : row)),
    }));
  }, [updateTestInRecord]);

  const addPlasticLimitRow = useCallback((recordId: string, testId: string) => {
    updateTestInRecord(recordId, testId, (test) => ({
      ...test,
      plasticLimitRows: [...test.plasticLimitRows, { trialNo: String(test.plasticLimitRows.length + 1), moisture: "" }],
    }));
  }, [updateTestInRecord]);

  const removePlasticLimitRow = useCallback((recordId: string, testId: string, rowIndex: number) => {
    updateTestInRecord(recordId, testId, (test) => {
      const nextRows = test.plasticLimitRows.length > 1 ? test.plasticLimitRows.filter((_, index) => index !== rowIndex) : createPlasticLimitRows();
      return { ...test, plasticLimitRows: nextRows.map((row, index) => ({ ...row, trialNo: String(index + 1) })) };
    });
  }, [updateTestInRecord]);

  const updateShrinkageLimitRow = useCallback((recordId: string, testId: string, rowIndex: number, field: keyof ShrinkageLimitRow, value: string) => {
    updateTestInRecord(recordId, testId, (test) => ({
      ...test,
      shrinkageLimitRows: test.shrinkageLimitRows.map((row, index) => (index === rowIndex ? { ...row, [field]: value } : row)),
    }));
  }, [updateTestInRecord]);

  const addShrinkageLimitRow = useCallback((recordId: string, testId: string) => {
    updateTestInRecord(recordId, testId, (test) => ({
      ...test,
      shrinkageLimitRows: [...test.shrinkageLimitRows, { initialVolume: "", finalVolume: "", moisture: "" }],
    }));
  }, [updateTestInRecord]);

  const removeShrinkageLimitRow = useCallback((recordId: string, testId: string, rowIndex: number) => {
    updateTestInRecord(recordId, testId, (test) => ({
      ...test,
      shrinkageLimitRows: test.shrinkageLimitRows.length > 1 ? test.shrinkageLimitRows.filter((_, index) => index !== rowIndex) : createShrinkageLimitRows(),
    }));
  }, [updateTestInRecord]);

  const updateCalculatedResults = useCallback((recordId: string, testId: string, results: CalculatedResults) => {
    updateTestInRecord(recordId, testId, (test) => ({
      ...test,
      calculatedResults: {
        ...test.calculatedResults,
        ...results,
      },
    }));
  }, [updateTestInRecord]);

  const computedRecords = useMemo<ComputedRecord[]>(() => {
    return projectState.records.map((record) => ({
      ...record,
      results: computeRecordResults(record),
      dataPoints: computeRecordDataPoints(record),
      completedTests: record.tests.filter((test) => getActiveResult(test) !== null).length,
    }));
  }, [projectState.records]);

  const { totalDataPoints, aggregateResults, hasCompletedContent } = useMemo(() => {
    const llValues: number[] = [];
    const plValues: number[] = [];
    const slValues: number[] = [];
    let totalPoints = 0;
    let completedTests = 0;

    computedRecords.forEach((record) => {
      totalPoints += record.dataPoints;
      completedTests += record.completedTests;

      if (record.results.liquidLimit !== undefined) llValues.push(record.results.liquidLimit);
      if (record.results.plasticLimit !== undefined) plValues.push(record.results.plasticLimit);
      if (record.results.shrinkageLimit !== undefined) slValues.push(record.results.shrinkageLimit);
    });

    const ll = average(llValues);
    const pl = average(plValues);
    const sl = average(slValues);
    const pi = ll !== null && pl !== null ? calculatePlasticityIndex(ll, pl) : null;

    return {
      totalDataPoints: totalPoints,
      aggregateResults: [
        { label: "Avg LL", value: ll !== null ? `${ll}%` : "" },
        { label: "Avg PL", value: pl !== null ? `${pl}%` : "" },
        { label: "Avg SL", value: sl !== null ? `${sl}%` : "" },
        { label: "Avg PI", value: pi !== null ? `${pi}%` : "" },
        { label: "Records", value: `${computedRecords.length}` },
      ],
      hasCompletedContent: completedTests > 0,
    };
  }, [computedRecords]);

  useTestReport("atterberg", totalDataPoints, aggregateResults);

  const handleSave = useCallback(() => {
    const status = totalDataPoints === 0 ? "not-started" : hasCompletedContent ? "completed" : "in-progress";
    updateTestSummary("atterberg", {
      status,
      dataPoints: totalDataPoints,
      keyResults: aggregateResults.filter((item) => item.value),
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projectState));
    toast.success("Atterberg project saved");
  }, [aggregateResults, hasCompletedContent, projectState, totalDataPoints, updateTestSummary]);

  const handleClearAll = useCallback(() => {
    setProjectState({ records: [] });
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem("enhancedAtterbergTests");
    updateTestSummary("atterberg", {
      status: "not-started",
      dataPoints: 0,
      keyResults: [],
    });
    toast.success("Atterberg project cleared");
  }, [updateTestSummary]);

  const buildExportPayload = useCallback((): AtterbergExportPayload => {
    return {
      exportDate: new Date().toISOString(),
      version: "2.0",
      project: {
        title: project.projectName || "Atterberg Limits Testing",
        clientName: project.clientName,
        date: project.date,
        records: computedRecords.map(({ dataPoints, completedTests, ...record }) => ({
          ...record,
          tests: record.tests.map((test) => ({
            ...test,
            liquidLimitRows: stripEmptyRows(test.liquidLimitRows, isLiquidRowValid),
            plasticLimitRows: stripEmptyRows(test.plasticLimitRows, isPlasticRowValid),
            shrinkageLimitRows: stripEmptyRows(test.shrinkageLimitRows, isShrinkageRowValid),
          })),
        })),
      },
    };
  }, [computedRecords, project.clientName, project.date, project.projectName]);

  const handleExportJSON = useCallback(() => {
    if (computedRecords.length === 0) {
      toast.error("No records to export");
      return;
    }

    const jsonString = exportAsJSON(buildExportPayload());
    downloadJSON(jsonString, `atterberg-limits-${new Date().toISOString().split("T")[0]}.json`);
    toast.success("Project exported as JSON");
  }, [buildExportPayload, computedRecords.length]);

  const handleImportJSON = useCallback(() => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = (event: Event) => {
      const target = event.target as HTMLInputElement;
      const file = target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = () => {
        try {
          const imported = importFromJSON(String(reader.result ?? ""));
          if (!imported) {
            toast.error("Invalid JSON file format");
            return;
          }

          setProjectState(imported);
          toast.success(`Imported ${imported.records.length} record(s)`);
        } catch (error) {
          console.error("Import error:", error);
          toast.error("Failed to import JSON file");
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }, []);

  const handleExportPDF = useCallback(() => {
    if (computedRecords.length === 0) return;

    generateTestPDF({
      title: "Atterberg Limits Testing",
      projectName: project.projectName,
      clientName: project.clientName,
      date: project.date,
      fields: aggregateResults,
      tables: buildTablesForExport(computedRecords),
    });
  }, [aggregateResults, computedRecords, project.clientName, project.date, project.projectName]);

  const handleExportCSV = useCallback(() => {
    if (computedRecords.length === 0) return;

    generateTestCSV({
      title: "Atterberg Limits Testing",
      projectName: project.projectName,
      clientName: project.clientName,
      date: project.date,
      fields: aggregateResults,
      tables: buildTablesForExport(computedRecords),
    });
  }, [aggregateResults, computedRecords, project.clientName, project.date, project.projectName]);

  return (
    <TestSection
      title="Atterberg Limits Testing"
      onSave={handleSave}
      onClear={handleClearAll}
      onExportPDF={handleExportPDF}
      onExportCSV={handleExportCSV}
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={addRecord} className="gap-2">
            <Plus className="h-4 w-4" /> Add Record
          </Button>

          <div className="ml-auto flex gap-2">
            <Button onClick={handleExportJSON} variant="outline" className="gap-2" size="sm" disabled={computedRecords.length === 0}>
              <Download className="h-4 w-4" /> Export JSON
            </Button>
            <Button onClick={handleImportJSON} variant="outline" className="gap-2" size="sm">
              <Upload className="h-4 w-4" /> Import JSON
            </Button>
          </div>
        </div>

        {computedRecords.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground border rounded-lg bg-muted/20">
            <p className="text-sm">No records yet. Add a record to start capturing Atterberg tests.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {computedRecords.map((record, index) => (
              <RecordCard
                key={record.id}
                record={record}
                recordIndex={index}
                onRemove={() => removeRecord(record.id)}
                onToggleExpanded={() => toggleRecordExpanded(record.id)}
                onUpdateTitle={(title) => updateRecordTitle(record.id, title)}
                onAddTest={(type) => addTest(record.id, type)}
                onRemoveTest={(testId) => removeTest(record.id, testId)}
                onToggleTestExpanded={(testId) => toggleTestExpanded(record.id, testId)}
                onUpdateTestTitle={(testId, title) => updateTestTitle(record.id, testId, title)}
                onUpdateTestType={(testId, type) => updateTestType(record.id, testId, type)}
                onAddLiquidLimitRow={(testId) => addLiquidLimitRow(record.id, testId)}
                onRemoveLiquidLimitRow={(testId, rowIndex) => removeLiquidLimitRow(record.id, testId, rowIndex)}
                onUpdateLiquidLimitRow={(testId, rowIndex, field, value) => updateLiquidLimitRow(record.id, testId, rowIndex, field, value)}
                onAddPlasticLimitRow={(testId) => addPlasticLimitRow(record.id, testId)}
                onRemovePlasticLimitRow={(testId, rowIndex) => removePlasticLimitRow(record.id, testId, rowIndex)}
                onUpdatePlasticLimitRow={(testId, rowIndex, field, value) => updatePlasticLimitRow(record.id, testId, rowIndex, field, value)}
                onAddShrinkageLimitRow={(testId) => addShrinkageLimitRow(record.id, testId)}
                onRemoveShrinkageLimitRow={(testId, rowIndex) => removeShrinkageLimitRow(record.id, testId, rowIndex)}
                onUpdateShrinkageLimitRow={(testId, rowIndex, field, value) => updateShrinkageLimitRow(record.id, testId, rowIndex, field, value)}
                onUpdateCalculatedResults={(testId, results) => updateCalculatedResults(record.id, testId, results)}
              />
            ))}
          </div>
        )}
      </div>
    </TestSection>
  );
};

interface RecordCardProps {
  record: ComputedRecord;
  recordIndex: number;
  onRemove: () => void;
  onToggleExpanded: () => void;
  onUpdateTitle: (title: string) => void;
  onAddTest: (type?: AtterbergTestType) => void;
  onRemoveTest: (testId: string) => void;
  onToggleTestExpanded: (testId: string) => void;
  onUpdateTestTitle: (testId: string, title: string) => void;
  onUpdateTestType: (testId: string, type: AtterbergTestType) => void;
  onAddLiquidLimitRow: (testId: string) => void;
  onRemoveLiquidLimitRow: (testId: string, rowIndex: number) => void;
  onUpdateLiquidLimitRow: (testId: string, rowIndex: number, field: keyof LiquidLimitRow, value: string) => void;
  onAddPlasticLimitRow: (testId: string) => void;
  onRemovePlasticLimitRow: (testId: string, rowIndex: number) => void;
  onUpdatePlasticLimitRow: (testId: string, rowIndex: number, field: keyof PlasticLimitRow, value: string) => void;
  onAddShrinkageLimitRow: (testId: string) => void;
  onRemoveShrinkageLimitRow: (testId: string, rowIndex: number) => void;
  onUpdateShrinkageLimitRow: (testId: string, rowIndex: number, field: keyof ShrinkageLimitRow, value: string) => void;
  onUpdateCalculatedResults: (testId: string, results: CalculatedResults) => void;
}

const RecordCard = ({
  record,
  recordIndex,
  onRemove,
  onToggleExpanded,
  onUpdateTitle,
  onAddTest,
  onRemoveTest,
  onToggleTestExpanded,
  onUpdateTestTitle,
  onUpdateTestType,
  onAddLiquidLimitRow,
  onRemoveLiquidLimitRow,
  onUpdateLiquidLimitRow,
  onAddPlasticLimitRow,
  onRemovePlasticLimitRow,
  onUpdatePlasticLimitRow,
  onAddShrinkageLimitRow,
  onRemoveShrinkageLimitRow,
  onUpdateShrinkageLimitRow,
  onUpdateCalculatedResults,
}: RecordCardProps) => {
  const resultCards = [
    { label: "LL", value: record.results.liquidLimit, tone: "blue" },
    { label: "PL", value: record.results.plasticLimit, tone: "emerald" },
    { label: "SL", value: record.results.shrinkageLimit, tone: "amber" },
    { label: "PI", value: record.results.plasticityIndex, tone: "violet" },
  ];

  return (
    <Collapsible open={record.isExpanded} onOpenChange={onToggleExpanded}>
      <Card className="border shadow-sm transition-all hover:shadow-md">
        <CardHeader className="pb-3 space-y-3">
          <div className="flex items-start gap-3">
            <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0" onClick={onToggleExpanded}>
              {record.isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </Button>

            <div className="flex-1 space-y-3 min-w-0">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-sm font-semibold text-muted-foreground flex-shrink-0">Record {recordIndex + 1}</span>
                  <Input
                    value={record.recordTitle}
                    onChange={(e) => onUpdateTitle(e.target.value)}
                    className="h-9 max-w-xl"
                    placeholder="Record name"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <Button variant="outline" className="gap-2" onClick={() => onAddTest()}>
                    <Plus className="h-4 w-4" /> Add Test
                  </Button>

                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={onRemove}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </CardHeader>

        <CollapsibleContent>
          <CardContent className="pt-0 space-y-4">
            <div className="space-y-3">
              {record.tests.length === 0 ? (
                <div className="rounded-lg border border-dashed bg-muted/20 p-4 text-sm text-muted-foreground">
                  No tests added yet. Use <span className="font-medium text-foreground">Add Test</span> to create a liquid, plastic, or shrinkage limit test.
                </div>
              ) : (
                record.tests.map((test) => (
                  <AtterbergTestCard
                    key={test.id}
                    test={test}
                    onDelete={() => onRemoveTest(test.id)}
                    onUpdateTitle={(title) => onUpdateTestTitle(test.id, title)}
                    onUpdateType={(type) => onUpdateTestType(test.id, type)}
                    onToggleExpanded={() => onToggleTestExpanded(test.id)}
                    onAddLiquidLimitRow={() => onAddLiquidLimitRow(test.id)}
                    onRemoveLiquidLimitRow={(idx) => onRemoveLiquidLimitRow(test.id, idx)}
                    onUpdateLiquidLimitRow={(idx, field, value) => onUpdateLiquidLimitRow(test.id, idx, field as keyof LiquidLimitRow, value)}
                    onAddPlasticLimitRow={() => onAddPlasticLimitRow(test.id)}
                    onRemovePlasticLimitRow={(idx) => onRemovePlasticLimitRow(test.id, idx)}
                    onUpdatePlasticLimitRow={(idx, field, value) => onUpdatePlasticLimitRow(test.id, idx, field as keyof PlasticLimitRow, value)}
                    onAddShrinkageLimitRow={() => onAddShrinkageLimitRow(test.id)}
                    onRemoveShrinkageLimitRow={(idx) => onRemoveShrinkageLimitRow(test.id, idx)}
                    onUpdateShrinkageLimitRow={(idx, field, value) => onUpdateShrinkageLimitRow(test.id, idx, field as keyof ShrinkageLimitRow, value)}
                    onUpdateCalculatedResults={(results) => onUpdateCalculatedResults(test.id, results)}
                  />
                ))
              )}
            </div>

            <div className="border-t pt-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold">Record Summary</h4>
                <span className="text-xs text-muted-foreground">
                  {record.dataPoints} valid data point{record.dataPoints === 1 ? "" : "s"}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
                {resultCards.map((item) => (
                  <div
                    key={item.label}
                    className={cn(
                      "rounded-lg border p-3 bg-card",
                      item.tone === "blue" && "border-blue-200 bg-blue-50/60 dark:border-blue-900 dark:bg-blue-950/20",
                      item.tone === "emerald" && "border-emerald-200 bg-emerald-50/60 dark:border-emerald-900 dark:bg-emerald-950/20",
                      item.tone === "amber" && "border-amber-200 bg-amber-50/60 dark:border-amber-900 dark:bg-amber-950/20",
                      item.tone === "violet" && "border-violet-200 bg-violet-50/60 dark:border-violet-900 dark:bg-violet-950/20"
                    )}
                  >
                    <div className="text-xs font-medium text-muted-foreground">{item.label}</div>
                    <div className="mt-1 text-lg font-bold">{item.value !== undefined && item.value !== null ? `${item.value}%` : "—"}</div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
};

const buildTablesForExport = (records: ComputedRecord[]) => {
  return records.flatMap((record) =>
    record.tests.map((test) => {
      switch (test.testType) {
        case "liquidLimit":
          return {
            headers: ["Record", "Test", "Trial No.", "Number of Blows", "Moisture Content (%)", "Liquid Limit (%)"],
            rows: test.liquidLimitRows
              .filter(isLiquidRowValid)
              .map((row, index) => [
                record.recordTitle,
                test.testTitle,
                String(index + 1),
                row.blows,
                row.moisture,
                test.calculatedResults.liquidLimit !== undefined ? String(test.calculatedResults.liquidLimit) : "—",
              ]),
          };
        case "plasticLimit":
          return {
            headers: ["Record", "Test", "Trial No.", "Moisture Content (%)", "Plastic Limit (%)"],
            rows: test.plasticLimitRows
              .filter(isPlasticRowValid)
              .map((row, index) => [
                record.recordTitle,
                test.testTitle,
                String(index + 1),
                row.moisture,
                test.calculatedResults.plasticLimit !== undefined ? String(test.calculatedResults.plasticLimit) : "—",
              ]),
          };
        case "shrinkageLimit":
          return {
            headers: ["Record", "Test", "Trial No.", "Initial Volume", "Final Volume", "Moisture Content (%)", "Shrinkage Limit (%)"],
            rows: test.shrinkageLimitRows
              .filter(isShrinkageRowValid)
              .map((row, index) => [
                record.recordTitle,
                test.testTitle,
                String(index + 1),
                row.initialVolume,
                row.finalVolume,
                row.moisture,
                test.calculatedResults.shrinkageLimit !== undefined ? String(test.calculatedResults.shrinkageLimit) : "—",
              ]),
          };
      }
    })
  );
};

export default AtterbergTest;
