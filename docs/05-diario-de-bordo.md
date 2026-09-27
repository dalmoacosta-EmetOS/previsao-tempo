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
| 27/09 08:50–09:05 | Correção ADR-011 | Céu considera chuva medida + próximos 30 min; frase "chuva para em ~X min"; auto-atualização 10 min; demos `garoa` e `temporal` | 24/24 testes automáticos | 15 min |
| | | | | |

## Lições (preencher ao final)

- O que a IA fez bem:
- Onde a IA errou ou inventou:
- O que eu faria diferente:
- Quanto tempo total:
