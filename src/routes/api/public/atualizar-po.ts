// Atualiza uma PO JÁ APROVADA, substituindo o PDF por uma versão corrigida.
// Não cria documento novo, não volta para a fila de aprovação e NÃO dispara
// nenhum webhook/notificação de aprovação. Protegido pelo header "x-po-secret".
import { createFileRoute } from "@tanstack/react-router";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export const Route = createFileRoute("/api/public/atualizar-po")({
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

        if (!identificador || (!pdf_url && !pdf_base64)) {
          return json(
            {
              error: "Campos obrigatórios: identificador e pdf_url ou pdf_base64",
            },
            400,
          );
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const { data: existente, error: buscaError } = await supabaseAdmin
          .from("documentos_po")
          .select("*")
          .eq("identificador", String(identificador))
          .order("criado_em", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (buscaError) return json({ error: buscaError.message }, 500);
        if (!existente) {
          return json(
            { error: "Nenhuma PO encontrada com esse identificador" },
            404,
          );
        }

        const jaAprovada = existente.status === "aprovado" || existente.status === "enviado";
        if (!jaAprovada) {
          return json(
            {
              error:
                "Esta PO ainda não foi aprovada. Use /api/public/criar-po-pendente ou aguarde a aprovação.",
              status_atual: existente.status,
            },
            409,
          );
        }

        let urlFinal = pdf_url ? String(pdf_url) : existente.pdf_url;

        if (pdf_base64) {
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

          const { data: signed, error: signedError } = await supabaseAdmin.storage
            .from("po-pdfs")
            .createSignedUrl(caminho, 60 * 60 * 24 * 365 * 10);
          if (signedError || !signed?.signedUrl) {
            return json({ error: signedError?.message ?? "Falha ao gerar URL do PDF" }, 500);
          }
          urlFinal = signed.signedUrl;
        }

        const agora = new Date().toISOString();
        const { data, error } = await supabaseAdmin
          .from("documentos_po")
          .update({
            pdf_url: urlFinal,
            atualizado_em: agora,
            ...(cliente ? { cliente: String(cliente) } : {}),
            ...(exportador ? { exportador: String(exportador) } : {}),
          })
          .eq("id", existente.id)
          .select()
          .single();

        if (error) return json({ error: error.message }, 500);

        return json({ ok: true, documento: data });
      },
    },
  },
});
