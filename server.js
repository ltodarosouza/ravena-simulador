const http = require("http");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { simular, exigirNumeros, SemValor } = require("./lib/calculo");
const { lerConta } = require("./lib/valor-da-conta");
const { validarTarifa } = require("./lib/numero-dono");
const { estagioValido } = require("./lib/estagio");

const MENSAGENS = {
  conta_invalida: "Digite o valor da conta em reais.",
  cidade_invalida: "Escolha uma das quatro cidades.",
  nome_vazio: "Digite seu nome.",
  nome_com_cpf: "Digite só o seu nome. Não pedimos CPF.",
  nome_longo: "Digite só o seu nome, com até 100 letras.",
  whatsapp_invalido: "Digite um WhatsApp com DDD.",
  whatsapp_parece_cpf: "Esse número parece um CPF. Digite o seu WhatsApp com DDD.",
  privacidade_nao_aceita: "Confirme o aviso de privacidade para pedir a simulação detalhada.",
  simulacao_inexistente: "Faça a simulação de novo.",
  nao_compensa: "Para essa conta o sistema solar não compensa, então não pedimos o seu contato.",
  numero_invalido: "Digite uma tarifa maior que zero.",
  vigencia_invalida: "Digite uma data de vigência válida.",
  fonte_invalida: "Informe a fonte da tarifa.",
  confirmacao_exclusao_invalida: "Digite EXCLUIR para confirmar.",
  whatsapp_exclusao_invalido: "Digite um WhatsApp válido com DDD.",
};

const LIMITE_DO_CORPO = 10 * 1024; // bytes; um pedido de verdade tem poucas centenas
class CorpoGrande extends Error {}

