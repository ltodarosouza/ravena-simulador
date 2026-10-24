// O valor da conta como a pessoa escreve no Brasil. A página manda "1234.56" (campo numérico), mas a conta de luz
// traz "R$ 1.234,56", e quem digita à mão escreve "1234,56" ou "1.234". Aqui só entra o que tem um sentido claro;
// o resto vira NaN e o simulador pede o valor de novo.
//   "R$ 1.234,56", "1.234,56", "1234,56", "600,50"  -> vírgula é a casa decimal, ponto é milhar
//   "1.234"                                         -> mil duzentos e trinta e quatro (ponto seguido de 3 dígitos é milhar)
//   "1234.56", "600"                                -> como já era
//   "1e3", "0x10", "abc", "1,2,3", "1.2.3"          -> NaN
function lerConta(entrada) {
  if (typeof entrada === "number") return entrada;
  if (typeof entrada !== "string") return NaN;
  let texto = entrada.replace(/\s/g, "").replace(/^R\$/i, "");
  const negativo = texto.startsWith("-");
  if (negativo) texto = texto.slice(1);

  let numero;
  if (/^\d+(,\d{1,2})?$/.test(texto)) numero = Number(texto.replace(",", "."));
  else if (/^\d{1,3}(\.\d{3})+(,\d{1,2})?$/.test(texto)) numero = Number(texto.replace(/\./g, "").replace(",", "."));
  else if (/^\d+\.\d{1,2}$/.test(texto)) numero = Number(texto);
  else return NaN;
  return negativo ? -numero : numero;
}

module.exports = { lerConta };
