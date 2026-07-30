import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

type Plan = "avulso" | "mensal";

const PLAN_LABEL: Record<Plan, string> = {
  avulso: "Serviço Avulso — R$ 9,90",
  mensal: "Plano Profissional — R$ 59,90/mês",
};

export function CheckoutDialog({
  plan,
  open,
  onOpenChange,
}: {
  plan: Plan;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const navigate = useNavigate();
  const [cpfCnpj, setCpfCnpj] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData.session;
      if (!session) {
        toast.error("Faça login antes de continuar a assinatura");
        onOpenChange(false);
        navigate({ to: "/auth" });
        return;
      }

      const digits = cpfCnpj.replace(/\D/g, "");
      if (digits.length !== 11 && digits.length !== 14) {
        toast.error("Informe um CPF ou CNPJ válido");
        return;
      }

      const { data, error } = await supabase.functions.invoke("asaas-checkout", {
        body: { plan, cpfCnpj: digits },
      });

      if (error) throw error;
      if (!data?.invoiceUrl) throw new Error("Não foi possível gerar a cobrança");

      window.location.href = data.invoiceUrl;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao iniciar pagamento");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{PLAN_LABEL[plan]}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="cpfCnpj">CPF ou CNPJ</Label>
            <Input
              id="cpfCnpj"
              value={cpfCnpj}
              onChange={(e) => setCpfCnpj(e.target.value)}
              placeholder="Só números"
              maxLength={18}
              required
            />
            <p className="text-xs text-muted-foreground">
              Necessário pra emitir a cobrança. Você escolhe entre Pix e cartão na próxima tela.
            </p>
          </div>
          <Button type="submit" className="w-full h-11" disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Continuar para pagamento"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
