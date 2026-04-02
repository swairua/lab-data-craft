import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, X } from "lucide-react";
import { ShrinkageLimitRow } from "@/context/TestDataContext";
import { calculateShrinkageLimit } from "@/lib/atterbergCalculations";

interface ShrinkageLimitSectionProps {
  rows: ShrinkageLimitRow[];
  onAddRow: () => void;
  onRemoveRow: (index: number) => void;
  onUpdateRow: (index: number, field: keyof ShrinkageLimitRow, value: string) => void;
  onCalculatedResultsChange: (sl: number | null) => void;
}

const ShrinkageLimitSection = ({
  rows,
  onAddRow,
  onRemoveRow,
  onUpdateRow,
  onCalculatedResultsChange,
}: ShrinkageLimitSectionProps) => {
  const shrinkageLimit = useMemo(() => {
    const sl = calculateShrinkageLimit(rows);
    onCalculatedResultsChange(sl);
    return sl;
  }, [rows, onCalculatedResultsChange]);

  return (
    <div className="space-y-4">
      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted border-b">
                <th className="text-left py-2 px-3 font-medium text-muted-foreground">Initial Volume</th>
                <th className="text-left py-2 px-3 font-medium text-muted-foreground">Final Volume</th>
                <th className="text-left py-2 px-3 font-medium text-muted-foreground">Moisture Content (%)</th>
                <th className="w-10"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                  <td className="py-1.5 px-3">
                    <Input
                      type="number"
                      value={row.initialVolume}
                      onChange={(e) => onUpdateRow(i, "initialVolume", e.target.value)}
                      className="h-8"
                      placeholder="50"
                      step="0.1"
                    />
                  </td>
                  <td className="py-1.5 px-3">
                    <Input
                      type="number"
                      value={row.finalVolume}
                      onChange={(e) => onUpdateRow(i, "finalVolume", e.target.value)}
                      className="h-8"
                      placeholder="45"
                      step="0.1"
                    />
                  </td>
                  <td className="py-1.5 px-3">
                    <Input
                      type="number"
                      value={row.moisture}
                      onChange={(e) => onUpdateRow(i, "moisture", e.target.value)}
                      className="h-8"
                      placeholder="18"
                      step="0.1"
                    />
                  </td>
                  <td className="py-1.5 px-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => onRemoveRow(i)}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Row Button */}
      <Button
        variant="outline"
        size="sm"
        className="w-full"
        onClick={onAddRow}
      >
        <Plus className="h-3.5 w-3.5 mr-1" /> Add Row
      </Button>

      {/* Result Display */}
      <div className="grid grid-cols-1 gap-3 p-3 bg-muted/50 rounded-lg">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground font-medium">Shrinkage Limit (SL):</span>
          <span className="text-lg font-bold">
            {shrinkageLimit !== null ? `${shrinkageLimit}%` : "—"}
          </span>
        </div>
      </div>
    </div>
  );
};

export default ShrinkageLimitSection;
