Leia o `brief.md` desta pasta, inteiro, antes de qualquer pergunta.

Você vai me entrevistar para escrever a spec de um simulador para a Ravena Solar. **Não construa nada**: nenhum código, nenhum esqueleto, nenhuma pasta, nenhum arquivo além do `SPEC.md` no final.

Como conduzir:

- Uma pergunta por vez, e espere a minha resposta antes da próxima.
- Pergunte só o que o brief deixa em aberto e muda o que o sistema faz: as decisões. Não pergunte o que o brief já responde.
- Em cada pergunta, mostre as opções, diga qual você recomendaria e por quê, mas a decisão é minha.
- Se eu disser que não sei, registre como premissa, dizendo o que foi assumido.
- Continue até cobrir o que importa: o que entra e o que sai, a conta e de onde vêm os números, quem vê o quê, dado pessoal, e o que fica de fora (o brief diz que são no máximo quatro coisas e que, se não couber, eu corte e diga o que cortei).
- Quando eu disser que acabou, escreva o `SPEC.md`.

O `SPEC.md` tem cinco partes, numa página só:

1. **Objetivo**, em uma frase: o que o sistema faz, para quem, e que mudança no mundo prova que funcionou.
2. **Entradas**: tudo o que entra e de onde vem (o que a pessoa digita, o que vem de fora, o que alguém configura). Para cada uma: formato, quem fornece e o que acontece se vier errada ou faltar.
3. **Saídas**: o que o sistema devolve e para quem, com campos, unidade e arredondamento, e quem vê cada coisa.
4. **Fora de escopo**: o que não vai existir, com o motivo, incluindo o que foi cortado das quatro coisas.
5. **Premissas**: o que eu assumi para poder decidir e o brief não diz.

Não fale de stack, banco, nome de tabela nem componente: a spec diz o que o sistema é, não como se constrói.
