CREATE OR REPLACE FUNCTION public.get_inactive_users(hours_threshold integer DEFAULT 48)
 RETURNS TABLE(user_id uuid, full_name text, email text, last_activity_at timestamp with time zone, hours_inactive integer, roles text[])
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT (
    auth.role() = 'service_role'
    OR public.is_admin(auth.uid())
    OR public.has_role(auth.uid(), 'lider_tematico'::app_role)
  ) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  RETURN QUERY
  SELECT 
    p.id,
    p.full_name,
    p.email,
    COALESCE(ua.last_activity_at, p.created_at),
    (EXTRACT(EPOCH FROM (now() - COALESCE(ua.last_activity_at, p.created_at)))::integer / 3600),
    ARRAY_AGG(ur.role::text)
  FROM public.profiles p
  LEFT JOIN public.user_activity ua ON ua.user_id = p.id
  LEFT JOIN public.user_roles ur ON ur.user_id = p.id
  WHERE ur.role IN ('especialista', 'lider_tematico', 'curador_municipal')
  GROUP BY p.id, p.full_name, p.email, ua.last_activity_at, p.created_at
  HAVING EXTRACT(EPOCH FROM (now() - COALESCE(ua.last_activity_at, p.created_at)))::integer / 3600 >= hours_threshold
  ORDER BY 5 DESC;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_stale_proposals(hours_threshold integer DEFAULT 48)
 RETURNS TABLE(proposta_id uuid, titulo text, status text, etapa integer, responsavel_id uuid, responsavel_email text, responsavel_nome text, eixo_id uuid, eixo_nome text, municipio_id uuid, municipio_nome text, hours_stale integer, updated_at timestamp with time zone, created_at timestamp with time zone)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT (
    auth.role() = 'service_role'
    OR public.is_admin(auth.uid())
  ) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  RETURN QUERY
  SELECT 
    p.id,
    p.titulo,
    p.status::text,
    p.etapa,
    COALESCE(p.lider_responsavel_id, p.autor_id),
    pr.email,
    pr.full_name,
    p.eixo_id,
    e.nome,
    p.municipio_id,
    m.nome,
    (EXTRACT(EPOCH FROM (now() - p.updated_at))::integer / 3600),
    p.updated_at,
    p.created_at
  FROM public.propostas_tecnicas p
  LEFT JOIN public.profiles pr ON pr.id = COALESCE(p.lider_responsavel_id, p.autor_id)
  LEFT JOIN public.eixos_tematicos e ON e.id = p.eixo_id
  LEFT JOIN public.municipios m ON m.id = p.municipio_id
  WHERE p.status NOT IN ('aprovada')
    AND EXTRACT(EPOCH FROM (now() - p.updated_at))::integer / 3600 >= hours_threshold
  ORDER BY 12 DESC;
END;
$function$;

CREATE OR REPLACE FUNCTION public.match_document_chunks(query_embedding extensions.vector, match_threshold double precision DEFAULT 0.5, match_count integer DEFAULT 10, filter_doc_ids uuid[] DEFAULT '{}'::uuid[])
 RETURNS TABLE(id uuid, document_id uuid, content text, chunk_index integer, similarity double precision)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT (
    auth.role() = 'service_role'
    OR public.is_admin(auth.uid())
    OR public.has_role(auth.uid(), 'lider_tematico'::app_role)
  ) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  RETURN QUERY
  SELECT
    adc.id,
    adc.document_id,
    adc.content,
    adc.chunk_index,
    1 - (adc.embedding OPERATOR(extensions.<=>) query_embedding)::float AS similarity
  FROM public.ai_document_chunks adc
  WHERE
    (array_length(filter_doc_ids, 1) IS NULL OR adc.document_id = ANY(filter_doc_ids))
    AND adc.embedding IS NOT NULL
    AND 1 - (adc.embedding OPERATOR(extensions.<=>) query_embedding)::float > match_threshold
  ORDER BY adc.embedding OPERATOR(extensions.<=>) query_embedding
  LIMIT match_count;
END;
$function$;