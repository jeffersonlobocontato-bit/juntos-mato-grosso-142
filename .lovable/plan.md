## Problema

No PDF gerado pelo "Fichamento" do Gerador de Plano de Governo, as notas da coluna lateral direita (fontes citadas) ficam **encavaladas/truncadas** quando há muitas referências numa mesma página, como mostra a captura. As bolinhas (3, 10) e os textos das fontes se sobrepõem.

## Causa raiz

Em `src/utils/planoGovernoFichamentoExport.ts` (função `exportFichamentoPDF`, bloco da coluna direita, linhas ~506‑566):

1. As notas são desenhadas em ordem do `mainY` (posição da âncora no texto), mas o cálculo `targetY = Math.max(noteY, mainY - 1.5)` apenas empurra para baixo. Quando a altura real da nota anterior + a próxima ultrapassa o espaço, o código **força** `startY = Math.min(targetY, contentBottom - 12)`, fazendo a nova nota ser desenhada por cima da anterior.
2. A altura de cada nota não é pré‑calculada — depende de quantas linhas o `splitTextToSize` produz para `label` e `excerpt`. Sem essa medição, não há como saber se cabe na página.
3. Não há fallback quando a coluna lateral enche: notas extras simplesmente colidem.

## Solução

Reescrever o trecho de renderização da coluna lateral com **layout em duas passadas**:

### Passo 1 — pré-medir cada nota
Para cada `ref` da página, calcular a altura total em mm:
- 1 linha da etiqueta de tipo (ex. "PROPOSTA TÉCNICA")
- N linhas do `label` (via `doc.splitTextToSize(label, sideColW - 6.5)` × 3.4 mm)
- M linhas do `excerpt` se houver (× 3.0 mm)
- + padding inferior (`minGap`)

### Passo 2 — posicionar respeitando o anterior
- `startY = max(prevBottom, mainY - 1.5)`
- Se `startY + altura > contentBottom`, **empilhar a partir do anterior** (não clampar). 
- Se ainda assim não couber, mover as notas excedentes para uma **página "Notas (continuação)"** ao final do PDF, com o mesmo cabeçalho/rodapé. Conector vira "↪ ver continuação" no lugar da curva.

### Passo 3 — conector recalculado
Desenhar a poly-line usando o `startY` final (já compensado), não o `mainY` original isolado.

### Ajustes finos
- Reduzir `minGap` de 11 → 8 mm e usar gap dinâmico baseado na altura real.
- Quando o `excerpt` for longo, truncar para no máximo 4 linhas com `…` para evitar engolir a página inteira.
- Garantir que duas refs muito próximas no texto principal não gerem duas notas colando: aplicar `startY = max(prevBottom + 2, mainY - 1.5)`.

## Arquivo afetado

- `src/utils/planoGovernoFichamentoExport.ts` — somente a seção "COLUNA DIREITA: NOTAS POR PÁGINA" (linhas ~496–566) e o helper de medição.

Sem mudanças no DOCX, no parser, no backend ou na UI. Sem migrações.

## Validação

Após aplicar, gerar um fichamento com ≥6 fontes citadas próximas (caso reproduzido na imagem) e conferir visualmente que:
1. Nenhuma bolinha sobrepõe outra.
2. Nenhum texto de fonte invade a fonte seguinte.
3. Conectores apontam corretamente para a posição final da nota.
4. Quando exceder a página, aparece página de continuação ao final.
