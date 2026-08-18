ALTER TABLE public.documentos_po
  ADD COLUMN IF NOT EXISTS arquivado_em timestamp with time zone,
  ADD COLUMN IF NOT EXISTS arquivado_por text;