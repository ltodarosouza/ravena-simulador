const http = require("http");
const fs = require("fs");
const path = require("path");
const { simular, exigirNumeros, SemValor } = require("./lib/calculo");
const { lerConta } = require("./lib/valor-da-conta");

const MENSAGENS = {
  conta_invalida: "Digite o valor da conta em reais.",
  cidade_invalida: "Escolha uma das quatro cidades.",
  fora_da_faixa: "Esse valor está fora do que o simulador atende.",
  nome_vazio: "Digite seu nome.",
  nome_com_cpf: "Digite só o seu nome. Não pedimos CPF.",
  nome_longo: "Digite só o seu nome, com até 100 letras.",
  whatsapp_invalido: "Digite um WhatsApp com DDD.",
  whatsapp_parece_cpf: "Esse número parece um CPF. Digite o seu WhatsApp com DDD.",
  simulacao_inexistente: "Faça a simulação de novo.",
  nao_compensa: "Para essa conta o sistema solar não compensa, então não pedimos o seu contato.",
};

const LIMITE_DO_CORPO = 10 * 1024; // bytes; um pedido de verdade tem poucas centenas
class CorpoGrande extends Error {}

function criarServidor({ banco, numeros, hoje = () => new Date() }) {
  const pagina = fs.readFileSync(path.join(__dirname, "public", "index.html"));

  // Lê o corpo guardando no máximo o limite: o que passar é descartado, e a recusa vem no fim.
  function lerCorpo(req) {
    return new Promise((ok, falha) => {
      let texto = "", bytes = 0;
      req.on("data", (c) => {
        bytes += c.length;
        if (bytes <= LIMITE_DO_CORPO) texto += c;
      });
      req.on("end", () => {
        if (bytes > LIMITE_DO_CORPO) return falha(new CorpoGrande());
        try {
          const corpo = texto ? JSON.parse(texto) : {};
          if (corpo === null || typeof corpo !== "object" || Array.isArray(corpo)) throw new SyntaxError("o corpo não é um objeto");
          ok(corpo);
        } catch (e) { falha(e); }
      });
    });
  }
  const numerosDe = async (agora) => (typeof numeros === "function" ? numeros(agora) : numeros);
  const json = (res, status, corpo) => {
    res.writeHead(status, { "content-type": "application/json; charset=utf-8" });
    res.end(JSON.stringify(corpo));
  };

  return http.createServer(async (req, res) => {
    try {
      if (req.method === "GET" && req.url === "/") {
        res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
        return res.end(pagina);
      }
      if (req.method === "POST" && req.url === "/api/simular") {
        const { conta, cidade } = await lerCorpo(req);
        const agora = hoje();
        const dosNumeros = await numerosDe(agora);
        const sim = simular({ conta: lerConta(conta), cidade }, dosNumeros, agora);
        if (sim.erro) return json(res, 422, { erro: sim.erro, mensagem: MENSAGENS[sim.erro] });
        const id = await banco.guardarSimulacao(sim);
        return json(res, 200, { simulacao_id: id, ...sim.exibido });
      }
      if (req.method === "POST" && req.url === "/api/pedido") {
        const corpo = await lerCorpo(req);
        exigirNumeros(await numerosDe(hoje()), hoje()); // C6 vale também para quem pede
        const r = await banco.criarPedido(corpo);
        if (r.erro) return json(res, 422, { erro: r.erro, mensagem: MENSAGENS[r.erro] });
        // repetido e novo têm a mesma resposta: quem chama não descobre se um número já pediu
        return json(res, 201, { mensagem: "Pedido recebido." });
      }
      json(res, 404, { erro: "nao_encontrado" });
    } catch (e) {
      if (e instanceof SemValor) return json(res, 503, { erro: "sem_valor_vigente", mensagem: "O simulador está em atualização. Tente mais tarde." });
      if (e instanceof CorpoGrande) return json(res, 413, { erro: "corpo_grande" });
      if (e instanceof SyntaxError) return json(res, 400, { erro: "corpo_invalido" });
      console.error(e);
      json(res, 500, { erro: "interno" });
    }
  });
}

module.exports = { criarServidor };

if (require.main === module) {
  (async () => {
    const supabase = require("./lib/banco-supabase");
    if (!supabase.configurado()) {
      console.error("Sem SUPABASE_URL e SUPABASE_SECRET_KEY no .env.local: o simulador só roda com os números do dono, que moram no banco.");
      process.exit(1);
    }
    const banco = supabase.abrir();
    const porta = Number(process.env.PORT) || 4300;
    criarServidor({ banco, numeros: (hoje) => banco.numerosVigentes(hoje) }).listen(porta, () => console.log(`simulador em http://localhost:${porta} (números do dono, no Supabase)`));
  })();
}
