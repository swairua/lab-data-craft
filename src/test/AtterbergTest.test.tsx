import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { vi } from "vitest";

import AtterbergTestComponent from "@/components/soil/AtterbergTest";
import AtterbergTestCard from "@/components/soil/AtterbergTestCard";
import type { AtterbergTest } from "@/context/TestDataContext";

const { toastError, toastSuccess, generateTestPDF, generateTestCSV, useProject, useTestReport, listRecords, createRecord, updateRecord, deleteRecord } = vi.hoisted(() => ({
  toastError: vi.fn(),
  toastSuccess: vi.fn(),
  generateTestPDF: vi.fn(),
  generateTestCSV: vi.fn(),
  useProject: vi.fn(),
  useTestReport: vi.fn(),
  listRecords: vi.fn(),
  createRecord: vi.fn(),
  updateRecord: vi.fn(),
  deleteRecord: vi.fn(),
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

vi.mock("@/lib/api", () => ({
  createRecord,
  deleteRecord,
  listRecords,
  updateRecord,
}));

const createDeferred = <T,>() => {
  let resolve!: (value: T | PromiseLike<T>) => void;

  const promise = new Promise<T>((res) => {
    resolve = res;
  });

  return { promise, resolve };
};

describe("Atterberg UI", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    useProject.mockReturnValue({ projectName: "Project A", clientName: "Client A", date: "2024-06-01" });
  });

  it("serializes saves and updates the existing result instead of creating a duplicate", async () => {
    const projects = [{ id: 7, name: "Project A", client_name: "Client A", project_date: "2024-06-01" }];
    const results: Array<{ id: number; project_id: number; test_key: string; payload_json: unknown }> = [];
    const firstCreate = createDeferred<void>();

    listRecords.mockImplementation(async (table: string) => {
      if (table === "projects") {
        return { table, data: projects, limit: 1000, offset: 0 };
      }

      if (table === "test_results") {
        return { table, data: results, limit: 1000, offset: 0 };
      }

      return { table, data: [], limit: 1000, offset: 0 };
    });

    updateRecord.mockImplementation(async (table: string, id: number, data: Record<string, unknown>) => {
      if (table === "projects") {
        projects[0] = { ...projects[0], ...(data as typeof projects[0]) };
        return { message: "updated", table, id, data: projects[0] };
      }

      if (table === "test_results") {
        const nextRow = { ...results.find((row) => row.id === id)!, ...data };
        const index = results.findIndex((row) => row.id === id);
        if (index >= 0) results[index] = nextRow;
        return { message: "updated", table, id, data: nextRow };
      }

      return { message: "updated", table, id, data: null };
    });

    createRecord.mockImplementation(async (table: string, data: Record<string, unknown>) => {
      if (table !== "test_results") {
        return { message: "created", table, id: 1, data: null };
      }

      await firstCreate.promise;
      const row = {
        id: 101,
        project_id: 7,
        test_key: "atterberg",
        payload_json: data.payload_json,
      };
      results.push(row);
      return { message: "created", table, id: row.id, data: row };
    });

    deleteRecord.mockResolvedValue({ message: "deleted", table: "test_results", id: 101, data: null, deleted: true });

    render(<AtterbergTestComponent />);

    await waitFor(() => expect(listRecords).toHaveBeenCalledTimes(2));

    fireEvent.click(screen.getByText("Atterberg Limits Testing"));
    fireEvent.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() => expect(createRecord).toHaveBeenCalledTimes(1));

    fireEvent.click(screen.getByRole("button", { name: /save/i }));
    expect(listRecords).toHaveBeenCalledTimes(4);
    expect(createRecord).toHaveBeenCalledTimes(1);

    firstCreate.resolve();

    await waitFor(() => expect(updateRecord).toHaveBeenCalledWith("test_results", 101, expect.objectContaining({
      project_id: 7,
      test_key: "atterberg",
    })));

    expect(createRecord).toHaveBeenCalledTimes(1);
    expect(updateRecord).toHaveBeenCalledWith("projects", 7, expect.any(Object));
    expect(updateRecord).toHaveBeenCalledWith("test_results", 101, expect.any(Object));
    expect(results).toHaveLength(1);
    expect(toastSuccess).toHaveBeenCalledWith("Atterberg Limits Testing saved");
  });

  it("shows empty export feedback instead of silently doing nothing", () => {
    render(<AtterbergTestComponent />);

    fireEvent.click(screen.getByText("Atterberg Limits Testing"));
    fireEvent.click(screen.getByRole("button", { name: /PDF/i }));
    fireEvent.click(screen.getByRole("button", { name: /CSV/i }));

    expect(toastError).toHaveBeenCalledTimes(2);
    expect(toastSuccess).toHaveBeenCalledTimes(1);
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
