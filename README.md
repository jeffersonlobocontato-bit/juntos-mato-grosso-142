# Juntos Mato Grosso 142

Prompt para Desenvolvimento Completo no Lovable

Título do App:
Plataforma Rota 399 – CRM Colaborativo para Propostas do Plano de Governo do Paraná

Descrição Geral:
Crie uma plataforma web responsiva (acessível também via mobile) para gerenciar propostas de especialistas e sugestões da população para o Plano de Governo do Estado do Paraná. O sistema deve funcionar como um CRM com:

Fluxo técnico em 4 etapas

Cadastro por eixos temáticos e 399 municípios

Visualização por geolocalização

Dashboard público com indicadores agregados

Landing page moderna e conversiva para coletar sugestões populares

👥 Perfis de Usuário

Crie os seguintes perfis com controle de acesso:

Administrador (CCT): acesso total a todos os dados e usuários

Líder Temático: acesso apenas ao seu eixo temático

Curador Municipal: acesso ao município associado

Especialista: pode apenas submeter propostas técnicas no seu eixo/município

Cidadão (público): acessa a landing page e envia sugestões via formulário

Visitante: visualiza apenas o dashboard público

🧱 Estrutura de Dados (Collections)

Usuários

Nome

E-mail

Senha

Perfil (admin, líder, curador, especialista)

Município vinculado

Eixo vinculado

Eixos Temáticos

Nome do eixo

Descrição

Líder responsável (referência a Usuário)

Municípios

Nome

Código IBGE

Região

Latitude

Longitude

Especialistas

Nome completo

Município

Área de atuação

Contato

Eixo vinculado

Data da entrevista

Propostas Técnicas

Título

Descrição

Município (referência)

Eixo (referência)

Status (rascunho, validada, consolidada, aprovada)

Etapa (1, 2, 3, 4)

Autor (Usuário)

Metas e indicadores

Latitude / Longitude

Anexos

Sugestões Populares

Nome (opcional)

E-mail (opcional)

Município

Eixo sugerido

Descrição

Data

Latitude / Longitude (baseado no município)

Público? (boolean)

Etapas do Eixo

Eixo

Tipo de etapa (entrevista, online, presencial 1, presencial 2)

Data

Participantes

Resumo da discussão

Propostas citadas

⚙️ Funcionalidades Obrigatórias
Gestão de Propostas Técnicas

Formulário para líderes/curadores inserirem propostas

Campos: título, descrição, eixo, município, metas, status

Permitir edição durante as 4 etapas

Filtros por eixo, município, etapa

Sugestões Populares (Landing Page)

Página aberta ao público

Formulário com campos: nome, e-mail, município, eixo, descrição

Salvar na coleção Sugestões Populares

Separar do fluxo técnico

Geolocalização

Mapa do Paraná com marcador por município

Mostrar número de propostas/sugestões por município

Filtro por eixo temático ou tipo de proposta

Dashboard Público

Indicadores em big numbers:

Total de propostas técnicas

Total de sugestões populares

% de municípios participantes

Distribuição por eixo

Mapa de calor por município

Apenas dados agregados (sem conteúdos detalhados)

Workflow e Etapas

Registro das 4 etapas por eixo

Permitir upload de ata/resumo

Associar etapa com especialistas e propostas

Notificações e Alertas

Notificar líderes quando especialistas submeterem propostas

Alertar curadores sobre municípios pendentes

Mostrar alertas de etapas não concluídas

🧩 Página Pública: Landing Page Rota 399

Objetivo: Engajar e converter cidadãos em colaboradores do Plano de Governo

Layout visual:

Imagens impactantes do Paraná (cataratas, lavouras, cidades) como background

Parallax no scroll

Tipografia institucional com cores da bandeira (verde, azul, branco)

Seções da página:

Header fixo com logo e menu:

Logo “Rota 399”

Botões: “Sobre”, “Envie sua ideia”

Hero visual com imagem parallax

Título: “Rota 399 – O Destino Decidido por Todos os Paranaenses”

Subtítulo: “Ajude a construir um novo Paraná com sua sugestão”

Sobre a iniciativa

Texto explicativo com ícones dos valores: técnica, representatividade, transparência

Mapa do Paraná

Interativo ou imagem com municípios destacados

Formulário: Envie sua sugestão

Nome (opcional)

Município

Eixo Temático

Descrição da sugestão

Botão: “Enviar minha ideia”

Indicadores em big numbers

Total de sugestões

Municípios participantes

Eixos mais sugeridos

Rodapé com contato e política de uso

Técnicas de conversão:

CTA fixo visível (“Envie sua sugestão”)

Microanimações no scroll

Confirmação pós-envio: “Obrigado! Sua ideia está no mapa do Paraná!”

Botão para compartilhar a sugestão

🔐 Segurança

Somente perfis autorizados visualizam conteúdos técnicos

Painel público exibe apenas dados agregados

Dados armazenados com segurança, com controle de acesso por perfil

📤 Relatórios

Exportar por filtro:

Propostas por eixo

Propostas por município

Sugestões populares por região

🚀 MVP (para esta semana)

Cadastro e visualização de propostas técnicas

Landing page funcional com formulário de sugestão

Dashboard com big numbers (mesmo que com dados simulados)

Visualização de municípios com contagem

Fluxo de etapas com marcação por líder

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/1a6383ca-4ec7-4b0c-b7fd-85b9dbcc6e2b).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
