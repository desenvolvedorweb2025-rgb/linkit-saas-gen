import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, FileDown, Trash2, CheckCircle2, Receipt } from "lucide-react";
import { toast } from "sonner";
import jsPDF from "jspdf";
import { generateReceiptPDF } from "@/lib/pdf";

export const Route = createFileRoute("/_authenticated/orcamentos")({
  component: QuotesPage,
});

function generatePDF(quote: {
  description: string;
  amount: number;
  created_at: string;
  client_name?: string | null;
  professional_name?: string | null;
}) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  // Header bar
  doc.setFillColor(59, 130, 246);
  doc.rect(0, 0, pageWidth, 28, "F");
  doc.setTextColor(255);
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("ORÇAMENTO", 14, 18);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("ServiçoPro", pageWidth - 14, 18, { align: "right" });

  // Body
  doc.setTextColor(33);
  let y = 44;
  doc.setFontSize(10);
  doc.text(`Data: ${new Date(quote.created_at).toLocaleDateString("pt-BR")}`, 14, y);
  y += 8;
  if (quote.professional_name) {
    doc.text(`Prestador: ${quote.professional_name}`, 14, y);
    y += 8;
  }
  doc.text(`Cliente: ${quote.client_name || "—"}`, 14, y);
  y += 12;

  doc.setFont("helvetica", "bold");
  doc.text("Descrição do serviço", 14, y);
  y += 6;
  doc.setFont("helvetica", "normal");
  const lines = doc.splitTextToSize(quote.description, pageWidth - 28);
  doc.text(lines, 14, y);
  y += lines.length * 6 + 10;

  // Total box
  doc.setDrawColor(59, 130, 246);
  doc.setLineWidth(0.5);
  doc.rect(14, y, pageWidth - 28, 18);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("VALOR TOTAL", 18, y + 11);
  doc.setFontSize(14);
  doc.text(
    `R$ ${quote.amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
    pageWidth - 18,
    y + 11,
    { align: "right" }
  );

  // Footer
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(120);
  doc.text("Documento gerado por ServiçoPro", pageWidth / 2, 285, { align: "center" });

  doc.save(`orcamento-${Date.now()}.pdf`);
}

function QuotesPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [clientId, setClientId] = useState<string>("");

  const { data: quotes = [], isLoading } = useQuery({
    queryKey: ["quotes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quotes")
        .select("*, clients(name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: clients = [] } = useQuery({
    queryKey: ["clients-list"],
    queryFn: async () => {
      const { data, error } = await supabase.from("clients").select("id, name").order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: profile } = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data } = await supabase.from("profiles").select("full_name, profession, phone").eq("id", user.id).single();
      return data;
    },
  });

  const create = useMutation({
    mutationFn: async (values: { description: string; amount: number; client_id: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");
      const { error } = await supabase.from("quotes").insert({
        user_id: user.id,
        client_id: values.client_id || null,
        description: values.description,
        amount: values.amount,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Orçamento criado");
      qc.invalidateQueries({ queryKey: ["quotes"] });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
      setOpen(false);
      setClientId("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("quotes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["quotes"] });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
    },
  });

  const markPaid = useMutation({
    mutationFn: async (q: any) => {
      const paid_at = new Date().toISOString();
      const { error } = await supabase
        .from("quotes")
        .update({ paid_at } as any)
        .eq("id", q.id);
      if (error) throw error;
      return { ...q, paid_at };
    },
    onSuccess: (q: any) => {
      toast.success("Orçamento marcado como pago");
      qc.invalidateQueries({ queryKey: ["quotes"] });
      qc.invalidateQueries({ queryKey: ["quotes-paid"] });
      generateReceiptPDF({
        client_name: q.clients?.name || "—",
        service: q.description,
        amount: Number(q.amount),
        paid_at: q.paid_at,
        company: profile || {},
      });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const description = String(fd.get("description") || "").trim().slice(0, 1000);
    const amount = Number(fd.get("amount") || 0);
    if (!description) return toast.error("Descrição obrigatória");
    if (isNaN(amount) || amount < 0) return toast.error("Valor inválido");
    create.mutate({ description, amount, client_id: clientId });
  };

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Orçamentos</h1>
          <p className="mt-1 text-sm text-muted-foreground">Crie e gere PDFs em um clique.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4" /> Novo orçamento</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Novo orçamento</DialogTitle></DialogHeader>
            <form onSubmit={onSubmit} className="space-y-3">
              <div className="space-y-1.5">
                <Label>Cliente</Label>
                <Select value={clientId} onValueChange={setClientId}>
                  <SelectTrigger><SelectValue placeholder="Selecione um cliente" /></SelectTrigger>
                  <SelectContent>
                    {clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="description">Descrição</Label>
                <Textarea id="description" name="description" maxLength={1000} rows={4} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="amount">Valor (R$)</Label>
                <Input id="amount" name="amount" type="number" step="0.01" min="0" required />
              </div>
              <Button type="submit" className="w-full" disabled={create.isPending}>
                {create.isPending ? "Salvando..." : "Salvar"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="mt-6 overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-card)]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-32"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">Carregando...</TableCell></TableRow>
            ) : quotes.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">Nenhum orçamento.</TableCell></TableRow>
            ) : (
              quotes.map((q: any) => (
                <TableRow key={q.id}>
                  <TableCell>{new Date(q.created_at).toLocaleDateString("pt-BR")}</TableCell>
                  <TableCell>{q.clients?.name || "—"}</TableCell>
                  <TableCell className="max-w-xs truncate">{q.description}</TableCell>
                  <TableCell className="text-right font-medium">
                    R$ {Number(q.amount).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell>
                    {q.paid_at ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                        <CheckCircle2 className="h-3 w-3" /> Pago
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                        Pendente
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      {q.paid_at ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Baixar recibo"
                          onClick={() =>
                            generateReceiptPDF({
                              client_name: q.clients?.name || "—",
                              service: q.description,
                              amount: Number(q.amount),
                              paid_at: q.paid_at,
                              company: profile || {},
                            })
                          }
                        >
                          <Receipt className="h-4 w-4" />
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Marcar como pago"
                          onClick={() => markPaid.mutate(q)}
                        >
                          <CheckCircle2 className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Baixar orçamento"
                        onClick={() =>
                          generatePDF({
                            description: q.description,
                            amount: Number(q.amount),
                            created_at: q.created_at,
                            client_name: q.clients?.name,
                            professional_name: profile?.full_name,
                          })
                        }
                      >
                        <FileDown className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => remove.mutate(q.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
