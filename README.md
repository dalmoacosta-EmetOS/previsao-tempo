# Previsão do Tempo

Exercício do Treinamento de IA (linha de base) — construído 100% com IA.

**Autor:** Dalmo Costa · **Início:** 27/09/2026

## O que faz
Busca de cidade com autocompletar, radar de chuva com linha do tempo (agora → próximas 24 h) em mapa navegável, localização atual, clima agora, previsão por hora (24h), 7 e 15 dias, °C/°F, abas Temperatura/Sensação térmica, detalhe por hora, resumo Dia/Noite, alertas oficiais do NWS (EUA), avisos automáticos com cuidados (vento, UV, chuva, neve, tempestade, qualidade do ar, gelo na pista), gráfico da chuva nas próximas 2 horas, cidades favoritas, link por cidade para compartilhar, instalação na tela inicial do celular (funciona sem internet com a última previsão) e fundo que muda conforme o clima.

## Documentação
1. [Requisitos](docs/01-requisitos.md)
2. [Arquitetura](docs/02-arquitetura.md)
3. [Decisões (ADR)](docs/03-decisoes-adr.md)
4. [Plano e testes](docs/04-plano-e-testes.md)
5. [Diário de bordo](docs/05-diario-de-bordo.md)

## Modo demonstração
Acrescente `?demo=` ao endereço para forçar o céu: `sol`, `parcial`, `nublado`, `neblina`, `garoa`, `chuva`, `temporal`, `neve`, `tempestade`, `noite`.

## Stack
HTML, CSS e JavaScript puro (módulos ES), sem build. Dados: [Open-Meteo](https://open-meteo.com) (uso não comercial). Radar: Weather data by [RainViewer](https://www.rainviewer.com). Mapa: Leaflet, © OpenStreetMap. Hospedagem: GitHub Pages.

## Testes
Testes de ponta a ponta com as APIs simuladas, incluindo auditoria de acessibilidade (WCAG 2 AA):
```
cd tests && npm install && npx playwright install chromium && npm test
```
Rodam sozinhos no GitHub a cada envio (aba **Actions**).

## Rodar localmente
Abrir com qualquer servidor estático, por exemplo: `npx serve .`
(Módulos ES não funcionam abrindo o `index.html` direto do disco.)
