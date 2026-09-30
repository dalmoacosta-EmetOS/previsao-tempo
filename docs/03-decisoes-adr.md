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
**Revisão 2.3.1 (28/09, 08:17):** o Dalmo, dirigindo em Malden, viu o céu chovendo e a frase "Chuva deve começar em ~60 min". Causa: o céu usava os 4 sinais, mas a frase olhava **só** a série de 15 em 15 min (seca agora, molhada em 60 min). Eram duas decisões diferentes para a mesma pergunta. Correção: a frase passa a obedecer à decisão do céu. Se o céu chove, a frase **nunca** diz "começa"; diz "para em ~X min" ou "continua" só quando a série de 15 min também está molhada agora; se os sinais divergem, a frase **fica em silêncio**. Melhor não dizer nada do que contradizer a tela.
**Consequências:** + site condizente com o que a pessoa vê pela janela. − Dados de 15 em 15 min são medidos de fato só na América do Norte e Europa Central; no resto do mundo são interpolados (menos precisos).
**Limite honesto:** o site mostra o que o **modelo** diz, não um radar. Se o modelo errar, o site erra junto.

## ADR-012 — Radar animado de chuva (RainViewer + Leaflet)
**Status:** Aceita · 27/09/2026 · pedido do Dalmo ("uso muito o radar do Weather Channel para ver para onde a chuva vai")

**Contexto:** o radar mostra o movimento real das áreas de chuva — algo que a previsão numérica sozinha não mostra.
**Decisão:** cartão "Radar de chuva" com mapa (Leaflet, via cdnjs) + camadas de radar da **RainViewer** (grátis, sem chave, atribuição obrigatória "Weather data by RainViewer"). Animação das **últimas ~2 horas**, de 10 em 10 min, com ▶/❚❚ e barra de tempo. Marcador da cidade com seta da direção do vento.
**Alternativas:** radar do Weather Channel/Apple (pagos, sem API aberta); NOAA/NWS (só EUA, mais complexo); OpenWeatherMap (exige chave).
**Limites honestos:**
- Mostra o **passado** (2 h). O futuro foi resolvido no ADR-013. *(Correção do Dalmo: no app do Weather Channel o radar futuro de 24 h é gratuito; só o de 72 h é pago.)*
- Zoom do radar vai até nível 7 (visão regional). Aproximando mais, a imagem fica "quadriculada".
- Serviço sem garantia de disponibilidade.
**Revisão 1.5 (10:45):** no teste real do Dalmo o mapa de fundo mostrou "API KEY REQUIRED" — o CARTO passou a exigir chave. Trocado por **OpenStreetMap** (grátis, sem chave), escurecido por filtro CSS. Lição: o teste automático simulava o mapa e por isso não pegou; serviço de terceiros só se valida com o serviço real.
**Cobertura:** radar só existe onde há radares meteorológicos (EUA, Europa, parte da América do Sul/Ásia etc.). Em regiões sem radar (ex.: Sibéria) o quadro de radar fica vazio — a previsão do modelo (ADR-013) continua funcionando.
**Isolamento:** módulo separado (`api/radar.js`, `ui/radar.js`). A biblioteca de mapa só é baixada quando o cartão aparece na tela. Se o radar falhar, só o cartão mostra aviso — o restante do site continua (testado).

## ADR-013 — "Radar futuro" de 24 h com a previsão do modelo
**Status:** Aceita · 27/09/2026 · pedido do Dalmo ("6 horas já seria ótimo; o ideal seria 24 h")

**Contexto:** o "Future Radar" dos apps de clima não é radar: é a chuva **prevista pelo modelo** desenhada no mapa. Não há serviço gratuito e sem chave que entregue essas imagens prontas.
**Decisão:** montar o próprio "radar futuro": **uma única chamada** à Open-Meteo com uma grade de **13 × 13 = 169 pontos** ao redor da cidade (±3,2° lat, ±4,4° lon), pedindo chuva e neve hora a hora para as **próximas 24 h**. O navegador desenha cada hora num `canvas` com interpolação suave e sobrepõe ao mapa. Mesma escala de cores do radar; neve em lilás.
**Linha do tempo única:** −2 h (radar real) → **agora** → +24 h (previsão). ▶ conta a história inteira. Selo no mapa diz **RADAR** ou **PREVISÃO DO MODELO**, e um aviso explica que a previsão é aproximada.
**Custos e limites:**
- Cada carga da grade conta como 169 chamadas na cota gratuita da Open-Meteo (10.000/dia por IP). Por isso a grade só é recarregada a cada **60 min** ou ao trocar de cidade.
- Resolução ≈ 30–50 km por ponto: mostra **para onde as áreas de chuva vão**, não a rua exata.
- A área calculada cobre ~700 × 700 km; afastando muito o mapa, a previsão acaba numa borda esfumaçada.
**Isolamento:** radar e previsão falham de forma independente — se um cair, o outro continua; se os dois caírem, só o cartão mostra aviso (testado).

## ADR-014 — Mapa navegável e foco no futuro
**Status:** Aceita · 27/09/2026 · pedidos do Dalmo (10:50 e 10:55)

**Pedidos:** (1) ver nomes de país, estado e cidade conforme o zoom; (2) navegar pelo mapa-múndi plano; (3) botão para voltar à cidade selecionada ou à minha localização; (4) "não preciso ver as 2 h anteriores — foco no que virá".
**Decisões:**
- Nomes: vêm do próprio mapa do OpenStreetMap (países no zoom 2–4, estados 5–6, cidades 7+).
- Navegação livre do zoom 2 (mundo) ao 11 (cidade), arrastando; mundo "dá a volta" (`worldCopyJump`). No computador, a roda do mouse só dá zoom depois de clicar no mapa (para não sequestrar a rolagem da página).
- Botões abaixo do +/−: **casa** (volta à cidade selecionada) e **mira** (vai à localização do aparelho, com ponto azul).
- **Defeito corrigido:** o mapa recentralizava sozinho a cada atualização da tela (trocar °C/°F, atualização automática), o que impediria a navegação. Agora só recentraliza quando a **cidade** muda.
- Linha do tempo passa a ser **agora → +24 h**. Do passado fica só o quadro de radar mais recente, que é o **"agora"** — o único dado observado de verdade (discordância registrada: sem ele, até o presente seria estimativa).
**Limite:** a previsão desenhada cobre ~700 km ao redor da cidade selecionada; navegando para longe, aparece só o radar (onde houver cobertura).

