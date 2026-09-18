import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import logoVissimo from "@/assets/vissimo-logo.png.asset.json";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/cadastro")({
  head: () => ({
    meta: [
      { title: "Criar conta — Fila de Aprovação de PO" },
      {
        name: "description",
        content: "Crie sua conta de acesso ao ambiente de aprovação de PO.",
      },
      { property: "og:title", content: "Criar conta — Fila de Aprovação de PO" },
      {
        property: "og:description",
        content: "Crie sua conta de acesso ao ambiente de aprovação de PO.",
      },
    ],
  }),
  component: PaginaCadastro,
});

function PaginaCadastro() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [cadastrado, setCadastrado] = useState(false);

  async function cadastrar(evento: React.FormEvent) {
    evento.preventDefault();

    if (senha.length < 6) {
      toast.error("Senha muito curta", {
        description: "Use pelo menos 6 caracteres.",
      });
      return;
    }

    if (senha !== confirmar) {
      toast.error("As senhas não coincidem", {
        description: "Digite a mesma senha nos dois campos.",
      });
      return;
    }

    setCarregando(true);
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password: senha,
      options: { emailRedirectTo: window.location.origin },
    });
    setCarregando(false);

    if (error) {
      toast.error("Não foi possível cadastrar", {
        description: error.message,
      });
      return;
    }

    // Com confirmação por e-mail ativada, signUp retorna session === null.
    if (!data.session) {
      setCadastrado(true);
      return;
    }

    // Caso a confirmação esteja desativada, já está logado.
    navigate({ to: "/painel", replace: true });
  }

  if (cadastrado) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
        <div className="w-full max-w-sm">
          <div className="mb-6 flex flex-col items-center text-center">
            <img
              src={logoVissimo.url}
              alt="Víssimo Group"
              className="h-20 w-auto max-w-[16rem] rounded-xl object-contain shadow-[var(--shadow-panel)]"
            />
          </div>
          <div className="surface-panel space-y-4 p-6 text-center">
            <h1 className="text-xl font-semibold">Confirme seu e-mail</h1>
            <p className="text-sm text-muted-foreground">
              Enviamos um link de confirmação para{" "}
              <strong className="text-foreground">{email.trim()}</strong>. Abra o
              e-mail e clique no link para ativar sua conta e entrar no app.
            </p>
            <Button asChild className="w-full">
              <Link to="/auth">Voltar para o login</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <img
            src={logoVissimo.url}
            alt="Víssimo Group"
            className="h-20 w-auto max-w-[16rem] rounded-xl object-contain shadow-[var(--shadow-panel)]"
          />
          <h1 className="mt-4 text-2xl font-semibold">Criar conta</h1>
        </div>

        <form onSubmit={cadastrar} className="surface-panel space-y-4 p-6">
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
              placeholder="voce@empresa.com"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="senha">Senha</Label>
            <Input
              id="senha"
              type="password"
              autoComplete="new-password"
              required
              minLength={6}
              maxLength={100}
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              placeholder="mínimo 6 caracteres"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmar">Confirmar senha</Label>
            <Input
              id="confirmar"
              type="password"
              autoComplete="new-password"
              required
              minLength={6}
              maxLength={100}
              value={confirmar}
              onChange={(e) => setConfirmar(e.target.value)}
              placeholder="repita a senha"
            />
          </div>
          <Button type="submit" className="w-full" disabled={carregando}>
            {carregando ? "Cadastrando…" : "Criar conta"}
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            Você receberá um e-mail de confirmação para ativar a conta antes de
            entrar.
          </p>
        </form>

        <p className="mt-4 text-center text-sm text-muted-foreground">
          Já tem conta?{" "}
          <Link
            to="/auth"
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            Entrar
          </Link>
        </p>
      </div>
    </div>
  );
}
