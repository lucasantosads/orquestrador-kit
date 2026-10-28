/**
 * Etapa L11-P2 — duas flags no `gates.ts --run-cli` para o gate de instável.
 *
 * `--saida-falha <arq>`: a saída INTEIRA do gate que reprovou (o gates.txt guarda
 * só o recorte de 40 linhas, e as guardas de Unhandled e de contagem leem o fim
 * dela). `--retomar-depois <gate>`: roda só os gates depois dele na ordem. Sem
 * isso, com o vitest vermelho só por instável, o build que vem depois nunca rodou
 * (rodarGates para no primeiro que reprova) e o ticket seria aprovado sem build.
 * Sem as flags, a saída é byte a byte a de antes.
 */
import { describe, it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { REPO_ROOT } from './fixtures/orq-harness.js';

const VITEST_1523 = join(REPO_ROOT, 'test', 'fixtures', 'instavel-l11', 'vitest-1523-attempt-1.txt');

/** Ordem do Comarka: tsc, vitest, build. O vitest imprime a saída real do 1523 e sai 1. */
function repo(): { raiz: string; cfg: string } {
  const raiz = mkdtempSync(join(tmpdir(), 'orq-l11-gates-'));
  const cfg = join(raiz, 'config.json');
  writeFileSync(
    cfg,
    JSON.stringify({
      _execucao_dos_gates: { ordem_obrigatoria: ['tsc', 'vitest', 'build'], interrupcao: 'NAO_VALE_PARCIALMENTE' },
      gates: [
        { nome: 'tsc', cmd: 'echo tsc >> rodou.txt', tipo: 'exit_code' },
        { nome: 'vitest', cmd: `echo vitest >> rodou.txt; cat '${VITEST_1523}'; exit 1`, tipo: 'exit_code' },
        { nome: 'build', cmd: 'echo build >> rodou.txt', tipo: 'exit_code' },
      ],
    }),
  );
  return { raiz, cfg };
}

function gates(raiz: string, cfg: string, ...extra: string[]) {
  const r = spawnSync(
    join(REPO_ROOT, 'node_modules', '.bin', 'tsx'),
    [join(REPO_ROOT, 'scripts', 'orquestrador', 'gates.ts'), '--run-cli', raiz, '--config', cfg, ...extra],
    { encoding: 'utf8' },
  );
  const rodou = existsSync(join(raiz, 'rodou.txt')) ? readFileSync(join(raiz, 'rodou.txt'), 'utf8') : '';
  rmSync(join(raiz, 'rodou.txt'), { force: true });
  return { rc: r.status, out: r.stdout.replace(/ +\d+ms/g, ' Nms'), err: r.stderr, rodou };
}

describe('L11-P2 · gates.ts --saida-falha e --retomar-depois', () => {
  it('sem flag: para no vitest, o build não roda, e nada além do gates.txt é escrito', () => {
    const { raiz, cfg } = repo();
    try {
      const r = gates(raiz, cfg);
      expect(r.rc).toBe(1);
      expect(r.rodou).toBe('tsc\nvitest\n');
      expect(r.out).toMatch(/^ok {3}tsc .*\nFALHA vitest .*— exit 1\nVEREDITO: REPROVADO\n\n--- recorte de vitest ---\n/);
    } finally {
      rmSync(raiz, { recursive: true, force: true });
    }
  });

  it('--saida-falha grava a saída inteira do gate que reprovou; o stdout não muda', () => {
    const { raiz, cfg } = repo();
    try {
      const sem = gates(raiz, cfg);
      const arq = join(raiz, 'saida-vitest.txt');
      const com = gates(raiz, cfg, '--saida-falha', arq);
      expect(com.out).toBe(sem.out);
      expect(readFileSync(arq, 'utf8')).toBe(readFileSync(VITEST_1523, 'utf8'));
    } finally {
      rmSync(raiz, { recursive: true, force: true });
    }
  });

  it('--retomar-depois vitest roda só o build; nome que não existe falha alto', () => {
    const { raiz, cfg } = repo();
    try {
      const r = gates(raiz, cfg, '--retomar-depois', 'vitest');
      expect(r.rc).toBe(0);
      expect(r.rodou).toBe('build\n');
      expect(r.out).toBe('ok   build Nms\nVEREDITO: APROVADO\n');
      const x = gates(raiz, cfg, '--retomar-depois', 'nao-existe');
      expect(x.rc).toBe(2);
      expect(x.err).toContain("--retomar-depois: gate 'nao-existe' não está na ordem");
      expect(x.rodou).toBe('');
    } finally {
      rmSync(raiz, { recursive: true, force: true });
    }
  });
});
