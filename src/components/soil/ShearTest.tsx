import { useState } from "react";
import TestSection from "@/components/TestSection";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, X } from "lucide-react";
import { useProject } from "@/context/ProjectContext";
import { generateTestPDF } from "@/lib/pdfGenerator";
import { generateTestCSV } from "@/lib/csvExporter";

interface Row { normalStress: string; shearStress: string }

const ShearTest = () => {
  const project = useProject();
  const [rows, setRows] = useState<Row[]>([{ normalStress: "", shearStress: "" },{ normalStress: "", shearStress: "" },{ normalStress: "", shearStress: "" }]);
  const update = (i: number, field: keyof Row, val: string) => { const next = [...rows]; next[i] = { ...next[i], [field]: val }; setRows(next); };

  const exportPDF = () => {
    generateTestPDF({ title: "Shear Test", ...project, tables: [{ headers: ["Normal Stress (kPa)", "Shear Stress (kPa)"], rows: rows.map(r => [r.normalStress || "—", r.shearStress || "—"]) }] });
  };

  return (
    <TestSection title="Shear Test" onSave={() => {}} onClear={() => setRows([{ normalStress: "", shearStress: "" }])} onExportPDF={exportPDF}>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="border-b"><th className="text-left py-2 px-2 font-medium text-muted-foreground">Normal Stress (kPa)</th><th className="text-left py-2 px-2 font-medium text-muted-foreground">Shear Stress (kPa)</th><th className="w-10"></th></tr></thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="border-b border-border/50">
                <td className="py-1.5 px-2"><Input type="number" value={row.normalStress} onChange={(e) => update(i, "normalStress", e.target.value)} className="h-8" placeholder="0" /></td>
                <td className="py-1.5 px-2"><Input type="number" value={row.shearStress} onChange={(e) => update(i, "shearStress", e.target.value)} className="h-8" placeholder="0" /></td>
                <td className="py-1.5 px-1"><Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setRows(rows.filter((_, j) => j !== i))}><X className="h-3.5 w-3.5" /></Button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Button variant="outline" size="sm" className="mt-3" onClick={() => setRows([...rows, { normalStress: "", shearStress: "" }])}><Plus className="h-3.5 w-3.5 mr-1" /> Add Row</Button>
    </TestSection>
  );
};

export default ShearTest;
