import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

// ============================================
// CSV EXPORT FUNCTIONS
// ============================================

const BRAND_NAME = "TurboTap";
const BRAND_TAGLINE = "Kassensystem für Lichterpaddeln";

function getTimestamp(): string {
  return new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
}

function buildCSVHeader(title: string, filters: Record<string, string>): string[] {
  const lines: string[] = [];
  lines.push(`# ${BRAND_NAME} - ${title}`);
  lines.push(`# ${BRAND_TAGLINE}`);
  lines.push(`# Exportiert am: ${new Date().toLocaleString("de-DE")}`);
  lines.push(`#`);
  lines.push(`# Filter:`);
  
  const filterEntries = Object.entries(filters).filter(([_, v]) => v && v !== "");
  if (filterEntries.length === 0) {
    lines.push(`#   Keine Filter aktiv (alle Daten)`);
  } else {
    filterEntries.forEach(([key, value]) => {
      lines.push(`#   ${key}: ${value}`);
    });
  }
  lines.push(`#`);
  lines.push(`# ============================================`);
  lines.push(``);
  return lines;
}

export function exportOrdersCSV(
  orders: any[],
  filters: Record<string, string>
): void {
  const header = buildCSVHeader("Bestellungs-Export", filters);
  
  const csvHeader = "Bestell-ID;Datum;Uhrzeit;Verkaufsstelle;Mitarbeiter;Typ;Artikel;Menge;Einzelpreis;Gesamtpreis;Pfand";
  const rows: string[] = [];
  
  orders.forEach((order) => {
    const date = new Date(order.createdAt);
    const dateStr = date.toLocaleDateString("de-DE");
    const timeStr = date.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
    
    order.items.forEach((item: any) => {
      rows.push([
        order.id,
        dateStr,
        timeStr,
        order.salesPointName || `Stelle ${order.salesPointId}`,
        order.cashierName || "unbekannt",
        "Getränk",
        item.drinkName,
        item.quantity,
        item.unitPriceGross.toFixed(2),
        item.totalPriceGross.toFixed(2),
        item.totalDeposit?.toFixed(2) || "0.00",
      ].join(";"));
    });
    
    order.foodItems.forEach((item: any) => {
      rows.push([
        order.id,
        dateStr,
        timeStr,
        order.salesPointName || `Stelle ${order.salesPointId}`,
        order.cashierName || "unbekannt",
        "Speise",
        item.foodName,
        item.quantity,
        item.unitPriceGross.toFixed(2),
        item.totalPriceGross.toFixed(2),
        "0.00",
      ].join(";"));
    });
  });
  
  const csvContent = [...header, csvHeader, ...rows].join("\n");
  downloadFile(csvContent, `turbotap-bestellungen-${getTimestamp()}.csv`, "text/csv;charset=utf-8;");
}

export function exportDrinksCSV(
  drinkSummary: any[],
  filters: Record<string, string>
): void {
  const header = buildCSVHeader("Getränke-Zusammenfassung", filters);
  
  const csvHeader = "Getränk;Menge;Umsatz Brutto (€);Umsatz Netto (€);Pfand (€);MwSt (%)";
  const rows = drinkSummary.map((d) => {
    const taxRate = d.taxRate ?? 19;
    const net = +(d.totalGross / (1 + taxRate / 100)).toFixed(2);
    return [
      d.drinkName,
      d.totalQuantity,
      d.totalGross.toFixed(2),
      net.toFixed(2),
      (d.totalDeposit || 0).toFixed(2),
      taxRate,
    ].join(";");
  });
  
  const csvContent = [...header, csvHeader, ...rows].join("\n");
  downloadFile(csvContent, `turbotap-getraenke-${getTimestamp()}.csv`, "text/csv;charset=utf-8;");
}

export function exportFoodsCSV(
  foodSummary: any[],
  filters: Record<string, string>
): void {
  const header = buildCSVHeader("Speisen-Zusammenfassung", filters);
  
  const csvHeader = "Speise;Menge;Umsatz Brutto (€);Umsatz Netto (€);MwSt (%)";
  const rows = foodSummary.map((f) => {
    const taxRate = f.taxRate ?? 19;
    const net = +(f.totalGross / (1 + taxRate / 100)).toFixed(2);
    return [
      f.foodName,
      f.totalQuantity,
      f.totalGross.toFixed(2),
      net.toFixed(2),
      taxRate,
    ].join(";");
  });
  
  const csvContent = [...header, csvHeader, ...rows].join("\n");
  downloadFile(csvContent, `turbotap-speisen-${getTimestamp()}.csv`, "text/csv;charset=utf-8;");
}

