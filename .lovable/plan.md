# Plano: Atualização em tempo real do contador de sugestões na LP /planodegoverno

## Contexto
O card de sugestões populares na LP `/planodegoverno` (big number na seção "O maior processo de escuta já feito para um plano de governo no Paraná") carrega o total apenas uma vez no montante da página. A home já possui um `LiveCounterCard` que consulta a mesma RPC a cada 30 segundos.

## Objetivo
Tornar o contador de sugestões da LP `/planodegoverno` atualizado em tempo real, com o mesmo comportamento da home.

## Escopo
1. Substituir a chamada única `supabase.rpc("get_sugestoes_formulario_count")` em `src/pages/MetodologiaPlano.tsx` por um `useEffect` com polling a cada 30 segundos.
2. Manter o valor base `BASE_SUGESTOES` somado ao total do banco.
3. Garantir cleanup do intervalo ao desmontar o componente.
4. Preservar a animação de contagem (`CountUp`) sem quebrar a experiência visual.

## Fora de escopo
- Não alterar a home nem o componente `LiveCounterCard`.
- Não adicionar Realtime/Supabase subscriptions; manter polling simples por RPC.
- Não modificar a lógica de backend `get_sugestoes_formulario_count`.

## Arquivos envolvidos
- `src/pages/MetodologiaPlano.tsx`

## Validação
- Typecheck sem erros.
- Screenshot da LP confirmando que o número carrega e se mantém consistente.
