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
- **Mesmo WhatsApp em 24 horas é o mesmo pedido.** Consequência conhecida: uma segunda simulação de **outra cidade** com o mesmo contato recebe a mesma resposta de pedido recebido (a tela não revela que o número já pediu) e o pedido não chega ao vendedor daquela cidade. A spec decidiu assim; a pergunta de mudar isso ainda é do dono.

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
- **Quem julga:** a classificação foi **proposta pelo agente que escreveu o código**. O Lucas leu a proposta em 2026-10-28, concordou com ela e com quatro mudanças que ela trazia (itens 2, 3, 4-tela e 9 de "corrigir" para "deixar por enquanto"). A tutora mostrou que o item 11 não é excesso inteiro: só a metade do nome; a do WhatsApp virou "corrigir" e foi feita. Nenhum achado foi fechado pela palavra do autor: o que foi corrigido tem teste vermelho antes e verde depois, e o agente conferiu as afirmações principais do revisor antes de aceitá-las.
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
| 11 | CPF em log sem teste | **Recusar** (metade do nome) e **corrigir** (metade do WhatsApp) | O revisor errou na parte do nome: o teste já captura o log. Na parte do WhatsApp ele acertou: não havia teste que provasse o log limpo. O servidor só registra três coisas (`server.js:61`, `:73`, `:78`; `lib/` não registra nada), e a de `:61` imprime exceções, que poderiam carregar um valor. O teste de WhatsApp agora captura o log, e uma mudança de propósito (registrar o corpo do pedido) o faz falhar (`evidencia/revisao-3-log-whatsapp-mutacao.txt`). |

## Revisão de segurança (aula 2.13)

- **Como foi feita:** um revisor em contexto limpo (subagente, que não viu a construção) recebeu só o pedido de [`revisao/pedido-seguranca.md`](revisao/pedido-seguranca.md): o repositório, a pergunta "o que alguém mal-intencionado faz com isto?" e a lista OWASP Top 10 de 2025, com a obrigação de responder os dez itens (inclusive "não se aplica, porque..."). O relatório, como veio: [`revisao/seguranca-lista-bruta.md`](revisao/seguranca-lista-bruta.md): 6 achados (1 alto, 1 médio, 4 baixos).
- **Conferência:** o agente que escreveu o código rodou de novo o script de ataque do revisor e os casos se repetiram (`evidencia/seguranca-4-ataque-depois.txt` tem a mesma bateria depois da correção).
- **Quem julga:** a classificação foi **proposta pelo agente**; o Lucas decidiu corrigir tudo o que foi proposto abaixo. A regra da aula: corrige-se o que muda quem alcança o quê (acesso, entrada, segredo); o resto fica de fora com o motivo escrito.
- **Limite do revisor:** tudo foi provado no banco de teste (PGlite). O caminho do Supabase real tem a mesma lógica, mas o que vale só nele foi lido, não executado. Um comando dele foi barrado (busca de chaves coladas em todo o histórico), então isso ficou sem verificar pelo revisor.

| # | Achado | Caixa | O que foi feito e por quê |
|---|---|---|---|
| 1 | Corpo sem teto (nome de 30 MB gravado) e simulações sem limite | **Corrigir** (teto); **deixar** (limite por origem) | O servidor guarda no máximo 10 KB do corpo e responde 413; o nome tem no máximo 100 caracteres. O limite de pedidos por origem depende da hospedagem, que não existe: pergunta 5 da spec. **Hoje, 1500 simulações seguidas ainda gravam 1500 linhas.** |
| 2 | Pedido com o WhatsApp de outro trava o dele por 24 h, e "já recebemos" revelava quem pediu | **Corrigir** (o vazamento); **deixar** (a prova de posse) | Pedido repetido e novo têm agora a mesma resposta. A trava de 24 h continua, porque provar que o número é de quem pede muda o produto: pergunta 4 da spec, do dono. |
| 3 | Simulação antiga ainda gera pedido sem número vigente | **Corrigir** | O C6 vale para o pedido: sem número vigente, 503 e nada gravado. A spec mudou antes. |
| 4 | CPF em algarismos de largura total passa no nome | **Corrigir** | Os algarismos de qualquer alfabeto viram 0 a 9 antes de procurar CPF (nome e WhatsApp). |
| 5 | Corpo `null` ou id inválido dá 500 | **Corrigir** | Corpo que não é um objeto: 400. Id que não parece identificador: "faça a simulação de novo". |
| 6 | Script de números sobrescreve sem histórico | **Deixar** | É a tela do dono (fatia 4); o pedido já guarda uma cópia dos números usados. |
| — | Corrida entre dois pedidos no Supabase (não reproduzida) | **Deixar** | Não confirmada; se for provada, a saída é uma restrição única no banco. |
| — | O servidor roda com a chave secreta, que ignora RLS | **Recusar** | É o desenho da spec (chave só no servidor). A defesa é o servidor validar tudo o que entra, que é o que os itens 1, 4 e 5 fazem. |

Cada correção tem teste que falhou antes e passa depois (`evidencia/seguranca-1-vermelho.txt`, `seguranca-2-verde.txt`), e quebrar cada uma de propósito faz o teste dela falhar (`evidencia/seguranca-3-mutacoes.txt`).

## Evidência

`evidencia/` guarda a saída crua do que foi rodado: vermelho e verde de cada correção, a prova de que o hook dispara sozinho e a conferência da página no navegador. `depuracao/` guarda as hipóteses escritas antes das correções.