function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob(["\ufeff" + content], { type: mimeType });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// ============================================
// PDF EXPORT FUNCTIONS
// ============================================

const BRAND_COLORS = {
  primary: [251, 191, 36] as [number, number, number],    // Amber
  dark: [17, 24, 39] as [number, number, number],          // Gray-900
  medium: [55, 65, 81] as [number, number, number],        // Gray-700
  light: [156, 163, 175] as [number, number, number],      // Gray-400
  green: [34, 197, 94] as [number, number, number],        // Green
  blue: [59, 130, 246] as [number, number, number],        // Blue
  white: [255, 255, 255] as [number, number, number],
};

function drawPDFHeader(doc: jsPDF, title: string, subtitle: string): void {
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Header Hintergrund
  doc.setFillColor(...BRAND_COLORS.dark);
  doc.rect(0, 0, pageWidth, 35, "F");
  
  // Branding-Streifen
  doc.setFillColor(...BRAND_COLORS.primary);
  doc.rect(0, 33, pageWidth, 2, "F");
  
  // Titel
  doc.setTextColor(...BRAND_COLORS.white);
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text(BRAND_NAME, 14, 15);
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...BRAND_COLORS.light);
  doc.text(BRAND_TAGLINE, 14, 22);
  
  // Bericht-Titel rechts
  doc.setTextColor(...BRAND_COLORS.primary);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text(title, pageWidth - 14, 15, { align: "right" });
  
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...BRAND_COLORS.light);
  doc.text(subtitle, pageWidth - 14, 22, { align: "right" });
}

function drawPDFfilters(doc: jsPDF, filters: Record<string, string>, startY: number): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  const activeFilters = Object.entries(filters).filter(([_, v]) => v && v !== "");
  
  if (activeFilters.length === 0) return startY;
  
  doc.setFillColor(250, 250, 250);
  doc.roundedRect(14, startY, pageWidth - 28, 8 + activeFilters.length * 6, 2, 2, "F");
  
  doc.setTextColor(...BRAND_COLORS.medium);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("Aktive Filter:", 18, startY + 5);
  
  doc.setFont("helvetica", "normal");
  activeFilters.forEach(([key, value], index) => {
    doc.text(`${key}: ${value}`, 18, startY + 12 + index * 6);
  });
  
  return startY + 12 + activeFilters.length * 6 + 5;
}

function drawPDFFooter(doc: jsPDF): void {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const pageCount = doc.getNumberOfPages();
  
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(...BRAND_COLORS.light);
    doc.text(`${BRAND_NAME} · ${BRAND_TAGLINE}`, 14, pageHeight - 8);
    doc.text(`Seite ${i} von ${pageCount}`, pageWidth - 14, pageHeight - 8, { align: "right" });
    doc.text(`Erstellt: ${new Date().toLocaleString("de-DE")}`, pageWidth / 2, pageHeight - 8, { align: "center" });
  }
}

