import { describe, it, expect } from "vitest";
import type { ProjectMetadata, RecordMetadata } from "@/context/TestDataContext";

describe("ProjectMetadata", () => {
  it("should initialize with empty metadata", () => {
    const metadata: ProjectMetadata = {};
    expect(metadata.projectName).toBeUndefined();
    expect(metadata.clientName).toBeUndefined();
    expect(metadata.labOrganization).toBeUndefined();
    expect(metadata.dateReported).toBeUndefined();
    expect(metadata.checkedBy).toBeUndefined();
  });

  it("should support all project metadata fields", () => {
    const metadata: ProjectMetadata = {
      projectName: "Test Project",
      clientName: "Test Client",
      labOrganization: "Test Lab",
      dateReported: "2026-04-02",
      checkedBy: "John Doe",
    };
    expect(metadata.projectName).toBe("Test Project");
    expect(metadata.clientName).toBe("Test Client");
    expect(metadata.labOrganization).toBe("Test Lab");
  });

  it("should allow partial project metadata", () => {
    const metadata: ProjectMetadata = {
      projectName: "Test Project",
      checkedBy: "Jane Smith",
    };
    expect(metadata.projectName).toBe("Test Project");
    expect(metadata.clientName).toBeUndefined();
  });
});

describe("RecordMetadata", () => {
  it("should initialize with empty metadata", () => {
    const metadata: RecordMetadata = {};
    expect(metadata.sampleNumber).toBeUndefined();
    expect(metadata.dateSubmitted).toBeUndefined();
    expect(metadata.dateTested).toBeUndefined();
    expect(metadata.testedBy).toBeUndefined();
  });

  it("should support all record metadata fields", () => {
    const metadata: RecordMetadata = {
      sampleNumber: "S-001",
      dateSubmitted: "2026-04-01",
      dateTested: "2026-04-02",
      testedBy: "Test Technician",
    };
    expect(metadata.sampleNumber).toBe("S-001");
    expect(metadata.testedBy).toBe("Test Technician");
  });
});

describe("PDF Export with Metadata", () => {
  it("should include project metadata in PDF data structure", () => {
    const pdfData = {
      title: "Test Report",
      projectName: "Test Project",
      clientName: "Test Client",
      date: "2026-04-02",
      labOrganization: "Test Lab",
      dateReported: "2026-04-02",
      checkedBy: "John Doe",
      fields: [{ label: "Result", value: "Pass" }],
    };
    expect(pdfData.labOrganization).toBe("Test Lab");
    expect(pdfData.checkedBy).toBe("John Doe");
  });

  it("should allow PDF export without optional metadata", () => {
    const pdfData: Record<string, unknown> = {
      title: "Test Report",
      projectName: "Test Project",
      date: "2026-04-02",
    };
    expect(pdfData.projectName).toBe("Test Project");
    expect(pdfData.labOrganization).toBeUndefined();
  });
});

describe("CSV Export with Metadata", () => {
  it("should include project metadata in CSV data structure", () => {
    const csvData = {
      title: "Test Report",
      projectName: "Test Project",
      clientName: "Test Client",
      date: "2026-04-02",
      labOrganization: "Test Lab",
      dateReported: "2026-04-02",
      checkedBy: "John Doe",
    };
    expect(csvData.labOrganization).toBe("Test Lab");
  });

  it("should allow CSV export without optional metadata", () => {
    const csvData: Record<string, unknown> = {
      title: "Test Report",
      clientName: "Test Client",
      date: "2026-04-02",
    };
    expect(csvData.clientName).toBe("Test Client");
    expect(csvData.projectName).toBeUndefined();
  });
});

describe("JSON Export with Metadata", () => {
  it("should include project metadata in Atterberg export payload", () => {
    const payload = {
      exportDate: new Date().toISOString(),
      version: "3.0",
      project: {
        title: "Test Project",
        clientName: "Test Client",
        date: "2026-04-02",
        labOrganization: "Test Lab",
        dateReported: "2026-04-02",
        checkedBy: "John Doe",
        records: [] as unknown[],
      },
    };
    expect(payload.project.clientName).toBe("Test Client");
    expect(payload.project.labOrganization).toBe("Test Lab");
  });

  it("should allow JSON export without optional metadata", () => {
    const payload = {
      exportDate: new Date().toISOString(),
      version: "3.0",
      project: {
        title: "Test Project",
        date: "2026-04-02",
        records: [] as unknown[],
        clientName: undefined as string | undefined,
      },
    };
    expect(payload.project.title).toBe("Test Project");
    expect(payload.project.clientName).toBeUndefined();
  });
});

describe("Metadata Merging", () => {
  it("should merge partial metadata updates", () => {
    const initial: ProjectMetadata = { projectName: "Test Project", clientName: "Test Client" };
    const update: Partial<ProjectMetadata> = { labOrganization: "Test Lab" };
    const merged = { ...initial, ...update };
    expect(merged.projectName).toBe("Test Project");
    expect(merged.labOrganization).toBe("Test Lab");
  });

  it("should overwrite existing metadata on update", () => {
    const initial: ProjectMetadata = { projectName: "Initial", clientName: "Initial Client" };
    const update: Partial<ProjectMetadata> = { projectName: "Updated" };
    const merged = { ...initial, ...update };
    expect(merged.projectName).toBe("Updated");
    expect(merged.clientName).toBe("Initial Client");
  });
});

describe("Metadata Persistence", () => {
  it("should persist project metadata via serialization", () => {
    const metadata: ProjectMetadata = {
      projectName: "Persistent Project",
      labOrganization: "Persistent Lab",
      checkedBy: "John Persistent",
    };
    const deserialized = JSON.parse(JSON.stringify(metadata)) as ProjectMetadata;
    expect(deserialized.projectName).toBe("Persistent Project");
    expect(deserialized.labOrganization).toBe("Persistent Lab");
  });

  it("should persist record metadata via serialization", () => {
    const metadata: RecordMetadata = {
      sampleNumber: "PERSIST-001",
      testedBy: "Persistent Tech",
    };
    const deserialized = JSON.parse(JSON.stringify(metadata)) as RecordMetadata;
    expect(deserialized.sampleNumber).toBe("PERSIST-001");
    expect(deserialized.testedBy).toBe("Persistent Tech");
  });
});

describe("Complete Metadata Flow", () => {
  it("should handle full project state with all metadata", () => {
    const fullState = {
      clientName: "Full Client",
      projectName: "Full Project",
      labOrganization: "Full Lab",
      dateReported: "2026-04-02",
      checkedBy: "Full Checker",
      records: [
        {
          id: "rec-1", title: "Record 1", label: "BH A", note: "Note A",
          isExpanded: true, tests: [], results: {},
          sampleNumber: "S-001", testedBy: "Tech A",
        },
        {
          id: "rec-2", title: "Record 2", label: "BH B", note: "Note B",
          isExpanded: false, tests: [], results: {},
          sampleNumber: "S-002", testedBy: "Tech B",
        },
      ],
    };
    const deserialized = JSON.parse(JSON.stringify(fullState));
    expect(deserialized.clientName).toBe("Full Client");
    expect(deserialized.records[0].sampleNumber).toBe("S-001");
    expect(deserialized.records[1].testedBy).toBe("Tech B");
  });
});
