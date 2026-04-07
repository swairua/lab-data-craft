import { describe, expect, it, vi, beforeEach } from "vitest";

const { autoTable, save, jsPDFMock } = vi.hoisted(() => {
  const save = vi.fn();
  const autoTable = vi.fn((doc: { lastAutoTable?: { finalY: number } }) => {
    doc.lastAutoTable = { finalY: 180 };
  });

  const doc = {
    internal: {
      pageSize: {
        getWidth: () => 210,
        getHeight: () => 297,
      },
    },
    setFillColor: vi.fn(),
    rect: vi.fn(),
    setFontSize: vi.fn(),
    setFont: vi.fn(),
    setTextColor: vi.fn(),
    text: vi.fn(),
    setDrawColor: vi.fn(),
    line: vi.fn(),
    roundedRect: vi.fn(),
    addPage: vi.fn(),
    getNumberOfPages: vi.fn(() => 1),
    setPage: vi.fn(),
    save,
  };

  return { autoTable, save, jsPDFMock: vi.fn(() => doc) };
});

vi.mock("jspdf", () => ({
  default: jsPDFMock,
}));

vi.mock("jspdf-autotable", () => ({
  default: autoTable,
}));

import { generateDashboardReport, generateProjectSummaryCSV, generateProjectSummaryReport } from "@/lib/reportGenerator";

const project = {
  projectName: "Project A",
  clientName: "Client A",
  date: "2024-06-01",
};

describe("reportGenerator PDF exports", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("uses the autoTable helper for the dashboard export", () => {
    expect(() =>
      generateDashboardReport(project, {
        "soil-1": {
          name: "Atterberg Limits",
          category: "soil",
          status: "completed",
          dataPoints: 3,
          keyResults: [{ label: "LL", value: "42" }],
        },
      }),
    ).not.toThrow();

    expect(autoTable).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledWith("Dashboard_Export.pdf");
  });

  it("uses the autoTable helper for the project summary export", () => {
    expect(() =>
      generateProjectSummaryReport(project, {
        "soil-1": {
          name: "Atterberg Limits",
          category: "soil",
          status: "completed",
          dataPoints: 3,
          keyResults: [{ label: "LL", value: "42" }],
        },
      }),
    ).not.toThrow();

    expect(autoTable).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledWith("Project_Summary_Report.pdf");
  });
});

describe("generateProjectSummaryCSV", () => {
  const originalCreateElement = document.createElement.bind(document);
  const originalCreateObjectURL = URL.createObjectURL;
  const originalRevokeObjectURL = URL.revokeObjectURL;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    document.createElement = originalCreateElement;
    URL.createObjectURL = originalCreateObjectURL;
    URL.revokeObjectURL = originalRevokeObjectURL;
  });

  it("creates a downloadable CSV for the project summary export", async () => {
    let capturedContent = "";
    let downloadName = "";

    const readBlobText = (blob: Blob) =>
      new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result ?? ""));
        reader.onerror = () => reject(reader.error);
        reader.readAsText(blob);
      });

    document.createElement = vi.fn((tag: string) => {
      if (tag === "a") {
        const anchor = originalCreateElement(tag);
        anchor.click = vi.fn();
        Object.defineProperty(anchor, "download", {
          set(value) {
            downloadName = value;
          },
          get() {
            return downloadName;
          },
          configurable: true,
        });
        return anchor;
      }

      return originalCreateElement(tag);
    }) as typeof document.createElement;

    URL.createObjectURL = vi.fn((blob: Blob) => {
      void readBlobText(blob).then((text) => {
        capturedContent = text;
      });
      return "blob:project-summary";
    });
    URL.revokeObjectURL = vi.fn();

    generateProjectSummaryCSV(project, {
      "soil-1": {
        name: "Atterberg Limits",
        category: "soil",
        status: "completed",
        dataPoints: 3,
        keyResults: [{ label: "LL", value: "42" }],
      },
    });

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(capturedContent).toContain("Engineering Material Testing - Project Summary");
    expect(downloadName).toBe("Project_Summary.csv");
    expect(capturedContent).toContain("Project,Project A");
    expect(capturedContent).toContain("Client,Client A");
    expect(capturedContent).toContain("Test Name,Category,Status,Data Points,Key Results");
    expect(capturedContent).toContain('"Atterberg Limits",soil,Completed,3,"LL: 42"');
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:project-summary");
  });
});
