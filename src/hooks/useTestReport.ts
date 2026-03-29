import { useEffect, useRef } from "react";
import { useTestData, TestStatus } from "@/context/TestDataContext";

/**
 * Hook to report test data to the dashboard context.
 * Call in each test component with relevant data.
 */
export const useTestReport = (
  id: string,
  dataPoints: number,
  keyResults: { label: string; value: string }[],
) => {
  const { updateTest } = useTestData();
  const prevRef = useRef<string>("");

  useEffect(() => {
    const status: TestStatus = dataPoints === 0 ? "not-started" : "in-progress";
    const hasResults = keyResults.some(r => r.value && r.value !== "—" && r.value !== "");

    const key = JSON.stringify({ dataPoints, keyResults, status, hasResults });
    if (key === prevRef.current) return;
    prevRef.current = key;

    updateTest(id, {
      dataPoints,
      keyResults: keyResults.filter(r => r.value && r.value !== "—" && r.value !== ""),
      status: hasResults ? "in-progress" : status,
    });
  }, [id, dataPoints, keyResults, updateTest]);
};
