# Previsão do Tempo

Exercício do Treinamento de IA (linha de base) — construído 100% com IA.

**Autor:** Dalmo Costa · **Início:** 27/09/2026

## O que faz
Busca de cidade com autocompletar, localização atual, clima agora, previsão por hora (24h), 7 e 15 dias, °C/°F, avisos automáticos e fundo que muda conforme o clima.

## Documentação
1. [Requisitos](docs/01-requisitos.md)
2. [Arquitetura](docs/02-arquitetura.md)
3. [Decisões (ADR)](docs/03-decisoes-adr.md)
4. [Plano e testes](docs/04-plano-e-testes.md)
5. [Diário de bordo](docs/05-diario-de-bordo.md)

## Stack
HTML, CSS e JavaScript puro (módulos ES), sem build. Dados: [Open-Meteo](https://open-meteo.com) (uso não comercial). Hospedagem: GitHub Pages.

## Rodar localmente
Abrir com qualquer servidor estático, por exemplo: `npx serve .`
(Módulos ES não funcionam abrindo o `index.html` direto do disco.)
