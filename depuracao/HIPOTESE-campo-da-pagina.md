# Hipótese: a página não deixa "R$ 1.234,56" chegar ao simulador

Escrita em 2026-10-24 11:28:45, antes de mexer em qualquer arquivo e antes de rodar qualquer entrada nova.
Commitada logo depois de escrita, para o git mostrar que veio antes da correção.

**Sintoma.** Quem digita "1.234,56", "1234,56" ou "R$ 1.234,56" no campo da conta, na página, ouve
"Digite o valor da conta em reais", mesmo tendo digitado um valor. Pela API, o servidor aceita esses mesmos textos (commit ce6a5de).

**Hipótese.** A causa é o **tipo do campo**, não o servidor. O campo da conta (`#conta` em `public/index.html`) é `type="number"`.
O navegador sanitiza um campo desse tipo: tudo que não é um número com ponto decimal ("1234.56") vira valor vazio ("").
A página então manda `conta: ""` ao servidor, e o servidor responde `conta_invalida`, que é o comportamento certo para um campo vazio.
O texto que a pessoa digitou nunca chega ao servidor.

**O que eu prevejo, e que posso conferir sem mudar nada:**
1. Na página, com o campo como está, o corpo do pedido enviado a `/api/simular` para "1.234,56" traz `conta: ""`.
2. Num campo `type="text"` com `inputmode="decimal"` (teclado numérico no celular), o mesmo texto chega intacto ao servidor.
3. O mesmo texto, enviado direto à API, dá 200 (já confirmado no teste do commit ce6a5de).

**Como eu saberia que estou errado.** Se o corpo enviado pela página para "1.234,56" já trouxer o texto inteiro, a causa não é o campo
e eu procuro no código da página (`public/index.html`, a função que lê o campo e monta o pedido).

**Limite do que já medi.** A medida anterior do campo foi feita com o navegador em en-US. Num navegador em português, "1234,56" pode ser
aceito pelo campo numérico; "1.234,56" e "R$ 1.234,56" provavelmente continuam sendo descartados. Isso eu ainda não testei, e a correção
precisa valer nos dois casos.

**O que NÃO vou fazer antes da tutora ler:** mexer no campo, no servidor ou nos testes.
