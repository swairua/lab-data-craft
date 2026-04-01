import { useState, useMemo, useEffect } from "react";
import TestSection from "@/components/TestSection";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import CalculatedInput from "@/components/CalculatedInput";
import { useProject } from "@/context/ProjectContext";
import { generateTestPDF } from "@/lib/pdfGenerator";
import { generateTestCSV } from "@/lib/csvExporter";
import { useTestReport } from "@/hooks/useTestReport";
import { useBorehole } from "@/context/BoreholeContext";

const AtterbergTest = () => {
  const project = useProject();
  const { activeBoreholeId, boreholes } = useBorehole();
  const activeBorehole = boreholes.find(b => b.id === activeBoreholeId);

  // Store data per borehole
  const [dataByBorehole, setDataByBorehole] = useState<Record<string, { ll: string; pl: string }>>({});

  const current = dataByBorehole[activeBoreholeId] || { ll: "", pl: "" };
  const { ll, pl } = current;

  const setField = (field: "ll" | "pl", value: string) => {
    setDataByBorehole(prev => ({
      ...prev,
      [activeBoreholeId]: { ...prev[activeBoreholeId] || { ll: "", pl: "" }, [field]: value },
    }));
  };

  const pi = ll && pl ? (parseFloat(ll) - parseFloat(pl)).toFixed(1) : "";

  const dataPoints = [ll, pl].filter(Boolean).length;
  const keyResults = useMemo(() => [
    { label: "LL", value: ll ? `${ll}%` : "" },
    { label: "PL", value: pl ? `${pl}%` : "" },
    { label: "PI", value: pi ? `${pi}%` : "" },
  ], [ll, pl, pi]);
  useTestReport("atterberg", dataPoints, keyResults);

  const exportPDF = () => {
    generateTestPDF({
      title: `Atterberg Limits — ${activeBorehole?.name || activeBoreholeId}`,
      ...project,
      fields: [
        { label: "Borehole", value: activeBorehole?.name || "" },
        { label: "Depth (m)", value: activeBorehole?.depth || "" },
        { label: "Location", value: activeBorehole?.location || "" },
        { label: "Liquid Limit (LL) %", value: ll },
        { label: "Plastic Limit (PL) %", value: pl },
        { label: "Plasticity Index (PI) %", value: pi },
      ],
    });
  };

  const csvData = {
    title: `Atterberg Limits — ${activeBorehole?.name || activeBoreholeId}`,
    ...project,
    fields: [
      { label: "Borehole", value: activeBorehole?.name || "" },
      { label: "Depth (m)", value: activeBorehole?.depth || "" },
      { label: "Location", value: activeBorehole?.location || "" },
      { label: "Liquid Limit (LL) %", value: ll },
      { label: "Plastic Limit (PL) %", value: pl },
      { label: "Plasticity Index (PI) %", value: pi },
    ],
  };

  return (
    <TestSection
      title={`Atterberg Limits — ${activeBorehole?.name || ""}`}
      onSave={() => {}}
      onClear={() => setField("ll", "") || setField("pl", "")}
      onExportPDF={exportPDF}
      onExportCSV={() => generateTestCSV(csvData)}
    >
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Liquid Limit (LL) %</Label>
          <Input type="number" value={ll} onChange={(e) => setField("ll", e.target.value)} placeholder="0" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Plastic Limit (PL) %</Label>
          <Input type="number" value={pl} onChange={(e) => setField("pl", e.target.value)} placeholder="0" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Plasticity Index (PI) %</Label>
          <CalculatedInput value={pi} label="Plasticity Index" />
        </div>
      </div>
    </TestSection>
  );
};

export default AtterbergTest;
