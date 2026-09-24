#!/usr/bin/env bash
# test-fixture-executor.sh · NÃO é teste: é o molde que os testes da etapa 7b
# CARREGAM (source) para rodar o executor.sh DE VERDADE num repo git montado num
# `mktemp -d`, com um `claude` falso no PATH e gates que o caso controla.
#
# Nada aqui lê `docs/fila` do checkout nem config de repo real: o config é o
# heredoc abaixo (as chaves do fixture do kit, com a sondagem desligada e a
# identidade vazia), a fila é um ticket 901, e os gates chamam scripts do
# próprio tmp. O motor deste checkout é VENDORIZADO no fixture
# (scripts/orquestrador/, commitado), como num repo instalado: o enforcement roda
# `scripts/orquestrador/enforcement-core.ts` a partir da raiz de execução. O
# único empréstimo é o `node_modules` do checkout que contém este arquivo
# (symlink, ignorado pelo git do fixture), porque o motor é TypeScript.
#
# Uso, de dentro de um teste:
#   source "$AQUI/test-fixture-executor.sh"
#   fxe_novo                      # monta $FXE/repo e imprime nada (ticket $FXE_ID, 901 por padrão)
#   fxe_claude 429                # o que o `claude` falso faz em toda chamada do agente
#   fxe_fila linhas:5 503 ...     # ou um modo por chamada, em ordem (o último se repete)
#   fxe_criterio falhou           # o que o critério do ticket imprime (espera "ok")
#   fxe_gate typecheck 'exit 0'   # corpo do script do gate
#   fxe_roda                      # roda executor.sh --ticket 901; saída em $FXE/saida, rc em $FXE_RC
#   fxe_status / fxe_nota / fxe_eventos / fxe_cooldown
#
# Rodado direto, só avisa e sai 0.

if [ "${BASH_SOURCE[0]}" = "$0" ]; then
  echo "test-fixture-executor.sh é molde carregado pelos test-*.sh da 7b; não roda sozinho"
  exit 0
fi

FXE_AQUI="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# O node_modules do checkout que contém este molde, achado pelo GIT e não
# subindo com `..` a partir daqui (peça 7b-9: o molde viaja para o repo instalado).
FXE_NM="$(git -C "$FXE_AQUI" rev-parse --show-toplevel 2>/dev/null || true)/node_modules"

