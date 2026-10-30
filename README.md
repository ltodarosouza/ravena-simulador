# Simulador da Ravena Solar (P2)

Simulador de economia com energia solar para a Ravena Solar (cliente fictício da trilha 202). A pessoa digita quanto paga de luz e a cidade, vê quanto economizaria, e se quiser pede a simulação detalhada. O vendedor usa depois o mesmo número que ela viu.

A spec é o contrato: [`SPEC.md`](SPEC.md). O pedido do cliente: [`brief.md`](brief.md).

## Estado hoje (o que existe e o que não existe)

| Pedaço (ordem da spec, seção 8) | Estado |
|---|---|
| Fatia 1: conta de R$ 600 em Sorocaba até o pedido gravado | **Feita.** Pedido grava o que a pessoa viu e os números usados. |
| Fatia 2: dado pessoal | **Feita.** CPF no nome e no WhatsApp é recusado; a página explica o uso e o prazo dos dados, a caixa começa desmarcada e o servidor exige aceite explícito. |
| Fatia 3: tela de não compensa | **Mecanismo feito.** Servidor recusa o pedido e a página esconde o formulário. Ver "Conflito do C2" abaixo. |
| Fatia 4: tela de números do dono | **Começada pela tarifa.** O dono já pode salvar tarifa com valor, vigência e fonte; a simulação usa a mudança e o histórico registra a alteração. Os outros números ainda entram por script. |
| Fatia 5: painel do vendedor, estágios, retenção, exclusão | **Feita.** Carlos e Renata têm lista isolada por região, detalhe com os números vistos pela pessoa e mudança de estágio com histórico. A limpeza automática respeita 12 meses, 30 dias e preserva pedidos fechados. O dono atende pedidos de exclusão pelo WhatsApp, com confirmação explícita. |
| Fatia 6: outras cidades e o resto | A conta já aceita as quatro cidades. O resto, não. |

**Publicado em 2026-10-30:** https://ravena-simulador.vercel.app (Vercel, entrada em `api/index.js`). Hoje o site abre, o painel e a tela do dono pedem senha, mas a simulação responde "em atualização" porque faltam números no banco (abaixo). A limpeza de retenção **não roda na Vercel** (não há processo longo); falta um agendamento.

O critério C1 (retorno de R$ 600 em Sorocaba não menor que 3 anos) está **pendente**: faltam números. Já cadastrado: a tarifa (R$ 0,7588 por kWh, vigência 2026-10-23, ANEEL Despacho 3.612/2026, **sem impostos**, enquanto a spec pede tarifa com ICMS e PIS/COFINS: conflito aberto). Ainda sem número no banco: Fio B em reais por kWh (conta: percentual do ano da Lei 14.300 × tarifa do Fio B da resolução da ANEEL, que ainda não foi lida), iluminação pública das quatro cidades (lei municipal, não encontrada) e as faixas de preço, que já estão decididas abaixo mas não cadastradas. Os números de `referencia/numeros.json` são **de teste** e só servem nos testes. Ver [`SPEC.md`](SPEC.md), seção 11.

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
- **Falha de conexão não parece sucesso.** Ao simular ou pedir contato, uma chamada sem resposta mostra que não foi possível concluir e orienta a tentar de novo. O sensor em `test/interface.test.js` falha se essa mensagem virar uma confirmação.
- **Acesso inicial do dono.** A rota `/dono` pede um segredo configurado apenas no servidor como `OWNER_ACCESS_TOKEN`; ele não fica na página nem no repositório. A primeira fatia da tela edita somente a tarifa. O teste prova que retirar a barreira permite uma gravação indevida e reprova.
- **Acesso inicial dos vendedores.** A rota `/painel` recebe o acesso individual digitado na hora; os segredos de Carlos e Renata ficam somente no servidor. Lista, endereço direto e mudança de estágio consultam o banco em nome do vendedor. A interface mostra os seis resultados guardados no pedido e o histórico registra quem mudou e quando.
- **Retenção automática.** Ao iniciar e depois uma vez por dia, o servidor remove pedidos não fechados com mais de 12 meses e simulações sem contato com mais de 30 dias. Pedidos fechados são preservados. O teste usa somente dados fictícios e prova a exceção retirando-a de propósito.
- **Exclusão a pedido.** A pessoa pede pelo contato informado no aviso de privacidade. Na área do dono, o WhatsApp e a confirmação `EXCLUIR` são exigidos; o servidor confere novamente o acesso do dono e apaga, numa operação, o cadastro, os pedidos e os cálculos ligados. O agente escolheu esse mecanismo de construção para executar a decisão de exclusão que o Lucas já havia aprovado. O teste usa somente pessoas fictícias.
- **Faixas de preço por kWp (premissa do Lucas, 2026-10-30, não é dado de fonte).** O agente propôs três opções dentro de R$ 2.300 a R$ 2.900 do brief; o Lucas escolheu: até 4 kWp, R$ 2.900; até 8 kWp, R$ 2.547; acima de 8 kWp, R$ 2.300. Um sistema de 6,4 kWp dá cerca de R$ 16.300, o ticket do brief. Ainda não cadastradas no banco.
- **Sem número de teste no banco que o site usa.** O simulador é público: um número inventado pareceria oficial. Enquanto faltar número, ele diz que está em atualização.
- **Erro a favor do cliente, de propósito e avisado (decisão do Lucas, 2026-10-30).** O brief pede que, se for para errar, o erro seja contra a Ravena, e que o simulador não prometa retorno menor que o da planilha (três a quatro anos). Sem o Fio B e sem a iluminação, a conta fica mais otimista: R$ 600 em Sorocaba dá 2 anos e 8 meses, abaixo desse piso. O Lucas escolheu mostrar a simulação assim, em vez de deixar o site sem resposta, porque esses dois números não têm fonte pública achada. O custo é aceito às claras: a tela mostra um aviso de que a economia pode estar maior e o retorno menor do que o real, e a spec (seção 3 e C8) registra a exceção. Quando o Fio B e a iluminação forem cadastrados, a conta volta a errar contra a Ravena e o aviso some. Verificado no site publicado, num navegador, a 1280 e a 390 px (sem rolagem horizontal).

