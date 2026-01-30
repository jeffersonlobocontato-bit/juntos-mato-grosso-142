

# Plano: Redistribuição das Propostas nos Temas Corretos

## Situação Atual

- **93 propostas** atribuídas ao eixo "Desenvolvimento Social"
- **Nenhuma** possui `tema_id` definido
- As propostas abrangem áreas de saúde, segurança, agricultura, tecnologia, infraestrutura, etc.

---

## Mapeamento por Palavras-Chave

Analisando os títulos das propostas, criei o seguinte mapeamento:

| Eixo | Tema | Palavras-chave | Propostas Identificadas |
|------|------|----------------|-------------------------|
| Social | 1.1 Educação | escola, educação, alfabetização, creche, robótica, universidade, idiomas, reforço, biblioteca | ~10 |
| Social | 1.2 Cultura | artes, museu | ~2 |
| Social | 1.3 Esporte | (nenhuma identificada) | 0 |
| Social | 1.4 Saúde | atenção básica, CAPS, fisioterapia, diagnóstico, especialidades, farmácia, hospital, UBS, UPA, saúde, clínica | ~12 |
| Social | 1.5 Assistência Social | acolhimento, passagem, cozinha comunitária, PCD, mulher, renda mínima, primeira infância, convivência | ~9 |
| Econômico | 2.1 Agricultura | sementes, agricultura, cooperativa, orgânico, agrícola, mecanização, irrigação, agroflorestal, pragas | ~9 |
| Econômico | 2.4 Turismo | turístico, pousada, rota, trilha, gastronômico, artesanato, parque eventos | ~7 |
| Econômico | 2.7 Inovação/Tech | startups, hub, incubadora, parque tecnológico, fab lab, TI, digital, telecentro, wifi | ~10 |
| Econômico | 2.10 Trabalho | jovem aprendiz, primeiro emprego, capacitação, profissionalizante | ~4 |
| Econômico | 2.11 Meio Ambiente | corredor verde, nascentes, recuperação | ~3 |
| Cidades | 3.2 Mobilidade | terminal, trânsito, ponte, ciclovia | ~5 |
| Cidades | 3.3 Infraestrutura | iluminação, pavimentação, praça, revitalização, drenagem, parque linear | ~8 |
| Cidades | 3.4 Saneamento | esgoto | ~2 |
| Cidades | 3.6 Energia | energia solar | ~1 |
| Gestão | 4.1 Modernização | governo digital, cidade inteligente, fiscalização | ~4 |
| Segurança | 5.1 Segurança Pública | base comunitária, batalhão, guarda, delegacia, ronda, patrulha, videomonitoramento, operações | ~9 |

---

## SQL de Migração

A migração será executada em um único statement SQL com múltiplos UPDATE por CASE/WHEN baseado em padrões nos títulos:

```sql
-- Saúde (1.4)
UPDATE propostas_tecnicas SET 
  eixo_id = 'e1000000-0000-0000-0000-000000000001',
  tema_id = 'a1400000-0000-0000-0000-000000000004'
WHERE titulo ILIKE ANY(ARRAY[
  '%atenção básica%', '%caps%', '%fisioterapia%', '%diagnóstico%',
  '%especialidades%', '%farmácia%', '%hospital%', '%ubs%', '%upa%',
  '%saúde%', '%clínica da mulher%'
]);

-- Educação (1.1)
UPDATE propostas_tecnicas SET 
  eixo_id = 'e1000000-0000-0000-0000-000000000001',
  tema_id = 'a1100000-0000-0000-0000-000000000001'
WHERE titulo ILIKE ANY(ARRAY[
  '%escola%', '%educação%', '%alfabetização%', '%creche%', 
  '%robótica%', '%universidade%', '%idiomas%', '%reforço%', 
  '%biblioteca%', '%proerd%'
]);

-- Segurança Pública (5.1)
UPDATE propostas_tecnicas SET 
  eixo_id = 'e5000000-0000-0000-0000-000000000005',
  tema_id = 'a5100000-0000-0000-0000-000000000001'
WHERE titulo ILIKE ANY(ARRAY[
  '%segurança%', '%batalhão%', '%guarda%', '%delegacia%',
  '%ronda%', '%patrulha%', '%videomonitoramento%', '%operações%',
  '%vizinhança solidária%'
]);

-- ... (continua para todos os temas)
```

---

## Detalhamento Completo

### Propostas para Saúde (1.4)
- Ampliação da Atenção Básica
- CAPS Álcool e Drogas - Paranapoema
- Centro de Diagnóstico - Medianeira
- Centro de Especialidades - Braganey
- Centro de Fisioterapia - Pitanga
- Clínica da Mulher - Indianópolis
- Farmácia Popular Municipal - Nova Santa Bárbara
- Hospital Regional - Marialva
- Programa Saúde da Família - Jardim Alegre
- Programa Saúde Digital
- UBS 24 Horas - Virmond
- UPA Municipal - Abatiá

