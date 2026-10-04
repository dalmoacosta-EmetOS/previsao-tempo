# Histórico de versões — Weather Forecast

Formato: a versão mais nova primeiro. Cada item aponta para a decisão (ADR) em [docs/03-decisoes-adr.md](docs/03-decisoes-adr.md).

## 6.4.2 — 04/10/2026 · Lista de endereços por cima; aviso do Google
- Correção (Dalmo, no Mac): ao digitar o destino, a lista de opções ficava **escondida atrás da previsão por hora**. Agora o planejador fica por cima dos blocos seguintes enquanto está em uso, e a lista ganha rolagem se for longa. Há um teste que reproduz o caso.
- "Entrar com Google" com o Google ainda desligado no painel levava a uma página de erro do Supabase. Agora o próprio site avisa: "ainda não está disponível; use o link por e-mail".

## 6.4.1 — 04/10/2026 · Planejador em duas colunas no computador
- Retorno do Dalmo (Mac): o planejador ficava "solto no meio da tela". No computador, ele agora ocupa a largura toda em duas colunas: **onde** (De, Para, Casa, recentes) e **quando e como** (data, hora, veículo, botão). No celular continua em uma coluna, como antes.
- Ao lado da 🏠 Casa, quem não tem conta vê **"👤 Salvar na conta"**, que abre o painel da conta. Ela continua opcional.

## 6.4.0 — 04/10/2026 · Conta opcional, planos e limite de aparelhos
- Botão 👤 no topo: **conta opcional**. Entra com **link no e-mail (sem senha)** ou **Google**. Sem conta, o site continua igual e não contata o serviço de contas → ADR-051, [docs/12](docs/12-contas-e-planos.md).
- **Casa, favoritas e viagens recentes sincronizadas** entre os aparelhos da pessoa. Ao entrar, os dados do aparelho e da conta são somados.
- **Limite de aparelhos por plano** (Grátis: 2, Pro: 3). Ao entrar num aparelho novo, o mais antigo é desconectado na hora e avisado. A lista de aparelhos tem o botão "Desconectar".
- **Planos** no banco (Grátis e Pro), com limites conferidos no servidor. Ainda sem cobrança.
- **"Apagar minha conta e meus dados"**, com 2º toque de confirmação.
- Segurança: banco Supabase **separado** do EMET OS, RLS em todas as tabelas, sessão conferida em cada pedido, biblioteca no próprio site (conferida byte a byte contra o npm), CSP liberando só o projeto. Pen test com 3 vetores novos (46/46).

## 6.3.0 — 03/10/2026 · Correções do teste de invasão (OSSTMM)
- Pen test OSSTMM 3 em 03/10: 33 de 42 vetores resistiram na 6.2.2. No reteste da 6.3.0, **43 de 43** resistiram (um vetor novo foi incluído). Relatórios em [docs/seguranca/](docs/seguranca/) → ADR-050.
- **L-03:** nomes vindos de serviços de mapa e de links perdem caracteres de controle, marcas de direção de texto e `< >`. Um `\r` sozinho não cria mais linha falsa no convite de calendário nem no e-mail.
- **L-04:** idioma ou unidades salvos como `__proto__`, `constructor`, `toString` etc. não derrubam mais o site.
- **L-05:** o radar só carrega imagens da própria RainViewer, em HTTPS.
- **L-06:** coordenadas do link só valem em número decimal. Vazio, hexadecimal e notação científica são recusados.
- **L-10:** o modo sem internet guarda a página uma vez só, sem o endereço da viagem, e não guarda buscas digitadas. Ficam no máximo 30 previsões.
- **GitHub (ações do Dalmo):** 2 fatores, passkey e códigos de recuperação; `main` protegido (testes e CodeQL obrigatórios); relato privado de falhas e alertas do Dependabot ligados; 5 atualizações aprovadas; app do Claude limitado aos 3 repositórios.
- O roteiro do pen test (`tests/pentest.test.js`) passou a rodar no GitHub junto com os testes. Se um vetor voltar a falhar, a publicação é barrada.

## 6.2.2 — 30/09/2026 · Regra da Casa definida pelo Dalmo
- Ao tocar em "🏠 Casa":
  - se o **De** está em branco (vazio, ou só com a sugestão automática da cidade atual), a Casa vai para o **De**;
  - se o **De** tem algum dado, a Casa vai para o **Para**.
- Exceção: se o De já é a própria Casa, ela vai para o Para e o De volta à sugestão, para não virar "casa → casa".

