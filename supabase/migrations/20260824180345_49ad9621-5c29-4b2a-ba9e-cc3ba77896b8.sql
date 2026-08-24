CREATE OR REPLACE FUNCTION public.hist_locais_votacao(p_ano integer, p_turno integer, p_cargo integer, p_candidato text)
 RETURNS TABLE(local_key text, nm_local text, nm_municipio text, ds_endereco text, lat double precision, lng double precision, votos bigint, total_local bigint, pct numeric)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin_master') OR public.has_role(auth.uid(), 'admin')) THEN
    RAISE EXCEPTION 'access denied';
  END IF;

  RETURN QUERY
  WITH base AS (
    SELECT r.nm_municipio, r.nr_local_votacao,
           max(r.nm_local_votacao) AS nm_local,
           max(r.ds_endereco) AS ds_endereco,
           max(r.latitude)::double precision AS lat,
           max(r.longitude)::double precision AS lng,
           sum(r.qt_votos)::bigint AS total_local,
           sum(CASE WHEN p_candidato = 'TODOS' OR r.nm_candidato = p_candidato THEN r.qt_votos ELSE 0 END)::bigint AS votos
    FROM public.resultados_secoes_historicos r
    WHERE r.ano_eleicao = p_ano AND r.num_turno = p_turno AND r.cd_cargo = p_cargo
    GROUP BY r.nm_municipio, r.nr_local_votacao
  ), fixed AS (
    SELECT b.*,
           m.latitude::double precision AS mlat,
           m.longitude::double precision AS mlng
    FROM base b
    LEFT JOIN public.municipios m
      ON upper(unaccent(m.nome)) = upper(unaccent(b.nm_municipio))
  )
  SELECT (f.nm_municipio || '-' || coalesce(f.nr_local_votacao::text, '0')) AS local_key,
         f.nm_local, f.nm_municipio, f.ds_endereco,
         CASE WHEN f.lat BETWEEN -18.3 AND -7.2 AND f.lng BETWEEN -62.0 AND -50.0 THEN f.lat ELSE f.mlat END AS lat,
         CASE WHEN f.lat BETWEEN -18.3 AND -7.2 AND f.lng BETWEEN -62.0 AND -50.0 THEN f.lng ELSE f.mlng END AS lng,
         f.votos, f.total_local,
         (f.votos * 100.0 / NULLIF(f.total_local, 0))::numeric AS pct
  FROM fixed f
  WHERE f.votos > 0
    AND (CASE WHEN f.lat BETWEEN -18.3 AND -7.2 AND f.lng BETWEEN -62.0 AND -50.0 THEN f.lat ELSE f.mlat END) IS NOT NULL;
END;
$function$;