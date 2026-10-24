const http = require("http");
const fs = require("fs");
const path = require("path");
const { simular, SemValor } = require("./lib/calculo");

const MENSAGENS = {
  conta_invalida: "Digite o valor da conta em reais.",
  cidade_invalida: "Escolha uma das quatro cidades.",
  fora_da_faixa: "Esse valor está fora do que o simulador atende.",
  nome_vazio: "Digite seu nome.",
  nome_com_cpf: "Digite só o seu nome. Não pedimos CPF.",
  whatsapp_invalido: "Digite um WhatsApp com DDD.",
  whatsapp_parece_cpf: "Esse número parece um CPF. Digite o seu WhatsApp com DDD.",
  simulacao_inexistente: "Faça a simulação de novo.",
};

function criarServidor({ banco, numeros, hoje = () => new Date() }) {
  const pagina = fs.readFileSync(path.join(__dirname, "public", "index.html"));

  function lerCorpo(req) {
    return new Promise((ok, falha) => {
      let texto = "";
      req.on("data", (c) => (texto += c));
      req.on("end", () => {
        try { ok(texto ? JSON.parse(texto) : {}); } catch (e) { falha(e); }
      });
    });
  }
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
        const dosNumeros = typeof numeros === "function" ? await numeros(agora) : numeros;
        const sim = simular({ conta: Number(conta), cidade }, dosNumeros, agora);
        if (sim.erro) return json(res, 422, { erro: sim.erro, mensagem: MENSAGENS[sim.erro] });
        const id = await banco.guardarSimulacao(sim);
        return json(res, 200, { simulacao_id: id, ...sim.exibido });
      }
      if (req.method === "POST" && req.url === "/api/pedido") {
        const r = await banco.criarPedido(await lerCorpo(req));
        if (r.erro) return json(res, 422, { erro: r.erro, mensagem: MENSAGENS[r.erro] });
        if (r.duplicado) return json(res, 200, { duplicado: true, mensagem: "Já recebemos o seu pedido." });
        return json(res, 201, { id: r.id, mensagem: "Pedido recebido." });
      }
      json(res, 404, { erro: "nao_encontrado" });
    } catch (e) {
      if (e instanceof SemValor) return json(res, 503, { erro: "sem_valor_vigente", mensagem: "O simulador está em atualização. Tente mais tarde." });
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
