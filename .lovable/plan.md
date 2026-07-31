# Padronizar a contagem de cidades das sugestões populares

## O que está acontecendo
Os dois números estão certos, mas contam coisas diferentes:

- O Painel de Cruzamento conta **textos distintos** digitados no campo cidade: **292**.
- O Analytics conta apenas cidades que **casam exatamente** com a lista oficial dos 399 municípios: **267**.

A diferença (25 registros) vem de variações de digitação, e não de cidades novas. Exemplos reais encontrados: "Londrina " (com espaço), "CURITIBA-PR", "Londrina PR", "Cascavel Paraná", "Caxcavrl pr", "UniÃo Da VitÓria" (acento corrompido), "Nova esperança do sudoeste" (caixa baixa), "SANTA HELENA", "Querência Do Norte", "Matinhos litoral do Paraná", e um registro fora do estado: "São Luis - MA".

## O que será feito

1. **Normalizar os dados existentes**: corrigir os registros para o nome oficial do município (removendo espaços, sufixos "PR/Paraná", corrigindo caixa, acentos e o erro de digitação "Caxcavrl"). O registro de "São Luis - MA" é mantido como está, apenas passa a ser identificado como fora do Paraná.
2. **Evitar novas variações**: no formulário da home, gravar sempre o nome oficial escolhido na lista de municípios; se o cidadão digitar livremente, o texto é comparado sem acento/caixa/espaços com a lista e convertido para o nome oficial antes de salvar.
3. **Unificar a contagem**: os dois painéis passam a exibir a mesma métrica — municípios do Paraná reconhecidos — e o painel mostra também, em texto pequeno, quantos registros ficaram sem cidade reconhecida (fora do PR ou não identificados), para transparência.

Depois disso, tanto o Analytics quanto o Painel de Cruzamento devem mostrar o mesmo número (aprox. 285 municípios após a correção das variações).

## Detalhes técnicos
- Correção de dados (via ferramenta de dados, não migração): `UPDATE sugestoes_populares s SET municipio = m.nome FROM municipios m WHERE lower(public.unaccent(btrim(regexp_replace(s.municipio, '[ ,-]+(pr|parana|paraná)$', '', 'i')))) = lower(public.unaccent(m.nome)) AND s.municipio <> m.nome;` mais correções pontuais dos casos que não casam por regra ("Caxcavrl pr" → Cascavel, "Matinhos litoral do Paraná" → Matinhos, "UniÃo Da VitÓria" → União da Vitória, "Cascavel Paraná", "Assis Chateaubriand Paraná").
- `painel_cruzamento_resumo()`: trocar `count(distinct municipio)` por contagem de municípios com correspondência em `public.municipios`, e retornar também `total_nao_identificados`.
- `src/components/landing/home/OpinionFormCard.tsx`: resolver o valor digitado contra a lista de municípios (comparação sem acento/caixa) e enviar o `nome` oficial; se não houver correspondência, manter o texto original.
- `src/pages/AdminCruzamentoSugestoes.tsx`: exibir o novo contador e a nota de registros não identificados.