function criarServidor({ banco, numeros, hoje = () => new Date(), donoToken = "", acessos = {} }) {
  const pagina = fs.readFileSync(path.join(__dirname, "public", "index.html"));
  const paginaDono = fs.readFileSync(path.join(__dirname, "public", "dono.html"));
  const paginaPainel = fs.readFileSync(path.join(__dirname, "public", "painel.html"));
  const estilo = fs.readFileSync(path.join(__dirname, "public", "ravena.css"));
  const logo = fs.readFileSync(path.join(__dirname, "public", "logo.svg"));
  const icone = fs.readFileSync(path.join(__dirname, "public", "icone.svg"));
  const tokens = { ...acessos, dono: acessos.dono || donoToken };

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
  const segredoIgual = (esperado, recebido) => {
    if (!esperado || !recebido) return false;
    const esperadoBuffer = Buffer.from(String(esperado));
    const recebidoBuffer = Buffer.from(String(recebido));
    return esperadoBuffer.length === recebidoBuffer.length
      && crypto.timingSafeEqual(esperadoBuffer, recebidoBuffer);
  };
  const identificar = (req) => {
    const recebido = String(req.headers.authorization || "").replace(/^Bearer\s+/i, "");
    if (segredoIgual(tokens.carlos, recebido)) return { papel: "vendedor", nome: "carlos" };
    if (segredoIgual(tokens.renata, recebido)) return { papel: "vendedor", nome: "renata" };
    if (segredoIgual(tokens.dono, recebido)) return { papel: "dono" };
    return null;
  };
  const donoAutorizado = (req) => identificar(req)?.papel === "dono";

  return http.createServer(async (req, res) => {
    try {
      if (req.method === "GET" && req.url === "/") {
        res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
        return res.end(pagina);
      }
      if (req.method === "GET" && req.url === "/dono") {
        res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
        return res.end(paginaDono);
      }
      if (req.method === "GET" && req.url === "/painel") {
        res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
        return res.end(paginaPainel);
      }
      if (req.method === "GET" && req.url === "/ravena.css") {
        res.writeHead(200, { "content-type": "text/css; charset=utf-8" });
        return res.end(estilo);
      }
      if (req.method === "GET" && req.url === "/logo.svg") {
        res.writeHead(200, { "content-type": "image/svg+xml" });
        return res.end(logo);
      }
      if (req.method === "GET" && req.url === "/icone.svg") {
        res.writeHead(200, { "content-type": "image/svg+xml" });
        return res.end(icone);
      }
      if (req.url === "/api/dono/tarifa") {
        if (!tokens.dono) return json(res, 503, { erro: "acesso_dono_nao_configurado" });
        if (!donoAutorizado(req)) return json(res, 401, { erro: "nao_autorizado" });
        if (req.method === "GET") return json(res, 200, await banco.historicoNumero("tarifa_kwh"));
        if (req.method === "POST") {
          const validado = validarTarifa(await lerCorpo(req));
          if (validado.erro) {
            return json(res, 422, { erro: validado.erro, mensagem: MENSAGENS[validado.erro] });
          }
          await banco.salvarNumero({
            chave: "tarifa_kwh",
            ...validado,
            alterado_por: "dono",
          });
          return json(res, 201, { mensagem: "Tarifa salva." });
        }
      }
      if (req.url === "/api/dono/exclusao") {
        if (!tokens.dono) return json(res, 503, { erro: "acesso_dono_nao_configurado" });
        if (!donoAutorizado(req)) return json(res, 401, { erro: "nao_autorizado" });
        if (req.method === "POST") {
          const corpo = await lerCorpo(req);
          if (corpo.confirmacao !== "EXCLUIR") {
            return json(res, 422, {
              erro: "confirmacao_exclusao_invalida",
              mensagem: MENSAGENS.confirmacao_exclusao_invalida,
            });
          }
          const removidos = await banco.excluirPessoaPorWhatsapp(corpo.whatsapp);
          if (!removidos) {
            return json(res, 422, {
              erro: "whatsapp_exclusao_invalido",
              mensagem: MENSAGENS.whatsapp_exclusao_invalido,
            });
          }
          const mensagem = removidos.pedidos
            ? "Dados excluídos."
            : "Nenhum dado encontrado para esse WhatsApp.";
          return json(res, 200, { mensagem, removidos });
        }
      }
      if (req.url.startsWith("/api/painel/")) {
        const quem = identificar(req);
        if (!quem) return json(res, 401, { erro: "nao_autorizado" });
        if (req.method === "GET" && req.url === "/api/painel/pedidos") {
          return json(res, 200, await banco.listarPedidosPara(quem));
        }
        const estagio = req.url.match(/^\/api\/painel\/pedidos\/([0-9a-f-]+)\/estagio$/i);
        if (req.method === "PATCH" && estagio) {
          const corpo = await lerCorpo(req);
          if (!estagioValido(corpo.estagio)) return json(res, 422, { erro: "estagio_invalido" });
          const pedido = await banco.alterarEstagioPara(quem, estagio[1], corpo.estagio);
          if (!pedido) return json(res, 404, { erro: "nao_encontrado" });
          return json(res, 200, { pedido });
        }
        const detalhe = req.url.match(/^\/api\/painel\/pedidos\/([0-9a-f-]+)$/i);
        if (req.method === "GET" && detalhe) {
          const pedido = await banco.pedidoPara(quem, detalhe[1]);
          if (!pedido) return json(res, 404, { erro: "nao_encontrado" });
          const historico = await banco.historicoEstagioPara(quem, detalhe[1]);
          return json(res, 200, { pedido, historico });
        }
      }
      if (req.method === "POST" && req.url === "/api/simular") {
        const { conta, cidade } = await lerCorpo(req);
        const agora = hoje();
        const dosNumeros = await numerosDe(agora);
        const sim = simular({ conta: lerConta(conta), cidade }, dosNumeros, agora);
        if (sim.erro === "fora_da_faixa") {
          const reais = (chave) => "R$ " + dosNumeros[chave].valor.toLocaleString("pt-BR");
          const faixa = `O simulador atende contas de ${reais("conta_minima")} a ${reais("conta_maxima")} por mês.`;
          const abaixo = lerConta(conta) < dosNumeros.conta_minima.valor;
          const motivo = abaixo ? `Para uma conta abaixo de ${reais("conta_minima")} por mês o sistema solar não compensa, então não calculamos nem pedimos o seu contato. ` : "";
          return json(res, 422, { erro: sim.erro, mensagem: motivo + faixa });
        }
        if (sim.erro) return json(res, 422, { erro: sim.erro, mensagem: MENSAGENS[sim.erro] });
        const id = await banco.guardarSimulacao(sim);
        return json(res, 200, { simulacao_id: id, ...sim.exibido });
      }
      if (req.method === "POST" && req.url === "/api/pedido") {
        const corpo = await lerCorpo(req);
        if (corpo.aceite_privacidade !== true) {
          return json(res, 422, {
            erro: "privacidade_nao_aceita",
            mensagem: MENSAGENS.privacidade_nao_aceita,
          });
        }
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
    const env = supabase.lerEnv();
    const limparRetencao = async () => {
      try {
        const removidos = await banco.limparRetencao(new Date());
        console.log(`retenção: ${removidos.pedidos} pedidos e ${removidos.simulacoes_sem_contato} simulações removidos`);
      } catch {
        console.error("Não foi possível executar a retenção automática.");
      }
    };
    await limparRetencao();
    const relogioRetencao = setInterval(limparRetencao, 24 * 60 * 60 * 1000);
    relogioRetencao.unref();
    criarServidor({
      banco,
      numeros: (hoje) => banco.numerosVigentes(hoje),
      donoToken: env.OWNER_ACCESS_TOKEN,
      acessos: {
        carlos: env.CARLOS_ACCESS_TOKEN,
        renata: env.RENATA_ACCESS_TOKEN,
        dono: env.OWNER_ACCESS_TOKEN,
      },
    }).listen(porta, () => console.log(`simulador em http://localhost:${porta} (números do dono, no Supabase)`));
  })();
}
