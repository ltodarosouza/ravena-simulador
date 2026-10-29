# SPEC — Simulador da Ravena Solar

## 1. Objetivo

Permitir que a dona de casa de Sorocaba, Votorantim, Itu ou Salto veja, só com o valor da conta de luz e a cidade, quanto economizaria com um sistema da Ravena, e que o vendedor da cidade dela use depois exatamente o mesmo número; funcionou se os pedidos de simulação detalhada chegarem com o que a pessoa viu, o vendedor gastar cerca de 2 minutos (hoje 20) por pedido, e o cliente não perguntar mais "por que o site disse outra coisa".

## 2. Entradas

| Entrada | Formato | Quem fornece | Se vier errada ou faltar |
|---|---|---|---|
| Valor da conta mensal | Reais, número positivo, escrito como a pessoa escreve no Brasil ("R$ 1.234,56", "1234,56", "1.234" e "1234.56" valem; "1e3" e "1,2,3" não) | Pessoa, no site | Vazio, texto, zero ou negativo: pede de novo. Fora da faixa configurada (inicial R$ 100 a R$ 2.000): explica o motivo e não calcula nem pede dados pessoais (acima = comércio/sistema grande, que não atendemos). |
| Cidade | Uma de 4: Sorocaba, Votorantim, Itu, Salto (lista fechada) | Pessoa | Sem cidade: não calcula. Outra cidade não existe como opção. |
| Nome | Texto livre, até 100 caracteres | Pessoa, ao pedir simulação detalhada | Vazio, maior que 100 caracteres ou com CPF dentro: o pedido não é enviado. |
| WhatsApp | Telefone brasileiro com DDD | Pessoa, ao pedir | Inválido ou vazio: o pedido não é enviado. Mesmo WhatsApp com pedido nas últimas 24 h: não cria pedido novo, e a tela mostra a mesma resposta de pedido recebido, sem dizer que o número já tinha pedido. |
| O corpo de cada chamada ao servidor | JSON que seja um objeto, até 10 KB | Quem chama (a página ou qualquer outro) | Maior que o limite: recusado antes de ler tudo. Que não seja JSON de objeto, ou com identificador de simulação que não seja um identificador: recusado com erro de pedido malformado. Nunca vira erro interno. |
| Números de cálculo (tarifa CPFL Piratininga com ICMS e PIS/COFINS, iluminação pública por cidade, percentual do Fio B por ano, custo de disponibilidade por tipo de ligação, geração por kWp/mês, preço por kWp por faixa de tamanho, potência do painel, limite de retorno que define "não compensa", reajuste anual da tarifa, faixa de valor aceita, prazo de retenção) | Número + data de vigência + fonte | Só o dono, numa tela só dele | Vazio, zero, negativo ou implausível: recusa. Sem valor vigente para algum número: o simulador não responde e avisa em vez de usar valor velho. |
| Estágio do pedido | Chegou, respondi, visita marcada, proposta enviada, fechou, não vai | Vendedor da cidade (ou dono) | Estágio fora da lista: recusa. Toda mudança fica registrada (quem, quando). |

A cidade do pedido é a do simulador e não é pedida de novo.

## 3. Saídas

**Para a pessoa (site, sem login):**
- Tamanho do sistema: kWp com 1 casa decimal; número de painéis (inteiro, para cima).
- Investimento aproximado: R$ arredondado para a centena.
- Conta de luz depois: R$/mês, inteiro (inclui custo mínimo da distribuidora, Fio B sobre a energia compensada e iluminação pública).
- Economia por ano: R$ inteiro, no primeiro ano.
- Retorno: "X anos e Y meses", projetado ano a ano (Fio B sobe pelo cronograma da Lei 14.300; reajuste da tarifa padrão = 0%, para errar contra nós).
- Aviso curto: é estimativa, a proposta vem depois da visita técnica.
- Se o retorno passar do limite configurado (inicial: 6 anos) ou não houver retorno: mensagem clara de que não compensa e por quê, sem botão de pedir simulação.
- Aviso de privacidade na tela do pedido: dados pedidos, para quê e por quanto tempo, com como pedir exclusão; sem caixa pré-marcada.
- Se a conexão falhar ao simular ou ao enviar o pedido, a tela não mostra sucesso: explica que não foi possível concluir e orienta a tentar de novo.
- Os cálculos internos usam os valores sem arredondar; o arredondamento só vale na hora de mostrar, e o número que vai ao painel é o mesmo que a pessoa viu, já arredondado.

