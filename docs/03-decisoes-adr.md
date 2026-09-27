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
**Status:** Aceita · 27/09/2026 (repositório `dalmoacosta-EmetOS/previsao-tempo` criado pelo Dalmo)

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

## ADR-008 — Abertura: localização do usuário, com Boston como reserva
**Status:** Aceita · 27/09/2026 · decisão do Dalmo

**Contexto:** o Dalmo quer que o site abra na cidade de quem está usando. A localização depende de o navegador pedir permissão e de a pessoa aceitar.
**Decisão:** ordem de abertura: (1) última cidade pesquisada, se houver; (2) localização do navegador; (3) **Boston, MA** se a localização for negada, indisponível ou demorar mais de 8 s — com aviso na tela.
**Consequências:** + o site nunca abre vazio, inclusive na apresentação. − Quem nega a localização vê Boston primeiro e precisa buscar a cidade.

## ADR-009 — Visual que acompanha o clima, inspirado em portais de clima
**Status:** Aceita · 27/09/2026 · decisão do Dalmo

**Contexto:** o Dalmo pediu um visual que acompanhe a previsão do local e citou o The Weather Channel **como referência**.
**Decisão:** céu animado por cenário (sol, parcial, nublado, neblina, chuva, neve, tempestade × dia/noite) e cartões translúcidos sobre ele. Da referência vieram só o padrão geral: barra superior azul-escura, temperatura grande em destaque e faixa horizontal por hora. Sem logotipo, nome, cores exatas ou layout copiado. Ícones desenhados do zero.
**Consequências:** RF-09 (fundo dinâmico) passou de "diferencial" para parte da identidade da versão 1.0. Animações respeitam a configuração "reduzir movimento" do sistema.

## ADR-010 — Nome da cidade na localização: BigDataCloud
**Status:** Aceita · 27/09/2026

**Contexto:** a Open-Meteo não converte coordenadas em nome de cidade. Sem isso, a tela mostraria "Sua localização".
**Decisão:** usar a API gratuita e sem chave da BigDataCloud (`reverse-geocode-client`), só para descobrir o nome. Se falhar, segue com "Sua localização".
**Consequências:** + experiência melhor. − Mais um serviço externo (opcional, não bloqueia nada). Atribuição no rodapé.

## ADR-011 — Céu reage à chuva medida, não só ao código de tempo
**Status:** Aceita · 27/09/2026 · originada por teste real do Dalmo

**Contexto:** em 27/09, 08:47, chovia em Malden/Boston (Weather Channel e app Tempo do iPhone mostravam chuva), mas o site não mostrava chuva. A v1.0 decidia o cenário **só pelo código de tempo atual** (`weather_code`), que às vezes diz "nublado" enquanto o modelo já registra chuva.
**Decisão:** o cenário passa a considerar três sinais: (1) código de tempo; (2) chuva medida pelo modelo nos últimos 15 min (`current.precipitation`); (3) chuva prevista para os próximos 30 min (`minutely_15`). A partir de 0,1 mm em 15 min, o céu chove. A intensidade (garoa / chuva / temporal) muda a quantidade e o tamanho das gotas.
**Revisão 1.2 (08:58):** o 2º vídeo do Dalmo (site real em Malden) mostrou código atual = "nublado", mas a **hora atual** prevista como garoa com 95% de chance. Acrescentado 4º sinal: previsão da hora atual com chuva/neve e chance ≥ 50%. Número da versão no rodapé para saber qual versão o celular está exibindo (o GitHub Pages guarda cópia por até 10 min).
**Extras:** frase de curtíssimo prazo ("Chuva deve parar em ~45 min" / "começar em ~15 min"), como no app do iPhone; atualização automática a cada 10 min.
**Consequências:** + site condizente com o que a pessoa vê pela janela. − Dados de 15 em 15 min são medidos de fato só na América do Norte e Europa Central; no resto do mundo são interpolados (menos precisos).
**Limite honesto:** o site mostra o que o **modelo** diz, não um radar. Se o modelo errar, o site erra junto.
