import { createJSONDataUrl, exportAsJSON, importFromJSON, normalizeAtterbergProjectState } from "@/lib/jsonExporter";

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

describe("Atterberg JSON normalization functions", () => {
  describe("normalizeAtterbergProjectState - advanced scenarios", () => {
    it("handles nested project structure", () => {
      const payload = {
        project: {
          records: [
            {
              title: "Record 1",
              label: "BH-1",
              tests: [
                {
                  type: "liquidLimit",
                  trials: [{ blows: "20", moisture: "30" }],
                },
              ],
            },
          ],
        },
      };

      const state = normalizeAtterbergProjectState(payload);
      expect(state).not.toBeNull();
      expect(state?.records).toHaveLength(1);
      expect(state?.records[0].tests[0].type).toBe("liquidLimit");
    });

    it("handles empty records array", () => {
      const state = normalizeAtterbergProjectState({ records: [] });
      expect(state).not.toBeNull();
      expect(state?.records).toHaveLength(0);
    });

    it("returns null for non-object input", () => {
      expect(normalizeAtterbergProjectState(null)).toBeNull();
      expect(normalizeAtterbergProjectState("string")).toBeNull();
      expect(normalizeAtterbergProjectState(123)).toBeNull();
    });

    it("returns null when no recognizable structure found", () => {
      expect(normalizeAtterbergProjectState({ foo: "bar" })).toBeNull();
    });

    it("auto-generates IDs and defaults for missing values", () => {
      const state = normalizeAtterbergProjectState({
        records: [
          {
            tests: [
              {
                type: "plasticLimit",
                trials: [{ moisture: "20" }],
              },
            ],
          },
        ],
      });

      expect(state?.records[0].id).toBeDefined();
      expect(state?.records[0].id).toMatch(/^record-/);
      expect(state?.records[0].title).toBe("Record 1");
      expect(state?.records[0].tests[0].id).toBeDefined();
      expect(state?.records[0].tests[0].title).toContain("plasticLimit");
    });

    it("normalizes legacy liquid limit format", () => {
      const state = normalizeAtterbergProjectState({
        records: [
          {
            tests: [
              {
                testType: "liquidLimit",
                testTitle: "Legacy LL",
                liquidLimitRows: [
                  { trialNo: "1", blows: "20", moisture: "30" },
                  { trialNo: "2", blows: "30", moisture: "20" },
                ],
                calculatedResults: { liquidLimit: 25 },
              },
            ],
          },
        ],
      });

      expect(state?.records[0].tests[0].type).toBe("liquidLimit");
      expect(state?.records[0].tests[0].trials).toHaveLength(2);
      expect(state?.records[0].tests[0].result.liquidLimit).toBe(25);
    });

    it("normalizes legacy shrinkage limit format", () => {
      const state = normalizeAtterbergProjectState({
        records: [
          {
            tests: [
              {
                testType: "shrinkageLimit",
                testTitle: "Legacy SL",
                shrinkageLimitRows: [
                  { trialNo: "1", initialVolume: "20", finalVolume: "15", moisture: "12" },
                ],
                calculatedResults: { shrinkageLimit: 3 },
              },
            ],
          },
        ],
      });

      expect(state?.records[0].tests[0].type).toBe("shrinkageLimit");
      expect(state?.records[0].tests[0].trials).toHaveLength(1);
    });

    it("creates default trial when none provided", () => {
      const state = normalizeAtterbergProjectState({
        records: [
          {
            tests: [
              {
                type: "liquidLimit",
              },
            ],
          },
        ],
      });

      expect(state?.records[0].tests[0].trials).toHaveLength(1);
      expect(state?.records[0].tests[0].trials[0].blows).toBe("");
      expect(state?.records[0].tests[0].trials[0].moisture).toBe("");
    });

    it("normalizes partial test objects", () => {
      const state = normalizeAtterbergProjectState({
        records: [
          {
            title: "Partial Record",
            tests: [
              {
                type: "plasticLimit",
                trials: [{ moisture: "20" }, { moisture: "22" }],
              },
            ],
          },
        ],
      });

      expect(state?.records[0].title).toBe("Partial Record");
      expect(state?.records[0].tests[0].title).toContain("plasticLimit");
      expect(state?.records[0].tests[0].trials).toHaveLength(2);
    });

    it("handles malformed results object", () => {
      const state = normalizeAtterbergProjectState({
        records: [
          {
            results: { liquidLimit: "not a number", plasticLimit: 20 },
            tests: [],
          },
        ],
      });

      expect(state?.records[0].results.liquidLimit).toBeUndefined();
      expect(state?.records[0].results.plasticLimit).toBe(20);
    });

    it("creates valid record from legacy tests array", () => {
      const state = normalizeAtterbergProjectState({
        tests: [
          {
            testType: "liquidLimit",
            testTitle: "Old Format LL",
            liquidLimitRows: [{ blows: "25", moisture: "28" }],
          },
        ],
      });

      expect(state?.records).toHaveLength(1);
      expect(state?.records[0].title).toBe("Record 1");
      expect(state?.records[0].tests).toHaveLength(1);
      expect(state?.records[0].tests[0].type).toBe("liquidLimit");
    });

    it("preserves expanded state flags", () => {
      const state = normalizeAtterbergProjectState({
        records: [
          {
            isExpanded: false,
            tests: [
              {
                type: "liquidLimit",
                isExpanded: true,
                trials: [{ blows: "25", moisture: "28" }],
              },
            ],
          },
        ],
      });

      expect(state?.records[0].isExpanded).toBe(false);
      expect(state?.records[0].tests[0].isExpanded).toBe(true);
    });
  });
});