## Dados pessoais que o sistema guarda

**Decisões do Lucas em 2026-10-29.** As opções (6, 12 ou 24 meses; apagar tudo ou só nome e WhatsApp; 30 dias, para sempre ou nada para a simulação sem pedido) foram montadas pelo agente, e o Lucas escolheu entre elas. A lista dos dados e a coluna "quem vê" vêm da spec e do brief.

| Dado | Onde | Para quê | Quem vê | Quanto tempo | O que ficou decidido |
|---|---|---|---|---|---|
| Nome | `leads` | O vendedor saber a quem responder | O vendedor da cidade do pedido e o dono | **12 meses** para quem não fechou; para quem fechou, enquanto houver relação comercial | Guarda, porque o vendedor precisa. Limite de 100 caracteres. CPF no nome é recusado. |
| WhatsApp (só dígitos, com DDD) | `leads` | Contato e a regra de 24 horas | Igual ao nome | Igual ao nome | Guarda, porque é o canal do vendedor. CPF no campo é recusado. |
| Cidade e valor da conta do pedido | `simulacoes` | Decidir qual vendedor atende e como a conta foi feita | Igual ao nome | Apagados junto com o pedido | Guarda: sem a cidade o pedido não chega ao vendedor certo. |
| Resultado mostrado e números usados | `simulacoes` | O vendedor ver exatamente o que a pessoa viu | Igual ao nome | Apagados junto com o pedido | Guarda: é o que o C3 exige. |
| Simulação de quem **não pediu contato** (sem nome nem WhatsApp) | `calculos` | Deixar o pedido nascer da simulação que a pessoa viu | O dono | **30 dias** | Decidido apagar depois de 30 dias, para o banco não encher de simulação que ninguém usou. |
| Pedido de exclusão | `leads` e `simulacoes` | A pessoa pode pedir | O dono executa | Na hora | **Apaga tudo dela**: o lead e todas as simulações ligadas a ele. Não sobra nada que a identifique nem que ligue a ela. |

**Decidido não guardar:** CPF (recusado antes de gravar, nome e WhatsApp), endereço, número da instalação, foto ou PDF da conta. Motivo: a foto da conta traz CPF, endereço e 12 meses de consumo, e o simulador não precisa de nada disso para calcular. Nenhum dado de pedido vai para log (o teste confere).

**Implementado:** o pedido de exclusão é executado pelo dono na área administrativa, exige a palavra `EXCLUIR` e remove todos os pedidos e simulações ligados ao WhatsApp. A limpeza automática aos 12 meses e aos 30 dias também está implementada; o aviso de privacidade e a caixa desmarcada estão na tela, e o servidor recusa o pedido sem aceite explícito.

## Quem vê o quê (C4)

A regra de acesso mora **na própria consulta ao banco** (`pedidoPara`, `listarPedidosPara` e `alterarEstagioPara` em `lib/banco.js`, com a cidade do vendedor no `WHERE`). O Carlos vê Sorocaba e Votorantim, a Renata vê Itu e Salto, o dono vê tudo, e quem não se identificou ou não é conhecido não vê nada. Quem não pode ver recebe a mesma resposta de um pedido que nunca existiu. O painel chama essas consultas e tem um teste pela API (`test/painel.test.js`). **Provado só no banco de teste (PGlite):** a versão do Supabase (`lib/banco-supabase.js`) tem a mesma regra, lida e não executada. Ao retirar de propósito o filtro da mudança de estágio, Carlos altera um pedido de Itu e o teste reprova.

