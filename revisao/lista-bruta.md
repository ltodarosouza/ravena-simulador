# Lista bruta do revisor (subagente em contexto limpo), sem edição

Pedido: `revisao/pedido.md`. O revisor recebeu só o pedido magro (trabalho, régua, definição de achado). O texto abaixo é o relatório dele, copiado como veio. (A primeira tentativa, por `claude -p`, falhou por login expirado; a revisão válida é esta, feita por um subagente.)

Revisão do ravena-simulador (main). `npm test` roda: 19 testes, 18 passam, 0 falham, 1 "todo" (o piso de 3 anos do C1). Não editei nada. Há uma pasta `revisao/` não rastreada, que não li para não contaminar o julgamento. Não existe README no repositório.

1. [Tipo 1] A tela de "não compensa" não existe, e o botão de pedir simulação aparece sempre.
- Spec §3: "Se o retorno passar do limite configurado (inicial: 6 anos) ou não houver retorno: mensagem clara de que não compensa e por quê, sem botão de pedir simulação." C2: "a tela diz que não compensa e por quê, não mostra botão de pedir simulação e nenhum dado pessoal é pedido." A fatia 3 da §8 também cobra isso.
- Código: `lib/calculo.js:66` calcula `nao_compensa`, e `server.js:48` o devolve. Nada o consome. `public/index.html:64-70` sempre mostra o resultado e o formulário de nome e WhatsApp (linhas 40-45). `grep nao_compensa` em `public/` não acha nada. Se retorno for null, a página escreve "mais de 50 anos" (linha 69), que não é a mensagem pedida.
- Em `/api/pedido` (`server.js:50-55`, `lib/banco.js:29`, `lib/banco-supabase.js:38`) o servidor também não recusa uma simulação marcada `nao_compensa`. Mesmo sem botão, dá para criar pedido para ela.
- Evidência: com `referencia/numeros.json`, `simular({conta:100})` dá `nao_compensa:true` (8 anos e 6 meses) e a página mostra o resultado e o formulário normalmente. Não rodei a página no navegador. Isso vem da leitura do HTML.
- Consequência: a pessoa de conta baixa, que o brief diz que "não pode receber uma simulação bonita nem um formulário que a deixa esperando resposta", recebe os dois. O dono recebe lead que a spec manda recusar.

2. [Tipo 1] O aviso de privacidade não existe, nem a caixa desmarcada.
- Spec §3: "Aviso de privacidade na tela do pedido: dados pedidos, para quê e por quanto tempo, com como pedir exclusão; sem caixa pré-marcada." §7 Legal e §9 ("marca a caixa do aviso (que vem desmarcada)") repetem. A fatia 2 da §8 diz que o pedido "não pode ir ao ar sem eles".
- Código: `public/index.html:40-45` só tem nome, WhatsApp e botão. Nenhum texto de privacidade e nenhum checkbox. `grep privacidade|checked|exclus` em `public/`, `lib/` e `server.js` não retorna nada. O servidor também não exige consentimento.
- Consequência: o sistema grava nome e WhatsApp sem informar finalidade, prazo nem como excluir. É o risco legal que a §8 usou para ordenar a fatia 2.

3. [Tipo 1] O painel do vendedor não existe, nem login, isolamento por cidade, estágios, histórico ou celular.
- Spec §3 "Quem vê o quê", §6 C4 e C7, §7 Técnica. Brief item 3.
- Código: não há rota de listagem, de pedido individual, de mudança de estágio nem de autenticação. `server.js` só serve `/`, `/api/simular` e `/api/pedido`. `lib/banco.js:52` e `lib/banco-supabase.js:64` têm `pedido(id)` só como auxiliar de teste, e nenhum filtra por vendedor. O único vestígio é a coluna `estagio` (`db/schema.sql:21`) e `andamento` nas migrations da P1. Não há tabela nem coluna de histórico de estágios (quem e quando).
- Consequência: Carlos e Renata não conseguem usar o sistema para o trabalho que o motivou (20 minutos por lead virando 2). Os pedidos só existem no banco. A fatia 5 da §8 ainda não foi feita.

