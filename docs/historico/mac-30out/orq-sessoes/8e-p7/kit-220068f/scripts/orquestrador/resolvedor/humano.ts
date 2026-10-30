/**
 * humano.ts — alguém mexeu no ticket depois do bloqueio? (etapa 8b, peça 4)
 *
 * Antes desta peça o "humano mexeu" só existia DEPOIS de uma ação (desfecho.ts);
 * antes de agir, só a trava de concorrência "o ticket mudou desde a leitura"
 * (repo.ts). Com dois agentes na fila do Comarka (o resolvedor e a Vigia, que
 * commita com `Orq-Vigia:`), o resolvedor não pode agir por cima de quem já
 * mexeu no ticket bloqueado.
 *
 * Conta como humano mexeu, depois do instante do bloqueio (`bloqueio.quando`
 * do diagnóstico: a trilha no kit, o meta.json no legado):
 *   - um commit no arquivo que muda algo fora dos campos do motor (o bloco sem
 *     campos-do-motor.json, ou a prosa) e não é do loop nem do resolvedor;
 *     do loop = trailer `Orq-Loop` ou, nos commits antigos, o assunto exato do
 *     motor; do resolvedor = trailer `Orq-Resolvedor`/`Orq-Resolvedor-Desfaz`;
 *   - edição sem commit no working tree fora dos campos do motor.
 * O commit que CRIA o arquivo não conta (não é edição de ticket bloqueado).
 * Só leitura do repo (gitLeitura, GIT_OPTIONAL_LOCKS=0).
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { isDeepStrictEqual } from 'node:util'
import { blocoJson } from '../triador/comum.js'
import { gitLeitura } from '../triador/git.js'
import { CAMPOS_DO_MOTOR } from './desfecho.js'

export interface HumanoMexeu {
  quem: 'vigia' | 'humano' | 'nao_commitado'
  commit: string | null
  assunto: string | null
}

/** Os assuntos que o motor grava (lib.sh ticket_commit e autocommit, kit e Comarka), para commit sem trailer. */
const ASSUNTO_DO_LOOP = /^fila(?:\(apolo\))?: (?:status automatico do loop |\S+ (?:tentativa \d+|bloqueado(?: \(.*\))?|refatiar|recusado|adiado \(.*\)|aguardando merge|done \(.*\)|reconciliado \(done\)|reaberto de bloqueado \(contadores zerados\)|adiamentos_ambiente .*)$)/

const semMotor = (j: Record<string, unknown> | null) => (j ? Object.fromEntries(Object.entries(j).filter(([k]) => !CAMPOS_DO_MOTOR.includes(k))) : null)
const prosa = (md: string) => md.replace(/```json\n[\s\S]*?\n```/, '```json```')
/** Mudou algo que não é do motor entre duas versões do ticket? */
const mudouForaDoMotor = (a: string, b: string) => !isDeepStrictEqual(semMotor(blocoJson(a)), semMotor(blocoJson(b))) || prosa(a) !== prosa(b)

/** O primeiro sinal de que alguém (não o loop, não o resolvedor) mexeu em `rel` depois de `quando`, ou `null`. */
export function humanoMexeu(raiz: string, rel: string, quando: string | null): HumanoMexeu | null {
  const head = gitLeitura(raiz, ['show', `HEAD:${rel}`])
  let disco = ''
  try {
    disco = readFileSync(join(raiz, rel), 'utf8')
  } catch {
    disco = ''
  }
  if (head.rc === 0 && disco && mudouForaDoMotor(head.stdout, disco)) return { quem: 'nao_commitado', commit: null, assunto: null }
  if (!quando || Number.isNaN(Date.parse(quando))) return null

  const log = gitLeitura(raiz, ['log', `--since=${quando}`, '--format=%H%x1f%s%x1f%(trailers:key=Orq-Loop,valueonly,separator=%x2c)%x1f%(trailers:key=Orq-Resolvedor,valueonly)%(trailers:key=Orq-Resolvedor-Desfaz,valueonly)%x1f%(trailers:key=Orq-Vigia,valueonly)%x1e', '--', rel])
  if (log.rc !== 0) return null
  // do mais antigo para o mais novo: o primeiro sinal é o que vale
  for (const reg of log.stdout.split('\x1e').map((r) => r.trim()).filter(Boolean).reverse()) {
    const [sha = '', assunto = '', loop = '', resolvedor = '', vigia = ''] = reg.split('\x1f')
    if (loop.trim() || resolvedor.trim() || /^orq-resolvedor: /.test(assunto) || ASSUNTO_DO_LOOP.test(assunto)) continue
    const antes = gitLeitura(raiz, ['show', `${sha}^:${rel}`])
    if (antes.rc !== 0) continue // o commit que cria o arquivo
    const depois = gitLeitura(raiz, ['show', `${sha}:${rel}`])
    if (depois.rc !== 0 || !mudouForaDoMotor(antes.stdout, depois.stdout)) continue
    return { quem: vigia.trim() ? 'vigia' : 'humano', commit: sha, assunto }
  }
  return null
}
