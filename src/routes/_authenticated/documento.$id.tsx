import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Check, ExternalLink, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import logoVissimo from "@/assets/vissimo-mark.png.asset.json";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import {
  formatarDataHora,
  STATUS_LABEL,
  type DocumentoPO,
  type LogAprovacao,
  type StatusPO,
} from "@/lib/po";

export const Route = createFileRoute("/_authenticated/documento/$id")({
  head: () => ({
    meta: [
      { title: "Documento do pedido — Fila de Aprovação de PO" },
      {
        name: "description",
        content:
          "Preview do PDF do pedido de compra com as ações de aprovar ou rejeitar e o histórico da decisão.",
      },
      { property: "og:title", content: "Documento do pedido — Fila de Aprovação de PO" },
      {
        property: "og:description",
        content: "Revise o PDF do pedido de compra e registre a decisão da gerência.",
      },
    ],
  }),
  component: DetalheDocumento,
});

function DetalheDocumento() {
  const { id } = Route.useParams();
  const queryClient = useQueryClient();
  const [motivoAberto, setMotivoAberto] = useState(false);
  const [motivo, setMotivo] = useState("");

  const { data: documento, isLoading } = useQuery({
    queryKey: ["documentos_po", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("documentos_po")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return (data as DocumentoPO | null) ?? null;
    },
  });

  const { data: logs } = useQuery({
    queryKey: ["log_aprovacoes", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("log_aprovacoes")
        .select("*")
        .eq("documento_id", id)
        .order("data_hora", { ascending: false });
      if (error) throw error;
      return data as LogAprovacao[];
    },
  });

  const decidir = useMutation({
    mutationFn: async ({
      novoStatus,
      observacao,
    }: {
      novoStatus: StatusPO;
      observacao: string | null;
    }) => {
      if (!documento) throw new Error("Documento não encontrado");
      const { data: userData } = await supabase.auth.getUser();
      const usuario = userData.user?.email ?? userData.user?.id ?? "desconhecido";
      const agora = new Date().toISOString();

      const { error: erroLog } = await supabase.from("log_aprovacoes").insert({
        documento_id: documento.id,
        status_anterior: documento.status,
        status_novo: novoStatus,
        usuario,
        data_hora: agora,
        observacao,
      });
      if (erroLog) throw erroLog;

      const { error: erroDoc } = await supabase
        .from("documentos_po")
        .update({ status: novoStatus, aprovado_por: usuario, aprovado_em: agora })
        .eq("id", documento.id);
      if (erroDoc) throw erroDoc;
    },
    onSuccess: (_dados, variaveis) => {
      void queryClient.invalidateQueries({ queryKey: ["documentos_po"] });
      void queryClient.invalidateQueries({ queryKey: ["log_aprovacoes"] });
      setMotivoAberto(false);
      setMotivo("");
      toast.success(
        variaveis.novoStatus === "aprovado" ? "Pedido aprovado" : "Pedido rejeitado",
      );
    },
    onError: () => {
      toast.error("Não foi possível registrar a decisão", {
        description: "Tente novamente em alguns instantes.",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-[60vh] w-full rounded-lg" />
      </div>
    );
  }

  if (!documento) {
    return (
      <div className="surface-panel p-8 text-center">
        <p className="text-sm text-muted-foreground">Documento não encontrado.</p>
        <Button asChild variant="outline" className="mt-4">
          <Link to="/painel">Voltar ao painel</Link>
        </Button>
      </div>
    );
  }

  const pendente = documento.status === "pendente_aprovacao";

  return (
    <div className="page-stack">
      <Link
        to="/painel"
        className="body-text inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Voltar ao painel
      </Link>

      <div className="surface-panel panel-pad">
        <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3">
          <img
            src={logoVissimo.url}
            alt="Víssimo Group"
            className="size-11 shrink-0 rounded-lg object-contain sm:size-12"
          />
          <div className="min-w-0">
            <h1 className="page-title truncate">
              {documento.identificador}
            </h1>
            <div className="mt-1.5">
              <StatusBadge status={documento.status} />
            </div>
          </div>
        </div>

        <dl className="mt-5 grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="field-label">Cliente</dt>
            <dd className="body-text mt-1 font-medium">{documento.cliente}</dd>
          </div>
          <div>
            <dt className="field-label">Exportador</dt>
            <dd className="body-text mt-1 font-medium">{documento.exportador}</dd>
          </div>
          <div>
            <dt className="field-label">Recebido em</dt>
            <dd className="body-text mt-1 font-medium">{formatarDataHora(documento.criado_em)}</dd>
          </div>
          <div>
            <dt className="field-label">Última decisão</dt>
            <dd className="body-text mt-1 font-medium">
              {documento.aprovado_por
                ? `${documento.aprovado_por} · ${formatarDataHora(documento.aprovado_em)}`
                : "—"}
            </dd>
          </div>
        </dl>

        {pendente && (
          <div className="mt-5 grid gap-3 sm:flex sm:flex-wrap">
            <Button
              onClick={() => decidir.mutate({ novoStatus: "aprovado", observacao: null })}
              disabled={decidir.isPending}
            >
              <Check className="size-4" />
              Aprovar
            </Button>
            <Button
              variant="destructive"
              onClick={() => setMotivoAberto(true)}
              disabled={decidir.isPending}
            >
              <X className="size-4" />
              Rejeitar
            </Button>
          </div>
        )}
      </div>

      <section className="surface-panel overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
          <h2 className="section-title">Documento PDF</h2>
          <a
            href={documento.pdf_url}
            target="_blank"
            rel="noreferrer"
            className="body-text inline-flex items-center gap-1.5 text-primary hover:underline"
          >
            Abrir em nova aba
            <ExternalLink className="size-3.5" />
          </a>
        </div>
        <object
          data={documento.pdf_url}
          type="application/pdf"
          className="h-[55vh] w-full bg-muted sm:h-[70vh]"
          aria-label={`PDF do pedido ${documento.identificador}`}
        >
          <div className="body-text p-6 text-muted-foreground">
            Não foi possível exibir o PDF neste dispositivo.{" "}
            <a
              href={documento.pdf_url}
              target="_blank"
              rel="noreferrer"
              className="text-primary hover:underline"
            >
              Abrir o documento
            </a>
            .
          </div>
        </object>
      </section>

      <section className="space-y-3">
        <h2 className="section-title">Histórico deste documento</h2>
        {(logs ?? []).length === 0 && (
          <p className="surface-panel body-text panel-pad text-muted-foreground">
            Nenhuma decisão registrada ainda.
          </p>
        )}
        <ul className="space-y-3">
          {(logs ?? []).map((log) => (
            <li key={log.id} className="surface-panel body-text panel-pad">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={log.status_novo} />
                <span className="meta-text ml-auto">
                  {formatarDataHora(log.data_hora)}
                </span>
              </div>
              <p className="mt-2">
                <span className="text-muted-foreground">
                  {log.status_anterior ? STATUS_LABEL[log.status_anterior] : "—"} →{" "}
                </span>
                {STATUS_LABEL[log.status_novo]} por {log.usuario}
              </p>
              {log.observacao && (
                <p className="mt-2 rounded-md bg-muted p-2.5">
                  <span className="text-muted-foreground">Motivo: </span>
                  {log.observacao}
                </p>
              )}
            </li>
          ))}
        </ul>
      </section>

      <Dialog open={motivoAberto} onOpenChange={setMotivoAberto}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rejeitar pedido {documento.identificador}</DialogTitle>
            <DialogDescription>
              Informe o motivo da rejeição. Ele ficará registrado no histórico
              permanentemente.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="motivo">Motivo da rejeição</Label>
            <Textarea
              id="motivo"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              maxLength={1000}
              rows={4}
              placeholder="Ex.: valores divergentes da negociação com o exportador."
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMotivoAberto(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={motivo.trim().length < 5 || decidir.isPending}
              onClick={() =>
                decidir.mutate({ novoStatus: "rejeitado", observacao: motivo.trim() })
              }
            >
              Confirmar rejeição
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