## ADR-015 — Abas Temperatura/Sensação, mapa claro e idioma (adiado)
**Status:** Aceita · 27/09/2026 · pedidos do Dalmo (10:58–10:59)

- **Abas "Temperatura | Sensação"** nas 24 h e nos dias (sincronizadas, lembradas no navegador). Sensação térmica = `apparent_temperature` (vento, umidade e sol incluídos).
- **Mapa claro por padrão**, com botão **Claro | Escuro**. O filtro escuro da v1.5 deixava nomes e chuva pouco legíveis ("tô achando a imagem escura").
- **Idioma ligado à unidade (°C = português, °F = inglês): recusado.** Motivo: são escolhas independentes (ex.: brasileiro nos EUA quer °F em português). Alternativa proposta: botão de idioma PT/EN separado, iniciando pelo idioma do navegador. **Adiado para depois da apresentação**: > 100 textos para traduzir e testar em todas as telas na véspera — risco alto, ganho pequeno para o exercício.

## ADR-016 — Versão carimbada em todos os arquivos (cache)
**Status:** Aceita · 27/09/2026 · defeito achado pelo Dalmo ("estou na 1.7 e não acho o botão Sensação")

**Contexto:** o rodapé mostrava 1.7, mas o celular usava **cópias antigas** de arquivos internos (ex.: `hourly.js`) guardadas em cache — só o arquivo principal tinha `?v=`. Resultado: versão "nova" com peças velhas.
**Decisão:** script `tools/versao.sh X.Y.Z` carimba `?v=X.Y.Z` em **todos** os `import`, no `index.html` e no rodapé. Toda publicação passa por ele.
**Lição:** "a versão no rodapé" só é confiável se todos os arquivos mudarem de endereço juntos.

## ADR-017 — Toque imediato na busca, boas-vindas e navegação
**Status:** Aceita · 27/09/2026 · pedidos do Dalmo (11:22)

- **Defeito corrigido:** no iPhone, tocar na cidade sugerida só funcionava "depois de alguns segundos". A lista reagia a `mousedown`, que no celular chega atrasado após o toque. Trocado por `pointerdown` (responde ao toque na hora) — teste mede < 1,5 s.
- **Boas-vindas** no topo: saudação pelo horário ("Bom dia! Seja bem-vindo.") + razão de ser: *"A previsão do tempo clara e confiável, para você se manter bem informado e planejar o seu dia com tranquilidade."* (a partir do texto do Dalmo).
- **Barra fixa da cidade:** ao rolar, cidade + ícone + temperatura + condição ficam presos no topo. Tocar nela volta ao topo.
- **Voltar ao topo:** botão com seta no fim da página.

## ADR-018 — Legenda no padrão dos apps de clima, animação mais rápida e conferência da grade
**Status:** Aceita · 27/09/2026 · teste real do Dalmo em Boston (11:29–11:35)

**Confirmado com dado real:** céu chovendo em Boston ("Garoa", "Chuva deve parar em ~15 min") — ADR-011 validado. Barra fixa e voltar ao topo OK.
**Pedidos e problemas:**
- Animação lenta → passo de 650 ms para **350 ms**.
- "Botão play no meio do mapa atrapalha" → era a **seta do vento** desenhada ao redor da cidade (parecia ▶). Saiu do mapa; virou seta ao lado de "Vento …" na legenda. No mapa fica só um ponto discreto da cidade.
- **Faltava legenda** → legenda com Fraca / Moderada / Forte / Muito forte / Neve, nas cores que o público conhece (verde → amarelo → vermelho; neve em azul). Limites usuais de intensidade: 2,5 · 7,6 · 15 mm/h. A escala anterior pintava chuva moderada (4 mm/h) de amarelo e 16 mm/h de vermelho — exagerava a intensidade.
- Radar tenta o esquema de cores 4 (estilo Weather Channel) da RainViewer; se o serviço gratuito recusar, volta sozinho ao esquema 2.
- **Mancha centrada em Boston em +13 h e +20 h** (o Weather Channel mostrava chuva espalhada): teste com chuva uniforme simulada saiu uniforme → o desenho está certo; a mancha veio dos **dados**. Hipóteses: tempestade estacionária real ou diferença entre modelos. **Não confirmado.** Criado `?debug=grade`, que escreve no mapa o valor previsto (mm/h) em cada ponto, para conferir com dado real.

## ADR-019 — Detalhe da hora e resumo Dia/Noite
**Status:** Aceita · 27/09/2026 · pedido do Dalmo (referência: Weather Channel)

- **Tocar numa hora** abre o detalhe: chance e quantidade de chuva, vento (com seta), rajadas, umidade, nuvens, índice UV e visibilidade. Tocar de novo (ou no ×) fecha.
- **Tocar num dia** abre as abas **Dia (06–18 h) | Noite (18–06 h)** com um resumo escrito: condição dominante (e mudança "no início… depois…"), máxima/mínima, vento com direção média e faixa de velocidade, rajadas fortes, chance de chuva e acumulado.
- **Honestidade:** no Weather Channel esses textos são de meteorologistas; os nossos são **gerados automaticamente** a partir dos números da previsão — e dizem isso na tela.
- A API passou a trazer, por hora: umidade, vento, direção, rajadas, nuvens, UV, visibilidade e neve (mesma chamada única — ADR-004).
- **Defeito achado na revisão visual:** aparecia "false" solto na tela quando um item opcional não existia. Criado `fill()` em `ui/dom.js`, que ignora itens vazios; teste automático procura "false" na página.

## ADR-020 — Alertas oficiais (NWS, só EUA)
**Status:** Aceita · 27/09/2026 · pedido do Dalmo ("alerta de enchente, como no Weather Channel")

