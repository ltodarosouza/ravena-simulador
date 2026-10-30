// Entrada da Vercel: monta o mesmo servidor de server.js uma vez por instância e entrega cada pedido a ele.
// A limpeza de retenção não roda aqui (não há processo longo); ela fica para um agendamento, ainda não feito.
const supabase = require("../lib/banco-supabase");
const { criarServidor } = require("../server");

let servidor;
function montar() {
  if (!servidor) {
    const banco = supabase.abrir();
    const env = supabase.lerEnv();
    servidor = criarServidor({
      banco,
      numeros: (hoje) => banco.numerosVigentes(hoje),
      donoToken: env.OWNER_ACCESS_TOKEN,
      acessos: { carlos: env.CARLOS_ACCESS_TOKEN, renata: env.RENATA_ACCESS_TOKEN, dono: env.OWNER_ACCESS_TOKEN },
    });
  }
  return servidor;
}

module.exports = (req, res) => {
  if (!supabase.configurado()) {
    res.statusCode = 503;
    res.setHeader("content-type", "application/json");
    return res.end(JSON.stringify({ erro: "servico_indisponivel" }));
  }
  montar().emit("request", req, res);
};
