# Weather Forecast

**O tempo onde você quiser e para onde você for** — previsão do tempo clara, gratuita e sem anúncios, com um diferencial: **a previsão de cada trecho da sua viagem na hora em que você vai passar por lá**.

🌦️ **Site:** https://dalmoacosta-emetos.github.io/previsao-tempo/ · 📱 instalável no celular (Safari → Compartilhar → Adicionar à Tela de Início)

Nasceu como Exercício 1 do Treinamento de IA (nota **A+**, versão congelada **3.6.1**) e hoje é **candidato a produto** — ver [roteiro](docs/06-produto-roadmap.md).

**Autor:** Dalmo Costa · **Início:** 27/09/2026 · **Versão atual:** 5.4.1 · [Histórico de versões](CHANGELOG.md)

## O que faz
- **Agora:** céu animado, temperatura, sensação, chuva da próxima hora, gráfico das próximas 2 horas e resumo automático.
- **Previsão:** 24 horas (toque numa hora para detalhes), 7 e 15 dias com resumo Dia/Noite, °C/°F, temperatura ou sensação.
- **Radar:** chuva agora + previsão no mapa por 24 h, com neve, gelo, mistura e névoa; mapa ampliável.
- **Alertas:** oficiais do NWS (EUA) e avisos com cuidados — vento, UV, chuva, neve, tempestade, qualidade do ar, gelo na pista.
- **Tempo na viagem:** de A até B, com data e hora (até 7 dias), tipo de veículo, trechos à noite, paradas sugeridas, postos de combustível, balanças de pesagem (caminhão), melhor horário para sair, alertas oficiais na rota e o plano por e-mail, WhatsApp, iPhone/Outlook ou Google Agenda — o link sempre abre atualizado.
- **Idiomas e unidades:** português, inglês e espanhol (o do celular ou escolhido no 🌐); °C/°F, km/milhas, mm/polegadas pelo costume do país ou à escolha.
- **Praticidade:** favoritas, link por cidade, funciona sem internet com a última previsão, acessível (WCAG 2 AA).

## Documentação
1. [Requisitos](docs/01-requisitos.md)
2. [Arquitetura](docs/02-arquitetura.md)
3. [Decisões (ADR)](docs/03-decisoes-adr.md)
4. [Plano e testes](docs/04-plano-e-testes.md)
5. [Diário de bordo](docs/05-diario-de-bordo.md)
6. [Produto e roteiro](docs/06-produto-roadmap.md)
7. [Segurança](docs/07-seguranca.md) · [Política de segurança](SECURITY.md)
8. [Idiomas e unidades](docs/08-idiomas-e-unidades.md) — padrão reutilizável EMET OS
9. [Concorrentes](docs/09-concorrentes.md)
10. [Identidade visual — pesquisa de cores](docs/10-identidade-visual.md)

## Modo demonstração
Acrescente `?demo=` ao endereço para forçar o céu: `sol`, `parcial`, `nublado`, `neblina`, `garoa`, `chuva`, `temporal`, `neve`, `tempestade`, `noite`.

## Stack
HTML, CSS e JavaScript puro (módulos ES), sem build. Dados: [Open-Meteo](https://open-meteo.com) (uso não comercial). Radar: Weather data by [RainViewer](https://www.rainviewer.com). Mapa: Leaflet, © OpenStreetMap. Hospedagem: GitHub Pages.

## Testes
Testes de ponta a ponta com as APIs simuladas, incluindo auditoria de acessibilidade (WCAG 2 AA):
```
cd tests && npm install && npx playwright install chromium && npm test
```
O `npm test` confere antes os dicionários de idioma com o corretor Hunspell (`sudo apt-get install hunspell hunspell-pt-br hunspell-en-us hunspell-es`).
Rodam sozinhos no GitHub a cada envio (aba **Actions**), junto com a varredura de segurança **CodeQL**.

## Rodar localmente
Abrir com qualquer servidor estático, por exemplo: `npx serve .`
(Módulos ES não funcionam abrindo o `index.html` direto do disco.)
