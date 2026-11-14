/**
 * Etapa 2.2.0, defeito A1-1 (docs/defeitos/2026-11-12-lock-stale-importa-lock-js.md).
 *
 * `lock_stale` importava `lock.js`, que não existe (o arquivo é lock.ts): com o
 * tsx de hoje o import falha, o rc 1 era lido como "não é órfão", e um lock de
 * run morto nunca era removido. Toda drenagem seguinte encerrava em "outro run
 * vivo" sem alarme.
 *
 * Pronto quando: lock órfão (pid morto, epoch antigo) gera
 * `RECUPERADO motivo=lock-orfao` e o lock é tomado; lock de pid vivo continua
 * "outro run vivo" (rc 1); e falha da própria checagem (tsx que não roda) é
 * erro alto, com evento, nunca lida como "vivo".
 */
import { describe, expect, it } from 'vitest'
import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { criarFixture, REPO_ROOT } from './fixtures/orq-harness.js'

const LOOP = join(REPO_ROOT, 'scripts', 'orquestrador', 'local-loop.sh')

function adquirir(raiz: string, antes = '', subshell = false) {
  const r = spawnSync(
    'bash',
    ['-c', [`export ORQ_EXEC_ROOT="${raiz}"`, 'export LOCAL_LOOP_SOURCED=1', `source "${LOOP}"`, 'set +e', antes, subshell ? '( lock_adquirir )' : 'lock_adquirir', 'echo "rc=$?"', 'trap - EXIT'].join('\n')],
    { encoding: 'utf8', cwd: raiz },
  )
  const ev = join(raiz, 'docs', 'fila', 'runs', 'events.log')
  return { out: `${r.stdout}${r.stderr}`, eventos: existsSync(ev) ? readFileSync(ev, 'utf8') : '' }
}

describe('A1-1 · lock órfão é recuperado', () => {
  it('pid morto e epoch antigo: RECUPERADO motivo=lock-orfao e o lock passa a ser deste run', () => {
    const raiz = criarFixture()
    const lock = join(raiz, 'docs', 'fila', 'runs', '.local-loop.lock')
    writeFileSync(lock, '99999\n1000\n')
    const r = adquirir(raiz)
    expect(r.out).toContain('rc=0')
    expect(r.eventos).toMatch(/ RECUPERADO motivo=lock-orfao pid=99999/)
    expect(readFileSync(lock, 'utf8').split('\n')[0]).not.toBe('99999')
  })

  it('controle: lock de pid vivo e recente continua "outro run vivo" (rc 1), sem RECUPERADO', () => {
    const raiz = criarFixture()
    const lock = join(raiz, 'docs', 'fila', 'runs', '.local-loop.lock')
    writeFileSync(lock, `${process.pid}\n${Math.floor(Date.now() / 1000)}\n`)
    const r = adquirir(raiz)
    expect(r.out).toContain('rc=1')
    expect(r.out).toContain('outro run vivo')
    expect(r.eventos).not.toMatch(/RECUPERADO/)
  })

  it('checagem que não roda (tsx quebrado) é erro alto: rc 2 e LOCK_ERRO na trilha, nunca "outro run vivo"', () => {
    const raiz = criarFixture()
    const lock = join(raiz, 'docs', 'fila', 'runs', '.local-loop.lock')
    writeFileSync(lock, '99999\n1000\n')
    const r = adquirir(raiz, 'ORQ_TSX=( false )', true)
    expect(r.out).toContain('rc=2')
    expect(r.out).not.toContain('outro run vivo')
    expect(r.eventos).toMatch(/ LOCK_ERRO /)
  })
})
