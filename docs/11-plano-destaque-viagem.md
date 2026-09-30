# 11 — Plano: dar destaque ao Planejador de viagem (29/09/2026)

> **Pedido do Dalmo:** "O principal diferencial é o planejador de viagem. Está apagado, escondido,
> sem destaque." Três frentes analisaram o produto em paralelo: design/UX, marketing/vendas e
> tecnologia/IA. Este é o plano consolidado.
>
> **Versão de segurança:** `congelado-v5.5` (commit 0b812d7).
>
> **Situação:** as fases 1 e 2 foram feitas na **v6.0** (ADR-048). A fase 3 depende das decisões do Dalmo: nome, contador de visitas e divulgação.

## Diagnóstico
- [Certo] No iPhone, o planejador fica a 3 ou 4 telas do topo, **fechado**, depois de boas-vindas, cidade, 24 h e radar.
- [Certo] A frase de boas-vindas promete "para onde você for", mas nada na primeira tela entrega isso.
- [Certo] O resultado demora porque espera **tudo** chegar: nomes das cidades (até 3,5 s cada) e alertas dos EUA (até 8 s).
- [Certo] O nome "Weather Forecast" é genérico, em inglês, e esconde o diferencial.

## Fase 1 — Destaque na tela (grátis)
1. **Faixa "Vai pegar a estrada?"** logo abaixo da temperatura, dentro da primeira tela do celular:
   - uma linha de apoio ("O tempo em cada trecho, na hora em que você passa");
   - um único campo, **"Para onde você vai?"**;
   - a saída já preenchida com a cidade atual ("Saindo de Boston ✎").
2. **Ao tocar no campo, a faixa se abre ali mesmo:** data, hora, carro/moto/caminhão e o botão **"Ver o tempo na rota"**.
3. **O resultado aparece logo abaixo.** Temperatura, 24 h e radar continuam sem mudança.
4. **Saudação em uma linha só** (hoje são 4 linhas), para a faixa caber na primeira tela. *Decisão do Dalmo.*
5. **Atalho para o planejador na barra da cidade:** quando a faixa sai da tela, a barra fixa ganha um ícone de rota que volta para ela.
6. **Com viagem salva ou link recebido**, a faixa vira um resumo: "Boston → NYC · sáb 8h · ⚠ chuva forte no trecho 2".

## Fase 2 — O resultado parecer produto de ponta (grátis, sem servidor)
1. **Previsão primeiro, detalhes depois:**
   - os trechos aparecem já com "km 120" e trocam para o nome da cidade quando ele chega;
   - os alertas oficiais entram em seguida, como já acontece com os postos;
   - estimativa: 3 a 8 s mais rápido nos EUA [Provável].
2. **Rota colorida por trecho no mapa** (verde, amarelo, vermelho, sempre com ícone junto) e uma faixa-resumo com a mesma cor no topo do resultado.
3. **Controle deslizante do horário de saída:** a pessoa arrasta e vê a viagem mudar. Não faz nova busca, os dados já estão baixados.
4. **Resumo de riscos contado:** "2 trechos de chuva forte · 40 min à noite · 3 postos". Hoje só o pior trecho é citado.
5. **Viagens recentes no aparelho:** um toque para refazer.
6. **"Ver exemplo":** uma rota pronta para quem ainda não sabe o que é. Também serve de link para demonstração e apresentação.

## Fase 3 — Marca e divulgação (decisões do Dalmo)
- **Posicionamento:** "O planejador de viagem gratuito que mostra o tempo em cada trecho da estrada na hora em que você passa, e o melhor horário para sair."
- **Nome.**
  - Candidatos: **Hora de Sair** (preferido do marketing), **Chega Bem**, **TrechoCerto**.
  - Já ocupados: "Clima na Estrada", "TempoNaRota", "Rota & Clima", "Highway Weather".
  - **Rumo** conflita com a empresa de logística.
  - Antes de adotar, conferir no INPI/USPTO e o domínio.
- **Três mensagens, nesta ordem:**
  1. O tempo em cada trecho, na hora em que você passa.
  2. Cuidados para o seu veículo e o melhor horário de saída.
  3. Plano que sempre abre atualizado, pelo WhatsApp e no calendário.
- **Primeiros 100 usuários (custo quase zero):**
  - grupos de motociclistas e caminhoneiros (a isca são as balanças);
  - comunidades de brasileiros nos EUA;
  - posts 3 a 5 dias antes dos feriados (12/out, 2/nov, 15/nov, 20/nov, Thanksgiving);
  - páginas de rotas populares ("SP–Rio pela Dutra");
  - cada plano compartilhado leva o nome do site.

## O que NÃO fazer agora
- **Resumo por IA:** sem servidor, a chave ficaria exposta, e o texto atual já resolve. Fica para a fase AWS.
- **Rotas alternativas e várias paradas:** o servidor de rotas gratuito não aguenta.
- **Notificações e contas de usuário:** exigem servidor.
- **Modo GPS "a caminho":** o celular corta o GPS com a tela bloqueada, e existe o risco de uso ao volante.
- **Anúncio ou cobrança:** o plano grátis da Open-Meteo é só para uso não comercial; exigiria o plano pago.

## Como medir
- **Ferramenta:** contador sem cookies (GoatCounter ou Plausible). **Decisão do Dalmo:** hoje o site não mede nada.
- **O que medir:**
  - % de visitas que tocam em "Para onde você vai?" (meta de 8%) e quantas chegam à rota;
  - % de planos compartilhados (meta de 30%) e quantos são reabertos pelo link;
  - comparação de 2 semanas antes e 2 semanas depois.
- **Não pode piorar:** o uso da busca de cidade e a saída imediata do site.
