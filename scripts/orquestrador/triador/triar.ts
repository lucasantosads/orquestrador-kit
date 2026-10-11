/**
 * triar.ts — um ticket bloqueado vira diagnóstico gravado FORA do repo
 * (spec 7f-a §1 e §5).
 *
 *   ler a evidência → assinatura → (mesma assinatura: não roda) → trava →
 *   extração → [modelo, só para palpite ou sem regra] → cópia da evidência →
 *   diagnóstico atual (o anterior vai para o histórico) → solta a trava.
 *
 * A PASSADA (`--passada`) não chama modelo: refaz só a extração dos
 * diagnósticos de até 6 h com classe em palpite, e grava só se a extração
 * ficou firme (a prova de base vermelha às vezes chega depois: 760 → 761 em
 * 17 min). O aceite mede o estado depois da passada.
 *
 * O triador NUNCA muda status de ticket, nota, critério nem nada do repo:
 * a escrita passa só pela `Guarda` de saida.ts, e o git só por `gitLeitura`.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { blocoJson } from './comum.js'
import { extrair, rotuloDe, type Extracao } from './extrair.js'
import { gitLeitura } from './git.js'
import { lerRepo } from './leitor.js'
import { Guarda, assinatura, caminhoDiagnostico, copiarEvidencia, gravarDiagnostico, lerDiagnostico, lerRepos, travar, type RepoListado } from './saida.js'
import type { Evidencia, Ref } from './tipos.js'

export const PASSADA_JANELA_MS = 6 * 3600 * 1000

export interface Diagnostico {
  $schema_versao: 1
  repo: string
  id: string
  leitor: string
  assinatura: string
  gerado_em: string
  bloqueio: { quando: string | null; token: string | null; nota_do_motor: string; tentativas: number; origem: string }
  classe: string | null
  rotulo: string
  firme: boolean
  fonte: 'extracao' | 'modelo'
  regra: string | null
  confianca: 'alta' | 'media' | 'baixa' | null
  evidencia: Ref[]
  remedio: string
  requeue: string
  arvore_alvo_agora: string
  extracao: Extracao['detalhe'] & { classe: string | null; regra: string | null; firme: boolean }
  modelo: unknown
  falta: string[]
  copia_evidencia: string
  encerrado_em: string | null
}

/**
 * O passo do modelo, injetado por quem chama (peça 5). Recebe a evidência e a
 * extração; devolve o que entra em `diagnostico.modelo` e, se a resposta valeu,
 * a classe que substitui o palpite.
 */
export type PassoModelo = (ctx: { ev: Evidencia; ext: Extracao; repo: string; assinatura: string; guarda: Guarda; agora: number; copia: string }) => {
  registro: unknown
  resposta?: { classe: string; confianca: 'alta' | 'media' | 'baixa'; evidencia: Ref[]; remedio: string; requeue: string; justificativa: string }
}

export interface Resultado {
  id: string
  feito: 'diagnosticado' | 'promovido' | 'mesma_assinatura' | 'travado' | 'sem_palpite_recente' | 'nao_promoveu'
  diagnostico?: Diagnostico
}

const rotuloR5 = (regra: string | null) =>
  regra === 'D1' ? 'ambiente: árvore suja na worktree alvo' : regra === 'D4' ? 'ambiente: máquina' : regra === 'D5' ? 'ambiente: base vermelha' : null

/** `git status --porcelain` da worktree alvo, só como registro (nunca prova do passado). */
function arvoreAlvoAgora(raiz: string, ext: Extracao): string {
  if (ext.regra !== 'D1') return 'sem dado'
  let cfg: Record<string, unknown> = {}
  try {
    cfg = JSON.parse(readFileSync(join(raiz, 'docs/fila/000-config.json'), 'utf8')) as Record<string, unknown>
  } catch {
    return 'sem dado'
  }
  const wtDir = typeof cfg.worktrees_dir === 'string' ? cfg.worktrees_dir : '../_worktrees'
  const alvo = typeof cfg.branch_alvo === 'string' ? cfg.branch_alvo : 'staging-auto'
  const wt = resolve(raiz, wtDir, alvo)
  if (!existsSync(wt)) return 'sem dado'
  const r = gitLeitura(wt, ['status', '--porcelain'])
  if (r.rc !== 0) return 'sem dado'
  const n = r.stdout.split('\n').filter(Boolean).length
  return n === 0 ? 'limpa' : `suja: ${n} arquivo(s)`
}

function montar(repo: string, ev: Evidencia, ext: Extracao, assin: string, agora: number, copia: string, raiz: string): Diagnostico {
  return {
    $schema_versao: 1,
    repo,
    id: ev.id,
    leitor: ev.leitor,
    assinatura: assin,
    gerado_em: new Date(agora).toISOString().replace(/\.\d{3}Z$/, 'Z'),
    bloqueio: {
      quando: ev.bloqueio.quando,
      token: ev.bloqueio.token,
      nota_do_motor: ev.bloqueio.nota_do_motor,
      tentativas: ev.bloqueio.tentativas,
      origem: ev.bloqueio.origem,
    },
    classe: ext.classe,
    rotulo: (ext.classe === 'R5' && rotuloR5(ext.regra)) || ext.rotulo,
    firme: ext.firme,
    fonte: 'extracao',
    regra: ext.regra,
    confianca: ext.classe === null ? null : ext.firme ? 'alta' : 'baixa',
    evidencia: ext.evidencia,
    remedio: ext.remedio,
    requeue: ext.requeue,
    arvore_alvo_agora: arvoreAlvoAgora(raiz, ext),
    extracao: { ...ext.detalhe, classe: ext.classe, regra: ext.regra, firme: ext.firme },
    modelo: null,
    falta: ev.falta,
    copia_evidencia: copia,
    encerrado_em: null,
  }
}

