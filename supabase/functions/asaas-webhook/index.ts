import { createClient } from "npm:@supabase/supabase-js@2";

const CONFIRMED_EVENTS = ["PAYMENT_CONFIRMED", "PAYMENT_RECEIVED"];
const FAILED_EVENTS = ["PAYMENT_OVERDUE", "PAYMENT_DELETED", "PAYMENT_REFUNDED"];

Deno.serve(async (req) => {
  try {
    // Confere o token compartilhado configurado no painel do Asaas (Webhooks > Token de acesso)
    const expectedToken = Deno.env.get("ASAAS_WEBHOOK_TOKEN");
    if (expectedToken) {
      const receivedToken = req.headers.get("asaas-access-token");
      if (receivedToken !== expectedToken) {
        return new Response("Unauthorized", { status: 401 });
      }
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const payload = await req.json();
    const event = payload.event as string;
    const asaasPayment = payload.payment;
    if (!asaasPayment) {
      return new Response("ok", { status: 200 });
    }

    const paymentId = asaasPayment.id as string;
    const customerId = asaasPayment.customer as string;

    // Tenta achar a cobrança já registrada; se não achar (ex: renovação mensal
    // gerando um novo pagamento), cria um registro novo associado ao mesmo cliente.
    const { data: existing } = await supabase
      .from("payments")
      .select("id, user_id, plan_type")
      .eq("asaas_payment_id", paymentId)
      .maybeSingle();

    let userId = existing?.user_id as string | undefined;
    let planType = existing?.plan_type as string | undefined;

    if (!userId) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("id, plan_type")
        .eq("asaas_customer_id", customerId)
        .maybeSingle();
      userId = profile?.id;
      planType = profile?.plan_type || (asaasPayment.subscription ? "mensal" : "avulso");

      if (userId) {
        await supabase.from("payments").insert({
          user_id: userId,
          asaas_payment_id: paymentId,
          asaas_customer_id: customerId,
          plan_type: planType,
          amount: asaasPayment.value,
          status: "pending",
          invoice_url: asaasPayment.invoiceUrl,
        });
      }
    }

    if (!userId) {
      console.warn("Webhook recebido sem usuário correspondente", customerId);
      return new Response("ok", { status: 200 });
    }

    if (CONFIRMED_EVENTS.includes(event)) {
      await supabase
        .from("payments")
        .update({ status: "confirmed", updated_at: new Date().toISOString() })
        .eq("asaas_payment_id", paymentId);

      const planExpiresAt =
        planType === "mensal"
          ? new Date(Date.now() + 32 * 24 * 60 * 60 * 1000).toISOString() // 32 dias de folga até a próxima cobrança
          : null;

      await supabase
        .from("profiles")
        .update({
          plan_status: "active",
          plan_type: planType,
          plan_expires_at: planExpiresAt,
        })
        .eq("id", userId);
    } else if (FAILED_EVENTS.includes(event)) {
      await supabase
        .from("payments")
        .update({ status: "failed", updated_at: new Date().toISOString() })
        .eq("asaas_payment_id", paymentId);

      if (planType === "mensal") {
        await supabase
          .from("profiles")
          .update({ plan_status: "inactive" })
          .eq("id", userId);
      }
    }

    return new Response("ok", { status: 200 });
  } catch (err) {
    console.error(err);
    return new Response("error", { status: 500 });
  }
});
