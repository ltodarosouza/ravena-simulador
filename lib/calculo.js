// A conta do simulador. Pura: recebe os números e devolve o resultado, sem tocar em banco nem rede.
// A ordem da conta não está na spec (o brief deixa aberta); esta é a ordem desta construção:
//   1. tira a iluminação pública da conta e divide pela tarifa: consumo em kWh
//   2. consumo / geração por kWp: tamanho do sistema (sem arredondar)
//   3. tamanho x preço da faixa: investimento
//   4. conta depois = disponibilidade + iluminação + Fio B sobre a energia compensada
//   5. economia do ano = (conta - conta depois) x 12, com o Fio B subindo pelo cronograma
// Os valores internos nunca são arredondados; só o que vai para a tela (campo `exibido`).

const CIDADES = ["Sorocaba", "Votorantim", "Itu", "Salto"];
const ANOS_MAX = 50;

class SemValor extends Error {
  constructor(chave) {
    super(`sem valor vigente para ${chave}`);
    this.chave = chave;
  }
}

// Número cadastrado que não faz sentido (zero onde não pode, negativo, que não é número, percentual fora de 0 a 1)
// vale como "sem valor vigente": o simulador não responde, em vez de devolver uma conta cheia de null.
const ZERO_PODE = new Set(["reajuste_tarifa_anual", "disponibilidade_kwh_bifasica"]);
function plausivel(chave, v) {
  const finito = (x) => typeof x === "number" && Number.isFinite(x);
  const valores = (o) => (o && typeof o === "object" ? Object.values(o) : []);
  if (chave === "fio_b_percentual_por_ano") return valores(v).length > 0 && valores(v).every((p) => finito(p) && p >= 0 && p <= 1);
  if (chave === "iluminacao_publica") return valores(v).length > 0 && valores(v).every((p) => finito(p) && p >= 0);
  if (chave === "preco_kwp_faixas") return Array.isArray(v) && v.length > 0 && v.every((f) => f && finito(f.preco) && f.preco > 0);
  if (!finito(v)) return false;
  return ZERO_PODE.has(chave) ? v >= 0 : v > 0;
}

function simular({ conta, cidade }, numeros, hoje = new Date()) {
  const usados = {};
  const n = (chave) => {
    const x = numeros[chave];
    if (!x || x.valor === undefined || x.valor === null || new Date(x.vigencia) > hoje) throw new SemValor(chave);
    if (!plausivel(chave, x.valor)) throw new SemValor(chave);
    usados[chave] = { valor: x.valor, vigencia: x.vigencia, fonte: x.fonte };
    return x.valor;
  };

  if (typeof conta !== "number" || !Number.isFinite(conta) || conta <= 0) return { erro: "conta_invalida" };
  if (!CIDADES.includes(cidade)) return { erro: "cidade_invalida" };
  if (conta < n("conta_minima") || conta > n("conta_maxima")) return { erro: "fora_da_faixa" };
  if (n("reajuste_tarifa_anual") !== 0) throw new Error("reajuste da tarifa diferente de zero ainda não está implementado");

  const tarifa = n("tarifa_kwh");
  const iluminacao = n("iluminacao_publica")[cidade];
  const disponibilidade = n("disponibilidade_kwh_bifasica");
  const fioBkwh = n("fio_b_kwh");
  const percentuais = n("fio_b_percentual_por_ano");

  const consumo = (conta - iluminacao) / tarifa;
  const kwp = consumo / n("geracao_kwh_por_kwp_mes");
  const paineis = Math.ceil(kwp / n("potencia_painel_kwp"));
  const faixa = n("preco_kwp_faixas").find((f) => f.ate_kwp === null || kwp <= f.ate_kwp);
  const investimento = kwp * faixa.preco;
  const compensada = consumo - disponibilidade;

  const anoBase = hoje.getFullYear();
  const anos = Object.keys(percentuais).map(Number);
  const pctDoAno = (ano) => percentuais[String(Math.min(Math.max(ano, Math.min(...anos)), Math.max(...anos)))];
  const contaDepois = (ano) => disponibilidade * tarifa + iluminacao + pctDoAno(ano) * fioBkwh * compensada;

  const economiaAno1 = (conta - contaDepois(anoBase)) * 12;

  let retornoMeses = null;
  let acumulado = 0;
  for (let i = 1; i <= ANOS_MAX; i++) {
    const economia = (conta - contaDepois(anoBase + i - 1)) * 12;
    if (economia <= 0) break;
    if (acumulado + economia >= investimento) {
      retornoMeses = (i - 1) * 12 + ((investimento - acumulado) / economia) * 12;
      break;
    }
    acumulado += economia;
  }
  const totalMeses = retornoMeses === null ? null : Math.ceil(retornoMeses - 1e-9);
  const naoCompensa = totalMeses === null || totalMeses > n("limite_retorno_anos") * 12;

  return {
    entrada: { conta, cidade },
    interno: { consumo, kwp, investimento, contaDepois: contaDepois(anoBase), economiaAno1, retornoMeses },
    exibido: {
      kwp: Math.round(kwp * 10) / 10,
      paineis,
      investimento: Math.round(investimento / 100) * 100,
      conta_depois: Math.round(contaDepois(anoBase)),
      economia_ano1: Math.round(economiaAno1),
      retorno: totalMeses === null ? null : { anos: Math.floor(totalMeses / 12), meses: totalMeses % 12, total_meses: totalMeses },
      nao_compensa: naoCompensa,
    },
    numeros_usados: usados,
  };
}

// C6 também vale para quem pede: confere que todos os números que o cálculo lê têm valor vigente, rodando o
// próprio cálculo com a menor conta aceita. Lança SemValor, como o simulador.
function exigirNumeros(numeros, hoje = new Date()) {
  const minima = numeros.conta_minima && numeros.conta_minima.valor;
  const r = simular({ conta: minima, cidade: CIDADES[0] }, numeros, hoje);
  if (r.erro) throw new SemValor("conta_minima");
}

module.exports = { simular, exigirNumeros, CIDADES, SemValor };
