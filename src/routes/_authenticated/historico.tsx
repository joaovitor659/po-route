import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";

import { StatusBadge } from "@/components/StatusBadge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import {
  formatarDataHora,
  STATUS_LABEL,
  type DocumentoPO,
  type LogAprovacao,
} from "@/lib/po";

export const Route = createFileRoute("/_authenticated/historico")({
  head: () => ({
    meta: [
      { title: "Histórico de decisões — Fila de Aprovação de PO" },
      {
        name: "description",
        content:
          "Registro permanente de todas as aprovações e rejeições de pedidos de compra, com filtro por documento e por data.",
      },
      { property: "og:title", content: "Histórico de decisões — Fila de Aprovação de PO" },
      {
        property: "og:description",
        content: "Todas as decisões registradas, com usuário, data e motivo.",
      },
    ],
  }),
  component: Historico;
});

function Historico() {
  const [documentoId, setDocumentoId] = useState("todos");
  const [de, setDe] = useState("");
  const [ate, setAte] = useState("");

  const { data: documentos } = useQuery({
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

  const { data: logs, isLoading } = useQuery({
    queryKey: ["log_aprovacoes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("log_aprovacoes")
        .select("*")
        .order("data_hora", { ascending: false });
      if (error) throw error;
      return data as LogAprovacao[];
    },
  });

  const mapaDocumentos = useMemo(() => {
    const mapa = new Map<string, DocumentoPO>();
    (documentos ?? []).forEach((doc) => mapa.set(doc.id, doc));
    return mapa;
  }, [documentos]);

  const filtrados = useMemo(() => {
    return (logs ?? []).filter((log) => {
      if (documentoId !== "todos" && log.documento_id !== documentoId) return false;
      const data = new Date(log.data_hora);
      if (de && data < new Date(`${de}T00:00:00`)) return false;
      if (ate && data > new Date(`${ate}T23:59:59`)) return false;
      return true;
    });
  }, [logs, documentoId, de, ate]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold sm:text-3xl">Histórico de decisões</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Registro permanente — nenhuma entrada pode ser editada ou apagada.
        </p>
      </div>

      <div className="surface-panel grid gap-4 p-4 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor="documento">Documento</Label>
          <select
            id="documento"
            value={documentoId}
            onChange={(e) => setDocumentoId(e.target.value)}
            className="h-9 w-full rounded-md border border-input bg-card px-3 text-sm"
          >
            <option value="todos">Todos os documentos</option>
            {(documentos ?? []).map((doc) => (
              <option key={doc.id} value={doc.id}>
                {doc.identificador} — {doc.cliente}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="de">De</Label>
          <Input id="de" type="date" value={de} onChange={(e) => setDe(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ate">Até</Label>
          <Input
            id="ate"
            type="date"
            value={ate}
            onChange={(e) => setAte(e.target.value)}
          />
        </div>
      </div>

      {isLoading && (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-20 w-full rounded-lg" />
          ))}
        </div>
      )}

      {!isLoading && filtrados.length === 0 && (
        <p className="surface-panel p-8 text-center text-sm text-muted-foreground">
          Nenhuma decisão registrada para os filtros selecionados.
        </p>
      )}

      <ul className="space-y-3">
        {filtrados.map((log) => {
          const doc = mapaDocumentos.get(log.documento_id);
          return (
            <li key={log.id} className="surface-panel p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-display font-semibold">
                  {doc?.identificador ?? "Documento removido"}
                </span>
                <StatusBadge status={log.status_novo} />
                <span className="ml-auto text-xs text-muted-foreground">
                  {formatarDataHora(log.data_hora)}
                </span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {doc ? `${doc.cliente} · ${doc.exportador}` : "—"}
              </p>
              <p className="mt-2 text-sm">
                <span className="text-muted-foreground">
                  {log.status_anterior ? STATUS_LABEL[log.status_anterior] : "—"} →{" "}
                </span>
                {STATUS_LABEL[log.status_novo]} por {log.usuario}
              </p>
              {log.observacao && (
                <p className="mt-2 rounded-md bg-muted p-2.5 text-sm">
                  <span className="text-muted-foreground">Observação: </span>
                  {log.observacao}
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
