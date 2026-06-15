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
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/agenda")({
  component: AgendaPage,
});

const STATUSES = ["agendado", "em andamento", "concluído", "cancelado"] as const;

const STATUS_STYLES: Record<string, string> = {
  agendado: "bg-accent text-accent-foreground",
  "em andamento": "bg-primary/10 text-primary",
  concluído: "bg-emerald-100 text-emerald-700",
  cancelado: "bg-muted text-muted-foreground",
};

function AgendaPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [clientId, setClientId] = useState<string>("");
  const [status, setStatus] = useState<string>("agendado");

  const { data: appts = [], isLoading } = useQuery({
    queryKey: ["appointments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("appointments")
        .select("*, clients(name)")
        .order("service_date", { ascending: false });
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

  const create = useMutation({
    mutationFn: async (values: { service_date: string; description: string; client_id: string; status: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");
      const { error } = await supabase.from("appointments").insert({
        user_id: user.id,
        client_id: values.client_id || null,
        service_date: new Date(values.service_date).toISOString(),
        description: values.description || null,
        status: values.status,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Serviço agendado");
      qc.invalidateQueries({ queryKey: ["appointments"] });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
      setOpen(false);
      setClientId("");
      setStatus("agendado");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("appointments").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["appointments"] });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
    },
  });

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const service_date = String(fd.get("service_date") || "");
    if (!service_date) return toast.error("Informe a data");
    create.mutate({
      service_date,
      description: String(fd.get("description") || "").slice(0, 500),
      client_id: clientId,
      status,
    });
  };

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Agenda</h1>
          <p className="mt-1 text-sm text-muted-foreground">Acompanhe seus serviços.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4" /> Novo serviço</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Novo serviço</DialogTitle></DialogHeader>
            <form onSubmit={onSubmit} className="space-y-3">
              <div className="space-y-1.5">
                <Label>Cliente</Label>
                <Select value={clientId} onValueChange={setClientId}>
                  <SelectTrigger><SelectValue placeholder="Selecione um cliente" /></SelectTrigger>
                  <SelectContent>
                    {clients.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="service_date">Data e hora</Label>
                <Input id="service_date" name="service_date" type="datetime-local" required />
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="description">Descrição</Label>
                <Textarea id="description" name="description" maxLength={500} rows={3} />
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
              <TableHead>Status</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">Carregando...</TableCell></TableRow>
            ) : appts.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">Nenhum serviço.</TableCell></TableRow>
            ) : (
              appts.map((a) => (
                <TableRow key={a.id}>
                  <TableCell>{new Date(a.service_date).toLocaleString("pt-BR")}</TableCell>
                  <TableCell>{(a as any).clients?.name || "—"}</TableCell>
                  <TableCell className="max-w-xs truncate">{a.description || "—"}</TableCell>
                  <TableCell>
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[a.status] || ""}`}>
                      {a.status}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => remove.mutate(a.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
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
