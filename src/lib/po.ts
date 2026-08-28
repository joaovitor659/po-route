export type StatusPO = "pendente_aprovacao" | "aprovado" | "rejeitado" | "enviado";

export const STATUS_ORDEM: StatusPO[] = [
  "pendente_aprovacao",
  "aprovado",
  "rejeitado",
  "enviado",
];

export const STATUS_LABEL: Record<StatusPO, string> = {
  pendente_aprovacao: "Pendente de aprovação",
  aprovado: "Aprovado",
  rejeitado: "Reprovado",
  enviado: "Enviado",
};

export type Empresa = "Evino" | "Grand Cru" | "Outras";

export const EMPRESAS: Empresa[] = ["Evino", "Grand Cru", "Outras"];

export function empresaDoCliente(cliente: string): Empresa {
  const texto = cliente.toLowerCase().replace(/[^a-z]/g, "");
  if (texto.includes("evino") || texto.includes("evinocomercio")) return "Evino";
  if (texto.includes("grandcru")) return "Grand Cru";
  return "Outras";
}

export type DocumentoPO = {
  id: string;
  identificador: string;
  cliente: string;
  exportador: string;
  pdf_url: string;
  status: StatusPO;
  criado_em: string;
  aprovado_por: string | null;
  aprovado_em: string | null;
  arquivado_em: string | null;
  arquivado_por: string | null;
};

export type LogAprovacao = {
  id: string;
  documento_id: string;
  status_anterior: StatusPO | null;
  status_novo: StatusPO;
  usuario: string;
  data_hora: string;
  observacao: string | null;
};

export function formatarDataHora(valor: string | null): string {
  if (!valor) return "—";
  return new Date(valor).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