### Propostas para Educação (1.1)
- Biblioteca Pública Digital - Cerro Azul
- Centro de Educação Integral - Terra Roxa
- Centro de Idiomas - Atalaia
- Centro de Reforço Escolar - Carambeí
- Escola de Artes - São José dos Pinhais (ou Cultura)
- Escola Técnica Profissionalizante - Altamira do Paraná
- Laboratório de Robótica - Pérola
- PROERD Municipal - Novo Itacolomi
- Programa de Alfabetização - Jesuítas
- Programa de Modernização Escolar
- Universidade Aberta - Bituruna

### Propostas para Assistência Social (1.5)
- Casa de Acolhimento Idoso - Cruz Machado
- Casa de Passagem - Lidianópolis
- Centro de Assistência Familiar - Campo Largo
- Centro de Convivência - Uraí
- Centro de Inclusão PCD - Nova Laranjeiras
- Centro de Referência da Mulher - Paranacity
- Cozinha Comunitária - Palotina
- Programa Primeira Infância - Doutor Camargo
- Programa Renda Mínima - Santo Antônio do Caiuá

### Propostas para Segurança (5.1)
- Base Comunitária de Segurança - Maripá
- Batalhão de Trânsito - Jacarezinho
- Centro Integrado de Operações - Floraí
- Delegacia da Mulher - Santo Inácio
- Guarda Municipal - Mariluz
- Patrulha Rural - Teixeira Soares
- Programa Vizinhança Solidária - São Jorge do Ivaí
- Ronda Escolar - Almirante Tamandaré
- Sistema de Videomonitoramento - Bom Jesus do Sul

### Propostas para Agricultura (2.1)
- Banco de Sementes Crioulas - Santa Cruz de Monte Castelo
- Centro de Processamento Agrícola - São Jorge d'Oeste
- Certificação Orgânica Municipal - Santa Inês
- Cooperativa de Agricultura Familiar - Ângulo
- Feira do Produtor Local - Japurá
- Manejo Integrado de Pragas - São Pedro do Paraná
- Mecanização Rural Compartilhada - Quitandinha
- Polo Agroindustrial Regional
- Programa de Irrigação Sustentável - Nova Esperança
- Sistema Agroflorestal - Bela Vista da Caroba
- Hortas Comunitárias Urbanas - Congonhinhas

### Propostas para Turismo (2.4)
- Centro de Artesanato - São Jorge do Patrocínio
- Centro Gastronômico - Sertaneja
- Museu Regional - Guaratuba
- Parque de Eventos - Céu Azul
- Portal Turístico - Douradina
- Pousada Comunitária - Jaboti
- Rota Turística Regional - Cruzmaltina
- Trilha Ecológica - Ramilândia

### Propostas para Inovação/Tecnologia (2.7)
- Centro de Capacitação TI - Maringá
- Centro de Startups - Dois Vizinhos
- Fab Lab Municipal - Apucarana
- Hub de Inovação Digital - Vila Alta
- Incubadora de Negócios - Andirá
- Incubadora Tech - Londrina
- Parque Tecnológico - Cascavel
- Telecentro Comunitário - Grandes Rios
- WiFi Público - Mandirituba

### Propostas para Trabalho (2.10)
- Programa Jovem Aprendiz - Mangueirinha
- Programa Primeiro Emprego

### Propostas para Meio Ambiente (2.11)
- Corredor Verde Metropolitano
- Recuperação de Nascentes - Nova Aurora

### Propostas para Mobilidade (3.2)
- Ciclovia Urbana - Lupionópolis
- Ponte sobre Rio Municipal - Boa Ventura de São Roque
- Terminal Rodoviário - Flor da Serra do Sul

### Propostas para Infraestrutura (3.3)
- Iluminação Pública LED - Lobato
- Parque Linear - Quatro Barras
- Pavimentação de Estradas Rurais - Icaraíma
- Praça Central - São João do Ivaí
- Revitalização Centro Histórico - Tupãssi
- Revitalização de Centros Históricos
- Sistema de Drenagem Urbana - Campina da Lagoa

### Propostas para Saneamento (3.4)
- Sistema de Esgoto - Floresta

### Propostas para Energia (3.6)
- Energia Solar para Escolas

### Propostas para Gestão Pública (4.1)
- Cidade Inteligente - Santo Antônio da Platina
- Governo Digital - Guapirama
- fiscalização dos contratos para uma melhor execussáo de obras

### Propostas não classificadas (manter em Social/Assistência)
- adfdsfada
- fdaj;fadjkf;kldaj
- Investigar os 400 milhões excedentes nas cobranças do pedágio
- Melhorar o nível de fluidez dos serviços...

---

## Resumo da Redistribuição

| Eixo | Total Propostas |
|------|-----------------|
| 01 - Desenvolvimento Social | ~32 |
| 02 - Desenvolvimento Econômico | ~31 |
| 03 - Cidades e Infraestrutura | ~12 |
| 04 - Gestão Pública | ~3 |
| 05 - Segurança e Justiça | ~9 |
| **Não classificáveis** | ~6 |

---

## Ação

Executarei uma migração SQL que:
1. Atualiza `eixo_id` e `tema_id` baseado em palavras-chave no título
2. Propostas com títulos genéricos/inválidos permanecerão em "Assistência Social"
3. Verifica resultado final e apresenta distribuição

