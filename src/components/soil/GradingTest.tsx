import { useState } from "react";
import TestSection from "@/components/TestSection";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import CalculatedInput from "@/components/CalculatedInput";
import { Plus, X } from "lucide-react";
import { useProject } from "@/context/ProjectContext";
import { generateTestPDF } from "@/lib/pdfGenerator";
import { generateTestCSV } from "@/lib/csvExporter";

interface Row {
  sieveSize: string;
  weightRetained: string;
}

const GradingTest = () => {
  const project = useProject();
  const defaultRows: Row[] = [
    { sieveSize: "75", weightRetained: "" },
    { sieveSize: "63", weightRetained: "" },
    { sieveSize: "37.5", weightRetained: "" },
    { sieveSize: "20", weightRetained: "" },
    { sieveSize: "10", weightRetained: "" },
    { sieveSize: "5", weightRetained: "" },
    { sieveSize: "2.36", weightRetained: "" },
    { sieveSize: "1.18", weightRetained: "" },
    { sieveSize: "0.6", weightRetained: "" },
    { sieveSize: "0.3", weightRetained: "" },
    { sieveSize: "0.15", weightRetained: "" },
    { sieveSize: "0.075", weightRetained: "" },
    { sieveSize: "Pan", weightRetained: "" },
  ];

  const [rows, setRows] = useState<Row[]>(defaultRows);

  const totalWeight = rows.reduce((s, r) => s + (parseFloat(r.weightRetained) || 0), 0);

  const getPercentPassing = (index: number) => {
    if (totalWeight === 0) return "";
    let cumRetained = 0;
    for (let i = 0; i <= index; i++) {
      cumRetained += parseFloat(rows[i].weightRetained) || 0;
    }
    return ((1 - cumRetained / totalWeight) * 100).toFixed(1);
  };

  const update = (i: number, field: keyof Row, val: string) => {
    const next = [...rows];
    next[i] = { ...next[i], [field]: val };
    setRows(next);
  };

  const exportPDF = () => {
    generateTestPDF({
      title: "Grading (Sieve Analysis)",
      ...project,
      tables: [{
        headers: ["Sieve Size (mm)", "Weight Retained (g)", "% Passing"],
        rows: rows.map((r, i) => [r.sieveSize, r.weightRetained || "—", getPercentPassing(i) || "—"]),
      }],
    });
  };

  return (
    <TestSection title="Grading (Sieve Analysis)" onSave={() => {}} onClear={() => setRows(defaultRows)} onExportPDF={exportPDF} onExportCSV={() => generateTestCSV({ title: "Grading (Sieve Analysis)", ...project, tables: [{ headers: ["Sieve Size (mm)", "Weight Retained (g)", "% Passing"], rows: rows.map((r, i) => [r.sieveSize, r.weightRetained || "—", getPercentPassing(i) || "—"]) }] })}>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2 px-2 font-medium text-muted-foreground">Sieve Size (mm)</th>
              <th className="text-left py-2 px-2 font-medium text-muted-foreground">Weight Retained (g)</th>
              <th className="text-left py-2 px-2 font-medium text-muted-foreground">% Passing</th>
              <th className="w-10"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="border-b border-border/50">
                <td className="py-1.5 px-2">
                  <Input value={row.sieveSize} onChange={(e) => update(i, "sieveSize", e.target.value)} className="h-8" />
                </td>
                <td className="py-1.5 px-2">
                  <Input type="number" value={row.weightRetained} onChange={(e) => update(i, "weightRetained", e.target.value)} className="h-8" placeholder="0" />
                </td>
                <td className="py-1.5 px-2">
                  <CalculatedInput value={getPercentPassing(i)} />
                </td>
                <td className="py-1.5 px-1">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setRows(rows.filter((_, j) => j !== i))}>
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Button variant="outline" size="sm" className="mt-3" onClick={() => setRows([...rows, { sieveSize: "", weightRetained: "" }])}>
        <Plus className="h-3.5 w-3.5 mr-1" /> Add Row
      </Button>
    </TestSection>
  );
};

export default GradingTest;
