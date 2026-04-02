import { useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { Plus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { LiquidLimitTrial } from "@/context/TestDataContext";
import {
  getLiquidLimitGraphData,
  isLiquidLimitTrialStarted,
  isLiquidLimitTrialValid,
  sanitizeNumericInput,
} from "@/lib/atterbergCalculations";
import { cn } from "@/lib/utils";

interface LiquidLimitSectionProps {
  trials: LiquidLimitTrial[];
  result: number | null;
  onChangeTrials: (trials: LiquidLimitTrial[]) => void;
}

const createTrial = (index: number): LiquidLimitTrial => ({
  id: `trial-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  trialNo: String(index + 1),
  blows: "",
  moisture: "",
  cupMass: "",
  wetMass: "",
  dryMass: "",
});

const LiquidLimitSection = ({ trials, result, onChangeTrials }: LiquidLimitSectionProps) => {
  const graphData = useMemo(() => getLiquidLimitGraphData(trials), [trials]);

  const updateTrial = (index: number, field: keyof LiquidLimitTrial, value: string) => {
    onChangeTrials(
      trials.map((trial, trialIndex) =>
        trialIndex === index
          ? {
              ...trial,
              [field]: field === "trialNo" ? value : sanitizeNumericInput(value),
            }
          : trial,
      ),
    );
  };

  const addTrial = () => {
    onChangeTrials([...trials, createTrial(trials.length)]);
  };

  const removeTrial = (index: number) => {
    const nextTrials =
      trials.length > 1
        ? trials.filter((_, trialIndex) => trialIndex !== index)
        : [createTrial(0)];

    onChangeTrials(nextTrials.map((trial, trialIndex) => ({ ...trial, trialNo: String(trialIndex + 1) })));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Enter complete blows and moisture values for each trial.</span>
        <span>Incomplete rows are ignored in the LL result.</span>
      </div>

      <div className="rounded-lg border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-sm">
            <thead>
              <tr className="bg-muted border-b">
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">Trial</th>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">Blows</th>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">Moisture (%)</th>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">Cup Mass (g)</th>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">Wet Mass (g)</th>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">Dry Mass (g)</th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody>
              {trials.map((trial, index) => {
                const started = isLiquidLimitTrialStarted(trial);
                const valid = isLiquidLimitTrialValid(trial);

                return (
                  <tr
                    key={trial.id}
                    className={cn(
                      "border-b border-border/60 transition-colors",
                      started && !valid && "bg-amber-50/70 dark:bg-amber-950/20",
                    )}
                  >
                    <td className="px-3 py-1.5">
                      <Input value={trial.trialNo} disabled className="h-8 bg-muted/50" />
                    </td>
                    <td className="px-3 py-1.5">
                      <Input
                        type="text"
                        inputMode="decimal"
                        value={trial.blows}
                        onChange={(event) => updateTrial(index, "blows", event.target.value)}
                        className={cn("h-8", started && !valid && !trial.blows && "border-amber-300")}
                        placeholder="15"
                      />
                    </td>
                    <td className="px-3 py-1.5">
                      <Input
                        type="text"
                        inputMode="decimal"
                        value={trial.moisture}
                        onChange={(event) => updateTrial(index, "moisture", event.target.value)}
                        className={cn("h-8", started && !valid && !trial.moisture && "border-amber-300")}
                        placeholder="35"
                      />
                    </td>
                    <td className="px-3 py-1.5">
                      <Input
                        type="text"
                        inputMode="decimal"
                        value={trial.cupMass || ""}
                        onChange={(event) => updateTrial(index, "cupMass", event.target.value)}
                        className="h-8"
                        placeholder="-"
                      />
                    </td>
                    <td className="px-3 py-1.5">
                      <Input
                        type="text"
                        inputMode="decimal"
                        value={trial.wetMass || ""}
                        onChange={(event) => updateTrial(index, "wetMass", event.target.value)}
                        className="h-8"
                        placeholder="-"
                      />
                    </td>
                    <td className="px-3 py-1.5">
                      <Input
                        type="text"
                        inputMode="decimal"
                        value={trial.dryMass || ""}
                        onChange={(event) => updateTrial(index, "dryMass", event.target.value)}
                        className="h-8"
                        placeholder="-"
                      />
                    </td>
                    <td className="px-1 py-1.5">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => removeTrial(index)}
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
      </div>

      <Button type="button" variant="outline" size="sm" className="w-full" onClick={addTrial}>
        <Plus className="mr-1 h-3.5 w-3.5" /> Add Trial
      </Button>

      <div className="rounded-lg border bg-muted/40 p-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-muted-foreground">Liquid Limit (LL)</span>
          <span className="text-lg font-bold text-blue-600 dark:text-blue-400">{result !== null ? `${result}%` : "-"}</span>
        </div>
      </div>

      {graphData.length >= 2 && (
        <div className="rounded-lg border bg-card p-3">
          <h4 className="mb-3 text-sm font-medium text-foreground">Moisture vs Blows</h4>
          <div className="overflow-x-auto">
            <div className="h-[280px] min-w-[520px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={graphData} margin={{ top: 16, right: 20, left: 0, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="blows" stroke="hsl(var(--muted-foreground))" label={{ value: "Blows", position: "insideBottom", offset: -4 }} />
                  <YAxis stroke="hsl(var(--muted-foreground))" label={{ value: "Moisture (%)", angle: -90, position: "insideLeft" }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--background))",
                      borderColor: "hsl(var(--border))",
                      borderRadius: 8,
                    }}
                    formatter={(value: number) => [`${value.toFixed(2)}%`, "Moisture"]}
                    labelFormatter={(label) => `Blows: ${label}`}
                  />
                  <ReferenceLine x={25} stroke="hsl(var(--muted-foreground))" strokeDasharray="4 4" />
                  <Line
                    type="monotone"
                    dataKey="moisture"
                    name="Moisture"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={{ fill: "hsl(var(--primary))", r: 4 }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LiquidLimitSection;
