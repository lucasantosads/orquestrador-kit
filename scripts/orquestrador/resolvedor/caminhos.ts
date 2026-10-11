/**
 * caminhos.ts — onde o resolvedor escreve FORA do repo, e a porta dessa
 * escrita (etapa 7f-b2).
 *
 * Raiz: `ORQ_RESOLVEDOR_DIR`, ou `~/.orq/resolvedor`. Dentro dela:
 *   ledger.jsonl                 cada ação, desfecho, "não consegui", promoção (peça 5)
 *   dry-run.jsonl                o que a passada em --dry-run faria (nunca no ledger)
 *   resolver.lock                a trava global da passada (O_EXCL; órfã depois de 15 min)
 *   <repo>/<id>/proposta.md      a proposta em sombra (R2 sempre; R1 e R5 no modo sombra)
 *   <repo>/<id>/proposta.json    a mesma proposta, para o ledger comparar com o humano
 *   <repo>/<id>/acoes/<ts>/      o ticket antes e depois de cada ação aplicada (o desfazer usa)
 *
 * O interruptor é `ORQ_RESOLVEDOR_PAUSADO`, ou `~/.orq/RESOLVEDOR_PAUSADO`:
 * existindo, nada roda (nem triagem, nem ledger).
 *
 * GUARDA: a escrita fora do repo passa por `GuardaResolvedor`, que resolve o
 * caminho real e LANÇA se o destino não está sob a raiz (a única exceção é o
 * próprio `repos.json`, que a promoção da peça 6 regrava), ou se está dentro de
 * qualquer repo do `repos.json`. A escrita NO repo é outra porta (`repo.ts`).
 */
import { appendFileSync, closeSync, existsSync, mkdirSync, openSync, renameSync, statSync, unlinkSync, writeFileSync, writeSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, isAbsolute, join, relative, resolve } from 'node:path'
import { EscritaRecusada, arquivoRepos, caminhoReal, lerRepos } from '../triador/saida.js'

export { EscritaRecusada }

export const raizResolvedor = (): string => resolve(process.env.ORQ_RESOLVEDOR_DIR || join(homedir(), '.orq', 'resolvedor'))
export const interruptor = (): string => resolve(process.env.ORQ_RESOLVEDOR_PAUSADO || join(homedir(), '.orq', 'RESOLVEDOR_PAUSADO'))
export const arquivoLedger = (): string => join(raizResolvedor(), 'ledger.jsonl')
export const arquivoDryRun = (): string => join(raizResolvedor(), 'dry-run.jsonl')
export const dirTicket = (repo: string, id: string): string => join(raizResolvedor(), repo, id)

export const dentro = (filho: string, pai: string): boolean => {
  const r = relative(pai, filho)
  return r === '' || (!r.startsWith('..') && !isAbsolute(r))
}

export class GuardaResolvedor {
  readonly raiz: string
  private readonly repos: string
  private readonly protegidos: string[]

  constructor(protegidosExtra: string[] = []) {
    this.raiz = caminhoReal(raizResolvedor())
    this.repos = caminhoReal(arquivoRepos())
    this.protegidos = [...lerRepos().map((r) => r.caminho), ...protegidosExtra].map((p) => caminhoReal(p))
    for (const p of this.protegidos) {
      if (dentro(this.raiz, p)) throw new EscritaRecusada(`raiz do resolvedor ${this.raiz} está dentro do repo ${p}`)
    }
  }

  confere(destino: string): string {
    const real = caminhoReal(destino)
    if (!dentro(real, this.raiz) && real !== this.repos) throw new EscritaRecusada(`escrita fora de ${this.raiz}: ${real}`)
    for (const p of this.protegidos) if (dentro(real, p)) throw new EscritaRecusada(`escrita dentro do repo ${p}: ${real}`)
    return real
  }

  escrever(destino: string, conteudo: string): void {
    const real = this.confere(destino)
    // o repos.json não ganha diretório: ele já existe (a promoção só regrava)
    if (real !== this.repos) mkdirSync(this.confere(dirname(real)), { recursive: true })
    // troca atômica: quem lê (o painel, a próxima passada) nunca vê meio arquivo
    const tmp = `${real}.tmp-${process.pid}`
    if (real !== this.repos) this.confere(tmp)
    writeFileSync(tmp, conteudo)
    renameSync(tmp, real)
  }

  acrescentar(destino: string, linha: string): void {
    const real = this.confere(destino)
    mkdirSync(this.confere(dirname(real)), { recursive: true })
    appendFileSync(real, linha.endsWith('\n') ? linha : `${linha}\n`)
  }

  apagar(p: string): void {
    unlinkSync(this.confere(p))
  }

  /** Cria com O_EXCL; false se já existe. */
  criarExclusivo(p: string, conteudo: string): boolean {
    const real = this.confere(p)
    mkdirSync(this.confere(dirname(real)), { recursive: true })
    let fd: number
    try {
      fd = openSync(real, 'wx')
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === 'EEXIST') return false
      throw e
    }
    try {
      writeSync(fd, conteudo)
    } finally {
      closeSync(fd)
    }
    return true
  }
}

export const TRAVA_GLOBAL_ORFA_MS = 15 * 60 * 1000

/** A trava global da passada. `null` se outra passada a segura (e ela não é órfã). */
export function travarPassada(g: GuardaResolvedor, agora = Date.now()): (() => void) | null {
  const p = join(g.raiz, 'resolver.lock')
  const corpo = JSON.stringify({ pid: process.pid, hora: new Date(agora).toISOString() }) + '\n'
  if (!g.criarExclusivo(p, corpo)) {
    let idade = 0
    try {
      idade = Date.now() - statSync(p).mtimeMs
    } catch {
      idade = TRAVA_GLOBAL_ORFA_MS + 1
    }
    if (idade <= TRAVA_GLOBAL_ORFA_MS) return null
    try {
      g.apagar(p)
    } catch {
      /* outra passada levou a órfã */
    }
    if (!g.criarExclusivo(p, corpo)) return null
  }
  return () => {
    try {
      if (existsSync(p)) g.apagar(p)
    } catch {
      /* já saiu */
    }
  }
}
