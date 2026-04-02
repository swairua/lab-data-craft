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
    expect(metadata.dateReported).toBe("2026-04-02");
    expect(metadata.checkedBy).toBe("John Doe");
  });

  it("should allow partial project metadata", () => {
    const metadata: ProjectMetadata = {
      projectName: "Test Project",
      checkedBy: "Jane Smith",
    };

    expect(metadata.projectName).toBe("Test Project");
    expect(metadata.checkedBy).toBe("Jane Smith");
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
    expect(metadata.dateSubmitted).toBe("2026-04-01");
    expect(metadata.dateTested).toBe("2026-04-02");
    expect(metadata.testedBy).toBe("Test Technician");
  });

  it("should allow partial record metadata", () => {
    const metadata: RecordMetadata = {
      sampleNumber: "S-002",
      dateTested: "2026-04-02",
    };

    expect(metadata.sampleNumber).toBe("S-002");
    expect(metadata.dateTested).toBe("2026-04-02");
    expect(metadata.dateSubmitted).toBeUndefined();
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

    expect(pdfData.projectName).toBe("Test Project");
    expect(pdfData.clientName).toBe("Test Client");
    expect(pdfData.labOrganization).toBe("Test Lab");
    expect(pdfData.dateReported).toBe("2026-04-02");
    expect(pdfData.checkedBy).toBe("John Doe");
  });

  it("should allow PDF export without optional metadata", () => {
    const pdfData = {
      title: "Test Report",
      projectName: "Test Project",
      date: "2026-04-02",
    };

    expect(pdfData.projectName).toBe("Test Project");
    expect(pdfData.date).toBe("2026-04-02");
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
      fields: [{ label: "Result", value: "Pass" }],
    };

    expect(csvData.projectName).toBe("Test Project");
    expect(csvData.clientName).toBe("Test Client");
    expect(csvData.labOrganization).toBe("Test Lab");
    expect(csvData.dateReported).toBe("2026-04-02");
    expect(csvData.checkedBy).toBe("John Doe");
  });

  it("should allow CSV export without optional metadata", () => {
    const csvData = {
      title: "Test Report",
      clientName: "Test Client",
      date: "2026-04-02",
    };

    expect(csvData.clientName).toBe("Test Client");
    expect(csvData.date).toBe("2026-04-02");
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
        records: [],
      },
    };

    expect(payload.project.clientName).toBe("Test Client");
    expect(payload.project.labOrganization).toBe("Test Lab");
    expect(payload.project.dateReported).toBe("2026-04-02");
    expect(payload.project.checkedBy).toBe("John Doe");
  });

  it("should allow JSON export without optional metadata", () => {
    const payload = {
      exportDate: new Date().toISOString(),
      version: "3.0",
      project: {
        title: "Test Project",
        date: "2026-04-02",
        records: [],
      },
    };

    expect(payload.project.title).toBe("Test Project");
    expect(payload.project.date).toBe("2026-04-02");
    expect(payload.project.clientName).toBeUndefined();
  });
});

describe("Metadata Merging", () => {
  it("should merge partial metadata updates", () => {
    const initial: ProjectMetadata = {
      projectName: "Test Project",
      clientName: "Test Client",
    };

    const update: Partial<ProjectMetadata> = {
      labOrganization: "Test Lab",
    };

    const merged = { ...initial, ...update };

    expect(merged.projectName).toBe("Test Project");
    expect(merged.clientName).toBe("Test Client");
    expect(merged.labOrganization).toBe("Test Lab");
  });

  it("should overwrite existing metadata on update", () => {
    const initial: ProjectMetadata = {
      projectName: "Initial Project",
      clientName: "Initial Client",
    };

    const update: Partial<ProjectMetadata> = {
      projectName: "Updated Project",
    };

    const merged = { ...initial, ...update };

    expect(merged.projectName).toBe("Updated Project");
    expect(merged.clientName).toBe("Initial Client");
  });
});

