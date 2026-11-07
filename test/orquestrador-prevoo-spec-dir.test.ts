// Etapa KF, P5 (M-68): a cat.0 lê a pasta da spec de `spec_dir` (no kit, `doutrina/`). Ausente = antes; inválido = NO-GO.
import { describe, expect, it } from 'vitest';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { ARQUIVOS_SPEC, preVooDepsReais, preVooRelampago, render, type PreVooDeps } from '../scripts/orquestrador/prevoo.js';
import { CONFIGS } from './fixtures/m69/harness.js';
import { REPO_ROOT } from './fixtures/orq-harness.js';

const lerCfg = (p: string) => JSON.parse(readFileSync(p, 'utf8')) as Record<string, unknown>;
/** Deps reais sobre um checkout de papel com a spec em `pasta` (sem o SKILL.md se `semSkill`); git falso. */
function depsDePapel(pasta: string, semSkill: boolean, specDir?: string) {
  const raiz = mkdtempSync(join(tmpdir(), 'kf-p5-'));
  for (const rel of ARQUIVOS_SPEC) {
    if (semSkill && rel === 'SKILL.md') continue;
    mkdirSync(join(raiz, pasta, rel, '..'), { recursive: true });
    writeFileSync(join(raiz, pasta, rel), 'x\n');
  }
  const chamadas: string[][] = [];
  const git = (...a: string[]) => {
    chamadas.push(a);
    return { status: 0, stdout: 'a\nb\nc\nd\ne\nf\n', stderr: '' };
  };
  const reais = preVooDepsReais({ repoRoot: raiz, filaDir: join(raiz, 'fila'), runsDir: join(raiz, 'runs'), custoFile: '', git, specDir } as Parameters<typeof preVooDepsReais>[0]);
  return { raiz, deps: { ...reais, tsxLocal: () => true } as PreVooDeps, chamadas };
}

describe('KF-P5 · o pré-voo da fila do kit dá GO (a cat.0 olha a doutrina/)', () => {
  it('prevoo.ts <kit> com ORQ_CONFIG=docs/fila-kit/000-config.json sai rc 0 e GO', () => {
    const r = spawnSync(join(REPO_ROOT, 'node_modules/.bin/tsx'), [join(REPO_ROOT, 'scripts/orquestrador/prevoo.ts'), REPO_ROOT], {
      encoding: 'utf8',
      env: { ...process.env, ORQ_CONFIG: join(REPO_ROOT, 'docs/fila-kit/000-config.json') },
    });
    expect(r.stdout).toContain('ok    cat.0 spec vendorizada');
    expect(r.stdout.trimEnd().split('\n').at(-1)).toBe('GO');
    expect(r.status).toBe(0);
  });
});

describe('KF-P5 · sem spec_dir, a cat.0 do CI e do dashboard sai igual à de antes', () => {
  it.each(['ci', 'dashboard'] as const)('%s: mesma pasta, mesmo git ls-files, mesma saída', (repo) => {
    const config = lerCfg(CONFIGS[repo]);
    expect(config.spec_dir).toBeUndefined();
    const verde = depsDePapel('docs/orquestrador/skill', false);
    const falta = depsDePapel('docs/orquestrador/skill', true);
    try {
      const v = preVooRelampago({ config, deps: verde.deps });
      expect(v.itens.find((i) => i.token === 'cat.0')).toEqual({ ok: true, token: 'cat.0', item: 'spec vendorizada' });
      expect(verde.chamadas[0]).toEqual(['ls-files', 'docs/orquestrador/skill/']);
      expect(render(preVooRelampago({ config, deps: falta.deps }))).toBe(
        'ok    cat.7 toolchain (tsx do repo)\n' +
          'NO-GO cat.0 pré-voo cat.0 (spec vendorizada): docs/orquestrador/skill/SKILL.md — ausente ou vazio (test -s falhou)\n' +
          'NO-GO cat.0 · pré-voo cat.0 (spec vendorizada): docs/orquestrador/skill/SKILL.md — ausente ou vazio (test -s falhou)\n',
      );
    } finally {
      rmSync(verde.raiz, { recursive: true, force: true });
      rmSync(falta.raiz, { recursive: true, force: true });
    }
  });
});

describe('KF-P5 · spec_dir', () => {
  it('a cat.0 confere e nomeia a pasta do config', () => {
    const p = depsDePapel('doutrina', true, 'doutrina');
    const v = preVooRelampago({ config: { spec_dir: 'doutrina' }, deps: p.deps });
    rmSync(p.raiz, { recursive: true, force: true });
    expect([v.token, v.item]).toEqual(['cat.0', 'pré-voo cat.0 (spec vendorizada): doutrina/SKILL.md']);
  });
  it.each([[''], ['/abs/spec'], ['../outro/skill'], [3]])('inválido (%j) é NO-GO cat.0, nunca o padrão', (valor) => {
    const p = depsDePapel('docs/orquestrador/skill', false);
    const v = preVooRelampago({ config: { spec_dir: valor }, deps: p.deps });
    rmSync(p.raiz, { recursive: true, force: true });
    expect([v.ok, v.token]).toEqual([false, 'cat.0']);
    expect(v.motivo).toContain('spec_dir inválido');
  });
});
