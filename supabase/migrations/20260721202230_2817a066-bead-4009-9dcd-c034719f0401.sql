CREATE OR REPLACE FUNCTION public.check_sugestao_rate_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count_email INT;
  v_count_texto_igual INT;
BEGIN
  IF NEW.email IS NOT NULL AND trim(NEW.email) <> '' THEN
    SELECT count(*) INTO v_count_email
    FROM public.sugestoes_populares
    WHERE email = NEW.email
      AND created_at > now() - interval '2 minutes';

    IF v_count_email >= 3 THEN
      RAISE EXCEPTION 'Muitas sugestões enviadas recentemente com este e-mail. Aguarde alguns minutos e tente novamente.';
    END IF;
  END IF;

  SELECT count(*) INTO v_count_texto_igual
  FROM public.sugestoes_populares
  WHERE descricao = NEW.descricao
    AND created_at > now() - interval '1 minute';

  IF v_count_texto_igual >= 2 THEN
    RAISE EXCEPTION 'Esta sugestão parece ter sido enviada repetidamente em um curto período. Aguarde um instante e tente novamente.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS before_sugestao_rate_limit ON public.sugestoes_populares;

CREATE TRIGGER before_sugestao_rate_limit
BEFORE INSERT ON public.sugestoes_populares
FOR EACH ROW
EXECUTE FUNCTION public.check_sugestao_rate_limit();