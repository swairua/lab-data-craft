import { useState, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { ProjectContext } from "@/context/ProjectContext";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { FlaskConical, Mountain, Hammer, TestTubeDiagonal, LayoutDashboard, FileText } from "lucide-react";

import GradingTest from "@/components/soil/GradingTest";
import AtterbergTest from "@/components/soil/AtterbergTest";
import ProctorTest from "@/components/soil/ProctorTest";
import CBRTest from "@/components/soil/CBRTest";
import ShearTest from "@/components/soil/ShearTest";
import ConsolidationTest from "@/components/soil/ConsolidationTest";

import SlumpTest from "@/components/concrete/SlumpTest";
import CompressiveStrengthTest from "@/components/concrete/CompressiveStrengthTest";
import UPVTTest from "@/components/concrete/UPVTTest";
import SchmidtHammerTest from "@/components/concrete/SchmidtHammerTest";
import CoringTest from "@/components/concrete/CoringTest";
import ConcreteCubesTest from "@/components/concrete/ConcreteCubesTest";

import UCSTest from "@/components/rock/UCSTest";
import PointLoadTest from "@/components/rock/PointLoadTest";
import PorosityTest from "@/components/rock/PorosityTest";

import SPTTest from "@/components/special/SPTTest";
import DCPTest from "@/components/special/DCPTest";

import Dashboard from "@/pages/Dashboard";
import Reports from "@/pages/Reports";
interface IndexProps {
  initialTab?: string;
}

const Index = ({ initialTab }: IndexProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const isTestsPage = location.pathname === "/tests";
  const isReportsPage = location.pathname === "/reports";
  const [view, setView] = useState<"dashboard" | "tests" | "reports">(
    isReportsPage ? "reports" : isTestsPage ? "tests" : "dashboard"
  );
  const [projectName, setProjectName] = useState("");
  const [clientName, setClientName] = useState("");
  const today = new Date().toISOString().split("T")[0];

  const projectCtx = useMemo(() => ({ projectName, clientName, date: today }), [projectName, clientName, today]);

  return (
    <ProjectContext.Provider value={projectCtx}>
      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="border-b bg-card sticky top-0 z-10">
          <div className="container max-w-6xl mx-auto px-4 py-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center">
                <FlaskConical className="h-5 w-5 text-primary-foreground" />
              </div>
              <div className="flex-1">
                <h1 className="text-xl font-bold text-foreground tracking-tight">Engineering Material Testing</h1>
                <p className="text-xs text-muted-foreground">Laboratory Test Data Management</p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant={view === "dashboard" ? "default" : "outline"}
                  size="sm"
                  className="gap-1.5"
                  onClick={() => { setView("dashboard"); navigate("/"); }}
                >
                  <LayoutDashboard className="h-4 w-4" /> Dashboard
                </Button>
                <Button
                  variant={view === "tests" ? "default" : "outline"}
                  size="sm"
                  className="gap-1.5"
                  onClick={() => { setView("tests"); navigate("/tests"); }}
                >
                  <FlaskConical className="h-4 w-4" /> Tests
                </Button>
                <Button
                  variant={view === "reports" ? "default" : "outline"}
                  size="sm"
                  className="gap-1.5"
                  onClick={() => { setView("reports"); navigate("/reports"); }}
                >
                  <FileText className="h-4 w-4" /> Reports
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Project Name</Label>
                <Input value={projectName} onChange={(e) => setProjectName(e.target.value)} placeholder="Enter project name" className="h-9" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Client Name</Label>
                <Input value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="Enter client name" className="h-9" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Date</Label>
                <Input value={today} readOnly className="h-9 calculated-field cursor-default" />
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="container max-w-6xl mx-auto px-4 py-6">
          {view === "dashboard" ? (
            <Dashboard />
          ) : (
            <Tabs defaultValue={initialTab || "soil"} className="w-full">
              <TabsList className="w-full grid grid-cols-4 mb-6 h-11">
                <TabsTrigger value="soil" className="gap-1.5 text-sm">
                  <Mountain className="h-4 w-4" /> Soil
                </TabsTrigger>
                <TabsTrigger value="concrete" className="gap-1.5 text-sm">
                  <Hammer className="h-4 w-4" /> Concrete
                </TabsTrigger>
                <TabsTrigger value="rock" className="gap-1.5 text-sm">
                  <Mountain className="h-4 w-4" /> Rock
                </TabsTrigger>
                <TabsTrigger value="special" className="gap-1.5 text-sm">
                  <TestTubeDiagonal className="h-4 w-4" /> Special
                </TabsTrigger>
              </TabsList>

              <TabsContent value="soil" className="space-y-4">
                <GradingTest />
                <AtterbergTest />
                <ProctorTest />
                <CBRTest />
                <ShearTest />
                <ConsolidationTest />
              </TabsContent>

              <TabsContent value="concrete" className="space-y-4">
                <UPVTTest />
                <SchmidtHammerTest />
                <CoringTest />
                <ConcreteCubesTest />
                <SlumpTest />
                <CompressiveStrengthTest />
              </TabsContent>

              <TabsContent value="rock" className="space-y-4">
                <UCSTest />
                <PointLoadTest />
                <PorosityTest />
              </TabsContent>

              <TabsContent value="special" className="space-y-4">
                <SPTTest />
                <DCPTest />
              </TabsContent>
            </Tabs>
          )}
        </main>
      </div>
    </ProjectContext.Provider>
  );
};

export default Index;
