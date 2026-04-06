import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type {
  AtterbergProjectState,
  AtterbergRecord,
  LiquidLimitTrial,
  PlasticLimitTrial,
  ShrinkageLimitTrial,
} from "@/context/TestDataContext";
import { calculateMoistureFromMass } from "./atterbergCalculations";

interface AtterbergPDFOptions {
  projectName?: string;
  clientName?: string;
  date?: string;
  projectState: AtterbergProjectState;
  records: AtterbergRecord[];
}

const COLORS = {
  primary: [41, 98, 163] as [number, number, number],
  dark: [30, 30, 30] as [number, number, number],
  muted: [120, 120, 120] as [number, number, number],
  border: [180, 180, 180] as [number, number, number],
  lightBg: [245, 247, 250] as [number, number, number],
  headerBg: [220, 230, 245] as [number, number, number],
};

const num = (v: string | undefined): number | null => {
  if (!v || v.trim() === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

const round2 = (n: number) => Math.round(n * 100) / 100;
const fmt = (v: number | string | null | undefined): string =>
  v === null || v === undefined ? "-" : typeof v === "number" ? String(round2(v)) : v;

function drawRecordPage(doc: jsPDF, record: AtterbergRecord, options: AtterbergPDFOptions) {
  const { projectName, clientName, projectState } = options;
  const pw = doc.internal.pageSize.getWidth();
  const margin = 14;
  const contentW = pw - margin * 2;

  let y = 12;

  // ── Title bar ──
  doc.setFillColor(...COLORS.primary);
  doc.roundedRect(margin, y, contentW, 14, 2, 2, "F");
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  doc.text("ATTERBERG LIMITS (BS 1377 PART 2, 4.3 : 1990)", pw / 2, y + 9, { align: "center" });
  y += 20;

  // ── Metadata section ──
  const metaRows = [
    [
      { label: "Client name:", value: clientName || projectState.clientName || "-", span: 1 },
    ],
    [
      { label: "Project/Site name:", value: projectName || projectState.projectName || "-", span: 1 },
    ],
    [
      { label: "Sampled by:", value: projectState.labOrganization || "-" },
      { label: "Date submitted:", value: record.dateSubmitted || "-" },
      { label: "Date tested:", value: record.dateTested || "-" },
    ],
    [
      { label: "Sample ID:", value: record.label || "-" },
      { label: "Sample depth:", value: (record as any).sampleDepth || "-" },
      { label: "Sample No:", value: record.sampleNumber || "-" },
    ],
  ];

  doc.setFontSize(8);
  for (const row of metaRows) {
    const colW = contentW / row.length;
    row.forEach((item, i) => {
      const x = margin + i * colW;
      // Label
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...COLORS.primary);
      doc.text(item.label, x + 2, y + 4);
      // Value
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...COLORS.dark);
      doc.text(item.value, x + 2, y + 9);
      // Border
      doc.setDrawColor(...COLORS.border);
      doc.rect(x, y, colW, 12);
    });
    y += 12;
  }

  y += 4;

  // ── Find tests ──
  const llTest = record.tests.find((t) => t.type === "liquidLimit");
  const plTest = record.tests.find((t) => t.type === "plasticLimit");
  const slTest = record.tests.find((t) => t.type === "shrinkageLimit");

  const llTrials = (llTest?.type === "liquidLimit" ? llTest.trials : []) as LiquidLimitTrial[];
  const plTrials = (plTest?.type === "plasticLimit" ? plTest.trials : []) as PlasticLimitTrial[];
  const slTrials = (slTest?.type === "shrinkageLimit" ? slTest.trials : []) as ShrinkageLimitTrial[];

  // ── Data table ──
  const maxLL = Math.min(llTrials.length, 5);
  const maxPL = Math.min(plTrials.length, 2);
  const totalCols = 1 + maxLL + maxPL; // label + LL trials + PL trials

  // Build header row
  const colHeaders = [""];
  for (let i = 0; i < maxLL; i++) colHeaders.push(`LL ${i + 1}`);
  for (let i = 0; i < maxPL; i++) colHeaders.push(`PL ${i + 1}`);
  // Pad to at least 7 columns
  while (colHeaders.length < 8) colHeaders.push("");

  const dataLabels = [
    "Container No",
    "Penetration (mm)",
    "Cont + Wet Soil (g)",
    "Cont + Dry Soil (g)",
    "Container (g)",
    "Wt Moisture (g)",
    "Wt Dry Soil (g)",
    "Moisture Content (%)",
  ];

  const dataRows: string[][] = dataLabels.map((label, i) => {
    const row = [label];

    for (let t = 0; t < maxLL; t++) {
      const trial = llTrials[t];
      const wet = num(trial.containerWetMass);
      const dry = num(trial.containerDryMass);
      const cont = num(trial.containerMass);
      switch (i) {
        case 0: row.push(trial.containerNo || "-"); break;
        case 1: row.push(fmt(num(trial.penetration))); break;
        case 2: row.push(fmt(wet)); break;
        case 3: row.push(fmt(dry)); break;
        case 4: row.push(fmt(cont)); break;
        case 5: row.push(wet !== null && dry !== null ? fmt(round2(wet - dry)) : "-"); break;
        case 6: row.push(dry !== null && cont !== null ? fmt(round2(dry - cont)) : "-"); break;
        case 7: {
          const mc = calculateMoistureFromMass(trial.containerWetMass, trial.containerDryMass, trial.containerMass);
          row.push(mc ? String(round2(Number(mc))) : "-");
          break;
        }
      }
    }

    for (let t = 0; t < maxPL; t++) {
      const trial = plTrials[t];
      const wet = num(trial.containerWetMass);
      const dry = num(trial.containerDryMass);
      const cont = num(trial.containerMass);
      switch (i) {
        case 0: row.push(trial.containerNo || "-"); break;
        case 1: row.push("-"); break;
        case 2: row.push(fmt(wet)); break;
        case 3: row.push(fmt(dry)); break;
        case 4: row.push(fmt(cont)); break;
        case 5: row.push(wet !== null && dry !== null ? fmt(round2(wet - dry)) : "-"); break;
        case 6: row.push(dry !== null && cont !== null ? fmt(round2(dry - cont)) : "-"); break;
        case 7: {
          const mc = calculateMoistureFromMass(trial.containerWetMass, trial.containerDryMass, trial.containerMass);
          row.push(mc ? String(round2(Number(mc))) : "-");
          break;
        }
      }
    }

    // Pad
    while (row.length < colHeaders.length) row.push("-");
    return row;
  });

  // Column widths: first col wider
  const firstColW = 38;
  const dataColW = (contentW - firstColW) / (colHeaders.length - 1);
  const columnStyles: Record<number, { cellWidth: number }> = { 0: { cellWidth: firstColW } };
  for (let i = 1; i < colHeaders.length; i++) {
    columnStyles[i] = { cellWidth: dataColW };
  }

  autoTable(doc, {
    startY: y,
    head: [colHeaders],
    body: dataRows,
    theme: "grid",
    headStyles: {
      fillColor: COLORS.headerBg,
      textColor: COLORS.dark,
      fontStyle: "bold",
      fontSize: 7,
      cellPadding: 2,
      halign: "center",
    },
    bodyStyles: { fontSize: 7.5, cellPadding: 2, halign: "center" },
    columnStyles: {
      0: { cellWidth: firstColW, halign: "left", fontStyle: "bold", fontSize: 7.5 },
    },
    alternateRowStyles: { fillColor: COLORS.lightBg },
    margin: { left: margin, right: margin },
    styles: { overflow: "linebreak" as const, lineColor: COLORS.border, lineWidth: 0.3 },
    didParseCell: (data: any) => {
      // Bold the moisture content row
      if (data.section === "body" && data.row.index === 7) {
        data.cell.styles.fontStyle = "bold";
        data.cell.styles.fillColor = [235, 242, 250];
      }
    },
  });

  y = (doc as any).lastAutoTable.finalY + 2;

  // ── Plastic Limit result row ──
  doc.setDrawColor(...COLORS.border);
  doc.setFillColor(...COLORS.headerBg);
  doc.rect(margin, y, contentW, 8, "FD");
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.primary);
  doc.text("PLASTIC LIMIT", margin + contentW * 0.55, y + 5.5);
  doc.setTextColor(...COLORS.dark);
  doc.text(fmt(record.results.plasticLimit), margin + contentW * 0.85, y + 5.5);
  y += 12;

  // ── Linear Shrinkage section ──
  const slTrial = slTrials[0];
  const lsData = [
    ["Initial length (mm)", fmt(slTrial ? num(slTrial.initialLength) ?? 140 : 140)],
    ["Final length (mm)", fmt(slTrial ? num(slTrial.finalLength) : null)],
    ["Shrinkage (%)", fmt(record.results.linearShrinkage)],
  ];

  doc.setFillColor(...COLORS.primary);
  doc.roundedRect(margin + contentW * 0.5, y, contentW * 0.5, 8, 1, 1, "F");
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  doc.text("LINEAR SHRINKAGE", margin + contentW * 0.75, y + 5.5, { align: "center" });
  y += 10;

  doc.setFontSize(8);
  for (const [label, value] of lsData) {
    const lx = margin + contentW * 0.5;
    doc.setDrawColor(...COLORS.border);
    doc.rect(lx, y, contentW * 0.35, 7);
    doc.rect(lx + contentW * 0.35, y, contentW * 0.15, 7);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...COLORS.dark);
    doc.text(label, lx + 2, y + 5);
    doc.setFont("helvetica", "normal");
    doc.text(value, lx + contentW * 0.35 + 2, y + 5);
    y += 7;
  }
  y += 6;

  // ── Summary Results ──
  const summaryData: [string, string][] = [
    ["LIQUID LIMIT (%)", fmt(record.results.liquidLimit)],
    ["PLASTIC LIMIT (%)", fmt(record.results.plasticLimit)],
    ["PLASTICITY INDEX (%)", fmt(record.results.plasticityIndex)],
    ["Passing 425 µm (%)", fmt(num(record.passing425um))],
    ["MODULUS OF PLASTICITY", fmt(record.results.modulusOfPlasticity)],
    ["LINEAR SHRINKAGE (%)", fmt(record.results.linearShrinkage)],
  ];

  doc.setFillColor(...COLORS.primary);
  doc.roundedRect(margin + contentW * 0.5, y, contentW * 0.5, 8, 1, 1, "F");
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  doc.text("RESULTS SUMMARY", margin + contentW * 0.75, y + 5.5, { align: "center" });
  y += 10;

  doc.setFontSize(8);
  for (const [label, value] of summaryData) {
    const lx = margin + contentW * 0.5;
    doc.setDrawColor(...COLORS.border);
    doc.rect(lx, y, contentW * 0.35, 7);
    doc.rect(lx + contentW * 0.35, y, contentW * 0.15, 7);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...COLORS.dark);
    doc.text(label, lx + 2, y + 5);
    doc.setFont("helvetica", "normal");
    doc.text(value, lx + contentW * 0.35 + 2, y + 5);
    y += 7;
  }
  y += 6;

  // ── Soil Classification ──
  const ll = record.results.liquidLimit;
  const pi = record.results.plasticityIndex ?? 0;
  let uscsCode = "";
  let uscsDesc = "";
  if (ll !== undefined && record.results.plasticLimit !== undefined) {
    if (pi < 4) {
      uscsCode = ll < 50 ? "ML" : "MH";
      uscsDesc = ll < 50 ? "SILT OF LOW PLASTICITY" : "SILT OF HIGH PLASTICITY";
    } else if (pi < 7) {
      uscsCode = "CL-ML";
      uscsDesc = "SILTY CLAY OF LOW PLASTICITY";
    } else {
      uscsCode = ll < 50 ? "CL" : "CH";
      uscsDesc = ll < 50 ? "CLAY OF LOW PLASTICITY" : "CLAY OF HIGH PLASTICITY";
    }
  }

  doc.setFillColor(...COLORS.headerBg);
  const classX = margin + contentW * 0.5;
  doc.rect(classX, y, contentW * 0.5, 8, "F");
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.primary);
  doc.text("SOIL CLASSIFICATION", classX + contentW * 0.25, y + 5.5, { align: "center" });
  y += 10;

  doc.setFontSize(8);
  // USCS
  doc.setDrawColor(...COLORS.border);
  doc.rect(classX, y, contentW * 0.1, 7);
  doc.rect(classX + contentW * 0.1, y, contentW * 0.3, 7);
  doc.rect(classX + contentW * 0.4, y, contentW * 0.1, 7);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.primary);
  doc.text("USCS", classX + 2, y + 5);
  doc.setTextColor(...COLORS.dark);
  doc.text(uscsDesc, classX + contentW * 0.1 + 2, y + 5);
  doc.setFont("helvetica", "bold");
  doc.text(uscsCode, classX + contentW * 0.4 + 2, y + 5);
  y += 7;

  // AASHTO
  doc.rect(classX, y, contentW * 0.1, 7);
  doc.rect(classX + contentW * 0.1, y, contentW * 0.4, 7);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.primary);
  doc.text("AASHTO", classX + 2, y + 5);
  y += 12;

  // ── Footer ──
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.dark);
  doc.text(`Tested by: ${record.testedBy || "____________"}`, margin, y);
  doc.text(`Date reported: ${projectState.dateReported || "____________"}`, margin + contentW * 0.35, y);
  doc.text(`Checked by: ${projectState.checkedBy || "____________"}`, margin + contentW * 0.7, y);
}

export const generateAtterbergPDF = (options: AtterbergPDFOptions) => {
  const doc = new jsPDF();

  for (let i = 0; i < options.records.length; i++) {
    if (i > 0) doc.addPage();
    drawRecordPage(doc, options.records[i], options);
  }

  // Page numbers
  const pageCount = doc.getNumberOfPages();
  const pageHeight = doc.internal.pageSize.getHeight();
  const pw = doc.internal.pageSize.getWidth();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(...COLORS.muted);
    doc.setFont("helvetica", "normal");
    doc.text(`Page ${i} of ${pageCount}`, pw / 2, pageHeight - 6, { align: "center" });
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, pageHeight - 6);
  }

  doc.save(`Atterberg_Limits_${(options.projectName || "export").replace(/\s+/g, "_")}.pdf`);
};
