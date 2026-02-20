
# Corrigir redirecionamento do Julio apos login

## Problema
O codigo em `Auth.tsx` redireciona usuarios com role `lider_tematico` para `/entrevista` apos o login. O correto e redirecionar para `/admin`, onde o menu ja esta filtrado para mostrar apenas os modulos permitidos (Meu Painel, Dashboard Publico, Propostas Tecnicas, Leads, Mensageria).

## Alteracao

Arquivo: `src/pages/Auth.tsx`

Trocar o redirecionamento de `lider_tematico` de `/entrevista` para `/admin` em dois pontos:

1. **Linha 52-53** (useEffect que detecta usuario ja logado):
   - De: `navigate('/entrevista')`
   - Para: `navigate('/admin')`

2. **Linha 112-113** (handleSubmit apos login bem-sucedido):
   - De: `navigate('/entrevista')`
   - Para: `navigate('/admin')`

Isso fara com que o Julio, ao logar, va direto para o painel administrativo filtrado com acesso apenas aos modulos do eixo dele.
