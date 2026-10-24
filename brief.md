# Brief da P2 — Ravena Solar, o simulador

> Cliente fictício da 202, o mesmo da P1. A empresa não existe; os números são plausíveis e consistentes com o brief anterior, e você deve tratá-los como se fossem reais. O que é dado público de verdade (tarifa, bandeira, irradiação, a regra de compensação) você busca na fonte, não aqui.

## O pedido

A página nova está no ar há dois meses e funcionou: saímos de 12 para 27 pedidos de simulação por mês, e caiu a quantidade de gente com conta baixa. Agora o gargalo mudou de lugar. Cada pedido vira vinte minutos de planilha na mão do vendedor, e quatro em cada dez pessoas que recebem a simulação somem sem responder. A gente acha que elas queriam só ver um número, e não conversar com vendedor.

Queremos um simulador. A pessoa entra, diz quanto paga de luz, vê quanto ficaria com sistema nosso, e se quiser ir adiante pede a simulação detalhada. E o vendedor para de fazer conta na planilha: o número que a pessoa viu no site tem que ser o mesmo que o vendedor usa depois, saído da mesma conta, porque hoje o site diz uma coisa, a planilha diz outra, e o cliente pergunta por quê.

## Quatro coisas, no máximo

Se não couber tudo, corte e me diga o que cortou. Prefiro três funcionando a quatro pela metade.

**1. O simulador, aberto para qualquer um.** Entrada: quanto a pessoa paga de luz por mês, em reais, e em qual das nossas quatro cidades ela mora. Se ela souber o consumo em kWh, melhor, mas quase ninguém sabe; o que ela sabe é o valor. Saída: o tamanho do sistema que a gente instalaria, o investimento aproximado, quanto ficaria a conta depois, quanto ela economiza por ano e em quanto tempo o sistema se paga. A conta de como isso é calculado está mais abaixo.

**2. O pedido de simulação detalhada, saindo do resultado.** Quem viu o número e quer ir adiante deixa nome, WhatsApp e cidade, e pode anexar a foto ou o PDF da conta. O pedido chega para nós **com o que a pessoa viu**: o que ela digitou, o que o simulador respondeu e com que números ele calculou. Isso é importante: o cliente liga depois dizendo "no site estava R$ 118", e o vendedor precisa saber por que estava.

**3. O painel do vendedor.** Somos dois vendedores. O Carlos atende Sorocaba e Votorantim; a Renata atende Itu e Salto. Cada um vê os pedidos das suas cidades e só os seus — já tivemos briga por lead e não quero de novo. Eu vejo tudo. No painel o vendedor marca em que pé está cada pedido (chegou, respondi, visita marcada, proposta enviada, fechou, não vai) e pode refazer a simulação com os dados certos depois de ver a conta de luz da pessoa, pela mesma conta do site.

**4. Os números, sem chamar programador.** A tarifa muda todo ano, a bandeira muda todo mês, o percentual do Fio B sobe todo janeiro e o preço do painel cai. Quero mudar esses números eu mesmo, num lugar que só eu acesso, e que o simulador passe a usar os novos na hora.

## Como a gente faz a conta hoje

A planilha do Carlos, que ele usa há três anos, faz assim:

