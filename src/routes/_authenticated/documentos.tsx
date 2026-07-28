import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Trash2, Download, FileDown, PenLine } from "lucide-react";
import { toast } from "sonner";
import { generateContractPDF, generateReceiptPDF } from "@/lib/pdf";

export const Route = createFileRoute("/_authenticated/documentos")({
  component: DocumentsPage,
});

function DocumentsPage() {
  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="text-2xl font-semibold tracking-tight">Documentos</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Comprovantes, recibos e contratos.
      </p>

      <Tabs defaultValue="uploads" className="mt-6">
        <TabsList>
          <TabsTrigger value="uploads">Comprovantes</TabsTrigger>
          <TabsTrigger value="receipts">Recibos</TabsTrigger>
          <TabsTrigger value="contracts">Contratos</TabsTrigger>
        </TabsList>
        <TabsContent value="uploads" className="mt-4">
          <UploadsTab />
        </TabsContent>
        <TabsContent value="receipts" className="mt-4">
          <ReceiptsTab />
        </TabsContent>
        <TabsContent value="contracts" className="mt-4">
          <ContractsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function useClients() {
  return useQuery({
    queryKey: ["clients-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("id, name")
        .order("name");
      if (error) throw error;
      return data;
    },
  });
}

function useProfile() {
  return useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data } = await supabase
        .from("profiles")
        .select("full_name, profession, phone")
        .eq("id", user.id)
        .single();
      return data;
    },
  });
}

/* ------------------------------- Uploads ------------------------------- */

