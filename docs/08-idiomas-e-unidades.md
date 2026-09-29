# 08 — Idiomas e unidades (padrão EMET OS)

> Pedido do Dalmo (29/09/2026): o site deve abrir **no idioma do celular**, com **escolha manual**
> para quem mora fora do seu país (imigrante), e as **medidas no costume de cada país**.
> Decisão registrada no [ADR-045](03-decisoes-adr.md). Este documento serve de **padrão reutilizável**
> para os outros produtos da visão EMET OS.

## 1. Regras

| Situação | O que acontece |
|---|---|
| Celular em português, inglês ou espanhol | O site abre nesse idioma |
| Celular em outro idioma (alemão, francês, japonês…) | O site abre em **inglês** (decisão do Dalmo) |
| A pessoa escolhe o idioma no 🌐 | Vale a escolha dela, salva no aparelho, até ela voltar ao "Automático" |
| Unidades "Automático" | Seguem o **país** configurado no celular, não o idioma |
| Link de viagem ou de cidade recebido | Abre no idioma e nas unidades de **quem abre**, não de quem enviou |

**Por que idioma e unidades são separados:** um brasileiro que mora nos EUA quer ler em português,
mas a estrada, as placas e o velocímetro dele estão em milhas. Por isso o site oferece os dois
controles separados.

## 2. Unidades por país (modo Automático)

| País do aparelho | Temperatura | Distância e velocidade | Chuva e neve |
|---|---|---|---|
| EUA, Porto Rico, Guam, Ilhas Virgens, Samoa Americana, Libéria, Mianmar | °F | milhas, mph | polegadas |
| Reino Unido (e Ilha de Man, Jersey, Guernsey) | °C | milhas, mph | mm |
| Todos os outros | °C | km, km/h | mm / cm |

O painel 🌐 oferece também **Métrico**, **EUA**, **Reino Unido** e **Personalizado** (cada medida
escolhida à parte). O botão **°C/°F** do topo troca só a temperatura e deixa as outras medidas como estão.
Quem já tinha escolhido °F antes da versão 5.0 continua com °F.

## 3. Formatos

- Números, datas e horas usam o **padrão do idioma** (`Intl` do navegador): `1.234,5` no Brasil, `1,234.5` nos EUA;
  `07:00` no Brasil, `7:00 AM` nos EUA, `7:00 p. m.` no México.
- Se o celular for de uma variante do mesmo idioma (inglês do Reino Unido, espanhol da Argentina), o formato
  segue essa variante (ex.: dia/mês no Reino Unido).
- Nomes de cidades e países vêm dos serviços de mapa **no idioma escolhido**.

## 4. Como funciona no código

| Arquivo | Papel |
|---|---|
| `js/i18n/pt.js`, `en.js`, `es.js` | Dicionários: `"chave": "texto com {marcador}"`. Português é a fonte. |
| `js/i18n/index.js` | Detecta o idioma, guarda a escolha manual, `t('chave', { marcador })`, `applyStatic()` para o HTML |
| `js/units-settings.js` | Modo de unidades (automático por país, métrico, EUA, Reino Unido, personalizado) |
| `js/domain/units.js` | Converte e formata: `temp`, `speed`, `dist`, `milestone`, `shortDist`, `rain`, `snow` |
| `js/ui/settings.js` | Painel 🌐 (idioma + unidades) |

**Para adicionar um idioma:** copiar `en.js` para `xx.js`, traduzir os textos (nunca o que está entre `{ }`),
incluir em `LANGS` no `index.js`, instalar o dicionário Hunspell do idioma e acrescentá-lo em
`tests/dicionarios.test.mjs`. O teste falha se faltar alguma chave.

**Alertas oficiais dos EUA (NWS):** o nome do alerta é traduzido (40 tipos mais comuns); o texto completo
fica no original, em inglês, com um aviso. Em inglês, o site mostra o nome oficial do NWS.

## 5. Validação dos textos

A validação tem três camadas:

1. **Automática, a cada envio ao GitHub** (`tests/dicionarios.test.mjs`):
   - todas as chaves existem nos três idiomas;
   - os marcadores `{…}` são os mesmos (senão um número some ou aparece `{v}` na tela);
   - **ortografia** de cada palavra no corretor **Hunspell**, com os mesmos dicionários do LibreOffice:
     **pt-BR = VERO** (Verificador Ortográfico Livre, Brasil), **en-US** e **es-MX** (espanhol latino-americano).
     Resultado de 29/09: 536 chaves, cerca de 7.800 palavras, 0 erro.
   - Palavras que o corretor não conhece (marcas, siglas, "Máx"/"Mín", imperativos como *Hidrátate*)
     ficam numa **lista explícita** no próprio teste. Nenhuma é aceita sem revisão.
2. **Revisão de sentido por um segundo agente de IA**, que não escreveu as traduções. Ele comparou inglês e
   espanhol com o português, olhando principalmente os **cuidados de segurança**. Nenhum erro mudava o
   sentido de uma instrução de segurança nem um número. Foram corrigidos 3 pontos no inglês e cerca de
   12 no espanhol:
   - termos usados só na Espanha: *arcén* → *acotamiento*, *furgoneta* → *camioneta*, *las largas* → *las altas*;
   - gênero de "la alerta";
   - "grupos sensibles", como na escala da EPA;
   - uma só palavra para cada intensidade de chuva;
   - horários sem "a las 1:00".
3. **Checagem humana (Dalmo):** pendente. O corretor garante a ortografia, mas não se a frase soa natural.
   Vale pedir a um falante nativo de inglês e a um de espanhol para lerem os **cuidados** (`adv.*`) antes de
   anunciar o produto nesses idiomas.

O que **não** está garantido: gramática fina e tom. O corretor confere palavra por palavra, não a frase.

## 6. Testes de tela

A partir da 5.0, o teste de ponta a ponta roda o site com o celular configurado em cada caso:

- **pt-BR:** padrão dos testes antigos.
- **en-US:** inglês, °F, milhas; nenhuma chave aparece crua na tela; hora com AM/PM.
- **en-GB:** inglês, °C, milhas.
- **es-MX:** espanhol, métrico.
- **de-DE:** idioma sem dicionário, abre em inglês, métrico.
- **Escolha manual:** aparelho em inglês dos EUA, a pessoa escolhe português e as milhas continuam. A escolha
  continua depois de recarregar. O modo personalizado aceita °C com mph e mm, e o °F do topo não mexe no resto.
  "Automático" volta ao idioma do aparelho.
- **Migração:** quem escolheu °F antes da 5.0 continua com °F.
- **Link de viagem:** abre no idioma de quem abre.
- **Acessibilidade:** WCAG AA com o painel 🌐 aberto, em inglês.
