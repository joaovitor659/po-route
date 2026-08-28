import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import {
  EMPRESAS,
  empresaDoCliente,
  type DocumentoPO,
  type Empresa,
} from "@/lib/po";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/indicadores")({
  head: () => ({
    meta: [
      { title: "Indicadores de aprovação — Fila de Aprovação de PO" },
      {
        name: "description",
        content:
          "Gráficos com o total de pedidos de compra aprovados e reprovados, por empresa e no total.",
      },
      { property: "og:title", content: "Indicadores de aprovação de PO" },
      {
        property: "og:description",
        content: "Visão gráfica dos pedidos aprovados e reprovados por empresa.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Indicadores,
});

type FiltroEmpresa = "todas" | Empresa;

function Indicadores() {
  const [empresa, setEmpresa] = useState<FiltroEmpresa>("todas");

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

  const documentos = useMemo(
    () =>
      (data ?? []).filter(
        (doc) =>
          !doc.arquivado_em &&
          (empresa === "todas" || empresaDoCliente(doc.cliente) === empresa),
      ),
    [data, empresa],
  );

  const porEmpresa = useMemo(
    () =>
      EMPRESAS.map((nome) => {
        const docs = documentos.filter((d) => empresaDoCliente(d.cliente) === nome);
        return {
          empresa: nome,
          Aprovadas: docs.filter((d) => d.status === "aprovado").length,
          Reprovadas: docs.filter((d) => d.status === "rejeitado").length,
          Pendentes: docs.filter((d) => d.status === "pendente_aprovacao").length,
        };
      }).filter((linha) => linha.Aprovadas + linha.Reprovadas + linha.Pendentes > 0),
    [documentos],
  );

  const aprovadas = documentos.filter((d) => d.status === "aprovado").length;
  const reprovadas = documentos.filter((d) => d.status === "rejeitado").length;
  const pendentes = documentos.filter((d) => d.status === "pendente_aprovacao").length;
  const decididas = aprovadas + reprovadas;

  const pizza = [
    { nome: "Aprovadas", valor: aprovadas, cor: "var(--primary)" },
    { nome: "Reprovadas", valor: reprovadas, cor: "var(--destructive)" },
  ].filter((f) => f.valor > 0);

  return (
    <div className="page-stack">
      <div>
        <h1 className="page-title">Indicadores de aprovação</h1>
        <p className="page-subtitle">
          {decididas === 0
            ? "Nenhuma decisão registrada para os filtros atuais."
            : `${aprovadas} aprovada${aprovadas === 1 ? "" : "s"} e ${reprovadas} reprovada${
                reprovadas === 1 ? "" : "s"
              } de ${decididas} decisões.`}
        </p>
      </div>

      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {(["todas", ...EMPRESAS] as FiltroEmpresa[]).map((opcao) => (
          <button
            key={opcao}
            type="button"
            onClick={() => setEmpresa(opcao)}
            className={cn(
              "shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
              empresa === opcao
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-muted-foreground hover:bg-accent hover:text-accent-foreground",
            )}
          >
            {opcao === "todas" ? "Todas as empresas" : opcao}
          </button>
        ))}
      </div>

      {isLoading && <Skeleton className="h-72 w-full rounded-lg" />}

      {error && (
        <p className="surface-panel panel-pad body-text text-destructive">
          Não foi possível carregar os indicadores. Atualize a página e tente novamente.
        </p>
      )}

      {!isLoading && !error && (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="surface-panel panel-pad">
              <p className="meta-text">Aprovadas</p>
              <p className="font-display text-2xl font-semibold text-primary">
                {aprovadas}
              </p>
            </div>
            <div className="surface-panel panel-pad">
              <p className="meta-text">Reprovadas</p>
              <p className="font-display text-2xl font-semibold text-destructive">
                {reprovadas}
              </p>
            </div>
            <div className="surface-panel panel-pad">
              <p className="meta-text">Pendentes</p>
              <p className="font-display text-2xl font-semibold text-coral">
                {pendentes}
              </p>
            </div>
          </div>

          <section className="surface-panel panel-pad space-y-4">
            <h2 className="section-title">Por empresa</h2>
            {porEmpresa.length === 0 ? (
              <p className="body-text text-muted-foreground">Sem dados para exibir.</p>
            ) : (
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={porEmpresa}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="empresa" tick={{ fontSize: 12 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{
                        background: "var(--card)",
                        border: "1px solid var(--border)",
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="Aprovadas" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                    <Bar
                      dataKey="Reprovadas"
                      fill="var(--destructive)"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </section>

          <section className="surface-panel panel-pad space-y-4">
            <h2 className="section-title">Aprovadas x reprovadas</h2>
            {pizza.length === 0 ? (
              <p className="body-text text-muted-foreground">Sem decisões registradas.</p>
            ) : (
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pizza}
                      dataKey="valor"
                      nameKey="nome"
                      innerRadius="50%"
                      outerRadius="80%"
                      paddingAngle={2}
                    >
                      {pizza.map((fatia) => (
                        <Cell key={fatia.nome} fill={fatia.cor} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: "var(--card)",
                        border: "1px solid var(--border)",
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
