# Sugestões via WhatsApp (Click-to-WhatsApp da Meta)

Nova rota: o anúncio da Meta abre direto a conversa no WhatsApp. A pessoa escreve pelo WhatsApp e a sugestão entra na plataforma automaticamente, sem passar pela landing page.

## Como vai funcionar

1. O anúncio Click-to-WhatsApp abre a conversa já com uma mensagem inicial ("Quero enviar minha sugestão").
2. Um assistente responde no WhatsApp em fluxo híbrido:
   - pergunta o município,
   - pergunta o nome,
   - pede a sugestão em texto livre,
   - confirma o envio e agradece.
3. A IA classifica eixo/tema da sugestão automaticamente (mesma lógica já usada no site).
4. A sugestão entra em `sugestoes_populares` e gera lead automático, aparecendo nos painéis existentes (Sugestões, Cruzamento, Analytics) marcada com origem WhatsApp.

Se a pessoa mandar tudo de uma vez ("Sou o João de Cuiabá e queria mais creches"), a IA extrai os dados e o bot só pede o que faltar.

## O que precisa do seu lado (Meta)

- Número de WhatsApp Business ativo dentro do Meta Business Manager (não pode estar em uso no app WhatsApp comum).
- App no Meta for Developers com o produto WhatsApp habilitado.
- Três credenciais que vou pedir como segredo na plataforma: token permanente da Cloud API, ID do número de telefone e um token de verificação do webhook (esse eu gero).
- Cadastro da URL do webhook no painel do app Meta (eu forneço a URL pronta depois de publicar).
- No Gerenciador de Anúncios: campanha com destino "WhatsApp" apontando para esse número.

## Etapas técnicas

1. **Banco**
   - Nova tabela `whatsapp_conversas`: telefone, estado do fluxo (aguardando_municipio / nome / sugestao / concluido), dados parciais, timestamps. RLS restrita a admin + GRANTs para `authenticated` e `service_role`.
   - Adicionar coluna `origem` (texto, default `site`) em `sugestoes_populares` para separar `whatsapp` de `site`, sem quebrar o que já existe.

2. **Edge function `whatsapp-webhook`** (`verify_jwt = false`, pública, chamada pela Meta)
   - `GET`: responde ao handshake de verificação com o token.
   - `POST`: valida a assinatura `X-Hub-Signature-256`, ignora eventos de status, e processa cada mensagem de texto.
   - Máquina de estados por telefone usando `whatsapp_conversas`; respostas enviadas pela Graph API do WhatsApp.
   - Ao concluir: chama a classificação de eixo/tema existente, grava em `sugestoes_populares` (com `whatsapp`, `nome`, `municipio`, `origem = 'whatsapp'`) e o trigger atual já cria o lead.
   - Município validado contra a tabela `municipios` (MT), com sugestão de correção quando não bate.
   - Proteções: dedupe por `message_id`, limite de tamanho de texto, expiração de conversa parada há mais de 24h.

3. **Painel admin**
   - Filtro/badge "WhatsApp" na lista de sugestões e no Analytics, contando sugestões recebidas por esse canal.
   - Card simples com total de conversas iniciadas x sugestões concluídas (taxa de conclusão).

4. **Rastreio**: apenas origem `whatsapp` gravada no lead/sugestão, conforme definido — sem captura de ID de anúncio.

## Fora do escopo agora

- Disparo ativo de mensagens/templates para a base (exige aprovação de template no Meta).
- Envio de conversões para o Meta CAPI a partir do WhatsApp.
