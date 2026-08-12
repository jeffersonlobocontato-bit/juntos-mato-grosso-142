# Restaurar a LP principal (juntosparana399.com.br)

Três alterações feitas durante o trabalho da LP de Metodologia vazaram para a home. A LP de Metodologia é independente e deve continuar como está.

## O que será revertido na home

1. **Marca**: o topo e o rodapé estão usando `/marca/moro-verde.png` e `/marca/moro-branco.png`. Voltam para a logo original Juntos Paraná 399 (`/jp399/logo-nova.svg`), com as dimensões originais (1434x514).
2. **Módulo "SAIU NA MÍDIA"**: a seção de clipping de imprensa (com o botão "+ Subir print de mídia") foi inserida na home. Será removida da home. O componente e os dados continuam existindo, sem uso na página pública principal.
3. **Cores globais**: os tokens do design system em `src/index.css` foram trocados para a paleta ID MORO 26 (verde #007540, verde-limão #8DC73F, amarelo #F8ED31), afetando home, admin e todas as páginas. Voltam à paleta original Juntos Paraná 399 (verde profundo, azul oceano, dourado).

A LP `/metodologia` não é impactada: ela já define a paleta MORO localmente, dentro do próprio arquivo, sem depender dos tokens globais.

## Detalhes técnicos

- `src/components/landing/home/HomeHero.tsx`: restaurar os dois `<img>` de logo e remover o import + render de `MidiaClippingSection`.
- `src/index.css`: reverter o bloco de tokens alterado (primary, primary-glow, primary-deep, secondary, accent, accent-soft, ring, gradient-primary/secondary/cta/gold) para os valores anteriores.
- `src/components/landing/home/MidiaClippingSection.tsx`: mantido no projeto, apenas não referenciado pela home.
- Verificação: conferir a home renderizada (logo JP399, sem seção de mídia, paleta original) e uma tela do admin para confirmar as cores.

## Pergunta em aberto

Se preferir que o módulo de clipping de mídia seja movido para a LP de Metodologia em vez de simplesmente removido, é só avisar antes de aprovar.
