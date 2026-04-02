import { useState, useMemo, useEffect, useRef } from "react";
import TestSection from "@/components/TestSection";
import { useProject } from "@/context/ProjectContext";
import { generateTestPDF } from "@/lib/pdfGenerator";
import { generateTestCSV } from "@/lib/csvExporter";
import { useTestReport } from "@/hooks/useTestReport";
import {
  useTestData,
  type AtterbergTestType,
  type EnhancedAtterbergTest,
} from "@/context/TestDataContext";
import { Button } from "@/components/ui/button";
import { Plus, Download, Upload } from "lucide-react";
import { toast } from "sonner";
import AtterbergTestCard from "./AtterbergTestCard";
import { exportAsJSON, importFromJSON, downloadJSON } from "@/lib/jsonExporter";

const AtterbergTest = () => {
  const project = useProject();
  const {
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
    updateTest,
  } = useTestData();

  const loadedRef = useRef(false);

  // Load from localStorage on mount
  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;

    const saved = localStorage.getItem("enhancedAtterbergTests");
    if (saved && enhancedAtterbergTests.length === 0) {
      try {
        const data = JSON.parse(saved) as EnhancedAtterbergTest[];
        data.forEach((savedTest) => {
          addEnhancedAtterbergTest(savedTest.testType);
        });
      } catch (e) {
        console.error("Failed to load saved enhanced atterberg tests:", e);
      }
    }
  }, [addEnhancedAtterbergTest]);

  // Update loaded tests with saved data after they're created
  useEffect(() => {
    if (loadedRef.current && enhancedAtterbergTests.length > 0 && localStorage.getItem("enhancedAtterbergTests")) {
      try {
        const saved = localStorage.getItem("enhancedAtterbergTests");
        if (!saved) return;

        const data = JSON.parse(saved) as EnhancedAtterbergTest[];

        // Only update if we haven't already (check if first test title matches)
        if (enhancedAtterbergTests[0]?.testTitle === data[0]?.testTitle) {
          return; // Already loaded
        }

        data.forEach((savedTest, idx) => {
          if (idx < enhancedAtterbergTests.length) {
            const testId = enhancedAtterbergTests[idx].id;

            // Update title
            updateEnhancedTestTitle(testId, savedTest.testTitle);

            // Update expanded state
            if (!savedTest.isExpanded) {
              toggleEnhancedTestExpanded(testId);
            }

            // Update Liquid Limit rows
            if (savedTest.liquidLimitRows.length > 1) {
              for (let i = 1; i < savedTest.liquidLimitRows.length; i++) {
                addLiquidLimitRow(testId);
              }
            }
            savedTest.liquidLimitRows.forEach((row, rowIdx) => {
              updateLiquidLimitRow(testId, rowIdx, "trialNo", row.trialNo);
              updateLiquidLimitRow(testId, rowIdx, "blows", row.blows);
              updateLiquidLimitRow(testId, rowIdx, "moisture", row.moisture);
            });

            // Update Plastic Limit rows
            if (savedTest.plasticLimitRows.length > 1) {
              for (let i = 1; i < savedTest.plasticLimitRows.length; i++) {
                addPlasticLimitRow(testId);
              }
            }
            savedTest.plasticLimitRows.forEach((row, rowIdx) => {
              updatePlasticLimitRow(testId, rowIdx, "trialNo", row.trialNo);
              updatePlasticLimitRow(testId, rowIdx, "moisture", row.moisture);
            });

            // Update Shrinkage Limit rows
            if (savedTest.shrinkageLimitRows.length > 0) {
              for (let i = 1; i < savedTest.shrinkageLimitRows.length; i++) {
                addShrinkageLimitRow(testId);
              }
            }
            savedTest.shrinkageLimitRows.forEach((row, rowIdx) => {
              updateShrinkageLimitRow(testId, rowIdx, "initialVolume", row.initialVolume);
              updateShrinkageLimitRow(testId, rowIdx, "finalVolume", row.finalVolume);
              updateShrinkageLimitRow(testId, rowIdx, "moisture", row.moisture);
            });

            // Update calculated results
            if (Object.keys(savedTest.calculatedResults).length > 0) {
              updateCalculatedResults(testId, savedTest.calculatedResults);
            }
          }
        });
      } catch (e) {
        console.error("Failed to restore saved test data:", e);
      }
    }
  }, [
    enhancedAtterbergTests,
    updateEnhancedTestTitle,
    toggleEnhancedTestExpanded,
    addLiquidLimitRow,
    updateLiquidLimitRow,
    addPlasticLimitRow,
    updatePlasticLimitRow,
    addShrinkageLimitRow,
    updateShrinkageLimitRow,
    updateCalculatedResults,
  ]);

  // Calculate aggregate results
  const { totalDataPoints, aggregateResults } = useMemo(() => {
    let totalPoints = 0;
    const allLLs: number[] = [];
    const allPLs: number[] = [];
    const allPIs: number[] = [];
    const allSLs: number[] = [];

    enhancedAtterbergTests.forEach((test) => {
      if (test.calculatedResults.liquidLimit !== undefined && test.calculatedResults.liquidLimit !== null) {
        allLLs.push(test.calculatedResults.liquidLimit);
        totalPoints++;
      }
      if (test.calculatedResults.plasticLimit !== undefined && test.calculatedResults.plasticLimit !== null) {
        allPLs.push(test.calculatedResults.plasticLimit);
        totalPoints++;
      }
      if (test.calculatedResults.shrinkageLimit !== undefined && test.calculatedResults.shrinkageLimit !== null) {
        allSLs.push(test.calculatedResults.shrinkageLimit);
        totalPoints++;
      }
      if (test.calculatedResults.plasticityIndex !== undefined && test.calculatedResults.plasticityIndex !== null) {
        allPIs.push(test.calculatedResults.plasticityIndex);
      }
    });

    const avgLL = allLLs.length > 0 ? (allLLs.reduce((a, b) => a + b) / allLLs.length).toFixed(1) : "";
    const avgPL = allPLs.length > 0 ? (allPLs.reduce((a, b) => a + b) / allPLs.length).toFixed(1) : "";
    const avgSL = allSLs.length > 0 ? (allSLs.reduce((a, b) => a + b) / allSLs.length).toFixed(1) : "";
    const avgPI = allPIs.length > 0 ? (allPIs.reduce((a, b) => a + b) / allPIs.length).toFixed(1) : "";

    return {
      totalDataPoints: totalPoints,
      aggregateResults: [
        { label: "Avg LL", value: avgLL ? `${avgLL}%` : "" },
        { label: "Avg PL", value: avgPL ? `${avgPL}%` : "" },
        { label: "Avg SL", value: avgSL ? `${avgSL}%` : "" },
        { label: "Avg PI", value: avgPI ? `${avgPI}%` : "" },
        { label: "Tests", value: enhancedAtterbergTests.length.toString() },
      ],
    };
  }, [enhancedAtterbergTests]);

  useTestReport("atterberg", totalDataPoints, aggregateResults);

  const handleAddTest = (testType: AtterbergTestType) => {
    addEnhancedAtterbergTest(testType);
  };

  const handleExportPDF = () => {
    if (enhancedAtterbergTests.length === 0) return;

    const tables = enhancedAtterbergTests.map((test) => {
      const headers = getTableHeaders(test.testType);
      const rows = getTableRows(test);
      return { headers, rows };
    });

    generateTestPDF({
      title: "Atterberg Limits Testing",
      ...project,
      tables,
    });
  };

  const handleExportCSV = () => {
    if (enhancedAtterbergTests.length === 0) return;

    const tables = enhancedAtterbergTests.map((test) => {
      const headers = getTableHeaders(test.testType);
      const rows = getTableRows(test);
      return { headers, rows };
    });

    generateTestCSV({
      title: "Atterberg Limits Testing",
      ...project,
      tables,
    });
  };

  const handleClearAll = () => {
    enhancedAtterbergTests.forEach((test) => {
      removeEnhancedAtterbergTest(test.id);
    });
    localStorage.removeItem("enhancedAtterbergTests");
    updateTest("atterberg", {
      status: "not-started",
      dataPoints: 0,
      keyResults: [],
    });
  };

  const handleSave = () => {
    const status =
      totalDataPoints === 0
        ? "not-started"
        : totalDataPoints > 0 && enhancedAtterbergTests.length > 0
          ? "completed"
          : "in-progress";
    updateTest("atterberg", {
      status,
      dataPoints: totalDataPoints,
      keyResults: aggregateResults,
    });
    localStorage.setItem("enhancedAtterbergTests", JSON.stringify(enhancedAtterbergTests));
  };

  const handleExportJSON = () => {
    if (enhancedAtterbergTests.length === 0) {
      toast.error("No tests to export");
      return;
    }
    const jsonString = exportAsJSON(enhancedAtterbergTests);
    downloadJSON(jsonString, `atterberg-tests-${new Date().toISOString().split("T")[0]}.json`);
    toast.success("Tests exported as JSON");
  };

  const handleImportJSON = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = (e: any) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event: any) => {
        try {
          const jsonString = event.target.result;
          const tests = importFromJSON(jsonString);

          if (!tests || tests.length === 0) {
            toast.error("Invalid JSON file format");
            return;
          }

          // Clear existing tests
          enhancedAtterbergTests.forEach((test) => {
            removeEnhancedAtterbergTest(test.id);
          });

          // Import new tests
          tests.forEach((test) => {
            addEnhancedAtterbergTest(test.testType);
            updateEnhancedTestTitle(test.id, test.testTitle);
            if (!test.isExpanded) {
              toggleEnhancedTestExpanded(test.id);
            }

            // Restore Liquid Limit rows
            if (test.liquidLimitRows.length > 1) {
              for (let i = 1; i < test.liquidLimitRows.length; i++) {
                addLiquidLimitRow(test.id);
              }
            }
            test.liquidLimitRows.forEach((row, idx) => {
              updateLiquidLimitRow(test.id, idx, "trialNo", row.trialNo);
              updateLiquidLimitRow(test.id, idx, "blows", row.blows);
              updateLiquidLimitRow(test.id, idx, "moisture", row.moisture);
            });

            // Restore Plastic Limit rows
            if (test.plasticLimitRows.length > 1) {
              for (let i = 1; i < test.plasticLimitRows.length; i++) {
                addPlasticLimitRow(test.id);
              }
            }
            test.plasticLimitRows.forEach((row, idx) => {
              updatePlasticLimitRow(test.id, idx, "trialNo", row.trialNo);
              updatePlasticLimitRow(test.id, idx, "moisture", row.moisture);
            });

            // Restore Shrinkage Limit rows
            if (test.shrinkageLimitRows.length > 0) {
              for (let i = 1; i < test.shrinkageLimitRows.length; i++) {
                addShrinkageLimitRow(test.id);
              }
            }
            test.shrinkageLimitRows.forEach((row, idx) => {
              updateShrinkageLimitRow(test.id, idx, "initialVolume", row.initialVolume);
              updateShrinkageLimitRow(test.id, idx, "finalVolume", row.finalVolume);
              updateShrinkageLimitRow(test.id, idx, "moisture", row.moisture);
            });

            // Restore calculated results
            if (Object.keys(test.calculatedResults).length > 0) {
              updateCalculatedResults(test.id, test.calculatedResults);
            }
          });

          toast.success(`Imported ${tests.length} test(s)`);
        } catch (error) {
          console.error("Import error:", error);
          toast.error("Failed to import JSON file");
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  return (
    <TestSection
      title="Atterberg Limits Testing"
      onSave={handleSave}
      onClear={handleClearAll}
      onExportPDF={handleExportPDF}
      onExportCSV={handleExportCSV}
    >
      <div className="space-y-4">
        {/* Add New Test Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <Button
            onClick={() => handleAddTest("liquidLimit")}
            variant="outline"
            className="gap-2"
            size="sm"
          >
            <Plus className="h-4 w-4" /> Liquid Limit
          </Button>
          <Button
            onClick={() => handleAddTest("plasticLimit")}
            variant="outline"
            className="gap-2"
            size="sm"
          >
            <Plus className="h-4 w-4" /> Plastic Limit
          </Button>
          <Button
            onClick={() => handleAddTest("shrinkageLimit")}
            variant="outline"
            className="gap-2"
            size="sm"
          >
            <Plus className="h-4 w-4" /> Shrinkage Limit
          </Button>
        </div>

        {/* Import/Export JSON Buttons */}
        <div className="flex gap-2 border-t pt-3">
          <Button
            onClick={handleExportJSON}
            variant="outline"
            className="gap-2"
            size="sm"
            disabled={enhancedAtterbergTests.length === 0}
          >
            <Download className="h-4 w-4" /> Export JSON
          </Button>
          <Button
            onClick={handleImportJSON}
            variant="outline"
            className="gap-2"
            size="sm"
          >
            <Upload className="h-4 w-4" /> Import JSON
          </Button>
        </div>

        {/* Empty State */}
        {enhancedAtterbergTests.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground border rounded-lg bg-muted/20">
            <p className="text-sm">No tests yet. Click above to add a test.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {enhancedAtterbergTests.map((test) => (
              <AtterbergTestCard
                key={test.id}
                test={test}
                onDelete={() => removeEnhancedAtterbergTest(test.id)}
                onUpdateTitle={(title) => updateEnhancedTestTitle(test.id, title)}
                onUpdateType={(type) => updateEnhancedTestType(test.id, type)}
                onToggleExpanded={() => toggleEnhancedTestExpanded(test.id)}
                onAddLiquidLimitRow={() => addLiquidLimitRow(test.id)}
                onRemoveLiquidLimitRow={(idx) => removeLiquidLimitRow(test.id, idx)}
                onUpdateLiquidLimitRow={(idx, field, value) =>
                  updateLiquidLimitRow(test.id, idx, field as any, value)
                }
                onAddPlasticLimitRow={() => addPlasticLimitRow(test.id)}
                onRemovePlasticLimitRow={(idx) => removePlasticLimitRow(test.id, idx)}
                onUpdatePlasticLimitRow={(idx, field, value) =>
                  updatePlasticLimitRow(test.id, idx, field as any, value)
                }
                onAddShrinkageLimitRow={() => addShrinkageLimitRow(test.id)}
                onRemoveShrinkageLimitRow={(idx) => removeShrinkageLimitRow(test.id, idx)}
                onUpdateShrinkageLimitRow={(idx, field, value) =>
                  updateShrinkageLimitRow(test.id, idx, field as any, value)
                }
                onUpdateCalculatedResults={(results) => updateCalculatedResults(test.id, results)}
              />
            ))}
          </div>
        )}
      </div>
    </TestSection>
  );
};

// Helper functions
function getTableHeaders(testType: string): string[] {
  switch (testType) {
    case "liquidLimit":
      return ["Trial No.", "Number of Blows", "Moisture Content (%)", "Liquid Limit (%)"];
    case "plasticLimit":
      return ["Trial No.", "Moisture Content (%)"];
    case "shrinkageLimit":
      return ["Initial Volume", "Final Volume", "Moisture Content (%)"];
    default:
      return [];
  }
}

function getTableRows(test: EnhancedAtterbergTest): string[][] {
  switch (test.testType) {
    case "liquidLimit":
      return test.liquidLimitRows.map((row) => [
        row.trialNo || "—",
        row.blows || "—",
        row.moisture || "—",
        test.calculatedResults.liquidLimit ? `${test.calculatedResults.liquidLimit}` : "—",
      ]);
    case "plasticLimit":
      return test.plasticLimitRows.map((row) => [
        row.trialNo || "—",
        row.moisture || "—",
      ]);
    case "shrinkageLimit":
      return test.shrinkageLimitRows.map((row) => [
        row.initialVolume || "—",
        row.finalVolume || "—",
        row.moisture || "—",
      ]);
    default:
      return [];
  }
}

export default AtterbergTest;
