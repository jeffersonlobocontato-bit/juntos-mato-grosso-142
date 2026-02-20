
# Corrigir Listas Suspensas no Formulario Publico

## Problema Identificado

As politicas de seguranca (RLS) das tabelas `municipios`, `eixos_tematicos` e `temas` estao configuradas para permitir SELECT apenas para usuarios **autenticados** (`authenticated`). Como o formulario de sugestao e publico e acessado sem login, o usuario anonimo nao consegue ler os dados, resultando em listas vazias.

**Evidencia**: As requisicoes a API retornam `[]` (arrays vazios) apesar de existirem 399 municipios, 5 eixos e 34 temas no banco.

## Solucao

Atualizar as politicas RLS de SELECT das tres tabelas para incluir o role `anon`, permitindo que visitantes nao autenticados visualizem os dados de referencia.

---

## Detalhes Tecnicos

Executar uma migracao SQL que:

1. **Remove** as politicas de SELECT existentes (que estao restritas a `authenticated`)
2. **Recria** as mesmas politicas sem restricao de role, permitindo acesso tanto por `anon` quanto por `authenticated`

Tabelas afetadas:
- `municipios` — lista de 399 municipios do Parana
- `eixos_tematicos` — 5 eixos tematicos
- `temas` — 34 temas agrupados por eixo

As politicas de gerenciamento (ALL) para admins permanecem inalteradas.

SQL a executar:

```sql
DROP POLICY "Anyone can view municipios" ON municipios;
CREATE POLICY "Anyone can view municipios" ON municipios FOR SELECT USING (true);

DROP POLICY "Anyone can view eixos" ON eixos_tematicos;
CREATE POLICY "Anyone can view eixos" ON eixos_tematicos FOR SELECT USING (true);

DROP POLICY "Anyone can view temas" ON temas;
CREATE POLICY "Anyone can view temas" ON temas FOR SELECT USING (true);
```

Nenhuma alteracao de codigo e necessaria — o componente `SuggestionForm` ja esta correto. O problema e exclusivamente de permissao no banco de dados.