**Decisão:** para cidades dentro dos EUA, buscar os alertas ativos do **National Weather Service** (`api.weather.gov/alerts/active?point=…`, grátis, sem chave). Exibir antes dos avisos automáticos, com selo **OFICIAL**, título em português (tabela com ~40 tipos de alerta), validade no horário da cidade e o **texto original em inglês** ao tocar.
**Fora dos EUA:** nenhuma chamada; ficam só os avisos automáticos (ADR-005). Não há serviço equivalente gratuito e simples para o Brasil.
**Isolamento:** a busca roda em paralelo à previsão; se falhar, o site segue sem ela.
**Limite:** tradução só do título; o corpo do alerta fica em inglês (traduzir texto oficial automaticamente poderia distorcer instruções de segurança).

## ADR-021 — Resumo do "agora", correção das horas no iPhone e diagnósticos
**Status:** Aceita · 27/09/2026 · teste real do Dalmo no iPhone e no Mac (15:59–16:05)

- **Resumo "Agora"** no espaço vazio ao lado da cidade (computador) / logo abaixo da temperatura (celular): condição + temperatura + sensação; quando a chuva começa ou diminui nas próximas 12 h ("Chuva provável por volta das 16:00", como o *Outlook* do Weather Channel); e o restante do dia.
- **Defeito (iPhone):** as caixas das 24 h ficaram brancas e ilegíveis — ao virarem botões (v2.0), o Safari do iPhone aplicou o visual de botão do sistema. No Mac estavam certas. Corrigido com `appearance: none` em todos os botões + teste que verifica isso.
- **Defeito (texto):** o resumo podia dizer "Sem chuva prevista" e, na linha seguinte, "Restante de hoje: chuva no início". Causa: duas regras diferentes para "hora com chuva". Criada **uma regra única** (`isWetHour`) + teste de contradição.
- **Arquivo órfão removido:** `js/ui/render.js`, sobra da primeira escrita interrompida (27/09 08:26), nunca usado.
- **Mancha do radar:** com o site real em "+8 h", a chuva prevista apareceu em Connecticut e New Hampshire, não mais centrada em Boston → o desenho acompanha a previsão; a diferença para o Weather Channel é a **fonte de dados** (modelos e resolução deles são outros).
- **Alerta oficial não apareceu em Malden:** causa não confirmada (o alerta de enchente expirava às 14:30; ou a consulta ao NWS falha). `?debug=grade` agora escreve no rodapé o resultado da consulta ao NWS.
- Comparação Mac × iPhone só vale na **mesma cidade, mesma hora da barra e mesma versão**.

## ADR-022 — Pontos de atenção no "Hoje em detalhe" com recomendações
**Status:** Aceita · 27/09/2026 · pedido do Dalmo (16:15)

**Confirmado com dado real (v2.1):** alerta OFICIAL "Vigilância de enchente (Flood Watch)" apareceu em Malden → consulta ao NWS funciona (antes simplesmente não havia alerta ativo). Horas legíveis no iPhone.
**Decisão:** quadros ficam **amarelos** (atenção) ou **vermelhos** (perigo) quando passam de limites; tocar (celular) ou passar o mouse (computador) abre recomendações **Caminhando / Dirigindo / Em casa**.

| Quadro | Amarelo | Vermelho | Referência |
|---|---|---|---|
| Rajadas | ≥ 40 km/h | ≥ 62 km/h | Beaufort 6 / 8 (ventania) |
| Vento máx. | ≥ 39 km/h | ≥ 62 km/h | Beaufort |
| Índice UV | ≥ 6 | ≥ 8 | OMS |
| Chuva hoje | ≥ 30 mm/dia ou 20 mm/h | ≥ 50 mm/dia ou 30 mm/h | faixas dos avisos do INMET |
| Neve | > 0 | ≥ 10 cm | — |
| Tempestade | risco moderado | risco alto | estimativa do site (ADR-005) |

**Discordância registrada:** o Dalmo sugeriu 30 km/h para o vento; a IA recomendou 40 km/h, porque 30 km/h é brisa comum (Beaufort 4–5) — o painel ficaria vermelho quase todo dia e perderia o efeito de alerta.
**Honestidade:** recomendações gerais de segurança no estilo Defesa Civil, **não texto de lei**; rotuladas na tela, com as referências.
**Mapa:** chuva fraca desenhada em verde mais forte e opaco (antes quase transparente), aproximando a leitura do Weather Channel.

## ADR-023 — Legenda muda com o quadro (radar azul × previsão verde)
**Status:** Aceita · 27/09/2026 · defeito achado pelo Dalmo (16:25)

**Problema:** no quadro "agora (radar)" o mapa mostrava chuva em **azul**, mas a legenda dizia "azul = neve". A imagem do radar vem pronta da RainViewer; o esquema de cores 4 (verde, estilo Weather Channel) foi **recusado pelo serviço gratuito** e o site voltou sozinho ao esquema 2 (azul) — sem ajustar a legenda (ADR-018 assumiu que o 4 funcionaria; nunca foi verificado com o serviço real).
**Decisão:** duas legendas, e só aparece a do quadro na tela: **Radar** (azul-claro → azul → amarelo → vermelho) e **Previsão** (verde → verde-escuro → amarelo → vermelho + neve). Neve da previsão passa a **lilás** para não confundir com o azul do radar. Radar fixado no esquema 2 (sem tentativa inútil do 4).
**Lição:** a hipótese "o esquema 4 funciona" ficou sem teste real por 5 versões. Testes com dados simulados não validam um serviço de terceiros.

## ADR-024 — Uma paleta só, no padrão Weather Channel (radar repintado no aparelho)
**Status:** Aceita · 28/09/2026 · pedido do Dalmo (prints do site às 13:08 e da legenda do Weather Channel às 13:13) · substitui a parte de cores do ADR-023