## 6.2.1 — 30/09/2026 · Casa sempre como saída primeiro
- Correção (teste do Dalmo no Mac e no iPhone): tocar em "🏠 Casa" jogava o endereço para o **destino**.
  - Agora o 1º toque coloca a Casa sempre na **saída**.
  - Se a saída já é a Casa, o toque seguinte coloca a Casa no destino (a volta), e a saída volta a ser onde você está.
  - O campo que estava com o cursor também passa a mostrar o novo valor (antes ficava em branco).
- Horário de saída no passado vira "agora" nos campos também. A barra deslizante anda em passos de 1 h alinhados ao horário escolhido, e por isso os dois mostram sempre o mesmo valor.

## 6.2 — 30/09/2026 · 🏠 Casa
- Pedido do Dalmo (referência: Waze): o endereço de casa é cadastrado uma vez e fica **salvo só neste aparelho**. Um toque em "🏠 Casa" preenche o campo que a pessoa está usando. Se nenhum campo estiver em uso, preenche a saída; se a saída já é a casa, preenche o destino (a volta). O ✎ troca ou apaga o endereço.

## 6.1.1 — 30/09/2026
- O aviso de tempo de viagem ficou mais curto, sem citar outros aplicativos: "O site ainda não vê o trânsito ao vivo nem acidentes." (pedido do Dalmo).
- O link compartilhado continua com o endereço completo (decisão do Dalmo: compartilhar é escolha pessoal).

## 6.1 — 30/09/2026 · Endereço na viagem, tempo com trânsito típico, barra e horário juntos
- **Barra e horário andam juntos** (pedido do Dalmo). A data/hora é a informação principal:
  - arrastar a barra muda a hora na mesma hora;
  - mudar a hora à mão refaz a viagem e move a barra.
- **Endereço, lugar ou cidade** nos campos De e Para, via Photon (dados do OpenStreetMap, grátis, sem chave). No teste do Dalmo, a viagem Malden → Worcester era de 46 mi de centro a centro, mas de casa até o destino o Waze deu 55–69 mi. Se o serviço de endereços cair, a busca volta a ser por cidade.
- **Tempo de viagem com trânsito típico.** O serviço de rotas grátis calcula sem trânsito. Agora o site soma +20% sempre e até +20% a mais no horário de pico de dia útil, e mostra os dois valores: "~1 h 19 (sem trânsito: 1 h 06)".
  - Com essa margem, o caso real do Dalmo (1 h 06 → 1 h 23) daria ~1 h 19, igual ao Waze (1 h 19–1 h 20).
  - Os horários de passagem em cada trecho, e portanto a previsão do tempo em cada ponto, usam esse tempo mais realista.
  - A tela avisa que o site não vê trânsito ao vivo nem acidentes.
- "Posto perto" da parada sugerida olha até 40 km à frente (antes 25).

## 6.0 — 29/09/2026 · Planejador de viagem em destaque
Plano em [docs/11-plano-destaque-viagem.md](docs/11-plano-destaque-viagem.md) (ADR-048). Versão anterior guardada em `congelado-v5.5`.
- **Primeira tela:** botão amarelo "Vai viajar? Veja o tempo em cada trecho da rota", logo abaixo da temperatura. A saudação ficou em 1 linha.
- **Planejador aberto** logo depois da temperatura e dos avisos, com o título "Vai pegar a estrada?".
  - **De** e **Para** ficam sempre visíveis.
  - A saída vem **sugerida** com a cidade atual, mas pode ser trocada (pedido do Dalmo: quem vai de avião e aluga carro lá).
  - Data, hora e veículo aparecem quando a pessoa começa a preencher.
- **"Ver um exemplo"** monta uma rota pronta: São Paulo → Rio, Boston → Nova York ou Cidade do México → Puebla, conforme o idioma.
- **Viagens recentes** ficam salvas no aparelho: um toque refaz a viagem.
- **Resultado:**
  - faixa colorida com um bloco por trecho;
  - resumo contado ("1 com perigo · 1 de atenção · 1 à noite");
  - **controle deslizante do horário de saída**, que refaz a viagem sem nova busca;
  - **rota pintada por trecho no mapa**.
- **Mais rápido:**
  - os nomes das cidades do caminho esperam no máximo 1,5 s (sem nome, aparece "km 120");
  - os alertas oficiais esperam no máximo 2,5 s e entram depois, se chegarem atrasados.
- **Atalho na barra da cidade** (ícone de rota amarelo) quando a página está rolada.
- **Clique fantasma corrigido:** depois do toque numa cidade, o celular mandava um clique extra no que ficava embaixo da lista.

