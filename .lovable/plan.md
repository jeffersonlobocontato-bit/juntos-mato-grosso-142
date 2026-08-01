# Perfil demográfico das sugestões populares (inferido por IA)

Faixa etária, gênero e renda não são rastreáveis pelo navegador nem constam do formulário atual. A solução será **inferir** esses atributos a partir do que já temos: primeiro nome, texto da sugestão e município — sem adicionar nenhum campo novo à LP e sem aumentar o atrito de conversão.

## O que será inferido

| Atributo | Como | Confiança |
|---|---|---|
| Gênero | Primeiro nome (dicionário de nomes brasileiros + IA para casos ambíguos) | Alta (~92% dos nomes brasileiros são inequívocos) |
| Faixa etária | Sinais de linguagem e contexto do texto ("meu neto", "faculdade", "aposentadoria", "creche", gírias, formalidade) | Média — só será gravada quando a IA tiver sinal claro |
| Renda | Faixa média do município (proxy socioeconômico territorial) | Baixa — indicativa, nunca individual |

Faixas usadas:
- **Gênero:** masculino, feminino, indeterminado
- **Faixa etária:** 16-24, 25-34, 35-44, 45-59, 60+, indeterminado
- **Renda (proxy municipal):** baixa, média-baixa, média, média-alta

Cada registro grava também um **nível de confiança** e a **origem** (`ia_nome`, `ia_texto`, `proxy_municipio`), para que nenhuma análise trate estimativa como dado declarado.

## Como vai funcionar

1. **Nova tabela** de perfil demográfico ligada a cada sugestão (1:1), com acesso restrito a admin e líder temático — os dados não ficam expostos publicamente.
2. **Nova Edge Function** de enriquecimento que recebe um lote de sugestões, monta o prompt com nome + texto + município e devolve gênero, faixa etária e confiança em JSON estruturado.
3. **Disparo automático** a cada nova sugestão enviada na LP, em segundo plano — o cidadão não percebe e o envio não fica mais lento.
4. **Backfill histórico** das ~1.660 sugestões já cadastradas, processado em lotes com botão de reprocessamento no painel.
5. **Novo bloco no Painel de Cruzamento** (`/admin/cruzamento-sugestoes`): cards de cobertura, distribuição por gênero, pirâmide de faixa etária, renda por região e o cruzamento mais valioso — **eixo temático × perfil demográfico** (ex.: quem fala de segurança vs. quem fala de saúde).

## Ressalvas importantes

- São **estimativas estatísticas**, úteis em agregado (leitura de público, segmentação de campanha) e não confiáveis individualmente. A interface deixará isso explícito em cada gráfico.
- Renda é o atributo mais frágil: é o retrato do município, não da pessoa. Pode ser removida se preferir manter só gênero e faixa etária.
- LGPD: os dados inferidos são de uso interno, não são divulgados publicamente nem compartilhados, seguindo a mesma política já declarada no formulário.
- Se depois quiser precisão real, o caminho é uma pergunta opcional no pós-envio (tela de agradecimento) — pode ser adicionada sem refazer nada disto.

## Detalhes técnicos

- **Tabela** `sugestao_perfil_demografico`: `sugestao_id` (FK única), `genero`, `faixa_etaria`, `renda_estimada`, `confianca_genero`, `confianca_faixa_etaria`, `origem`, `modelo`, `created_at`. RLS liberando leitura apenas para `is_admin()` / `has_role('lider_tematico')`; escrita apenas por `service_role`. GRANTs explícitos na mesma migração.
- **Edge Function** `enrich-suggestion-demographics`: valida payload com Zod, processa em lotes de até 50 sugestões, chama o Lovable AI Gateway com `openai/gpt-5.6-sol` via Responses API em streaming, com saída estruturada e instrução anti-alucinação (devolver `indeterminado` quando não houver sinal). Grava com `service_role` e é acessível somente a admin (mesmo padrão de `classify-suggestion-eixo`).
- **Proxy de renda**: tabela auxiliar de faixa por município baseada em porte/mesorregião, aplicada em SQL — sem custo de IA.
- **Gatilho na LP**: `OpinionFormCard.tsx` passa a invocar a função em background após o insert, no mesmo padrão já usado por `classify-suggestion-eixo` (fire-and-forget, sem bloquear a tela de agradecimento).
- **RPCs de agregação** `painel_demografico_resumo()` e `painel_demografico_por_eixo()`, seguindo o padrão `pode_ver_painel_cruzamento()` já existente.
- **UI**: novo componente de seção em `AdminCruzamentoSugestoes.tsx` com gráficos Recharts, reutilizando os tokens visuais atuais.
