import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronRight, Download, Plus, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";

import TestSection from "@/components/TestSection";
import AtterbergTestCard from "./AtterbergTestCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { useProject } from "@/context/ProjectContext";
import {
  useTestData,
  type AtterbergProjectState,
  type AtterbergRecord,
  type AtterbergTest,
  type AtterbergTestType,
  type LiquidLimitTrial,
  type PlasticLimitTrial,
  type ShrinkageLimitTrial,
} from "@/context/TestDataContext";
import { generateTestCSV } from "@/lib/csvExporter";
import { generateTestPDF } from "@/lib/pdfGenerator";
import {
  calculatePlasticityIndex,
  calculateRecordResults,
  calculateTestResult,
  countRecordDataPoints,
  countValidTrials,
  getActiveResultValue,
  isLiquidLimitTrialValid,
  isPlasticLimitTrialValid,
  isShrinkageLimitTrialValid,
} from "@/lib/atterbergCalculations";
import {
  downloadJSON,
  exportAsJSON,
  importFromJSON,
  normalizeAtterbergProjectState,
  type AtterbergExportPayload,
} from "@/lib/jsonExporter";

const STORAGE_KEY = "atterbergProjectState";

type ComputedRecord = AtterbergRecord & {
  dataPoints: number;
  completedTests: number;
};

const makeId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const testTypeLabels: Record<AtterbergTestType, string> = {
  liquidLimit: "Liquid Limit",
  plasticLimit: "Plastic Limit",
  shrinkageLimit: "Shrinkage Limit",
};

const createLiquidLimitTrial = (index: number): LiquidLimitTrial => ({
  id: makeId("trial"),
  trialNo: String(index + 1),
  blows: "",
  moisture: "",
});

const createPlasticLimitTrial = (index: number): PlasticLimitTrial => ({
  id: makeId("trial"),
  trialNo: String(index + 1),
  moisture: "",
});

const createShrinkageLimitTrial = (index: number): ShrinkageLimitTrial => ({
  id: makeId("trial"),
  trialNo: String(index + 1),
  initialVolume: "",
  finalVolume: "",
  moisture: "",
});

const createTrialsForType = (type: AtterbergTestType) => {
  switch (type) {
    case "liquidLimit":
      return [createLiquidLimitTrial(0)] as AtterbergTest["trials"];
    case "plasticLimit":
      return [createPlasticLimitTrial(0)] as AtterbergTest["trials"];
    case "shrinkageLimit":
      return [createShrinkageLimitTrial(0)] as AtterbergTest["trials"];
  }
};

const buildTestTitle = (type: AtterbergTestType, tests: AtterbergTest[]) => {
  const order = tests.filter((test) => test.type === type).length + 1;
  return `${testTypeLabels[type]} ${order}`;
};

const createTest = (type: AtterbergTestType, tests: AtterbergTest[]): AtterbergTest => {
  if (type === "liquidLimit") {
    return {
      id: makeId("test"),
      title: buildTestTitle(type, tests),
      type,
      isExpanded: true,
      trials: [createLiquidLimitTrial(0)],
      result: {},
    };
  }

  if (type === "plasticLimit") {
    return {
      id: makeId("test"),
      title: buildTestTitle(type, tests),
      type,
      isExpanded: true,
      trials: [createPlasticLimitTrial(0)],
      result: {},
    };
  }

  return {
    id: makeId("test"),
    title: buildTestTitle(type, tests),
    type,
    isExpanded: true,
    trials: [createShrinkageLimitTrial(0)],
    result: {},
  };
};

const createRecord = (index: number): AtterbergRecord => ({
  id: makeId("record"),
  title: `Record ${index + 1}`,
  label: "",
  note: "",
  isExpanded: true,
  tests: [],
  results: {},
});

const isNumber = (value: number | undefined | null): value is number => typeof value === "number" && Number.isFinite(value);
const average = (values: number[]) => (values.length > 0 ? Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(2)) : null);

const buildPersistedState = (records: ComputedRecord[]): AtterbergProjectState => ({
  records: records.map(({ dataPoints, completedTests, ...record }) => record),
});

const updateTrialsForType = (test: AtterbergTest, trials: AtterbergTest["trials"]): AtterbergTest => {
  switch (test.type) {
    case "liquidLimit":
      return { ...test, trials: trials as LiquidLimitTrial[] };
    case "plasticLimit":
      return { ...test, trials: trials as PlasticLimitTrial[] };
    case "shrinkageLimit":
      return { ...test, trials: trials as ShrinkageLimitTrial[] };
  }
};

const AtterbergTest = () => {
  const project = useProject();
  const { updateTest: updateTestSummary } = useTestData();
  const [projectState, setProjectState] = useState<AtterbergProjectState>({ records: [] });
  const hydratedRef = useRef(false);

  const computedRecords = useMemo<ComputedRecord[]>(() => {
    return projectState.records.map((record) => {
      const tests = record.tests.map((test) => ({
        ...test,
        result: calculateTestResult(test),
      })) as AtterbergTest[];

      const recordWithComputedTests: AtterbergRecord = {
        ...record,
        tests,
        results: calculateRecordResults({ ...record, tests }),
      };

      return {
        ...recordWithComputedTests,
        dataPoints: countRecordDataPoints(recordWithComputedTests),
        completedTests: tests.filter((test) => getActiveResultValue(test) !== null).length,
      };
    });
  }, [projectState.records]);

  const persistedState = useMemo(() => buildPersistedState(computedRecords), [computedRecords]);

  useEffect(() => {
    if (hydratedRef.current) return;
    hydratedRef.current = true;

    const saved = localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem("enhancedAtterbergTests");
    if (!saved) return;

    try {
      const parsed = normalizeAtterbergProjectState(JSON.parse(saved));
      if (parsed) {
        setProjectState(parsed);
      }
    } catch (error) {
      console.error("Failed to restore Atterberg project:", error);
    }
  }, []);

  useEffect(() => {
    if (!hydratedRef.current) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(persistedState));
  }, [persistedState]);

  const { totalDataPoints, aggregateResults, status } = useMemo(() => {
    const liquidLimitValues = computedRecords.map((record) => record.results.liquidLimit).filter(isNumber);
    const plasticLimitValues = computedRecords.map((record) => record.results.plasticLimit).filter(isNumber);
    const shrinkageLimitValues = computedRecords.map((record) => record.results.shrinkageLimit).filter(isNumber);

    const liquidLimit = average(liquidLimitValues);
    const plasticLimit = average(plasticLimitValues);
    const shrinkageLimit = average(shrinkageLimitValues);
    const plasticityIndex = calculatePlasticityIndex(liquidLimit, plasticLimit);
    const totalPoints = computedRecords.reduce((sum, record) => sum + record.dataPoints, 0);
    const completedTests = computedRecords.reduce((sum, record) => sum + record.completedTests, 0);
    const nextStatus = totalPoints === 0 ? "not-started" : completedTests > 0 ? "completed" : "in-progress";

    return {
      totalDataPoints: totalPoints,
      status: nextStatus,
      aggregateResults: [
        { label: "Avg LL", value: liquidLimit !== null ? `${liquidLimit}%` : "" },
        { label: "Avg PL", value: plasticLimit !== null ? `${plasticLimit}%` : "" },
        { label: "Avg SL", value: shrinkageLimit !== null ? `${shrinkageLimit}%` : "" },
        { label: "Avg PI", value: plasticityIndex !== null ? `${plasticityIndex}%` : "" },
        { label: "Records", value: String(computedRecords.length) },
        { label: "Valid Data Points", value: String(totalPoints) },
      ],
    };
  }, [computedRecords]);

  useEffect(() => {
    updateTestSummary("atterberg", {
      status,
      dataPoints: totalDataPoints,
      keyResults: aggregateResults.filter((item) => item.value),
    });
  }, [aggregateResults, status, totalDataPoints, updateTestSummary]);

  const updateRecord = useCallback((recordId: string, updater: (record: AtterbergRecord) => AtterbergRecord) => {
    setProjectState((prev) => ({
      records: prev.records.map((record) => (record.id === recordId ? updater(record) : record)),
    }));
  }, []);

  const updateTest = useCallback(
    (recordId: string, testId: string, updater: (test: AtterbergTest) => AtterbergTest) => {
      updateRecord(recordId, (record) => ({
        ...record,
        tests: record.tests.map((test) => (test.id === testId ? updater(test) : test)),
      }));
    },
    [updateRecord],
  );

  const addRecord = useCallback(() => {
    setProjectState((prev) => ({
      records: [...prev.records, createRecord(prev.records.length)],
    }));
  }, []);

  const removeRecord = useCallback((recordId: string) => {
    setProjectState((prev) => ({
      records: prev.records.filter((record) => record.id !== recordId),
    }));
  }, []);

  const addTest = useCallback(
    (recordId: string, type: AtterbergTestType = "liquidLimit") => {
      updateRecord(recordId, (record) => ({
        ...record,
        isExpanded: true,
        tests: [...record.tests, createTest(type, record.tests)],
      }));
    },
    [updateRecord],
  );

  const removeTest = useCallback(
    (recordId: string, testId: string) => {
      updateRecord(recordId, (record) => ({
        ...record,
        tests: record.tests.filter((test) => test.id !== testId),
      }));
    },
    [updateRecord],
  );

  const updateTestType = useCallback(
    (recordId: string, testId: string, type: AtterbergTestType) => {
      updateTest(recordId, testId, (test) => ({
        ...test,
        type,
        isExpanded: true,
        trials: createTrialsForType(type) as AtterbergTest["trials"],
        result: {},
      } as AtterbergTest));
    },
    [updateTest],
  );

  const syncComputedTest = useCallback(
    (recordId: string, nextTest: AtterbergTest) => {
      updateTest(recordId, nextTest.id, () => nextTest);
    },
    [updateTest],
  );

  const updateTestTrials = useCallback(
    (recordId: string, testId: string, trials: AtterbergTest["trials"]) => {
      updateTest(recordId, testId, (test) => updateTrialsForType(test, trials));
    },
    [updateTest],
  );

  const handleSave = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(persistedState));
  }, [persistedState]);

  const handleClearAll = useCallback(() => {
    setProjectState({ records: [] });
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem("enhancedAtterbergTests");
  }, []);

  const buildExportPayload = useCallback((): AtterbergExportPayload => {
    return {
      exportDate: new Date().toISOString(),
      version: "3.0",
      project: {
        title: project.projectName || "Atterberg Limits Testing",
        clientName: project.clientName,
        date: project.date,
        records: persistedState.records,
      },
    };
  }, [persistedState.records, project.clientName, project.date, project.projectName]);

  const handleExportJSON = useCallback(() => {
    if (computedRecords.length === 0) {
      toast.error("No records to export");
      return;
    }

    const jsonString = exportAsJSON(buildExportPayload());
    downloadJSON(jsonString, `atterberg-limits-${new Date().toISOString().split("T")[0]}.json`);
    toast.success("Atterberg project exported");
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
        const imported = importFromJSON(String(reader.result ?? ""));
        if (!imported) {
          toast.error("Invalid JSON file format");
          return;
        }

        setProjectState(imported);
        toast.success(`Imported ${imported.records.length} record(s)`);
      };
      reader.readAsText(file);
    };
    input.click();
  }, []);

  const exportTables = useMemo(() => buildTablesForExport(computedRecords), [computedRecords]);

  const handleExportPDF = useCallback(() => {
    if (computedRecords.length === 0) return;

    generateTestPDF({
      title: "Atterberg Limits Testing",
      projectName: project.projectName,
      clientName: project.clientName,
      date: project.date,
      fields: aggregateResults,
      tables: exportTables,
    });
  }, [aggregateResults, computedRecords.length, exportTables, project.clientName, project.date, project.projectName]);

  const handleExportCSV = useCallback(() => {
    if (computedRecords.length === 0) return;

    generateTestCSV({
      title: "Atterberg Limits Testing",
      projectName: project.projectName,
      clientName: project.clientName,
      date: project.date,
      fields: aggregateResults,
      tables: exportTables,
    });
  }, [aggregateResults, computedRecords.length, exportTables, project.clientName, project.date, project.projectName]);

  return (
    <TestSection
      title="Atterberg Limits Testing"
      onSave={handleSave}
      onClear={handleClearAll}
      onExportPDF={handleExportPDF}
      onExportCSV={handleExportCSV}
    >
      <div className="space-y-4 print:space-y-3">
        <Card className="border bg-muted/20 shadow-none print:border-border print:bg-transparent">
          <CardContent className="grid gap-4 p-4 md:grid-cols-2 xl:grid-cols-6">
            <OverviewMetric label="Project" value={project.projectName || "Current project"} />
            <OverviewMetric label="Client" value={project.clientName || "-"} />
            <OverviewMetric label="Date" value={project.date || "-"} />
            <OverviewMetric label="Records" value={String(computedRecords.length)} />
            <OverviewMetric label="Valid Data Points" value={String(totalDataPoints)} />
            <OverviewMetric label="Status" value={status} className="capitalize" />
          </CardContent>
        </Card>

        <div className="flex flex-wrap items-center gap-2 print:hidden">
          <Button type="button" onClick={addRecord} className="gap-2">
            <Plus className="h-4 w-4" /> Add Record
          </Button>

          <div className="ml-auto flex gap-2">
            <Button type="button" onClick={handleExportJSON} variant="outline" size="sm" className="gap-2" disabled={computedRecords.length === 0}>
              <Download className="h-4 w-4" /> Export JSON
            </Button>
            <Button type="button" onClick={handleImportJSON} variant="outline" size="sm" className="gap-2">
              <Upload className="h-4 w-4" /> Import JSON
            </Button>
          </div>
        </div>

        {computedRecords.length === 0 ? (
          <div className="rounded-lg border bg-muted/20 py-10 text-center text-muted-foreground">
            <p className="text-sm">No records yet. Add a record to begin capturing Atterberg limit tests.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {computedRecords.map((record, index) => (
              <RecordCard
                key={record.id}
                record={record}
                recordIndex={index}
                onRemove={() => removeRecord(record.id)}
                onToggleExpanded={() => updateRecord(record.id, (current) => ({ ...current, isExpanded: !current.isExpanded }))}
                onUpdateTitle={(title) => updateRecord(record.id, (current) => ({ ...current, title }))}
                onUpdateLabel={(label) => updateRecord(record.id, (current) => ({ ...current, label }))}
                onUpdateNote={(note) => updateRecord(record.id, (current) => ({ ...current, note }))}
                onAddTest={(type) => addTest(record.id, type)}
                onRemoveTest={(testId) => removeTest(record.id, testId)}
                onToggleTestExpanded={(testId) => updateTest(record.id, testId, (test) => ({ ...test, isExpanded: !test.isExpanded }))}
                onUpdateTestTitle={(testId, title) => updateTest(record.id, testId, (test) => ({ ...test, title }))}
                onUpdateTestType={(testId, type) => updateTestType(record.id, testId, type)}
                onUpdateLiquidLimitTrials={(testId, trials) => updateTestTrials(record.id, testId, trials)}
                onUpdatePlasticLimitTrials={(testId, trials) => updateTestTrials(record.id, testId, trials)}
                onUpdateShrinkageLimitTrials={(testId, trials) => updateTestTrials(record.id, testId, trials)}
                onSyncTest={(test) => syncComputedTest(record.id, test)}
              />
            ))}
          </div>
        )}
      </div>
    </TestSection>
  );
};