export interface OpcoesTriar {
  repo: RepoListado
  id: string
  passada?: boolean
  forcar?: boolean
  modelo?: PassoModelo | null
  agora?: number
}

export function triarTicket(o: OpcoesTriar): Resultado {
  const agora = o.agora ?? Date.now()
  const g = new Guarda([o.repo.caminho])
  const existente = lerDiagnostico<Diagnostico>(g, o.repo.nome, o.id)
  if (o.passada) {
    const recente = existente && agora - Date.parse(existente.gerado_em) <= PASSADA_JANELA_MS
    if (!existente || !recente || existente.extracao.firme || existente.extracao.classe === null || existente.encerrado_em) {
      return { id: o.id, feito: 'sem_palpite_recente' }
    }
  }
  const ev = lerRepo(o.repo.caminho, o.id, { agora })
  const assin = assinatura(ev)
  if (!o.passada && !o.forcar && existente?.assinatura === assin) return { id: o.id, feito: 'mesma_assinatura' }
  const soltar = travar(g, o.repo.nome, o.id, agora)
  if (!soltar) return { id: o.id, feito: 'travado' }
  try {
    const ext = extrair(ev)
    if (o.passada && !ext.firme) return { id: o.id, feito: 'nao_promoveu' }
    const diag = diagnosticar(g, o.repo.nome, ev, ext, assin, agora, o.repo.caminho, o.passada ? null : (o.modelo ?? null))
    gravarDiagnostico(g, o.repo.nome, o.id, diag)
    return { id: o.id, feito: o.passada ? 'promovido' : 'diagnosticado', diagnostico: diag }
  } finally {
    soltar()
  }
}

/**
 * Cópia da evidência + diagnóstico da extração + (palpite ou sem regra, com
 * modelo) a resposta do modelo por cima. A resposta do modelo nunca é firme.
 */
export function diagnosticar(g: Guarda, repo: string, ev: Evidencia, ext: Extracao, assin: string, agora: number, raizRepo: string, modelo: PassoModelo | null): Diagnostico {
  const copia = copiarEvidencia(g, repo, ev, assin)
  const diag = montar(repo, ev, ext, assin, agora, copia, raizRepo)
  // sem tentativa não há evidência para o modelo: nem chamada, nem reserva no teto (7f-b3)
  if (ext.regra === 'D0') {
    if (modelo) diag.modelo = { modelo: null, pulado: 'sem_tentativa' }
    return diag
  }
  if (ext.firme || !modelo) return diag
  const m = modelo({ ev, ext, repo, assinatura: assin, guarda: g, agora, copia })
  diag.modelo = m.registro
  if (m.resposta) {
    diag.classe = m.resposta.classe
    diag.rotulo = rotuloDe(m.resposta.classe)
    diag.fonte = 'modelo'
    diag.firme = false
    diag.confianca = m.resposta.confianca
    diag.evidencia = m.resposta.evidencia
    diag.remedio = m.resposta.remedio
    diag.requeue = m.resposta.requeue
  }
  return diag
}

/** Os ids com `status: "bloqueado"` no 1º bloco json dos tickets do repo. */
export function bloqueados(raiz: string): string[] {
  const fila = join(raiz, 'docs/fila')
  let nomes: string[] = []
  try {
    nomes = readdirSync(fila).filter((f) => /^[0-9][0-9a-z]*-.*\.md$/.test(f))
  } catch {
    return []
  }
  const out: string[] = []
  for (const f of nomes.sort()) {
    const j = blocoJson(readFileSync(join(fila, f), 'utf8'))
    if (j?.status === 'bloqueado' && typeof j.id === 'string') out.push(j.id)
  }
  return out
}

/**
 * O repo inteiro (ou um id): os bloqueados ganham diagnóstico; o diagnóstico
 * de ticket que SAIU de bloqueado fica, marcado `encerrado_em`.
 */
export function triarRepo(repo: RepoListado, o: { id?: string; passada?: boolean; forcar?: boolean; modelo?: PassoModelo | null; agora?: number } = {}): Resultado[] {
  const agora = o.agora ?? Date.now()
  const ids = o.id ? [o.id] : bloqueados(repo.caminho)
  const out = ids.map((id) => triarTicket({ repo, id, agora, ...(o.passada ? { passada: true } : {}), ...(o.forcar ? { forcar: true } : {}), ...(o.modelo ? { modelo: o.modelo } : {}) }))
  if (!o.id) {
    const g = new Guarda([repo.caminho])
    const dir = join(g.raiz, repo.nome)
    const ainda = new Set(ids)
    const atuais = existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith('.json')) : []
    for (const f of atuais) {
      const id = f.slice(0, -'.json'.length)
      if (ainda.has(id)) continue
      const d = lerDiagnostico<Diagnostico>(g, repo.nome, id)
      if (d && !d.encerrado_em) g.escrever(caminhoDiagnostico(g, repo.nome, id), JSON.stringify({ ...d, encerrado_em: new Date(agora).toISOString().replace(/\.\d{3}Z$/, 'Z') }, null, 2) + '\n')
    }
  }
  return out
}

/** `<repo>` da linha de comando: um caminho, ou um nome do repos.json. */
export function resolverRepo(arg: string): RepoListado {
  const listados = lerRepos()
  const porNome = listados.find((r) => r.nome === arg)
  if (porNome) return porNome
  const caminho = resolve(arg)
  const porCaminho = listados.find((r) => r.caminho === caminho)
  return porCaminho ?? { nome: caminho.split('/').pop()!, caminho }
}
