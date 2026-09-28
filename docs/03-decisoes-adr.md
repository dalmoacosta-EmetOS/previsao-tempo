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
