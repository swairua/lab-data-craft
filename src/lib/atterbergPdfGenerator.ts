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
import { fetchAdminImagesAsBase64, type AdminImages } from "./imageUtils";

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

// ── Draw the cone penetration / moisture graph (BS 1377 style) ──
function drawConeGraph(
  doc: jsPDF,
  llTrials: LiquidLimitTrial[],
  liquidLimit: number | undefined,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  const margin = { top: 14, bottom: 20, left: 28, right: 8 };
  const plotX = x + margin.left;
  const plotY = y + margin.top;
  const plotW = w - margin.left - margin.right;
  const plotH = h - margin.top - margin.bottom;

  // Title
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.primary);
  doc.text("CONE PENETRATION vs MOISTURE CONTENT", x + w / 2, y + 8, { align: "center" });

  // Axes
  doc.setDrawColor(...COLORS.dark);
  doc.setLineWidth(0.3);
  doc.line(plotX, plotY, plotX, plotY + plotH); // Y axis
  doc.line(plotX, plotY + plotH, plotX + plotW, plotY + plotH); // X axis

  // Gather data points
  const points: Array<{ pen: number; mc: number }> = [];
  for (const trial of llTrials) {
    const pen = num(trial.penetration);
    const mcStr = calculateMoistureFromMass(trial.containerWetMass, trial.containerDryMass, trial.containerMass);
    const mc = mcStr ? Number(mcStr) : num(trial.moisture);
    if (pen !== null && mc !== null) {
      points.push({ pen, mc });
    }
  }

  if (points.length === 0) {
    doc.setFontSize(7);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(...COLORS.muted);
    doc.text("No data", x + w / 2, y + h / 2, { align: "center" });
    return;
  }

  // Determine ranges
  const mcValues = points.map((p) => p.mc);
  const penValues = points.map((p) => p.pen);
  const mcMin = Math.floor(Math.min(...mcValues) - 2);
  const mcMax = Math.ceil(Math.max(...mcValues) + 2);
  const penMin = Math.floor(Math.min(...penValues, 14));
  const penMax = Math.ceil(Math.max(...penValues, 26));

  // Scale functions
  const scaleX = (mc: number) => plotX + ((mc - mcMin) / (mcMax - mcMin)) * plotW;
  const scaleY = (pen: number) => plotY + plotH - ((pen - penMin) / (penMax - penMin)) * plotH;

  // Grid lines and tick marks
  doc.setFontSize(5.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...COLORS.muted);
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.15);

  // X-axis ticks (moisture content)
  const mcStep = Math.max(1, Math.round((mcMax - mcMin) / 6));
  for (let mc = Math.ceil(mcMin); mc <= mcMax; mc += mcStep) {
    const px = scaleX(mc);
    doc.line(px, plotY, px, plotY + plotH);
    doc.text(String(mc), px, plotY + plotH + 5, { align: "center" });
  }

  // Y-axis ticks (penetration)
  const penStep = Math.max(1, Math.round((penMax - penMin) / 6));
  for (let pen = Math.ceil(penMin); pen <= penMax; pen += penStep) {
    const py = scaleY(pen);
    doc.line(plotX, py, plotX + plotW, py);
    doc.text(String(pen), plotX - 3, py + 1.5, { align: "right" });
  }

  // 20mm reference line
  doc.setDrawColor(200, 50, 50);
  doc.setLineWidth(0.3);
  doc.setLineDashPattern([2, 2], 0);
  const y20 = scaleY(20);
  doc.line(plotX, y20, plotX + plotW, y20);
  doc.setFontSize(5);
  doc.setTextColor(200, 50, 50);
  doc.text("20mm", plotX + plotW + 1, y20 + 1.5);
  doc.setLineDashPattern([], 0);

  // Sort points by moisture content for line drawing
  const sorted = [...points].sort((a, b) => a.mc - b.mc);

  // Draw data line
  doc.setDrawColor(...COLORS.primary);
  doc.setLineWidth(0.5);
  for (let i = 1; i < sorted.length; i++) {
    doc.line(
      scaleX(sorted[i - 1].mc),
      scaleY(sorted[i - 1].pen),
      scaleX(sorted[i].mc),
      scaleY(sorted[i].pen),
    );
  }

  // Draw data points
  for (const pt of sorted) {
    const cx = scaleX(pt.mc);
    const cy = scaleY(pt.pen);
    doc.setFillColor(...COLORS.primary);
    doc.circle(cx, cy, 1.2, "F");
  }

  // Mark LL at 20mm if available
  if (liquidLimit !== undefined) {
    const llX = scaleX(liquidLimit);
    doc.setDrawColor(200, 50, 50);
    doc.setLineDashPattern([1, 1], 0);
    doc.setLineWidth(0.3);
    doc.line(llX, plotY, llX, plotY + plotH);
    doc.setLineDashPattern([], 0);
    doc.setFontSize(5.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(200, 50, 50);
    doc.text(`LL=${round2(liquidLimit)}%`, llX, plotY - 2, { align: "center" });
  }

  // Axis labels
  doc.setFontSize(6);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.dark);
  doc.text("Moisture Content (%)", x + w / 2, y + h - 2, { align: "center" });

  // Rotated Y label
  doc.saveGraphicsState();
  const yLabelX = x + 4;
  const yLabelY = y + h / 2;
  doc.text("Penetration (mm)", yLabelX, yLabelY, { angle: 90 });
  doc.restoreGraphicsState();
}

