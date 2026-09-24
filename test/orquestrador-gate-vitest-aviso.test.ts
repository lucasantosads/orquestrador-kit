/**
 * Gate de ticket — duas regras de 21/09/2026.
 *
 * (a) REPROVA critério que interpreta a SAÍDA TEXTUAL do vitest em vez do rc.
 *     `vitest run 2>&1 | tail -5` com espera "passed" casa `Tests 1 failed | 5
 *     passed`; `| grep -E 'passed|failed'` idem. Verde com teste vermelho. A
 *     forma certa é ler o rc: `>/dev/null 2>&1 && echo OK`, `; echo rc=$?`, ou
 *     `! vitest ... && echo X`. `vitest list | grep -c` conta testes, não
 *     interpreta resultado — fica permitido.
 *
 * (b) AVISA (não reprova) quando o objetivo cita caminho de arquivo que a
 *     allowlist não cobre. O 488 antes do refatiamento mandava usar
 *     detalhe-mensagem.ts, fora da allowlist, e o juiz reprovou três vezes pelo
 *     mesmo ponto. Citações depois de "FORA DE ESCOPO" ou de "PROIBIDO" (desde
 *     22/09/2026) não contam: ali, por definição, o caminho está fora da
 *     allowlist.
 */
import { describe, it, expect } from 'vitest';
import { join } from 'node:path';
import {
  caminhosForaDaAllowlist,
  lerFila,
  saidaTextualDoVitest,
  validar,
} from '../scripts/orquestrador/gate-ticket.js';

const FILA = join(__dirname, 'fixtures', 'gate-ticket-grep-q');
const CFG = { proibido_no_cmd: [], cmd_prefixos_permitidos: [] };

describe('(a) saída textual do vitest reprova', () => {
  it.each([
    'node_modules/.bin/vitest run 2>&1 | tail -5',
    "npx vitest run src/lib/comercial/midia 2>&1 | grep -E 'passed|failed'",
    "{ npx vitest run visao-consolidada --reporter=dot 2>&1 | grep -cE '[1-9][0-9]* passed' || true; }",
    'node_modules/.bin/vitest run src/lib/format.test.ts 2>&1 | tail -5',
    'npm run test 2>&1 | tail -3',
    'pnpm test | grep passed',
    'vitest run x | grep passed',
  ])('reprova: %s', (cmd) => {
    expect(saidaTextualDoVitest(cmd)).toBe(true);
  });

  it.each([
    'node_modules/.bin/vitest run scripts/x.test.ts >/dev/null 2>&1 && echo ok',
    'node_modules/.bin/vitest run src/a.test.ts >/dev/null 2>&1; echo rc=$?',
    "git checkout $BASE_REF -- a.ts && ! node_modules/.bin/vitest run a.test.ts -t 'dispara: x' >/dev/null 2>&1 && echo VERMELHO; git checkout HEAD -- a.ts",
    "{ node_modules/.bin/vitest list a.test.ts -t 'x' 2>/dev/null | grep -c . || true; }",
    "{ node_modules/.bin/vitest list --filesOnly 2>/dev/null | grep -c '^src/' || true; }",
    "grep -c 'vitest run | tail' package.json",
    'node_modules/.bin/vitest run >/dev/null 2>&1 && echo TESTS_OK',
  ])('não reprova: %s', (cmd) => {
    expect(saidaTextualDoVitest(cmd)).toBe(false);
  });

  it('entra no validar como violação do critério', () => {
    const fila = lerFila(FILA);
    const v = validar(fila.filter((t) => t.arquivo.includes('903-')), fila, CFG);
    expect(v.some((x) => !x.aviso && x.campo.startsWith('criterios_aceite') && /vitest: saída textual/.test(x.mensagem))).toBe(true);
  });
});

describe('(b) caminho do objetivo fora da allowlist avisa', () => {
  it.each<[string, string, string[], string[]]>([
    ['coberto exato', 'Edite src/a.ts.', ['src/a.ts'], []],
    ['fora', 'Edite src/a.ts e também src/b.ts.', ['src/a.ts'], ['src/b.ts']],
    ['nome solto casa o fim de um item', 'Ajuste persistencia.test.ts.', ['src/lib/ingestao/persistencia.test.ts'], []],
    ['nome solto fora', 'Use o caminho de detalhe-mensagem.ts.', ['src/lib/adapter.ts'], ['detalhe-mensagem.ts']],
    ['glob da allowlist cobre', 'Mude src/lib/midia/pipeline.ts.', ['src/lib/midia/**'], []],
    ['depois de FORA DE ESCOPO não conta', 'Edite src/a.ts. FORA DE ESCOPO: src/b.ts e ingest.ts.', ['src/a.ts'], []],
    // 22/09/2026: "PROIBIDO:" lista o que o ticket NÃO pode tocar — por
    // definição fora da allowlist, mesmo tratamento de FORA DE ESCOPO. Era o
    // aviso falso de todo ticket que proíbe tocar arquivo nomeado.
    ['depois de PROIBIDO não conta', 'Edite src/a.ts. PROIBIDO: alterar src/b.ts ou decisao.ts.', ['src/a.ts'], []],
    ['o PRIMEIRO dos dois cortes vale', 'Edite src/a.ts. PROIBIDO: src/b.ts. FORA DE ESCOPO: src/c.ts.', ['src/a.ts'], []],
    ['antes do PROIBIDO continua avisando', 'Edite src/a.ts e src/x.ts. PROIBIDO: src/b.ts.', ['src/a.ts'], ['src/x.ts']],
    ['glob de diretório citado fora', 'Toque src/lib/midia/** inteiro.', ['src/a.ts'], ['src/lib/midia/**']],
  ])('%s', (_nome, objetivo, allowlist, esperado) => {
    expect(caminhosForaDaAllowlist(objetivo, allowlist)).toEqual(esperado);
  });

  it('o 488 antes do refatiamento (fixture 903) dispara o aviso, e o aviso NÃO é violação', () => {
    const fila = lerFila(FILA);
    const v = validar(fila.filter((t) => t.arquivo.includes('903-')), fila, CFG);
    const avisos = v.filter((x) => x.aviso && x.campo === 'objetivo');
    expect(avisos.length).toBe(1);
    expect(avisos[0]!.mensagem).toMatch(/detalhe-mensagem\.ts/);
  });

  it('o 902 (objetivo sem caminho) não avisa', () => {
    const fila = lerFila(FILA);
    const v = validar(fila.filter((t) => t.arquivo.includes('902-')), fila, CFG);
    expect(v).toEqual([]);
  });
});