**Pedido (vai ao painel):** nome, WhatsApp, cidade, valor digitado, todos os resultados acima exatamente como mostrados, e os números usados no cálculo (cada um com valor, data e fonte). Nunca é recalculado depois.

**Quem vê o quê:** Carlos vê só pedidos de Sorocaba e Votorantim; Renata só Itu e Salto; o dono vê todos. Só o dono vê e edita os números, o histórico de mudanças deles e os dados de todos os pedidos. O painel funciona bem no celular.

## 4. Fora de escopo

- **Cortado das quatro coisas:** (a) anexo da foto/PDF da conta de luz, porque traz CPF, endereço e 12 meses de histórico, risco desproporcional; o vendedor continua pedindo pelo WhatsApp; (b) "refazer a simulação com dados certos" no painel; o vendedor consulta o que a pessoa viu e refaz fora do sistema.
- Consumo em kWh informado pela pessoa (quase ninguém sabe).
- Bandeira tarifária no cálculo (muda todo mês; mostrá-la como informação é opcional).
- Busca automática da tarifa na ANEEL (dependência externa).
- Financiamento, bateria, comércio acima de 75 kWp, cidades fora das quatro, proposta (três tamanhos, só depois da visita).
- Recálculo de pedidos antigos quando um número muda.
- Notificação ao vendedor, e-mail ou WhatsApp automático.

## 5. Premissas

- Decisões que o brief deixava em aberto e que esta spec fecha assim: corte descrito acima, critério de "não compensa" pelo retorno (limite 6 anos), retorno ano a ano com reajuste 0%, iluminação entra e bandeira não, retenção de 12 meses para pedidos que não fecharam (os que fecharam ficam enquanto houver relação comercial), kWh fora, faixa R$ 100–2.000, cidade herdada do simulador, números manuais com data e fonte, arredondamentos da seção 3.
- Ligação bifásica para todos (maioria das casas); o custo de disponibilidade vem do número configurado.
- Sistema dimensionado para cobrir o consumo, a partir de 115 kWh/kWp/mês (valor atual da planilha, editável); painel de 550 W.
- Preço por kWp entre R$ 2.300 e R$ 2.900, menor nos sistemas maiores, calibrado para dar cerca de R$ 16.300 em 6,4 kWp; as faixas exatas são do dono.
- O valor da conta tem iluminação pública descontada antes de virar kWh.
- Os valores públicos (tarifa, Fio B, disponibilidade, irradiação) não estão no brief; o dono os digita no primeiro uso, com data e fonte.
- A tarifa usada é a da CPFL Piratininga, a mesma nas quatro cidades.
- Vendedor e dono se identificam por acesso individual; o mecanismo é decisão de construção, não desta spec.
- O simulador usa o mesmo banco da landing (P1): o pedido é uma linha da tabela de simulações da P1, e a pessoa é o lead dela. A P1 exigia conta de R$ 450 ou mais também no banco; o simulador atende de R$ 100, e a faixa é número do dono, então o banco só exige conta positiva. A regra dos R$ 450 continua na própria página da landing, que é quem a aplica.
- Números de teste nunca respondem a uma pessoa de verdade: o simulador lê os números do banco, e sem número vigente ele recusa.
- Mesmo WhatsApp em 24 h conta como o mesmo pedido.
- O sistema não prova que o WhatsApp é de quem pede (pergunta 4 da seção 11). O limite de pedidos por origem depende de onde o sistema for hospedado e fica para quando a hospedagem existir (pergunta 5).
- Estágios podem ser mudados em qualquer ordem, inclusive voltando; o histórico fica guardado.
- Retenção, decidida em 2026-10-29: pedido que não fechou, 12 meses; pedido que fechou, enquanto houver relação comercial; simulação de quem não pediu contato (sem nome nem WhatsApp), 30 dias. Quem pede exclusão tem apagados o lead e todas as simulações dele; não sobra nada ligado a ela.
- A regra de acesso (C4) mora na própria consulta ao banco: a pergunta é feita em nome de quem pergunta (dono, vendedor com as suas cidades, ou ninguém), e quem não pode ver recebe a mesma resposta de um pedido que nunca existiu. Ela é testada no banco, antes de o painel existir; o painel depois chama a mesma consulta.

## 6. Critérios de aceitação

Cada critério diz o estado de partida (Dado), a ação (Quando) e o resultado que se consulta (Então). Os números do "Dado" são os congelados num arquivo de referência, criado na primeira fatia; o dono editar um número no painel não muda o critério.

