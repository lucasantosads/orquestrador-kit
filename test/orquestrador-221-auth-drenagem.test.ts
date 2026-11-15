/**
 * Etapa 2.2.1, D6 · a drenagem com o login do claude expirado no meio de um ticket.
 *
 * O executor devolve o ticket adiado (juiz ilegível) e a pausa auth fica de pé
 * (o claude_run gravou `AMBIENTE causa=auth`). Pronto quando: a drenagem trata
 * a volta como AMBIENTE (nada soma em `.adiamentos` nem em sem-progresso),
 * não chama o executor para o próximo ticket e os dois seguem pendentes.
 * Controle: o mesmo adiamento SEM a pausa auth soma em `.adiamentos` e a
 * drenagem segue para o próximo, como antes.
 */
import { describe, expect, it } from 'vitest'
import { spawnSync } from 'node:child_process'
import { join } from 'node:path'
import { REPO_ROOT } from './fixtures/orq-harness.js'

const DIR = join(REPO_ROOT, 'scripts', 'orquestrador')

function rodar(comAuth: boolean): string {
  const script = `
set -uo pipefail
export ORQ_TESTE=1
ORQ_EXEC_ROOT="$(mktemp -d)/checkout"; export ORQ_EXEC_ROOT
TMP="$(dirname "$ORQ_EXEC_ROOT")"
trap 'rm -rf "$TMP"' EXIT
source '${DIR}/test-fixture-drenagem.sh'
fx_config "$ORQ_EXEC_ROOT"
for id in 901 902; do fx_ticket "$ORQ_EXEC_ROOT" "$id"; done
fx_git "$ORQ_EXEC_ROOT"
LOCAL_LOOP_SOURCED=1
source '${DIR}/local-loop.sh'
set +e
ensure_staging_worktree() { echo "$ORQ_EXEC_ROOT"; }
merge_em_alvo() { return 0; }
cleanup_frente() { return 0; }
run_executor_once() {
  local id; id="$(ticket_field "$2" '.id')"
  echo "$id" >> "$TMP/calls"
  ${comAuth ? 'auth_falha_registrar juiz_ticket' : ':'}
  # causas diferentes por ticket: a mesma causa em dois já seria AMBIENTE pela régua da 7a-8
  if [ "$id" = 901 ]; then m=juiz_ilegivel; else m=servidor; fi
  event "$id" ADIADO "motivo=$m" "attempt=1" "rc=1" "dur=3s" "cooldown=nao"
  return 0
}
drenar >/dev/null 2>&1
echo "CALLS=$(paste -sd, "$TMP/calls")"
echo "ADIAMENTOS_901=$(head -1 "$RUNS_BASE/901/.adiamentos" 2>/dev/null | cut -d'|' -f1)"
echo "ST_901=$(ticket_field "$FILA_DIR/901-t.md" '.status')"
echo "ST_902=$(ticket_field "$FILA_DIR/902-t.md" '.status')"
grep ' AMBIENTE ' "$RUNS_BASE/events.log" | sed 's/^[^ ]* /EV /'
`
  const r = spawnSync('bash', ['-c', script], { encoding: 'utf8', timeout: 120_000 })
  return `${r.stdout ?? ''}${r.stderr ?? ''}`
}

describe('2.2.1 D6 · drenagem com a pausa auth', () => {
  it('volta do ticket com a pausa auth: AMBIENTE, nada soma, o próximo não é chamado', () => {
    const out = rodar(true)
    expect(out).toMatch(/^CALLS=901$/m)
    expect(out).toMatch(/^ADIAMENTOS_901=$/m)
    expect(out).toMatch(/^ST_901=pendente$/m)
    expect(out).toMatch(/^ST_902=pendente$/m)
    expect(out).toMatch(/AMBIENTE tickets=901 causa=auth/)
  }, 120_000)

  it('controle: o mesmo adiamento sem a pausa auth soma e a drenagem segue', () => {
    const out = rodar(false)
    expect(out).toMatch(/^CALLS=901,902$/m)
    expect(out).toMatch(/^ADIAMENTOS_901=1$/m)
    expect(out).not.toMatch(/causa=auth/)
  }, 120_000)
})
