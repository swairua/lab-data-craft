import { Plus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ShrinkageLimitTrial } from "@/context/TestDataContext";
import { isShrinkageLimitTrialStarted, sanitizeNumericInput } from "@/lib/atterbergCalculations";
import { cn } from "@/lib/utils";

interface LinearShrinkageSectionProps {
  trials: ShrinkageLimitTrial[];
  result: number | null;
  onChangeTrials: (trials: ShrinkageLimitTrial[]) => void;
}

const createTrial = (index: number): ShrinkageLimitTrial => ({
  id: `trial-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  trialNo: String(index + 1),
  initialVolume: "", // Will use as initial length in linear mode
  finalVolume: "", // Will use as final length in linear mode
  moisture: "",
});

const LinearShrinkageSection = ({ trials, result, onChangeTrials }: LinearShrinkageSectionProps) => {
  const updateTrial = (index: number, field: keyof ShrinkageLimitTrial, value: string) => {
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

  const isTrialValid = (trial: ShrinkageLimitTrial): boolean => {
    const initialLength = Number(trial.initialVolume);
    const finalLength = Number(trial.finalVolume);
    return (
      !isNaN(initialLength) &&
      !isNaN(finalLength) &&
      initialLength > 0 &&
      finalLength > 0 &&
      finalLength <= initialLength
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Provide initial and final length measurements for linear shrinkage.</span>
        <span>Incomplete rows are ignored in the LS calculation.</span>
      </div>

      <div className="rounded-lg border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-sm">
            <thead>
              <tr className="bg-muted border-b">
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">Trial</th>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">Initial Length (mm)</th>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">Final Length (mm)</th>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">Moisture Content (%)</th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody>
              {trials.map((trial, index) => {
                const started = isShrinkageLimitTrialStarted(trial);
                const valid = isTrialValid(trial);

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
                        value={trial.initialVolume}
                        onChange={(event) => updateTrial(index, "initialVolume", event.target.value)}
                        className={cn("h-8", started && !valid && !trial.initialVolume && "border-amber-300")}
                        placeholder="100"
                      />
                    </td>
                    <td className="px-3 py-1.5">
                      <Input
                        type="text"
                        inputMode="decimal"
                        value={trial.finalVolume}
                        onChange={(event) => updateTrial(index, "finalVolume", event.target.value)}
                        className={cn(
                          "h-8",
                          started && !valid && !trial.finalVolume && "border-amber-300",
                          started && trial.finalVolume && Number(trial.finalVolume) > Number(trial.initialVolume) && "border-amber-300",
                        )}
                        placeholder="95"
                      />
                    </td>
                    <td className="px-3 py-1.5">
                      <Input
                        type="text"
                        inputMode="decimal"
                        value={trial.moisture}
                        onChange={(event) => updateTrial(index, "moisture", event.target.value)}
                        className={cn("h-8", started && !valid && !trial.moisture && "border-amber-300")}
                        placeholder="18"
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
          <span className="text-sm font-medium text-muted-foreground">Linear Shrinkage (%)</span>
          <span className="text-lg font-bold text-amber-600 dark:text-amber-400">{result !== null ? `${result}%` : "-"}</span>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Linear shrinkage = (Initial Length - Final Length) / Initial Length × 100
        </p>
      </div>
    </div>
  );
};

export default LinearShrinkageSection;