function UploadsTab() {
  const qc = useQueryClient();
  const { data: clients = [] } = useClients();
  const [open, setOpen] = useState(false);
  const [clientId, setClientId] = useState<string>("");
  const [filterClient, setFilterClient] = useState<string>("all");

  const { data: docs = [], isLoading } = useQuery({
    queryKey: ["documents-uploads"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("documents")
        .select("*, clients(name)")
        .eq("doc_type", "comprovante")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  const upload = useMutation({
    mutationFn: async (values: {
      file: File;
      description: string;
      client_id: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");
      if (values.file.size > 10 * 1024 * 1024)
        throw new Error("Arquivo maior que 10MB");
      const allowed = ["application/pdf", "image/jpeg", "image/png"];
      if (!allowed.includes(values.file.type))
        throw new Error("Formato não suportado (PDF, JPG ou PNG)");

      const path = `${user.id}/${Date.now()}-${values.file.name.replace(/[^\w.\-]+/g, "_")}`;
      const up = await supabase.storage
        .from("documents")
        .upload(path, values.file, { contentType: values.file.type });
      if (up.error) throw up.error;

      const { error } = await supabase.from("documents").insert({
        user_id: user.id,
        client_id: values.client_id || null,
        title: values.file.name,
        doc_type: "comprovante",
        description: values.description || null,
        file_path: path,
        mime_type: values.file.type,
        file_size: values.file.size,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Comprovante enviado");
      qc.invalidateQueries({ queryKey: ["documents-uploads"] });
      setOpen(false);
      setClientId("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (doc: any) => {
      if (doc.file_path) {
        await supabase.storage.from("documents").remove([doc.file_path]);
      }
      const { error } = await supabase.from("documents").delete().eq("id", doc.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["documents-uploads"] });
    },
  });

  const download = async (doc: any) => {
    if (!doc.file_path) return;
    const { data, error } = await supabase.storage
      .from("documents")
      .createSignedUrl(doc.file_path, 60);
    if (error) return toast.error(error.message);
    window.open(data.signedUrl, "_blank");
  };

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const file = fd.get("file") as File;
    if (!file || file.size === 0) return toast.error("Selecione um arquivo");
    if (!clientId) return toast.error("Selecione um cliente");
    const description = String(fd.get("description") || "").trim().slice(0, 200);
    upload.mutate({ file, description, client_id: clientId });
  };

  const filtered = docs.filter(
    (d) => filterClient === "all" || d.client_id === filterClient
  );

  return (
    <>
      <div className="flex items-center justify-between gap-4">
        <div className="w-64">
          <Select value={filterClient} onValueChange={setFilterClient}>
            <SelectTrigger>
              <SelectValue placeholder="Filtrar por cliente" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os clientes</SelectItem>
              {clients.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4" /> Novo comprovante
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Upload de comprovante</DialogTitle>
            </DialogHeader>
            <form onSubmit={onSubmit} className="space-y-3">
              <div className="space-y-1.5">
                <Label>Cliente</Label>
                <Select value={clientId} onValueChange={setClientId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="file">Arquivo (PDF, JPG, PNG · até 10MB)</Label>
                <Input
                  id="file"
                  name="file"
                  type="file"
                  accept="application/pdf,image/jpeg,image/png"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  name="description"
                  maxLength={200}
                  rows={2}
                  placeholder="Ex: comprovante de pagamento, contrato assinado"
                />
              </div>
              <Button
                type="submit"
                className="w-full"
                disabled={upload.isPending}
              >
                {upload.isPending ? "Enviando..." : "Enviar"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="mt-4 overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-card)]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cliente</TableHead>
              <TableHead>Arquivo</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead>Data</TableHead>
              <TableHead className="w-24"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  Carregando...
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  Nenhum comprovante.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((d) => (
                <TableRow key={d.id}>
                  <TableCell>{d.clients?.name || "—"}</TableCell>
                  <TableCell className="max-w-xs truncate">{d.title}</TableCell>
                  <TableCell className="max-w-xs truncate">
                    {d.description || "—"}
                  </TableCell>
                  <TableCell>
                    {new Date(d.created_at).toLocaleDateString("pt-BR")}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => download(d)}>
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => remove.mutate(d)}
                      >
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
    </>
  );
}

/* ------------------------------- Receipts ------------------------------- */

function ReceiptsTab() {
  const { data: profile } = useProfile();

  const { data: paidQuotes = [], isLoading } = useQuery({
    queryKey: ["quotes-paid"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quotes")
        .select("*, clients(name)")
        .not("paid_at", "is", null)
        .order("paid_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-card)]">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Data pagamento</TableHead>
            <TableHead>Cliente</TableHead>
            <TableHead>Serviço</TableHead>
            <TableHead className="text-right">Valor</TableHead>
            <TableHead className="w-24"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-muted-foreground">
                Carregando...
              </TableCell>
            </TableRow>
          ) : paidQuotes.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-muted-foreground">
                Marque um orçamento como pago para gerar recibos.
              </TableCell>
            </TableRow>
          ) : (
            paidQuotes.map((q) => (
              <TableRow key={q.id}>
                <TableCell>
                  {new Date(q.paid_at).toLocaleDateString("pt-BR")}
                </TableCell>
                <TableCell>{q.clients?.name || "—"}</TableCell>
                <TableCell className="max-w-xs truncate">{q.description}</TableCell>
                <TableCell className="text-right font-medium">
                  R$ {Number(q.amount).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </TableCell>
                <TableCell>
                  <div className="flex justify-end">
                    <Button
                      variant="ghost"
                      size="icon"
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
                      <FileDown className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

/* ------------------------------- Contracts ------------------------------- */

function ContractsTab() {
  const qc = useQueryClient();
  const { data: clients = [] } = useClients();
  const { data: profile } = useProfile();
  const [open, setOpen] = useState(false);
  const [clientId, setClientId] = useState<string>("");
  const [signOpen, setSignOpen] = useState<string | null>(null);

  const { data: contracts = [], isLoading } = useQuery({
    queryKey: ["contracts"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("contracts")
        .select("*, clients(name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  const create = useMutation({
    mutationFn: async (values: {
      client_id: string;
      service_description: string;
      amount: number;
      service_date: string | null;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");
      const { error } = await (supabase as any).from("contracts").insert({
        user_id: user.id,
        client_id: values.client_id || null,
        service_description: values.service_description,
        amount: values.amount,
        service_date: values.service_date,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Contrato criado");
      qc.invalidateQueries({ queryKey: ["contracts"] });
      setOpen(false);
      setClientId("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const sign = useMutation({
    mutationFn: async (values: { id: string; signature_name: string }) => {
      const { error } = await (supabase as any)
        .from("contracts")
        .update({
          signature_name: values.signature_name,
          signed_at: new Date().toISOString(),
        })
        .eq("id", values.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Contrato assinado");
      qc.invalidateQueries({ queryKey: ["contracts"] });
      setSignOpen(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("contracts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["contracts"] }),
  });

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const service_description = String(fd.get("service_description") || "").trim().slice(0, 1000);
    const amount = Number(fd.get("amount") || 0);
    const dateVal = String(fd.get("service_date") || "");
    if (!service_description) return toast.error("Descrição obrigatória");
    if (!clientId) return toast.error("Selecione um cliente");
    if (isNaN(amount) || amount < 0) return toast.error("Valor inválido");
    create.mutate({
      client_id: clientId,
      service_description,
      amount,
      service_date: dateVal || null,
    });
  };

  const onSign = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!signOpen) return;
    const fd = new FormData(e.currentTarget);
    const signature_name = String(fd.get("signature_name") || "").trim().slice(0, 120);
    if (!signature_name) return toast.error("Nome obrigatório");
    sign.mutate({ id: signOpen, signature_name });
  };

  return (
    <>
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4" /> Novo contrato
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Novo contrato</DialogTitle>
            </DialogHeader>
            <form onSubmit={onSubmit} className="space-y-3">
              <div className="space-y-1.5">
                <Label>Cliente</Label>
                <Select value={clientId} onValueChange={setClientId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="service_description">Serviço</Label>
                <Textarea
                  id="service_description"
                  name="service_description"
                  maxLength={1000}
                  rows={3}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="amount">Valor (R$)</Label>
                  <Input
                    id="amount"
                    name="amount"
                    type="number"
                    step="0.01"
                    min="0"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="service_date">Data</Label>
                  <Input id="service_date" name="service_date" type="date" />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={create.isPending}>
                {create.isPending ? "Salvando..." : "Salvar"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="mt-4 overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-card)]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Serviço</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead>Assinatura</TableHead>
              <TableHead className="w-32"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  Carregando...
                </TableCell>
              </TableRow>
            ) : contracts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  Nenhum contrato.
                </TableCell>
              </TableRow>
            ) : (
              contracts.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>
                    {new Date(c.created_at).toLocaleDateString("pt-BR")}
                  </TableCell>
                  <TableCell>{c.clients?.name || "—"}</TableCell>
                  <TableCell className="max-w-xs truncate">
                    {c.service_description}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    R$ {Number(c.amount).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell className="text-sm">
                    {c.signature_name ? (
                      <span className="text-muted-foreground">
                        {c.signature_name} · {new Date(c.signed_at).toLocaleDateString("pt-BR")}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      {!c.signature_name && (
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Assinar"
                          onClick={() => setSignOpen(c.id)}
                        >
                          <PenLine className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Baixar PDF"
                        onClick={() =>
                          generateContractPDF({
                            client_name: c.clients?.name || "—",
                            service: c.service_description,
                            amount: Number(c.amount),
                            service_date: c.service_date,
                            signature_name: c.signature_name,
                            signed_at: c.signed_at,
                            company: profile || {},
                          })
                        }
                      >
                        <FileDown className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => remove.mutate(c.id)}
                      >
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

      <Dialog open={!!signOpen} onOpenChange={(v) => !v && setSignOpen(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assinar contrato</DialogTitle>
          </DialogHeader>
          <form onSubmit={onSign} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="signature_name">Nome completo de quem assina</Label>
              <Input
                id="signature_name"
                name="signature_name"
                maxLength={120}
                required
              />
              <p className="text-xs text-muted-foreground">
                Assinatura simples registrada com nome e data atual.
              </p>
            </div>
            <Button type="submit" className="w-full" disabled={sign.isPending}>
              {sign.isPending ? "Assinando..." : "Assinar agora"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
