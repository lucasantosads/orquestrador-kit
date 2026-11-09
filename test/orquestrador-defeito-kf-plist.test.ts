/**
 * Defeito KF-2 · o plist renderizado não suja a árvore do kit.
 *
 * O instalar-launchd.sh grava o plist instanciado em
 * scripts/orquestrador/<launchd.label>.plist, dentro do checkout. Os repos da
 * frota ignoram esse arquivo no .gitignore deles; o kit não ignorava, e no
 * canário 001 da fila do kit (09/11) o preflight adiou o ticket por árvore suja:
 * `?? scripts/orquestrador/com.orquestrador-kit.orquestrador.plist`.
 * Registro: docs/defeitos/2026-11-09-plist-launchd-suja-arvore-do-kit.md.
 *
 * O checkout de teste é um repo git descartável com o .gitignore REAL do kit,
 * o instalador e o config da fila do kit (cópia do real), instalado como o kit
 * se instala (`--config docs/fila-kit/000-config.json`). O launchctl é o stub e
 * o HOME é descartável: nada alcança o launchd de verdade.
 */
import { describe, it, expect } from 'vitest';
import { copyFileSync, cpSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { REPO_ROOT, comLaunchctlStub } from './fixtures/orq-harness.js';

const git = (dir: string, ...args: string[]) =>
  spawnSync('git', ['-C', dir, ...args], { encoding: 'utf8' });

function checkoutDoKit(): string {
  const dir = mkdtempSync(join(tmpdir(), 'orq-defeito-kf-plist-'));
  copyFileSync(join(REPO_ROOT, '.gitignore'), join(dir, '.gitignore'));
  cpSync(join(REPO_ROOT, 'scripts', 'orquestrador'), join(dir, 'scripts', 'orquestrador'), { recursive: true });
  mkdirSync(join(dir, 'docs', 'fila-kit'), { recursive: true });
  copyFileSync(
    join(REPO_ROOT, 'test', 'fixtures', 'defeito-kf', 'config-fila-kit.json'),
    join(dir, 'docs', 'fila-kit', '000-config.json'),
  );
  git(dir, 'init', '-q');
  git(dir, 'add', '.gitignore', 'scripts', 'docs');
  const c = git(dir, '-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '-q', '--no-gpg-sign', '-m', 'base');
  if (c.status !== 0) throw new Error(`commit do checkout de teste: ${c.stderr}`);
  return dir;
}

describe('instalar-launchd.sh: o plist gerado não suja a árvore do kit (defeito KF-2)', () => {
  it('depois da instalação com stub, o git status do checkout fica limpo', () => {
    const dir = checkoutDoKit();
    const stub = comLaunchctlStub();
    try {
      expect(git(dir, 'status', '--porcelain').stdout).toBe('');
      const r = spawnSync(
        'bash',
        [join(dir, 'scripts', 'orquestrador', 'instalar-launchd.sh'), '--permitir-tmp', '--config', 'docs/fila-kit/000-config.json'],
        { encoding: 'utf8', cwd: dir, env: { ...process.env, ...stub.env, ORQ_CONFIG: '' } },
      );
      expect(r.status, `${r.stdout}${r.stderr}`).toBe(0);
      // O plist foi mesmo gerado na árvore: o teste não passa por ele ter sumido.
      expect(r.stdout).toContain('scripts/orquestrador/com.orquestrador-kit.orquestrador.plist');
      expect(stub.chamadas().some((c) => c.startsWith('bootstrap gui/'))).toBe(true);
      expect(git(dir, 'status', '--porcelain').stdout).toBe('');
    } finally {
      rmSync(dir, { recursive: true, force: true });
      rmSync(join(stub.home, '..'), { recursive: true, force: true });
    }
  });
});
