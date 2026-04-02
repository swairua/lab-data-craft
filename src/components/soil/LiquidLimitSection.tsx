import { useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import CalculatedInput from "@/components/CalculatedInput";
import { Plus, X } from "lucide-react";
import { LiquidLimitRow } from "@/context/TestDataContext";
import { calculateLiquidLimit, getLiquidLimitGraphData } from "@/lib/atterbergCalculations";

interface LiquidLimitSectionProps {
  rows: LiquidLimitRow[];
  onAddRow: () => void;
  onRemoveRow: (index: number) => void;
  onUpdateRow: (index: number, field: keyof LiquidLimitRow, value: string) => void;
  onCalculatedResultsChange: (ll: number | null) => void;
}

const LiquidLimitSection = ({
  rows,
  onAddRow,
  onRemoveRow,
  onUpdateRow,
  onCalculatedResultsChange,
}: LiquidLimitSectionProps) => {
  const graphData = useMemo(() => getLiquidLimitGraphData(rows), [rows]);
  const liquidLimit = useMemo(() => {
    const ll = calculateLiquidLimit(rows);
    onCalculatedResultsChange(ll);
    return ll;
  }, [rows, onCalculatedResultsChange]);

  // Add reference line for 25 blows if we have data
  const extendedGraphData = useMemo(() => {
    if (graphData.length === 0) return [];
    
    const minBlows = Math.min(...graphData.map(d => d.blows));
    const maxBlows = Math.max(...graphData.map(d => d.blows));
    
    // Add 25 blows reference point if within range
    const referenceData = [...graphData];
    if (minBlows <= 25 && 25 <= maxBlows && !graphData.some(d => d.blows === 25)) {
      // Calculate interpolated moisture at 25 blows
      const closest = graphData.reduce((prev, curr) =>
        Math.abs(curr.blows - 25) < Math.abs(prev.blows - 25) ? curr : prev
      );
      referenceData.push({ blows: 25, moisture: closest.moisture, trial: "25 (ref)" });
      referenceData.sort((a, b) => a.blows - b.blows);
    }
    
    return referenceData;
  }, [graphData]);

  return (
    <div className="space-y-4">
      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted border-b">
                <th className="text-left py-2 px-3 font-medium text-muted-foreground">Trial No.</th>
                <th className="text-left py-2 px-3 font-medium text-muted-foreground">Number of Blows</th>
                <th className="text-left py-2 px-3 font-medium text-muted-foreground">Moisture Content (%)</th>
                <th className="w-10"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                  <td className="py-1.5 px-3">
                    <Input
                      type="text"
                      value={row.trialNo}
                      onChange={(e) => onUpdateRow(i, "trialNo", e.target.value)}
                      className="h-8"
                      placeholder="1"
                      disabled
                    />
                  </td>
                  <td className="py-1.5 px-3">
                    <Input
                      type="number"
                      value={row.blows}
                      onChange={(e) => onUpdateRow(i, "blows", e.target.value)}
                      className="h-8"
                      placeholder="15"
                      step="0.1"
                    />
                  </td>
                  <td className="py-1.5 px-3">
                    <Input
                      type="number"
                      value={row.moisture}
                      onChange={(e) => onUpdateRow(i, "moisture", e.target.value)}
                      className="h-8"
                      placeholder="35"
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
          <span className="text-sm text-muted-foreground font-medium">Liquid Limit (LL):</span>
          <span className="text-lg font-bold">
            {liquidLimit !== null ? `${liquidLimit}%` : "—"}
          </span>
        </div>
      </div>

      {/* Graph */}
      {graphData.length > 0 && (
        <div className="border rounded-lg p-3 bg-card">
          <h4 className="text-sm font-medium mb-3 text-foreground">Liquid Limit Curve</h4>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={extendedGraphData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis
                dataKey="blows"
                label={{ value: "Number of Blows", position: "insideBottomRight", offset: -5 }}
                stroke="var(--muted-foreground)"
              />
              <YAxis
                label={{ value: "Moisture Content (%)", angle: -90, position: "insideLeft" }}
                stroke="var(--muted-foreground)"
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--background)",
                  border: "1px solid var(--border)",
                  borderRadius: "4px",
                }}
                formatter={(value) => `${value.toFixed(2)}%`}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="moisture"
                stroke="hsl(var(--primary))"
                name="Moisture Content"
                dot={{ fill: "hsl(var(--primary))", r: 4 }}
                isAnimationActive={true}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};

export default LiquidLimitSection;