## 5.5 — 29/09/2026 · Noite sempre animada; postos em viagens longas
- Pedido do Dalmo: o céu estrelado estava "sem animação". Agora, nas noites limpas:
  - 16 estrelas maiores cintilam (acendem, crescem e apagam), cada uma no seu ritmo;
  - uma estrela cadente cruza o céu a cada 10–19 s, cada vez num lugar;
  - o céu inteiro deriva bem devagar.
  Dia de sol continua com o brilho do sol; nuvens, chuva, neve e névoa já eram animadas.
- **Postos em viagens longas:** no vídeo (Sobradinho → Florianópolis, 1.700 km), a busca de postos falhou de novo. A rota agora é consultada em trechos de até 350 km, 2 de cada vez, e um trecho que falha tenta mais uma vez.

## 5.4.1 — 29/09/2026 · 24 horas não volta sozinha para "Agora"
- Pedido do Dalmo: trocar Temperatura ↔ Sensação (ou abrir uma hora, ou a atualização automática de 10 min) jogava a lista das 24 h de volta para "Agora". Agora a lista fica exatamente onde a pessoa parou; só volta ao início quando ela troca de cidade.

## 5.4 — 29/09/2026 · Escolha da cidade por toque (correção definitiva) e céu estrelado
- **Causa encontrada no vídeo do Dalmo:**
  - O corretor do iPhone trocava "Brasilia" por "Brasília" durante o toque. Isso disparava uma busca nova e redesenhava a lista.
  - O site escolhia pela POSIÇÃO na lista, então o toque em Brasília abriu Porecatu.
- **Correção:**
  - Corretor e maiúscula automática desligados nos campos de cidade.
  - A escolha guarda a cidade que estava debaixo do dedo, não a posição.
  - Enquanto o dedo está na lista, nenhuma resposta nova redesenha a lista.
  - Mesma busca com acento diferente não refaz a lista.
  - Arrastar para rolar não escolhe.
  - Testes simulam exatamente essa corrida.
- **Céu estrelado nas noites limpas:** cerca de 150 estrelas de tamanhos e brilhos diferentes, em 3 camadas piscando em ritmos diferentes (referência: vídeo do app da Weather Channel em Brasília; desenho próprio).

## 5.3.1 — 29/09/2026 · Moldura retirada
- Dalmo testou no iPhone e não gostou ("ficou horrível"): a moldura com as cores das bandeiras saiu (tela, barra do topo e mapas). Ficam a barra azul-noite e as estrelas piscando em tempos diferentes.

## 5.3 — 29/09/2026 · Identidade Brasil + EUA (teste)
- Pedido do Dalmo: identidade própria de um brasileiro vivendo nos EUA. Moldura fina em volta da tela, embaixo da barra do topo e em volta dos mapas, com as cores das duas bandeiras (verde, amarelo, azul, branco, vermelho) em tons suaves e correndo bem devagar.
- Barra do topo num azul-noite neutro (`#0f1e30`), longe do azul da Weather Channel.
- Estrelas piscando em tempos diferentes nas noites sem nuvem.
- **Em teste:** o ramo `congelado-v5.2` guarda a versão anterior para voltar, se não agradar.

## 5.2 — 29/09/2026 · Nuvens animadas
- Pedido do Dalmo (vídeo do app do Weather Channel): nuvens **visíveis e em movimento** no céu do site, em duas camadas com velocidades diferentes (sensação de profundidade), e o céu "respira" devagar. Desenho próprio (bolhas de gradiente), não é imagem de terceiros. Nublado = mais nuvens; chuva/tempestade = nuvens escuras; noite = nuvens escurecidas. Leve para o celular (só move camadas) e desliga para quem ativou "reduzir movimento".

## 5.1.1 — 29/09/2026 · Veículos: Carro, Moto, Caminhão
- Pedido do Dalmo: tirar "ônibus" (e "van/reboque") dos nomes. Ficam **Carro, Moto e Caminhão** (en: Car, Motorcycle, Truck · es: Auto, Moto, Camión). Os limites de chuva e vento de cada tipo não mudaram.