export function exportPDFReport(
  data: {
    totals: any;
    drinkSummary: any[];
    foodSummary: any[];
    salesPointSummary: any[];
    cashierSummary: any[];
    dailySummary: any[];
    orders: any[];
  },
  filters: Record<string, string>
): void {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Header
  const filterDate = filters["Datum"] || "Gesamter Zeitraum";
  drawPDFHeader(doc, "Verkaufsbericht", filterDate);
  
  let currentY = 45;
  
  // Filter anzeigen
  currentY = drawPDFfilters(doc, filters, currentY);
  
  // KPI Boxen
  const kpis = [
    { label: "Bestellungen", value: data.totals?.totalOrders || 0, color: BRAND_COLORS.blue },
    { label: "Umsatz (brutto)", value: `${(data.totals?.totalRevenue || 0).toFixed(2)} €`, color: BRAND_COLORS.green },
    { label: "Pfand eingenommen", value: `${(data.totals?.totalDepositsCharged || 0).toFixed(2)} €`, color: BRAND_COLORS.primary },
    { label: "Pfand-Saldo", value: `${(data.totals?.netDeposits || 0).toFixed(2)} €`, color: BRAND_COLORS.medium },
  ];
  
  const boxWidth = (pageWidth - 28 - 12) / 4;
  kpis.forEach((kpi, index) => {
    const x = 14 + index * (boxWidth + 4);
    doc.setFillColor(249, 250, 251);
    doc.roundedRect(x, currentY, boxWidth, 22, 2, 2, "F");
    doc.setDrawColor(...kpi.color);
    doc.setLineWidth(0.5);
    doc.roundedRect(x, currentY, boxWidth, 22, 2, 2, "S");
    
    doc.setTextColor(...BRAND_COLORS.light);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text(kpi.label, x + boxWidth / 2, currentY + 7, { align: "center" });
    
    doc.setTextColor(...kpi.color);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text(String(kpi.value), x + boxWidth / 2, currentY + 16, { align: "center" });
  });
  
  currentY += 30;
  
  // Getränke-Tabelle
  doc.setTextColor(...BRAND_COLORS.dark);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("🍺 Top Getränke", 14, currentY);
  
  autoTable(doc, {
    startY: currentY + 3,
    head: [["Getränk", "Menge", "Umsatz (brutto)", "Umsatz (netto)", "Pfand", "MwSt"]],
    body: data.drinkSummary.map((d) => {
      const taxRate = d.taxRate ?? 19;
      const net = (d.totalGross / (1 + taxRate / 100)).toFixed(2);
      return [
        d.drinkName,
        String(d.totalQuantity),
        `${d.totalGross.toFixed(2)} €`,
        `${net} €`,
        `${(d.totalDeposit || 0).toFixed(2)} €`,
        `${taxRate}%`,
      ];
    }),
    theme: "grid",
    headStyles: { fillColor: BRAND_COLORS.primary, textColor: BRAND_COLORS.dark, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [249, 250, 251] },
    styles: { fontSize: 9, cellPadding: 3 },
    columnStyles: {
      1: { halign: "right" },
      2: { halign: "right" },
      3: { halign: "right" },
      4: { halign: "right" },
      5: { halign: "right" },
    },
  });
  
  currentY = (doc as any).lastAutoTable.finalY + 10;
  
  // Speisen-Tabelle
  doc.setTextColor(...BRAND_COLORS.dark);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("🍔 Top Speisen", 14, currentY);
  
  autoTable(doc, {
    startY: currentY + 3,
    head: [["Speise", "Menge", "Umsatz (brutto)", "Umsatz (netto)", "MwSt"]],
    body: data.foodSummary.map((f) => {
      const taxRate = f.taxRate ?? 19;
      const net = (f.totalGross / (1 + taxRate / 100)).toFixed(2);
      return [
        f.foodName,
        String(f.totalQuantity),
        `${f.totalGross.toFixed(2)} €`,
        `${net} €`,
        `${taxRate}%`,
      ];
    }),
    theme: "grid",
    headStyles: { fillColor: BRAND_COLORS.primary, textColor: BRAND_COLORS.dark, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [249, 250, 251] },
    styles: { fontSize: 9, cellPadding: 3 },
    columnStyles: {
      1: { halign: "right" },
      2: { halign: "right" },
      3: { halign: "right" },
      4: { halign: "right" },
    },
  });
  
  currentY = (doc as any).lastAutoTable.finalY + 10;
  
  // Verkaufsstellen-Tabelle
  doc.setTextColor(...BRAND_COLORS.dark);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("🏪 Umsatz nach Verkaufsstelle", 14, currentY);
  
  autoTable(doc, {
    startY: currentY + 3,
    head: [["Verkaufsstelle", "Bestellungen", "Umsatz"]],
    body: data.salesPointSummary.map((sp) => [
      sp.salesPointName || `Stelle ${sp.salesPointId}`,
      String(sp.orderCount),
      `${sp.revenue.toFixed(2)} €`,
    ]),
    theme: "grid",
    headStyles: { fillColor: BRAND_COLORS.primary, textColor: BRAND_COLORS.dark, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [249, 250, 251] },
    styles: { fontSize: 9, cellPadding: 3 },
    columnStyles: {
      1: { halign: "right" },
      2: { halign: "right" },
    },
  });
  
  currentY = (doc as any).lastAutoTable.finalY + 10;
  
  // Mitarbeiter-Tabelle
  doc.setTextColor(...BRAND_COLORS.dark);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("👤 Umsatz nach Mitarbeiter", 14, currentY);
  
  autoTable(doc, {
    startY: currentY + 3,
    head: [["Mitarbeiter", "Bestellungen", "Umsatz"]],
    body: data.cashierSummary.map((c) => [
      c.cashierName || "(unbekannt)",
      String(c.orderCount),
      `${c.revenue.toFixed(2)} €`,
    ]),
    theme: "grid",
    headStyles: { fillColor: BRAND_COLORS.primary, textColor: BRAND_COLORS.dark, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [249, 250, 251] },
    styles: { fontSize: 9, cellPadding: 3 },
    columnStyles: {
      1: { halign: "right" },
      2: { halign: "right" },
    },
  });
  
  // Footer
  drawPDFFooter(doc);
  
  // Download
  doc.save(`turbotap-bericht-${getTimestamp()}.pdf`);
}