**C1. Caso de referência: conta de R$ 600 em Sorocaba.** Dado os números congelados (tarifa, Fio B do ano, 115 kWh/kWp/mês, preço por kWp da faixa, painel de 550 W), quando a pessoa simula R$ 600 em Sorocaba, então o simulador mostra kWp com 1 casa, painéis, investimento na centena, conta depois, economia do primeiro ano e retorno em anos e meses, e esse retorno é maior ou igual a 3 anos. Esse 3 é o **piso da promessa** que o brief atribui à planilha ("entre três e quatro anos"), e não o que a planilha calcula: a conta do brief aplicada à letra (R$ 0,95 por kWh, 115 kWh/kWp/mês, retorno = investimento ÷ economia do primeiro ano) dá cerca de 2 anos. Se o simulador der menos que 3 anos, reprova. Este critério só vale com os números do dono, com data e fonte: com números de teste o resultado não diz nada sobre a promessa, e por isso o teste fica pendente até o dono cadastrá-los. Quando o dono responder a pergunta da seção 11, o 3 é trocado pelo número da planilha dele. O mesmo vale para R$ 450 e R$ 1.800, porque o Fio B e o custo de disponibilidade pesam mais numa conta pequena do que numa grande.

**C2. Conta baixa ouve que não compensa.** Dado uma conta de R$ 200 em qualquer das quatro cidades, quando a pessoa simula, então a tela diz que não compensa e por quê, não mostra botão de pedir simulação e nenhum dado pessoal é pedido. Se, com os números congelados, o retorno de R$ 200 não passar do limite de 6 anos, é o limite ou a faixa mínima desta spec que está errada, e se muda aqui antes do código.

**C3. O pedido guarda o que a pessoa viu.** Dado uma simulação de R$ 600 em Sorocaba na tela, quando a pessoa envia nome e WhatsApp válidos, então o banco tem um pedido com o valor digitado, a cidade, todos os resultados exatamente como mostrados (já arredondados) e cada número usado com valor, data e fonte. Dado o mesmo WhatsApp com pedido nas últimas 24 h, quando ele envia de novo, então não nasce pedido novo e a resposta é idêntica à de um pedido novo: a tela não revela que o número já pediu.

Dado uma falha de conexão ao simular ou enviar o pedido, quando a chamada não recebe resposta, então a tela mostra que não foi possível concluir e orienta a tentar de novo; nunca mostra nem sugere que o pedido foi recebido.

**C4. Um vendedor não vê o lead do outro.** Dado o Carlos logado, quando ele abre o endereço direto de um pedido de Itu (copiado da tela da Renata, por exemplo), então não vê o pedido. O mesmo vale para a Renata com um pedido de Sorocaba. O dono abre os dois.

**C5. Dado pessoal onde não deve.** Dado um pedido enviado com um CPF válido digitado no campo nome, quando a pessoa envia, então o pedido é recusado com a mensagem de que só o nome é pedido, e o CPF não aparece em nenhuma tabela nem log. Vale para qualquer jeito de escrever os algarismos (inclusive os de largura total e de outros alfabetos).

**C6. Número do dono.** Dado um número de cálculo vazio, zero, negativo ou implausível, quando o dono tenta salvar, então a tela recusa e explica. Dado um número sem valor vigente, quando alguém simula, então o simulador não responde e avisa, em vez de usar valor velho. O mesmo vale para o pedido: sem número vigente, nenhum pedido é gravado, mesmo de uma simulação feita antes de o número sair.

**C7. Painel no celular.** Dado o Carlos logado num celular de 390 px de largura, quando ele abre a lista e muda o estágio de um pedido de Sorocaba, então não há rolagem horizontal, a lista aparece em até 3 segundos em 4G, os botões têm pelo menos 44 px de altura e a mudança leva até 3 toques; o histórico mostra quem mudou e quando.

## 7. Restrições