**Contexto:** no mesmo player, o quadro "agora" (radar) aparecia em **azul** e, ao apertar ▶, a previsão virava **verde**, com a legenda trocando junto. O Dalmo apontou: "está dúbio — ou fica tudo azul, ou tudo verde". O ADR-023 só explicava a diferença; não a eliminava. A RainViewer gratuita entrega o radar apenas no esquema azul (o esquema verde foi recusado).
**Decisão:** seguir a referência profissional (Weather Channel): **chuva** em verde → verde-escuro → amarelo → vermelho; **neve** em azul. O radar é **repintado no aparelho**: cada ladrilho vai para um canvas e cada cor azul da RainViewer vira a equivalente verde (azul-claro→Fraca, azul-escuro→Moderada, amarelo→Forte, laranja/vermelho/rosa→Muito forte). Uma legenda só para o player inteiro.
**Fora (não existe nos dados gratuitos):** gelo e mistura (a previsão só separa chuva e neve); névoa não é precipitação. As áreas rosa/laranja do mapa do Weather Channel são **alertas oficiais**, não chuva — nosso site já mostra esses alertas em cartão próprio.
**Limites honestos:**
- O radar "agora" não separa neve de chuva no plano gratuito: neve apareceria verde ali. Por isso a legenda diz "Neve (previsão)". Validar no primeiro dia de neve.
- Se o navegador não permitir ler o ladrilho do radar (permissão do servidor), o radar aparece nas cores originais e a legenda original é mostrada **só** nesse quadro — nunca uma legenda que não bate com o mapa.
**Lição:** a IA propôs duas legendas (ADR-023) porque era o que o serviço permitia; o usuário cobrou o padrão profissional e havia um caminho técnico (repintar) que a IA não tinha considerado.

## ADR-025 — Névoa, gelo e mistura no mapa
**Status:** Aceita · 28/09/2026 · o Dalmo discordou do ADR-024 ("névoa deve entrar no radar"; "gelo precisa constar")

**Contexto:** no ADR-024 a IA deixou névoa, gelo e mistura de fora dizendo que "os dados não existem". **Estava errado:** a previsão gratuita (Open-Meteo) informa, hora a hora, o código de tempo (neblina 45/48; garoa e chuva congelante 56/57/66/67), a visibilidade e a separação chuva × neve. O argumento do Dalmo: uma família que vai passar por serra com neblina, ou por área com gelo, precisa ver isso no mapa para escolher o caminho.
**Decisão:** a grade do mapa passa a pedir também `rain`, `weather_code` e `visibility`. Cada ponto recebe um tipo: **gelo** (roxo) se o código for congelante; **mistura** (rosa) se cair chuva e neve juntas; **neve** (azul); **chuva** (verde→vermelho). **Névoa** (amarelo-claro) onde há código de neblina ou visibilidade < 1 km e não está chovendo. A chuva deixa de usar amarelo (Forte = verde-escuro, como na legenda do Weather Channel) para não confundir com névoa.
**No quadro "agora":** o radar de verdade só enxerga gotas — não enxerga névoa e não diz se a gota é chuva, neve ou gelo (isso vale para qualquer radar, pago ou gratuito). Por isso, sobre o radar, o site sobrepõe neve, gelo, mistura e névoa da **hora atual do modelo**, e a nota do cartão diz isso.
**Limite honesto — gelo na pista (black ice):** é gelo que se forma no asfalto depois da chuva, com temperatura abaixo de zero; não cai do céu, então não aparece em radar nem no mapa de precipitação. O que o site mostra dele são os **alertas oficiais do NWS** (ex.: Winter Weather Advisory). Ideia para depois: aviso próprio quando chover e a temperatura cair abaixo de 0 °C nas horas seguintes.
**Lição:** a IA confundiu "o radar não mostra" com "o dado não existe". O usuário, pensando no uso real (viagem, estrada), forçou a checagem.

## ADR-026 — Barra da cidade por cima do conteúdo (fim da página tremendo)
**Status:** Aceita · 28/09/2026 · vídeo do Dalmo no iPhone (13:39)

**Problema:** parado num certo ponto da rolagem, a página tremia sem parar. Medido no vídeo quadro a quadro: todo o conteúdo pulava até ~13 px para cima e para baixo, várias vezes por segundo; só a barra do topo ficava parada.
**Causa:** a barra fixa da cidade (ADR-017) **ocupava espaço** ao aparecer. Exatamente no ponto de virada: a barra aparece → empurra a página ~46 px → o bloco da cidade volta à tela → a barra some → a página sobe → o bloco sai da tela → a barra aparece... um ciclo infinito. No computador o navegador compensa sozinho (por isso os testes não pegaram); o Safari do iPhone não.
**Decisão:** a barra passa a ficar **por cima** do conteúdo, sem ocupar espaço. Aparecer ou sumir não mexe mais em nada da página. Teste novo: ligar/desligar a barra não pode mover o conteúdo nem 1 px (a versão antiga movia 46 px).

## ADR-027 — Bloco principal no estilo do Weather Channel
**Status:** Aceita · 28/09/2026 · pedido do Dalmo (prints lado a lado do app do Weather Channel e do site, 14:04)

**Decisão:** o topo passa a se inspirar na disposição do Weather Channel, ajustada ao nosso objetivo (princípio de referência, doc 01): **temperatura bem grande e forte à esquerda**; **ícone e condição à direita** (o ícone muda conforme o tempo: sol, nuvem, chuva, neve, trovoada, neblina); abaixo, uma linha **Sensação | Máx | Mín** e outra **Chuva na próxima hora % | quantidade**. Sensação e Máx/Mín saem dos quadradinhos (estavam repetidos); ficam Umidade e Vento.
**Mantido do nosso jeito:** o resumo "Agora" (mais completo que o "Outlook" do Weather Channel) e a frase curta da chuva. **Não aproveitado:** manchete de notícia e anúncio no meio da tela.

## ADR-028 — Ícones com traço mais maduro
**Status:** Aceita · 28/09/2026 · Dalmo: "nuvem com gotas representadas por pontos… tão infantil"

**Decisão:** a família de precipitação foi redesenhada junto (trocar só a garoa deixaria o conjunto desigual): nuvens com leve degradê (volume); **garoa** = riscos curtos e finos; **chuva** = riscos longos inclinados; **chuva forte** = mais riscos, nuvem escura; **neve** = flocos de 6 pontas (não bolinhas); **gelo/mistura** = risco + floco. Sol, lua, neblina e raio mantidos.

## ADR-029 — Testes dentro do projeto e rodando sozinhos no GitHub
**Status:** Aceita · 28/09/2026 · análise crítica do site (pedido do Dalmo)
**Contexto:** os testes existiam só na área de trabalho da IA; se a sessão acabasse, iam junto.
**Decisão:** pasta `tests/` no repositório (`npm test`), com as APIs simuladas e imagens de apoio em `tests/fixtures/`. Arquivo `.github/workflows/testes.yml` roda tudo a cada envio (GitHub Actions, gratuito para repositório público) e guarda as capturas de tela como anexo da execução.

