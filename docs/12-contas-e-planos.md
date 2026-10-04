# 12 — Contas, planos e limite de aparelhos

> Pedido do Dalmo (03/10/2026): cadastro de usuário com dados próprios (ex.: endereço de casa), estrutura
> de planos e controle "para que ninguém passe o acesso para outra pessoa usar de graça".
> Decisões no [ADR-051](03-decisoes-adr.md).

## 1. O que a pessoa vê

- **A conta é opcional.** Sem conta, o site funciona como sempre e não contata o serviço de contas.
- **Botão 👤 no topo**, ao lado do 🌐. Ele abre o painel "Sua conta":
  - **sem conta:** e-mail para receber um **link de acesso** (sem senha) ou **Entrar com Google**;
  - **com conta:** e-mail, plano, sincronização, **aparelhos conectados** (com "Desconectar"), "Sair deste aparelho" e **"Apagar minha conta e meus dados"** (pede um 2º toque).
- **Sincronizado:** 🏠 Casa, cidades favoritas e viagens recentes. Ao entrar, nada se perde: o que estava no aparelho e o que estava na conta são somados.

## 2. Controle contra empréstimo de conta

Impedir 100% é impossível (Netflix e Spotify também não conseguem). O desenho torna o empréstimo **inconveniente**:

| Medida | Efeito |
|---|---|
| Máximo de **2 aparelhos** no plano Grátis (3 no Pro) | Ao entrar no 3º, o servidor desconecta o mais antigo **na hora**: a sessão é apagada e as regras do banco recusam os dados dela |
| Login sem senha (link no e-mail ou Google) | Para entrar num aparelho novo, é preciso o e-mail ou a conta Google do dono, que ninguém empresta por causa de um app de clima |
| Lista de aparelhos visível | O dono vê quem está conectado e desconecta |

**Como funciona por dentro:** cada sessão do Supabase tem um `session_id`.
- Ao abrir o site, `claim_device` registra o aparelho e apaga, em `auth.sessions`, as sessões além do limite do plano.
- Todas as regras de acesso (RLS) exigem `session_ok()`, ou seja, que a sessão do pedido ainda exista. Por isso o aparelho desconectado perde o acesso imediatamente, sem esperar a chave vencer.

Testado no banco real, em transação desfeita no fim: com 3 sessões e limite 2, a mais antiga foi desconectada e passou a ler 0 linhas.

## 3. Planos

| Plano | Aparelhos | Favoritas | Viagens recentes | Preço |
|---|---|---|---|---|
| Grátis (`free`) | 2 | 10 | 4 | — |
| Pro (`pro`) | 3 | 50 | 20 | a definir (sem cobrança ainda) |

- O plano fica em `profiles.plan_id` (+ `plan_until`, para período pago). **Só o servidor muda o plano**: a pessoa não tem permissão de escrita nessa tabela.
- Os limites são conferidos no banco (gatilho `enforce_plan_limits`), não só na tela.
- Cobrança (fase seguinte): Stripe → função no servidor marca `plan_id = 'pro'` e `plan_until`.

## 4. Segurança e privacidade

- **Dados guardados:** e-mail (pelo Supabase Auth), Casa, favoritas, viagens recentes, nome do aparelho ("iPhone · Safari") e data do último uso. **Sem senha.**
- **RLS** em todas as tabelas: cada pessoa só lê e altera a própria linha. Sem acesso para quem não está logado, exceto a lista pública de planos.
- **A chave pública** (`sb_publishable_…`) fica no site por desenho. Quem protege os dados é o RLS, não a chave.
- **Tudo o que volta do servidor é tratado como dado de fora:** nomes limpos (`cleanText`), coordenadas validadas, listas limitadas.
- **Biblioteca no próprio site** (`vendor/supabase/`), idêntica à do npm. O teste `vendor.test.mjs` confere byte a byte. A CSP só libera o endereço do projeto.
- **A biblioteca só carrega se houver sessão ou retorno do link de login.** Quem não usa conta não baixa nada.
- **Apagar conta** remove o usuário, o perfil, os dados e os aparelhos em cascata, e limpa este aparelho.
- **Pen test:** vetores X1 a X3 (sem conta não contata o serviço; dados adulterados da conta não executam; a chave de sessão só vai ao serviço de contas).
- **Avisos aceitos do Supabase (linter 0029):** as funções `claim_device`, `revoke_device`, `delete_my_account`, `my_plan` e `session_ok` rodam com privilégio elevado de propósito. Cada uma confere `auth.uid()` e a sessão, e só age sobre a própria conta.
- **Antes de vender:** política de privacidade e termos publicados (L-08) e SMTP próprio para os e-mails de login.

## 5. Configuração que o Dalmo faz no painel (uma vez)

**Supabase · weather-forecast · Authentication → URL Configuration**
- Site URL: `https://dalmoacosta-emetos.github.io/previsao-tempo/`
- Redirect URLs: `https://dalmoacosta-emetos.github.io/previsao-tempo/**`

**Google (botão "Entrar com Google")**
1. Google Cloud Console → APIs e serviços → Credenciais → Criar credencial → **ID do cliente OAuth** → Aplicativo da Web.
2. URI de redirecionamento autorizado: `https://qrpuodtyevkemaykfpgn.supabase.co/auth/v1/callback`.
3. Copiar o ID e a chave secreta para Supabase → Authentication → Sign In / Providers → **Google** → Enable.

Enquanto o Google não estiver configurado, o botão mostra "ainda não está disponível; use o link por e-mail".

**Limite de e-mails:** o serviço de e-mail embutido do Supabase envia poucos e-mails por hora, o que basta para testes. Para lançar, configurar SMTP próprio (ex.: Resend, que tem plano grátis) em Authentication → Emails → SMTP.

## 6. Onde está no código

| Arquivo | Papel |
|---|---|
| `supabase/migrations/` | Esquema, regras e funções (registro do que está no banco) |
| `js/account.js` | Login, aparelhos, sincronização, apagar conta |
| `js/ui/account.js` | Painel "Sua conta" |
| `js/storage.js` | `onSave`: avisa a conta quando Casa, favoritas ou viagens mudam |
| `vendor/supabase/supabase.js` | Biblioteca oficial 2.117.2 (cópia idêntica, conferida no teste) |
