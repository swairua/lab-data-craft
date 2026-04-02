import { useState, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronDown, ChevronRight, X, Edit2, Check } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EnhancedAtterbergTest, AtterbergTestType, CalculatedResults } from "@/context/TestDataContext";
import LiquidLimitSection from "./LiquidLimitSection";
import PlasticLimitSection from "./PlasticLimitSection";
import ShrinkageLimitSection from "./ShrinkageLimitSection";
import { calculatePlasticityIndex } from "@/lib/atterbergCalculations";

interface AtterbergTestCardProps {
  test: EnhancedAtterbergTest;
  onDelete: () => void;
  onUpdateTitle: (title: string) => void;
  onUpdateType: (type: AtterbergTestType) => void;
  onToggleExpanded: () => void;
  onAddLiquidLimitRow: () => void;
  onRemoveLiquidLimitRow: (index: number) => void;
  onUpdateLiquidLimitRow: (index: number, field: string, value: string) => void;
  onAddPlasticLimitRow: () => void;
  onRemovePlasticLimitRow: (index: number) => void;
  onUpdatePlasticLimitRow: (index: number, field: string, value: string) => void;
  onAddShrinkageLimitRow: () => void;
  onRemoveShrinkageLimitRow: (index: number) => void;
  onUpdateShrinkageLimitRow: (index: number, field: string, value: string) => void;
  onUpdateCalculatedResults: (results: CalculatedResults) => void;
}

