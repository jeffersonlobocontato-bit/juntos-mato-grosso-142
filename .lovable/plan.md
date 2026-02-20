

# Criar Usuario Julio Reis - Lider Tematico de Seguranca

## Resumo

Criar o usuario Julio Reis como lider tematico do eixo "Seguranca, Justica, Combate a Corrupcao", com redirecionamento automatico para a pagina /entrevista apos login. Sem acesso ao AI Hub.

## Credenciais

- **Nome**: Julio Reis
- **Email**: julioreis@juntosparana399.com.br
- **Senha**: julio*399
- **Funcao**: Lider Tematico
- **Eixo**: Seguranca, Justica, Combate a Corrupcao (ID: e5000000-0000-0000-0000-000000000005)

## O que sera feito

### 1. Criar o usuario no banco de dados

Edge Function temporaria (`setup-julio-user`) para:
- Criar usuario via Admin API com email confirmado
- Atribuir role `lider_tematico` em `user_roles`
- Vincular ao eixo na tabela `user_eixos`
- Atualizar `lider_id` na tabela `eixos_tematicos`
- Atualizar perfil com cargo "Lider Tematico - Seguranca"
- **Sem vinculos** na tabela `user_ai_hub_functions`

### 2. Redirecionamento inteligente apos login

Alterar a pagina de login (`Auth.tsx`) para que, apos autenticacao:
- Usuarios com role `admin` ou `admin_master` continuem indo para `/admin`
- Usuarios com role `lider_tematico` (sem role admin) sejam redirecionados para `/entrevista`
- Isso e feito consultando as roles do usuario logo apos o login e escolhendo a rota adequada

## Detalhes Tecnicos

### Edge Function `setup-julio-user`

Sera criada, executada uma unica vez, e depois removida. Executa:

```
1. auth.admin.createUser (email confirmado)
2. INSERT user_roles (lider_tematico)
3. INSERT user_eixos (eixo seguranca)
4. UPDATE eixos_tematicos SET lider_id
5. UPDATE profiles SET cargo
```

### Alteracao em `Auth.tsx`

Apos login bem-sucedido (linha 86-88), ao inves de sempre redirecionar para `/admin`, o codigo ira:
1. Buscar as roles do usuario na tabela `user_roles`
2. Se tiver `admin` ou `admin_master` -> redirecionar para `/admin`
3. Se tiver apenas `lider_tematico` -> redirecionar para `/entrevista`
4. Caso contrario -> redirecionar para `/`

O mesmo ajuste sera aplicado no `useEffect` que detecta usuario ja logado (linha 40-44).

### Acessos automaticos via RLS

Com a role `lider_tematico` e vinculo ao eixo, Julio tera acesso a:
- Dashboard com graficos e estatisticas do seu eixo
- Mapa dinamico com pins de sugestoes
- Leads vinculados ao eixo
- Mensageria
- Formulario de entrevista com eixo automaticamente travado

