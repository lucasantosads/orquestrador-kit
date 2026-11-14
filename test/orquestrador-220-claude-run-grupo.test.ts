/**
 * Etapa 2.2.0, defeito A1-2 (docs/defeitos/2026-11-12-kill-do-grupo-sem-teste.md).
 *
 * `claude_run` dizia matar o GRUPO do agente, mas `( set -m; exec claude )` num
 * subshell sem job control não cria grupo: o `kill -TERM -<pid>` falhava, o
 * fallback matava só o líder e o neto (um `npx vitest` que o agente disparou)
 * seguia vivo, órfão, queimando CPU e cota.
 *
 * O `claude` falso dispara um neto (`sleep 60 &`, pid gravado em arquivo) e
 * dorme além do timeout. Pronto quando: rc 124, neto vivo antes do corte e
 * morto logo depois dele, e a duração do claude_run < timeout + 15 s.
 */
import { describe, expect, it } from 'vitest'
import { spawnSync } from 'node:child_process'
import { chmodSync, existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { criarFixture, LIB } from './fixtures/orq-harness.js'

const vivo = (pid: number) => {
  try {
    process.kill(pid, 0)
    return true
  } catch {
    return false
  }
}

describe('A1-2 · claude_run mata o grupo do agente no timeout', () => {
  it('neto vivo antes do corte, morto logo após; rc 124; duração < timeout + 15 s', () => {
    const raiz = criarFixture()
    const bin = mkdtempSync(join(tmpdir(), 'orq-claude-grupo-'))
    const neto = join(bin, 'neto.pid')
    const antes = join(bin, 'neto-vivo-antes')
    // o agente: um neto em segundo plano, e ele próprio dorme além do timeout
    writeFileSync(
      join(bin, 'claude'),
      `#!/bin/bash\nsleep 60 &\necho $! > '${neto}'\nkill -0 $! && touch '${antes}'\nsleep 60\n`,
    )
    chmodSync(join(bin, 'claude'), 0o755)
    const t0 = Date.now()
    const r = spawnSync(
      'bash',
      ['-c', [`export ORQ_EXEC_ROOT="${raiz}"`, `source "${LIB}"`, 'set +e', `claude_run "${raiz}" "${join(bin, 'out.txt')}" 2 -- -p x`, 'echo "rc=$?"'].join('\n')],
      { encoding: 'utf8', cwd: raiz, env: { ...process.env, PATH: `${bin}:${process.env.PATH}` } },
    )
    const dur = (Date.now() - t0) / 1000
    expect(r.stdout, r.stderr).toContain('rc=124')
    expect(existsSync(antes)).toBe(true)
    const pid = Number(readFileSync(neto, 'utf8').trim())
    expect(pid).toBeGreaterThan(1)
    // "logo após o corte": dá 1 s para o kernel recolher o sinal
    spawnSync('sleep', ['1'])
    const netoVivo = vivo(pid)
    if (netoVivo) process.kill(pid, 'SIGKILL') // não deixa lixo na máquina
    expect(netoVivo, `neto ${pid} sobreviveu ao corte do claude_run`).toBe(false)
    expect(dur).toBeLessThan(2 + 15)
  }, 40_000)

  it('controle: claude que termina sozinho sai com o rc dele, sem esperar o timeout', () => {
    const raiz = criarFixture()
    const bin = mkdtempSync(join(tmpdir(), 'orq-claude-grupo-'))
    writeFileSync(join(bin, 'claude'), '#!/bin/bash\necho ok\nexit 3\n')
    chmodSync(join(bin, 'claude'), 0o755)
    const t0 = Date.now()
    const r = spawnSync(
      'bash',
      ['-c', [`export ORQ_EXEC_ROOT="${raiz}"`, `source "${LIB}"`, 'set +e', `claude_run "${raiz}" "${join(bin, 'out.txt')}" 30 -- -p x`, 'echo "rc=$?"'].join('\n')],
      { encoding: 'utf8', cwd: raiz, env: { ...process.env, PATH: `${bin}:${process.env.PATH}` } },
    )
    expect(r.stdout, r.stderr).toContain('rc=3')
    expect(readFileSync(join(bin, 'out.txt'), 'utf8')).toContain('ok')
    expect((Date.now() - t0) / 1000).toBeLessThan(10)
  }, 40_000)
})

describe('A1-2 · sinal no executor leva o grupo do agente junto', () => {
  it('TERM no shell que roda claude_run: o trap chama claude_run_encerrar e o neto morre', () => {
    const raiz = criarFixture()
    const bin = mkdtempSync(join(tmpdir(), 'orq-claude-grupo-'))
    const neto = join(bin, 'neto.pid')
    writeFileSync(join(bin, 'claude'), `#!/bin/bash\nsleep 60 &\necho $! > '${neto}'\nsleep 60\n`)
    chmodSync(join(bin, 'claude'), 0o755)
    const script = [
      `export ORQ_EXEC_ROOT="${raiz}"`,
      `source "${LIB}"`,
      'set +e',
      "trap 'claude_run_encerrar; exit 143' TERM",
      `claude_run "${raiz}" "${join(bin, 'out.txt')}" 120 -- -p x`,
    ].join('\n')
    // o shell recebe TERM assim que o neto existe
    const r = spawnSync(
      'bash',
      ['-c', `bash -c '${script.replace(/'/g, "'\\''")}' & sh_pid=$!; for i in $(seq 1 100); do [ -s '${neto}' ] && break; sleep 0.1; done; kill -TERM $sh_pid; wait $sh_pid; echo "rc=$?"`],
      { encoding: 'utf8', cwd: raiz, env: { ...process.env, PATH: `${bin}:${process.env.PATH}` }, timeout: 30_000 },
    )
    expect(r.stdout, r.stderr).toContain('rc=143')
    const pid = Number(readFileSync(neto, 'utf8').trim())
    spawnSync('sleep', ['1'])
    const netoVivo = vivo(pid)
    if (netoVivo) process.kill(pid, 'SIGKILL')
    expect(netoVivo, `neto ${pid} sobreviveu ao TERM do executor`).toBe(false)
  }, 40_000)
})
