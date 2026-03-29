interface CSVData {
  title: string;
  projectName?: string;
  clientName?: string;
  date?: string;
  fields?: { label: string; value: string }[];
  tables?: {
    headers: string[];
    rows: string[][];
  }[];
}

const normalizeCSVText = (val: string) =>
  val
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[—–]/g, "-")
    .replace(/°/g, " deg")
    .replace(/φ/g, "phi")
    .replace(/³/g, "3")
    .replace(/µ/g, "u")
    .replace(/[^\x20-\x7E]/g, "");

const escapeCSV = (val: string) => {
  const normalized = normalizeCSVText(val);
  if (normalized.includes(",") || normalized.includes('"') || normalized.includes("\n")) {
    return `"${normalized.replace(/"/g, '""')}"`;
  }
  return normalized;
};

export const generateTestCSV = (data: CSVData) => {
  const lines: string[] = [];

  lines.push(escapeCSV(data.title));
  lines.push("");

  if (data.projectName) lines.push(`Project,${escapeCSV(data.projectName)}`);
  if (data.clientName) lines.push(`Client,${escapeCSV(data.clientName)}`);
  lines.push(`Date,${escapeCSV(data.date || new Date().toISOString().split("T")[0])}`);
  lines.push("");

  if (data.fields && data.fields.length > 0) {
    lines.push("Results");
    for (const field of data.fields) {
      lines.push(`${escapeCSV(field.label)},${escapeCSV(field.value || "-")}`);
    }
    lines.push("");
  }

  if (data.tables) {
    for (const table of data.tables) {
      lines.push(table.headers.map(escapeCSV).join(","));
      for (const row of table.rows) {
        lines.push(row.map((cell) => escapeCSV(cell || "-")).join(","));
      }
      lines.push("");
    }
  }

  const csvContent = `\uFEFF${lines.join("\r\n")}`;
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${data.title.replace(/\s+/g, "_")}_Report.csv`;
  a.click();
  URL.revokeObjectURL(url);
};
