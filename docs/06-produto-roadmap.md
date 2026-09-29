# 06 — Produto e roteiro (roadmap)

> Em 28/09/2026, depois da nota A+ no Exercício 1, o Dalmo decidiu tratar o Weather Forecast como
> **candidato a produto**, com publicação futura na **AWS**. A versão do exercício ficou congelada
> (**3.6.1**, ramo `congelado-v3.6.1`).

## Diferencial
**"Tempo na viagem"** — foi o que encantou professor e turma. A previsão de cada trecho da estrada
**na hora em que você passa por lá**, com cuidados práticos, melhor horário de saída e o plano no bolso
(e-mail, WhatsApp, calendário) que sempre abre atualizado. Em português, para viagens no Brasil e nos EUA.

Concorrentes conhecidos (sem estudo de mercado ainda): Drive Weather, Weather on the Way; Google Maps mostra pouco sobre o tempo na rota.

## Fases

| Fase | O que entra | Custo | Situação |
|---|---|---|---|
| **1** | Data/hora até 7 dias + aviso NOAA/INMET; veículo; noite; melhor horário; paradas; alertas oficiais na rota (EUA); e-mail/WhatsApp/calendário com link que atualiza | Grátis | ✅ v4.0 |
| **2** | ✅ Postos e balanças (OpenStreetMap) — v4.1. A fazer: alertas oficiais do **INMET** na rota (Brasil); trechos com histórico de acidentes (dados abertos da **PRF**) | Grátis | Em andamento |
| **3** | Domínio próprio + **AWS** (CloudFront, WAF, cabeçalhos de segurança); intermediário para APIs (cache e chaves) | ~US$ 10–30/mês + domínio | Planejar — ver [07-seguranca.md](07-seguranca.md) §5 |
| **4** | Notificações ("vai chover no seu trajeto amanhã"), contas de usuário, app nas lojas (Apple US$ 99/ano, Google US$ 25) | Pago | Só com usuários reais pedindo |
| **5** | Relatos da comunidade (acidente, obra) | Servidor + moderação + revisão jurídica | Só com base grande de usuários |

## Decisões em aberto (do Dalmo)
1. **Produto de verdade?** Se sim, entra na carteira de projetos e disputa tempo com os demais.
2. **Modelo de receita** (assinatura, anúncios, parceria com transportadoras/turismo?) — nenhuma decisão ainda.
3. **Licença de uso das APIs**: Open-Meteo é gratuita só para uso **não comercial**; produto pago exige plano comercial.
4. **Nome e domínio** definitivos.

## Medir antes de crescer
- **Precisão**: comparar a previsão com o tempo observado (estações oficiais) por 15–30 dias (ver resposta de 28/09).
- **Uso**: quantas viagens são planejadas e quantos links são reabertos — sem rastrear pessoas (métrica agregada, respeitando privacidade).