## ADR-030 — Link por cidade, compartilhar e cidades favoritas
**Decisão:** o endereço acompanha a cidade (`?cidade=…&lat=…&lon=…`); quem abre o link vê a mesma cidade. Botão de compartilhar (menu do celular; no computador, copia o link). Estrela ☆/★ salva a cidade nas favoritas (até 8, só neste aparelho), mostradas como atalhos acima do bloco principal. Ordem de abertura: link → última cidade → localização → Boston.
**Limite honesto:** a prévia do link (imagem e título no WhatsApp) é a mesma para todas as cidades — personalizar por cidade exigiria servidor.

## ADR-031 — Qualidade do ar (índice AQI dos EUA)
**Decisão:** quadro "Qualidade do ar" no "Hoje em detalhe" com o índice da EPA (0–500) e a faixa (Boa, Moderada, Ruim p/ sensíveis, Ruim, Muito ruim, Perigosa), cor por faixa; amarelo a partir de 101, vermelho a partir de 151, com cuidados. Fonte: Open-Meteo Air Quality (grátis, modelos CAMS). Se falhar, mostra "--" e o resto segue.
**Fora:** pólen (na fonte gratuita só existe para a Europa).

## ADR-032 — Aviso de gelo na pista (black ice)
**Decisão:** quadro "Gelo na pista" (próximas 24 h), estimativa do site: **Provável** (vermelho) se houver garoa/chuva congelante ou chuva caindo com ≤ 0 °C; **Possível** (amarelo) se a pista molhar e a temperatura chegar a ≤ 0 °C em até 6 h; senão "Sem risco". Cuidados para caminhar, dirigir e em casa. Complementa — não substitui — os alertas oficiais do NWS.

## ADR-033 — Gráfico da chuva nas próximas 2 horas
**Decisão:** barras de 15 em 15 min (dados `minutely_15` que já vinham), cores iguais às do radar, só aparece quando há chuva/neve. **Limite honesto:** resolução de 15 min, não minuto a minuto (isso é dado pago).

## ADR-034 — Instalar na tela inicial e funcionar sem internet
**Decisão:** manifesto + ícones (o site vira "app" na tela inicial do iPhone, em tela cheia) e `sw.js` com estratégia **rede primeiro**: com internet sempre busca o novo (evita repetir o problema de cache do ADR-016); sem internet mostra a última cópia, inclusive a última previsão consultada. Mapas e radar não são guardados (pesados). Prévia ao compartilhar (Open Graph) com imagem própria.

## ADR-035 — Acessibilidade medida (WCAG 2 AA)
**Contexto:** acessibilidade nunca tinha sido medida.
**Decisão:** auditoria automática com axe-core dentro dos testes (celular com chuva e computador com sol). Achados e correções: abas com atributo indevido; selo "OFICIAL" com contraste baixo (vermelho escurecido); lista de dias e quadros clicáveis quebravam a semântica de lista (agora um botão invisível cobre a linha/quadro, com descrição completa para leitor de tela e foco visível); mapa marcado como imagem apesar de ter botões. Resultado: zero falhas nas regras automáticas. **Limite:** regras automáticas pegam ~30–40% dos problemas; teste com VoiceOver no iPhone continua recomendado.

## ADR-036 — Link recebido: localização primeiro, cidade do link se negar
**Status:** Aceita · 28/09/2026 · decisão do Dalmo (substitui a ordem de abertura do ADR-030)
**Decisão:** ao abrir um link com cidade, o site pede a localização. Aceitou → mostra a cidade de quem abriu. Negou (ou falhou) → mostra a cidade do link, com aviso.
**Consequência conhecida (apontada pela IA e aceita):** quem aceitar a localização não verá a cidade enviada. Se o navegador já tiver permissão salva, nem pergunta — vai direto para a cidade de quem abriu.

## ADR-037 — Radar sem "halo" vermelho falso
**Status:** Aceita · 28/09/2026 · print do Dalmo (15:29) com bordas avermelhadas em volta da chuva verde
**Causa provável:** na repintura do ADR-024, cores do radar que não eram claramente azuis nem amarelas (cinzas quentes, bordas suavizadas de eco fraco) caíam na regra "senão = muito forte" e viravam vermelho — exagerando chuva fraca.
**Decisão:** regra conservadora: cinza/branco/pouco saturado → Fraca; só laranja, vermelho ou rosa intensos → Muito forte; qualquer cor ambígua → Fraca. Teste com ladrilho contendo cinzas e bordas semitransparentes: nenhum pixel vermelho.

## ADR-038 — Nome: Weather Forecast
**Status:** Aceita · 28/09/2026 · decisão do Dalmo
**Decisão:** o site passa a se chamar **Weather Forecast** (topo, título da aba, app instalado, prévia do link). Boas-vindas (revisada pelo Dalmo às 15:59): "Weather Forecast: o tempo onde você quiser e para onde você for, de maneira clara e precisa, para você se planejar bem." O conteúdo continua em português.
**Endereço:** um endereço só "weatherforecast" exige domínio próprio (pago). Grátis, o mais curto possível é renomear o repositório → `dalmoacosta-emetos.github.io/weatherforecast` (o endereço antigo deixa de funcionar).

