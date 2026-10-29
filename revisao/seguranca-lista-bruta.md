# Revisão de segurança (2.13): relatório do revisor, como veio

Feita por um subagente em contexto limpo, com o pedido de [`pedido-seguranca.md`](pedido-seguranca.md). Colado sem resumo.

---

REVISÃO DE SEGURANÇA INDEPENDENTE - Simulador Ravena Solar (P2), branch main

Como foi feito: li SPEC.md, README.md, server.js, lib/*, db/schema.sql, as duas migrations, a migration da P1 (em ../landing-solar), public/index.html, scripts/ e .claude/settings.json. `npm test` deu 33 passando, 0 falhas, 1 pendente (o C1 com números do dono). Os ataques abaixo rodaram contra `criarServidor` com PGlite em memória e `referencia/numeros.json`, num servidor local em porta aleatória. O script está em /private/tmp/claude-501/-Users-ltodaro-dev-trabalhos-202-landing-solar/2be58302-d5ac-45a7-9830-c0202da2e12a/scratchpad/atk.js, fora do projeto. Não editei nada do projeto, não li nem imprimi `.env.local` e não toquei no Supabase real. Em `.env.local` olhei só o `ls -la`: modo 600, e o `git log --all -- .env.local .env` não mostra nenhum commit, então ele nunca entrou no histórico. Um comando meu foi barrado pelo classificador do Claude Code. Era um `git grep` por padrões de chave em todo o histórico, e eu não tentei de novo. Ficou sem verificar se há alguma chave colada em outro arquivo versionado. Limite do método: tudo foi provado no caminho PGlite (`lib/banco.js`). O caminho de produção (`lib/banco-supabase.js`) tem a mesma lógica, e o que valer só nele eu aponto como "lido, não executado".

TABELA A01 a A10

| Item | Resultado |
|---|---|
| A01 Controle de acesso quebrado | Sem achado exposto hoje. O servidor só tem 3 rotas (`GET /`, `POST /api/simular`, `POST /api/pedido`). Nenhuma lê pedido. A resposta de `/api/simular` não traz os números do dono (conferi as chaves: `simulacao_id,kwp,paineis,investimento,conta_depois,economia_ano1,retorno,nao_compensa`). As tabelas novas têm RLS ligada sem política, e o servidor usa a chave secreta. O isolamento Carlos/Renata (C4) e o painel são a fatia 5, que o README declara não feita, então não conto. |
| A02 Configuração de segurança incorreta | Sem achado concreto. `.env.local` está em modo 600, o `.gitignore` cobre `.env` e `.env.*`, e `.env.example` está sem valores. Os 500 devolvem só `{"erro":"interno"}`. Observação sem número: o processo público roda com a chave secreta, que ignora RLS em todas as tabelas, inclusive as `leads` da P1. Qualquer falha futura no servidor vira acesso a tudo. |
| A03 Cadeia de suprimentos | Sem achado. São 2 dependências diretas (`@electric-sql/pglite`, `@supabase/supabase-js`), com `package-lock.json` com hash de integridade nos 10 pacotes e sem script de instalação. `npm audit --offline` deu 0 vulnerabilidades, mas offline é fraco. Não rodei o audit online porque o limite proíbe pedir a servidor externo. Observação: o PGlite, banco de teste, é carregado em produção porque `banco-supabase.js` faz `require("./banco")`. |
| A04 Falhas criptográficas | Não se aplica aqui, porque o código não tem senha, token, hash nem criptografia própria. O transporte (HTTPS) e a criptografia em repouso ficam a cargo da hospedagem, que ainda não existe: o README diz que nada está publicado. |
| A05 Injeção | 1 achado (nº 4: o filtro de CPF no nome é furado por algarismos de largura total). Sem injeção de código: o SQL do PGlite é parametrizado, o Supabase usa o construtor `.eq()/.insert()`, o WhatsApp só tem dígitos, a página usa `textContent` e não há `exec`, `eval` nem `innerHTML`. |
| A06 Design inseguro | 3 achados (nº 1, 2 e 3). |
| A07 Falhas de autenticação | Não se aplica aqui, porque não existe login. O site é público por desenho e o login do vendedor é a fatia 5. Os scripts de dono usam a chave do ambiente. |
| A08 Integridade de software e de dados | 1 achado de severidade baixa (nº 6). Sem desserialização insegura: só `JSON.parse`. O pedido copia da simulação o que foi mostrado, nada é recalculado, e o cliente não consegue forjar resultado porque ele sai do servidor. |
| A09 Registro e alerta | Sem achado separado. Só há 3 pontos de log (`server.js:61,73,78`), nenhum registra pedido, recusa ou abuso, então os ataques 1 a 3 passariam sem rastro. Isso agrava aqueles achados, e eu não o conto como um a mais. |
| A10 Condições excepcionais | 1 achado (nº 5: entrada malformada dá 500). Em teste, cada exceção é logada, mas nenhum segredo apareceu nos logs. |

ACHADOS, do mais grave ao menos grave

1. A06 / A10 (disponibilidade, um dos dois bancos da empresa). Chamadas anônimas gravam sem limite no banco, e o corpo da requisição não tem tamanho máximo.
- Onde: `server.js:24-28` (`lerCorpo` junta todo o corpo, sem teto), `server.js:42-50` (cada `/api/simular` grava uma linha, e no Supabase também consulta `numeros_calculo`), `server.js:51-56`, `lib/banco.js:29-51` e `lib/banco-supabase.js:38-63` (o `nome` não tem tamanho máximo; a tabela `leads` só exige 2 letras ou mais).
- Ataque: (a) repetir `POST /api/simular {"conta":600,"cidade":"Itu"}` em laço, sem login. Cada chamada vira uma linha em `simulacoes`/`calculos`. (b) Mandar `POST /api/pedido` com um `nome` de dezenas de MB. O `Content-Type` é ignorado, então `text/plain` serve e dispensa o preflight de CORS. O servidor lê tudo e grava.
- Evidência (atk.js, T6 e T1): 1500 chamadas em 268 ms deram 1500 linhas, sem recusa (linhas antes 2, depois 1502). Um `nome` de 30 MB deu `status 201`, com `{"n":31457280}` bytes gravados, em 426 ms.
- Perde: o plano gratuito do Supabase (SPEC seção 7) é o mesmo banco da landing P1. Encher o banco derruba as duas páginas, e o dono não vê nada. Pedido fica com nome gigante para o vendedor. O Supabase real não foi testado, então não sei se o PostgREST corta o corpo antes.

2. A06 (pedido em nome de terceiro). Qualquer um cria pedido com o WhatsApp de outra pessoa e trava o pedido verdadeiro dela por 24 h.
- Onde: `lib/banco.js:39-43` e `lib/banco-supabase.js:49-55` (a regra de 24 h por WhatsApp não prova que o WhatsApp é de quem pede), `server.js:54` (a resposta `duplicado` revela se o número pediu nas últimas 24 h).
- Ataque: (1) `POST /api/simular` e guardar o `simulacao_id`. (2) `POST /api/pedido` com esse id, um nome falso e o WhatsApp da vítima. (3) Quando a vítima pede de verdade, recebe "Já recebemos o seu pedido" e o pedido dela não existe. Repetir (2) com um número e ler "duplicado" confirma que ele pediu nas últimas 24 h.
- Evidência (atk.js, T3): atacante `201 {"mensagem":"Pedido recebido."}`; vítima depois `200 {"duplicado":true,"mensagem":"Já recebemos o seu pedido."}`. No painel só existe `[{"nome":"Fulano Falso"}]`.
- Perde: o vendedor liga ou escreve para um estranho que nunca pediu (risco de LGPD). O cliente de verdade some sem saber. Um concorrente pode travar leads em massa. O mesmo mecanismo faz a sonda de "este número pediu hoje?" vazar. No Supabase o `nome` do lead existente não é trocado. Então o lead já existente fica com o nome do atacante.

3. A06 (simulação antiga serve para pedido novo). `/api/pedido` não confere se a simulação ainda é válida.
- Onde: `lib/banco.js:36-38`, `lib/banco-supabase.js:45-47` (só confere que o id existe; não há prazo nem conferência de números vigentes). Contraste com `lib/calculo.js:37-38`, que recusa sem número vigente (C6).
- Ataque: guardar um `simulacao_id`. Depois que o dono mudar um número ou retirá-lo, enviar `POST /api/pedido` com o id antigo.
- Evidência (atk.js, T7): com os números retirados, `/api/simular` dá 503, mas `/api/pedido` com o id antigo dá `201 Pedido recebido`.
- Perde: nada grave de segurança. É a regra de C6 ("sem valor vigente, o simulador não responde") que vale na simulação e não vale no pedido. O vendedor recebe pedido com preço antigo. Também alimenta o achado 2.

4. A05 (CPF passa no campo nome com algarismos de largura total). Fura o critério C5.
- Onde: `lib/dado-pessoal.js:16` (`replace(/\D/g, "")` tira como "não dígito" os algarismos de largura total).
- Ataque: `POST /api/pedido` com `nome: "Joao ５２９９８２２４７２５"` (CPF válido, em algarismos de largura total).
- Evidência (atk.js, T4): largura total `201 Pedido recebido`, e o banco guarda `[{"nome":"Joao ５２９９８２２４７２５"}]`. O controle em ASCII (`Joao 52998224725`) é recusado com `422 nome_com_cpf`. `node -e 'console.log(/\D/.test("５"))'` imprime `true`.
- Perde: C5 e a SPEC seção 7 dizem que o sistema não guarda CPF "em nenhuma tabela, log ou arquivo". O filtro é por lista de padrões, e um CPF que passa ali é guardado em texto aberto. Quem perde é o titular do CPF. Severidade baixa: exige digitar o CPF de propósito.

5. A10 (entrada malformada dá 500, não 400/422).
- Onde: `server.js:43` e `lib/banco.js:29` (desestruturação de `null`), `lib/banco.js:36` e `lib/banco-supabase.js:45` (`simulacao_id` inválido vai direto à consulta).
- Ataque: `POST /api/pedido` com corpo `null`, ou com `simulacao_id` igual a `"abc"` ou a um objeto; `POST /api/simular` com `null`.
- Evidência (atk.js, T5): os cinco casos acima dão `500 {"erro":"interno"}`, exceto `simulacao_id` ausente, que dá 422. O log registra `Cannot destructure property...` e `invalid input syntax for type uuid`.
- Perde: não vaza nada na resposta. O custo é que o 500 é indistinguível de falha real do banco, e com o Supabase cada erro destes vira uma consulta. Severidade baixa.

6. A08 (baixa). A tabela de números do dono não guarda histórico quando o script sobrescreve.
- Onde: `scripts/cadastrar-numeros.js` (faz `upsert` com `onConflict: "chave,vigencia"`) e `supabase/migrations/20261024130000_numeros_do_dono.sql` (o `unique (chave, vigencia)` sem auditoria).
- Ataque: quem tem a chave secreta roda o script com a mesma `chave` e `vigencia`, mas outro `valor`. A linha é substituída no lugar, sem quem nem quando.
- Evidência: leitura de código. Não executei, porque exigiria o Supabase real.
- Perde: a SPEC fala em "histórico de mudanças" dos números do dono, e a tela do dono (fatia 4) é a que vai ter isso, então é só um aviso. Não pesa hoje porque os pedidos já guardam uma cópia dos números usados.

Não confirmado: a corrida entre dois pedidos simultâneos com o mesmo WhatsApp (verificação e gravação em duas consultas, `banco.js:39-50` e `banco-supabase.js:50-62`). No PGlite 6 pedidos paralelos deram 1 pedido gravado (atk.js, T2), então não reproduzi. No Supabase a leitura-depois-escrita é não atômica por inspeção, e nunca testei, por isso não conto como achado.

Total: 6 achados (1 alto, 1 médio, 4 baixos), em 10 itens respondidos. Dos 10, 5 têm achado (A05, A06, A08, A10 e o A06 triplo) e 5 sem achado ou não se aplicam (A01, A02, A03, A04, A07, A09 com motivos acima).