4. [Tipo 1] A tela de números do dono não existe, nem a validação que recusa vazio, zero, negativo ou implausível.
- Spec §2 (linha "Números de cálculo": "Só o dono, numa tela só dele… Vazio, zero, negativo ou implausível: recusa") e C6 primeira metade ("quando o dono tenta salvar, então a tela recusa e explica"). Brief item 4.
- Código: o único caminho de escrita é `scripts/cadastrar-numeros.js`, um upsert direto no banco por script, sem validação alguma. `numeros_calculo` (migration `20261024130000`) só exige `fonte` com 3 ou mais caracteres. Não há checagem de valor positivo ou plausível. Um valor 0 ou negativo no `jsonb` passa. `lib/calculo.js:24` só barra undefined e null, então `tarifa_kwh = 0` gera divisão por zero e `Infinity` ou `NaN` na tela.
- Consequência: um número errado ou zerado vale para todos os pedidos de uma vez. É o custo que a §8 usou para justificar a fatia 4. Hoje o dono também não consegue mudar nada sem programador, o que o brief proíbe.

5. [Tipo 3] O C1 está formalmente verde, mas o piso de 3 anos nunca foi verificado.
- Spec C1: "esse retorno é maior ou igual a 3 anos… Se o simulador der menos que 3 anos, reprova."
- Código: o teste `test/criterios.test.js:28-36` vira `t.todo` e sai no `npm test` como "✔ … # pendente". Mesmo com `TESTAR_NO_SUPABASE=1` ele fica pendente enquanto faltam `tarifa_kwh`, `iluminacao_publica`, `fio_b_kwh`, `preco_kwp_faixas`, já que `scripts/cadastrar-numeros.js` não os cadastra.
- Evidência: rodei `simular` com os números de teste. R$ 600 em Sorocaba dá 5,3 kWp, investimento R$ 13.400, retorno **2 anos e 10 meses**, abaixo do piso. Em 2031, com Fio B a 100%, dá 3 anos e 2 meses. Ou seja, o ano de referência muda o veredito.
- Consequência: quem lê "18 passam, 0 falham" pode achar que o C1 foi cumprido. Com os números de teste, ele reprovaria. Nada impede a página de ir ao ar com retorno abaixo do que a spec e o brief proíbem, porque o teste que barraria é pulado. As perguntas abertas da §11 também continuam sem resposta.

6. [Tipo 3] O C2 não tem teste, e a verificação que existe contradiz o critério.
- Spec C2: "Se, com os números congelados, o retorno de R$ 200 não passar do limite de 6 anos, é o limite ou a faixa mínima desta spec que está errada, e se muda aqui antes do código."
- Código: nenhum arquivo em `test/` cobre R$ 200, `nao_compensa` ou ausência do botão.
- Evidência: com os números congelados, R$ 200 dá `retorno 4 anos e 2 meses, nao_compensa:false`. Ou seja, o gatilho que o C2 descreve disparou: o limite de 6 anos ou a faixa mínima de R$ 100 não produzem "não compensa" na conta de R$ 200 que o brief cita. Nem `SPEC.md` nem o código foram corrigidos. A SPEC §3 ainda diz R$ 100 a 2.000 e 6 anos.
- Consequência: o caso de uso central do brief ("quem tem conta de R$ 200 tem que ouvir que não compensa") não é atendido pela regra atual, e ninguém foi avisado. Só R$ 100 chega a "não compensa" (8 anos e 6 meses).

7. [Tipo 3] Faltam testes de critérios que têm código, ou só têm código parcial.
- C6 segunda metade ("número sem valor vigente → simulador não responde") está coberto. A primeira metade (recusa ao salvar) não tem código nem teste (ver item 4).
- A faixa de R$ 100 a 2.000 (§2: "explica o motivo e não calcula nem pede dados pessoais") tem código em `lib/calculo.js:31`, mas nenhum teste exercita `fora_da_faixa`, nem para menos, nem para mais.
- A cidade fora da lista e a ausência de cidade (§2: "Sem cidade: não calcula") têm código em `lib/calculo.js:30`, sem teste.
- Os arredondamentos da §3 (kWp com 1 casa, painéis para cima, centena, "X anos e Y meses") só têm asserção de tipo e de múltiplo no C1 (`test/criterios.test.js:17-26`). Nenhum teste verifica o valor numérico esperado, nem a projeção ano a ano com Fio B crescente, nem o reajuste 0%.
- Consequência: a regra de dinheiro mais sensível (a conta) não tem teste que falhe se alguém trocar uma fórmula. O único valor de referência é o "pendente" do item 5.

