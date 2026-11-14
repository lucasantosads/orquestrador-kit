/**
 * Etapa 2.2.0, defeito A1-6: com o loop morto (o processo do lock não existe
 * mais) o STATUS segue dizendo `executando` e o `orq` e o painel congelam
 * nisso. O `executando` só vira "MORTO" quando passa do claude_timeout_secs
 * (peça 11), e o painel nem isso.
 *
 * Pronto quando: STATUS `executando` + lock com pid morto = "loop morto desde
 * HH:MM (pid N)" no `orq` e no painel (estado `morto`). Controle no mesmo
 * teste: com o pid do lock vivo, os dois seguem dizendo executando/rodando.
 */
import { describe, expect, it } from 'vitest'
import { spawnSync } from 'node:child_process'
import { appendFileSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { bashNoFixture, criarFixture, orq, REPO_ROOT } from './fixtures/orq-harness.js'

const PAINEL = join(REPO_ROOT, 'scripts', 'orquestrador', 'orq-painel.py')
const runs = (fx: string) => join(fx, 'docs', 'fila', 'runs')
const pidMorto = () => parseInt(spawnSync('bash', ['-c', 'echo $$'], { encoding: 'utf8' }).stdout.trim(), 10)
const hhmm = (ep: number) => new Date(ep * 1000).toTimeString().slice(0, 5)

function cenario(pid: number) {
  const fx = criarFixture([{ id: '240', status: 'em_execucao' }])
  const agora = Math.floor(Date.now() / 1000)
  const desde = agora - 600
  bashNoFixture(
    fx,
    `status_set "estado=executando" "ticket=240 · tentativa 1/3" "desde=${new Date(desde * 1000).toTimeString().slice(0, 8)}" "desde_epoch=${desde}" "fase=agente"`,
    { ORQ_TESTE: '1' },
  )
  writeFileSync(join(runs(fx), '.local-loop.lock'), `${pid}\n${desde}\n`)
  // a última linha da trilha é de quando o loop ainda vivia
  const ultimo = agora - 300
  const ts = new Date(ultimo * 1000)
  const off = -ts.getTimezoneOffset()
  const z = `${off >= 0 ? '+' : '-'}${String(Math.floor(Math.abs(off) / 60)).padStart(2, '0')}${String(Math.abs(off) % 60).padStart(2, '0')}`
  const iso = `${ts.getFullYear()}-${String(ts.getMonth() + 1).padStart(2, '0')}-${String(ts.getDate()).padStart(2, '0')}T${ts.toTimeString().slice(0, 8)}${z}`
  appendFileSync(join(runs(fx), 'events.log'), `${iso} 240 INICIO attempt=1\n`)
  return { fx, ultimo }
}

function painel(fx: string) {
  const d = mkdtempSync(join(tmpdir(), 'orq-painel-morto-'))
  writeFileSync(join(d, 'repos.json'), JSON.stringify({ $schema_versao: 1, repos: [{ caminho: fx }] }))
  const r = spawnSync('python3', [PAINEL, '--estado'], {
    encoding: 'utf8',
    env: { ...process.env, ORQ_REPOS: join(d, 'repos.json'), ORQ_TESTE: '1' },
    timeout: 60_000,
  })
  const j = JSON.parse(r.stdout) as { repos: { estado: { tipo: string; titulo: string } }[] }
  return j.repos[0]!.estado
}

describe('A1-6 · loop morto com STATUS executando', () => {
  it('pid do lock morto: orq e painel dizem "loop morto desde HH:MM (pid N)"', () => {
    const pid = pidMorto()
    const { fx, ultimo } = cenario(pid)
    const r = orq(fx)
    expect(r.out).toMatch(new RegExp(`^ESTADO +loop morto desde ${hhmm(ultimo)} \\(pid ${pid}\\)`, 'm'))
    const e = painel(fx)
    expect(e.tipo).toBe('morto')
    expect(e.titulo).toBe(`loop morto desde ${hhmm(ultimo)} (pid ${pid})`)
  }, 90_000)

  it('controle: pid do lock vivo segue executando no orq e rodando no painel', () => {
    const { fx } = cenario(process.pid)
    expect(orq(fx).out).toMatch(/^ESTADO +executando/m)
    expect(painel(fx).tipo).toBe('rodando')
  }, 90_000)
})
