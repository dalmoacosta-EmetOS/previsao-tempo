# Política de segurança — Weather Forecast

## Como relatar uma falha
Encontrou uma vulnerabilidade? **Não abra uma issue pública.** Use o botão
**"Report a vulnerability"** na aba **Security** deste repositório (relato privado do GitHub).
Responderemos em até 7 dias e daremos crédito a quem relatar, se desejar.

## Versões com suporte
| Versão | Suporte |
|---|---|
| 4.x (atual) | ✅ correções de segurança |
| 3.6.1 (congelada — exercício 1) | ❌ somente registro histórico |

## O que o site faz para se proteger (resumo)
- **Sem servidor e sem banco de dados próprios**: não guardamos contas, senhas nem dados pessoais.
- **Política de segurança de conteúdo (CSP)**: só executa código do próprio site e só conversa com os serviços listados.
- **Nenhum código de terceiros** roda na página (o mapa, Leaflet, é hospedado aqui).
- **Tudo que vem de fora é tratado como texto** (nomes de cidades, links de plano de viagem), nunca como código.
- **Validação dos links de plano de viagem** (coordenadas, tamanhos, veículo).
- **Localização só com permissão**; dados guardados apenas no próprio aparelho (última cidade, favoritas, preferências).
- **Testes automáticos de segurança** a cada envio + **varredura CodeQL** + **Dependabot**.

Detalhes, modelo de ameaças e o plano para a AWS: [docs/07-seguranca.md](docs/07-seguranca.md).
