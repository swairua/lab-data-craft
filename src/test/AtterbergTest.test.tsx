import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { vi } from "vitest";

import AtterbergTestComponent from "@/components/soil/AtterbergTest";
import AtterbergTestCard from "@/components/soil/AtterbergTestCard";
import type { AtterbergTest } from "@/context/TestDataContext";

const { toastError, toastSuccess, generateTestPDF, generateTestCSV, useProject, useTestReport } = vi.hoisted(() => ({
  toastError: vi.fn(),
  toastSuccess: vi.fn(),
  generateTestPDF: vi.fn(),
  generateTestCSV: vi.fn(),
  useProject: vi.fn(),
  useTestReport: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: {
    error: toastError,
    success: toastSuccess,
  },
}));

vi.mock("@/hooks/useTestReport", () => ({
  useTestReport,
}));

vi.mock("@/context/ProjectContext", () => ({
  useProject,
}));

vi.mock("@/lib/pdfGenerator", () => ({
  generateTestPDF,
}));

vi.mock("@/lib/csvExporter", () => ({
  generateTestCSV,
}));

describe("Atterberg UI", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    useProject.mockReturnValue({ projectName: "Project A", clientName: "Client A", date: "2024-06-01" });
  });

  it("shows empty export feedback instead of silently doing nothing", () => {
    render(<AtterbergTestComponent />);

    fireEvent.click(screen.getByText("Atterberg Limits Testing"));
    fireEvent.click(screen.getByRole("button", { name: /PDF/i }));
    fireEvent.click(screen.getByRole("button", { name: /CSV/i }));

    expect(toastError).toHaveBeenCalledTimes(2);
    expect(toastSuccess).not.toHaveBeenCalled();
    expect(generateTestPDF).not.toHaveBeenCalled();
    expect(generateTestCSV).not.toHaveBeenCalled();
  });

  it("asks for confirmation before clearing the Atterberg project", async () => {
    localStorage.setItem(
      "atterbergProjectState",
      JSON.stringify({
        records: [
          {
            id: "record-1",
            title: "Record 1",
            label: "BH-1",
            note: "",
            isExpanded: true,
            tests: [],
            results: {},
          },
        ],
      }),
    );

    render(<AtterbergTestComponent />);

    fireEvent.click(screen.getByText("Atterberg Limits Testing"));
    fireEvent.click(screen.getByRole("button", { name: /Clear/i }));

    expect(screen.getByText("Clear Atterberg project?")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Clear project/i }));

    await waitFor(() => {
      expect(localStorage.getItem("atterbergProjectState")).toBeNull();
    });
    expect(toastSuccess).toHaveBeenCalledWith("Atterberg project cleared");
  });

  it("asks for confirmation before changing a test type with entered data", () => {
    const test: AtterbergTest = {
      id: "test-1",
      title: "Plastic Limit 1",
      type: "plasticLimit",
      isExpanded: false,
      trials: [{ id: "trial-1", trialNo: "1", moisture: "22" }],
      result: {},
    };

    const onUpdateType = vi.fn();

    render(
      <AtterbergTestCard
        test={test}
        onDelete={vi.fn()}
        onUpdateTitle={vi.fn()}
        onUpdateType={onUpdateType}
        onToggleExpanded={vi.fn()}
        onUpdateLiquidLimitTrials={vi.fn()}
        onUpdatePlasticLimitTrials={vi.fn()}
        onUpdateShrinkageLimitTrials={vi.fn()}
        onSyncResult={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("combobox"));
    fireEvent.click(screen.getByText("Liquid Limit"));

    expect(screen.getByText("Change test type?")).toBeInTheDocument();
    expect(onUpdateType).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: /Change type/i }));

    expect(onUpdateType).toHaveBeenCalledWith("liquidLimit");
  });
});
