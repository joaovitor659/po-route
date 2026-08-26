import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { FileCheck2, ShieldCheck } from "lucide-react";
import { useEffect } from "react";

import logoVissimo from "@/assets/vissimo-logo.png.asset.json";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Fila de Aprovação de PO — Importação de vinhos" },
      {
        name: "description",
        content:
          "Aplicativo interno para a gerência aprovar ou rejeitar pedidos de compra de importação de vinhos, com registro permanente de cada decisão.",
      },
      { property: "og:title", content: "Fila de Aprovação de PO" },
      {
        property: "og:description",
        content:
          "Revise os PDFs de pedidos de compra pendentes e registre aprovações e rejeições.",
      },
    ],
  }),
  component: PaginaInicial,
});

function PaginaInicial() {
  const navigate = useNavigate();

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/painel", replace: true });
    });
  }, [navigate]);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-4 py-16">
        <img
          src={logoVissimo.url}
          alt="Víssimo Group"
          className="h-24 w-auto max-w-[20rem] rounded-xl object-contain shadow-[var(--shadow-panel)]"
        />
        <h1 className="mt-6 text-4xl leading-tight font-semibold sm:text-5xl">
          Fila de Aprovação de PO
        </h1>
        <p className="mt-4 max-w-xl text-base text-muted-foreground">
          Sistema interno de comércio exterior. Os pedidos de compra chegam prontos da
          planilha e da automação — aqui a gerência apenas revisa o PDF e registra a
          decisão.
        </p>

        <div className="mt-8">
          <Button asChild size="lg">
            <Link to="/auth">Entrar</Link>
          </Button>
        </div>

        <dl className="mt-14 grid gap-4 sm:grid-cols-2">
          <div className="surface-panel p-5">
            <FileCheck2 className="size-5 text-primary" />
            <dt className="mt-3 font-medium">Aprovação com o PDF em tela</dt>
            <dd className="mt-1 text-sm text-muted-foreground">
              Cada pedido pendente mostra o documento gerado pela automação, pronto para
              aprovar ou rejeitar com motivo.
            </dd>
          </div>
          <div className="surface-panel p-5">
            <ShieldCheck className="size-5 text-primary" />
            <dt className="mt-3 font-medium">Histórico permanente</dt>
            <dd className="mt-1 text-sm text-muted-foreground">
              Toda decisão gera um registro imutável de quem decidiu, quando e por quê.
            </dd>
          </div>
        </dl>
      </main>
    </div>
  );
}