const AtterbergTestCard = ({
  test,
  onDelete,
  onUpdateTitle,
  onUpdateType,
  onToggleExpanded,
  onAddLiquidLimitRow,
  onRemoveLiquidLimitRow,
  onUpdateLiquidLimitRow,
  onAddPlasticLimitRow,
  onRemovePlasticLimitRow,
  onUpdatePlasticLimitRow,
  onAddShrinkageLimitRow,
  onRemoveShrinkageLimitRow,
  onUpdateShrinkageLimitRow,
  onUpdateCalculatedResults,
}: AtterbergTestCardProps) => {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitle, setEditTitle] = useState(test.testTitle);

  const testTypeLabel = useMemo(() => {
    const labels: Record<AtterbergTestType, string> = {
      liquidLimit: "Liquid Limit",
      plasticLimit: "Plastic Limit",
      shrinkageLimit: "Shrinkage Limit",
    };
    return labels[test.testType];
  }, [test.testType]);

  const handleSaveTitle = useCallback(() => {
    if (editTitle.trim()) {
      onUpdateTitle(editTitle);
    }
    setIsEditingTitle(false);
  }, [editTitle, onUpdateTitle]);

  const handleCalculatedLiquidLimit = useCallback((ll: number | null) => {
    const results = { ...test.calculatedResults, liquidLimit: ll };
    if (ll !== null && test.calculatedResults.plasticLimit !== null) {
      results.plasticityIndex = calculatePlasticityIndex(ll, test.calculatedResults.plasticLimit);
    }
    onUpdateCalculatedResults(results);
  }, [test.calculatedResults, onUpdateCalculatedResults]);

  const handleCalculatedPlasticLimit = useCallback((pl: number | null) => {
    const results = { ...test.calculatedResults, plasticLimit: pl };
    if (pl !== null && test.calculatedResults.liquidLimit !== null) {
      results.plasticityIndex = calculatePlasticityIndex(test.calculatedResults.liquidLimit, pl);
    }
    onUpdateCalculatedResults(results);
  }, [test.calculatedResults, onUpdateCalculatedResults]);

  const handleCalculatedShrinkageLimit = useCallback((sl: number | null) => {
    const results = { ...test.calculatedResults, shrinkageLimit: sl };
    onUpdateCalculatedResults(results);
  }, [onUpdateCalculatedResults]);

  return (
    <Card className="shadow-sm border transition-all hover:shadow-md">
      {/* Card Header */}
      <CardHeader className="pb-3 space-y-3">
        {/* Title and Controls Row */}
        <div className="flex items-center justify-between gap-2">
          {/* Expand/Collapse and Title */}
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 flex-shrink-0"
              onClick={onToggleExpanded}
            >
              {test.isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </Button>

            {isEditingTitle ? (
              <div className="flex gap-1 flex-1">
                <Input
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="h-7 text-sm flex-1"
                  autoFocus
                  onKeyPress={(e) => {
                    if (e.key === "Enter") handleSaveTitle();
                  }}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 flex-shrink-0"
                  onClick={handleSaveTitle}
                >
                  <Check className="h-3.5 w-3.5" />
                </Button>
              </div>
            ) : (
              <div
                className="flex items-center gap-2 flex-1 cursor-pointer hover:text-primary transition-colors group"
                onClick={() => setIsEditingTitle(true)}
              >
                <span className="font-semibold text-sm truncate">{test.testTitle}</span>
                <Edit2 className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
              </div>
            )}
          </div>

          {/* Delete Button */}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10 flex-shrink-0"
            onClick={onDelete}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Type Selector Row */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground font-medium">Test Type:</span>
          <Select value={test.testType} onValueChange={(value) => onUpdateType(value as AtterbergTestType)}>
            <SelectTrigger className="h-8 w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="liquidLimit">Liquid Limit</SelectItem>
              <SelectItem value="plasticLimit">Plastic Limit</SelectItem>
              <SelectItem value="shrinkageLimit">Shrinkage Limit</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>

      {/* Card Content - Conditional Rendering */}
      {test.isExpanded && (
        <CardContent className="pt-0 space-y-4">
          {test.testType === "liquidLimit" && (
            <LiquidLimitSection
              rows={test.liquidLimitRows}
              onAddRow={onAddLiquidLimitRow}
              onRemoveRow={onRemoveLiquidLimitRow}
              onUpdateRow={onUpdateLiquidLimitRow}
              onCalculatedResultsChange={handleCalculatedLiquidLimit}
            />
          )}

          {test.testType === "plasticLimit" && (
            <PlasticLimitSection
              rows={test.plasticLimitRows}
              onAddRow={onAddPlasticLimitRow}
              onRemoveRow={onRemovePlasticLimitRow}
              onUpdateRow={onUpdatePlasticLimitRow}
              onCalculatedResultsChange={handleCalculatedPlasticLimit}
            />
          )}

          {test.testType === "shrinkageLimit" && (
            <ShrinkageLimitSection
              rows={test.shrinkageLimitRows}
              onAddRow={onAddShrinkageLimitRow}
              onRemoveRow={onRemoveShrinkageLimitRow}
              onUpdateRow={onUpdateShrinkageLimitRow}
              onCalculatedResultsChange={handleCalculatedShrinkageLimit}
            />
          )}

          {/* Results Summary */}
          {Object.keys(test.calculatedResults).length > 0 && (
            <div className="border-t pt-4 mt-4">
              <h4 className="text-sm font-semibold mb-3 text-foreground">Test Results</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {test.calculatedResults.liquidLimit !== undefined && (
                  <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-900">
                    <div className="text-xs text-muted-foreground font-medium">Liquid Limit (LL)</div>
                    <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                      {test.calculatedResults.liquidLimit !== undefined ? `${test.calculatedResults.liquidLimit}%` : "—"}
                    </div>
                  </div>
                )}

                {test.calculatedResults.plasticLimit !== undefined && (
                  <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-900">
                    <div className="text-xs text-muted-foreground font-medium">Plastic Limit (PL)</div>
                    <div className="text-lg font-bold text-green-600 dark:text-green-400">
                      {test.calculatedResults.plasticLimit !== undefined ? `${test.calculatedResults.plasticLimit}%` : "—"}
                    </div>
                  </div>
                )}

                {test.calculatedResults.shrinkageLimit !== undefined && (
                  <div className="p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-900">
                    <div className="text-xs text-muted-foreground font-medium">Shrinkage Limit (SL)</div>
                    <div className="text-lg font-bold text-amber-600 dark:text-amber-400">
                      {test.calculatedResults.shrinkageLimit !== undefined ? `${test.calculatedResults.shrinkageLimit}%` : "—"}
                    </div>
                  </div>
                )}

                {test.calculatedResults.plasticityIndex !== undefined && test.calculatedResults.plasticityIndex !== null && (
                  <div className="p-3 bg-purple-50 dark:bg-purple-950/20 rounded-lg border border-purple-200 dark:border-purple-900">
                    <div className="text-xs text-muted-foreground font-medium">Plasticity Index (PI)</div>
                    <div className="text-lg font-bold text-purple-600 dark:text-purple-400">
                      {test.calculatedResults.plasticityIndex !== null ? `${test.calculatedResults.plasticityIndex}%` : "—"}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
};

export default AtterbergTestCard;
