/**
 * Ticket 630 (harness manual, 24/09/2026) — ticket com JSON quebrado falha alto
 * no gate e aparece no STATUS, sem parar a fila.
 *
 * Causa (23/09/2026): uma edição manual corrompeu o bloco ```json de 510, 523 e
 * 526, e `gate-ticket.ts --pendentes` deu rc=0. Numa fila sintética (900 e 903
 * done, 901 pendente com caractere de controle numa string, 902 pendente
 * válido): o gate não citava o 901 (filtro `f.json?.status === 'pendente'`), o
 * `proximo_pendente` o pulava em silêncio e o placar do STATUS.md virava
 * "sem ticket", porque um único `jq` lia a fila inteira.
 *
 * Nenhum caso carrega o executor, então o `claude` real não é alcançável.
 */
import { describe, it, expect } from 'vitest';
import { rmSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { bashNoFixture, criarFixture, escrever, ler, REPO_ROOT } from './fixtures/orq-harness.js';

const GATE_TS = join(REPO_ROOT, 'scripts', 'orquestrador', 'gate-ticket.ts');
const TSX = join(REPO_ROOT, 'node_modules', '.bin', 'tsx');

/** Pendente que o gate aprova: allowlist, critério mecânico com rc e avaliador. */
const VALIDO_902 = {
  id: '902',
  slug: 'valido',
  status: 'pendente',
  bloco: 'B6',
  risco: 'baixo',
  objetivo: 'Fixture valido do ticket 630.',
  pathspec_allowlist: ['src/nada.ts'],
  dependencias: [],
  criterios_aceite: [
    {
      tipo: 'alvo',
      descricao: 'arquivo existe',
      cmd: 'test -s src/nada.ts && echo EXISTE',
      espera: 'EXISTE',
    },
    { tipo: 'avaliador', descricao: 'avaliador: fixture.', cmd: 'true', espera: 'avaliador' },
  ],
};

function bloco(json: unknown): string {
  return `\`\`\`json\n${JSON.stringify(json, null, 2)}\n\`\`\`\n`;
}

/** 900/903 done, 901 pendente com U+0001 cru numa string (jq e JSON.parse recusam), 902 válido. */
function filaComQuebrado(): string {
  const fx = criarFixture([]);
  const fila = join(fx, 'docs', 'fila');
  const done = (id: string) => ({ ...VALIDO_902, id, slug: `feito-${id}`, status: 'done' });
  escrever(join(fila, '900-feito-900.md'), `# 900\n\n${bloco(done('900'))}`);
  escrever(join(fila, '903-feito-903.md'), `# 903\n\n${bloco(done('903'))}`);
  escrever(join(fila, '902-valido.md'), `# 902\n\n${bloco(VALIDO_902)}`);
  const quebrado = bloco({ ...VALIDO_902, id: '901', slug: 'quebrado' }).replace(
    'Fixture valido',
    'Fixture \u0001quebrado',
  );
  escrever(join(fila, '901-quebrado.md'), `# 901\n\n${quebrado}`);
  return fx;
}

function gatePendentes(fx: string): { rc: number; saida: string } {
  const r = spawnSync(TSX, [GATE_TS, '--fila', join(fx, 'docs', 'fila'), '--pendentes'], {
    encoding: 'utf8',
    cwd: fx,
  });
  return { rc: r.status ?? 1, saida: `${r.stdout ?? ''}${r.stderr ?? ''}` };
}

describe('ticket 630 — fila com ticket de JSON quebrado', () => {
  it('gate --pendentes sai com rc != 0 citando o arquivo e o erro; sem o quebrado, rc 0', () => {
    const fx = filaComQuebrado();

    const com = gatePendentes(fx);
    expect(com.rc, com.saida).not.toBe(0);
    expect(com.saida).toContain('901-quebrado.md');
    expect(com.saida).toMatch(/n[aã]o parseia/);
    // o 902 foi validado na mesma execução e não gerou violação
    expect(com.saida).not.toContain('902-valido.md');

    rmSync(join(fx, 'docs', 'fila', '901-quebrado.md'));
    const sem = gatePendentes(fx);
    expect(sem.rc, sem.saida).toBe(0);
  });

  it('gate --pendentes pega o quebrado mesmo com status done no arquivo', () => {
    const fx = filaComQuebrado();
    const fila = join(fx, 'docs', 'fila');
    rmSync(join(fila, '901-quebrado.md'));
    const doneQuebrado = bloco({ ...VALIDO_902, id: '904', slug: 'done-quebrado', status: 'done' }).replace(
      'Fixture valido',
      'Fixture \u0001quebrado',
    );
    escrever(join(fila, '904-done-quebrado.md'), `# 904\n\n${doneQuebrado}`);

    const r = gatePendentes(fx);
    expect(r.rc, r.saida).not.toBe(0);
    expect(r.saida).toContain('904-done-quebrado.md');
  });

  it('STATUS mostra a fila corrompida, o placar conta os válidos e o seletor devolve o 902', () => {
    const fx = filaComQuebrado();
    const r = bashNoFixture(
      fx,
      [
        'status_set "estado=ocioso"',
        'status_render',
        'echo "PLACAR=$(placar_fila)"',
        'echo "PROXIMO=$(basename "$(proximo_pendente)")"',
      ].join('\n'),
      { ORQ_TESTE: '1' },
    );
    const status = ler(join(fx, 'docs', 'fila', 'runs', 'STATUS.md'));

    expect(status, r.stderr).toContain('fila corrompida: 901-quebrado.md');
    expect(status).toMatch(/^CORROMPIDA fila corrompida: 901-quebrado\.md$/m);
    expect(status).not.toContain('sem ticket');

    const placar = r.stdout.match(/^PLACAR=(.*)$/m)?.[1] ?? '';
    expect(placar).toContain('2 done');
    expect(placar).toContain('1 pendente');
    expect(placar).toContain('1 corrompido');
    expect(placar).not.toContain('sem ticket');

    expect(r.stdout).toMatch(/^PROXIMO=902-valido\.md$/m);
    expect(r.stderr).toContain('fila corrompida: 901-quebrado.md');
  });

  it('bloco ```json vazio conta como corrompido (jq empty com entrada vazia sai 0)', () => {
    const fx = filaComQuebrado();
    const fila = join(fx, 'docs', 'fila');
    rmSync(join(fila, '901-quebrado.md'));
    escrever(join(fila, '905-vazio.md'), '# 905\n\n```json\n```\n');

    const r = bashNoFixture(fx, 'fila_corrompida; echo "PLACAR=$(placar_fila)"', { ORQ_TESTE: '1' });
    expect(r.stdout).toMatch(/^905-vazio\.md$/m);
    expect(r.stdout).toContain('1 corrompido');
    expect(r.stdout).toContain('1 pendente');
  });

  it('fila sem ticket quebrado: nenhuma linha de corrompida e placar sem corrompido', () => {
    const fx = filaComQuebrado();
    rmSync(join(fx, 'docs', 'fila', '901-quebrado.md'));
    const r = bashNoFixture(
      fx,
      ['status_set "estado=ocioso"', 'status_render', 'echo "PLACAR=$(placar_fila)"'].join('\n'),
      { ORQ_TESTE: '1' },
    );
    const status = ler(join(fx, 'docs', 'fila', 'runs', 'STATUS.md'));
    expect(status).toMatch(/^FILA {5}1 pendente · 2 done$/m);
    expect(status).not.toContain('CORROMPIDA');
    expect(r.stdout).not.toContain('corrompido');
  });

  it('fila vazia continua "sem ticket" no placar e no STATUS', () => {
    const fx = criarFixture([]);
    const r = bashNoFixture(
      fx,
      ['status_set "estado=ocioso"', 'status_render', 'echo "PLACAR=$(placar_fila)"'].join('\n'),
      { ORQ_TESTE: '1' },
    );
    expect(r.stdout).toMatch(/^PLACAR=sem ticket$/m);
    expect(ler(join(fx, 'docs', 'fila', 'runs', 'STATUS.md'))).toMatch(/^FILA {5}sem ticket$/m);
  });
});