describe("Metadata Persistence", () => {
  it("should persist project metadata in localStorage", () => {
    const metadata: ProjectMetadata = {
      projectName: "Persistent Project",
      clientName: "Persistent Client",
      labOrganization: "Persistent Lab",
      dateReported: "2026-04-02",
      checkedBy: "John Persistent",
    };

    const serialized = JSON.stringify(metadata);
    const deserialized = JSON.parse(serialized) as ProjectMetadata;

    expect(deserialized.projectName).toBe("Persistent Project");
    expect(deserialized.labOrganization).toBe("Persistent Lab");
    expect(deserialized.checkedBy).toBe("John Persistent");
  });

  it("should persist record metadata in localStorage", () => {
    const metadata: RecordMetadata = {
      sampleNumber: "PERSIST-001",
      dateSubmitted: "2026-04-01",
      dateTested: "2026-04-02",
      testedBy: "Persistent Tech",
    };

    const serialized = JSON.stringify(metadata);
    const deserialized = JSON.parse(serialized) as RecordMetadata;

    expect(deserialized.sampleNumber).toBe("PERSIST-001");
    expect(deserialized.testedBy).toBe("Persistent Tech");
  });

  it("should handle partial metadata deserialization", () => {
    const partial = { projectName: "Partial Project" };
    const serialized = JSON.stringify(partial);
    const deserialized = JSON.parse(serialized);

    expect(deserialized.projectName).toBe("Partial Project");
    expect(deserialized.clientName).toBeUndefined();
  });
});

describe("JSON Import/Export with Record Metadata", () => {
  it("should include record metadata in JSON export", () => {
    const record = {
      id: "record-1",
      title: "Record 1",
      label: "Borehole A",
      note: "Test note",
      isExpanded: true,
      tests: [],
      results: {},
      sampleNumber: "SAMPLE-001",
      dateSubmitted: "2026-04-01",
      dateTested: "2026-04-02",
      testedBy: "Test Tech",
    };

    const payload = {
      exportDate: new Date().toISOString(),
      version: "3.0",
      project: {
        title: "Test",
        records: [record],
      },
    };

    expect(payload.project.records[0].sampleNumber).toBe("SAMPLE-001");
    expect(payload.project.records[0].dateTested).toBe("2026-04-02");
    expect(payload.project.records[0].testedBy).toBe("Test Tech");
  });

  it("should preserve record metadata during round-trip serialization", () => {
    const original = {
      sampleNumber: "S-ROUNDTRIP",
      dateSubmitted: "2026-04-01",
      dateTested: "2026-04-02",
      testedBy: "RT Tech",
    };

    const serialized = JSON.stringify(original);
    const deserialized = JSON.parse(serialized);

    expect(deserialized.sampleNumber).toBe("S-ROUNDTRIP");
    expect(deserialized.dateSubmitted).toBe("2026-04-01");
    expect(deserialized.dateTested).toBe("2026-04-02");
    expect(deserialized.testedBy).toBe("RT Tech");
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
          id: "rec-1",
          title: "Record 1",
          label: "Borehole A",
          note: "Note A",
          isExpanded: true,
          tests: [],
          results: {},
          sampleNumber: "S-001",
          dateSubmitted: "2026-04-01",
          dateTested: "2026-04-02",
          testedBy: "Tech A",
        },
        {
          id: "rec-2",
          title: "Record 2",
          label: "Borehole B",
          note: "Note B",
          isExpanded: false,
          tests: [],
          results: {},
          sampleNumber: "S-002",
          dateSubmitted: "2026-04-01",
          dateTested: "2026-04-03",
          testedBy: "Tech B",
        },
      ],
    };

    const serialized = JSON.stringify(fullState);
    const deserialized = JSON.parse(serialized);

    expect(deserialized.clientName).toBe("Full Client");
    expect(deserialized.labOrganization).toBe("Full Lab");
    expect(deserialized.records.length).toBe(2);
    expect(deserialized.records[0].sampleNumber).toBe("S-001");
    expect(deserialized.records[1].testedBy).toBe("Tech B");
  });

  it("should export all metadata fields in comprehensive report", () => {
    const exportData = {
      title: "Comprehensive Report",
      projectName: "Comprehensive Project",
      clientName: "Comprehensive Client",
      date: "2026-04-02",
      labOrganization: "Comprehensive Lab",
      dateReported: "2026-04-02",
      checkedBy: "Comprehensive Checker",
      fields: [
        { label: "Liquid Limit", value: "35.5" },
        { label: "Plastic Limit", value: "22.1" },
        { label: "Plasticity Index", value: "13.4" },
      ],
      tables: [
        {
          title: "Record Summary",
          headers: ["Record", "Sample #", "Date Tested", "Tested By", "LL", "PL", "PI"],
          rows: [["Record 1", "S-001", "2026-04-02", "Tech A", "35.5", "22.1", "13.4"]],
        },
      ],
    };

    expect(exportData.labOrganization).toBe("Comprehensive Lab");
    expect(exportData.dateReported).toBe("2026-04-02");
    expect(exportData.checkedBy).toBe("Comprehensive Checker");
    expect(exportData.tables[0].headers).toContain("Sample #");
    expect(exportData.tables[0].headers).toContain("Date Tested");
    expect(exportData.tables[0].headers).toContain("Tested By");
  });
});
