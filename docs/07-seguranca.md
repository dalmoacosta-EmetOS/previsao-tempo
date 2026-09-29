# 07 — Segurança

> **Verdade de partida:** não existe proteção "completa". Existe reduzir o que pode ser atacado
> (superfície de ataque), ter várias camadas de defesa e revisar sempre. Este documento registra
> o que o Weather Forecast faz hoje, o que falta e o que muda quando virar produto na AWS.

Última revisão: 28/09/2026 (versão 4.0) · decisões: ADR-040 e ADR-043.

---

## 1. O que existe para proteger

| Ativo | Onde está | Risco se comprometido |
|---|---|---|
| Código do site | GitHub (público) | Alguém alterar o site e enganar usuários |
| Conta do GitHub do Dalmo | GitHub | Controle total do site e do código |
| Confiança do usuário | Navegador de quem usa | Site usado para enganar (phishing, código malicioso) |
| Localização do usuário | Só no aparelho, só com permissão | Privacidade |
| Favoritas / última cidade | `localStorage` do aparelho | Baixo (não sai do aparelho) |

**Não temos:** servidor próprio, banco de dados, contas de usuário, senhas, pagamentos.
Isso elimina as categorias de ataque mais comuns (vazamento de banco, roubo de senha, invasão de servidor).

## 2. Por onde alguém poderia atacar (modelo de ameaças)

| # | Ameaça | Como | Defesa atual | Situação |
|---|---|---|---|---|
| A1 | **Injeção de código (XSS)** | Nome de cidade malicioso vindo de um serviço externo ou de um link | Tudo que vem de fora entra como **texto**; CSP bloqueia código de fora; testes com nomes maliciosos | ✅ Coberto (ADR-040) |
| A2 | **Link de viagem adulterado** | `?viagem=1&de=...` com valores absurdos ou código | Validação de coordenadas, tamanhos e veículo; nomes como texto; teste automático | ✅ Coberto (ADR-042/043) |
| A3 | **Serviço externo comprometido** | Open-Meteo, BigDataCloud, RainViewer, NWS ou OSRM devolvendo lixo | Respostas tratadas como dados; CSP limita com quem o site conversa; falha de um serviço não derruba os outros | ✅ Mitigado |
| A4 | **Código de terceiros adulterado (CDN)** | Biblioteca carregada de outro site é trocada | Leaflet hospedado no próprio site; CSP `script-src 'self'` | ✅ Coberto |
| A5 | **Clickjacking** | Outro site embute o nosso escondido para induzir cliques | Script que impede rodar dentro de outro site | ⚠️ Parcial — o ideal é o cabeçalho `frame-ancestors`, que o GitHub Pages não permite (resolvido na AWS) |
| A6 | **Conta do GitHub invadida** | Senha vazada, app com acesso demais | Depende de configuração da conta (ver §4) | ⚠️ **Ação do Dalmo** |
| A7 | **Dependência com falha conhecida** | Biblioteca de testes vulnerável | `npm audit` = 0; Dependabot semanal | ✅ Coberto |
| A8 | **Falha nova no nosso código** | Erro de programação | CodeQL a cada envio + toda segunda; 158 testes | ✅ Coberto |
| A9 | **Abuso das APIs gratuitas** (DoS indireto) | Muitos acessos esgotam a cota gratuita da Open-Meteo | Cache de 10 min/1 h; limites por usuário são do próprio serviço | ⚠️ Risco de produto — ver §5 |
| A10 | **Privacidade** | Rastrear usuários | Sem cookies, sem analytics, sem rastreadores; localização só com permissão e não é enviada a nós | ✅ Coberto |

## 3. Controles em vigor (v4.0)

- **CSP** (Content-Security-Policy) em `index.html`: código só do próprio site; conexões só com os serviços usados; `object-src 'none'`, `base-uri 'self'`, `form-action 'none'`.
- **Referrer-Policy** `strict-origin-when-cross-origin`.
- **Sem `innerHTML` com dados externos**; ícones são SVG fixos do próprio site.
- **Links externos** com `rel="noopener"`.
- **Anti-clickjacking** por script.
- **CI com permissão mínima** (`contents: read`).
- **CodeQL** (varredura de segurança) e **Dependabot** (dependências).
- **Testes de segurança automáticos**: nome malicioso na URL, na API e no mapa; link de plano adulterado; CSP sem bloqueios indevidos; nenhum script de terceiros.

## 4. Checklist da conta (ação do Dalmo — importante)

| Item | Onde | Por quê |
|---|---|---|
| ☐ **Autenticação em 2 fatores** no GitHub | Settings → Password and authentication | Senha vazada sozinha não basta para invadir |
| ☐ Limitar o app do Claude **só a este repositório** | Settings → Applications → Claude → Repository access | Hoje ele pode mexer em todos os seus repositórios |
| ☐ **Proteger o ramo `main`** (exigir testes verdes antes de mudar) | Repo → Settings → Branches | Ninguém publica versão quebrada ou maliciosa sem passar pelos testes |
| ☐ Ativar **Private vulnerability reporting** | Repo → Settings → Code security | Pesquisadores relatam falhas em privado |
| ☐ Conferir **Secret scanning** ativo | Repo → Settings → Code security | Avisa se alguma senha/chave for enviada por engano |

## 5. Quando virar produto na AWS (plano)

| Tema | O que fazer |
|---|---|
| Hospedagem | S3 (arquivos) + **CloudFront** (entrega) com **HTTPS obrigatório** |
| Cabeçalhos | CloudFront Response Headers Policy: **HSTS**, CSP com **`frame-ancestors 'none'`**, `X-Content-Type-Options`, `Permissions-Policy` (geolocalização só no próprio site) |
| Proteção de borda | **AWS WAF** com regras gerenciadas + limite de requisições por IP; **AWS Shield Standard** (grátis, contra DDoS) |
| Domínio próprio | Route 53 + certificado **ACM**; DNSSEC |
| APIs pagas / chaves | **Nunca** colocar chave no site. Criar um intermediário (API Gateway + Lambda) que guarda a chave no **Secrets Manager** e aplica limite de uso |
| Cota das APIs gratuitas | Uso comercial exige plano pago da Open-Meteo; o intermediário faz cache para reduzir custo |
| Conta AWS | MFA na conta raiz, usuários **IAM** com permissão mínima, **CloudTrail** ligado, alerta de orçamento (Budgets) |
| Contas de usuário (se houver) | Amazon **Cognito** (senha forte, MFA), nunca guardar senha por conta própria |
| Relatos de usuários (se houver) | Moderação, limite por usuário, sem dados pessoais em público; revisão jurídica (ex.: divulgação de blitz) |
| Privacidade (LGPD/leis dos EUA) | Política de privacidade publicada; coletar o mínimo; consentimento para localização |
| Rotina | Teste de invasão (pentest) antes do lançamento e a cada grande mudança; revisão trimestral deste documento |

## 6. Riscos que continuam (honestidade)

- O **GitHub Pages** não permite cabeçalhos de segurança próprios (HSTS, `frame-ancestors`): parte da proteção só fica completa na AWS.
- Dependemos de **serviços gratuitos de terceiros** (previsão, radar, rotas, nomes). Se um deles mudar ou cair, uma parte do site para — como aconteceu com o serviço de nomes em 28/09 (ADR-040, rev. 3.5.2).
- Testes simulados **não substituem** o uso real: dois defeitos de hoje só apareceram no iPhone.
