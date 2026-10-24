# Fatia 2: aviso de privacidade e regra de dado pessoal

Lista de cenários, em português, antes de qualquer código. Rascunho escrito pelo agente. O Lucas leu e decidiu os itens 6 e 8; o resto ele deixou como está.
Cada cenário diz o que acontece, incluindo as bordas. O ponto de partida é o C5 e a seção 3 da spec (aviso de privacidade).

## Dado pessoal onde não deve (C5)

1. **CPF válido no campo nome é recusado.** O pedido não é enviado, a pessoa vê que só o nome é pedido, e o CPF não entra em nenhuma tabela nem log. *(cenário escolhido para o primeiro ciclo)*
2. **O CPF escondido em outro formato também é recusado:** só dígitos, com pontos e traço, no meio de uma frase ("meu cpf é ..."), separado por espaços.
3. **Nome normal continua passando:** "Maria Souza" cria o pedido como antes.
4. **Onze dígitos que não fecham como CPF** (dígitos verificadores errados) não são tratados como CPF.
5. **Nada é gravado quando recusa:** nem pedido, nem pessoa (lead), nem o CPF em texto de erro ou log.
6. **CPF válido no campo WhatsApp é recusado como "isso não é um telefone"** e não é gravado. *(decisão do Lucas, que leu a lista: CPF nunca pode passar por telefone. Hoje o código aceita: o CPF 529.982.247-25, só com dígitos, tem 11 dígitos e o terceiro é 9, então passa como celular com DDD 52. É um cenário que vai começar vermelho.)*
7. **O WhatsApp aceita o código do país só se for o do Brasil:** "+55 (15) 99876-5432" e "5515998765432" valem como 15998765432; número de outro país é recusado (a spec pede telefone brasileiro com DDD).
8. **O DDD não é comparado com a cidade escolhida.** *(decisão do Lucas: a pessoa pode ter um número de outro lugar, então essa checagem recusaria cliente de verdade.)*

## Aviso de privacidade na tela do pedido (seção 3 da spec)

9. **O aviso diz o que pede, para quê, por quanto tempo e como pedir exclusão:** nome e WhatsApp, para o vendedor da cidade retornar, 12 meses para quem não fechar, e um jeito de pedir exclusão.
10. **A caixa de aceite vem desmarcada.**
11. **Sem marcar a caixa o pedido não é enviado.** *(a spec não diz se a caixa é obrigatória; assumo que sim, a confirmar)*
12. **O servidor também recusa pedido sem aceite**, mesmo que alguém pule a tela.
