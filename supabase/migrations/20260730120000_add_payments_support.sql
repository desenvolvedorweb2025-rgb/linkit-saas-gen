-- Campos de cobrança/plano no perfil do prestador
alter table public.profiles
  add column if not exists cpf_cnpj text,
  add column if not exists asaas_customer_id text,
  add column if not exists asaas_subscription_id text,
  add column if not exists plan_status text not null default 'inactive',
  add column if not exists plan_type text,
  add column if not exists plan_expires_at timestamptz;

-- Histórico de cobranças (avulsas e mensais) via Asaas
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  asaas_payment_id text,
  asaas_customer_id text,
  plan_type text not null check (plan_type in ('avulso', 'mensal')),
  billing_type text,
  amount numeric not null,
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'failed')),
  invoice_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists payments_user_id_idx on public.payments(user_id);
create index if not exists payments_asaas_payment_id_idx on public.payments(asaas_payment_id);

alter table public.payments enable row level security;

-- Cada prestador só vê suas próprias cobranças.
-- Inserção/atualização acontece só via Edge Function (service role), sem policy de escrita pro cliente.
create policy "Users can view their own payments"
  on public.payments for select
  using (auth.uid() = user_id);
