
# ServiçoPro — SaaS para prestadores de serviço

Vou construir em **duas fases** pra entregar rápido e iterar com você.

## Stack
- TanStack Start + Tailwind (já configurado)
- Lovable Cloud (banco, auth, storage) — vou ativar
- Login: e-mail/senha + Google
- Cor: azul (#3B82F6) sobre branco/cinza claro, estilo clean corporativo (Linear/Notion)

---

## Fase 1 — Landing + Auth + Estrutura do app (essa rodada)

### Landing pública (`/`)
- Hero: "Gestão completa para autônomos" + CTA "Começar grátis"
- Seção "Para quem é": pintores, eletricistas, encanadores, técnicos de ar, jardineiros, diaristas, marceneiros (cards com ícone)
- Features: Clientes, Agenda, Orçamentos com PDF, Dashboard, Documentos
- Pricing: 1 plano **R$ 29,90/mês** (badge Pix, Boleto, Cartão)
- Footer simples

### Auth (`/auth`)
- E-mail/senha + Google (Lovable broker)
- Após login → `/dashboard`

### App autenticado (sidebar com colapso)
- `/dashboard` — cards: clientes totais, serviços do mês, faturamento do mês
- `/clientes` — CRUD (nome, telefone, endereço)
- `/agenda` — lista de serviços (data, cliente, status: agendado/em andamento/concluído/cancelado)
- `/orcamentos` — CRUD + botão "Gerar PDF"
- `/documentos` — lista (placeholder; upload entra na Fase 2)

### Banco (Lovable Cloud)
```text
profiles      (id, full_name, profession, phone)
clients       (id, user_id, name, phone, address)
appointments  (id, user_id, client_id, service_date, description, status)
quotes        (id, user_id, client_id, description, amount, created_at)
documents     (id, user_id, title, type, file_url, created_at)  -- Fase 2
```
- RLS: cada usuário só vê os próprios dados (`user_id = auth.uid()`)
- Trigger `handle_new_user` cria profile no signup

### PDF de orçamento
- Geração client-side com `jspdf` — layout simples (cabeçalho, cliente, descrição, valor, data)

---

## Fase 2 — Documentos + Pagamentos (próxima rodada)

- Upload de comprovantes/recibos (Storage bucket privado)
- Geração de Recibo PDF e Contrato simples (templates)
- Integração de pagamento da assinatura R$29,90 (Stripe com Pix/Boleto/Cartão — Brasil)

> Faço a Fase 2 depois que você validar a Fase 1. Pagamento via Stripe Brasil suporta Pix, Boleto e Cartão nativamente.

---

## Pontos a confirmar
1. Nome do produto: posso usar **"ServiçoPro"** ou você tem outro?
2. Login com Google: ok eu já habilitar junto com e-mail/senha?
3. Na Fase 1 o pricing é só visual (sem checkout real). Tudo bem?
