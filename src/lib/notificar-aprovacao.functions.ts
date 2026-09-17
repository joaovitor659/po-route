import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const N8N_WEBHOOK_URL = "https://techvissimo.app.n8n.cloud/webhook/vissimo-po-aprovada";

export const notificarPoAprovada = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ identificador: z.string().min(1) }).parse(data))
  .handler(async ({ data }) => {
    try {
      const resposta = await fetch(N8N_WEBHOOK_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-approval-secret": process.env["N8N_APPROVAL_SECRET"]!,
        },
        body: JSON.stringify({ identificador: data.identificador, status: "aprovado" }),
      });
      if (!resposta.ok) {
        console.error(
          `[n8n] Falha ao notificar aprovação da PO ${data.identificador}: HTTP ${resposta.status}`,
        );
      }
    } catch (erro) {
      console.error(`[n8n] Erro ao notificar aprovação da PO ${data.identificador}:`, erro);
    }
    // Fire-and-forget: nunca propaga erro para a interface.
    return { ok: true };
  });
