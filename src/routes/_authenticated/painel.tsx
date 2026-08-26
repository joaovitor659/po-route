import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronRight, RotateCcw, Search, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { StatusBadge } from "@/components/StatusBadge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
  const [verArquivados, setVerArquivados] = useState(false);
  const [paraArquivar, setParaArquivar] = useState<DocumentoPO | null>(null);
  const queryClient = useQueryClient();

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

  const arquivar = useMutation({
    mutationFn: async ({ doc, arquivar }: { doc: DocumentoPO; arquivar: boolean }) => {
      const { data: userData } = await supabase.auth.getUser();
      const usuario = userData.user?.email ?? userData.user?.id ?? "desconhecido";
      const { error } = await supabase
        .from("documentos_po")
        .update(
          arquivar
            ? { arquivado_em: new Date().toISOString(), arquivado_por: usuario }
            : { arquivado_em: null, arquivado_por: null },
        )
        .eq("id", doc.id);
      if (error) throw error;
    },
    onSuccess: (_dados, variaveis) => {
      void queryClient.invalidateQueries({ queryKey: ["documentos_po"] });
      setParaArquivar(null);
      toast.success(
        variaveis.arquivar
          ? `Pedido ${variaveis.doc.identificador} removido da lista`
          : `Pedido ${variaveis.doc.identificador} restaurado`,
      );
    },
    onError: () => {
      toast.error("Não foi possível atualizar o pedido", {
        description: "Tente novamente em alguns instantes.",
      });
    },
  });

  const documentos = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return (data ?? []).filter((doc) => {
      if (verArquivados ? !doc.arquivado_em : doc.arquivado_em) return false;
      if (filtro !== "todos" && doc.status !== filtro) return false;
      if (!termo) return true;
      return [doc.identificador, doc.cliente, doc.exportador].some((campo) =>
        campo.toLowerCase().includes(termo),
      );
    });
  }, [data, filtro, busca, verArquivados]);

  const pendentes = (data ?? []).filter(
    (d) => d.status === "pendente_aprovacao" && !d.arquivado_em,
  ).length;
  const arquivados = (data ?? []).filter((d) => d.arquivado_em).length;

  return (
    <div className="page-stack">
      <div>
        <h1 className="page-title">Painel de pedidos</h1>
        <p className="page-subtitle">
          {pendentes === 0
            ? "Nenhum pedido aguardando sua aprovação."
            : `${pendentes} pedido${pendentes > 1 ? "s" : ""} aguardando sua aprovação.`}
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

        <button
          type="button"
          onClick={() => setVerArquivados((v) => !v)}
          className="meta-text underline-offset-4 hover:underline"
        >
          {verArquivados
            ? "Voltar aos pedidos ativos"
            : `Ver removidos (${arquivados})`}
        </button>
      </div>

      {isLoading && (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-24 w-full rounded-lg" />
          ))}
        </div>
      )}

      {error && (
        <p className="surface-panel panel-pad body-text text-destructive">
          Não foi possível carregar os pedidos. Atualize a página e tente novamente.
        </p>
      )}

      {!isLoading && !error && documentos.length === 0 && (
        <p className="surface-panel body-text p-8 text-center text-muted-foreground">
          {verArquivados
            ? "Nenhum pedido removido."
            : "Nenhum pedido encontrado com os filtros atuais."}
        </p>
      )}

      <ul className="space-y-3">
        {documentos.map((doc) => (
          <li key={doc.id} className="relative">
            <Link
              to="/documento/$id"
              params={{ id: doc.id }}
              className={cn(
                "surface-panel panel-pad flex items-center gap-4 transition-shadow hover:shadow-[var(--shadow-lift)]",
                doc.status === "pendente_aprovacao" &&
                  !doc.arquivado_em &&
                  "border-l-4 border-l-warning",
              )}
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="card-title">{doc.identificador}</span>
                  <StatusBadge status={doc.status} />
                </div>
                <p className="body-text mt-1.5 truncate font-medium">{doc.cliente}</p>
                <p className="body-text truncate text-muted-foreground">
                  Exportador: {doc.exportador}
                </p>
                <p className="meta-text mt-1.5">
                  Recebido em {formatarDataHora(doc.criado_em)}
                  {doc.arquivado_em
                    ? ` · removido em ${formatarDataHora(doc.arquivado_em)}`
                    : ""}
                </p>
              </div>
              <ChevronRight className="size-5 shrink-0 text-muted-foreground" />
            </Link>

            <button
              type="button"
              disabled={arquivar.isPending}
              onClick={() => {
                if (doc.arquivado_em) {
                  arquivar.mutate({ doc, arquivar: false });
                } else {
                  setParaArquivar(doc);
                }
              }}
              aria-label={
                doc.arquivado_em
                  ? `Restaurar pedido ${doc.identificador}`
                  : `Remover pedido ${doc.identificador} da lista`
              }
              className="absolute top-2 right-2 rounded-md p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-destructive"
            >
              {doc.arquivado_em ? (
                <RotateCcw className="size-4" />
              ) : (
                <Trash2 className="size-4" />
              )}
            </button>
          </li>
        ))}
      </ul>

      <AlertDialog
        open={paraArquivar !== null}
        onOpenChange={(aberto) => !aberto && setParaArquivar(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Remover {paraArquivar?.identificador} da lista?
            </AlertDialogTitle>
            <AlertDialogDescription>
              O pedido deixa de aparecer no painel. O histórico de decisões é
              permanente e continua no histórico geral — você pode restaurar o
              pedido em "Ver removidos".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                paraArquivar && arquivar.mutate({ doc: paraArquivar, arquivar: true })
              }
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
