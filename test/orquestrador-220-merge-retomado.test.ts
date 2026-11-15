/**
 * Etapa 2.2.0 · D3, achado no ciclo 5 do repo instalado (21:11, 14/11).
 *
 * O K3 suspende o merge de um ticket aprovado quando o PAUSAR aparece durante a
 * execução: o ticket fica `aguardando_merge`, com a frente intacta. Mas nada o
 * retomava: a drenagem só escolhe `pendente`, e o disparo seguinte, já sem
 * pausa, dizia "fila sem ticket processável" com o 024 parado.
 *
 * Pronto quando: sem pausa, a drenagem mergeia na alvo todo ticket em
 * `aguardando_merge` cuja frente existe (MERGE na trilha, status done) ANTES
 * de escolher pendentes, sem chamar o executor para ele; controle: com o
 * PAUSAR presente o mesmo ticket segue `aguardando_merge` e a alvo não anda.
 */
import { describe, expect, it } from 'vitest'
import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, realpathSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { configDeReferencia, REPO_ROOT } from './fixtures/orq-harness.js'

const LOOP = join(REPO_ROOT, 'scripts', 'orquestrador', 'local-loop.sh')

function cenario(pausado: boolean) {
  const base = realpathSync(mkdtempSync(join(tmpdir(), 'orq-d3-')))
  const d = join(base, 'repo')
  const g = (cwd: string, ...a: string[]) => spawnSync('git', ['-C', cwd, '-c', 'user.email=t@t', '-c', 'user.name=t', ...a], { encoding: 'utf8' })
  mkdirSync(join(d, 'docs', 'fila', 'runs'), { recursive: true })
  const cfg = JSON.parse(configDeReferencia()) as Record<string, any>
  cfg.branch_alvo = 'staging-auto'
  cfg.branch_principal = 'main'
  cfg.branch_protegida = 'main'
  writeFileSync(join(d, 'docs', 'fila', '000-config.json'), JSON.stringify(cfg, null, 2))
  const j = { id: '961', slug: 't', status: 'aguardando_merge', origem: 'humano', objetivo: 'x', pathspec_allowlist: ['a.txt'], dependencias: [], criterios_aceite: [] }
  writeFileSync(join(d, 'docs', 'fila', '961-t.md'), `# 961\n\n\`\`\`json\n${JSON.stringify(j, null, 2)}\n\`\`\`\n`)
  writeFileSync(join(d, '.gitignore'), 'docs/fila/runs/\ndocs/fila/PAUSAR\n')
  g(d, 'init', '-q', '-b', 'main')
  g(d, 'add', '-A')
  g(d, 'commit', '-qm', 'base')
  g(d, 'branch', 'staging-auto')
  g(d, 'worktree', 'add', '-q', `${d}.staging`, 'staging-auto')
  g(d, 'worktree', 'add', '-q', '-b', 'frente/961', `${d}.frente`, 'main')
  writeFileSync(join(`${d}.frente`, 'a.txt'), 'x\n')
  g(`${d}.frente`, 'add', 'a.txt')
  g(`${d}.frente`, 'commit', '-qm', 'frente 961')
  if (pausado) writeFileSync(join(d, 'docs', 'fila', 'PAUSAR'), 'teste\n')
  const antes = g(d, 'rev-parse', 'staging-auto').stdout.trim()
  const r = spawnSync('bash', ['-c', `
    source '${LOOP}'
    set +e
    ensure_staging_worktree() { echo '${d}.staging'; }
    ticket_commit() { return 0; }
    cleanup_frente() { return 0; }
    run_executor_once() { echo EXECUTOR_CHAMADO; return 0; }
    drenar
  `], { encoding: 'utf8', env: { ...process.env, ORQ_EXEC_ROOT: d, LOCAL_LOOP_SOURCED: '1' } })
  const depois = g(d, 'rev-parse', 'staging-auto').stdout.trim()
  const ticket = readFileSync(join(d, 'docs', 'fila', '961-t.md'), 'utf8')
  let ev = ''
  try { ev = readFileSync(join(d, 'docs', 'fila', 'runs', 'events.log'), 'utf8') } catch { /* sem trilha */ }
  const naAlvo = g(d, 'merge-base', '--is-ancestor', 'frente/961', 'staging-auto').status === 0
  return { saida: `${r.stdout}${r.stderr}`, antes, depois, ticket, ev, naAlvo }
}

describe('D3 · merge suspenso pela pausa é retomado na drenagem seguinte', () => {
  it('sem pausa: aguardando_merge entra na alvo, vira done, MERGE na trilha, sem executor', () => {
    const r = cenario(false)
    expect(r.naAlvo, r.saida).toBe(true)
    expect(r.ticket).toMatch(/"status": "done"/)
    expect(r.ev).toMatch(/ 961 MERGE alvo=staging-auto/)
    expect(r.saida).not.toContain('EXECUTOR_CHAMADO')
  }, 60_000)

  it('controle: com o PAUSAR, segue aguardando_merge e a alvo não anda', () => {
    const r = cenario(true)
    expect(r.naAlvo).toBe(false)
    expect(r.depois).toBe(r.antes)
    expect(r.ticket).toMatch(/"status": "aguardando_merge"/)
  }, 60_000)
})
