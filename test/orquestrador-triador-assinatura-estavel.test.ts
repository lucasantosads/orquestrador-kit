/**
 * Etapa 7f-b4, peça 1 · assinatura estável.
 *
 * Em 11/10 o diagnóstico do 243 (conteudos-infinitos) ganhou uma assinatura
 * nova a cada ~30 min sem tentativa nova (24 no histórico, de 03:54 a 15:40
 * UTC). A entrada que mudava: o `stat` (mtime e tamanho) do `runs/events.log`
 * INTEIRO, que o loop do repo acrescenta a cada drenagem
 * (`--- DRENAGEM_INICIO`, `--- OCIOSO pendentes=1 244=dependencia:243:bloqueado`,
 * `--- DRENAGEM_FIM`), embora o recorte lido (as linhas do 243) seja o mesmo.
 * Com o modelo no PATH do job, cada assinatura nova seria uma chamada paga.
 *
 * Pronto quando: a assinatura só muda quando muda algo do próprio ticket (o
 * arquivo do ticket, as tentativas dele, o motivo do bloqueio). O log
 * compartilhado entra pelo recorte (as linhas do id), não pelo stat do arquivo.
 */
import { appendFileSync, cpSync, mkdtempSync, readFileSync, statSync, utimesSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { lerRepo } from '../scripts/orquestrador/triador/leitor.js'
import { assinatura } from '../scripts/orquestrador/triador/saida.js'

const FX243 = join(import.meta.dirname, 'fixtures', 'triador-custo-real', 'conteudos-243')
const LOG = 'docs/fila/runs/events.log'
const TICKET = 'docs/fila/243-rota-e-tela-publica-de-aprovacao.md'

function repo243(): string {
  const raiz = join(mkdtempSync(join(tmpdir(), 'assinatura-243-')), 'conteudos-infinitos')
  cpSync(FX243, raiz, { recursive: true })
  return raiz
}

const assin = (raiz: string) => assinatura(lerRepo(raiz, '243'))

/** Uma drenagem ociosa do loop, como as de 11/10 (linhas reais, com o relógio andando). */
function drenagem(raiz: string, hora: string): void {
  appendFileSync(
    join(raiz, LOG),
    [
      `\n2026-10-11T${hora}:32-0300 --- DRENAGEM_INICIO alvo=staging-auto processaveis=0`,
      `2026-10-11T${hora}:35-0300 --- OCIOSO pendentes=1 244=dependencia:243:bloqueado`,
      `2026-10-11T${hora}:35-0300 --- DRENAGEM_FIM aprovados=0 bloqueados=0 adiados=0 refatiar=0 sem_progresso=0 dur=0min`,
    ].join('\n'),
  )
  const st = statSync(join(raiz, LOG))
  utimesSync(join(raiz, LOG), st.atime, new Date(st.mtimeMs + 30 * 60 * 1000))
}

describe('peça 1: assinatura estável (o 243 de 11/10)', () => {
  it('duas drenagens ociosas do loop, sem tentativa nova: a mesma assinatura', () => {
    const raiz = repo243()
    const a0 = assin(raiz)
    drenagem(raiz, '12:09')
    const a1 = assin(raiz)
    drenagem(raiz, '12:39')
    const a2 = assin(raiz)
    expect({ a1, a2 }).toEqual({ a1: a0, a2: a0 })
  })

  it('muda quando muda o ticket: o arquivo do ticket', () => {
    const raiz = repo243()
    const a0 = assin(raiz)
    writeFileSync(join(raiz, TICKET), readFileSync(join(raiz, TICKET), 'utf8') + '\nnota do humano\n')
    expect(assin(raiz)).not.toBe(a0)
  })

  it('muda quando muda o ticket: uma tentativa nova na trilha', () => {
    const raiz = repo243()
    const a0 = assin(raiz)
    appendFileSync(join(raiz, LOG), '\n2026-10-11T13:00:00-0300 243 INICIO attempt=4 model=opus')
    expect(assin(raiz)).not.toBe(a0)
  })

  it('muda quando muda o ticket: o motivo do bloqueio', () => {
    const raiz = repo243()
    const a0 = assin(raiz)
    const t = readFileSync(join(raiz, LOG), 'utf8')
    writeFileSync(join(raiz, LOG), t.replace('BLOQUEADO motivo=repeticao', 'BLOQUEADO motivo=enforcement'))
    expect(assin(raiz)).not.toBe(a0)
  })

  it('muda quando muda o ticket: um artefato de tentativa reescrito', () => {
    const raiz = repo243()
    const a0 = assin(raiz)
    const f = join(raiz, 'docs/fila/runs/243/attempt-2/gates.txt')
    writeFileSync(f, readFileSync(f, 'utf8') + 'x\n')
    expect(assin(raiz)).not.toBe(a0)
  })
})