## 5.1 — 29/09/2026 · Viagem mais rápida, mapa ampliado menor no celular
- **Resposta da viagem sem esperar postos e balanças.** A previsão aparece assim que rota e tempo chegam. Postos e balanças entram depois, sozinhos (ADR-046). No vídeo do Dalmo (Brasília → Rio), a espera era de cerca de 20 s, porque o site esperava o mapa colaborativo, que acabou falhando.
- **Mensagens de progresso:** "Calculando a rota…" → "Buscando a previsão de N pontos…".
- **Consulta de postos mais leve** (rota resumida em 80 pontos em vez de 120).
- **Mapa ampliado no celular:** cerca de 60% da tela (antes, quase a tela toda), para sobrar espaço de rolar a página com o dedo; ao ampliar, o mapa fica centralizado. No computador, continua grande.

## 5.0 — 29/09/2026 · Idiomas e unidades
- **Português, inglês e espanhol.** O site abre no idioma do celular; se o celular estiver em outro idioma, abre em inglês. Botão 🌐 para escolher à mão, pensado para imigrantes (ADR-045).
- **Unidades pelo costume do país:**
  - EUA: °F, milhas, polegadas;
  - Reino Unido: °C, milhas;
  - demais países: métrico.
  Opção Personalizado para escolher cada medida.
- **Viagem em km ou milhas:** distância, marcos, trechos sem posto e balanças.
- **Horas, datas e números** no formato de cada país (7:00 AM nos EUA).
- **Dicionários conferidos** automaticamente (chaves, marcadores e ortografia Hunspell) a cada envio.
- **Pesquisa de concorrentes** registrada em [docs/09-concorrentes.md](docs/09-concorrentes.md).
- Rodapé: "Exercício do Treinamento de IA" passou a "Construído 100% com IA" (o site agora é produto); crédito do OpenStreetMap para rotas e postos.

## 4.1 — 28/09/2026 · Na estrada
- **Postos de combustível** no caminho, posto mais perto das paradas e aviso de trecho longo sem posto (ADR-044).
- **Caminhão/van:** balanças de pesagem com km e horário estimado.
- **Calendário** que funciona no iPhone (alertas 48 h e 2 h antes) + **Google Agenda**.
- **Compartilhar** pelo menu do celular (WhatsApp e WhatsApp Business).
- Escolha de cidade por toque reforçada para o iPhone.

## 4.0 — 28/09/2026 · Fase 1 do produto
- **Viagem com data e hora** (até 7 dias à frente) e **aviso de confiabilidade**: NOAA para viagens nos EUA, INMET para o Brasil (ADR-042).
- **Tipo de veículo**: carro/ônibus, moto, caminhão/van — com limites próprios de chuva e vento lateral.
- **Trechos à noite** sinalizados; **paradas sugeridas** a cada ~2 h.
- **Melhor horário para sair**: compara de 3 h antes a 6 h depois e sugere o mais seguro.
- **Alertas oficiais (NWS) ao longo da rota** nos EUA.
- **Levar o plano**: e-mail, WhatsApp, calendário (lembrete na véspera e 2 h antes) e link — o link sempre abre com a previsão atualizada.
- **Segurança de produto** (ADR-043): validação dos links de plano, anti-clickjacking, CodeQL, Dependabot, CI com permissão mínima, `SECURITY.md`, modelo de ameaças.

## 3.6.1 — 28/09/2026 · versão congelada do Exercício 1 (nota A+)
Ramo `congelado-v3.6.1`. Botão para ampliar o mapa crescendo no próprio lugar (ADR-041).

## 3.5.x — segurança
- 3.5.2: nomes de cidade de volta (serviço mudou de endereço; CSP liberada); "Horário de saída" com setinha.
- 3.5.1: revisão de segurança — nomes externos como texto, CSP, Leaflet no próprio site (ADR-040).
- 3.5: "minha localização" na saída da viagem; mapa da rota inteira.

## 3.3 – 3.4 — Tempo na viagem (ADR-039)
Previsão de cada trecho na hora em que você passa; cuidados ao tocar no alerta; caixinha recolhida.

## 3.0 – 3.2 — produto mais completo
Testes no GitHub (ADR-029), link por cidade e favoritas (030), qualidade do ar (031), gelo na pista (032), gráfico de 2 h (033), instalar como app e sem internet (034), acessibilidade AA (035), link pede localização (036), radar sem halo falso (037), nome Weather Forecast (038).

## 2.4 – 2.10
Paleta do Weather Channel adaptada, névoa/gelo/mistura, fim da página tremendo, topo redesenhado, ícones novos.

## 1.0 – 2.3.1 — construção inicial (27–28/09/2026)
Clima agora, 24 h, 7/15 dias, °C/°F, céu animado, radar com previsão de 24 h, alertas oficiais, resumo "Agora", avisos com cuidados. Detalhes no [diário de bordo](docs/05-diario-de-bordo.md).
