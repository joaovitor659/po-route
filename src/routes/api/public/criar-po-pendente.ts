// Recebe uma PO recém-gerada pelo n8n/Make e grava na fila de aprovação
// (tabela public.documentos_po) com privilégio de service role no servidor —
// o n8n nunca vê essa chave. Protegido pelo header "x-po-secret".
import { createFileRoute } from "@tanstack/react-router";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export const Route = createFileRoute("/api/public/criar-po-pendente")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secretEsperado = process.env["PO_INGEST_SECRET"];
        const secretRecebido = request.headers.get("x-po-secret");
        if (!secretEsperado || secretRecebido !== secretEsperado) {
          return json({ error: "Não autorizado" }, 401);
        }

        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return json({ error: "JSON inválido" }, 400);
        }

        const { identificador, cliente, exportador, pdf_url } = (body ?? {}) as Record<
          string,
          unknown
        >;
        if (!identificador || !cliente || !exportador || !pdf_url) {
          return json(
            {
              error:
                "Campos obrigatórios: identificador, cliente, exportador, pdf_url",
            },
            400,
          );
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data, error } = await supabaseAdmin
          .from("documentos_po")
          .insert({
            identificador: String(identificador),
            cliente: String(cliente),
            exportador: String(exportador),
            pdf_url: String(pdf_url),
          })
          .select()
          .single();

        if (error) return json({ error: error.message }, 500);

        return json({ ok: true, documento: data });
      },
    },
  },
});
