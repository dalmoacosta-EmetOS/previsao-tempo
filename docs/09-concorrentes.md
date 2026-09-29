# 09 — Concorrentes: tempo ao longo da rota

> Pesquisa feita em 29/09/2026 a pedido do Dalmo ("pesquise concorrentes no mundo todo: pontos fortes para
> implementar, falhas para evitar, problemas que ninguém resolve"). Um agente de pesquisa consultou as lojas
> de apps, sites oficiais e avaliações de usuários. Os preços mudam: confira antes de usar em apresentação.
> Marcas de confiança: **[Certo]** = visto na fonte · **[Provável]** = inferência sólida · sem confirmação = dito na tabela.

## Resumo em uma frase
Os líderes (Drive Weather, Weather on the Way) são **pagos, só funcionam instalados e foram feitos para os EUA**;
os brasileiros (Rota & Clima, RoadFlowy, Tempo na Rota) são **básicos**. Ninguém junta, de graça e no navegador,
**previsão na hora da passagem + cuidados por veículo + postos/pesagens + plano compartilhável que se atualiza**.

## Verdade desconfortável
- **Idioma não é diferencial sozinho.** O Drive Weather já tem português e espanhol (13 idiomas) e o Weather on
  the Way também. O que eles não oferecem, até onde a pesquisa viu, é **escolher o idioma à mão
  independentemente do aparelho** e **unidades por medida** (°C com milhas, por exemplo). Isso é [Provável], não [Certo].
- **Gratuito tem prazo.** A Open-Meteo só é grátis para uso **não comercial**. Se o produto cobrar ou tiver anúncio,
  precisa do plano pago ([06-produto-roadmap.md](06-produto-roadmap.md)).
- O líder tem **nota 4,7 com ~13 mil avaliações**. Qualidade de previsão e velocidade são o mínimo para competir.

## Pesquisa completa

Encontrei 10 concorrentes relevantes. Os mais fortes cobram assinatura, só funcionam instalados e são pensados para quem fala inglês nos EUA. No Brasil existem apps pequenos em português, mas nenhum cobre o que o nosso app oferece por veículo (segurança, pesagens, plano compartilhável).

### 1. Tabela de concorrentes

| Nome | O que faz no tempo da rota | Preço | Plataformas | Idiomas | Pontos fortes | Pontos fracos |
|---|---|---|---|---|---|---|
| **Drive Weather** | Previsão em cada trecho no horário da passagem; controle deslizante do horário de saída; radar [Certo] | Grátis mostra 2 dias. Pro mostra 7 dias, várias paradas, vento, alertas, aviso de noite e de pista com gelo. A matéria cita US$5,99/mês ou US$17,99/ano; a App Store lista US$19,99/ano, US$34,99/ano e US$5,99 avulso. Valores divergentes [Certo] | iOS, Android, CarPlay, Android Auto [Certo] | Inglês e mais 12, incluindo português e espanhol [Certo] | Nota 4,7 com cerca de 13 mil avaliações; usa dados do NWS [Certo] | Às vezes demora a carregar; cores muito azuis, difíceis de distinguir; confusão sobre o que o plano grátis inclui [Certo] |
| **Weather on the Way** | Previsão no horário da passagem; saída até 7 dias à frente (3 no grátis); estradas fechadas e exigência de correntes; rotas alternativas [Certo] | Pro por US$4,99/mês ou US$20/ano no site oficial. Em 2022 custava US$2,99/mês, US$16,99/ano ou US$39,99 vitalício [Certo] | Só iPhone, com CarPlay [Certo] | Vários, incluindo português, espanhol, árabe e vietnamita [Certo] | Controle de horário de saída muito elogiado; sem anúncios e sem rastreamento; 70+ países [Certo] | Não salva viagens; já mostrou "parcialmente nublado" quando nevava; não ajusta a velocidade (quem reboca trailer); não sugere paradas para combustível ou descanso [Certo] |
| **Highway Weather (weatherroute.io)** | Previsão na rota, horário de saída sugerido, paradas, câmeras de trânsito, perfis de caminhão, motorhome e moto [Certo] | US$3,99/mês ou US$17,99/ano; tirar anúncios custa US$5,99 [Certo] | iOS, Android [Certo] | Inglês, francês, italiano, português, espanhol [Certo] | Perfis por veículo; desenvolvedor responde rápido [Certo] | Tem anúncios; tempo encontrado não batia com a previsão; perdeu a localização por mais de 300 km (200 milhas); já teve bug de tela preta [Certo] |
| **Wayther (Highway Weather: Wayther)** | Previsão hora a hora na rota; resumo de riscos (alertas, vento, visibilidade); melhor horário [Certo] | Semanal de US$2,99 a US$7,99; anual de US$24,99 a US$39,99 [Certo] | iOS [Certo] | 27 idiomas [Certo] | Resumo de riscos claro; cobertura mundial [Certo] | Caro; poucas avaliações (51) [Certo] |
| **Windy (planejador de rota)** | Vento e tempo ao longo de uma linha traçada no mapa [Certo] | Grátis no básico; preço do Premium não confirmado | Web, iOS, Android [Provável] | Muitos idiomas [Provável] | Modelos meteorológicos de alta qualidade [Certo] | Feito para aviação e vela; não tem modo carro nem cálculo de horário de chegada [Certo] |
| **Trucker Path** | Alertas do weather.gov (NWS) destacados na rota [Certo] | Não confirmado | iOS, Android [Provável] | Não confirmado | Público caminhoneiro, com postos e pesagens [Provável] | Mostra só alertas, não a previsão na hora da passagem [Provável] |
| **Waze / Google Maps / Apple Maps** | Não mostram a previsão no horário da passagem. O Waze testou alerta de alagamento em Norfolk (Virgínia) [Provável/Certo] | Grátis | Todas | Todos | Todo mundo já usa | Não resolvem o planejamento da viagem [Provável] |
| **TomTom Weather** | Previsão e alertas na rota (granizo, neblina, neve, pista escorregadia) [Certo] | Venda para empresas | APIs para montadoras e frotas [Certo] | — | Horário de chegada ajustado pelo clima [Certo] | Não é produto para o motorista comum [Certo] |
| **Rota & Clima (Brasil)** | Tempo em cada trecho a partir do horário de saída, até 15 dias; modelo ECMWF; mostra pedágios [Certo] | Freemium com 2 usos grátis; valor não confirmado | Web instalável no celular [Certo] | Português [Certo] | Pedágios, escolha de modelo meteorológico [Certo] | Bloqueio depois de 2 usos [Certo] |
| **RoadFlowy / Tempo na Rota (Brasil)** | Chuva, vento e temperatura por trecho (RoadFlowy); previsão horária de 3 dias (Tempo na Rota) [Certo] | RoadFlowy grátis e sem cadastro; preço do Tempo na Rota não confirmado | Web / iOS e Android [Certo] | Português [Certo] | Foco no Brasil [Certo] | Poucas funções; não trata segurança por veículo [Provável] |

### 2. Pontos fortes que podemos implementar (por prioridade)

1. **Controle deslizante do horário de saída** com o mapa atualizando na hora. É a função mais elogiada nos dois líderes. Hoje só sugerimos de −3h a +6h; o controle deixaria o usuário explorar. [Certo]
2. **Resumo de riscos no topo**, estilo Wayther: "2 trechos com chuva forte, 1 com neblina, 40 min à noite". [Certo]
3. **Informações de estrada** para EUA e Canadá: estradas fechadas e exigência de correntes. [Certo]
4. **Comparar rotas alternativas** pelo tempo. [Certo]
5. **Várias paradas / waypoints**, recurso pago em todos os concorrentes. [Certo]
6. **Velocidade ajustável** (reboque, caminhão), pedido que aparece nas reclamações. [Certo]
7. **Pedágios na rota**, para o Brasil. [Certo]

### 3. Falhas que devemos evitar

- **Viagens que se perdem ao fechar o app.** O nosso link permanente já resolve; convém também salvar as viagens localmente. [Certo]
- **Previsão otimista demais**, como "nublado" quando nevava. Quando houver incerteza, mostrar a probabilidade e usar o pior cenário nos alertas. [Certo]
- **Cores pouco distintas.** Usar ícone junto com cor e cuidar do contraste. [Certo]
- **Paywall confuso ou limite de usos**, como no Rota & Clima e no plano grátis do Drive Weather. [Certo]
- **Anúncios**, a principal reclamação no Highway Weather. [Certo]
- **Carregamento lento e perda de GPS.** Mostrar dados parciais enquanto o resto carrega e deixar o cache do app de celular (PWA) funcionar sem sinal. [Provável]

### 4. Problemas que eles não resolvem e nós podemos resolver

- **Compartilhar um plano que se atualiza sozinho** (link, e-mail, calendário com alertas 48h e 2h antes). Não achei isso em nenhum concorrente. [Provável]
- **Funciona no navegador, sem instalar, em iPhone e Android.** O Weather on the Way só roda em iPhone; os apps web brasileiros estão só em português. [Certo]
- **Imigrantes nos EUA:** seletor manual de idioma (português, espanhol e inglês) com unidades escolhidas por grandeza. Os apps grandes seguem o idioma do aparelho. [Provável]
- **Brasil com qualidade de líder americano:** os apps nacionais são básicos e não têm recomendações por veículo nem aviso de viagem noturna. [Provável]
- **Caminhões:** juntar previsão na hora da passagem, postos, pesagens e alertas do NWS num lugar só. O Trucker Path só mostra alertas. [Provável]
- **Gratuito e sem anúncios, com todas as funções**, onde os concorrentes cobram de US$17 a US$40 por ano. [Certo]
- **Paradas de descanso a cada 2h**, que usuários do Weather on the Way pediram e que nenhum concorrente tem. [Certo]

### 5. Fontes

- https://apps.apple.com/us/app/drive-weather-with-live-radar/id1424517685
- https://play.google.com/store/apps/details?id=com.driveweather&hl=en_US
- https://www.slashgear.com/1865598/drive-weather-app-check-along-route/
- https://weatherontheway.app/features
- https://apps.apple.com/us/app/weather-on-the-way/id1471394318?see-all=reviews&platform=iphone
- https://www.iphonejd.com/iphone_jd/2022/01/revew-weather-on-the-way.html
- https://justuseapp.com/en/app/1471394318/weather-on-the-way-trip-radar/reviews
- https://weatherroute.io/
- https://apps.apple.com/us/app/highway-weather/id1289520390
- https://apps.apple.com/us/app/highway-weather-wayther/id6449394257
- https://community.windy.com/topic/9013/windy-launches-route-planner
- https://truckerpath.com/blog/trucker-path-app-serve-weather-warning/
- https://www.phonearena.com/news/waze-to-warn-drivers-about-flooded-roads_id137665
- https://www.tomtom.com/products/weather-services/
- https://www.rever.co/help/using-rever
- https://rotaclima.app/
- https://roadflowy.com/
- https://www.temponarota.com.br/
- https://play.google.com/store/apps/details?id=com.myapp.routeplanner&hl=en_US

Não consegui confirmar o preço do Trucker Path, se o recurso de tempo do REVER é pago nem o preço dos apps brasileiros. Não achei nenhum app lançado pela Climatempo para tempo na rota.

## O que já fizemos a partir desta pesquisa (v5.0)
- Seletor manual de idioma (português, inglês, espanhol) e **unidades por medida** — ver [08-idiomas-e-unidades.md](08-idiomas-e-unidades.md).
- Distâncias da viagem em **km ou milhas** conforme o país ou a escolha da pessoa.

## Próximos candidatos (para o Dalmo priorizar)
| # | Ideia | Por quê | Custo |
|---|---|---|---|
| 1 | Controle deslizante do horário de saída | Função mais elogiada dos dois líderes | Grátis (já temos a série baixada) |
| 2 | Resumo de riscos no topo ("2 trechos com chuva forte, 40 min à noite") | Clareza no primeiro olhar | Grátis |
| 3 | Salvar viagens no aparelho | Reclamação nº 1 do Weather on the Way | Grátis |
| 4 | Velocidade ajustável (reboque, caminhão) | Pedido recorrente nas avaliações | Grátis |
| 5 | Várias paradas | Recurso pago em todos os concorrentes | Grátis (mais chamadas à API) |
| 6 | Estradas fechadas/correntes (EUA/Canadá) e pedágios (Brasil) | Informação de estrada além do tempo | Depende de fonte — pesquisar |