interface OverviewMetricProps {
  label: string;
  value: string;
  className?: string;
}

const OverviewMetric = ({ label, value, className }: OverviewMetricProps) => (
  <div className="rounded-lg border bg-card px-3 py-2 print:border-none print:bg-transparent print:px-0 print:py-0">
    <div className="text-xs font-medium text-muted-foreground">{label}</div>
    <div className={cn("mt-1 text-sm font-semibold text-foreground", className)}>{value || "-"}</div>
  </div>
);

interface RecordCardProps {
  record: ComputedRecord;
  recordIndex: number;
  onRemove: () => void;
  onToggleExpanded: () => void;
  onUpdateTitle: (title: string) => void;
  onUpdateLabel: (label: string) => void;
  onUpdateNote: (note: string) => void;
  onAddTest: (type?: AtterbergTestType) => void;
  onRemoveTest: (testId: string) => void;
  onToggleTestExpanded: (testId: string) => void;
  onUpdateTestTitle: (testId: string, title: string) => void;
  onUpdateTestType: (testId: string, type: AtterbergTestType) => void;
  onUpdateLiquidLimitTrials: (testId: string, trials: LiquidLimitTrial[]) => void;
  onUpdatePlasticLimitTrials: (testId: string, trials: PlasticLimitTrial[]) => void;
  onUpdateShrinkageLimitTrials: (testId: string, trials: ShrinkageLimitTrial[]) => void;
  onSyncTest: (test: AtterbergTest) => void;
}

