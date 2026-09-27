# 03 — Registro de Decisões de Arquitetura (ADR)

Formato: contexto → decisão → alternativas → consequências. Uma decisão por bloco.

---

## ADR-001 — Fonte de dados: Open-Meteo
**Status:** Aceita · 27/09/2026

**Contexto:** precisamos de dados gratuitos e confiáveis para a apresentação de segunda-feira.
**Decisão:** Open-Meteo (Forecast + Geocoding).
**Alternativas:** OpenWeatherMap (exige chave, ativação pode demorar); WeatherAPI.com (exige cadastro); NWS (só EUA).
**Consequências:** + sem chave, sem cadastro, até 16 dias, geocoding em português. − Uso gratuito é **não comercial**; sem alertas oficiais; não há % de neve nem de tempestade.

## ADR-002 — Tecnologia: HTML + CSS + JavaScript puro (sem framework)
**Status:** Aceita · 27/09/2026

**Contexto:** prazo de ~36h, apresentação para uma turma, foco em arquitetura.
**Decisão:** JavaScript puro com módulos ES (`import/export`), sem React/Vue e sem etapa de build.
**Alternativas:** React + Vite (mais "mercado", mas exige build, Node e mais pontos de falha); Next.js (excessivo).
**Consequências:** + abre em qualquer navegador, deploy é só subir arquivos, código fácil de mostrar. − Menos pronto para crescer; se o projeto evoluir, migrar para framework (ver backlog).

## ADR-003 — Hospedagem: GitHub Pages
**Status:** Proposta — **aguarda decisão do Dalmo**

**Contexto:** precisa de link público, HTTPS (geolocalização exige) e custo zero.
**Decisão proposta:** repositório público no GitHub do Dalmo + GitHub Pages.
**Alternativas:** Artifact do Claude (mais rápido, mas o código fica menos visível para a turma e não mostra histórico); Netlify/Vercel (exige mais uma conta).
**Consequências:** + histórico de commits mostra a evolução (útil na comparação final), link permanente. − Repositório precisa ser público no plano gratuito.

## ADR-004 — Uma chamada, 16 dias, conversão no cliente
**Status:** Aceita · 27/09/2026

**Decisão:** buscar sempre 16 dias em unidades métricas numa única chamada; converter °F/mph/in e cortar 7/15 dias no navegador.
**Consequências:** + trocas instantâneas, menos chamadas, menos falhas na apresentação. − Resposta um pouco maior (irrelevante para esse volume).

## ADR-005 — Alertas: avisos calculados, não oficiais
**Status:** Aceita · 27/09/2026

**Contexto:** Dalmo pediu "chance de eventos considerados para a população". A Open-Meteo não tem alertas oficiais; a NWS só cobre EUA; para o Brasil não há API simples e gratuita equivalente.
**Decisão:** avisos derivados por limites (seção 6 da arquitetura), sempre rotulados "automático, não oficial".
**Consequências:** + funciona para qualquer cidade do mundo. − Não substitui Defesa Civil/NWS. Possível evolução: integrar NWS para cidades dos EUA.

## ADR-006 — Dias 8–15 como "tendência"
**Status:** Aceita · 27/09/2026

**Decisão:** exibir os dias 8–15 com estilo visual diferente (mais claro) e o selo "tendência".
**Consequências:** honestidade com o usuário sobre a queda de precisão; responde à pergunta provável "15 dias é confiável?".

## ADR-007 — Modo demonstração dos fundos
**Status:** Aceita · 27/09/2026

**Contexto:** na apresentação o clima real pode ser só "nublado", e ninguém veria os outros fundos.
**Decisão:** parâmetro de URL `?demo=sol|nublado|chuva|neve|tempestade|noite` força o fundo, sem alterar os dados.
**Consequências:** + apresentação previsível. − Precisa deixar claro na tela que é modo demo (selo "DEMO").
