## Diagnóstico

Os logs do banco mostram erros recorrentes ao tentar inserir propostas:

```
ERROR: invalid input syntax for type uuid: ""
```

(8 ocorrências nos últimos minutos, batendo com o relato dos usuários)

A causa está em `src/components/entrevista/EntrevistaForm.tsx`:

1. No `handleSubmit` (linhas 454-469), os campos `eixo_id` e `municipio_id` são enviados **diretamente** do estado, sem coerção de string vazia para `null`. Se qualquer um estiver `""`, o Postgres rejeita com o erro acima.
2. A validação `validateCurrentStep` faz `if (isAdminMaster) return true;` no início (linha 364) — usuários `admin_master` (e potencialmente o entrevistador institucional em alguns fluxos) **pulam** a checagem de campos obrigatórios e conseguem chegar à submissão com IDs vazios.
3. Na LP institucional, o eixo pode vir "trancado" via `setEixoId` automático (linha 348). Se o usuário não tem eixo atribuído (`user_eixos`), o estado fica `""` e nunca é validado por causa do bypass acima.
4. `tema_id` já tem fallback `temaId || null`, mas `subtema_id` usa `subtemaIds[0]` direto — se vier `""` no array, mesmo problema.

## Plano de correção

Arquivo: `src/components/entrevista/EntrevistaForm.tsx`

1. **Sanitizar UUIDs no `insertData`** — converter `""` → `null` para `eixo_id`, `municipio_id`, `tema_id`, `subtema_id`, `lider_responsavel_id`. Helper simples `toUuidOrNull(v)`.

2. **Validar campos obrigatórios mesmo para admin_master** na etapa 0 (município + eixo + tema). O bypass total é perigoso; manter apenas para etapas de questionário se necessário, mas exigir os IDs base sempre.

3. **Bloquear submissão** caso `eixo_id` ou `municipio_id` resultem em `null` após sanitização, com toast claro ("Selecione município e eixo antes de registrar").

4. **Smoke test** após o fix: simular submissão na LP `/entrevista` (institucional) com campos preenchidos e verificar nos logs do Postgres que o insert retorna sucesso.

## Detalhes técnicos

```ts
const toUuidOrNull = (v?: string | null) =>
  v && v.trim().length > 0 ? v : null;

const insertData: any = {
  autor_id: user.id,
  lider_responsavel_id: user.id,
  eixo_id: toUuidOrNull(eixoId),
  tema_id: toUuidOrNull(temaId),
  subtema_id: subtemaIds.length === 1 ? toUuidOrNull(subtemaIds[0]) : null,
  municipio_id: toUuidOrNull(municipioId),
  // ...resto igual
};

if (!insertData.eixo_id || !insertData.municipio_id) {
  toast.error("Selecione município e eixo antes de registrar.");
  setIsSubmitting(false);
  return;
}
```

E na validação:

```ts
const validateCurrentStep = (): boolean => {
  // Campos-chave sempre obrigatórios, mesmo para admin_master
  if (currentStep === 0) {
    if (isInstitucional) { /* checks institucionais */ }
    if (!municipioId) { toast.error("Selecione o município"); return false; }
    if (!eixoId)      { toast.error("Selecione o eixo temático"); return false; }
    if (!temaId)      { toast.error("Selecione o tema"); return false; }
  }
  if (isAdminMaster) return true; // bypass apenas das etapas seguintes
  // ...resto da lógica atual
};
```

Sem mudanças de schema, sem migração, sem alteração no fluxo de anexos (que já está funcional).
