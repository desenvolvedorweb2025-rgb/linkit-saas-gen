import { createFileRoute, Link } from "@tanstack/react-router";
import {
  PaintBucket,
  Zap,
  Wrench,
  Wind,
  Leaf,
  Sparkles,
  Hammer,
  Users,
  CalendarDays,
  FileText,
  LayoutDashboard,
  FolderArchive,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ServiçoPro — Gestão para autônomos a partir de R$9,90" },
      {
        name: "description",
        content:
          "Organize clientes, agenda, orçamentos com PDF e dashboard. Serviço avulso R$9,90 ou plano único R$59,90/mês com Pix, boleto e cartão.",
      },
    ],
  }),
  component: LandingPage,
});

const professions = [
  { icon: PaintBucket, label: "Pintores" },
  { icon: Zap, label: "Eletricistas" },
  { icon: Wrench, label: "Encanadores" },
  { icon: Wind, label: "Téc. de ar-condicionado" },
  { icon: Leaf, label: "Jardineiros" },
  { icon: Sparkles, label: "Diaristas" },
  { icon: Hammer, label: "Marceneiros" },
];

const features = [
  { icon: Users, title: "Clientes", desc: "Cadastro completo com nome, telefone e endereço." },
  { icon: CalendarDays, title: "Agenda", desc: "Acompanhe data, status e detalhes do serviço." },
  { icon: FileText, title: "Orçamentos em PDF", desc: "Gere PDF profissional em um clique." },
  { icon: LayoutDashboard, title: "Dashboard", desc: "Clientes totais, serviços do mês e faturamento." },
  { icon: FolderArchive, title: "Documentos", desc: "Recibos, comprovantes e contratos." },
];

function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <header className="border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link to="/" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-[image:var(--gradient-primary)]" />
            <span className="text-lg font-semibold tracking-tight">ServiçoPro</span>
          </Link>
          <nav className="hidden gap-6 text-sm text-muted-foreground md:flex">
            <a href="#para-quem" className="hover:text-foreground">Para quem</a>
            <a href="#recursos" className="hover:text-foreground">Recursos</a>
            <a href="#precos" className="hover:text-foreground">Preços</a>
          </nav>
          <div className="flex items-center gap-2">
            <Link to="/auth">
              <Button variant="ghost" size="sm">Entrar</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden" style={{ background: "var(--gradient-hero)" }}>
        <div className="mx-auto max-w-4xl px-6 py-24 text-center md:py-32">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
            <span className="h-2 w-2 rounded-full bg-primary" /> Feito para autônomos brasileiros
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-foreground md:text-6xl">
            Gestão completa para o seu negócio de serviços
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            Clientes, agenda, orçamentos em PDF e dashboard — tudo num só lugar. Simples como deveria ser.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <Link to="/auth">
              <Button size="lg" className="h-12 px-8">Começar grátis</Button>
            </Link>
            <a href="#precos">
              <Button size="lg" variant="outline" className="h-12 px-8">Ver planos</Button>
            </a>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">A partir de R$ 9,90 por serviço · Sem cartão pra testar</p>
        </div>
      </section>

      {/* Profissões */}
      <section id="para-quem" className="mx-auto max-w-6xl px-6 py-20">
        <div className="text-center">
          <h2 className="text-3xl font-semibold tracking-tight">Feito para o seu ofício</h2>
          <p className="mt-3 text-muted-foreground">Atendemos os profissionais que fazem o Brasil funcionar.</p>
        </div>
        <div className="mt-12 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7">
          {professions.map((p) => (
            <div
              key={p.label}
              className="flex flex-col items-center gap-2 rounded-xl border border-border bg-card p-4 text-center transition-all hover:border-primary/40 hover:shadow-[var(--shadow-card)]"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent text-primary">
                <p.icon className="h-5 w-5" />
              </div>
              <span className="text-sm font-medium">{p.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Recursos */}
      <section id="recursos" className="bg-secondary/40 py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="text-center">
            <h2 className="text-3xl font-semibold tracking-tight">Tudo que você precisa</h2>
            <p className="mt-3 text-muted-foreground">Sem complicação. Direto ao ponto.</p>
          </div>
          <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <div
                key={f.title}
                className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-card)]"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-[image:var(--gradient-primary)] text-primary-foreground">
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-lg font-semibold">{f.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="precos" className="mx-auto max-w-5xl px-6 py-24">
        <div className="text-center">
          <h2 className="text-3xl font-semibold tracking-tight">Escolha como pagar</h2>
          <p className="mt-3 text-muted-foreground">Por serviço avulso ou plano mensal. Cancele quando quiser.</p>
        </div>

        <div className="mt-10 grid gap-6 md:grid-cols-2">
          {/* Plano Avulso */}
          <div className="rounded-3xl border border-border bg-card p-8 shadow-[var(--shadow-card)]">
            <div className="text-sm font-medium text-primary">Serviço Avulso</div>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="text-5xl font-bold">R$ 9,90</span>
              <span className="text-muted-foreground">/serviço</span>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">Ideal pra quem quer testar ou usa de vez em quando.</p>

            <ul className="mt-8 grid gap-3">
              {[
                "Cadastro de clientes",
                "Agenda de serviços",
                "Orçamento com PDF avulso",
                "Recibo do serviço",
              ].map((item) => (
                <li key={item} className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-primary" /> {item}
                </li>
              ))}
            </ul>

            <Link to="/auth" className="mt-8 block">
              <Button size="lg" variant="outline" className="h-12 w-full">Começar agora</Button>
            </Link>
          </div>

          {/* Plano Profissional */}
          <div className="relative rounded-3xl border border-primary bg-card p-8 shadow-[var(--shadow-glow)]">
            <div className="absolute -top-3 right-8 rounded-full bg-[image:var(--gradient-primary)] px-3 py-1 text-xs font-medium text-primary-foreground">
              Mais popular
            </div>
            <div className="flex items-baseline justify-between gap-4">
              <div>
                <div className="text-sm font-medium text-primary">Plano Profissional</div>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-5xl font-bold">R$ 59,90</span>
                  <span className="text-muted-foreground">/mês</span>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">Serviços ilimitados por um valor fixo.</p>
              </div>
              <div className="hidden h-14 w-14 items-center justify-center rounded-2xl bg-[image:var(--gradient-primary)] text-primary-foreground sm:flex">
                <Sparkles className="h-6 w-6" />
              </div>
            </div>

            <ul className="mt-8 grid gap-3">
              {[
                "Clientes ilimitados",
                "Agenda de serviços",
                "Orçamentos com PDF ilimitados",
                "Dashboard financeiro",
                "Documentos e recibos",
                "Suporte por e-mail",
              ].map((item) => (
                <li key={item} className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-primary" /> {item}
                </li>
              ))}
            </ul>

            <Link to="/auth" className="mt-8 block">
              <Button size="lg" className="h-12 w-full">Começar agora</Button>
            </Link>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-2 text-xs text-muted-foreground">
          <span>Aceitamos:</span>
          <span className="rounded-md border border-border bg-background px-2 py-1 font-medium">Pix</span>
          <span className="rounded-md border border-border bg-background px-2 py-1 font-medium">Boleto</span>
          <span className="rounded-md border border-border bg-background px-2 py-1 font-medium">Cartão</span>
        </div>
      </section>

      <footer className="border-t border-border py-10 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} ServiçoPro. Feito para autônomos.
      </footer>
    </div>
  );
}
