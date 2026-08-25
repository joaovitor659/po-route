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

        const { identificador, cliente, exportador, pdf_url, pdf_base64 } = (body ??
          {}) as Record<string, unknown>;
        if (!identificador || !cliente || !exportador || (!pdf_url && !pdf_base64)) {
          return json(
            {
              error:
                "Campos obrigatórios: identificador, cliente, exportador e pdf_url ou pdf_base64",
            },
            400,
          );
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        let urlFinal = pdf_url ? String(pdf_url) : "";

        if (pdf_base64) {
          // Aceita data URL ("data:application/pdf;base64,....") ou base64 puro
          const limpo = String(pdf_base64).replace(/^data:[^;]*;base64,/, "").replace(/\s/g, "");
          let bytes: Uint8Array;
          try {
            const bin = atob(limpo);
            bytes = new Uint8Array(bin.length);
            for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
          } catch {
            return json({ error: "pdf_base64 inválido" }, 400);
          }

          const caminho = `${String(identificador)}.pdf`;
          const { error: uploadError } = await supabaseAdmin.storage
            .from("po-pdfs")
            .upload(caminho, bytes, { contentType: "application/pdf", upsert: true });
          if (uploadError) return json({ error: uploadError.message }, 500);

          // Bucket privado: gera URL assinada de longa duração para o preview no app
          const { data: signed, error: signedError } = await supabaseAdmin.storage
            .from("po-pdfs")
            .createSignedUrl(caminho, 60 * 60 * 24 * 365 * 10);
          if (signedError || !signed?.signedUrl) {
            return json({ error: signedError?.message ?? "Falha ao gerar URL do PDF" }, 500);
          }
          urlFinal = signed.signedUrl;
        }

        const { data, error } = await supabaseAdmin
          .from("documentos_po")
          .insert({
            identificador: String(identificador),
            cliente: String(cliente),
            exportador: String(exportador),
            pdf_url: urlFinal,
          })
          .select()
          .single();

        if (error) return json({ error: error.message }, 500);

        return json({ ok: true, documento: data });

      },
    },
  },
});
