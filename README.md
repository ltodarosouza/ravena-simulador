# Simulador da Ravena Solar (P2)

Simulador de economia com energia solar para a Ravena Solar (cliente fictício da trilha 202). A pessoa digita quanto paga de luz e a cidade, vê quanto economizaria, e se quiser pede a simulação detalhada. O vendedor usa depois o mesmo número que ela viu.

A spec é o contrato: [`SPEC.md`](SPEC.md). O pedido do cliente: [`brief.md`](brief.md).

## Estado hoje (o que existe e o que não existe)

| Pedaço (ordem da spec, seção 8) | Estado |
|---|---|
| Fatia 1: conta de R$ 600 em Sorocaba até o pedido gravado | **Feita.** Pedido grava o que a pessoa viu e os números usados. |
| Fatia 2: dado pessoal | **Meio feita.** CPF no nome e no WhatsApp é recusado. **Falta** o aviso de privacidade e a caixa de aceite. |
| Fatia 3: tela de não compensa | **Mecanismo feito.** Servidor recusa o pedido e a página esconde o formulário. Ver "Conflito do C2" abaixo. |
| Fatia 4: tela de números do dono | **Não feita.** Os números moram numa tabela e entram por script. O simulador recusa número zerado ou implausível. |
| Fatia 5: painel do vendedor, estágios, retenção, exclusão | **Não feita.** |
| Fatia 6: outras cidades e o resto | A conta já aceita as quatro cidades. O resto, não. |

**Nada disto está publicado.** O simulador só roda na máquina de quem constrói.

O critério C1 (retorno de R$ 600 em Sorocaba não menor que 3 anos) está **pendente**: faltam quatro números de fonte pública (tarifa com impostos, Fio B em reais por kWh, iluminação pública por cidade, faixas de preço). Os números de `referencia/numeros.json` são **de teste** e só servem nos testes. Ver [`SPEC.md`](SPEC.md), seção 11.

## Como rodar

```bash
npm install
npm test                          # banco de teste local (PGlite), sem chave nenhuma
TESTAR_NO_SUPABASE=1 npm test     # também roda o C3 no Supabase de verdade (cria e apaga linhas de teste)
npm start                         # precisa de SUPABASE_URL e SUPABASE_SECRET_KEY no .env.local
```

O servidor só responde com números cadastrados na tabela `numeros_calculo`, com data de vigência e fonte. Sem número vigente, ele avisa e não calcula.

## Decisões

- **O mesmo banco da landing (P1).** O pedido é uma linha de `simulacoes`, e a pessoa é um `lead`. O mínimo de R$ 450 saiu do banco; a faixa (R$ 100 a R$ 2.000) é número cadastrado. A regra de R$ 450 continua só na página da landing.
- **Números do dono, nunca de teste.** Os de teste ficam só nos testes.
- **Valor da conta no jeito brasileiro** ("R$ 1.234,56", "1234,56", "1.234"); notação científica é recusada. O campo da página é texto com teclado numérico.
- **Um CPF nunca entra:** nem no campo nome, nem no campo WhatsApp (11 dígitos que fecham como CPF). Custo conhecido: cerca de 1 em cada 100 celulares fecha como CPF por acaso e é recusado com a mensagem de digitar o WhatsApp com DDD.
- **O DDD não é comparado com a cidade:** a pessoa pode ter número de outro lugar.
- **Mesmo WhatsApp em 24 horas é o mesmo pedido.** Consequência conhecida: uma segunda simulação de **outra cidade** com o mesmo contato recebe "já recebemos" e não chega ao vendedor daquela cidade. A spec decidiu assim; a pergunta de mudar isso ainda é do dono.

## Dados pessoais que o sistema guarda

| Dado | Onde | Para quê | Retenção e exclusão |
|---|---|---|---|
| Nome | tabela `leads` | O vendedor da cidade saber a quem responder | Prevista: 12 meses para quem não fechar, com pedido de exclusão. **Não implementada ainda.** |
| WhatsApp (só dígitos, com DDD) | tabela `leads` | Contato e regra de 24 horas | Igual ao nome. |
| Cidade e valor da conta | `simulacoes` (e `calculos`, sem pessoa) | Definir quem atende e como a conta foi calculada | Igual ao nome; `calculos` não tem dado pessoal. |
| Resultado mostrado e números usados | `simulacoes` | O vendedor ver exatamente o que a pessoa viu | Igual ao nome. |

Não guarda: CPF, endereço, número da instalação, foto ou PDF da conta. CPF digitado é recusado antes de gravar. **O aviso de privacidade ainda não aparece na tela**, então hoje o sistema grava nome e WhatsApp sem avisar finalidade, prazo nem como excluir. Isso precisa existir antes de qualquer publicação.

## O que ficou de fora e por quê

Está na seção 4 da spec: foto ou PDF da conta (traz CPF, endereço e 12 meses de histórico), "refazer a simulação" no painel, consumo em kWh, bandeira tarifária no cálculo, busca automática na ANEEL, financiamento, bateria, comércio acima de 75 kWp, outras cidades, proposta, recálculo de pedidos antigos e notificações.

