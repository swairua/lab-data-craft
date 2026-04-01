import { useEffect, useRef } from "react";
import { useTestData, TestStatus } from "@/context/TestDataContext";
import { useBorehole } from "@/context/BoreholeContext";

/**
 * Hook to report test data to the dashboard context, scoped by active borehole.
 */
export const useTestReport = (
  testKey: string,
  dataPoints: number,
  keyResults: { label: string; value: string }[],
) => {
  const { updateTest } = useTestData();
  const { activeBoreholeId } = useBorehole();
  const prevRef = useRef<string>("");

  useEffect(() => {
    const compositeId = `${activeBoreholeId}::${testKey}`;
    const status: TestStatus = dataPoints === 0 ? "not-started" : "in-progress";
    const hasResults = keyResults.some(r => r.value && r.value !== "—" && r.value !== "");

    const key = JSON.stringify({ compositeId, dataPoints, keyResults, status, hasResults });
    if (key === prevRef.current) return;
    prevRef.current = key;

    updateTest(compositeId, {
      dataPoints,
      keyResults: keyResults.filter(r => r.value && r.value !== "—" && r.value !== ""),
      status: hasResults ? "in-progress" : status,
    });
  }, [testKey, activeBoreholeId, dataPoints, keyResults, updateTest]);
};
