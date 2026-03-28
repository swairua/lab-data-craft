import { useState } from "react";
import TestSection from "@/components/TestSection";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import CalculatedInput from "@/components/CalculatedInput";
import { Plus, X } from "lucide-react";
import { useProject } from "@/context/ProjectContext";
import { generateTestPDF } from "@/lib/pdfGenerator";
import { generateTestCSV } from "@/lib/csvExporter";

interface Row { cubeId: string; load: string; width: string; height: string }

const CompressiveStrengthTest = () => {
  const project = useProject();
  const [rows, setRows] = useState<Row[]>([
    { cubeId: "C1", load: "", width: "150", height: "150" },
    { cubeId: "C2", load: "", width: "150", height: "150" },
    { cubeId: "C3", load: "", width: "150", height: "150" },
  ]);

  const getStrength = (row: Row) => {
    const load = parseFloat(row.load); const w = parseFloat(row.width); const h = parseFloat(row.height);
    if (!load || !w || !h) return "";
    return ((load * 1000) / (w * h)).toFixed(2);
  };

  const update = (i: number, field: keyof Row, val: string) => { const next = [...rows]; next[i] = { ...next[i], [field]: val }; setRows(next); };

  const exportPDF = () => {
    generateTestPDF({ title: "Compressive Strength (Cube Test)", ...project, tables: [{ headers: ["Cube ID", "Load (kN)", "Width (mm)", "Height (mm)", "Strength (MPa)"], rows: rows.map(r => [r.cubeId, r.load || "—", r.width, r.height, getStrength(r) || "—"]) }] });
  };

  return (
    <TestSection title="Compressive Strength (Cube Test)" onSave={() => {}} onClear={() => setRows([{ cubeId: "", load: "", width: "150", height: "150" }])} onExportPDF={exportPDF}>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="border-b"><th className="text-left py-2 px-2 font-medium text-muted-foreground">Cube ID</th><th className="text-left py-2 px-2 font-medium text-muted-foreground">Load (kN)</th><th className="text-left py-2 px-2 font-medium text-muted-foreground">Width (mm)</th><th className="text-left py-2 px-2 font-medium text-muted-foreground">Height (mm)</th><th className="text-left py-2 px-2 font-medium text-muted-foreground">Strength (MPa)</th><th className="w-10"></th></tr></thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="border-b border-border/50">
                <td className="py-1.5 px-2"><Input value={row.cubeId} onChange={(e) => update(i, "cubeId", e.target.value)} className="h-8" /></td>
                <td className="py-1.5 px-2"><Input type="number" value={row.load} onChange={(e) => update(i, "load", e.target.value)} className="h-8" placeholder="0" /></td>
                <td className="py-1.5 px-2"><Input type="number" value={row.width} onChange={(e) => update(i, "width", e.target.value)} className="h-8" /></td>
                <td className="py-1.5 px-2"><Input type="number" value={row.height} onChange={(e) => update(i, "height", e.target.value)} className="h-8" /></td>
                <td className="py-1.5 px-2"><CalculatedInput value={getStrength(row)} /></td>
                <td className="py-1.5 px-1"><Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setRows(rows.filter((_, j) => j !== i))}><X className="h-3.5 w-3.5" /></Button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Button variant="outline" size="sm" className="mt-3" onClick={() => setRows([...rows, { cubeId: `C${rows.length + 1}`, load: "", width: "150", height: "150" }])}><Plus className="h-3.5 w-3.5 mr-1" /> Add Row</Button>
    </TestSection>
  );
};

export default CompressiveStrengthTest;
