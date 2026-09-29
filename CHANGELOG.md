# Histórico de versões — Weather Forecast

Formato: a versão mais nova primeiro. Cada item aponta para a decisão (ADR) em [docs/03-decisoes-adr.md](docs/03-decisoes-adr.md).

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
