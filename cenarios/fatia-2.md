# Fatia 2: aviso de privacidade e regra de dado pessoal

Lista de cenários, em português, antes de qualquer código. Rascunho escrito para o Lucas revisar: ele corta, troca ou acrescenta.
Cada cenário diz o que acontece, incluindo as bordas. O ponto de partida é o C5 e a seção 3 da spec (aviso de privacidade).

## Dado pessoal onde não deve (C5)

1. **CPF válido no campo nome é recusado.** O pedido não é enviado, a pessoa vê que só o nome é pedido, e o CPF não entra em nenhuma tabela nem log. *(cenário escolhido para o primeiro ciclo)*
2. **O CPF escondido em outro formato também é recusado:** só dígitos, com pontos e traço, no meio de uma frase ("meu cpf é ..."), separado por espaços.
3. **Nome normal continua passando:** "Maria Souza" cria o pedido como antes.
4. **Onze dígitos que não fecham como CPF** (dígitos verificadores errados) não são tratados como CPF.
5. **Nada é gravado quando recusa:** nem pedido, nem pessoa (lead), nem o CPF em texto de erro ou log.
6. **Limite conhecido:** um CPF digitado no campo WhatsApp não é detectado como CPF (só falha se o telefone for inválido). Fica anotado, sem teste agora.

## Aviso de privacidade na tela do pedido (seção 3 da spec)

7. **O aviso diz o que pede, para quê, por quanto tempo e como pedir exclusão:** nome e WhatsApp, para o vendedor da cidade retornar, 12 meses para quem não fechar, e um jeito de pedir exclusão.
8. **A caixa de aceite vem desmarcada.**
9. **Sem marcar a caixa o pedido não é enviado.** *(a spec não diz se a caixa é obrigatória; assumo que sim, a confirmar)*
10. **O servidor também recusa pedido sem aceite**, mesmo que alguém pule a tela.
