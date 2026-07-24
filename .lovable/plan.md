## Diagnóstico (confirmado)

- No banco, o contador de sugestões continua subindo (80 hoje), mas só 1 pageview foi gravado hoje (contra 331 ontem). O envio está quebrado, não é percepção.
- Testando a LP em `https://juntosparana399.com.br/` com um navegador headless, todo POST para `page_analytics_events` falha com:

  > blocked by CORS policy: Response to preflight request doesn't pass access control check: The value of the 'Access-Control-Allow-Origin' header in the response must not be the wildcard '*' when the request's credentials mode is 'include'.

- Causa: o Cloudflare passou a setar o cookie `__cf_bm` (SameSite=None; Secure) no domínio Supabase. `navigator.sendBeacon` — e o nosso fallback `fetch(..., { keepalive: true })` sem `credentials` explícito — passaram a enviar esse cookie, o que força modo credenciado. O preflight do PostgREST devolve `Access-Control-Allow-Origin: *`, e o browser bloqueia a requisição. Sugestões via `supabase-js` seguem funcionando porque a lib envia `Authorization` e força o Supabase a responder com origin específico.
- Como só `pageview`/`engagement`/`session_end` usam o beacon, o dashboard congelou nos ~1.534 acumulados até ontem enquanto sugestões seguiram entrando.

## Escopo da correção

Arquivo único: `src/hooks/useAnalytics.tsx`.

- Substituir `navigator.sendBeacon` pelo `fetch(..., { method: 'POST', mode: 'cors', credentials: 'omit', keepalive: true })`, mantendo `apikey` + `Authorization: Bearer <anon>` nos headers. `keepalive` permite sobreviver a fechamento de aba (limite 64 KB, suficiente).
- Aplicar o mesmo em `sendEventBeacon` (pageview, click, share, form_submit, component_view) e nos disparos de `engagement`, `session_end` e heartbeat.
- Manter todo o restante da lógica (visitor_id, sessão, throttle de scroll, heartbeat 30s, listeners de `visibilitychange`/`pagehide`/`beforeunload`) intocada.

Nenhuma alteração de schema, RLS ou UI. Sem toques no `AdminAnalytics`.

## Validação

1. Após o deploy, abrir a home e confirmar no DevTools → Network que os POSTs para `page_analytics_events` retornam **201** (sem erro de CORS).
2. Rodar no banco:
   ```
   select count(*) filter (where event_type='pageview')
   from page_analytics_events
   where created_at > now() - interval '1 hour';
   ```
   O número deve crescer conforme visitas reais.
3. Verificar `/admin/analytics` (janela 24h) — visualizações voltam a acompanhar as sugestões.

## Observações

- Os ~1.500 pageviews "perdidos" hoje não podem ser recuperados; a partir do fix a contagem volta ao normal.
- Vale, num passo seguinte (não incluso aqui), avaliar retirar o `Meta CSP frame-ancestors` do `<meta>` (é ignorado pelo browser) e mover para o header no host, mas isso é cosmético e não afeta o bug.
