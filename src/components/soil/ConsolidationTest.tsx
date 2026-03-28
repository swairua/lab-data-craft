import { useState } from "react";
import TestSection from "@/components/TestSection";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, X } from "lucide-react";
import { useProject } from "@/context/ProjectContext";
import { generateTestPDF } from "@/lib/pdfGenerator";

interface Row { time: string; settlement: string }

const ConsolidationTest = () => {
  const project = useProject();
  const [rows, setRows] = useState<Row[]>([{ time: "", settlement: "" },{ time: "", settlement: "" },{ time: "", settlement: "" }]);
  const update = (i: number, field: keyof Row, val: string) => { const next = [...rows]; next[i] = { ...next[i], [field]: val }; setRows(next); };

  const exportPDF = () => {
    generateTestPDF({ title: "Consolidation Test", ...project, tables: [{ headers: ["Time (min)", "Settlement (mm)"], rows: rows.map(r => [r.time || "—", r.settlement || "—"]) }] });
  };

  return (
    <TestSection title="Consolidation" onSave={() => {}} onClear={() => setRows([{ time: "", settlement: "" }])} onExportPDF={exportPDF}>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="border-b"><th className="text-left py-2 px-2 font-medium text-muted-foreground">Time (min)</th><th className="text-left py-2 px-2 font-medium text-muted-foreground">Settlement (mm)</th><th className="w-10"></th></tr></thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="border-b border-border/50">
                <td className="py-1.5 px-2"><Input type="number" value={row.time} onChange={(e) => update(i, "time", e.target.value)} className="h-8" placeholder="0" /></td>
                <td className="py-1.5 px-2"><Input type="number" value={row.settlement} onChange={(e) => update(i, "settlement", e.target.value)} className="h-8" placeholder="0" /></td>
                <td className="py-1.5 px-1"><Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setRows(rows.filter((_, j) => j !== i))}><X className="h-3.5 w-3.5" /></Button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Button variant="outline" size="sm" className="mt-3" onClick={() => setRows([...rows, { time: "", settlement: "" }])}><Plus className="h-3.5 w-3.5 mr-1" /> Add Row</Button>
    </TestSection>
  );
};

export default ConsolidationTest;