# fxe_novo [filtro-jq] — um tmp novo com repo, claude falso e gates verdes. O
# filtro opcional ajusta o config do caso (ex.: '.max_retries = 0').
# FXE_ALLOWLIST (JSON, opcional): a pathspec_allowlist do ticket; padrão
# ["src/a.ts"]. Existe para o caso que precisa de um arquivo de teste DO ticket
# (porte do Actus: base_vermelha, 632, só reprova por mérito o teste que o
# ticket pode tocar).
fxe_novo() {
  local filtro="${1:-.}" r
  FXE_ID="${FXE_ID:-901}"
  # Caminho FÍSICO: no macOS o mktemp devolve /var/... e o git devolve
  # /private/var/... para o mesmo lugar, e o ensure_staging_worktree compara o
  # dono do worktree de merge por texto (lib.sh:git_common_abs usa pwd, não
  # pwd -P). Achado da 7b-8, registrado para a 7c.
  FXE="$(cd "$(mktemp -d)" && pwd -P)"
  r="$FXE/repo"
  mkdir -p "$r/docs/fila/runs" "$r/src" "$FXE/bin" "$FXE/gates" "$FXE/_worktrees"
  printf 'exit 0\n' > "$FXE/gates/typecheck.sh"
  printf 'echo " Tests  1 passed (1)"\nexit 0\n' > "$FXE/gates/test.sh"
  jq "$filtro" > "$r/docs/fila/000-config.json" <<'JSON'
{ "$schema_versao": 2,
  "branch_alvo": "staging-auto", "branch_protegida": "main",
  "max_retries": 2, "cooldown_minutes": 60, "diff_cap_linhas": 600,
  "politica_adiamento": { "causas_que_adiam": [
    "erro de conexão", "sessão expirada", "rate limit", "quota estourada",
    "timeout de claude_timeout_secs", "gate interrompido no meio", "veredito do juiz ilegível" ] },
  "politica_retry": { "por_causa": {
    "diff_cap": { "modelo": "MANTER", "acao": "estreitar o escopo" },
    "enforcement": { "modelo": "MANTER", "acao": "respeitar a allowlist" },
    "criterio_qualidade": { "modelo": "ESCALAR", "acao": "subir para retry_final_model" } } },
  "migrations_dir": "db/migrations", "sql_pendente_dir": "docs/sql-pendente",
  "worktrees_dir": "../_worktrees", "worktrees_prefixo": "fxe-",
  "runs_dir": "docs/fila/runs", "liberacoes_file": "docs/fila/liberacoes.json",
  "decisoes_file": "docs/fila/decisoes-pendentes.md", "pausar_file": "docs/fila/PAUSAR",
  "executor_model": "sonnet", "avaliador_model": "opus", "retry_final_model": "opus",
  "modelos": { "juiz_baixo": "sonnet", "juiz_alto": "opus", "retry_final": "opus" },
  "restricao_execucao": { "ativa": false, "tickets_permitidos": [], "recusa_exit_code": 78,
    "recusa_mensagem": "RECUSADO", "desbloqueio": "n/a" },
  "claude_timeout_secs": 2, "claude_max_turns": 5,
  "preflight_probe": false, "preflight_env_keys": [],
  "commit_checkpoint": { "quando": "a cada unidade", "_regra": "commita" },
  "repo_origin_deve_conter": null, "ambiente_id": null,
  "zona_proibida": { "no_write_paths": [".env*", "scripts/orquestrador/**"], "no_write_tables": "TODAS" },
  "paths_harness": ["scripts/orquestrador/**"],
  "gates": [
    { "nome": "typecheck", "cmd": "__TC__", "tipo": "exit_code" },
    { "nome": "test", "cmd": "__TS__", "tipo": "exit_code" } ],
  "_execucao_dos_gates": { "ordem_obrigatoria": ["typecheck", "test"], "interrupcao": "NAO_VALE_PARCIALMENTE" },
  "canal_notificacao": "arquivo",
  "juiz": { "diff_max_baixo": 300, "max_tokens_veredicto": 300, "paths_alto_risco": [], "palavras_alto_risco": [] },
  "orcamento": { "usd_dia": 50, "tokens_dia": 5000000, "usd_ticket": 5, "custo_file": "docs/fila/runs/custo.json",
    "campos_usage": { "custo_usd": "total_cost_usd", "tokens_in": "usage.input_tokens",
      "tokens_out": "usage.output_tokens", "tokens_cache": "usage.cache_read_input_tokens" } },
  "executor": { "trailer_commit": "Orq-Ticket" },
  "proibicoes_absolutas": { "regras": [], "tools": ["Bash(git push:*)"] } }
JSON
  # Os gates chamam scripts do tmp: o caminho só existe agora, então entra
  # depois do heredoc, no lugar dos marcadores __TC__ e __TS__.
  jq --arg tc "bash $FXE/gates/typecheck.sh" --arg ts "bash $FXE/gates/test.sh" \
    '.gates[0].cmd = $tc | .gates[1].cmd = $ts' "$r/docs/fila/000-config.json" > "$r/docs/fila/000-config.json.tmp" \
    && mv "$r/docs/fila/000-config.json.tmp" "$r/docs/fila/000-config.json"
  echo '{"$schema_versao": 2, "tokens": []}' > "$r/docs/fila/liberacoes.json"
  printf '| data | origem | alvo | pergunta | visto |\n|---|---|---|---|---|\n' > "$r/docs/fila/decisoes-pendentes.md"
  echo ok > "$FXE/criterio"
  local fxe_allow='["src/a.ts"]'
  [ -z "${FXE_ALLOWLIST:-}" ] || fxe_allow="$FXE_ALLOWLIST"
  cat > "$r/docs/fila/$FXE_ID-t.md" <<TICKET
# $FXE_ID

\`\`\`json
{"id": "$FXE_ID", "slug": "t-$FXE_ID", "status": "pendente", "origem": "humano",
 "objetivo": "escrever src/a.ts", "pathspec_allowlist": $fxe_allow, "dependencias": [],
 "criterios_aceite": [
   {"tipo": "alvo", "descricao": "o arquivo existe", "cmd": "test -f src/a.ts && cat $FXE/criterio", "espera": "ok"}],
 "notas_status": ""}
\`\`\`
TICKET
  printf 'export const base = 0\n' > "$r/src/base.ts"
  mkdir -p "$r/scripts/orquestrador"
  cp "$FXE_AQUI"/*.sh "$FXE_AQUI"/*.ts "$r/scripts/orquestrador/"
  printf 'docs/fila/runs/\nnode_modules\n' > "$r/.gitignore"
  [ -e "$FXE_NM" ] && ln -s "$FXE_NM" "$r/node_modules"
  git -C "$r" init -q -b main
  git -C "$r" config user.email fixture@example.invalid
  git -C "$r" config user.name fixture
  git -C "$r" config commit.gpgsign false
  git -C "$r" add -A
  git -C "$r" commit -q -m "fixture: fila inicial"
  git -C "$r" branch staging-auto

  # O `claude` falso. Juiz (--max-turns 1) imprime $FXE/juiz-saida; agente faz
  # o que $FXE/claude-modo manda. Cada chamada do agente fica em $FXE/chamadas.
  cat > "$FXE/bin/claude" <<STUB
#!/usr/bin/env bash
case " \$* " in *" --max-turns 1 "*) cat "$FXE/juiz-saida" 2>/dev/null; exit 0 ;; esac
modelo=\$(printf '%s\n' "\$@" | awk 'p { print; exit } \$0 == "--model" { p = 1 }')
echo "agente model=\$modelo" >> "$FXE/chamadas"
# O git status de docs/fila no checkout PRINCIPAL no momento da chamada: é a
# prova de que o que o executor gravou antes (tentativas, status) já foi commitado.
{ echo "== chamada \$(grep -c . "$FXE/chamadas")"; git -C "$FXE/repo" status --porcelain -- docs/fila; } >> "$FXE/status-chamadas"
# Fila de modos: um por chamada, o último se repete. Sem fila, o modo fixo.
if [ -s "$FXE/claude-fila" ]; then
  modo="\$(head -1 "$FXE/claude-fila")"
  [ "\$(wc -l < "$FXE/claude-fila")" -gt 1 ] && { tail -n +2 "$FXE/claude-fila" > "$FXE/claude-fila.t"; mv "$FXE/claude-fila.t" "$FXE/claude-fila"; }
else
  modo="\$(cat "$FXE/claude-modo" 2>/dev/null || echo ok)"
fi
case "\$modo" in
  sleep) sleep 30 ;;
  429) echo '{"type":"result","is_error":true,"result":"API Error: Request rejected (429) · rate_limit_error"}'; exit 1 ;;
  503) echo '{"type":"result","is_error":true,"result":"API Error: 503 Service Unavailable · overloaded_error"}'; exit 1 ;;
  rc124) exit 124 ;;
  ok) printf 'export const a = 1\n' > src/a.ts
      git add src/a.ts && git commit -qm "a" -m "Orq-Ticket: $FXE_ID"
      echo '{"type":"result","result":"feito","total_cost_usd":0}' ;;
  linhas:*|negado:*)
      # N linhas em src/a.ts (sobrescreve: com worktree reaproveitada, o diff
      # contra a base é N). negado: o envelope traz permission_denials.
      n="\${modo#*:}"; : > src/a.ts
      i=0; while [ "\$i" -lt "\$n" ]; do echo "export const l\$i = \$i"; i=\$((i + 1)); done > src/a.ts
      git add src/a.ts && git commit -qm "a" -m "Orq-Ticket: $FXE_ID"
      case "\$modo" in
        negado:*) echo '{"type":"result","result":"feito","total_cost_usd":0,"permission_denials":[{"tool_name":"Bash","tool_input":{"command":"ls -la node_modules"}}]}' ;;
        *)        echo '{"type":"result","result":"feito","total_cost_usd":0}' ;;
      esac ;;
esac
STUB
  chmod +x "$FXE/bin/claude"
  : > "$FXE/chamadas"
  echo ok > "$FXE/claude-modo"
}

fxe_claude() { printf '%s\n' "$1" > "$FXE/claude-modo"; rm -f "$FXE/claude-fila"; }
fxe_fila()   { printf '%s\n' "$@" > "$FXE/claude-fila"; }
fxe_criterio() { printf '%s\n' "$1" > "$FXE/criterio"; }
fxe_gate()   { printf '%s\n' "$2" > "$FXE/gates/$1.sh"; }
fxe_juiz()   { printf '%s\n' "$1" > "$FXE/juiz-saida"; }

# fxe_roda — o executor.sh vendorizado no fixture (a cópia deste checkout).
# Isolado:
# ORQ_TESTE=1 e ORQ_EXEC_ROOT no fixture, como os testes da 7a.
fxe_roda() {
  FXE_RC=0
  ( cd "$FXE/repo" && ORQ_TESTE=1 ORQ_EXEC_ROOT="$FXE/repo" PATH="$FXE/bin:$PATH" \
      bash "$FXE/repo/scripts/orquestrador/executor.sh" --ticket "$FXE/repo/docs/fila/$FXE_ID-t.md" ) >> "$FXE/saida" 2>&1 || FXE_RC=$?
  return 0
}

fxe_campo()    { awk '/^```json$/{f=1;next} f&&/^```$/{exit} f' "$FXE/repo/docs/fila/$FXE_ID-t.md" | jq -r "$1"; }
fxe_status()   { fxe_campo '.status'; }
fxe_nota()     { fxe_campo '.notas_status // ""'; }
fxe_eventos()  { cat "$FXE/repo/docs/fila/runs/events.log" 2>/dev/null || true; }
fxe_cooldown() { [ -f "$FXE/repo/docs/fila/runs/.cooldown-until" ]; }
fxe_tentativas() { ls -d "$FXE/repo/docs/fila/runs/$FXE_ID"/attempt-* 2>/dev/null | wc -l | tr -d ' '; }
fxe_limpa()    { [ -n "${FXE:-}" ] && rm -rf "$FXE"; return 0; }