- **Técnica:** o painel funciona no celular do vendedor, e "funciona" quer dizer: numa tela de 390 px de largura não há rolagem horizontal, a lista de pedidos abre em até 3 segundos numa conexão 4G, os botões têm pelo menos 44 px de altura e o vendedor muda o estágio de um pedido em até 3 toques a partir da lista (C7). A stack e o mecanismo de acesso são decisão de construção, desde que respeitem as restrições de custo e o critério C4.
- **De dado:** todo número de cálculo tem valor, data de vigência e fonte; sem valor vigente o simulador não responde. Os cálculos internos usam os valores sem arredondar, e o arredondamento só vale na hora de mostrar.
- **De tempo:** o brief não dá prazo. O que precisa estar no ar primeiro é a fatia vertical da seção 8, e nenhuma fatia começa antes de a anterior passar nos seus critérios.
- **Legal:** os únicos dados pessoais que o sistema pede são nome e WhatsApp (mais a cidade, que vem do simulador). Nada de foto ou PDF da conta. O sistema não guarda CPF, endereço, número da instalação nem anexo, em nenhuma tabela, log ou arquivo (C5). O pedido tem aviso de privacidade sem caixa pré-marcada, retenção de 12 meses para os que não fecharam e pedido de exclusão. O README lista todo dado pessoal que o sistema guarda e o que faz com cada um.
- **De custo:** só serviços com plano gratuito que cubra 27 pedidos por mês e três usuários no painel; qualquer coisa paga precisa de aprovação do dono antes.

## 8. Ordem de construção

A ordem é por risco, que é a chance de dar errado vezes o custo de dar errado.

1. **Fatia vertical:** R$ 600 em Sorocaba, da tela até o pedido gravado no banco, com os números lidos do banco e a recusa de calcular enquanto o dono não os cadastrar (C6). Os números congelados só existem nos testes. Vem primeiro porque é onde a conta pode divergir da planilha sem ninguém notar, e atravessa até o banco para provar que o pedido guarda o que a pessoa viu (C1, C3, C6).
2. **Aviso de privacidade e regra de dado pessoal:** o pedido já grava dados pessoais depois da fatia 1, então não pode ir ao ar sem eles (C5).
3. **Tela de não compensa:** é o caso comum de conta baixa, e o custo de errar é confiança: a pessoa recebe uma simulação bonita e some (C2).
4. **Tela de números do dono:** a chance de erro é baixa porque só o dono mexe, mas o custo é o maior, porque um número errado publicado vale para todos os pedidos de uma vez (C6).
5. **Painel:** isolamento entre Carlos e Renata, estágios com histórico, retenção e exclusão. Vazar lead entre vendedores e guardar dado sem prazo são riscos legais e de confiança (C4).
6. **Outras três cidades e o resto:** só fazem sentido com as anteriores prontas.

## 9. Verificação ponta a ponta

Alguém abre a página, digita R$ 600, escolhe Sorocaba e vê o resultado. Pede a simulação detalhada com nome e WhatsApp válidos, marca a caixa do aviso (que vem desmarcada) e envia. Confere no banco que o pedido tem os mesmos valores que a tela mostrou e os números usados. Loga como Carlos, vê o pedido, abre o endereço direto de um pedido de Itu e não o vê. Repete com R$ 200 e vê "não compensa" sem botão. Qualquer passo que não dê o esperado reprova. Cada fatia roda o trecho que já existe dessa sequência.

## 10. Regra de mudança

Se uma decisão muda no meio da construção, a spec muda antes do código, e confere-se que a decisão nova ainda fecha com o resto da spec antes de pedir o ajuste ao agente.

## 11. Perguntas abertas ao dono

1. Quanto a planilha do Carlos dá de retorno para uma conta de R$ 600 em Sorocaba, em anos e meses?
2. Como a planilha chega na economia do primeiro ano? O brief diz que ela ignora bandeira, Fio B e iluminação, mas a conta descrita dá cerca de 2 anos, não os 3 a 4 que ele diz prometer.
3. **Conflito do C2 (achado pela revisão adversarial).** Com os números de teste, R$ 200 dá retorno de 4 anos e 2 meses, que **não** passa do limite de 6 anos, então a tela não diz "não compensa" para a conta que o brief cita. Só R$ 100 chega lá (8 anos e 6 meses). O C2 manda: se isso acontecer, o limite ou a faixa mínima da spec está errado e se muda aqui antes do código. Qual muda: o limite de retorno (por exemplo, 4 anos), a faixa mínima, ou os números de teste não valem e a resposta sai dos números oficiais?
4. **Prova de que o WhatsApp é de quem pede (achado 2 da revisão de segurança).** Hoje qualquer pessoa pode pedir com o número de outra e travar o pedido verdadeiro dela por 24 h; a resposta já não revela quem pediu, mas o bloqueio continua. Confirmar o número (por exemplo, o vendedor confirma por mensagem antes de contar o pedido) ou aceitar o risco para 27 pedidos por mês?
5. **Limite de pedidos por origem (achado 1 da revisão de segurança).** Cada simulação grava uma linha, e quem repetir a chamada enche o banco que a landing também usa. O corpo já tem teto; o limite por origem depende da hospedagem. Qual será ela, e qual limite o dono aceita?
