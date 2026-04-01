import { useBorehole } from "@/context/BoreholeContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";

const BoreholeManager = () => {
  const { boreholes, activeBoreholeId, setActiveBoreholeId, addBorehole, removeBorehole, updateBorehole } = useBorehole();

  return (
    <div className="border rounded-lg bg-card p-3 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold text-foreground">Boreholes</span>
          <Badge variant="secondary" className="text-[10px]">{boreholes.length}</Badge>
        </div>
        <Button size="sm" variant="outline" onClick={addBorehole} className="h-7 text-xs gap-1">
          <Plus className="h-3 w-3" /> Add
        </Button>
      </div>

      {/* Borehole tabs */}
      <div className="flex gap-1.5 flex-wrap">
        {boreholes.map(bh => (
          <button
            key={bh.id}
            onClick={() => setActiveBoreholeId(bh.id)}
            className={cn(
              "px-3 py-1.5 rounded-md text-xs font-medium transition-colors border",
              activeBoreholeId === bh.id
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-muted/50 text-muted-foreground border-border hover:bg-muted"
            )}
          >
            {bh.name}
          </button>
        ))}
      </div>

      {/* Active borehole details */}
      {boreholes.map(bh => {
        if (bh.id !== activeBoreholeId) return null;
        return (
          <div key={bh.id} className="grid grid-cols-1 sm:grid-cols-4 gap-2 items-end">
            <div className="space-y-1">
              <Label className="text-[10px] text-muted-foreground">Name</Label>
              <Input
                value={bh.name}
                onChange={e => updateBorehole(bh.id, { name: e.target.value })}
                className="h-8 text-xs"
                placeholder="BH-1"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] text-muted-foreground">Depth (m)</Label>
              <Input
                type="number"
                value={bh.depth}
                onChange={e => updateBorehole(bh.id, { depth: e.target.value })}
                className="h-8 text-xs"
                placeholder="0"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] text-muted-foreground">Location</Label>
              <Input
                value={bh.location}
                onChange={e => updateBorehole(bh.id, { location: e.target.value })}
                className="h-8 text-xs"
                placeholder="e.g. Chainage 0+100"
              />
            </div>
            <div>
              {boreholes.length > 1 && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 text-xs text-destructive hover:text-destructive gap-1"
                  onClick={() => removeBorehole(bh.id)}
                >
                  <Trash2 className="h-3 w-3" /> Remove
                </Button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default BoreholeManager;
