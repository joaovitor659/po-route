import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import logoVissimo from "@/assets/vissimo-mark.png.asset.json";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Entrar — Fila de Aprovação de PO" },
      {
        name: "description",
        content:
          "Acesso restrito à gerência para aprovar ou rejeitar pedidos de compra de importação de vinhos.",
      },
      { property: "og:title", content: "Entrar — Fila de Aprovação de PO" },
      {
        property: "og:description",
        content: "Acesso restrito à gerência da fila de aprovação de pedidos de compra.",
      },
    ],
  }),
  component: PaginaLogin,
});

function PaginaLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/painel", replace: true });
    });
  }, [navigate]);

  async function entrar(evento: React.FormEvent) {
    evento.preventDefault();
    setCarregando(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: senha,
    });
    setCarregando(false);

    if (error) {
      toast.error("Não foi possível entrar", {
        description:
          error.message === "Invalid login credentials"
            ? "E-mail ou senha incorretos."
            : error.message,
      });
      return;
    }

    navigate({ to: "/painel", replace: true });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <img
            src={logoVissimo.url}
            alt="Víssimo Group"
            className="size-16 rounded-xl object-contain shadow-[var(--shadow-panel)]"
          />
          <h1 className="mt-4 text-2xl font-semibold">Fila de Aprovação de PO</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Acesso restrito à gerência de comércio exterior.
          </p>
        </div>

        <form onSubmit={entrar} className="surface-panel space-y-4 p-6">
          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              required
              maxLength={255}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="gerente@empresa.com"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="senha">Senha</Label>
            <Input
              id="senha"
              type="password"
              autoComplete="current-password"
              required
              maxLength={100}
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              placeholder="••••••••"
            />
          </div>
          <Button type="submit" className="w-full" disabled={carregando}>
            {carregando ? "Entrando…" : "Entrar"}
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            Os acessos são criados pela equipe de TI. Em caso de problemas, procure o
            administrador do sistema.
          </p>
        </form>
      </div>
    </div>
  );
}
