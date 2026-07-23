## Diagnóstico

O painel `/admin/analytics` **está contando corretamente o que existe no banco**. Confirmei hora a hora consultando `page_analytics_events` direto no Postgres:

- Hoje (23/07, até 11h SP): **203** pageviews na Home, **195** visitantes únicos
- Ontem (22/07): **903** pageviews Home / 843 visitantes únicos
- Ontem até 11h SP: ~495 pageviews (mais que o dobro do ritmo de hoje)

Ou seja, a queda que você vê no dashboard **existe de verdade nos dados brutos** — não é bug de leitura, paginação, fuso ou de limite do PostgREST.

Mas isso não fecha a pergunta "por que caiu tanto se tem tráfego pago rodando". Auditando o tracker, identifiquei uma causa técnica que **subconta tráfego pago de forma consistente** — clique em anúncio → landing → bounce em 1–3 s. Ela não explica sozinha uma queda de dia para dia, mas explica por que o número que chega no banco é sempre menor do que o painel do Meta/Google Ads reporta.

### Causa técnica da subcontagem (código atual)

Em `src/hooks/useAnalytics.tsx`, o `trackPageview` faz:

```
1. await getGeoLocation()   ← chama Edge Function geolocate-visitor (rede)
2. await supabase.from('page_analytics_events').insert(...)  ← insert padrão via fetch
```

Problemas para tráfego pago (mobile, in-app browser do Instagram/Facebook, conexão lenta):

- O `await` da Edge Function bloqueia o insert. Se a pessoa fecha a aba antes da resposta voltar, o pageview **nunca é gravado**.
- O insert é `fetch` padrão, não `sendBeacon`. Fetch em curso é abortado quando a aba é fechada. `sendBeacon` só está sendo usado no `session_end`, nunca no pageview.
- In-app browsers (Instagram/Facebook) frequentemente entram em "webview efêmero": localStorage é volátil, cada view vira um `visitor_id` novo → explica também por que `visitantes ≈ pageviews` (praticamente 1 view por visitante).
- Se `geolocate-visitor` falhar ou demorar por qualquer motivo momentâneo, uma janela inteira de pageviews desaparece.

### Segunda hipótese (a validar)

Discrepância entre "reportado pelo Meta Ads" e "chegou no banco" é normal (10–30%). Se a diferença estiver acima disso, o gargalo é o item acima. Se estiver dentro disso, a queda de acessos é **real** (fadiga de criativo, saldo/pausa da campanha, mudança de segmentação) e o diagnóstico é de mídia, não de código.

## Correção proposta

Deixar o dashboard como está (números são fiéis ao banco) e **endurecer o tracker** para capturar pageviews de bounce.

1. **`src/hooks/useAnalytics.tsx` — `trackPageview` resiliente**
   - Disparar o insert do pageview **imediatamente**, sem esperar `getGeoLocation()`.
   - Usar `navigator.sendBeacon` como método primário para o pageview inicial (mesmo padrão que já está no `session_end`). Fallback para `fetch` com `keepalive: true` quando `sendBeacon` não estiver disponível.
   - Enviar geolocalização em um segundo evento (`geo_enrich`) ou pular quando a página fecha rápido — nunca bloquear o pageview por causa dela.
   - Manter o `visitor_id` no localStorage, mas gravar também em cookie de 1º-party (fallback para in-app browsers que perdem localStorage entre sessões).

2. **Validação end-to-end**
   - Após o deploy, esperar 24 h e comparar:
     - Pageviews da Home no `/admin/analytics`
     - Pageviews reportados pelo Meta Pixel (Gerenciador de Eventos)
   - Diferença esperada: < 15%. Se continuar alta, o problema é bloqueador/adblock, não código nosso.

3. **Guard-rail no painel**
   - Adicionar em `AdminAnalytics.tsx` uma nota discreta no card "Acessos da LP Home" indicando que o número reflete apenas quem carregou a página tempo suficiente para o tracker disparar (subestima 10–20% do tráfego pago).

## Fora do escopo

- Migrar tracking para uma Edge Function dedicada com fila (mais robusto, mas requer refactor grande).
- Adicionar consent banner LGPD (hoje não bloqueia, mas se for exigência jurídica pode mudar o comportamento).

## Verificação

- Abrir `/admin/analytics` → confirmar que os números atuais **são** os do banco (já validado no diagnóstico).
- Depois da correção do tracker: abrir a home em rede lenta (DevTools throttling "Slow 3G"), fechar a aba antes de 2 s, conferir que o pageview aparece em `page_analytics_events` mesmo assim.
