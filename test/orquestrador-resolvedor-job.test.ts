/**
 * Etapa 7f-b2, peça 8 · o job do launchd (com.orq.resolvedor).
 *
 * Pronto quando:
 *   - `instalar-job.sh --dry-run` só imprime o plist (label com.orq.resolvedor,
 *     a cada 300 s, job.sh do checkout, plist válido) e não escreve nada nem
 *     chama launchctl;
 *   - sem --dry-run, com ORQ_TESTE=1, recusa antes de escrever ou chamar
 *     launchctl (quem instala é o humano);
 *   - o job.sh respeita o interruptor (sai em 0 sem chamar o node) e a trava
 *     global (outra passada rodando: nada roda).
 * Nenhum launchctl de verdade: um falso na frente do PATH registra se foi chamado.
 */
import { spawnSync } from 'node:child_process'
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { ambiente } from './resolvedor-repo.js'

const RAIZ = join(import.meta.dirname, '..')
const DIR = join(RAIZ, 'scripts', 'orquestrador', 'resolvedor')

describe('peça 8: o job do launchd', () => {
  let home: string
  let bin: string
  let amb: ReturnType<typeof ambiente>
  let env: Record<string, string>
  beforeAll(() => {
    home = mkdtempSync(join(tmpdir(), 'resolvedor-home-'))
    bin = join(home, 'bin')
    mkdirSync(bin)
    writeFileSync(join(bin, 'launchctl'), `#!/bin/bash\necho "$@" >> '${join(home, 'launchctl-chamado')}'\n`)
    chmodSync(join(bin, 'launchctl'), 0o755)
    amb = ambiente()
    env = { ...(process.env as Record<string, string>), ...amb.env, HOME: home, PATH: `${bin}:${process.env.PATH}`, ORQ_TESTE: '1' }
  })
  afterAll(() => undefined)

  const instalar = (...a: string[]) => spawnSync('bash', [join(DIR, 'instalar-job.sh'), ...a], { encoding: 'utf8', env })
  const job = (extra: Record<string, string> = {}) => spawnSync('bash', [join(DIR, 'job.sh')], { encoding: 'utf8', env: { ...env, ...extra } })

  it('--dry-run só imprime o plist', () => {
    const p = instalar('--dry-run')
    expect(p.status, p.stderr).toBe(0)
    expect(p.stdout).toContain('<string>com.orq.resolvedor</string>')
    expect(p.stdout).toMatch(/<key>StartInterval<\/key>\s*<integer>300<\/integer>/)
    expect(p.stdout).toContain(`<string>${RAIZ}/scripts/orquestrador/resolvedor/job.sh</string>`)
    expect(p.stdout).toContain(`<string>${home}/.orq/resolvedor/job.log</string>`)
    expect(p.stdout).not.toContain('{{')
    expect(p.stderr).toContain('--dry-run: nada e escrito')
    if (existsSync('/usr/bin/plutil')) {
      const l = spawnSync('/usr/bin/plutil', ['-lint', '-'], { input: p.stdout, encoding: 'utf8' })
      expect(l.stdout.trim()).toMatch(/OK$/)
    }
    expect(existsSync(join(home, 'Library'))).toBe(false)
    expect(existsSync(join(home, '.orq'))).toBe(false)
    expect(existsSync(join(home, 'launchctl-chamado'))).toBe(false)
  })

  it('sem --dry-run, sob teste, recusa antes de escrever ou chamar launchctl', () => {
    const p = instalar()
    expect(p.status).toBe(1)
    expect(p.stderr).toMatch(/ORQ_TESTE=1 — RECUSO instalar/)
    expect(existsSync(join(home, 'Library'))).toBe(false)
    expect(existsSync(join(home, 'launchctl-chamado'))).toBe(false)
  })

  it('o job.sh respeita o interruptor: sai em 0 sem rodar a passada', () => {
    writeFileSync(amb.env.ORQ_RESOLVEDOR_PAUSADO!, '')
    const p = job()
    spawnSync('rm', ['-f', amb.env.ORQ_RESOLVEDOR_PAUSADO!])
    expect(p.status).toBe(0)
    expect(p.stdout).toMatch(/resolvedor pausado .*: nada rodou/)
    expect(p.stdout).not.toMatch(/passada/)
    expect(existsSync(amb.env.ORQ_RESOLVEDOR_DIR!)).toBe(false)
  })

  it('o job.sh roda uma passada; com outra passada segurando a trava global, nada roda', () => {
    const p = job()
    expect(p.status, p.stderr).toBe(0)
    expect(p.stdout).toMatch(/passada\n/)
    expect(p.stdout).toMatch(/-- 0 bloqueado\(s\)/)
    mkdirSync(amb.env.ORQ_RESOLVEDOR_DIR!, { recursive: true })
    writeFileSync(join(amb.env.ORQ_RESOLVEDOR_DIR!, 'resolver.lock'), JSON.stringify({ pid: 1, hora: new Date().toISOString() }))
    const q = job()
    expect(q.status).toBe(0)
    expect(q.stdout).toMatch(/outra passada do resolvedor está rodando: nada rodou/)
    expect(readFileSync(join(amb.env.ORQ_RESOLVEDOR_DIR!, 'resolver.lock'), 'utf8')).toContain('"pid":1')
  })
})
