import PDFDocument from "pdfkit";
import type { Response } from "express";

type LancamentoPDF = {
  descricao: string;
  data_lancamento: string;
  valor: number;
  tipo_lancamento: string;
  situacao: string;
};

const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const dateFmt = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" });

export function streamLancamentosPDF(res: Response, lancamentos: LancamentoPDF[]): void {
  const doc = new PDFDocument({ margin: 50, size: "A4" });

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", "attachment; filename=lancamentos.pdf");

  doc.pipe(res);

  // ── Header ──────────────────────────────────────────────────────────────
  doc
    .fontSize(20)
    .font("Helvetica-Bold")
    .text("Registro de Despesas e Receitas", { align: "center" });

  doc
    .fontSize(10)
    .font("Helvetica")
    .fillColor("#64748b")
    .text(`Gerado em: ${new Intl.DateTimeFormat("pt-BR", { dateStyle: "long", timeStyle: "short" }).format(new Date())}`, {
      align: "center",
    });

  doc.moveDown(1.5);

  // ── Summary ─────────────────────────────────────────────────────────────
  const totalReceitas = lancamentos
    .filter((l) => l.tipo_lancamento === "Receita")
    .reduce((s, l) => s + l.valor, 0);
  const totalDespesas = lancamentos
    .filter((l) => l.tipo_lancamento === "Despesa")
    .reduce((s, l) => s + l.valor, 0);
  const saldo = totalReceitas - totalDespesas;

  doc.fontSize(11).font("Helvetica-Bold").fillColor("#1e293b");
  doc.text(`Total de lançamentos: ${lancamentos.length}`, { continued: false });
  doc
    .fillColor("#059669")
    .text(`Receitas: ${money.format(totalReceitas)}`, { continued: true })
    .fillColor("#1e293b")
    .text("   |   ", { continued: true })
    .fillColor("#dc2626")
    .text(`Despesas: ${money.format(totalDespesas)}`, { continued: true })
    .fillColor("#1e293b")
    .text("   |   ", { continued: true })
    .fillColor(saldo >= 0 ? "#059669" : "#dc2626")
    .text(`Saldo: ${money.format(saldo)}`);

  doc.fillColor("#1e293b").moveDown(1);

  // ── Table ────────────────────────────────────────────────────────────────
  const tableTop = doc.y;
  const colWidths = [180, 70, 85, 75, 80]; // Descrição, Data, Valor, Tipo, Situação
  const colX = [50];
  for (let i = 1; i < colWidths.length; i++) {
    colX.push(colX[i - 1] + colWidths[i - 1]);
  }
  const rowHeight = 22;
  const headers = ["Descrição", "Data", "Valor", "Tipo", "Situação"];

  // Header row background
  doc.rect(50, tableTop, colWidths.reduce((a, b) => a + b, 0), rowHeight).fill("#f1f5f9");

  doc.font("Helvetica-Bold").fontSize(9).fillColor("#475569");
  headers.forEach((h, i) => {
    const align = i === 2 ? "right" : "left";
    const x = i === 2 ? colX[i] : colX[i] + 4;
    const width = i === 2 ? colWidths[i] - 4 : colWidths[i] - 4;
    doc.text(h, x, tableTop + 7, { width, align });
  });

  let y = tableTop + rowHeight;

  for (const [idx, l] of lancamentos.entries()) {
    if (y + rowHeight > doc.page.height - doc.page.margins.bottom) {
      doc.addPage();
      y = doc.page.margins.top;
    }

    if (idx % 2 === 0) {
      doc.rect(50, y, colWidths.reduce((a, b) => a + b, 0), rowHeight).fill("#f8fafc");
    }

    doc.font("Helvetica").fontSize(8).fillColor("#1e293b");

    const isReceita = l.tipo_lancamento === "Receita";
    const date = dateFmt.format(new Date(l.data_lancamento));

    doc.text(l.descricao, colX[0] + 4, y + 7, { width: colWidths[0] - 8, ellipsis: true });
    doc.text(date, colX[1] + 4, y + 7, { width: colWidths[1] - 8 });
    doc.fillColor(isReceita ? "#059669" : "#dc2626");
    doc.text(money.format(l.valor), colX[2], y + 7, { width: colWidths[2] - 4, align: "right" });
    doc.fillColor(isReceita ? "#059669" : "#dc2626");
    doc.text(l.tipo_lancamento, colX[3] + 4, y + 7, { width: colWidths[3] - 8 });
    doc.fillColor("#1e293b");
    doc.text(l.situacao, colX[4] + 4, y + 7, { width: colWidths[4] - 8 });

    // Bottom border
    doc.moveTo(50, y + rowHeight).lineTo(50 + colWidths.reduce((a, b) => a + b, 0), y + rowHeight).strokeColor("#e2e8f0").lineWidth(0.5).stroke();

    y += rowHeight;
  }

  doc.end();
}
