import { ReactNode, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight, Save, Trash2, FileDown, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";

interface TestSectionProps {
  title: string;
  children: ReactNode;
  onSave?: () => void;
  onClear?: () => void;
  onExportPDF?: () => void;
  onExportCSV?: () => void;
}

const TestSection = ({ title, children, onSave, onClear, onExportPDF, onExportCSV }: TestSectionProps) => {
  const [open, setOpen] = useState(true);

  return (
    <Card className="shadow-sm">
      <CardHeader
        className="cursor-pointer select-none py-3 px-4"
        onClick={() => setOpen(!open)}
      >
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            {title}
          </CardTitle>
          <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
            {onExportCSV && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  onExportCSV();
                  toast.success(`${title} CSV downloaded`);
                }}
              >
                <FileSpreadsheet className="h-3.5 w-3.5 mr-1" /> CSV
              </Button>
            )}
            {onExportPDF && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  onExportPDF();
                  toast.success(`${title} PDF downloaded`);
                }}
              >
                <FileDown className="h-3.5 w-3.5 mr-1" /> PDF
              </Button>
            )}
            {onSave && (
              <Button
                size="sm"
                variant="default"
                onClick={() => {
                  onSave();
                  toast.success(`${title} saved successfully`);
                }}
              >
                <Save className="h-3.5 w-3.5 mr-1" /> Save
              </Button>
            )}
            {onClear && (
              <Button size="sm" variant="outline" onClick={onClear}>
                <Trash2 className="h-3.5 w-3.5 mr-1" /> Clear
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      {open && <CardContent className="px-4 pb-4 pt-0">{children}</CardContent>}
    </Card>
  );
};

export default TestSection;
