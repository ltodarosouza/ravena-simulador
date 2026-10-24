# Hipótese: "1e3" como valor da conta

Escrita em 2026-10-24 11:25:57, antes de rodar qualquer entrada nova e antes de pedir qualquer correção.

**Hipótese.** O "1e3" aceito como R$ 1.000 era a mesma causa do "R$ 1.234,56" recusado: o servidor lia o texto com `Number()`,
que entende notação científica (1e3), hexadecimal (0x10) e "Infinity", e só entende o ponto como decimal.
Desde o commit ce6a5de o servidor não usa mais `Number()` no texto: `lerConta` só aceita três formatos por expressão regular.
Por isso eu **prevejo que hoje todas estas entradas são recusadas com 422 `conta_invalida`**, e nenhuma devolve simulação:
"1e3", "1E3", "0x10", "Infinity", "1_000".

**O que mais passaria pela mesma causa.** Qualquer outro lugar que converta texto em número com `Number()`/`parseFloat()`.

**Como eu saberia que estou errado.** Se alguma das cinco entradas devolver 200 com uma simulação, a hipótese cai e o "1e3" ainda é um bug.