## Revisão adversarial

- **Como foi feita:** um revisor em contexto limpo (subagente, sem a conversa que construiu o sistema) recebeu só o pedido magro: [`revisao/pedido.md`](revisao/pedido.md) (trabalho, a spec como régua e a definição de achado). Uma primeira tentativa, por outra sessão do Claude Code, falhou por login expirado e não conta.
- **A lista, como veio:** [`revisao/lista-bruta.md`](revisao/lista-bruta.md), 11 itens: 6 de promessa sem código, 1 de código sem pedido, 4 de critério sem teste.
- **Quem julga:** a classificação foi **proposta pelo agente que escreveu o código**. O Lucas leu a proposta em 2026-10-28, concordou com ela e com quatro mudanças que ela trazia (itens 2, 3, 4-tela e 9 de "corrigir" para "deixar por enquanto", e o item 11 inteiro para "recusar"). Nenhum achado foi fechado pela palavra do autor: o que foi corrigido tem teste vermelho antes e verde depois, e o agente conferiu as afirmações principais do revisor antes de aceitá-las.
- **Afirmações do revisor que estavam erradas em parte:** no item 4 ele disse que `tarifa_kwh = 0` dava "Infinity ou NaN na tela", mas a resposta vinha com status 200 e todos os valores `null`; no item 11 ele disse não ter visto o log conferido nos testes de nome, mas o teste de nome captura `console.log` e `console.error` (`test/dado-pessoal.test.js`, linha 46).

| # | Achado | Caixa | O que foi feito e por quê |
|---|---|---|---|
| 1 | Tela de não compensa | **Corrigir** (mecanismo feito) | O servidor recusa pedido de simulação que não compensa; a página mostra o aviso e esconde o formulário. Testes `test/revisao.test.js`; conferido no navegador. Ver o conflito do C2. |
| 2 | Aviso de privacidade e caixa desmarcada | **Deixar por enquanto** | Ainda não chegou na ordem da seção 8 e nada está publicado. A spec diz que o pedido "não pode ir ao ar sem" o aviso: é obrigatório **antes de publicar**. |
| 3 | Painel do vendedor | **Deixar por enquanto** | Fatia 5 da spec, ainda não chegou. É obrigatório antes de o Carlos e a Renata usarem o sistema. |
| 4 | Números do dono: recusa de valor ruim | **Corrigido** na parte do simulador; tela: **deixar por enquanto** | Número zerado, negativo ou implausível vira "sem valor vigente" e o simulador não responde, em vez de devolver uma conta de `null`. A tela de edição é a fatia 4, ainda não chegou. |
| 5 | Piso de 3 anos nunca verificado | **Corrigir, bloqueado** | Faltam quatro números de fonte pública. O teste continua pendente de propósito; este README diz isso. |
| 6 | C2: R$ 200 não dá "não compensa" | **Corrigir pela spec, decisão do dono** | Com os números de teste R$ 200 dá 4 anos e 2 meses. O C2 manda mudar a spec antes do código. Pergunta registrada em `SPEC.md`, seção 11, item 3. |
| 7 | Testes que faltavam | **Corrigido** | Faixa, cidade, a conta de R$ 600 com valores feitos à mão, o ano mudando o Fio B e R$ 100 como não compensa. Quatro mudanças de fórmula feitas de propósito fizeram os testes falharem. |
| 8 | Campo da página rejeita "R$ 1.234,56" | **Corrigido** (campo); **recusado** (guardar o texto cru) | O campo virou texto com teclado numérico e a página manda o texto ao servidor. Guardar também o texto cru seria dado a mais; o pedido já guarda a conta digitada, como número. |
| 9 | README, retenção, exclusão | README **feito agora**; retenção e exclusão: **deixar por enquanto** | Fatia 5, ainda não chegou; obrigatórias antes de publicar. A tabela de dados pessoais acima diz o que existe e o que falta. |
| 10a | Reajuste diferente de zero vira erro 500 | **Deixar, limite conhecido** | A spec fixa 0%. Quem cadastrar outro valor derruba o simulador. Fica anotado aqui. |
| 10b | Fio B limitado ao primeiro e ao último ano | **Recusar** | A Lei 14.300 fixa 100% de 2029 em diante; usar o último ano é o comportamento certo. Antes de 2026 não ocorre. |
| 10c | Esquema de teste paralelo (PGlite) | **Deixar** | Evita testar em cima de dado real da P1 e deixa a CI sem chave. O C3 roda no banco de verdade com `TESTAR_NO_SUPABASE=1`. |
| 11 | CPF em log sem teste | **Recusar** (é o excesso da lista) | O próprio revisor escreve "não afirmo que há vazamento", e na parte do nome ele errou: o teste já captura o log. No WhatsApp o servidor não registra o corpo do pedido. Um achado que o autor dele não sustenta é lacuna inventada para cumprir a tarefa. |

## Evidência

`evidencia/` guarda a saída crua do que foi rodado: vermelho e verde de cada correção, a prova de que o hook dispara sozinho e a conferência da página no navegador. `depuracao/` guarda as hipóteses escritas antes das correções.
