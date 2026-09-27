# 04 — Plano de construção e testes

## 1. Fases (cada fase termina com algo que funciona)

| Fase | Entrega | Requisitos | Tempo estimado |
|------|---------|-----------|----------------|
| F0 | Documentação aprovada + repositório criado | — | **Dalmo: 20 min** |
| F1 | Esqueleto: página abre, busca cidade, mostra "agora" | RF-01, RF-03, RF-07 | 1h |
| F2 | Por hora + 7 dias + °C/°F + localização | RF-02, RF-04, RF-05, RF-06 | 1h |
| F3 | 15 dias + responsivo revisado → **versão 1.0 publicada** | RF-08, RNF-01 | 45 min |
| — | **Ponto de parada seguro.** Daqui pra frente só entra o que não quebra a 1.0 | | |
| F4 | Fundo dinâmico + modo demo | RF-09, RF-10 | 45 min |
| F5 | Detalhes do dia + risco de tempestade + avisos | RF-12, RF-13, RF-14 | 1h |
| F6 | Gráfico + lembrar última cidade | RF-11, RF-15 | 45 min |
| F7 | Teste final no celular e no computador + ensaio da apresentação | — | **Dalmo: 30 min** |

Regra: **segunda-feira às 15h, congela.** O que não estiver pronto vira backlog e entra na apresentação como "próximos passos".

## 2. Roteiro de testes (Dalmo executa na F7)

| # | Teste | Esperado | OK? |
|---|-------|----------|-----|
| T01 | Abrir o site no computador | Carrega cidade padrão em < 3s | ☐ |
| T02 | Abrir no celular | Sem rolagem lateral, tudo legível | ☐ |
| T03 | Buscar "São Paulo" | Sugestões com estado e país | ☐ |
| T04 | Buscar "xyzabc" | "Nenhuma cidade encontrada" | ☐ |
| T05 | Buscar "Boston" e escolher a dos EUA | Horas no fuso de Boston | ☐ |
| T06 | "Usar minha localização" → Permitir | Mostra o clima local | ☐ |
| T07 | "Usar minha localização" → Bloquear | Mensagem amigável | ☐ |
| T08 | Alternar °C → °F | Todos os números mudam, sem recarregar | ☐ |
| T09 | Alternar 7 → 15 dias | Dias 8–15 aparecem com selo "tendência" | ☐ |
| T10 | Desligar Wi-Fi e buscar | "Sem conexão" + tentar de novo | ☐ |
| T11 | Fechar e reabrir | Abre na última cidade | ☐ |
| T12 | `?demo=chuva`, `?demo=neve`, `?demo=noite` | Fundo muda + selo DEMO | ☐ |

## 3. Roteiro da apresentação (5 minutos)

1. **O problema** (30s): "Não fui especificado. Então comecei especificando."
2. **O processo** (1min30): mostrar os documentos — requisitos (MoSCoW), arquitetura, decisões. Destacar: *"descobri que a API não tem chance de tempestade em %, então decidi derivar e rotular como estimativa"*.
3. **Demo ao vivo** (2min): busca, localização, °C/°F, 15 dias, modo demo dos fundos.
4. **O que a IA errou e como corrigi** (45s): tirar do diário de bordo.
5. **Próximos passos** (15s): backlog.

**Plano B:** se a internet falhar na hora, ter prints/gravação de tela da demo.

## 4. Próximos passos (backlog)

| Item | Por que ficou para depois |
|---|---|
| Idioma PT/EN com botão próprio (ADR-015) | ~100 textos; risco na véspera |
| Alertas oficiais do NWS para cidades dos EUA | Nova fonte de dados; decidir depois da apresentação |
| Teste automático no repositório (hoje roda no ambiente da IA) | Organização do projeto |
| Limitar o acesso do app do Claude no GitHub só a este repositório | Segurança da conta |
