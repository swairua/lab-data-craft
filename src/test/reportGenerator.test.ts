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

import { generateDashboardReport } from "@/lib/reportGenerator";

describe("generateDashboardReport", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("uses the autoTable helper instead of doc.autoTable", () => {
    expect(() =>
      generateDashboardReport(
        { projectName: "Project A", clientName: "Client A", date: "2024-06-01" },
        {
          "soil-1": {
            name: "Atterberg Limits",
            category: "soil",
            status: "completed",
            dataPoints: 3,
            keyResults: [{ label: "LL", value: "42" }],
          },
        },
      ),
    ).not.toThrow();

    expect(autoTable).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledWith("Dashboard_Export.pdf");
  });
});
