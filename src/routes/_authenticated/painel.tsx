import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronRight, Search } from "lucide-react";
import { useMemo, useState } from "react";

import { StatusBadge } from "@/components/StatusBadge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import {
  formatarDataHora,
  STATUS_LABEL,
  STATUS_ORDEM,
  type DocumentoPO,
  type StatusPO,
} from "@/lib/po";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/painel")({
  head: () => ({
    meta: [
      { title: "Painel de pedidos — Fila de Aprovação de PO" },
      {
        name: "description",
        content:
          "Lista de pedidos de compra com filtro por status e busca por identificador, cliente ou exportador.",
      },
      { property: "og:title", content: "Painel de pedidos — Fila de Aprovação de PO" },
      {
        property: "og:description",
        content: "Documentos pendentes de aprovação da gerência, em um só lugar.",
      },
    ],
  }),
  component: Painel,
});

type FiltroStatus = "todos" | StatusPO;

function Painel() {
  const [filtro, setFiltro] = useState<FiltroStatus>("todos");
  const [busca, setBusca] = useState("");

  const { data, isLoading, error } = useQuery({
    queryKey: ["documentos_po"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("documentos_po")
        .select("*")
        .order("criado_em", { ascending: false });
      if (error) throw error;
      return data as DocumentoPO[];
    },
  });

  const documentos = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return (data ?? []).filter((doc) => {
      if (filtro !== "todos" && doc.status !== filtro) return false;
      if (!termo) return true;
      return [doc.identificador, doc.cliente, doc.exportador].some((campo) =>
        campo.toLowerCase().includes(termo),
      );
    });
  }, [data, filtro, busca]);

  const pendentes = (data ?? []).filter((d) => d.status === "pendente_aprovacao").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold sm:text-3xl">Painel de pedidos</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {pendentes === 0
            ? "Nenhum pedido aguardando sua decisão."
            : `${pendentes} pedido${pendentes > 1 ? "s" : ""} aguardando sua decisão.`}
        </p>
      </div>

      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            maxLength={120}
            placeholder="Buscar por identificador, cliente ou exportador"
            className="pl-9"
            aria-label="Buscar pedidos"
          />
        </div>

        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          {(["todos", ...STATUS_ORDEM] as FiltroStatus[]).map((opcao) => (
            <button
              key={opcao}
              type="button"
              onClick={() => setFiltro(opcao)}
              className={cn(
                "shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                filtro === opcao
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-muted-foreground hover:bg-accent hover:text-accent-foreground",
              )}
            >
              {opcao === "todos" ? "Todos" : STATUS_LABEL[opcao]}
            </button>
          ))}
        </div>
      </div>

      {isLoading && (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-24 w-full rounded-lg" />
          ))}
        </div>
      )}

      {error && (
        <p className="surface-panel p-6 text-sm text-destructive">
          Não foi possível carregar os pedidos. Atualize a página e tente novamente.
        </p>
      )}

      {!isLoading && !error && documentos.length === 0 && (
        <p className="surface-panel p-8 text-center text-sm text-muted-foreground">
          Nenhum pedido encontrado com os filtros atuais.
        </p>
      )}

      <ul className="space-y-3">
        {documentos.map((doc) => (
          <li key={doc.id}>
            <Link
              to="/documento/$id"
              params={{ id: doc.id }}
              className={cn(
                "surface-panel flex items-center gap-4 p-4 transition-shadow hover:shadow-[var(--shadow-lift)]",
                doc.status === "pendente_aprovacao" && "border-l-4 border-l-warning",
              )}
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-display text-base font-semibold">
                    {doc.identificador}
                  </span>
                  <StatusBadge status={doc.status} />
                </div>
                <p className="mt-1 truncate text-sm">{doc.cliente}</p>
                <p className="truncate text-sm text-muted-foreground">
                  Exportador: {doc.exportador}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Recebido em {formatarDataHora(doc.criado_em)}
                </p>
              </div>
              <ChevronRight className="size-5 shrink-0 text-muted-foreground" />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
