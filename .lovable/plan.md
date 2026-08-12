# Foto do Moro na LP Metodologia — nitidez e proporção

## Diagnóstico (verificado)

- O arquivo original `src/assets/metodologia/foto-oficial-moro.png` tem **989 x 900 px** e, ao ser aberto, **não está distorcido**: a proporção do rosto está correta.
- No navegador (viewport 972px), a imagem é renderizada com **565 x 515 px CSS**, exatamente a mesma proporção do arquivo (1,098). Ou seja, **não há esticamento vertical** — a percepção de "mais alta" vem do enquadramento fechado do retrato (recorte de meio-busto) e do corte inferior contra a borda da seção.
- O problema real e confirmado é **resolução**: com `dpr = 2.5`, os 565px CSS exigem ~1.412px reais de largura, mas o arquivo só tem 989px. A imagem é ampliada ~1,4x pelo navegador, o que gera o aspecto borrado / baixa qualidade.

## O que será feito

1. Gerar uma versão em alta resolução do retrato oficial (aproximadamente 2x: ~1.980 x 1.800 px), mantendo **exatamente a mesma proporção** e o mesmo fundo transparente, substituindo o arquivo atual.
2. Declarar `width` e `height` no `<img>` do herói para travar a proporção nativa e evitar qualquer deformação por CSS em qualquer breakpoint.
3. Manter `object-contain` (já correto) e revisar o enquadramento no mobile/desktop para que o busto fique proporcional à altura da seção, sem parecer alongado.
4. Conferir o resultado no preview em desktop e mobile, comparando nitidez antes/depois.

## Detalhes técnicos

- Arquivo: `src/assets/metodologia/foto-oficial-moro.png` (usado no herói e no avatar do modal "Mensagem do Sergio Moro" em `src/pages/MetodologiaPlano.tsx`).
- A mesma imagem em alta resolução serve os dois usos; o avatar 64x64 apenas ganha nitidez em telas retina.
- Nenhuma alteração de lógica de negócio ou backend.
