import { Plus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { PlasticLimitTrial } from "@/context/TestDataContext";
import { isPlasticLimitTrialStarted, isPlasticLimitTrialValid, sanitizeNumericInput } from "@/lib/atterbergCalculations";
import { cn } from "@/lib/utils";

interface PlasticLimitSectionProps {
  trials: PlasticLimitTrial[];
  result: number | null;
  onChangeTrials: (trials: PlasticLimitTrial[]) => void;
}

const createTrial = (index: number): PlasticLimitTrial => ({
  id: `trial-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  trialNo: String(index + 1),
  moisture: "",
});

const PlasticLimitSection = ({ trials, result, onChangeTrials }: PlasticLimitSectionProps) => {
  const updateTrial = (index: number, value: string) => {
    onChangeTrials(
      trials.map((trial, trialIndex) =>
        trialIndex === index
          ? {
              ...trial,
              moisture: sanitizeNumericInput(value),
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
        <span>Capture each rolled thread moisture content.</span>
        <span>Incomplete rows are ignored in the PL average.</span>
      </div>

      <div className="rounded-lg border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[420px] text-sm">
            <thead>
              <tr className="bg-muted border-b">
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">Trial</th>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">Moisture Content (%)</th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody>
              {trials.map((trial, index) => {
                const started = isPlasticLimitTrialStarted(trial);
                const valid = isPlasticLimitTrialValid(trial);

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
                        value={trial.moisture}
                        onChange={(event) => updateTrial(index, event.target.value)}
                        className={cn("h-8", started && !valid && !trial.moisture && "border-amber-300")}
                        placeholder="24"
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
          <span className="text-sm font-medium text-muted-foreground">Plastic Limit (PL)</span>
          <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{result !== null ? `${result}%` : "-"}</span>
        </div>
      </div>
    </div>
  );
};

export default PlasticLimitSection;
