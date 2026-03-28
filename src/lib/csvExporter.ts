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

const escapeCSV = (val: string) => {
  if (val.includes(",") || val.includes('"') || val.includes("\n")) {
    return `"${val.replace(/"/g, '""')}"`;
  }
  return val;
};

export const generateTestCSV = (data: CSVData) => {
  const lines: string[] = [];

  lines.push(escapeCSV(data.title));
  lines.push("");

  if (data.projectName) lines.push(`Project,${escapeCSV(data.projectName)}`);
  if (data.clientName) lines.push(`Client,${escapeCSV(data.clientName)}`);
  lines.push(`Date,${data.date || new Date().toISOString().split("T")[0]}`);
  lines.push("");

  if (data.fields && data.fields.length > 0) {
    lines.push("Results");
    for (const field of data.fields) {
      lines.push(`${escapeCSV(field.label)},${escapeCSV(field.value || "—")}`);
    }
    lines.push("");
  }

  if (data.tables) {
    for (const table of data.tables) {
      lines.push(table.headers.map(escapeCSV).join(","));
      for (const row of table.rows) {
        lines.push(row.map(escapeCSV).join(","));
      }
      lines.push("");
    }
  }

  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${data.title.replace(/\s+/g, "_")}_Report.csv`;
  a.click();
  URL.revokeObjectURL(url);
};
