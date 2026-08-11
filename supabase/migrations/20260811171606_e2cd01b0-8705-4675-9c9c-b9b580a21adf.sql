CREATE OR REPLACE FUNCTION public.pode_ver_painel_cruzamento()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select public.has_role(auth.uid(),'admin')
      or public.has_role(auth.uid(),'admin_master')
      or public.has_role(auth.uid(),'lider_tematico')
      or public.has_role(auth.uid(),'marketing');
$function$;