# Weather Forecast

**O tempo onde você quiser e para onde você for** — previsão do tempo clara, gratuita e sem anúncios, com um diferencial: **a previsão de cada trecho da sua viagem na hora em que você vai passar por lá**.

🌦️ **Site:** https://dalmoacosta-emetos.github.io/previsao-tempo/ · 📱 instalável no celular (Safari → Compartilhar → Adicionar à Tela de Início)

Nasceu como Exercício 1 do Treinamento de IA (nota **A+**, versão congelada **3.6.1**) e hoje é **candidato a produto** — ver [roteiro](docs/06-produto-roadmap.md).

**Autor:** Dalmo Costa · **Início:** 27/09/2026 · **Versão atual:** 4.0 · [Histórico de versões](CHANGELOG.md)

## O que faz
- **Agora:** céu animado, temperatura, sensação, chuva da próxima hora, gráfico das próximas 2 horas e resumo automático.
- **Previsão:** 24 horas (toque numa hora para detalhes), 7 e 15 dias com resumo Dia/Noite, °C/°F, temperatura ou sensação.
- **Radar:** chuva agora + previsão no mapa por 24 h, com neve, gelo, mistura e névoa; mapa ampliável.
- **Alertas:** oficiais do NWS (EUA) e avisos com cuidados — vento, UV, chuva, neve, tempestade, qualidade do ar, gelo na pista.
- **Tempo na viagem:** de A até B, com data e hora (até 7 dias), tipo de veículo, trechos à noite, paradas sugeridas, melhor horário para sair, alertas oficiais na rota e o plano por e-mail, WhatsApp ou calendário — o link sempre abre atualizado.
- **Praticidade:** favoritas, link por cidade, funciona sem internet com a última previsão, acessível (WCAG 2 AA).

## Documentação
1. [Requisitos](docs/01-requisitos.md)
2. [Arquitetura](docs/02-arquitetura.md)
3. [Decisões (ADR)](docs/03-decisoes-adr.md)
4. [Plano e testes](docs/04-plano-e-testes.md)
5. [Diário de bordo](docs/05-diario-de-bordo.md)
6. [Produto e roteiro](docs/06-produto-roadmap.md)
7. [Segurança](docs/07-seguranca.md) · [Política de segurança](SECURITY.md)

## Modo demonstração
Acrescente `?demo=` ao endereço para forçar o céu: `sol`, `parcial`, `nublado`, `neblina`, `garoa`, `chuva`, `temporal`, `neve`, `tempestade`, `noite`.

## Stack
HTML, CSS e JavaScript puro (módulos ES), sem build. Dados: [Open-Meteo](https://open-meteo.com) (uso não comercial). Radar: Weather data by [RainViewer](https://www.rainviewer.com). Mapa: Leaflet, © OpenStreetMap. Hospedagem: GitHub Pages.

## Testes
Testes de ponta a ponta com as APIs simuladas, incluindo auditoria de acessibilidade (WCAG 2 AA):
```
cd tests && npm install && npx playwright install chromium && npm test
```
Rodam sozinhos no GitHub a cada envio (aba **Actions**), junto com a varredura de segurança **CodeQL**.

## Rodar localmente
Abrir com qualquer servidor estático, por exemplo: `npx serve .`
(Módulos ES não funcionam abrindo o `index.html` direto do disco.)
