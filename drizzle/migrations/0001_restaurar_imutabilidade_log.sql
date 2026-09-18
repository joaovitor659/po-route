CREATE TRIGGER log_aprovacoes_imutavel
BEFORE UPDATE OR DELETE ON public.log_aprovacoes
FOR EACH ROW EXECUTE FUNCTION public.bloquear_alteracao_log();