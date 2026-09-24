/**
 * Gate de ticket — critério com `| grep -q` reprova.
 *
 * O executor avalia o critério com `set -euo pipefail` herdado
 * (executor.sh:23, `eval` em run_criterios). `cmd | grep -q X && echo ok`:
 * o `grep -q` sai no PRIMEIRO acerto e fecha o pipe, o produtor morre de
 * SIGPIPE ao escrever o resto, o `pipefail` torna o pipeline não-zero e o
 * `&& echo ok` nunca roda. Saída vazia com o teste verde — foi o que bloqueou
 * o 431 (6 tentativas, 21/09/2026) e o 472. Reproduzido: 3/3 vazio com
 * pipefail, `ok` sem.
 *
 * `grep -q` SEM pipe (lendo arquivo) não tem produtor para matar e continua
 * permitido.
 */
import { describe, it, expect } from 'vitest';
import { join } from 'node:path';
import { checarCmd, lerFila, validar } from '../scripts/orquestrador/gate-ticket.js';

const FILA = join(__dirname, 'fixtures', 'gate-ticket-grep-q');
const CFG = { proibido_no_cmd: [], cmd_prefixos_permitidos: [] };

const temGrepQ = (cmd: string) => checarCmd(cmd, CFG).some((a) => !a.isencao && /grep -q/.test(a.mensagem));

describe('fila de fixture', () => {
  const fila = lerFila(FILA);

  it('901 (o critério real do 431) reprova, e pela regra do grep -q', () => {
    const v = validar(fila.filter((t) => t.arquivo.includes('901-')), fila, CFG);
    expect(v.length).toBeGreaterThan(0);
    expect(v.some((x) => x.campo === 'criterios_aceite[0]' && /grep -q/.test(x.mensagem))).toBe(true);
  });

  it('902 (mesma intenção lendo o rc) passa limpo', () => {
    expect(validar(fila.filter((t) => t.arquivo.includes('902-')), fila, CFG)).toEqual([]);
  });
});

describe('quais formas caem', () => {
  it.each([
    "x 2>&1 | grep -q passed && echo ok",
    "x | grep -qE '[1-9] passed' && echo ok",
    "x | grep -Eq 'a' && echo ok",
    "x | grep -iqE 'a' && echo ok",
    "x | grep -qiE 'a' && echo ok",
    "x | grep -E -q 'a' && echo ok",
    "x |grep -q a && echo ok",
    "x | grep --quiet a && echo ok",
    "x | grep --silent a && echo ok",
    "find src -name p.tsx | head -1 | grep -q . && echo ok",
  ])('reprova: %s', (cmd) => {
    expect(temGrepQ(cmd)).toBe(true);
  });

  it.each([
    "x 2>&1 | grep -cE '[1-9] passed'",
    "x | grep -E 'passed|failed'",
    "grep -q fmtTempoRelativo src/lib/format.test.ts && echo pronto",
    "grep -rqi 'sem dados' src/app -l >/dev/null 2>&1 && echo ok",
    "test -f a || grep -q x b",
    "grep -E 'a| grep -q b' f",
    "x | grep -c 'q'",
  ])('não reprova: %s', (cmd) => {
    expect(temGrepQ(cmd)).toBe(false);
  });
});
