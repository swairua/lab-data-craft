import { useState, useMemo } from "react";
import TestSection from "@/components/TestSection";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import CalculatedInput from "@/components/CalculatedInput";
import { useProject } from "@/context/ProjectContext";
import { generateTestPDF } from "@/lib/pdfGenerator";
import { generateTestCSV } from "@/lib/csvExporter";
import { useTestReport } from "@/hooks/useTestReport";
import { useTestData, type AtterbergInstance, type AtterbergRow } from "@/context/TestDataContext";
import { Button } from "@/components/ui/button";
import { Plus, X } from "lucide-react";

const AtterbergTest = () => {
  const project = useProject();
  const {
    atterbergTests,
    addAtterbergInstance,
    removeAtterbergInstance,
    addAtterbergRow,
    removeAtterbergRow,
    updateAtterbergRow,
    updateBoreholeId,
    updateTest,
  } = useTestData();
  const [newBoreholeId, setNewBoreholeId] = useState("");

  // Calculate total data points and aggregate results
  const { totalDataPoints, aggregateResults } = useMemo(() => {
    let total = 0;
    const allLLs: number[] = [];
    const allPLs: number[] = [];
    const allPIs: number[] = [];

    atterbergTests.forEach(instance => {
      instance.rows.forEach(row => {
        if (row.ll) allLLs.push(parseFloat(row.ll));
        if (row.pl) allPLs.push(parseFloat(row.pl));
        if (row.ll && row.pl) {
          const pi = parseFloat(row.ll) - parseFloat(row.pl);
          allPIs.push(pi);
        }
      });
      total += instance.rows.filter(r => r.ll && r.pl).length;
    });

    const avgLL = allLLs.length > 0 ? (allLLs.reduce((a, b) => a + b) / allLLs.length).toFixed(1) : "";
    const avgPL = allPLs.length > 0 ? (allPLs.reduce((a, b) => a + b) / allPLs.length).toFixed(1) : "";
    const avgPI = allPIs.length > 0 ? (allPIs.reduce((a, b) => a + b) / allPIs.length).toFixed(1) : "";

    return {
      totalDataPoints: total,
      aggregateResults: [
        { label: "Avg LL", value: avgLL ? `${avgLL}%` : "" },
        { label: "Avg PL", value: avgPL ? `${avgPL}%` : "" },
        { label: "Avg PI", value: avgPI ? `${avgPI}%` : "" },
        { label: "Boreholes", value: atterbergTests.length.toString() },
      ],
    };
  }, [atterbergTests]);

  useTestReport("atterberg", totalDataPoints, aggregateResults);

  const handleAddInstance = () => {
    if (newBoreholeId.trim()) {
      addAtterbergInstance(newBoreholeId);
      setNewBoreholeId("");
    }
  };

  const handleExportPDF = () => {
    if (atterbergTests.length === 0) return;

    const tables = atterbergTests.map(instance => ({
      title: `Borehole: ${instance.boreholeId}`,
      headers: ["Depth (m)", "LL (%)", "PL (%)", "PI (%)"],
      rows: instance.rows.map(row => {
        const pi = row.ll && row.pl ? (parseFloat(row.ll) - parseFloat(row.pl)).toFixed(1) : "—";
        return [row.depth || "—", row.ll || "—", row.pl || "—", pi];
      }),
    }));

    generateTestPDF({
      title: "Atterberg Limits",
      ...project,
      tables: tables.map(t => ({ headers: t.headers, rows: t.rows })),
    });
  };

  const handleExportCSV = () => {
    if (atterbergTests.length === 0) return;

    const tables = atterbergTests.map(instance => ({
      title: `Borehole: ${instance.boreholeId}`,
      headers: ["Depth (m)", "LL (%)", "PL (%)", "PI (%)"],
      rows: instance.rows.map(row => {
        const pi = row.ll && row.pl ? (parseFloat(row.ll) - parseFloat(row.pl)).toFixed(1) : "—";
        return [row.depth || "—", row.ll || "—", row.pl || "—", pi];
      }),
    }));

    generateTestCSV({
      title: "Atterberg Limits",
      ...project,
      tables: tables.map(t => ({ headers: t.headers, rows: t.rows })),
    });
  };

  const handleClearAll = () => {
    atterbergTests.forEach(instance => {
      removeAtterbergInstance(instance.boreholeId);
    });
    updateTest("atterberg", {
      status: "not-started",
      dataPoints: 0,
      keyResults: [],
    });
  };

  const handleSave = () => {
    const status = totalDataPoints === 0 ? "not-started" : totalDataPoints > 0 && atterbergTests.length > 0 ? "completed" : "in-progress";
    updateTest("atterberg", {
      status,
      dataPoints: totalDataPoints,
      keyResults: aggregateResults,
    });
  };

  return (
    <TestSection
      title="Atterberg Limits"
      onSave={handleSave}
      onClear={handleClearAll}
      onExportPDF={handleExportPDF}
      onExportCSV={handleExportCSV}
    >
      <div className="space-y-4">
        {/* Add new instance section */}
        <div className="border rounded-lg p-3 bg-muted/30">
          <Label className="text-xs text-muted-foreground mb-2 block">Add New Test Instance</Label>
          <div className="flex gap-2">
            <Input
              placeholder="Borehole ID (e.g., BH-01)"
              value={newBoreholeId}
              onChange={(e) => setNewBoreholeId(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === "Enter") handleAddInstance();
              }}
              className="h-9"
            />
            <Button onClick={handleAddInstance} size="sm" variant="outline" className="gap-1">
              <Plus className="h-4 w-4" /> Add
            </Button>
          </div>
        </div>

        {/* Test instances */}
        {atterbergTests.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p className="text-sm">No test instances yet. Add one to get started.</p>
          </div>
        ) : (
          atterbergTests.map(instance => (
            <AtterbergTestInstance
              key={instance.boreholeId}
              instance={instance}
              onRemove={() => removeAtterbergInstance(instance.boreholeId)}
              onUpdateBoreholeId={updateBoreholeId}
              onAddRow={() => addAtterbergRow(instance.boreholeId)}
              onRemoveRow={(rowIndex) => removeAtterbergRow(instance.boreholeId, rowIndex)}
              onUpdateRow={(rowIndex, field, value) =>
                updateAtterbergRow(instance.boreholeId, rowIndex, field, value)
              }
            />
          ))
        )}
      </div>
    </TestSection>
  );
};

