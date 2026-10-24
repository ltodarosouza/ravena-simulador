#!/bin/bash
# Hook do Claude Code (PostToolUse em Edit/Write/MultiEdit): depois de cada edição de código,
# roda os testes e devolve a saída ao agente, no mesmo turno. Só olha arquivos deste projeto.
# Teste vermelho vira "block": o agente lê o motivo antes de seguir em frente.
entrada=$(cat)
arquivo=$(printf '%s' "$entrada" | jq -r '.tool_input.file_path // .tool_response.filePath // empty')
raiz="$(cd "$(dirname "$0")/.." && pwd)"

case "$arquivo" in
  "$raiz"/*) ;;
  *) exit 0 ;;                       # arquivo de fora do projeto
esac
case "$arquivo" in
  "$raiz"/node_modules/*|"$raiz"/dados-locais/*|"$raiz"/evidencia/*) exit 0 ;;
esac
case "$arquivo" in
  *.js|*.json|*.sql|*.html) ;;       # código, dados e esquema; texto e docs não rodam teste
  *) exit 0 ;;
esac

saida=$(cd "$raiz" && npm test 2>&1)
status=$?
resumo=$(printf '%s\n' "$saida" | grep -E '^(✔|✖|ℹ (tests|pass|fail|todo))' | cut -c1-200)

if [ $status -eq 0 ]; then
  jq -n --arg r "npm test depois de editar ${arquivo#$raiz/}: tudo passou.
$resumo" '{hookSpecificOutput:{hookEventName:"PostToolUse",additionalContext:$r}}'
else
  detalhe=$(printf '%s\n' "$saida" | grep -A6 -E '^✖ ' | head -40 | cut -c1-220)
  jq -n --arg r "npm test FALHOU depois de editar ${arquivo#$raiz/}.
$resumo

$detalhe" '{decision:"block",reason:$r}'
fi
exit 0
