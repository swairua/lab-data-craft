import { useTestData } from "@/context/TestDataContext";
import { useBorehole } from "@/context/BoreholeContext";
import { useProject } from "@/context/ProjectContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  FileDown, FileSpreadsheet, FileText, LayoutDashboard,
  ClipboardList, BarChart3, Layers,
} from "lucide-react";
import {
  generateProjectSummaryReport,
  generateDashboardReport,
  generateProjectSummaryCSV,
  generateBoreholeReport,
  generateCombinedReport,
} from "@/lib/reportGenerator";
import { generateTestPDF } from "@/lib/pdfGenerator";
import { generateTestCSV } from "@/lib/csvExporter";
import { toast } from "sonner";

const Reports = () => {
  const { getBoreholeTests, tests } = useTestData();
  const { boreholes, activeBoreholeId } = useBorehole();
  const project = useProject();

  const activeTests = getBoreholeTests(activeBoreholeId);
  const testList = Object.values(activeTests);
  const testsWithData = testList.filter(t => t.dataPoints > 0);
  const activeBorehole = boreholes.find(b => b.id === activeBoreholeId);

  const handleSummaryPDF = () => {
    generateProjectSummaryReport(project, activeTests);
    toast.success("Project summary report downloaded");
  };

  const handleSummaryCSV = () => {
    generateProjectSummaryCSV(project, activeTests);
    toast.success("Project summary CSV downloaded");
  };

  const handleDashboardPDF = () => {
    generateDashboardReport(project, activeTests);
    toast.success("Dashboard export downloaded");
  };

  const handleBoreholePDF = () => {
    generateBoreholeReport(project, activeBorehole!, activeTests);
    toast.success(`${activeBorehole?.name} report downloaded`);
  };

  const handleCombinedPDF = () => {
    const allBoreholeData = boreholes.map(bh => ({
      borehole: bh,
      tests: getBoreholeTests(bh.id),
    }));
    generateCombinedReport(project, allBoreholeData);
    toast.success("Combined report downloaded");
  };

  return (
    <div className="space-y-6">
      {/* Report Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              Borehole Report
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className="text-xs text-muted-foreground mb-3">
              Report for <span className="font-semibold text-foreground">{activeBorehole?.name}</span> with all test results.
            </p>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleBoreholePDF} className="gap-1.5">
                <FileDown className="h-3.5 w-3.5" /> PDF
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow border-primary/20">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Layers className="h-4 w-4 text-primary" />
              Combined Report
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className="text-xs text-muted-foreground mb-3">
              All {boreholes.length} borehole{boreholes.length !== 1 ? "s" : ""} side-by-side comparison.
            </p>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleCombinedPDF} className="gap-1.5">
                <FileDown className="h-3.5 w-3.5" /> PDF
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <LayoutDashboard className="h-4 w-4 text-primary" />
              Project Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className="text-xs text-muted-foreground mb-3">
              Comprehensive report with statuses and key results.
            </p>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSummaryPDF} className="gap-1.5">
                <FileDown className="h-3.5 w-3.5" /> PDF
              </Button>
              <Button size="sm" variant="outline" onClick={handleSummaryCSV} className="gap-1.5">
                <FileSpreadsheet className="h-3.5 w-3.5" /> CSV
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-primary" />
              Individual Tests
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className="text-xs text-muted-foreground mb-3">
              Download reports for specific tests below.
            </p>
            <Badge variant="secondary" className="text-xs">
              {testsWithData.length} test{testsWithData.length !== 1 ? "s" : ""} with data
            </Badge>
          </CardContent>
        </Card>
      </div>

      {/* Individual Test Reports */}
      <div>
        <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <FileText className="h-4 w-4 text-muted-foreground" />
          Individual Test Reports — {activeBorehole?.name}
        </h2>
        {testsWithData.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-sm text-muted-foreground">No tests have recorded data for {activeBorehole?.name} yet. Enter data in the Tests tab to generate individual reports.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {testsWithData.map(test => (
              <Card key={test.id} className="hover:shadow-md transition-shadow">
                <CardContent className="py-3 px-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-foreground">{test.name}</span>
                    <Badge variant="secondary" className="text-[10px] capitalize">{test.category}</Badge>
                  </div>
                  {test.keyResults.length > 0 && (
                    <div className="space-y-0.5 mb-2">
                      {test.keyResults.slice(0, 2).map((r, i) => (
                        <div key={i} className="flex justify-between text-xs">
                          <span className="text-muted-foreground">{r.label}</span>
                          <span className="font-mono text-foreground">{r.value}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs gap-1"
                      onClick={() => {
                        generateTestPDF({
                          title: `${test.name} — ${activeBorehole?.name}`,
                          ...project,
                          fields: test.keyResults.map(r => ({ label: r.label, value: r.value })),
                        });
                        toast.success(`${test.name} PDF downloaded`);
                      }}
                    >
                      <FileDown className="h-3 w-3" /> PDF
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs gap-1"
                      onClick={() => {
                        generateTestCSV({
                          title: `${test.name} — ${activeBorehole?.name}`,
                          ...project,
                          fields: test.keyResults.map(r => ({ label: r.label, value: r.value })),
                        });
                        toast.success(`${test.name} CSV downloaded`);
                      }}
                    >
                      <FileSpreadsheet className="h-3 w-3" /> CSV
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Reports;
