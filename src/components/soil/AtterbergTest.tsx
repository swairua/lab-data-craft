import { useState } from "react";
import TestSection from "@/components/TestSection";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import CalculatedInput from "@/components/CalculatedInput";

const AtterbergTest = () => {
  const [ll, setLl] = useState("");
  const [pl, setPl] = useState("");

  const pi = ll && pl ? (parseFloat(ll) - parseFloat(pl)).toFixed(1) : "";

  return (
    <TestSection title="Atterberg Limits" onSave={() => {}} onClear={() => { setLl(""); setPl(""); }}>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Liquid Limit (LL) %</Label>
          <Input type="number" value={ll} onChange={(e) => setLl(e.target.value)} placeholder="0" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Plastic Limit (PL) %</Label>
          <Input type="number" value={pl} onChange={(e) => setPl(e.target.value)} placeholder="0" />
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