## ADR-039 — Tempo na viagem (de A até B)
**Status:** Aceita · 28/09/2026 · ideia do Dalmo ("planejamento de rota, como no GPS, com o tempo do trajeto") · desenvolvida em ~1 h num ramo separado, com a v3.2.1 congelada (ramo `congelado-v3.2.1`)
**Decisão:** cartão "Tempo na viagem": saída (padrão = cidade da página), destino (busca), horário de saída (agora, +1/2/3/6 h, amanhã 6h/8h/14h). O site pede a rota de carro ao **OSRM** (grátis, sem chave, dados do OpenStreetMap), escolhe pontos a cada 30 min (viagens até 3 h), 60 min (até 8 h) ou 120 min, e busca numa única chamada à Open-Meteo a previsão **na hora em que o carro passa por cada ponto**. Cada trecho é classificado (chuva fraca/moderada/forte, neve, gelo, névoa pela visibilidade, rajadas, tempestade); o topo resume o pior trecho ("Atenção: chuva forte perto de X por volta das 19h55"); mapa com a rota e pontos coloridos.
**Limites honestos:** tempo de viagem sem trânsito e com velocidade média constante; previsão até ~2,5 dias; o OSRM público é um servidor de demonstração, sem garantia — se falhar, o cartão avisa e o resto do site segue; não foi possível testar o OSRM real a partir do ambiente da IA (só com dados simulados).
**Revisão 3.3.1 (18:04):** a pedido do Dalmo, o cartão fica **fechado**: só aparece o botão "Planeje seu passeio ou viagem — Veja o tempo em cada trecho do caminho"; o formulário abre ao tocar (e fecha no segundo toque), com o cursor já no destino.
**Revisão 3.4 (18:11, após teste real Brasília → Santa Rita do Itueto, 1.089 km — rota real funcionou):** (1) trecho com alerta vira clicável e abre os cuidados no mesmo padrão do "Hoje em detalhe" (🚗 Dirigindo / 🚶 Nas paradas), com cuidados novos para **névoa**; (2) a cidade escolhida aparece **dentro do próprio campo** (De / Para), sem rótulo no canto; (3) texto deixa claro "viagem por estrada (carro ou ônibus)". **Avião ficou de fora** (decisão conjunta): no voo só importa o tempo na saída e na chegada, não no caminho.
**Revisão 3.5 (18:26):** botão "minha localização" (mira) dentro do campo **De**; correção do mapa da rota que ficava com zoom preso na cidade de saída (o mapa media o tamanho antes de aparecer — agora reajusta depois).

## ADR-040 — Revisão de segurança
**Status:** Aceita · 28/09/2026 · pedido do Dalmo ("algum teste de segurança?")
**Achados e correções:**
- **Injeção de código pelo nome da cidade (corrigido):** no mapa da viagem, a dica sobre cada ponto usava o nome vindo de serviço externo como HTML. Um nome malicioso poderia virar código na página. Agora entra como texto. Teste com nome malicioso: a versão antiga falhava, a nova passa.
- **Política de segurança (CSP) na página:** só executa código do próprio site e só conversa com os serviços listados (previsão, qualidade do ar, busca, nome do local, radar, alertas, rotas). É a segunda camada: mesmo com o defeito acima, o navegador bloquearia o código.
- **Mapa (Leaflet) hospedado no próprio site** em vez de vir de outro servidor: nenhum código de terceiros roda na página.
- Conferidos sem problema: nenhuma chave ou senha no código; links externos com `noopener`; nome no link (`?cidade=`) entra como texto; localização só com permissão; dados guardados só no aparelho (última cidade, favoritas, preferências). Dependências dos testes sem vulnerabilidades conhecidas (npm audit).
**Pendente (fora do código):** limitar o acesso do app do Claude no GitHub só a este repositório.
**Revisão 3.5.2 (18:53) — efeito colateral da CSP, achado pelo Dalmo no iPhone:** o nome da cidade sumiu ("Sua localização"; na viagem "km 74" em vez de nomes). Causa: o BigDataCloud passou a redirecionar `api.bigdatacloud.net` → `api-bdc.io`, e a CSP só liberava o endereço antigo — o redirecionamento era bloqueado. Correção: chamar `api-bdc.io` direto e liberar os dois na CSP. Os testes agora simulam o redirecionamento real (a versão 3.5.1 falha nele, a 3.5.2 passa). **Lição:** testes com respostas simuladas não viram o redirecionamento; de novo, o uso real achou.

## ADR-041 — Ampliar o mapa
**Status:** Aceita · 28/09/2026 · último pedido do exercício (Dalmo)
**Decisão:** botão ⤢ no canto do mapa do radar e do mapa da viagem. Tocar no mapa continua servindo para arrastar; o botão amplia para a tela toda (no radar, o cartão inteiro: mapa + ▶ + legenda). ✕ ou Esc volta. Enquanto ampliado, o mapa é movido para o nível da página (efeitos de vidro dos cartões impediam o "tela cheia" — o teste pegou isso na viagem).
**Congelamento:** a v3.6 encerra o exercício 1 (ramo `congelado-v3.6`).
**Revisão 3.6.1 (19:28) — falha no iPhone achada pelo Dalmo:** ao tocar em ⤢ o mapa "fechava" e não abria de novo. A 1ª versão tirava o mapa do lugar e o fazia flutuar por cima da página; no Safari do iPhone isso falhou (no Chromium funcionava — não temos Safari no ambiente de testes). Troca por um método sem esse risco: o mapa **cresce no próprio lugar** (quase a altura da tela) e a página rola até ele; tocar de novo volta ao tamanho normal. O teste também pegou que uma animação de altura confundia o mapa sobre o próprio tamanho — removida. **Congelamento atualizado para a v3.6.1** (ramo `congelado-v3.6`).

## ADR-042 — Fase 1 do produto: viagem completa
**Status:** Aceita · 28/09/2026 · pedido do Dalmo após a nota A+ ("faça a implementação das outras funções agora"). Versão do exercício congelada antes: **3.6.1** (ramo `congelado-v3.6.1`).
**Decisões:**
- **Data e hora de saída** livres, até **7 dias** à frente (NOAA: 7 dias ≈ 80% de acerto; 10+ dias ≈ metade). Acima disso o site recusa.
- **Aviso de confiabilidade** por antecedência (até 3 dias "confiável por trecho"; 4–7 "tendência") e por país: **EUA → números da NOAA com link**; **Brasil → sem percentual (não achamos número oficial do INMET/CPTEC), aviso sobre pancadas de chuva e link de alertas do INMET**; outros países → aviso genérico.
- **Veículo**: carro/ônibus (limites de antes), **moto** (chuva a partir de 0,2 mm/h já pede atenção; rajadas 30/50 km/h; noite = atenção), **caminhão/van/reboque** (rajadas 30/50 km/h — vento lateral).
- **Noite**: cada ponto marca se é dia ou noite na hora da passagem.
- **Melhor horário**: com a rota e a série de previsão já baixadas, testa saídas de −3 h a +6 h e sugere a de menor risco (se melhorar de fato); botão "Usar este horário".
- **Paradas sugeridas** a cada ~2 h de estrada.
- **Alertas oficiais do NWS ao longo da rota** (EUA), considerando o horário de passagem.
- **Levar o plano**: link com origem, destino, saída e veículo (validado ao abrir) — por **e-mail** (abre o e-mail do próprio usuário), **WhatsApp**, **calendário** (.ics com lembrete na véspera e 2 h antes) e **copiar link**. Ao abrir o link, a viagem é **recalculada com a previsão mais nova**; se o horário já passou, recalcula saindo agora e avisa.
**Fora (Fase 2+):** alertas do INMET na rota (confirmar fonte), postos, dados da PRF, notificações, relatos de usuários — ver [06-produto-roadmap.md](06-produto-roadmap.md).