const RecordCard = ({
  record,
  recordIndex,
  onRemove,
  onToggleExpanded,
  onUpdateTitle,
  onUpdateLabel,
  onUpdateNote,
  onAddTest,
  onRemoveTest,
  onToggleTestExpanded,
  onUpdateTestTitle,
  onUpdateTestType,
  onUpdateLiquidLimitTrials,
  onUpdatePlasticLimitTrials,
  onUpdateShrinkageLimitTrials,
  onSyncTest,
}: RecordCardProps) => {
  const resultCards = [
    { label: "LL", value: record.results.liquidLimit, tone: "blue" },
    { label: "PL", value: record.results.plasticLimit, tone: "emerald" },
    { label: "SL", value: record.results.shrinkageLimit, tone: "amber" },
    { label: "PI", value: record.results.plasticityIndex, tone: "violet" },
  ];

  return (
    <Collapsible open={record.isExpanded} onOpenChange={onToggleExpanded}>
      <Card className="border shadow-sm print:break-inside-avoid print:shadow-none">
        <CardHeader className="space-y-3 pb-3">
          <div className="flex items-start gap-3">
            <Button type="button" variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0" onClick={onToggleExpanded}>
              {record.isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </Button>

            <div className="min-w-0 flex-1 space-y-3">
              <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
                  <span className="text-sm font-semibold text-muted-foreground">Record {recordIndex + 1}</span>
                  <Input value={record.title} onChange={(event) => onUpdateTitle(event.target.value)} className="h-9 max-w-xl" placeholder="Record title" />
                </div>

                <div className="flex items-center gap-2 print:hidden">
                  <Button type="button" variant="outline" className="gap-2" onClick={() => onAddTest("liquidLimit")}>
                    <Plus className="h-4 w-4" /> Add Test
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                    onClick={onRemove}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1">
                  <div className="text-xs font-medium text-muted-foreground">Identifier / Sample Group</div>
                  <Input value={record.label} onChange={(event) => onUpdateLabel(event.target.value)} className="h-9" placeholder="Sample ID, borehole, depth, etc." />
                </div>
                <div className="space-y-1">
                  <div className="text-xs font-medium text-muted-foreground">Note</div>
                  <Textarea value={record.note} onChange={(event) => onUpdateNote(event.target.value)} className="min-h-[72px] resize-y" placeholder="Optional workflow note or descriptor" />
                </div>
              </div>
            </div>
          </div>
        </CardHeader>

        <CollapsibleContent>
          <CardContent className="space-y-4 pt-0">
            {record.tests.length === 0 ? (
              <div className="rounded-lg border border-dashed bg-muted/20 p-4 text-sm text-muted-foreground">
                No tests added yet. Add one or more liquid, plastic, or shrinkage limit tests for this record.
              </div>
            ) : (
              <div className="space-y-3">
                {record.tests.map((test) => (
                  <AtterbergTestCard
                    key={test.id}
                    test={test}
                    onDelete={() => onRemoveTest(test.id)}
                    onUpdateTitle={(title) => onUpdateTestTitle(test.id, title)}
                    onUpdateType={(type) => onUpdateTestType(test.id, type)}
                    onToggleExpanded={() => onToggleTestExpanded(test.id)}
                    onUpdateLiquidLimitTrials={(trials) => onUpdateLiquidLimitTrials(test.id, trials)}
                    onUpdatePlasticLimitTrials={(trials) => onUpdatePlasticLimitTrials(test.id, trials)}
                    onUpdateShrinkageLimitTrials={(trials) => onUpdateShrinkageLimitTrials(test.id, trials)}
                    onSyncResult={onSyncTest}
                  />
                ))}
              </div>
            )}

            <div className="rounded-lg border bg-muted/20 p-4">
              <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <h4 className="text-sm font-semibold">Record Summary</h4>
                <div className="text-xs text-muted-foreground">
                  {record.dataPoints} valid data point{record.dataPoints === 1 ? "" : "s"} • {record.completedTests} completed test{record.completedTests === 1 ? "" : "s"}
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {resultCards.map((item) => (
                  <div
                    key={item.label}
                    className={cn(
                      "rounded-lg border p-3",
                      item.tone === "blue" && "border-blue-200 bg-blue-50/60 dark:border-blue-900 dark:bg-blue-950/20",
                      item.tone === "emerald" && "border-emerald-200 bg-emerald-50/60 dark:border-emerald-900 dark:bg-emerald-950/20",
                      item.tone === "amber" && "border-amber-200 bg-amber-50/60 dark:border-amber-900 dark:bg-amber-950/20",
                      item.tone === "violet" && "border-violet-200 bg-violet-50/60 dark:border-violet-900 dark:bg-violet-950/20",
                    )}
                  >
                    <div className="text-xs font-medium text-muted-foreground">{item.label}</div>
                    <div className="mt-1 text-lg font-bold">{item.value !== undefined ? `${item.value}%` : "-"}</div>
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
  const recordSummaryTable = {
    title: "Record Summary",
    headers: ["Record", "Identifier", "LL (%)", "PL (%)", "SL (%)", "PI (%)", "Valid Points"],
    rows: records.map((record) => [
      record.title,
      record.label || "-",
      record.results.liquidLimit !== undefined ? String(record.results.liquidLimit) : "-",
      record.results.plasticLimit !== undefined ? String(record.results.plasticLimit) : "-",
      record.results.shrinkageLimit !== undefined ? String(record.results.shrinkageLimit) : "-",
      record.results.plasticityIndex !== undefined ? String(record.results.plasticityIndex) : "-",
      String(record.dataPoints),
    ]),
  };

  const trialTables = records.flatMap((record) =>
    record.tests
      .map((test) => {
        if (test.type === "liquidLimit") {
          const rows = test.trials
            .filter(isLiquidLimitTrialValid)
            .map((trial) => [record.title, record.label || "-", test.title, trial.trialNo, trial.blows, trial.moisture, test.result.liquidLimit !== undefined ? String(test.result.liquidLimit) : "-"]);

          return rows.length > 0
            ? {
                title: `${record.title} - ${test.title} (Liquid Limit)`,
                headers: ["Record", "Identifier", "Test", "Trial", "Blows", "Moisture (%)", "LL (%)"],
                rows,
              }
            : null;
        }

        if (test.type === "plasticLimit") {
          const rows = test.trials
            .filter(isPlasticLimitTrialValid)
            .map((trial) => [record.title, record.label || "-", test.title, trial.trialNo, trial.moisture, test.result.plasticLimit !== undefined ? String(test.result.plasticLimit) : "-"]);

          return rows.length > 0
            ? {
                title: `${record.title} - ${test.title} (Plastic Limit)`,
                headers: ["Record", "Identifier", "Test", "Trial", "Moisture (%)", "PL (%)"],
                rows,
              }
            : null;
        }

        const rows = test.trials
          .filter(isShrinkageLimitTrialValid)
          .map((trial) => [
            record.title,
            record.label || "-",
            test.title,
            trial.trialNo,
            trial.initialVolume,
            trial.finalVolume,
            trial.moisture,
            test.result.shrinkageLimit !== undefined ? String(test.result.shrinkageLimit) : "-",
          ]);

        return rows.length > 0
          ? {
              title: `${record.title} - ${test.title} (Shrinkage Limit)`,
              headers: ["Record", "Identifier", "Test", "Trial", "Initial Volume", "Final Volume", "Moisture (%)", "SL (%)"],
              rows,
            }
          : null;
      })
      .filter((table): table is NonNullable<typeof table> => Boolean(table)),
  );

  return [recordSummaryTable, ...trialTables];
};

export default AtterbergTest;
