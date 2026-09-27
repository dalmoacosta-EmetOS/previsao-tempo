# 01 — Requisitos

**Projeto:** Previsão do Tempo (exercício de linha de base — Treinamento de IA)
**Autor da especificação:** Dalmo
**Construção:** 100% com IA (regra do exercício)
**Data:** 27/09/2026 · **Entrega:** 28/09/2026, noite

---

## 1. Objetivo

Página web de previsão do tempo, gratuita, que funcione bem no celular e no computador, construída "no melhor esforço" apenas com IA.

Objetivo secundário (o mais importante para o treinamento): **registrar o processo** — especificação, decisões, prompts, erros e correções — para servir de linha de base na comparação de evolução ao final da jornada.

## 2. Priorização (MoSCoW)

### MUST — Essencial (versão 1.0, entregue segunda-feira)

| ID | Requisito | Critério de aceite |
|----|-----------|--------------------|
| RF-01 | Busca por cidade com autocompletar | Ao digitar 2+ letras, aparecem até 5 sugestões com cidade, estado/região e país |
| RF-02 | Usar minha localização | Botão pede permissão ao navegador; se negar, mostra mensagem amigável e mantém a busca |
| RF-03 | Clima agora | Temperatura, sensação térmica, ícone + descrição em português, umidade, vento (velocidade e direção) |
| RF-04 | Previsão por hora | Próximas 24h: hora, ícone, temperatura, chance de chuva |
| RF-05 | Previsão diária 7 dias | Dia, ícone, máx/mín, chance de chuva |
| RF-06 | Alternar °C/°F | Troca instantânea, sem nova chamada à API; unidades de vento (km/h ↔ mph) e chuva (mm ↔ in) acompanham |
| RF-07 | Estados de carregando e erro | Skeleton/indicador durante a carga; mensagens para: cidade não encontrada, sem internet, API fora do ar |
| RNF-01 | Responsivo (mobile-first) | Sem rolagem horizontal em 360px de largura; legível em desktop |

### SHOULD — Adicionado pelo Dalmo

| ID | Requisito | Critério de aceite |
|----|-----------|--------------------|
| RF-08 | Opção de ver 15 dias | Alternador "7 dias / 15 dias". Dias 8–15 marcados visualmente como **tendência** (menor confiança) |

### COULD — Diferenciais (se sobrar tempo, nesta ordem)

| ID | Requisito | Observação |
|----|-----------|------------|
| RF-09 | Fundo que muda conforme o clima | Sol, nublado, chuva, neve, tempestade, noite — **promovido à v1.0 (ADR-009)** |
| RF-10 | **Modo demonstração** do fundo | Seletor escondido (ou `?demo=chuva` na URL) para mostrar todos os fundos na apresentação, sem depender do clima real |
| RF-11 | Gráfico de temperatura das próximas 24h | Linha com temperatura + barras de chance de chuva |
| RF-12 | Detalhes do dia | Nascer/pôr do sol, índice UV máx, chance de chuva máx, neve prevista (cm) |
| RF-13 | Risco de tempestade | Indicador derivado (ver seção 4) — **não é probabilidade oficial** |
| RF-14 | Avisos para a população | Avisos calculados por limites (calor, frio extremo, UV alto, vento forte, tempestade, neve) — ver seção 4 |
| RF-16 | Radar animado de chuva (últimas 2 h) + direção do vento | Pedido do Dalmo — ADR-012 |
| RF-17 | "Radar futuro": chuva/neve prevista no mapa, próximas 24 h | Pedido do Dalmo — ADR-013 |
| RF-18 | Mapa navegável (mundo → cidade) com nomes e botões casa/minha localização | Pedido do Dalmo — ADR-014 |
| RF-19 | Boas-vindas, cidade fixa ao rolar e voltar ao topo | Pedido do Dalmo — ADR-017 |
| RF-20 | Detalhe ao tocar na hora; resumo Dia/Noite ao tocar no dia | Pedido do Dalmo — ADR-019 |
| RF-21 | Alertas oficiais do NWS (cidades dos EUA) | Pedido do Dalmo — ADR-020 |
| RF-22 | Pontos de atenção no "Hoje em detalhe" com recomendações | Pedido do Dalmo — ADR-022 |
| RF-15 | Lembrar última cidade | Salva no navegador; ao abrir, já carrega essa cidade |

### WON'T (fora desta versão)

- Alertas oficiais da Defesa Civil / INMET (Brasil) — sem API simples e gratuita. *(NWS dos EUA entrou na v2.0 — ADR-020)*
- Login, contas, backend próprio
- Notificações push
- App instalável (PWA)

## 3. Requisitos não funcionais

| ID | Requisito |
|----|-----------|
| RNF-01 | Mobile-first, sem rolagem horizontal |
| RNF-02 | Custo zero: sem chave de API, sem servidor pago |
| RNF-03 | Carregamento inicial < 3s em 4G |
| RNF-04 | Interface em português do Brasil; datas e horas no fuso **da cidade consultada** |
| RNF-05 | Acessibilidade básica: contraste AA, botões com rótulo, navegação por teclado na busca |
| RNF-06 | Atribuição da fonte de dados no rodapé ("Dados: Open-Meteo") |
| RNF-07 | Código legível e organizado em módulos (é um exercício de arquitetura) |

## 4. Limites honestos da fonte de dados

Verificado na documentação da Open-Meteo em 27/09/2026:

- **15 dias:** a API permite até 16 dias (`forecast_days=16`). Viável. A confiabilidade cai muito depois do 7º–10º dia, por isso os dias 8–15 aparecem como "tendência".
- **Chance de chuva:** existe (`precipitation_probability`, horária e máxima diária).
- **Neve:** existe como quantidade (`snowfall`, `snowfall_sum`) e pelos códigos de tempo (71–77, 85–86). **Não existe "chance de neve" em %**. Mostraremos "neve prevista: X cm" quando houver.
- **Tempestade:** **não existe "chance de tempestade" em %**. Existem: código de tempo 95–99 (tempestade) e CAPE (energia de instabilidade). O site mostrará **"Risco de tempestade: baixo / moderado / alto"** derivado dessas duas informações, com nota explicando que é uma estimativa.
- **Eventos para a população (alertas):** a Open-Meteo **não fornece alertas oficiais**. Alternativas: NWS (api.weather.gov) é gratuito mas cobre só os EUA; para o Brasil não há uma API simples equivalente. Decisão v1: **avisos calculados** pelo próprio site, rotulados como "aviso automático, não oficial". Ver ADR-005.

## 5. Premissas

- A apresentação será feita de um computador com internet.
- Um link público é suficiente para demonstrar (não é necessário domínio próprio).
- Cidade padrão: **localização do usuário**; se não for possível, **Boston, MA** (decisão do Dalmo — ADR-008).
- Visual: acompanha o clima do local; referência estética geral em portais de clima como o The Weather Channel (ADR-009).
