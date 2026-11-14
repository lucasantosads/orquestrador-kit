/**
 * Etapa 2.2.0, defeito A1-9 (AP-066): `orq` chamado de dentro de uma worktree
 * lia a fila do checkout PRINCIPAL (lib.sh resolve MAIN_CHECKOUT pelo
 * --git-common-dir), e quem conferia o mapa ou a fila da sua frente via a de
 * outra branch.
 *
 * Pronto quando: de dentro de uma worktree, os verbos de leitura usam o
 * toplevel dela. Controle no mesmo teste: do checkout principal, a fila dele;
 * e `pausar` (que mexe no loop) segue escrevendo no principal.
 */
import { describe, expect, it } from 'vitest'
import { spawnSync } from 'node:child_process'
import { cpSync, existsSync, mkdirSync, mkdtempSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { configDeReferencia, REPO_ROOT } from './fixtures/orq-harness.js'

const ticket = (id: string, status: string) =>
  `# ${id}\n\n\`\`\`json\n${JSON.stringify({ id, slug: `t-${id}`, status, dependencias: [], objetivo: 'x', pathspec_allowlist: ['a.ts'], criterios_aceite: [] }, null, 2)}\n\`\`\`\n`

describe('A1-9 · orq de dentro de uma worktree usa a worktree', () => {
  it('fila da worktree na worktree; fila do principal no principal; pausar vai ao principal', () => {
    const base = mkdtempSync(join(tmpdir(), 'orq-wt-'))
    const repo = join(base, 'repo')
    mkdirSync(join(repo, 'docs', 'fila'), { recursive: true })
    writeFileSync(join(repo, 'docs', 'fila', '000-config.json'), configDeReferencia())
    writeFileSync(join(repo, 'docs', 'fila', '001-t-001.md'), ticket('001', 'pendente'))
    writeFileSync(join(repo, '.gitignore'), 'node_modules\ndocs/fila/runs/\ndocs/fila/PAUSAR\n')
    cpSync(join(REPO_ROOT, 'scripts'), join(repo, 'scripts'), { recursive: true })
    const g = (cwd: string, ...a: string[]) => spawnSync('git', ['-C', cwd, '-c', 'user.email=t@t', '-c', 'user.name=t', ...a], { encoding: 'utf8' })
    g(repo, 'init', '-q', '-b', 'main')
    g(repo, 'add', '-A')
    g(repo, 'commit', '-qm', 'base')
    const wt = join(base, 'wt')
    g(repo, 'worktree', 'add', '-q', '-b', 'frente', wt)
    for (const d of [repo, wt]) {
      mkdirSync(join(d, 'node_modules', '.bin'), { recursive: true })
      symlinkSync(join(REPO_ROOT, 'node_modules', '.bin', 'tsx'), join(d, 'node_modules', '.bin', 'tsx'))
    }
    writeFileSync(join(wt, 'docs', 'fila', '002-t-002.md'), ticket('002', 'pendente'))
    const env = { ...process.env }
    delete env.ORQ_EXEC_ROOT
    const orq = (cwd: string, ...a: string[]) => spawnSync(join(cwd, 'scripts', 'orq'), a, { encoding: 'utf8', cwd, env })
    const naWt = orq(wt, 'fila')
    expect(naWt.stdout).toMatch(/pendente +002/)
    // o `orq` do principal chamado de dentro da worktree também usa a worktree
    const doPrincipal = spawnSync(join(repo, 'scripts', 'orq'), ['fila'], { encoding: 'utf8', cwd: wt, env })
    expect(doPrincipal.stdout).toMatch(/pendente +002/)
    // controle: do principal, só a fila do principal
    const noPrincipal = orq(repo, 'fila')
    expect(noPrincipal.stdout).toMatch(/pendente +001/)
    expect(noPrincipal.stdout).not.toMatch(/002/)
    // pausar mexe no loop: vai ao principal mesmo de dentro da worktree
    orq(wt, 'pausar', 'teste')
    expect(existsSync(join(repo, 'docs', 'fila', 'PAUSAR'))).toBe(true)
    expect(existsSync(join(wt, 'docs', 'fila', 'PAUSAR'))).toBe(false)
  }, 60_000)
})
