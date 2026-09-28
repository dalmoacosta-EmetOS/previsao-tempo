// Níveis de atenção para o "Hoje em detalhe" + recomendações (ADR-022).
// Limites baseados em referências públicas (escala Beaufort, OMS para UV, faixas de
// avisos de chuva do INMET). NÃO são alertas oficiais.
import { speed } from './units.js?v=2.5.1';
import { isWetHour } from './summary.js?v=2.5.1';

export const SOURCES = 'Limites: escala Beaufort (vento), OMS (índice UV), faixas de aviso do INMET (chuva). Recomendações gerais de segurança — em emergência, siga a Defesa Civil e as autoridades locais.';

const ADVICE = {
  gust: {
    warn: {
      title: 'Rajadas fortes',
      walk: 'Atenção a galhos, placas e objetos que possam voar. Guarda-chuva pode virar.',
      drive: 'Segure firme o volante, principalmente em pontes e estradas abertas; cuidado ao ultrapassar caminhões.',
      home: 'Recolha objetos soltos de varandas e quintais; feche janelas nos cômodos expostos ao vento.',
    },
    danger: {
      title: 'Ventania',
      walk: 'Evite áreas arborizadas, andaimes e fachadas; não se abrigue sob árvores ou placas.',
      drive: 'Evite dirigir se não for necessário; reduza a velocidade e não estacione sob árvores ou fiação.',
      home: 'Feche portas e janelas, afaste-se de vidraças e desligue aparelhos se houver oscilação de energia.',
    },
  },
  wind: {
    warn: {
      title: 'Vento forte e constante',
      walk: 'Caminhar pode ficar difícil em áreas abertas; atenção redobrada com crianças e idosos.',
      drive: 'Veículos altos e motos sentem mais o vento lateral; mantenha distância dos outros carros.',
      home: 'Prenda toldos, lonas e coberturas; janelas abertas podem bater.',
    },
    danger: {
      title: 'Vento muito forte',
      walk: 'Fique em local protegido; evite orla, pontes e áreas abertas.',
      drive: 'Adie viagens se possível; risco de queda de árvores e postes.',
      home: 'Mantenha tudo fechado e tenha lanterna à mão em caso de falta de energia.',
    },
  },
  uv: {
    warn: {
      title: 'Índice UV alto',
      walk: 'Use protetor solar (FPS 30+), chapéu e óculos; prefira a sombra.',
      drive: 'O sol atravessa vidros laterais: use protetor nos braços em viagens longas.',
      home: 'Hidrate-se; crianças e idosos devem evitar o sol forte.',
    },
    danger: {
      title: 'Índice UV muito alto',
      walk: 'Evite o sol entre 10h e 16h; reaplique o protetor a cada 2 horas.',
      drive: 'Use óculos de sol com proteção UV; não deixe crianças ou animais no carro.',
      home: 'Mantenha cortinas fechadas nas horas de sol forte; beba água com frequência.',
    },
  },
  rain: {
    warn: {
      title: 'Chuva volumosa',
      walk: 'Evite atravessar ruas alagadas e passar perto de bueiros e córregos.',
      drive: 'Reduza a velocidade, acenda o farol baixo e aumente a distância do carro da frente (risco de aquaplanagem).',
      home: 'Verifique calhas e ralos; mantenha documentos e eletrônicos longe do chão.',
    },
    danger: {
      title: 'Chuva muito volumosa — risco de alagamento',
      walk: 'Não entre em água de enchente: 15 cm de correnteza já derrubam uma pessoa.',
      drive: 'Nunca atravesse trechos alagados — 30 cm de água podem arrastar um carro.',
      home: 'Em área de risco, prepare-se para sair; desligue a energia se a água entrar na casa.',
    },
  },
  snow: {
    warn: {
      title: 'Neve prevista',
      walk: 'Use calçado antiderrapante; cuidado com gelo em escadas e calçadas.',
      drive: 'Vá devagar, freie com antecedência e limpe todo o gelo dos vidros antes de sair.',
      home: 'Tenha pá e sal à mão; proteja canos expostos ao frio.',
    },
    danger: {
      title: 'Nevasca',
      walk: 'Evite sair; o frio e a baixa visibilidade são perigosos.',
      drive: 'Evite dirigir; se precisar, leve cobertor, água e carregador no carro.',
      home: 'Prepare-se para falta de energia: lanternas, pilhas, agasalhos e comida.',
    },
  },
  storm: {
    warn: {
      title: 'Possibilidade de tempestade',
      walk: 'Ao ouvir trovões, procure abrigo em prédio fechado.',
      drive: 'Chuva forte repentina reduz a visibilidade; acenda o farol baixo.',
      home: 'Tire aparelhos sensíveis da tomada se houver raios.',
    },
    danger: {
      title: 'Tempestade prevista',
      walk: 'Evite áreas abertas, árvores isoladas, piscinas e praias; não use o celular ao ar livre durante raios.',
      drive: 'Se possível, espere a tempestade passar; o carro fechado é um bom abrigo contra raios.',
      home: 'Feche janelas, fique longe delas e desligue aparelhos da tomada.',
    },
  },
};

const kmh = (v) => v ?? 0;

/** Avalia o dia de hoje; devolve { chave: { level, title, reason, walk, drive, home } }. */
export function evaluateToday(data, stormRisk, unit = 'C') {
  const sp = (v) => speed(v, unit);
  const mm = (v) => (unit === 'F' ? `${(v / 25.4).toFixed(1).replace('.', ',')} pol` : `${Math.round(v)} mm`);
  const d = data.daily[0];
  const today = data.hours.filter((h) => h.time.startsWith(d.date));
  const rainMm = today.reduce((a, h) => a + (h.precip ?? 0), 0);
  const maxRate = Math.max(0, ...today.filter(isWetHour).map((h) => h.precip ?? 0));
  const out = {};
  const put = (key, level, reason) => { if (level) out[key] = { level, reason, ...ADVICE[key][level] }; };

  const g = kmh(d.gustMax);
  put('gust', g >= 62 ? 'danger' : g >= 40 ? 'warn' : null, `Rajadas de até ${sp(g)} (atenção a partir de ${sp(40)}; ventania a partir de ${sp(62)}).`);
  const w = kmh(d.windMax);
  put('wind', w >= 62 ? 'danger' : w >= 39 ? 'warn' : null, `Vento constante de até ${sp(w)} (forte a partir de ${sp(39)}).`);
  const uv = d.uv ?? 0;
  put('uv', uv >= 8 ? 'danger' : uv >= 6 ? 'warn' : null, `Índice UV ${Math.round(uv)} (alto a partir de 6; muito alto a partir de 8).`);
  put('rain', rainMm >= 50 || maxRate >= 30 ? 'danger' : rainMm >= 30 || maxRate >= 20 ? 'warn' : null,
    `Cerca de ${mm(rainMm)} previstos hoje (atenção a partir de ${mm(30)}; risco de alagamento a partir de ${mm(50)}).`);
  const sn = d.snow ?? 0;
  put('snow', sn >= 10 ? 'danger' : sn > 0 ? 'warn' : null, `Cerca de ${unit === 'F' ? (sn / 2.54).toFixed(1).replace('.', ',') + ' pol' : sn.toFixed(1).replace('.', ',') + ' cm'} de neve previstos.`);
  put('storm', stormRisk === 'alto' ? 'danger' : stormRisk === 'moderado' ? 'warn' : null, `Risco de tempestade ${stormRisk} (estimativa do site).`);
  return { levels: out, rainMm };
}
