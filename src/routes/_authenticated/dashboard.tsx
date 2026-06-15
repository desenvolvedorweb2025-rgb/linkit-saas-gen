import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Users, CalendarDays, DollarSign } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: DashboardPage,
});

function startOfMonthISO() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString();
}

function DashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const monthStart = startOfMonthISO();
      const [clients, services, quotes] = await Promise.all([
        supabase.from("clients").select("id", { count: "exact", head: true }),
        supabase
          .from("appointments")
          .select("id", { count: "exact", head: true })
          .gte("service_date", monthStart),
        supabase.from("quotes").select("amount").gte("created_at", monthStart),
      ]);
      const revenue = (quotes.data ?? []).reduce((sum, q) => sum + Number(q.amount || 0), 0);
      return {
        clients: clients.count ?? 0,
        services: services.count ?? 0,
        revenue,
      };
    },
  });

  const cards = [
    { label: "Clientes totais", value: data?.clients ?? 0, icon: Users },
    { label: "Serviços do mês", value: data?.services ?? 0, icon: CalendarDays },
    {
      label: "Faturamento do mês",
      value: `R$ ${(data?.revenue ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
      icon: DollarSign,
    },
  ];

  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="text-2xl font-semibold tracking-tight">Visão geral</h1>
      <p className="mt-1 text-sm text-muted-foreground">Resumo do seu negócio neste mês.</p>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {cards.map((c) => (
          <div
            key={c.label}
            className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{c.label}</span>
              <c.icon className="h-4 w-4 text-primary" />
            </div>
            <div className="mt-3 text-3xl font-semibold">
              {isLoading ? "..." : c.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