// ── Draw the Casagrande Plasticity Chart ──
function drawPlasticityChart(
  doc: jsPDF,
  ll: number | undefined,
  pi: number | undefined,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  const margin = { top: 14, bottom: 20, left: 28, right: 8 };
  const plotX = x + margin.left;
  const plotY = y + margin.top;
  const plotW = w - margin.left - margin.right;
  const plotH = h - margin.top - margin.bottom;

  // Title
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.primary);
  doc.text("PLASTICITY CHART (ASTM D2487)", x + w / 2, y + 8, { align: "center" });

  // Axes
  doc.setDrawColor(...COLORS.dark);
  doc.setLineWidth(0.3);
  doc.line(plotX, plotY, plotX, plotY + plotH);
  doc.line(plotX, plotY + plotH, plotX + plotW, plotY + plotH);

  // Range
  const llMax = Math.max(100, (ll ?? 0) + 20);
  const piMax = Math.max(60, (pi ?? 0) + 15);

  const scaleX2 = (v: number) => plotX + (v / llMax) * plotW;
  const scaleY2 = (v: number) => plotY + plotH - (v / piMax) * plotH;

  // Grid
  doc.setFontSize(5.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...COLORS.muted);
  doc.setDrawColor(230, 230, 230);
  doc.setLineWidth(0.1);

  for (let v = 0; v <= llMax; v += 20) {
    const px = scaleX2(v);
    doc.line(px, plotY, px, plotY + plotH);
    doc.text(String(v), px, plotY + plotH + 5, { align: "center" });
  }
  for (let v = 0; v <= piMax; v += 10) {
    const py = scaleY2(v);
    doc.line(plotX, py, plotX + plotW, py);
    doc.text(String(v), plotX - 3, py + 1.5, { align: "right" });
  }

  // LL=50 reference line
  doc.setDrawColor(200, 200, 200);
  doc.setLineDashPattern([2, 2], 0);
  doc.setLineWidth(0.3);
  const x50 = scaleX2(50);
  doc.line(x50, plotY, x50, plotY + plotH);
  doc.setLineDashPattern([], 0);

  // A-line: PI = 0.73(LL - 20)
  doc.setDrawColor(139, 92, 246); // purple
  doc.setLineWidth(0.5);
  const aStart = 20;
  const aEnd = llMax;
  const aY1 = 0.73 * (aStart - 20);
  const aY2 = 0.73 * (aEnd - 20);
  doc.line(scaleX2(aStart), scaleY2(aY1), scaleX2(aEnd), scaleY2(Math.min(aY2, piMax)));

  // U-line: PI = 0.9(LL - 8)
  doc.setDrawColor(239, 68, 68); // red
  doc.setLineWidth(0.3);
  doc.setLineDashPattern([2, 2], 0);
  const uStart = 8;
  const uY1 = 0;
  const uY2 = 0.9 * (aEnd - 8);
  doc.line(scaleX2(uStart), scaleY2(uY1), scaleX2(aEnd), scaleY2(Math.min(uY2, piMax)));
  doc.setLineDashPattern([], 0);

  // Zone labels
  doc.setFontSize(5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(100, 100, 100);
  doc.text("CL", scaleX2(30), scaleY2(18));
  doc.text("ML", scaleX2(30), scaleY2(4));
  doc.text("CH", scaleX2(70), scaleY2(35));
  doc.text("MH", scaleX2(70), scaleY2(8));

  // Legend
  doc.setFontSize(4.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(139, 92, 246);
  doc.text("— A-line", plotX + plotW - 20, plotY + 5);
  doc.setTextColor(239, 68, 68);
  doc.text("-- U-line", plotX + plotW - 20, plotY + 9);

  // Plot sample point
  if (ll !== undefined && pi !== undefined) {
    const cx = scaleX2(ll);
    const cy = scaleY2(pi);
    doc.setFillColor(239, 68, 68);
    doc.circle(cx, cy, 1.5, "F");
    doc.setFontSize(5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(239, 68, 68);
    doc.text(`(${round2(ll)}, ${round2(pi)})`, cx + 3, cy - 2);
  }

  // Axis labels
  doc.setFontSize(6);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.dark);
  doc.text("Liquid Limit (%)", x + w / 2, y + h - 2, { align: "center" });
  doc.saveGraphicsState();
  doc.text("Plasticity Index (%)", x + 4, y + h / 2, { angle: 90 });
  doc.restoreGraphicsState();
}

function drawRecordPage(
  doc: jsPDF,
  record: AtterbergRecord,
  options: AtterbergPDFOptions,
  images: AdminImages,
) {
  const { projectName, clientName, projectState } = options;
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentW = pw - margin * 2;

  let y = 10;

  // ── Header images: logo (left) + contacts (right) ──
  // Use consistent sizing to match XLSX proportions (fixed width for visual consistency)
  const headerImageW = 55; // Fixed width for logo/contacts (matches XLSX visual ratio)
  const headerImageH = 18; // Adjusted height to match aspect ratio

  if (images.logo || images.contacts || images.stamp) {
    if (images.logo) {
      try {
        doc.addImage(images.logo, margin, y, headerImageW, headerImageH);
      } catch { /* skip */ }
    }
    if (images.contacts) {
      try {
        doc.addImage(images.contacts, pw - margin - headerImageW, y, headerImageW, headerImageH);
      } catch { /* skip */ }
    }
    if (images.stamp) {
      try {
        const stampW = 35; // Stamp is smaller (50 pixels vs 80 pixels in XLSX)
        const stampH = 14;
        doc.addImage(images.stamp, margin, y + headerImageH + 2, stampW, stampH);
      } catch { /* skip */ }
    }
    y += headerImageH + 5;
  }

  // ── Title bar ──
  doc.setFillColor(...COLORS.primary);
  doc.rect(margin, y, contentW, 10, "F");
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  doc.text("ATTERBERG LIMITS (BS 1377 PART 2, 4.3 : 1990)", pw / 2, y + 6.5, { align: "center" });
  y += 12;

  // ── Metadata section - Use table-like layout matching XLSX ──
  const metadataData = [
    ["Client name:", clientName || projectState.clientName || "", "", "", "", ""],
    ["Project/Site name:", projectName || projectState.projectName || "", "", "", "", ""],
    [
      "Sampled and submitted by:",
      projectState.labOrganization || "",
      "Date submitted:",
      record.dateSubmitted || "",
      "Date tested:",
      record.dateTested || "",
    ],
    [
      "Sample ID:",
      record.label || "",
      "Sample depth (M):",
      "",
      "Sample No:",
      record.sampleNumber || "-",
    ],
  ];

  const metaColWs = [35, 30, 30, 25, 30, 25]; // Column widths for metadata
  const metaLabelFont = { size: 7.5, name: "helvetica", bold: true };
  const metaValueFont = { size: 7.5, name: "helvetica" };

  for (const row of metadataData) {
    let x = margin;
    for (let i = 0; i < row.length; i += 2) {
      const label = row[i] || "";
      const value = row[i + 1] || "";
      const cellW = (metaColWs[i] + metaColWs[i + 1]) / 2;

      // Draw label
      doc.setFontSize(7);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...COLORS.primary);
      doc.text(label, x + 2, y + 3.5);

      // Draw value
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...COLORS.dark);
      doc.text(value, x + 2, y + 7);

      // Draw border
      doc.setDrawColor(...COLORS.border);
      doc.setLineWidth(0.3);
      doc.rect(x, y, cellW * 2, 8);

      x += cellW * 2;
    }
    y += 9;
  }

  y += 2;

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

  const colHeaders = [""];
  for (let i = 0; i < maxLL; i++) colHeaders.push(`LL ${i + 1}`);
  for (let i = 0; i < maxPL; i++) colHeaders.push(`PL ${i + 1}`);
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

    while (row.length < colHeaders.length) row.push("-");
    return row;
  });

  const firstColW = 38;
  const dataColW = (contentW - firstColW) / (colHeaders.length - 1);

  // Build column styles for consistent widths (matching XLSX structure)
  const columnStyles: Record<number, any> = {
    0: { cellWidth: firstColW, halign: "left", fontStyle: "bold", fontSize: 7 },
  };
  // Set equal widths for all data columns
  for (let i = 1; i < colHeaders.length; i++) {
    columnStyles[i] = { cellWidth: dataColW, halign: "center", fontSize: 6.5 };
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
      fontSize: 6.5,
      cellPadding: 2,
      halign: "center",
      lineWidth: 0.3,
      lineColor: COLORS.border,
    },
    bodyStyles: { fontSize: 6.5, cellPadding: 2, halign: "center", lineColor: COLORS.border, lineWidth: 0.3 },
    columnStyles,
    alternateRowStyles: { fillColor: COLORS.lightBg },
    margin: { left: margin, right: margin },
    styles: { overflow: "linebreak" as const, font: "helvetica" },
    didParseCell: (data: any) => {
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
  doc.rect(margin, y, contentW, 7, "FD");
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.primary);
  doc.text("PLASTIC LIMIT", margin + contentW * 0.55, y + 5);
  doc.setTextColor(...COLORS.dark);
  doc.text(fmt(record.results.plasticLimit), margin + contentW * 0.85, y + 5);
  y += 9;

  // ── Layout: Left side = charts, Right side = LS + Results + Classification ──
  // Use fixed proportions to match XLSX printed width ratios
  const leftW = contentW * 0.48;
  const rightW = contentW * 0.48;
  const rightX = margin + leftW + 4;
  const sectionStartY = y;

  // ── LEFT: Cone Graph ──
  const chartH = 48; // Fixed height for consistent aspect ratio
  drawConeGraph(doc, llTrials, record.results.liquidLimit, margin, y, leftW, chartH);

  // ── LEFT: Plasticity Chart below cone graph ──
  const plasticityChartH = 48; // Match cone graph height
  drawPlasticityChart(
    doc,
    record.results.liquidLimit,
    record.results.plasticityIndex,
    margin,
    y + chartH + 3,
    leftW,
    plasticityChartH,
  );

  // ── RIGHT: Linear Shrinkage ──
  let ry = sectionStartY;
  const slTrial = slTrials[0];
  const lsData = [
    ["Initial length (mm)", fmt(slTrial ? num(slTrial.initialLength) ?? 140 : 140)],
    ["Final length (mm)", fmt(slTrial ? num(slTrial.finalLength) : null)],
    ["Shrinkage (%)", fmt(record.results.linearShrinkage)],
  ];

  doc.setFillColor(...COLORS.primary);
  doc.roundedRect(rightX, ry, rightW, 7, 1, 1, "F");
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  doc.text("LINEAR SHRINKAGE", rightX + rightW / 2, ry + 5, { align: "center" });
  ry += 8;

  doc.setFontSize(7);
  for (const [label, value] of lsData) {
    doc.setDrawColor(...COLORS.border);
    doc.rect(rightX, ry, rightW * 0.7, 6);
    doc.rect(rightX + rightW * 0.7, ry, rightW * 0.3, 6);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...COLORS.dark);
    doc.text(label, rightX + 2, ry + 4.5);
    doc.setFont("helvetica", "normal");
    doc.text(value, rightX + rightW * 0.7 + 2, ry + 4.5);
    ry += 6;
  }
  ry += 4;

  // ── RIGHT: Results Summary ──
  const summaryData: [string, string][] = [
    ["LIQUID LIMIT (%)", fmt(record.results.liquidLimit)],
    ["PLASTIC LIMIT (%)", fmt(record.results.plasticLimit)],
    ["PLASTICITY INDEX (%)", fmt(record.results.plasticityIndex)],
    ["Passing 425 µm (%)", fmt(num(record.passing425um))],
    ["MODULUS OF PLASTICITY", fmt(record.results.modulusOfPlasticity)],
    ["LINEAR SHRINKAGE (%)", fmt(record.results.linearShrinkage)],
  ];

  doc.setFillColor(...COLORS.primary);
  doc.roundedRect(rightX, ry, rightW, 7, 1, 1, "F");
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  doc.text("RESULTS SUMMARY", rightX + rightW / 2, ry + 5, { align: "center" });
  ry += 8;

  doc.setFontSize(7);
  for (const [label, value] of summaryData) {
    doc.setDrawColor(...COLORS.border);
    doc.rect(rightX, ry, rightW * 0.7, 6);
    doc.rect(rightX + rightW * 0.7, ry, rightW * 0.3, 6);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...COLORS.dark);
    doc.text(label, rightX + 2, ry + 4.5);
    doc.setFont("helvetica", "normal");
    doc.text(value, rightX + rightW * 0.7 + 2, ry + 4.5);
    ry += 6;
  }
  ry += 4;

  // ── RIGHT: Soil Classification ──
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
  doc.rect(rightX, ry, rightW, 7, "F");
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.primary);
  doc.text("SOIL CLASSIFICATION", rightX + rightW / 2, ry + 5, { align: "center" });
  ry += 8;

  doc.setFontSize(7);
  // USCS row
  doc.setDrawColor(...COLORS.border);
  doc.rect(rightX, ry, rightW * 0.2, 6);
  doc.rect(rightX + rightW * 0.2, ry, rightW * 0.6, 6);
  doc.rect(rightX + rightW * 0.8, ry, rightW * 0.2, 6);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.primary);
  doc.text("USCS", rightX + 2, ry + 4.5);
  doc.setTextColor(...COLORS.dark);
  doc.setFont("helvetica", "normal");
  doc.text(uscsDesc, rightX + rightW * 0.2 + 2, ry + 4.5);
  doc.setFont("helvetica", "bold");
  doc.text(uscsCode, rightX + rightW * 0.8 + 2, ry + 4.5);
  ry += 6;

  // AASHTO row
  doc.rect(rightX, ry, rightW * 0.2, 6);
  doc.rect(rightX + rightW * 0.2, ry, rightW * 0.8, 6);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.primary);
  doc.text("AASHTO", rightX + 2, ry + 4.5);
  ry += 10;

  // ── Footer: Tested by / Date / Checked by ──
  const footerY = Math.max(ry, sectionStartY + chartH + plasticityChartH + 10) + 4;
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.dark);
  doc.text(`Tested by: ${record.testedBy || "____________"}`, margin, footerY);
  doc.text(`Date reported: ${projectState.dateReported || "____________"}`, margin + contentW * 0.35, footerY);
  doc.text(`Checked by: ${projectState.checkedBy || "____________"}`, margin + contentW * 0.7, footerY);
}

export const generateAtterbergPDF = async (options: AtterbergPDFOptions) => {
  // Fetch images in parallel with PDF setup
  const images = await fetchAdminImagesAsBase64();

  const doc = new jsPDF();

  for (let i = 0; i < options.records.length; i++) {
    if (i > 0) doc.addPage();
    drawRecordPage(doc, options.records[i], options, images);
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
