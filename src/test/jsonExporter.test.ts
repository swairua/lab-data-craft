import { importFromJSON, normalizeAtterbergProjectState } from "@/lib/jsonExporter";

describe("Atterberg JSON export/import", () => {
  it("preserves the current export payload shape", () => {
    const state = normalizeAtterbergProjectState({
      records: [
        {
          id: "record-1",
          title: "Record 1",
          label: "BH-1",
          note: "Surface sample",
          isExpanded: true,
          results: { liquidLimit: 25, plasticLimit: 20, plasticityIndex: 5 },
          tests: [
            {
              id: "test-1",
              title: "Liquid Limit 1",
              type: "liquidLimit",
              isExpanded: true,
              trials: [{ id: "trial-1", trialNo: "1", blows: "20", moisture: "30" }],
              result: { liquidLimit: 30 },
            },
          ],
        },
      ],
    });

    expect(state).not.toBeNull();
    expect(state?.records).toHaveLength(1);
    expect(state?.records[0].tests).toHaveLength(1);
    expect(state?.records[0].tests[0].type).toBe("liquidLimit");
    expect(state?.records[0].tests[0].trials[0].moisture).toBe("30");
  });

  it("normalizes legacy payloads", () => {
    const state = importFromJSON(
      JSON.stringify({
        tests: [
          {
            testType: "plasticLimit",
            testTitle: "Legacy PL",
            plasticLimitRows: [{ trialNo: "1", moisture: "22" }],
            calculatedResults: { plasticLimit: 22 },
          },
        ],
      }),
    );

    expect(state).not.toBeNull();
    expect(state?.records).toHaveLength(1);
    expect(state?.records[0].tests).toHaveLength(1);
    expect(state?.records[0].tests[0].type).toBe("plasticLimit");
    expect(state?.records[0].tests[0].trials[0].moisture).toBe("22");
  });

  it("rejects malformed JSON", () => {
    expect(importFromJSON("not valid json")).toBeNull();
  });
});
