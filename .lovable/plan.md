## Objetivo

Substituir a imagem de compartilhamento (WhatsApp, Facebook, LinkedIn, X) por uma nova arte alinhada ao layout atual da home — usando a nova logomarca "Juntos Paraná 399" com o contorno dourado do estado, sobre o fundo verde/preto do design system.

## O que será feito

1. **Gerar a nova og-image (1200×630)** em `/mnt/documents/` para QA visual, com:
   - Fundo verde-escuro degradê (mesma paleta da hero da home: `#04241a → #0a3d28`).
   - Logotipo "Juntos Paraná 399" branco centralizado, com o traço dourado embaixo (usando `logo-nova-branco.svg`).
   - Contorno dourado do estado do Paraná à direita (mesmo traço do print de referência enviado).
   - Subtítulo "Plano de Governo Colaborativo" em serifada leve, dourado suave.
   - Textura sutil de grão (`grain.png`) para consistência com a LP.
2. **Revisar o resultado** convertendo em preview e conferindo enquadramento, legibilidade em thumbnail pequeno (o WhatsApp mostra ~300px de largura) e safe area.
3. **Publicar como asset final** em `public/og-image.jpg` (substituindo o arquivo atual) — mantendo o mesmo caminho já referenciado em `index.html`, então nenhuma meta tag muda.
4. **Verificar** que `og:image`, `og:image:width`, `og:image:height` e `twitter:image` continuam apontando para `/og-image.jpg` no `index.html` — ajustar apenas se estiver faltando width/height (recomendado para previews).

## Detalhes técnicos

- Formato: JPG, 1200×630 px, <300 KB para carregar rápido em previews.
- Nome/caminho preservado (`/og-image.jpg`) — evita re-scrape obrigatório em domínios que já cachearam a URL antiga.
- Nenhuma alteração no `HomeHero`, componentes ou rotas — mudança puramente de asset + (se necessário) meta tags.

## Aviso importante para o usuário

WhatsApp, Facebook e outros previews ficam em cache por dias/semanas. Após publicar, o novo preview só aparece imediatamente ao **forçar o refresh** no debugger de cada plataforma:
- Facebook/WhatsApp: https://developers.facebook.com/tools/debug/
- LinkedIn: https://www.linkedin.com/post-inspector/
- X (Twitter): recompartilhar em modo privado.

## Fora do escopo

- Não altera o layout da LP nem o restante do site.
- Não gera versões alternativas por rota (a home é a página compartilhada).
