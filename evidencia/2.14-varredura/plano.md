# Plano da varredura de qualidade — Ravena

Decisões confirmadas pelo Lucas em 2026-10-29. A proposta inicial foi escrita pelo agente; o Lucas leu e confirmou antes da execução.

## Resultado final buscado

Verificar todos os estados que existem hoje na página pública do simulador com os mesmos critérios, registrar um resultado por estado e deixar um ponto exato de retomada. A varredura não inclui o painel do vendedor nem a tela de números do dono, porque ainda não existem.

## Inventário

1. Formulário inicial de simulação.
2. Resultado que compensa, com formulário de pedido de contato.
3. Resultado que não compensa, sem formulário de contato.
4. Erro de entrada, indisponibilidade dos números ou falha de conexão.
5. Confirmação ou falha no envio do pedido.

## Critérios usados em todos os estados

- o comportamento corresponde ao `SPEC.md`;
- o próximo passo fica claro e não há mensagem de sucesso falsa;
- a página funciona a 390 px sem rolagem horizontal;
- campos têm rótulo, mensagens importantes são anunciadas e controles têm pelo menos 44 px;
- não há pedido de dado pessoal quando a simulação não compensa;
- dados inválidos não produzem economia enganosa;
- falha de conexão não deixa dúvida sobre o envio do pedido.

## O que o agente pode ler e rodar

Pode ler todos os arquivos versionados do repositório e rodar localmente testes, servidor e navegador. Não pode entrar em contas, imprimir segredos, usar dado pessoal real, fazer push nem publicar.

## Ordem e evidência

Os estados são verificados na ordem do inventário. Cada resultado é salvo nesta pasta com: estado, critério, resultado observado, aprovado ou reprovado e próximo passo. Saídas pedidas como prova ficam cruas, com o comando e a saída completa.

## Sensor novo

Um teste executável verifica que uma falha de conexão devolve uma mensagem clara para tentar novamente e nunca uma confirmação de sucesso. Primeiro o teste deve falhar com o comportamento atual; depois deve passar com a correção. Por fim, a regra será quebrada temporariamente sem alterar o teste, o teste deverá falhar e a regra será restaurada.

## Ponto de retomada

Ao terminar cada estado, registrar no arquivo `estado.md` o último item concluído e o próximo item exato. Se a sessão parar, a próxima começa lendo este plano e `estado.md`, roda `npm test` e continua no primeiro item marcado como pendente.

## Estado inicial conferido pelo agente

- branch `main`, sem alterações no início da tarefa;
- commit inicial: `c05972d`;
- `npm test`: 54 testes passaram, nenhum falhou e 1 ficou pendente por exigir os números oficiais do dono;
- existe uma única página pública, `public/index.html`; os cinco itens do inventário são estados dessa página.