interface AtterbergTestInstanceProps {
  instance: AtterbergInstance;
  onRemove: () => void;
  onUpdateBoreholeId: (oldId: string, newId: string) => void;
  onAddRow: () => void;
  onRemoveRow: (rowIndex: number) => void;
  onUpdateRow: (rowIndex: number, field: keyof AtterbergRow, value: string) => void;
}

const AtterbergTestInstance = ({
  instance,
  onRemove,
  onUpdateBoreholeId,
  onAddRow,
  onRemoveRow,
  onUpdateRow,
}: AtterbergTestInstanceProps) => {
  const [isEditingId, setIsEditingId] = useState(false);
  const [editId, setEditId] = useState(instance.boreholeId);

  const instanceStats = useMemo(() => {
    const filledRows = instance.rows.filter(r => r.ll && r.pl);
    const avgLl = filledRows.length > 0
      ? (filledRows.reduce((sum, r) => sum + parseFloat(r.ll), 0) / filledRows.length).toFixed(1)
      : "";
    const avgPl = filledRows.length > 0
      ? (filledRows.reduce((sum, r) => sum + parseFloat(r.pl), 0) / filledRows.length).toFixed(1)
      : "";
    const avgPi = filledRows.length > 0 && avgLl && avgPl
      ? (parseFloat(avgLl) - parseFloat(avgPl)).toFixed(1)
      : "";

    return { filledRows: filledRows.length, avgLl, avgPl, avgPi };
  }, [instance.rows]);

  const handleSaveId = () => {
    if (editId.trim() && editId !== instance.boreholeId) {
      onUpdateBoreholeId(instance.boreholeId, editId);
    }
    setIsEditingId(false);
  };

  return (
    <div className="border rounded-lg p-4 space-y-3 bg-card">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 flex-1">
          {isEditingId ? (
            <Input
              value={editId}
              onChange={(e) => setEditId(e.target.value)}
              onBlur={handleSaveId}
              onKeyPress={(e) => {
                if (e.key === "Enter") handleSaveId();
              }}
              className="h-8 max-w-xs"
              autoFocus
            />
          ) : (
            <div
              onClick={() => setIsEditingId(true)}
              className="text-sm font-semibold cursor-pointer hover:text-primary"
            >
              {instance.boreholeId}
            </div>
          )}
          {instanceStats.filledRows > 0 && (
            <div className="text-xs text-muted-foreground">
              ({instanceStats.filledRows} sample{instanceStats.filledRows !== 1 ? "s" : ""})
            </div>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-destructive hover:text-destructive"
          onClick={onRemove}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Stats */}
      {instanceStats.filledRows > 0 && (
        <div className="grid grid-cols-3 gap-2 text-xs bg-muted/50 rounded p-2">
          <div>
            <span className="text-muted-foreground">Avg LL:</span> <strong>{instanceStats.avgLl}%</strong>
          </div>
          <div>
            <span className="text-muted-foreground">Avg PL:</span> <strong>{instanceStats.avgPl}%</strong>
          </div>
          <div>
            <span className="text-muted-foreground">Avg PI:</span> <strong>{instanceStats.avgPi}%</strong>
          </div>
        </div>
      )}

      {/* Rows table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2 px-2 font-medium text-muted-foreground">Depth (m)</th>
              <th className="text-left py-2 px-2 font-medium text-muted-foreground">LL (%)</th>
              <th className="text-left py-2 px-2 font-medium text-muted-foreground">PL (%)</th>
              <th className="text-left py-2 px-2 font-medium text-muted-foreground">PI (%)</th>
              <th className="w-10"></th>
            </tr>
          </thead>
          <tbody>
            {instance.rows.map((row, i) => {
              const pi = row.ll && row.pl ? (parseFloat(row.ll) - parseFloat(row.pl)).toFixed(1) : "";
              return (
                <tr key={i} className="border-b border-border/50">
                  <td className="py-1.5 px-2">
                    <Input
                      type="number"
                      value={row.depth}
                      onChange={(e) => onUpdateRow(i, "depth", e.target.value)}
                      className="h-8"
                      placeholder="0"
                    />
                  </td>
                  <td className="py-1.5 px-2">
                    <Input
                      type="number"
                      value={row.ll}
                      onChange={(e) => onUpdateRow(i, "ll", e.target.value)}
                      className="h-8"
                      placeholder="0"
                    />
                  </td>
                  <td className="py-1.5 px-2">
                    <Input
                      type="number"
                      value={row.pl}
                      onChange={(e) => onUpdateRow(i, "pl", e.target.value)}
                      className="h-8"
                      placeholder="0"
                    />
                  </td>
                  <td className="py-1.5 px-2">
                    <CalculatedInput value={pi} label="PI" />
                  </td>
                  <td className="py-1.5 px-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => onRemoveRow(i)}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Add row button */}
      <Button
        variant="outline"
        size="sm"
        className="w-full"
        onClick={onAddRow}
      >
        <Plus className="h-3.5 w-3.5 mr-1" /> Add Row
      </Button>
    </div>
  );
};

export default AtterbergTest;
