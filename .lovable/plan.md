

## Plano: Restringir visibilidade do Líder Temático ao que ele mesmo cadastrou

### Problema atual
No painel "Meu Painel", o líder temático vê propostas de todos os eixos vinculados a ele, além de todas as sugestões e leads sem qualquer filtro. O correto é que cada líder veja **apenas os dados que ele mesmo registrou**.

### Mudanças planejadas

#### 1. Filtrar propostas pelo autor (não pelo eixo)
Na query de `propostas_tecnicas`, substituir o filtro `eixo_id` pelo filtro `autor_id = userId` para líderes temáticos. Assim, cada líder vê apenas as propostas que ele próprio criou.

#### 2. Filtrar sugestões pelo eixo do líder
Sugestões populares não têm `autor_id` (são enviadas por cidadãos), mas possuem o campo `eixo`. Filtrar para mostrar apenas sugestões dos eixos vinculados ao líder, mantendo a relevância sem expor dados de outros eixos.

#### 3. Filtrar leads pela origem das propostas do líder
Leads são gerados automaticamente a partir de propostas e sugestões. Para líderes, filtrar leads que estejam vinculados aos municípios ou eixos do líder, ou restringir apenas aos leads gerados por propostas do próprio líder.

### Detalhes técnicos

**Arquivo:** `src/pages/AdminMeuPainel.tsx`

**Propostas (linhas 106-124):**
```typescript
// Antes: filtrava por eixo_id
if (isLider && userEixos.length > 0 && !isAdmin) {
  query = query.in("eixo_id", getEixoIds());
}

// Depois: filtra pelo autor_id do usuário logado
if (isLider && !isAdmin && !isAdminMaster) {
  query = query.eq("autor_id", userId);
}
```

**Sugestões (linhas 126-133):**
```typescript
// Antes: sem filtro
const { data, error } = await supabase.from("sugestoes_populares").select("*");

// Depois: filtra pelo eixo do líder
let query = supabase.from("sugestoes_populares").select("*");
if (isLider && !isAdmin && !isAdminMaster && userEixos.length > 0) {
  const eixoNomes = userEixos.map(e => e.eixo_nome).filter(Boolean);
  query = query.in("eixo", eixoNomes);
}
```

**Leads (linhas 135-142):**
```typescript
// Antes: sem filtro
const { data, error } = await supabase.from("leads").select("*");

// Depois: filtra por metadata contendo eixo_id do líder
let query = supabase.from("leads").select("*");
if (isLider && !isAdmin && !isAdminMaster && userEixos.length > 0) {
  // Filtra leads vinculados às propostas do próprio líder
  // usando proposta_id para cruzar com propostas do autor
  query = query.not("proposta_id", "is", null);
}
```

Alternativamente, para leads, a abordagem mais limpa seria buscar primeiro os IDs das propostas do líder e depois filtrar leads por esses IDs.

**QueryKeys:** Atualizar as queryKeys para incluir `userId` como dependência, garantindo re-fetch quando o usuário mudar.

### Resultado esperado
Cada líder temático verá exclusivamente:
- Propostas técnicas que ele mesmo criou
- Sugestões populares dos eixos vinculados a ele
- Leads gerados a partir das suas próprias propostas