## Ver o simulador no ar, sem login

Conferido em 2026-10-30 contra https://ravena-simulador.vercel.app, sem senha nem usuário de teste. A rota de simulação é pública; o painel (`/painel`) e a tela do dono (`/dono`) pedem acesso e não entram neste exemplo.

```bash
curl -s -X POST https://ravena-simulador.vercel.app/api/simular \
  -H 'content-type: application/json' \
  -d '{"conta":600,"cidade":"Sorocaba"}'
```

Saída crua desta rodada (o `simulacao_id` muda a cada chamada):

```json
{"simulacao_id":"6f9f735a-b050-4709-828a-3ca7546108f3","kwp":6.9,"paineis":13,"investimento":17500,"conta_depois":38,"economia_ano1":6745,"retorno":{"anos":2,"meses":8,"total_meses":32},"nao_compensa":false,"sem_numero":["fio_b_kwh","iluminacao_publica"]}
```

O campo `sem_numero` lista o que ficou fora da conta por falta de número com fonte (ver "Números que ficaram sem fonte"). Sem ele, o resultado seria o de um cálculo completo.

## O que ficou de fora e por quê

Está na seção 4 da spec: foto ou PDF da conta (traz CPF, endereço e 12 meses de histórico), "refazer a simulação" no painel, consumo em kWh, bandeira tarifária no cálculo, busca automática na ANEEL, financiamento, bateria, comércio acima de 75 kWp, outras cidades, proposta, recálculo de pedidos antigos e notificações.

### Números que ficaram sem fonte (2026-10-30)

O simulador só calcula com número vigente, com data e fonte. Estes três **não foram encontrados** em fonte oficial e **não foram cadastrados**; nenhum número de teste entrou no banco do site:

| Número | O que foi tentado | Por que ficou fora |
|---|---|---|
| Fio B em R$/kWh | Base aberta da ANEEL (tarifas homologadas e componentes tarifários, arquivo de 2026) e busca na web. A CPFL Piratininga não aparece no arquivo de componentes; o PDF da resolução respondeu 403 ao agente. | Blogs citam valores só da CPFL Paulista, e blog não é fonte. A conta certa é o percentual do ano (60% em 2026, Lei 14.300, já cadastrado) × a tarifa do Fio B da resolução da ANEEL, que ninguém leu ainda. |
| Iluminação pública de Sorocaba, Votorantim, Itu e Salto | Busca de lei municipal (COSIP) para cada cidade. | Nenhuma lei vigente apareceu. O único achado de Sorocaba é de um projeto antigo, não da lei em vigor. |
| Tarifa com impostos | A ANEEL publica a tarifa sem ICMS, PIS e COFINS (R$ 0,7588, cadastrada). | A SPEC pede com impostos. Conflito aberto: mudar a SPEC ou cadastrar com impostos é decisão do Lucas, e as alíquotas também precisam de fonte. |

Consequência: sem o Fio B o simulador não responde em **nenhuma** cidade, porque o Fio B não depende da cidade. Sem a iluminação, não responde em nenhuma das quatro. O site diz "em atualização" em vez de mostrar uma conta inventada. O cálculo foi rodado só com os números de teste e fora do banco, em [`evidencia/simulacao-com-numeros-de-teste.txt`](evidencia/simulacao-com-numeros-de-teste.txt): com eles, R$ 600 em Sorocaba dá retorno de 2 anos e 10 meses, **abaixo** do piso de 3 anos do C1. Isso não prova nada, porque os números são de teste; o C1 continua pendente até haver os números oficiais.

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
| 9 | README, retenção, exclusão | **Corrigido** | A rotina apaga pedidos não fechados após 12 meses e simulações sem contato após 30 dias, preservando pedidos fechados. A área do dono também executa a exclusão a pedido com confirmação explícita e autorização conferida no servidor. |
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

`evidencia/` guarda a saída crua do que foi rodado: vermelho e verde de cada correção, a prova de que o hook dispara sozinho e a conferência da página no navegador. `evidencia/2.14-varredura/` guarda o plano, o ponto de retomada e as provas do sensor novo, inclusive a mutação que troca a falha por sucesso falso e faz o teste reprovar. `evidencia/fechamento-p2/` guarda o vermelho, o verde, a mutação e a suíte completa das fatias de privacidade, tarifa do dono, painel do vendedor, retenção e exclusão a pedido. `depuracao/` guarda as hipóteses escritas antes das correções.
