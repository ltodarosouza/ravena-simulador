// Quem pode ver o pedido de qual cidade (C4). Os vendedores e as cidades deles vêm do brief.
// A consulta ao banco usa isto no próprio WHERE: quem não pode ver recebe o mesmo que um pedido que não existe.
const VENDEDORES = {
  carlos: ["Sorocaba", "Votorantim"],
  renata: ["Itu", "Salto"],
};

// null = todas as cidades (o dono). Lista vazia = nenhuma (quem não se identificou, ou não é conhecido).
function cidadesVisiveis(quem) {
  if (!quem || typeof quem !== "object") return [];
  if (quem.papel === "dono") return null;
  if (quem.papel === "vendedor" && Object.hasOwn(VENDEDORES, quem.nome)) return VENDEDORES[quem.nome];
  return [];
}

module.exports = { cidadesVisiveis, VENDEDORES };
