import jsPDF from "jspdf";

type Company = {
  full_name?: string | null;
  profession?: string | null;
  phone?: string | null;
};

function header(doc: jsPDF, title: string) {
  const pageWidth = doc.internal.pageSize.getWidth();
  doc.setFillColor(59, 130, 246);
  doc.rect(0, 0, pageWidth, 28, "F");
  doc.setTextColor(255);
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text(title, 14, 18);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("ServiçoPro", pageWidth - 14, 18, { align: "right" });
  doc.setTextColor(33);
}

function footer(doc: jsPDF) {
  const pageWidth = doc.internal.pageSize.getWidth();
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(120);
  doc.text("Documento gerado por ServiçoPro", pageWidth / 2, 285, { align: "center" });
}

function money(n: number) {
  return `R$ ${Number(n).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
}

export function generateReceiptPDF(input: {
  client_name: string;
  service: string;
  amount: number;
  paid_at: string;
  company: Company;
}) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  header(doc, "RECIBO");

  let y = 44;
  doc.setFontSize(10);
  doc.text(`Data de pagamento: ${new Date(input.paid_at).toLocaleDateString("pt-BR")}`, 14, y);
  y += 12;

  doc.setFont("helvetica", "bold");
  doc.text("Prestador", 14, y);
  doc.setFont("helvetica", "normal");
  y += 6;
  doc.text(input.company.full_name || "—", 14, y);
  y += 5;
  if (input.company.profession) { doc.text(input.company.profession, 14, y); y += 5; }
  if (input.company.phone) { doc.text(input.company.phone, 14, y); y += 5; }
  y += 6;

  doc.setFont("helvetica", "bold");
  doc.text("Cliente", 14, y);
  doc.setFont("helvetica", "normal");
  y += 6;
  doc.text(input.client_name, 14, y);
  y += 12;

  doc.setFont("helvetica", "bold");
  doc.text("Serviço prestado", 14, y);
  y += 6;
  doc.setFont("helvetica", "normal");
  const lines = doc.splitTextToSize(input.service, pageWidth - 28);
  doc.text(lines, 14, y);
  y += lines.length * 6 + 10;

  doc.setDrawColor(59, 130, 246);
  doc.setLineWidth(0.5);
  doc.rect(14, y, pageWidth - 28, 20);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("VALOR PAGO", 18, y + 12);
  doc.setFontSize(14);
  doc.text(money(input.amount), pageWidth - 18, y + 12, { align: "right" });
  y += 32;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  const decl = `Recebi de ${input.client_name} a quantia de ${money(input.amount)} referente ao serviço descrito acima, dando plena e total quitação.`;
  const declLines = doc.splitTextToSize(decl, pageWidth - 28);
  doc.text(declLines, 14, y);

  footer(doc);
  doc.save(`recibo-${Date.now()}.pdf`);
}

export function generateContractPDF(input: {
  client_name: string;
  service: string;
  amount: number;
  service_date?: string | null;
  signature_name?: string | null;
  signed_at?: string | null;
  company: Company;
}) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  header(doc, "CONTRATO");

  let y = 44;
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("CONTRATO DE PRESTAÇÃO DE SERVIÇO", pageWidth / 2, y, { align: "center" });
  y += 10;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  const intro = `Pelo presente instrumento particular, de um lado ${input.company.full_name || "—"}${input.company.profession ? ` (${input.company.profession})` : ""}, doravante denominado CONTRATADO, e de outro lado ${input.client_name}, doravante denominado CONTRATANTE, têm entre si justo e contratado o seguinte:`;
  const introLines = doc.splitTextToSize(intro, pageWidth - 28);
  doc.text(introLines, 14, y);
  y += introLines.length * 5 + 6;

  doc.setFont("helvetica", "bold");
  doc.text("Cláusula 1ª — Objeto", 14, y);
  y += 6;
  doc.setFont("helvetica", "normal");
  const obj = doc.splitTextToSize(
    `O CONTRATADO se obriga a prestar ao CONTRATANTE o seguinte serviço: ${input.service}.`,
    pageWidth - 28
  );
  doc.text(obj, 14, y);
  y += obj.length * 5 + 4;

  doc.setFont("helvetica", "bold");
  doc.text("Cláusula 2ª — Valor", 14, y);
  y += 6;
  doc.setFont("helvetica", "normal");
  const val = doc.splitTextToSize(
    `Pela prestação dos serviços, o CONTRATANTE pagará ao CONTRATADO o valor total de ${money(input.amount)}.`,
    pageWidth - 28
  );
  doc.text(val, 14, y);
  y += val.length * 5 + 4;

  doc.setFont("helvetica", "bold");
  doc.text("Cláusula 3ª — Prazo", 14, y);
  y += 6;
  doc.setFont("helvetica", "normal");
  const dateStr = input.service_date
    ? new Date(input.service_date).toLocaleDateString("pt-BR")
    : "a combinar entre as partes";
  const prazo = doc.splitTextToSize(
    `O serviço será executado na data de ${dateStr}.`,
    pageWidth - 28
  );
  doc.text(prazo, 14, y);
  y += prazo.length * 5 + 4;

  doc.setFont("helvetica", "bold");
  doc.text("Cláusula 4ª — Foro", 14, y);
  y += 6;
  doc.setFont("helvetica", "normal");
  const foro = doc.splitTextToSize(
    "As partes elegem o foro da comarca do CONTRATADO para dirimir eventuais dúvidas oriundas do presente contrato.",
    pageWidth - 28
  );
  doc.text(foro, 14, y);
  y += foro.length * 5 + 14;

  const today = input.signed_at
    ? new Date(input.signed_at).toLocaleDateString("pt-BR")
    : new Date().toLocaleDateString("pt-BR");
  doc.text(`Local e data: ______________________, ${today}`, 14, y);
  y += 20;

  // signatures
  doc.line(20, y, 90, y);
  doc.line(pageWidth - 90, y, pageWidth - 20, y);
  y += 5;
  doc.setFontSize(9);
  doc.text("CONTRATADO", 55, y, { align: "center" });
  doc.text("CONTRATANTE", pageWidth - 55, y, { align: "center" });
  y += 4;
  doc.text(input.company.full_name || "—", 55, y, { align: "center" });
  doc.text(input.signature_name || input.client_name, pageWidth - 55, y, { align: "center" });

  if (input.signature_name && input.signed_at) {
    y += 10;
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    doc.setTextColor(90);
    doc.text(
      `Assinado eletronicamente por ${input.signature_name} em ${new Date(input.signed_at).toLocaleString("pt-BR")}.`,
      pageWidth / 2,
      y,
      { align: "center" }
    );
  }

  footer(doc);
  doc.save(`contrato-${Date.now()}.pdf`);
}
