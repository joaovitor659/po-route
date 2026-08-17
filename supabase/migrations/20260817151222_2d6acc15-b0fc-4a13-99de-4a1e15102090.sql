CREATE TYPE public.status_po AS ENUM ('pendente_aprovacao', 'aprovado', 'rejeitado', 'enviado');

CREATE TABLE public.documentos_po (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  identificador TEXT NOT NULL,
  cliente TEXT NOT NULL,
  exportador TEXT NOT NULL,
  pdf_url TEXT NOT NULL,
  status public.status_po NOT NULL DEFAULT 'pendente_aprovacao',
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  aprovado_por TEXT,
  aprovado_em TIMESTAMPTZ
);

CREATE INDEX documentos_po_status_idx ON public.documentos_po (status);
CREATE INDEX documentos_po_identificador_idx ON public.documentos_po (identificador);

GRANT SELECT, UPDATE ON public.documentos_po TO authenticated;
GRANT ALL ON public.documentos_po TO service_role;
ALTER TABLE public.documentos_po ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Autenticados podem ver documentos"
  ON public.documentos_po FOR SELECT TO authenticated USING (true);

CREATE POLICY "Autenticados podem atualizar status"
  ON public.documentos_po FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.log_aprovacoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  documento_id UUID NOT NULL REFERENCES public.documentos_po (id) ON DELETE CASCADE,
  status_anterior public.status_po,
  status_novo public.status_po NOT NULL,
  usuario TEXT NOT NULL,
  data_hora TIMESTAMPTZ NOT NULL DEFAULT now(),
  observacao TEXT
);

CREATE INDEX log_aprovacoes_documento_idx ON public.log_aprovacoes (documento_id);
CREATE INDEX log_aprovacoes_data_idx ON public.log_aprovacoes (data_hora DESC);

GRANT SELECT, INSERT ON public.log_aprovacoes TO authenticated;
GRANT ALL ON public.log_aprovacoes TO service_role;
ALTER TABLE public.log_aprovacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Autenticados podem ver o historico"
  ON public.log_aprovacoes FOR SELECT TO authenticated USING (true);

CREATE POLICY "Autenticados podem registrar decisoes"
  ON public.log_aprovacoes FOR INSERT TO authenticated WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.bloquear_alteracao_log()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'O log de aprovacoes e somente inserção';
END;
$$;

CREATE TRIGGER log_aprovacoes_imutavel
  BEFORE UPDATE OR DELETE ON public.log_aprovacoes
  FOR EACH ROW EXECUTE FUNCTION public.bloquear_alteracao_log();

INSERT INTO public.documentos_po (identificador, cliente, exportador, pdf_url, status, aprovado_por, aprovado_em) VALUES
  ('PO-2026-0148', 'Adega Central Ltda', 'Bodegas Riojanas S.A.', 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf', 'pendente_aprovacao', NULL, NULL),
  ('PO-2026-0149', 'Vinhos do Porto Imports', 'Quinta do Vale Meão', 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf', 'pendente_aprovacao', NULL, NULL),
  ('PO-2026-0145', 'Distribuidora Enoteca SP', 'Cantine Toscane S.r.l.', 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf', 'aprovado', 'gerente@empresa.com', now() - interval '2 days'),
  ('PO-2026-0142', 'Casa do Vinho RJ', 'Domaine Bordeaux SARL', 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf', 'rejeitado', 'gerente@empresa.com', now() - interval '5 days');

INSERT INTO public.log_aprovacoes (documento_id, status_anterior, status_novo, usuario, data_hora, observacao)
SELECT id, 'pendente_aprovacao', 'aprovado', 'gerente@empresa.com', now() - interval '2 days', 'Valores e volumes conferidos.'
FROM public.documentos_po WHERE identificador = 'PO-2026-0145';

INSERT INTO public.log_aprovacoes (documento_id, status_anterior, status_novo, usuario, data_hora, observacao)
SELECT id, 'pendente_aprovacao', 'rejeitado', 'gerente@empresa.com', now() - interval '5 days', 'Incoterm divergente do combinado com o exportador.'
FROM public.documentos_po WHERE identificador = 'PO-2026-0142';