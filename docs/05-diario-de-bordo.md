# 05 — Diário de bordo

Registro do processo de construção com IA. **Este é o material da linha de base** para comparar a evolução no fim do treinamento. Anote curto, na hora — não depois.

| Data/hora | Quem pediu o quê (prompt resumido) | O que a IA entregou | Deu certo? O que corrigi | Tempo |
|---|---|---|---|---|
| 27/09 07:37 | Dalmo: "o que um site de previsão profissional deveria ter?" | Lista essencial/diferenciais, sugestão Open-Meteo | IA questionou excesso de escopo para o prazo | 5 min |
| 27/09 07:40 | Dalmo: colou o enunciado do Galeno para avaliação | Leitura: exercício é linha de base "antes/depois"; processo importa | Mudou a abordagem: Dalmo especifica, IA constrói | 5 min |
| 27/09 07:50 | Dalmo: aprovou lista, acrescentou 15 dias, neve, tempestade, alertas, modo simulação; pediu arquitetura e documentação antes do código | Docs 01–05 | IA verificou a API: **não existe % de tempestade nem de neve, nem alertas oficiais** → decisões ADR-005/006 | — |
| 27/09 08:03–08:15 | Dalmo: criar repositório no GitHub e conectar à IA | Passo a passo; 1ª tentativa de envio recusada (app do Claude não instalado) | Dalmo autorizou o app no GitHub → envio funcionou | 12 min |
| 27/09 08:24 | Dalmo: cidade padrão = minha localização; visual que acompanha o clima, referência The Weather Channel | Registrou ADR-008/009; IA alertou que localização depende de permissão → cidade reserva | Dalmo definiu Boston como reserva | 5 min |
| 27/09 08:26–08:45 | Construção da v1.0 (código completo) | 22 arquivos: API, domínio, interface, céu animado, modo demo | Ambiente da IA não acessa as APIs → testes com dados simulados no mesmo formato. 17/17 testes automáticos passaram | 20 min |
| 27/09 08:45 | Revisão visual das capturas de tela | 3 defeitos que os testes automáticos **não** pegaram: espaço vazio no desktop, aviso cobrindo selo DEMO, quadro "Sensação máx." com dado errado | Corrigidos e retestados | 5 min |
| 27/09 08:43–08:49 | Dalmo publicou no GitHub Pages; testou com chuva real em Boston e mandou vídeo comparando com Weather Channel e iPhone | Diagnóstico: v1.0 decidia o céu só pelo código de tempo, que pode dizer "nublado" com chuva caindo | **Primeiro defeito achado com dado real, não com simulação** → ADR-011 | 6 min |
| 27/09 08:50–08:54 | Correção ADR-011 | Céu considera chuva medida + próximos 30 min; frase "chuva para em ~X min"; auto-atualização 10 min; demos `garoa` e `temporal` | 24/24 testes automáticos | 15 min |
| 27/09 08:54–08:58 | Dalmo gravou o site real: "está chovendo mas mostra nublado" | Duas causas: (1) gravou 40 s depois do envio da correção, antes de o Pages atualizar; (2) sinal ainda não usado: hora atual = garoa 95% | v1.2: 4º sinal + versão no rodapé. 27/27 testes, incluindo o caso real de Malden reproduzido | 11 min |
| 27/09 10:10 | Dalmo pediu radar como o do Weather Channel (direção da chuva e do vento) | IA verificou o serviço gratuito (RainViewer): só passado 2 h, zoom máx. 7 → ADR-012 | v1.3: radar animado + seta do vento; isolado para não derrubar o site. 35/35 testes | 20 min |
| 27/09 10:24 | Dalmo corrigiu a IA: radar futuro de 24 h é grátis no Weather Channel (só 72 h é pago); pediu 6–24 h | IA errou ao generalizar "futuro = pago". Solução: grade de 169 pontos do modelo desenhada no mapa → ADR-013 | v1.4: linha do tempo −2 h → +24 h. 40/40 testes. Teste revelou que ▶ deveria começar do passado — ajustado | 25 min |
| 27/09 10:41 | Dalmo: "não aparece nada" no radar (print) | Mapa de fundo CARTO passou a exigir chave ("API KEY REQUIRED") — **teste simulado não pegou**. Cidade testada fora de cobertura de radar | v1.5: mapa OpenStreetMap (sem chave) com filtro escuro. 40/40 testes | 6 min |
| | | | | |

## Lições (preencher ao final)

- O que a IA fez bem:
- Onde a IA errou ou inventou:
- O que eu faria diferente:
- Quanto tempo total:
