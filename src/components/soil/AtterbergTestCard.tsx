import { useEffect, useMemo, useState } from "react";
import { Check, ChevronDown, ChevronRight, Edit2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { AtterbergTest, AtterbergTestType, LiquidLimitTrial, PlasticLimitTrial, ShrinkageLimitTrial } from "@/context/TestDataContext";
import { areCalculatedResultsEqual, calculateTestResult, countValidTrials, getActiveResultValue } from "@/lib/atterbergCalculations";
import LiquidLimitSection from "./LiquidLimitSection";
import PlasticLimitSection from "./PlasticLimitSection";
import ShrinkageLimitSection from "./ShrinkageLimitSection";

interface AtterbergTestCardProps {
  test: AtterbergTest;
  onDelete: () => void;
  onUpdateTitle: (title: string) => void;
  onUpdateType: (type: AtterbergTestType) => void;
  onToggleExpanded: () => void;
  onUpdateLiquidLimitTrials: (trials: LiquidLimitTrial[]) => void;
  onUpdatePlasticLimitTrials: (trials: PlasticLimitTrial[]) => void;
  onUpdateShrinkageLimitTrials: (trials: ShrinkageLimitTrial[]) => void;
  onSyncResult: (test: AtterbergTest) => void;
}

const testTypeLabels: Record<AtterbergTestType, string> = {
  liquidLimit: "Liquid Limit",
  plasticLimit: "Plastic Limit",
  shrinkageLimit: "Shrinkage Limit",
};

const AtterbergTestCard = ({
  test,
  onDelete,
  onUpdateTitle,
  onUpdateType,
  onToggleExpanded,
  onUpdateLiquidLimitTrials,
  onUpdatePlasticLimitTrials,
  onUpdateShrinkageLimitTrials,
  onSyncResult,
}: AtterbergTestCardProps) => {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [draftTitle, setDraftTitle] = useState(test.title);

  useEffect(() => {
    setDraftTitle(test.title);
  }, [test.title]);

  const computedResult = useMemo(() => calculateTestResult(test), [test]);
  const activeResult = getActiveResultValue(test, computedResult);
  const validTrials = countValidTrials(test);

  useEffect(() => {
    if (!areCalculatedResultsEqual(test.result, computedResult)) {
      onSyncResult({ ...test, result: computedResult });
    }
  }, [computedResult, onSyncResult, test]);

  const saveTitle = () => {
    onUpdateTitle(draftTitle.trim() || testTypeLabels[test.type]);
    setIsEditingTitle(false);
  };

  return (
    <Card className="border shadow-sm transition-all hover:shadow-md print:shadow-none">
      <CardHeader className="space-y-3 pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <Button type="button" variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0" onClick={onToggleExpanded}>
              {test.isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </Button>

            {isEditingTitle ? (
              <div className="flex flex-1 items-center gap-1">
                <Input
                  value={draftTitle}
                  onChange={(event) => setDraftTitle(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") saveTitle();
                  }}
                  autoFocus
                  className="h-8"
                />
                <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={saveTitle}>
                  <Check className="h-3.5 w-3.5" />
                </Button>
              </div>
            ) : (
              <button
                type="button"
                className="group flex min-w-0 flex-1 items-center gap-2 text-left"
                onClick={() => setIsEditingTitle(true)}
              >
                <span className="truncate text-sm font-semibold">{test.title}</span>
                <Edit2 className="h-3.5 w-3.5 flex-shrink-0 opacity-0 transition-opacity group-hover:opacity-100" />
              </button>
            )}
          </div>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 flex-shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={onDelete}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">Test Type</span>
            <Select value={test.type} onValueChange={(value) => onUpdateType(value as AtterbergTestType)}>
              <SelectTrigger className="h-8 w-[190px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="liquidLimit">Liquid Limit</SelectItem>
                <SelectItem value="plasticLimit">Plastic Limit</SelectItem>
                <SelectItem value="shrinkageLimit">Shrinkage Limit</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="text-xs text-muted-foreground">
            {validTrials} valid trial{validTrials === 1 ? "" : "s"}
          </div>
        </div>
      </CardHeader>

      {test.isExpanded && (
        <CardContent className="space-y-4 pt-0">
          {test.type === "liquidLimit" && (
            <LiquidLimitSection
              trials={test.trials}
              result={computedResult.liquidLimit ?? null}
              onChangeTrials={onUpdateLiquidLimitTrials}
            />
          )}

          {test.type === "plasticLimit" && (
            <PlasticLimitSection
              trials={test.trials}
              result={computedResult.plasticLimit ?? null}
              onChangeTrials={onUpdatePlasticLimitTrials}
            />
          )}

          {test.type === "shrinkageLimit" && (
            <ShrinkageLimitSection
              trials={test.trials}
              result={computedResult.shrinkageLimit ?? null}
              onChangeTrials={onUpdateShrinkageLimitTrials}
            />
          )}

          <div className="grid grid-cols-1 gap-3 rounded-lg border border-dashed p-3 sm:grid-cols-2">
            <div>
              <div className="text-xs font-medium text-muted-foreground">Computed Result</div>
              <div className="mt-1 text-lg font-bold">{activeResult !== null ? `${activeResult}%` : "-"}</div>
            </div>
            <div>
              <div className="text-xs font-medium text-muted-foreground">Summary</div>
              <div className="mt-1 text-sm text-foreground">
                {activeResult !== null
                  ? `${testTypeLabels[test.type]} ready from ${validTrials} valid trial${validTrials === 1 ? "" : "s"}.`
                  : "Enter complete numeric rows to calculate this test."}
              </div>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
};

export default AtterbergTestCard;
