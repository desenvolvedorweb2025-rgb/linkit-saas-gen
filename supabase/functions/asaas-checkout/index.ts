import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const ASAAS_API_KEY = Deno.env.get("ASAAS_API_KEY")!;
const ASAAS_BASE_URL = "https://api.asaas.com/v3";

const PLAN_PRICES: Record<string, number> = {
  avulso: 9.9,
  mensal: 59.9,
};

function onlyDigits(v: string) {
  return v.replace(/\D/g, "");
}

function tomorrowISO() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

async function asaasFetch(path: string, options: RequestInit = {}) {
  const res = await fetch(`${ASAAS_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      access_token: ASAAS_API_KEY,
      ...(options.headers || {}),
    },
  });
  const data = await res.json();
  if (!res.ok) {
    console.error("Asaas API error", res.status, data);
    throw new Error(data?.errors?.[0]?.description || "Erro ao falar com o Asaas");
  }
  return data;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");

    // Cliente com a chave anônima só pra validar o usuário a partir do token
    const supabaseAuth = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userError } = await supabaseAuth.auth.getUser(token);
    if (userError || !userData.user) {
      return new Response(JSON.stringify({ error: "Não autenticado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const user = userData.user;

    // Cliente com service role pra ler/escrever sem restrição de RLS
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const body = await req.json();
    const plan = body.plan as string;
    const cpfCnpjRaw = String(body.cpfCnpj || "");
    const cpfCnpj = onlyDigits(cpfCnpjRaw);

    if (!PLAN_PRICES[plan]) {
      return new Response(JSON.stringify({ error: "Plano inválido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (cpfCnpj.length !== 11 && cpfCnpj.length !== 14) {
      return new Response(JSON.stringify({ error: "CPF/CNPJ inválido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, asaas_customer_id")
      .eq("id", user.id)
      .single();

    // Garante o cadastro do cliente no Asaas (ou reaproveita se já existir)
    let asaasCustomerId = profile?.asaas_customer_id as string | null;
    if (!asaasCustomerId) {
      const customer = await asaasFetch("/customers", {
        method: "POST",
        body: JSON.stringify({
          name: profile?.full_name || user.email,
          email: user.email,
          cpfCnpj,
          externalReference: user.id,
        }),
      });
      asaasCustomerId = customer.id;
      await supabase
        .from("profiles")
        .update({ asaas_customer_id: asaasCustomerId, cpf_cnpj: cpfCnpj })
        .eq("id", user.id);
    }

    const amount = PLAN_PRICES[plan];
    let invoiceUrl: string;
    let asaasPaymentId: string | null = null;

    if (plan === "avulso") {
      const payment = await asaasFetch("/payments", {
        method: "POST",
        body: JSON.stringify({
          customer: asaasCustomerId,
          billingType: "UNDEFINED",
          value: amount,
          dueDate: tomorrowISO(),
          description: "ServiçoPro — Serviço avulso",
          externalReference: user.id,
        }),
      });
      invoiceUrl = payment.invoiceUrl;
      asaasPaymentId = payment.id;
    } else {
      const subscription = await asaasFetch("/subscriptions", {
        method: "POST",
        body: JSON.stringify({
          customer: asaasCustomerId,
          billingType: "UNDEFINED",
          value: amount,
          nextDueDate: tomorrowISO(),
          cycle: "MONTHLY",
          description: "ServiçoPro — Plano Profissional",
          externalReference: user.id,
        }),
      });
      await supabase
        .from("profiles")
        .update({ asaas_subscription_id: subscription.id })
        .eq("id", user.id);

      const firstPayments = await asaasFetch(
        `/subscriptions/${subscription.id}/payments`
      );
      const firstPayment = firstPayments.data?.[0];
      invoiceUrl = firstPayment?.invoiceUrl;
      asaasPaymentId = firstPayment?.id || null;
    }

    await supabase.from("payments").insert({
      user_id: user.id,
      asaas_payment_id: asaasPaymentId,
      asaas_customer_id: asaasCustomerId,
      plan_type: plan,
      amount,
      status: "pending",
      invoice_url: invoiceUrl,
    });

    return new Response(JSON.stringify({ invoiceUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error(err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Erro inesperado" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
