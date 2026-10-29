function dataValida(texto) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(texto || ""))) return false;
  const [ano, mes, dia] = texto.split("-").map(Number);
  const data = new Date(Date.UTC(ano, mes - 1, dia));
  return data.getUTCFullYear() === ano && data.getUTCMonth() === mes - 1 && data.getUTCDate() === dia;
}

function validarTarifa({ valor, vigencia, fonte } = {}) {
  if (typeof valor !== "number" || !Number.isFinite(valor) || valor <= 0) {
    return { erro: "numero_invalido" };
  }
  if (!dataValida(vigencia)) return { erro: "vigencia_invalida" };
  const fonteLimpa = String(fonte || "").trim();
  if (fonteLimpa.length < 3) return { erro: "fonte_invalida" };
  return { valor, vigencia, fonte: fonteLimpa };
}

module.exports = { validarTarifa };