describe("Atterberg JSON export functions", () => {
  describe("exportAsJSON", () => {
    it("converts payload to JSON string", () => {
      const payload = {
        exportDate: "2024-01-01",
        version: "1.0",
        project: {
          title: "Test Project",
          records: [],
        },
      };

      const jsonString = exportAsJSON(payload);
      expect(typeof jsonString).toBe("string");
      expect(jsonString).toContain('"exportDate"');
      expect(jsonString).toContain("2024-01-01");
    });

    it("formats JSON with indentation", () => {
      const payload = {
        exportDate: "2024-01-01",
        version: "1.0",
        project: { records: [] },
      };

      const jsonString = exportAsJSON(payload);
      expect(jsonString).toContain("\n");
    });

    it("includes all payload fields", () => {
      const payload = {
        exportDate: "2024-01-01",
        version: "1.0",
        project: {
          title: "Project",
          clientName: "Client",
          date: "2024-01-01",
          records: [],
        },
      };

      const jsonString = exportAsJSON(payload);
      const parsed = JSON.parse(jsonString);
      expect(parsed.exportDate).toBe("2024-01-01");
      expect(parsed.project.clientName).toBe("Client");
    });
  });

  describe("createJSONDataUrl", () => {
    it("creates a data URL from JSON string", () => {
      const jsonString = '{"test": "data"}';
      const dataUrl = createJSONDataUrl(jsonString);

      expect(dataUrl).toMatch(/^data:text\/plain;charset=utf-8,/);
      expect(dataUrl).toContain("%7B");
    });

    it("properly encodes special characters", () => {
      const jsonString = '{"key": "value with spaces"}';
      const dataUrl = createJSONDataUrl(jsonString);

      expect(dataUrl).toContain("%20");
    });

    it("encodes quotes in JSON", () => {
      const jsonString = '{"quote": "\\"test\\""}';
      const dataUrl = createJSONDataUrl(jsonString);

      expect(dataUrl).toMatch(/data:text\/plain;charset=utf-8,/);
    });

    it("can be used as an href for download", () => {
      const jsonString = '{"test": "data"}';
      const dataUrl = createJSONDataUrl(jsonString);

      expect(dataUrl.startsWith("data:text/plain;charset=utf-8,")).toBe(true);
    });
  });

  describe("importFromJSON - edge cases", () => {
    it("handles empty JSON object", () => {
      const state = importFromJSON("{}");
      expect(state).toBeNull();
    });

    it("handles JSON with unexpected structure", () => {
      const state = importFromJSON('{"foo": "bar"}');
      expect(state).toBeNull();
    });

    it("handles empty records array", () => {
      const state = importFromJSON('{"records": []}');
      expect(state).not.toBeNull();
      expect(state?.records).toHaveLength(0);
    });

    it("recovers from JSON syntax errors", () => {
      expect(importFromJSON("{invalid json}")).toBeNull();
      expect(importFromJSON('{"incomplete": ')).toBeNull();
    });

    it("handles deeply nested structures", () => {
      const state = importFromJSON(
        JSON.stringify({
          project: {
            records: [
              {
                title: "Deep Record",
                tests: [
                  {
                    type: "liquidLimit",
                    trials: [{ blows: "25", moisture: "28" }],
                  },
                ],
              },
            ],
          },
        }),
      );

      expect(state).not.toBeNull();
      expect(state?.records[0].title).toBe("Deep Record");
    });

    it("handles mixed legacy and modern formats", () => {
      const state = importFromJSON(
        JSON.stringify({
          records: [
            {
              title: "Modern Record",
              tests: [
                {
                  type: "plasticLimit",
                  trials: [{ moisture: "20" }],
                },
              ],
            },
          ],
          tests: [
            {
              testType: "liquidLimit",
              testTitle: "Legacy Test",
              liquidLimitRows: [{ blows: "25", moisture: "28" }],
            },
          ],
        }),
      );

      // Should prioritize records over tests array
      expect(state).not.toBeNull();
      expect(state?.records[0].title).toBe("Modern Record");
    });
  });
});
