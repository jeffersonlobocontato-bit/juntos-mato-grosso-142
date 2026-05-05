ns# Plano de Hardening de Segurança — Execução por Fases

Cada fase é independente, reversível e exige **aprovação explícita** antes de iniciar a próxima. Nenhuma fase apaga ou altera dados de negócio.

---

## Fase 1 — Ganhos imediatos sem risco
**Impacto em usuários:** nenhum. **Impacto em dados:** nenhum.

1. **Headers de segurança** em `index.html`:
   - `Content-Security-Policy` (com allowlist para Supabase, Mapbox, Lovable, Google Fonts, Resend)
   - `X-Frame-Options: DENY`
   - `X-Content-Type-Options: nosniff`
   - `Referrer-Policy: strict-origin-when-cross-origin`
2. **Habilitar HIBP** (Leaked Password Protection) no Auth via `configure_auth`.
3. **Documentar restrição do token Mapbox por domínio** (instrução para o usuário aplicar no painel Mapbox — não muda código).

**Validação:** abrir LP, dashboard, chatbot, mapa, AI Hub e formulários. Confirmar que nada quebra. Rodar `supabase--linter` para confirmar HIBP ✅.

🛑 **Aprovação antes da Fase 2.**

---

## Fase 2 — Centralizar proteção de rotas admin
**Impacto:** transparente para usuários legítimos.

1. Criar `src/components/auth/ProtectedRoute.tsx` aceitando `requiredRoles?: AppRole[]`.
2. Em `src/App.tsx`, envolver **todas** as rotas `/admin/*` com `<ProtectedRoute requiredRoles={[...]}>`.
3. Manter os redirects atuais nas páginas como fallback (defesa em profundidade).

**Validação:** logar como cada role (admin, admin_master, lider_tematico, curador_municipal, especialista) e confirmar que cada um vê o que via antes. Tentar `/admin/usuarios` deslogado → redireciona para `/auth`.

🛑 **Aprovação antes da Fase 3.**

---

## Fase 3 — Audit triggers em tabelas sensíveis
**Impacto:** apenas adiciona registros em `audit_logs`. Sem impacto em performance perceptível.

1. Migration anexando `audit_trigger_func` (já existe) às tabelas:
   - `user_roles`
   - `user_eixos`
   - `user_municipios`
   - `profiles` (UPDATE apenas)
2. Não tocar em tabelas de alto volume (analytics, votos, chunks).

**Validação:** alterar uma role em `/admin/usuarios` e conferir entrada em `audit_logs`.

🛑 **Aprovação antes da Fase 4.**

---

## Fase 4 — REVOKE em funções SECURITY DEFINER de leitura sensível
**Impacto:** chamadas RPC dessas funções pelo frontend deixam de funcionar para roles não autorizadas — requer auditoria de uso antes.

1. Mapear chamadas atuais via `rg "supabase.rpc\("` no projeto.
2. Para cada função sensível (`get_inactive_users`, `get_stale_proposals`, `match_document_chunks`, `get_shared_presentation_public`):
   - Decidir entre **REVOKE EXECUTE FROM anon** (mantém authenticated) ou restringir a admin via wrapper.
3. **Não** mexer em utilitárias de RLS (`has_role`, `is_admin`, `update_updated_at_column`, triggers).
4. Resolver a **SECURITY DEFINER VIEW** apontada pelo linter (identificar e converter para INVOKER ou ajustar RLS das tabelas-base).

**Validação:** `supabase--linter` deve cair de 37 para ~10 issues. Testar Meu Painel, Mensageria, Apresentações compartilhadas públicas, RAG search.

🛑 **Aprovação antes da Fase 5.**

---

## Fase 5 — Endurecer Edge Functions
**Impacto:** maior risco de quebrar fluxos públicos se mal classificado. Faremos uma por vez.

**Classificação proposta:**

| Função | Tipo | Ação |
|---|---|---|
| `chat-rota399`, `analyze-suggestion`, `geolocate-visitor` | Pública (LP) | Manter `verify_jwt=false` + adicionar Zod + rate-limit por IP |
| `ai-hub-chat`, `plano-governo-ai`, `evaluate-proposal`, `process-pesquisa`, `process-document-chunks` | Autenticada | Validar JWT via `getClaims()` + checar role admin/lider |
| `admin-create-user`, `admin-delete-user`, `seed-test-users` | Admin master | Já validam — apenas auditar |
| `tse-import`, `tse-process-csv`, `tse-process-totalizacao`, `tse-auto-download`, `proposal-stale-alert` | Admin/cron | Validar role admin ou header secreto de cron |

**Execução:** uma função por commit, com teste via `curl_edge_functions` antes de aprovar a próxima.

🛑 **Aprovação antes da Fase 6.**

---

## Fase 6 — Storage e formulários públicos
**Impacto:** pode afetar listagens no admin.

1. **Buckets `ai-documents` e `proposta-anexos`:** restringir política de SELECT em `storage.objects` para exigir autenticação **na listagem** (URLs diretas de download continuam públicas).
2. **Captcha invisível** (Cloudflare Turnstile) em:
   - Formulário de sugestões populares
   - Formulário de leads do chatbot
   - Entrevista institucional pública
3. Validação server-side de tamanho/sanitização nos campos textuais longos (descricao, conteudo_completo) — aplicar memória `Security Limits`.

**Validação:** upload de anexo continua funcionando, listagem no AdminBiblioteca continua funcionando (autenticada), formulários públicos continuam aceitando submissões legítimas.

🛑 **Fim do plano — re-rodar auditoria completa.**

---

## Reversão

Cada fase é uma migration/commit isolado. Em caso de problema, basta usar a aba **History** do Lovable para reverter para o ponto antes da fase.

<lov-actions>
  <lov-open-history>View History</lov-open-history>
</lov-actions>

---

## Próximo passo

Aprovar este plano libera **apenas a Fase 1**. Ao final dela, apresentarei um resumo e pedirei nova aprovação para a Fase 2.