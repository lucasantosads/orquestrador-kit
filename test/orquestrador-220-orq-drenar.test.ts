/**
 * Etapa 2.2.0, defeito A1-13 (AP-076): a drenagem manual rodava como filha da
 * sessão do Claude Code (ou do terminal) e morria com ela no meio do ticket.
 *
 * Pronto quando: `orq drenar` sobe o loop desacoplado (nohup + sessão nova,
 * PPID 1), devolve o PID na hora e o loop segue vivo depois que o `orq` saiu.
 * Controle no mesmo teste: com um loop vivo no lock, não sobe outro.
 */
import { describe, expect, it } from 'vitest'
import { spawnSync } from 'node:child_process'
import { chmodSync, existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { criarFixture, REPO_ROOT } from './fixtures/orq-harness.js'

const vivo = (pid: number) => {
  try {
    process.kill(pid, 0)
    return true
  } catch {
    return false
  }
}
const esperar = (cond: () => boolean, ms: number) => {
  const fim = Date.now() + ms
  while (Date.now() < fim) {
    if (cond()) return true
    spawnSync('sleep', ['0.1'])
  }
  return cond()
}

describe('A1-13 · orq drenar sobe o loop desacoplado', () => {
  it('devolve o PID, o loop tem PPID 1 e sessão própria, e sobrevive ao orq', () => {
    const fx = criarFixture()
    const d = mkdtempSync(join(tmpdir(), 'orq-drenar-'))
    const marca = join(d, 'loop.txt')
    const loop = join(d, 'loop-falso.sh')
    writeFileSync(loop, `#!/bin/bash\nsleep 1\necho "pid=$$ ppid=$(ps -o ppid= -p $$ | tr -d ' ') sid=$(ps -o sess= -p $$ 2>/dev/null | tr -d ' ') pgid=$(ps -o pgid= -p $$ | tr -d ' ')" > '${marca}'\nsleep 4\n`)
    chmodSync(loop, 0o755)
    const t0 = Date.now()
    const r = spawnSync(join(REPO_ROOT, 'scripts', 'orq'), ['drenar'], {
      encoding: 'utf8',
      cwd: fx,
      env: { ...process.env, ORQ_EXEC_ROOT: fx, ORQ_DRENAR_SCRIPT: loop },
      timeout: 20_000,
    })
    expect((Date.now() - t0) / 1000).toBeLessThan(4)
    const m = /^DRENAGEM pid=(\d+)/m.exec(r.stdout)
    expect(m, `${r.stdout}${r.stderr}`).not.toBeNull()
    const pid = Number(m![1])
    expect(esperar(() => existsSync(marca), 5000)).toBe(true)
    const info = readFileSync(marca, 'utf8')
    expect(info).toContain(`pid=${pid} `)
    expect(info).toMatch(/ ppid=1 /)
    expect(info).toMatch(new RegExp(`pgid=${pid}$`, 'm'))
    expect(vivo(pid)).toBe(true)
    process.kill(pid, 'SIGKILL')
  }, 30_000)

  it('controle: com loop vivo no lock, não sobe outro e diz qual', () => {
    const fx = criarFixture()
    writeFileSync(join(fx, 'docs', 'fila', 'runs', '.local-loop.lock'), `${process.pid}\n${Math.floor(Date.now() / 1000)}\n`)
    const r = spawnSync(join(REPO_ROOT, 'scripts', 'orq'), ['drenar'], {
      encoding: 'utf8',
      cwd: fx,
      env: { ...process.env, ORQ_EXEC_ROOT: fx, ORQ_DRENAR_SCRIPT: '/bin/false' },
    })
    expect(r.stdout).toMatch(new RegExp(`loop já vivo \\(pid ${process.pid}\\)`))
    expect(r.stdout).not.toMatch(/^DRENAGEM pid=/m)
  })
})