8. [Tipo 1] O pedido não guarda o valor digitado separado do número interpretado, e o formato "R$ 1.234,56" da §2 não funciona na página.
- Spec §2: o valor "escrito como a pessoa escreve no Brasil ('R$ 1.234,56', '1234,56', …)". O brief pede que o pedido traga "o que ela digitou".
- Código: `lib/valor-da-conta.js` aceita esses formatos no servidor. A página usa `<input type="number">` (`public/index.html:20`), que o navegador rejeita para "R$ 1.234,56" e para ponto de milhar. Esse problema já foi documentado em `depuracao/HIPOTESE-campo-da-pagina.md`, e não foi corrigido. O `git log` mostra só a evidência, sem commit de correção.
- Consequência: quem digita do jeito brasileiro na página não consegue enviar. A parte do servidor é testada (`test/valor-da-conta.test.js`), mas não é alcançável pela interface.

9. [Tipo 1] A fatia 6 (e o restante: retenção de 12 meses, exclusão, README com a lista de dados pessoais) não existe.
- Spec §7 Legal: "retenção de 12 meses para os que não fecharam e pedido de exclusão. O README lista todo dado pessoal que o sistema guarda e o que faz com cada um." §5 e §8 passo 5 também. O brief pede o README.
- Código: não há README. Não há job, coluna ou rotina de retenção nem de exclusão.
- Consequência: dados pessoais ficam para sempre, sem a lista que a spec exige.

10. [Tipo 2] Código que a spec não pediu ou que a contradiz.
- `lib/calculo.js:32` lança um `Error` genérico se `reajuste_tarifa_anual != 0`. A spec fixa 0% como padrão e não diz que outro valor deve quebrar. Em `server.js:57-61` isso vira um 500 "interno" em vez de um aviso. Por consequência, se o dono cadastrar um reajuste diferente de zero, o simulador cai para todo mundo.
- `lib/calculo.js:49` limita o ano do Fio B ao primeiro e ao último ano cadastrados (`Math.min/Math.max`). Isso é um comportamento silencioso que a spec ("sem valor vigente… avisa em vez de usar valor velho") não autoriza: depois de 2029, ou antes de 2026, ele usa o percentual da borda sem avisar.
- `lib/banco.js` + `db/schema.sql` (PGlite) mantêm um segundo esquema (`simulacoes` e `pedidos` próprios) diferente do banco real (`calculos`, `leads`, `simulacoes`). A spec §5 diz que o simulador usa o banco da P1. Os testes do C3 rodam por padrão no esquema paralelo, e o Supabase só entra com `TESTAR_NO_SUPABASE=1`, que não é o `npm test` padrão.
- Consequência: o item de PGlite é a única cobertura padrão do C3, mas ele não prova o comportamento do banco real (RLS, constraints da P1, `simulacoes_conta_mensal_check`). O 500 por reajuste e o clamp do Fio B são riscos de produção sem respaldo na spec.

11. [Tipo 3] O C3 e o C5 têm cobertura limitada no que a spec diz.
- C3 pede o resultado "exatamente como mostrado" e "todos os resultados" no pedido. O teste cobre `deepEqual` do resultado e o par chave, valor, vigência e fonte dos números, que é bom.
- C5 diz "o CPF não aparece em nenhuma tabela nem log". Os testes `test/dado-pessoal.test.js` e `test/whatsapp.test.js` checam as tabelas. Se eles checam o log do servidor, não vi isso nos testes de nome e WhatsApp. Não afirmo que há vazamento, só que "log" não tem teste identificável.
- Consequência: baixa. Se o CPF for logado por `console.error(e)` num erro de banco, o critério quebra sem teste que avise.

Total por tipo: tipo 1 = 6 (itens 1, 2, 3, 4, 8, 9), tipo 2 = 1 (item 10, com 3 pontos), tipo 3 = 4 (itens 5, 6, 7, 11).
