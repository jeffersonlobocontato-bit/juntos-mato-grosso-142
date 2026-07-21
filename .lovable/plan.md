## Objetivo

Aplicar o patch enviado para adicionar proteção anti-spam leve no formulário público de sugestões, sem alterar estrutura de tabela, RLS ou o fluxo de envio atual.

## Mudanças

### 1. Banco de dados (nova migração)
Criar função `public.check_sugestao_rate_limit()` + trigger `BEFORE INSERT` em `sugestoes_populares` com duas regras:
- **Mesmo e-mail:** bloqueia se houver 3+ sugestões nos últimos 2 minutos.
- **Texto idêntico:** bloqueia se a mesma `descricao` aparecer 2+ vezes no último 1 minuto (independente de e-mail).

Cada bloqueio lança uma mensagem em português explicando o motivo. Puramente aditivo — nenhuma coluna, política RLS ou grant é alterada.

### 2. Frontend (`src/components/landing/SuggestionForm.tsx`)
No `catch` do envio, quando a mensagem de erro vinda do trigger for reconhecida ("sugestões enviadas" / "enviada repetidamente"), exibi-la diretamente no toast. Caso contrário, mantém a mensagem genérica atual.

## Observações
- Não altera o formulário da nova home (`OpinionFormCard.tsx`), mas ambos gravam na mesma tabela, então a proteção vale para os dois.
- Nenhuma mudança de UX além do texto do toast em caso de bloqueio.