## ADR-043 — Segurança em nível de produto
**Status:** Aceita · 28/09/2026 · pedido do Dalmo ("verifique nos mais altos padrões")
**Premissa honesta:** proteção completa não existe; o objetivo é reduzir a superfície de ataque e ter camadas.
**Decisões:** validação de todo parâmetro de link de viagem; anti-clickjacking por script (o cabeçalho ideal só é possível na AWS); CI com permissão mínima; **CodeQL** (varredura de segurança semanal e a cada envio); **Dependabot**; `SECURITY.md` com canal privado de relato; modelo de ameaças e plano para AWS em [07-seguranca.md](07-seguranca.md). Testes novos: link de plano adulterado e nome malicioso no plano.
**Ações que dependem do Dalmo:** 2 fatores no GitHub, limitar o app do Claude a este repositório, proteger o ramo `main`, ativar relato privado de vulnerabilidades.

## ADR-044 — Na estrada: postos, balanças, calendário e compartilhar (v4.1)
**Status:** Aceita · 28/09/2026 · teste do Dalmo no iPhone após a v4.0
**Problemas relatados:** (1) "Calendário" não fazia nada no iPhone (link `data:` com download é ignorado pelo Safari); (2) WhatsApp abria só o pessoal, não o Business; (3) nenhum posto de combustível aparecia — **não existia ainda** (estava na Fase 2; a IA não deixou isso claro na entrega da 4.0); (4) para caminhão, faltavam balanças de pesagem; (5) às 22:43, "clico no nome da cidade e não seleciona".
**Decisões:**
- **Calendário:** dois botões — **iPhone/Outlook** (arquivo .ics aberto direto no app de calendário, com alertas **48 h e 2 h antes**, pedido do Dalmo) e **Google Agenda** (evento pré-preenchido; alertas seguem o padrão da agenda da pessoa). Lançar no calendário **sem nenhum toque** exigiria login na conta de calendário do usuário — fora do escopo.
- **Compartilhar:** botão que abre o **menu de compartilhar do próprio celular** (mostra WhatsApp **e** WhatsApp Business, Mensagens, Telegram…). No computador, continua o link do WhatsApp.
- **Postos e balanças** via **OpenStreetMap (Overpass API)**, grátis: total de postos no caminho, posto mais perto de cada parada sugerida, aviso de **trecho longo sem posto** ("abasteça antes"); para **caminhão/van**, lista de **balanças de pesagem** com km e horário estimado, e marcadores no mapa. Limites: mapa colaborativo (pode faltar posto/balança) e não informa se a balança está aberta (só serviços pagos). Se o serviço cair, a viagem continua e o cartão avisa.
- **Busca por toque:** não reproduzida no navegador de testes; escolha reforçada para os diferentes eventos de toque do iPhone (o primeiro que chegar escolhe, os outros são ignorados) e o fechamento da lista espera o teclado fechar. Testes novos escolhem cidade **por toque** no topo e na viagem, antes e depois de calcular.
**Segurança:** novo serviço (overpass-api.de) liberado na CSP; nomes vindos do mapa entram como texto (teste com nome contendo HTML).


## ADR-045 — Idiomas e unidades por país (v5.0)
**Status:** Aceita · 29/09/2026 · pedido do Dalmo: "multilíngue, assumindo o idioma do aparelho, com escolha manual (visão EMET OS, imigrantes)"; "km ou mi na viagem"; "medidas no costume de cada país"; "idioma padrão, se não identificar, inglês"; "faça tudo conjuntamente".
**Decisões:**
- **Três idiomas:** português (fonte), inglês e espanhol. O idioma vem de `navigator.languages`. Se não houver dicionário para o idioma do aparelho, o site abre em **inglês**. A escolha manual no botão 🌐 fica salva no aparelho e vale mais que a detecção.
- **Unidades separadas do idioma.** O modo Automático segue o **país** do aparelho:
  - EUA e territórios, Libéria e Mianmar: °F, milhas, polegadas;
  - Reino Unido: °C, milhas, mm;
  - demais países: métrico.
  Também há Métrico, EUA, Reino Unido e **Personalizado** (temperatura, distância/velocidade e chuva escolhidas uma a uma). O °C/°F do topo muda só a temperatura. A escolha antiga de °F (chave `unit`) é migrada.
- **Formatos pelo `Intl` do navegador:** números, datas e horas (07:00 no Brasil, 7:00 AM nos EUA).
- **Viagem:** distância, marcos ("mi 75"), trechos sem posto, visibilidade e velocidades na unidade escolhida. Arquivo de calendário e e-mail saem no idioma de quem gera o plano.
- **Links compartilhados não carregam idioma nem unidade:** quem abre vê no seu padrão.
- **Nomes de cidades** são pedidos aos serviços de mapa no idioma escolhido.
- **Alertas do NWS:** o nome é traduzido (40 tipos) e o texto fica no original em inglês, com aviso (o aviso não aparece em inglês).
- **Validação dos textos:**
  - teste automático de chaves, marcadores `{…}` e **ortografia Hunspell** (pt-BR VERO, en-US, es-MX), com lista explícita de exceções;
  - revisão de sentido por um segundo agente de IA;
  - checagem humana do Dalmo pendente.
  Detalhes em [08-idiomas-e-unidades.md](08-idiomas-e-unidades.md).

