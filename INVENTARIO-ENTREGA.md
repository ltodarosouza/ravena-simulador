# Inventário da entrega da P2

Decisão de escopo de 2026-10-29. O agente escolheu o recorte a pedido do Lucas, e o Lucas concordou com a escolha antes de ela ser registrada.

## O que o brief pede

- Uma pessoa informa o valor da conta de luz e escolhe Sorocaba, Votorantim, Itu ou Salto.
- O sistema mostra tamanho, painéis, investimento, conta depois, economia anual e retorno.
- Quando compensa, a pessoa pode pedir uma simulação detalhada com nome e WhatsApp.
- O pedido guarda exatamente os números mostrados para a pessoa.
- Carlos vê Sorocaba e Votorantim, Renata vê Itu e Salto e o dono vê tudo.
- O vendedor acompanha o estágio do pedido, com histórico.
- O dono cadastra os números usados no cálculo, com data e fonte.
- O sistema protege os dados pessoais, funciona no celular e usa o mesmo banco da landing.

## O que já existe

- Página pública única com conta de luz, quatro cidades, resultado e pedido de contato.
- Entrada de dinheiro no formato brasileiro e validações de conta, cidade, nome e WhatsApp.
- Cálculo com números vigentes do banco, recusa quando eles faltam e mensagem de “não compensa”.
- Pedido com a cópia dos resultados vistos e dos números usados.
- Regra de acesso no banco para Carlos, Renata e dono, ainda sem painel.
- Proteções contra CPF, corpo grande, pedido malformado, duplicidade em 24 horas e sucesso falso numa falha de conexão.
- Banco compartilhado com a landing, migrações e testes locais: 55 passam, nenhum falha e 1 depende dos números oficiais.

## O que ainda vai entrar

- Aviso de privacidade e aceite desmarcado antes de enviar nome e WhatsApp.
- Números oficiais com fonte e data, fechamento das dúvidas de cálculo e execução do critério hoje pendente.
- Tela do dono para consultar e editar os números, com validação e histórico.
- Acesso individual e painel móvel dos vendedores, com lista, detalhe, mudança de estágio e histórico.
- Retenção automática, exclusão de dados e limpeza das simulações sem pedido.
- Proteção contra volume abusivo definida de acordo com a hospedagem escolhida.
- Verificação ponta a ponta, atualização final do README e publicação somente depois da autorização do Lucas.

## O que fica de fora e por quê

- Foto ou PDF da conta: expõe CPF, endereço e histórico sem ser necessário para calcular.
- Refazer a simulação no painel: o vendedor só precisa consultar o que a pessoa viu e pode refazer fora do sistema.
- Consumo em kWh informado pela pessoa: a maioria não sabe esse número.
- Bandeira tarifária e busca automática na ANEEL: mudam com frequência e aumentam a dependência externa.
- Financiamento, bateria, comércio acima de 75 kWp e cidades fora das quatro: ampliam o produto além do público definido.
- Proposta com três tamanhos: só acontece depois da visita técnica.
- Recálculo de pedidos antigos: cada pedido precisa preservar o número que a pessoa viu.
- Notificação automática por e-mail ou WhatsApp: não é necessária para o fluxo principal desta entrega.
