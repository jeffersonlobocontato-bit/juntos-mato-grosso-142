Vou corrigir a geração do Plano de Governo para que a seleção `Infraestrutura > Logística de Transportes > Portos` seja tratada como um recorte obrigatório, e não apenas como uma sugestão de prompt.

Diagnóstico encontrado:
- A última execução no backend recebeu apenas o eixo (`Desenvolvimento das Cidades e Infraestrutura`). Não há logs de `Tema filter` nem `Subtema filter`, então o tema/subtema não chegaram efetivamente à função nessa execução.
- Como só o eixo foi aplicado, o backend buscou uma proposta de `Conectividade e Telecomunicações > Segurança - Roubo de Cabos`, que foi exatamente a fonte usada no texto gerado.
- Documentos da base hoje são filtrados só por `eixo_id`; como `ai_documents` ainda não tem vínculo direto com tema/subtema, um documento amplo como PELTi pode trazer conteúdo de energia, telecom, rodovias etc. mesmo quando o usuário escolhe Portos.
- A chamada ainda usa `fetch` direto para a função, contrariando o padrão do projeto de usar `supabase.functions.invoke`, o que dificulta consistência e depuração.

Plano de correção:

1. Corrigir o envio de filtros no frontend
- Atualizar `AdminPlanoGoverno.tsx` para enviar a função via `supabase.functions.invoke('plano-governo-ai', ...)`, mantendo autenticação e integração correta.
- Enviar explicitamente não só os nomes, mas também os IDs selecionados: `eixoId`, `temaId`, `subtemaId`.
- Montar esses IDs a partir das listas já carregadas (`eixos`, `temas`, `subtemas`) para eliminar ambiguidade de nomes.
- Adicionar no resumo do fichamento/exportação os filtros `Tema` e `Subtema`, além do eixo.

2. Endurecer a validação na função `plano-governo-ai`
- Ajustar o contrato da função para aceitar `eixoId`, `temaId`, `subtemaId`.
- Preferir IDs enviados pelo frontend e usar busca por nome apenas como fallback.
- Registrar logs explícitos com eixo/tema/subtema resolvidos para facilitar confirmação em produção.
- Se o usuário escolher tema/subtema e o backend não conseguir resolver o ID, retornar erro claro em vez de gerar um plano amplo.

3. Aplicar filtro hierárquico obrigatório nas propostas técnicas
- Quando `subtemaId` existir, buscar somente propostas com esse `subtema_id`.
- Quando só `temaId` existir, buscar somente propostas com esse `tema_id`.
- Quando só `eixoId` existir, buscar pelo eixo.
- Se não houver propostas no subtema/tema escolhido, o agente deve dizer que não há propostas técnicas específicas naquele recorte, em vez de puxar outro subtema.

4. Impedir documentos amplos de contaminarem o subtema
- Para geração com subtema/tema selecionado, não incluir automaticamente documentos amplos apenas por eixo quando eles não tiverem vínculo específico ao tema/subtema.
- Incluir documentos amplos somente se o usuário selecionar manualmente o documento na lista.
- No prompt, instruir que documentos selecionados manualmente podem ser usados apenas para contexto geral, mas não podem introduzir ações de outros subtemas.
- Isso evita que PELTi ou outro documento de infraestrutura amplo traga telecomunicações/energia para uma proposta de Portos.

5. Adicionar pós-filtro de contexto antes da IA
- Antes de chamar o modelo, verificar as fontes carregadas no contexto.
- Se alguma proposta/documento claramente pertencer a outro tema/subtema quando há subtema selecionado, removê-la do contexto.
- Adicionar uma seção de “escopo efetivo” no prompt com a hierarquia exata resolvida: `Eixo > Tema > Subtema`.

6. Reduzir deriva do modelo
- Diminuir a temperatura da chamada de IA para respostas mais determinísticas.
- Tornar a instrução de escopo mais operacional: “não criar seções, metas, indicadores ou fontes fora do subtema selecionado”.
- Bloquear exemplos explícitos como telecomunicações, energia, saneamento, smart cities e roubo de cabos quando o subtema for `Portos`.

7. Validar com um teste real
- Após implementar, testar a função com: `Desenvolvimento das Cidades e Infraestrutura > Logística de Transportes > Portos`.
- Confirmar nos logs que aparecem `Tema filter` e `Subtema filter` resolvidos.
- Confirmar que a proposta resultante não usa a fonte “Reordenação e Fiscalização das Redes de Telecomunicações” e não cria seção sobre telecomunicações/roubo de cabos.

Resultado esperado:
- Ao selecionar `Infraestrutura / Logística de Transportes / Portos`, o agente só produzirá conteúdo sobre portos e logística portuária.
- Se não houver base suficiente específica para Portos, ele avisará a limitação e não preencherá com telecomunicações, energia ou outros subtemas.