**Alternativas descartadas:**
- **Biblioteca de tradução (i18next):** mais código de terceiros e mais superfície de ataque; o nosso `t()` tem 20 linhas.
- **Tradução automática na hora:** sem controle de qualidade nos cuidados de segurança.
- **Unidades presas ao idioma:** falha justamente com o imigrante.

**Limites honestos:**
- O corretor confere palavras, não frases.
- As traduções de segurança (`adv.*`) devem ser lidas por falantes nativos antes do lançamento nesses mercados.
- A pesquisa de concorrentes ([09-concorrentes.md](09-concorrentes.md)) mostra que os líderes já têm português e espanhol. O diferencial é a escolha manual com unidades por medida, e isso ainda é [Provável], não [Certo].

## ADR-046 — Viagem: resposta sem esperar postos; mapa ampliado menor no celular (v5.1)
**Status:** Aceita · 29/09/2026 · retorno de um usuário (mapa ampliado grande demais no celular) e vídeo do Dalmo (resposta demorada).
**Diagnóstico:**
- O vídeo mostra cerca de 20 s em "Calculando…" numa viagem Brasília → Rio (1.400 km), e ao final a mensagem "não consegui carregar postos e balanças".
- O cálculo esperava **todas** as consultas juntas, inclusive a do mapa colaborativo (Overpass), que tem limite de 20 s e é lenta em rotas longas.
- Daqui não conseguimos medir os serviços reais (a rede de testes não acessa essas APIs). O diagnóstico vem do vídeo e do código: [Provável], não medição.

**Decisões:**
- Postos e balanças correm **em paralelo e fora do caminho crítico**:
  - a previsão aparece assim que rota, tempo, nomes e alertas chegam;
  - o cartão "Na estrada" mostra "Buscando postos…" e é trocado quando a resposta chega, junto com a lista de paradas (posto perto) e os marcadores das balanças;
  - se a resposta chegar depois que a pessoa pediu outra rota, é descartada.
- Mensagens de etapa ("Calculando a rota…", "Buscando a previsão de N pontos…").
- A consulta de postos usa no máximo 80 pontos da rota (antes 120).
- O limite de espera pelos nomes dos pontos caiu de 5 s para 3,5 s. Sem nome, o ponto aparece como "km 120".
- **Mapa ampliado em telas de toque:** `min(60% da tela, 560 px)`, antes quase a tela toda. Dentro do mapa o dedo arrasta o mapa, então é preciso sobrar página para rolar. Ao ampliar, o mapa é centralizado. No computador, continua grande.

**Testes novos:**
- mapa colaborativo com 8 s de atraso: a previsão aparece em menos de 4 s e os postos entram depois;
- mapa ampliado no celular ocupa no máximo 62% da tela.

**Limite que continua:** os serviços gratuitos (OSRM de demonstração e Overpass) não têm garantia de velocidade. Um servidor próprio de rotas ou um cache fica para a fase AWS.

## ADR-047 — Escolha de cidade por toque: correção de causa (v5.4)
**Status:** Aceita · 29/09/2026 · 3ª ocorrência relatada pelo Dalmo (28/09 22:43, 29/09 20:44)

**Causa comprovada no vídeo:**
- O iPhone mostrou a sugestão do corretor "Brasília ×" sobre a lista.
- Ao tocar, o corretor aplicou a troca: evento `input` → nova busca → lista refeita.
- A escolha usava o índice do item (`results[i]`), que já apontava para outra cidade. Por isso o toque em Brasília abriu Porecatu.
- A correção da 4.1 (vários eventos de toque) tratava o sintoma, não a causa.

**Decisões:**
1. `autocorrect="off"` e `autocapitalize="off"` nos campos de cidade.
2. Cada item guarda o próprio objeto da cidade; a escolha usa o item tocado, nunca o índice.
3. O toque só conta se o dedo descer e subir no mesmo item, andando menos de 12 px (`pointerdown` → `pointerup`). Com mais que isso, é rolagem.
4. Com o dedo na lista, respostas novas e "Buscando…" esperam o dedo sair.
5. O mesmo texto (ignorando acento e maiúscula) com a lista aberta não refaz a busca.
6. O clique comum continua valendo para teclado e leitor de tela, sem duplicar: a mesma cidade em até 700 ms é ignorada.

**Testes:**
- corrida simulada: dedo desce, chega uma lista nova, dedo sobe → abre a cidade tocada;
- troca de acento não refaz a lista;
- arrastar não escolhe;
- corretor desligado nos campos.

## ADR-048 — Planejador de viagem como destaque do produto (v6.0)
**Status:** Aceita · 29/09/2026 · pedido do Dalmo ("o diferencial está apagado, escondido"). O plano foi feito por design, marketing e tecnologia ([docs/11](11-plano-destaque-viagem.md)). O Dalmo aprovou "tudo de uma vez".

**Decisões:**
- **Chamada fixa na primeira tela.** Uma medição no iPhone (390×844) mostrou que o bloco da temperatura ocupa cerca de 600 px, então o planejador não cabe inteiro acima da dobra. Por isso: saudação em 1 linha e botão de chamada logo abaixo da temperatura.
- **Planejador sempre aberto** logo depois da temperatura e dos avisos. Os avisos oficiais continuam acima, por segurança.
- **Origem sugerida, nunca obrigatória.** Tem campo próprio e dica visível ("sugerimos onde você está — pode trocar").
- **Exemplo por idioma e viagens recentes** guardadas no aparelho (até 4, só locais e veículo).
- **Resultado mais claro:**
  - faixa de risco por trecho, com símbolo além da cor, para daltônicos;
  - contagem por nível;
  - controle deslizante de saída (recalcula só com os dados já baixados);
  - rota colorida por trecho.
- **Espera máxima de 1,5 s** para os nomes das cidades e **de 2,5 s** para os alertas oficiais. Alerta que chega depois refaz a tela (segurança primeiro).
- **Toque na lista cancela o "clique fantasma"** que o celular dispara depois.

**Pendentes (decisões do Dalmo):**
- nome do produto (sugestão do marketing: "Hora de Sair");
- contador de visitas sem cookies, para medir se o destaque funcionou;
- divulgação.
