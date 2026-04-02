import { jsPDF } from "jspdf";
import "jspdf-autotable";

interface PDFData {
  title: string;
  projectName?: string;
  clientName?: string;
  date?: string;
  fields?: { label: string; value: string }[];
  tables?: {
    title?: string;
    headers: string[];
    rows: string[][];
  }[];
}

export const generateTestPDF = (data: PDFData) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 20;

  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("Engineering Material Testing", pageWidth / 2, y, { align: "center" });
  y += 10;

  doc.setFontSize(14);
  doc.text(data.title, pageWidth / 2, y, { align: "center" });
  y += 10;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setDrawColor(200);
  doc.line(14, y, pageWidth - 14, y);
  y += 7;

  if (data.projectName) {
    doc.text(`Project: ${data.projectName}`, 14, y);
    y += 5;
  }
  if (data.clientName) {
    doc.text(`Client: ${data.clientName}`, 14, y);
    y += 5;
  }
  doc.text(`Date: ${data.date || new Date().toISOString().split("T")[0]}`, 14, y);
  y += 10;

  if (data.fields && data.fields.length > 0) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("Results", 14, y);
    y += 6;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    for (const field of data.fields) {
      doc.text(`${field.label}: ${field.value || "-"}`, 14, y);
      y += 5;
    }
    y += 5;
  }

  if (data.tables) {
    for (const table of data.tables) {
      if (table.title) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.text(table.title, 14, y);
        y += 6;
      }

      (doc as any).autoTable({
        startY: y,
        head: [table.headers],
        body: table.rows,
        theme: "grid",
        headStyles: {
          fillColor: [41, 98, 163],
          textColor: 255,
          fontStyle: "bold",
          fontSize: 9,
        },
        bodyStyles: { fontSize: 9 },
        margin: { left: 14, right: 14 },
        styles: { cellPadding: 3 },
      });

      y = (doc as any).lastAutoTable.finalY + 10;
    }
  }

  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(`Page ${i} of ${pageCount}`, pageWidth / 2, doc.internal.pageSize.getHeight() - 10, { align: "center" });
  }

  doc.save(`${data.title.replace(/\s+/g, "_")}_Report.pdf`);
};
