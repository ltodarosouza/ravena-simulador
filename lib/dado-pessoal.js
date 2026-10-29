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

const NOME_MAXIMO = 100;

// Os algarismos de qualquer alfabeto (largura total, árabes, devanágari...) viram 0 a 9. Sem isso, um CPF escrito
// com "５２９..." passaria pelo filtro, que só enxerga 0-9.
function soDigitos(texto) {
  let d = "";
  for (const c of String(texto || "").normalize("NFKC")) {
    if (!/\p{Nd}/u.test(c)) continue;
    let passos = 0; // quantos algarismos vêm antes dele no mesmo bloco: é o valor dele
    for (let cp = c.codePointAt(0) - 1; /\p{Nd}/u.test(String.fromCodePoint(cp)); cp--) passos++;
    d += passos % 10;
  }
  return d;
}

// Procura um CPF válido no meio do texto, em qualquer formato (pontos, traço, espaços, frase).
function temCpf(texto) {
  const d = soDigitos(texto);
  for (let i = 0; i + 11 <= d.length; i++) if (cpfValido(d.slice(i, i + 11))) return true;
  return false;
}

// Erro do campo nome, ou null se está bom.
function erroDoNome(nome, minimo = 1) {
  const limpo = String(nome || "").trim();
  if (limpo.length < minimo) return "nome_vazio";
  if (limpo.length > NOME_MAXIMO) return "nome_longo";
  if (temCpf(limpo)) return "nome_com_cpf";
  return null;
}

// O campo WhatsApp tem 11 dígitos exatos que fecham como CPF: é um CPF, não um telefone.
function whatsappParecidoCpf(texto) {
  return cpfValido(soDigitos(texto));
}

module.exports = { temCpf, erroDoNome, whatsappParecidoCpf };