- **Consumo.** Valor da conta dividido pelo preço do kWh com impostos. O Carlos usa R$ 0,95 por kWh, que era o que dava na conta dele ano passado. O preço certo é o da CPFL Piratininga, homologado pela ANEEL, com ICMS de São Paulo e PIS/COFINS em cima; está publicado.
- **Tamanho do sistema.** Consumo mensal dividido pelo que um kWp gera por mês aqui na região. A gente usa 115 kWh por kWp por mês, e bate com o que os sistemas instalados produzem na média do ano. Isso vem da irradiação de Sorocaba, que o INPE e o CRESESB publicam, vezes um fator de perda que o setor assume entre 75% e 80%. Painel de 550 W; o número de painéis é o tamanho dividido por 0,55, arredondado para cima.
- **Investimento.** Entre R$ 2.300 e R$ 2.900 por kWp instalado, mais barato quanto maior o sistema. É o que fecha com o nosso ticket médio de R$ 16.300 num sistema de 6,4 kWp. O simulador usa o nosso preço, não o de kit de marketplace, que não inclui projeto, homologação nem instalação.
- **Conta depois.** Aqui a planilha é fraca, e é o que mais dá discussão. A conta nunca zera: a distribuidora cobra um mínimo pelo tipo de ligação (a maioria das casas aqui é bifásica), e desde a Lei 14.300 cobra uma parte do fio sobre a energia que a gente injeta e compensa — um percentual que sobe a cada ano até 2029. O Carlos ignora a bandeira na planilha, e a Renata acha errado, porque em mês de bandeira vermelha a pessoa vê a conta subir e a economia é maior. Também tem a taxa de iluminação pública, que é por cidade e a gente sempre ignorou.
- **Retorno.** Investimento dividido pela economia do primeiro ano. Dá entre três e quatro anos, e é o que a gente fala. O que a planilha não faz: a tarifa reajusta todo ano, o Fio B sobe todo ano, e a economia do quinto ano não é a do primeiro. Não quero que o simulador prometa menos tempo de retorno do que a planilha promete hoje. Se for para errar, erra contra nós.

Não vou dizer como o simulador tem que fazer essa conta. Estou dizendo como a gente faz e onde a gente sabe que está fraco.

## Quem usa

- **A pessoa no site.** A mesma da P1: dona da casa, conta acima de R$ 450, cética, pedindo três orçamentos. Ela não sabe o que é kWp, kWh, Fio B nem bandeira, e não pode precisar saber para usar o simulador. Ela sabe quanto paga.
- **Quem tem conta baixa.** Continua chegando gente com conta de R$ 200. Essa pessoa tem que ouvir de nós, com todas as letras, que não compensa e por quê. Não pode receber uma simulação bonita nem um formulário que a deixa esperando resposta.
- **O Carlos e a Renata.** Usam o painel no celular, entre uma visita e outra. Vinte minutos de planilha por lead hoje; quero que vire dois.
- **Eu.** Vejo tudo e mexo nos números. Não quero mexer em mais nada.

## O que temos de dado

- A página da P1, que já está no ar, com o formulário que hoje guarda o pedido de simulação. O simulador pode entrar na página ou morar ao lado dela com a página apontando para ele; você decide, mas o botão que a pessoa clica hoje tem que levar ao simulador.
- Os dados que o formulário da P1 já guarda: nome, WhatsApp, cidade, valor da conta. Continuam.
- A foto da conta de luz, quando a pessoa anexa. Ela tem o nome completo, o endereço, o CPF, o número da instalação e o histórico de consumo de doze meses. Hoje ela fica no WhatsApp do vendedor. A gente gostaria de guardar tudo o que der, nunca se sabe o que vai precisar.
- Os números públicos: tarifa homologada da CPFL Piratininga, bandeira do mês, cronograma do Fio B da Lei 14.300, custo de disponibilidade por tipo de ligação, irradiação da região. Tudo isso está publicado pela ANEEL (que tem uma base de dados abertos com as tarifas e as bandeiras), pelo INPE ou pelo CRESESB. Não vou te passar os valores: quero que o sistema use o valor certo, com a data, e eu mesmo não sei de cor.

## O que não entra

Financiamento não entra: os dois bancos mudam taxa todo mês e a simulação de parcela é conversa de vendedor. Bateria, comércio acima de 75 kWp e cidade fora do raio continuam não existindo. E o simulador não faz proposta: proposta tem três tamanhos de sistema e é feita depois da visita técnica.

## O que você entrega

O sistema no ar e o repositório público. Dentro dele: a spec com o que você decidiu antes de construir, os testes onde errar custa dinheiro, a revisão adversarial que você rodou e o que fez com ela, e um README com as decisões, o que ficou de fora e por quê, e a lista de todo dado pessoal que o sistema guarda e o que faz com cada um.
