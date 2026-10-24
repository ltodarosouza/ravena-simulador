// O pedido só pede nome e WhatsApp. Se o campo nome trouxer um CPF, o pedido é recusado e nada é gravado.

function cpfValido(d) {
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
  const digito = (n) => {
    let soma = 0;
    for (let i = 0; i < n; i++) soma += Number(d[i]) * (n + 1 - i);
    const r = (soma * 10) % 11;
    return r === 10 ? 0 : r;
  };
  return digito(9) === Number(d[9]) && digito(10) === Number(d[10]);
}

// Procura um CPF válido no meio do texto, em qualquer formato (pontos, traço, espaços, frase).
function temCpf(texto) {
  const d = String(texto || "").replace(/\D/g, "");
  for (let i = 0; i + 11 <= d.length; i++) if (cpfValido(d.slice(i, i + 11))) return true;
  return false;
}

// Erro do campo nome, ou null se está bom.
function erroDoNome(nome, minimo = 1) {
  const limpo = String(nome || "").trim();
  if (limpo.length < minimo) return "nome_vazio";
  if (temCpf(limpo)) return "nome_com_cpf";
  return null;
}

module.exports = { temCpf, erroDoNome };
