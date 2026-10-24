# SPEC — Simulador da Ravena Solar

## 1. Objetivo

Permitir que a dona de casa de Sorocaba, Votorantim, Itu ou Salto veja, só com o valor da conta de luz e a cidade, quanto economizaria com um sistema da Ravena, e que o vendedor da cidade dela use depois exatamente o mesmo número; funcionou se os pedidos de simulação detalhada chegarem com o que a pessoa viu, o vendedor gastar cerca de 2 minutos (hoje 20) por pedido, e o cliente não perguntar mais "por que o site disse outra coisa".

## 2. Entradas

| Entrada | Formato | Quem fornece | Se vier errada ou faltar |
|---|---|---|---|
| Valor da conta mensal | Reais, número positivo | Pessoa, no site | Vazio, texto, zero ou negativo: pede de novo. Fora da faixa configurada (inicial R$ 100 a R$ 2.000): explica o motivo e não calcula nem pede dados pessoais (acima = comércio/sistema grande, que não atendemos). |
| Cidade | Uma de 4: Sorocaba, Votorantim, Itu, Salto (lista fechada) | Pessoa | Sem cidade: não calcula. Outra cidade não existe como opção. |
| Nome | Texto livre | Pessoa, ao pedir simulação detalhada | Vazio: o pedido não é enviado. |
| WhatsApp | Telefone brasileiro com DDD | Pessoa, ao pedir | Inválido ou vazio: o pedido não é enviado. Mesmo WhatsApp com pedido nas últimas 24 h: não cria pedido novo, mostra "já recebemos". |
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
- Aviso de privacidade na tela do pedido: dados pedidos, para quê e por quanto tempo, com como pedir exclusão.

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

- Estas decisões foram delegadas pelo dono ("pode escolher"): corte descrito acima, critério de "não compensa" pelo retorno (limite 6 anos), retorno ano a ano com reajuste 0%, iluminação entra e bandeira não, retenção de 12 meses para pedidos que não fecharam (os que fecharam ficam enquanto houver relação comercial), kWh fora, faixa R$ 100–2.000, cidade herdada do simulador, números manuais com data e fonte, arredondamentos da seção 3.
- Ligação bifásica para todos (maioria das casas); o custo de disponibilidade vem do número configurado.
- Sistema dimensionado para cobrir o consumo, a partir de 115 kWh/kWp/mês (valor atual da planilha, editável); painel de 550 W.
- Preço por kWp entre R$ 2.300 e R$ 2.900, menor nos sistemas maiores, calibrado para dar cerca de R$ 16.300 em 6,4 kWp; as faixas exatas são do dono.
- O valor da conta tem iluminação pública descontada antes de virar kWh.
- Os valores públicos (tarifa, Fio B, disponibilidade, irradiação) não estão no brief; o dono os digita no primeiro uso, com data e fonte.
- A tarifa usada é a da CPFL Piratininga, a mesma nas quatro cidades.
- Vendedor e dono se identificam por acesso individual; o mecanismo é decisão de construção, não desta spec.
- Mesmo WhatsApp em 24 h conta como o mesmo pedido.
- Estágios podem ser mudados em qualquer ordem, inclusive voltando; o histórico fica guardado.
