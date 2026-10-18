/**
 * acoes.ts — as ações R1 e R5 com as travas (etapa 7f-b2, peça 3).
 *
 * Travas (decisões do chat do programa):
 *   - UMA ação por ticket POR BLOQUEIO (7f-b7; antes, uma por ticket): a
 *     mesma assinatura, ou o mesmo `bloqueio.quando` (o fim da série, do
 *     meta.json), depois de uma ação vai para humano. A assinatura sozinha
 *     não basta: ela lê o mtime do ticket, e o `orq desfazer` (ou o writeback
 *     do loop) a troca sem série nova. Uma série nova pode ter a segunda
 *     ação; com 2 ações no ticket, só aviso (TETO_ACOES_TICKET);
 *   - interruptor e trava global: passada.ts, antes de qualquer coisa;
 *   - escrita no repo só por repo.ts (espera git, só o arquivo do ticket,
 *     commit com trailer, nunca --no-verify, nunca push);
 *   - fora do repo, só pela GuardaResolvedor.
 *
 * Modo sombra: o mesmo plano vira `proposta.md` (o diff que aplicaria), e o
 * repo não é tocado. Em --dry-run, nem a proposta: só o registro do que faria.
 */
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { Diagnostico } from '../triador/triar.js'
import { dirTicket, type GuardaResolvedor } from './caminhos.js'
import type { Decisao } from './decidir.js'
import { diffLinhas } from './diff.js'
import { acoesDe, lerLedger, registrar } from './ledger.js'
import { modoDaChave, R1_MULTI, type Modos } from './modos.js'
import { planejarR1, type Plano } from './r1.js'
import { planejarR2 } from './r2.js'
import { planejarR5 } from './r5.js'
import { arquivoDoTicket, escreverEComitar, retratoDoLoop, trailer } from './repo.js'

export interface Feito {
  feito: 'aplicado' | 'proposto' | 'faria' | 'nao_consegui' | 'aviso'
  motivo: string
  commit?: string
  proposta?: string
  diff?: string
}

export interface Alvo {
  repo: { nome: string; caminho: string; modos?: Modos }
  id: string
  diag: Diagnostico
  decisao: Decisao
  agora: number
  dryRun: boolean
  g: GuardaResolvedor
}

const iso = (t: number) => new Date(t).toISOString().replace(/\.\d{3}Z$/, 'Z')
const segs = (de: string | null, ate: number) => (de && !Number.isNaN(Date.parse(de)) ? Math.round((ate - Date.parse(de)) / 1000) : null)

/** Uma proposta nova vai ao ledger (a comparação com o humano parte dela, peça 5). */
function registrarProposta(a: Alvo, acao: string, mudou: string, proposta: string): void {
  registrar(a.g, {
    ts: iso(a.agora),
    tipo: 'proposta',
    repo: a.repo.nome,
    id: a.id,
    classe: a.diag.classe,
    regra: a.diag.regra,
    assinatura: a.diag.assinatura,
    acao,
    mudou,
    proposta,
    proposta_json: proposta.replace(/\.md$/, '.json'),
  })
}
const carimbo = (t: number) => iso(t).replace(/[-:]/g, '')

/** Ações do resolvedor num ticket, no total (7f-b7): na terceira, só aviso. */
export const TETO_ACOES_TICKET = 2

/** O que mudou, em uma linha, para o ledger e a mensagem do commit. */
function oQueMudou(tipo: 'r1_allowlist' | 'r5_reabrir', p: { testes?: { teste: string }[]; criteriosLista?: number[]; guardas?: number[]; condicao?: string }): string {
  if (tipo === 'r5_reabrir') return `reabriu (status pendente, nota vazia): ${p.condicao}`
  const ts = (p.testes ?? []).map((t) => t.teste).join(' e ')
  const lista = p.criteriosLista?.length ? `; ${ts} na lista de criterio[${p.criteriosLista.join('], criterio[')}]` : ''
  const gs = p.guardas ?? []
  return `${ts} na allowlist${lista}; guarda${gs.length > 1 ? 's' : ''} de contagem em criterio[${gs.join('], criterio[')}]; reabriu (status pendente, nota vazia)`
}

/** As travas de ação no ticket (mesmo bloqueio; teto), ou `null` se pode agir. */
function travaDoTicket(a: Alvo): Feito | null {
  const feitas = acoesDe(lerLedger(), a.repo.nome, a.id)
  const quando = a.diag.bloqueio.quando
  if (feitas.some((e) => e.assinatura === a.diag.assinatura || (quando !== null && e.bloqueado_em === quando))) {
    return { feito: 'nao_consegui', motivo: 'segunda vez bloqueado no mesmo bloqueio (mesma assinatura ou mesma série) depois de uma ação do resolvedor: vai para humano' }
  }
  if (feitas.length >= TETO_ACOES_TICKET) {
    return { feito: 'aviso', motivo: `teto de ${TETO_ACOES_TICKET} ações do resolvedor no ticket: só diagnóstico e aviso` }
  }
  return null
}

export function agirR1R5(a: Alvo, tipo: 'r1_allowlist' | 'r5_reabrir'): Feito {
  const { repo, id, diag } = a
  let sombra = a.decisao.acao === 'sombra'
  if (!sombra) {
    const t = travaDoTicket(a)
    if (t) return t
  }
  const rel = arquivoDoTicket(repo.caminho, id)
  if (!rel) return { feito: 'nao_consegui', motivo: `não achei um arquivo docs/fila/${id}-*.md só` }
  const antes = readFileSync(join(repo.caminho, rel), 'utf8')
  // o loop agora: conferido de novo imediatamente antes da troca (repo.ts, 7f-b5)
  const retrato = retratoDoLoop(repo.caminho, id)
  const plano: Plano<{ novo: string; testes?: { teste: string }[]; criteriosLista?: number[]; guardas?: number[]; condicao?: string }> =
    tipo === 'r1_allowlist' ? planejarR1(repo.caminho, diag, antes, a.agora) : planejarR5(repo.caminho, diag, antes)
  if (!plano.ok) return { feito: 'nao_consegui', motivo: plano.motivo }
  // R1 com 2 ou mais testes: o modo é o do r1_multi (7f-b7; ausente, o do R1)
  let prefixo = ''
  if ((plano.plano.testes?.length ?? 0) >= 2 && repo.modos) {
    const m = modoDaChave(repo.modos, R1_MULTI)
    if (m !== 'auto') prefixo = `${R1_MULTI} em ${m}: `
    if (m === 'diagnostico') return { feito: 'aviso', motivo: `${prefixo}${plano.plano.testes!.map((t) => t.teste).join(' e ')} ficariam na allowlist; nada proposto` }
    if (m === 'sombra') sombra = true
    else if (sombra) {
      const t = travaDoTicket(a)
      if (t) return t
      sombra = false
    }
  }
  const mudou = `${prefixo}${oQueMudou(tipo, plano.plano)}`
  const diff = diffLinhas(antes, plano.plano.novo, rel)
  if (a.dryRun) return { feito: 'faria', motivo: mudou, diff }
  if (sombra) {
    const dir = dirTicket(repo.nome, id)
    const p = join(dir, 'proposta.md')
    a.g.escrever(
      p,
      `# Proposta do resolvedor: ${repo.nome} ${id} (${diag.classe} ${diag.regra}, modo sombra)\n\n` +
        `Gerada em ${iso(a.agora)} sobre o diagnóstico ${diag.assinatura}. Nada foi escrito no repo.\n\n` +
        `- ação: ${tipo}\n- o que mudaria: ${mudou}\n- remédio do triador: ${diag.remedio}\n\n` +
        `\`\`\`diff\n${diff}\`\`\`\n`,
    )
    a.g.escrever(join(dir, 'proposta.json'), JSON.stringify({ repo: repo.nome, id, tipo, classe: diag.classe, regra: diag.regra, assinatura: diag.assinatura, gerada_em: iso(a.agora), arquivo: rel, antes, depois: plano.plano.novo }, null, 2) + '\n')
    registrarProposta(a, tipo, mudou, p)
    return { feito: 'proposto', motivo: mudou, proposta: p, diff }
  }
  const classe = diag.classe!
  const regra = diag.regra!
  const msg = `orq-resolvedor: ${id} ${classe} ${regra}: ${mudou}\n\n${diag.remedio}\n\n${trailer(classe, regra, diag.assinatura)}\n`
  const e = escreverEComitar(repo.caminho, id, rel, antes, plano.plano.novo, msg, retrato)
  if (!e.ok) return { feito: 'nao_consegui', motivo: e.motivo }
  const copia = join(dirTicket(repo.nome, id), 'acoes', carimbo(a.agora))
  a.g.escrever(join(copia, 'antes.md'), antes)
  a.g.escrever(join(copia, 'depois.md'), plano.plano.novo)
  registrar(a.g, {
    ts: iso(a.agora),
    tipo: 'acao',
    repo: repo.nome,
    caminho: repo.caminho,
    id,
    classe,
    regra,
    assinatura: diag.assinatura,
    acao: tipo,
    mudou,
    ...(plano.plano.testes ? { testes: plano.plano.testes.map((t) => t.teste) } : {}),
    commit: e.commit,
    arquivo: rel,
    copia,
    bloqueado_em: diag.bloqueio.quando,
    tempo_ate_destravar_s: segs(diag.bloqueio.quando, a.agora),
  })
  return { feito: 'aplicado', motivo: mudou, commit: e.commit, diff }
}

const bloquinho = (s: string) => `\`\`\`\n${s}\n\`\`\``

/**
 * R2: a proposta em `<repo>/<id>/proposta.md` (e `.json`), sempre em sombra,
 * mesmo com o modo `auto` (nesta etapa R2 nunca aplica). A mesma assinatura
 * não regrava a proposta.
 */
export function agirR2(a: Alvo): Feito {
  const { repo, id, diag } = a
  const rel = arquivoDoTicket(repo.caminho, id)
  if (!rel) return { feito: 'nao_consegui', motivo: `não achei um arquivo docs/fila/${id}-*.md só` }
  const dir = dirTicket(repo.nome, id)
  const pj = join(dir, 'proposta.json')
  const pm = join(dir, 'proposta.md')
  if (!a.dryRun && existsSync(pj)) {
    try {
      const v = JSON.parse(readFileSync(pj, 'utf8')) as { assinatura?: string; criterio?: string }
      if (v.assinatura === diag.assinatura) return { feito: 'proposto', motivo: `proposta já feita para esta assinatura (${v.criterio ?? 'critério'})`, proposta: pm }
    } catch {
      /* ilegível: refaz */
    }
  }
  const antes = readFileSync(join(repo.caminho, rel), 'utf8')
  const p = planejarR2(repo.caminho, diag, antes)
  if (!p.ok) return { feito: 'nao_consegui', motivo: p.motivo }
  const r = p.plano
  const mudou = `${r.criterio}: cmd sem unbound variable sob set -u (mesmo espera ${JSON.stringify(r.espera)})`
  const diff = diffLinhas(antes, r.novo, rel)
  if (a.dryRun) return { feito: 'faria', motivo: `proporia ${mudou}`, diff }
  const prova = r.prova.map((x) => `| ${x.estado} | ${x.cmd} | ${x.abortou ? 'aborta' : 'roda'} | ${x.passa ? 'APROVA' : 'reprova'} | \`${x.saida.replace(/\|/g, '\\|').replace(/\n/g, ' ').slice(0, 160)}\` |`)
  a.g.escrever(
    pm,
    `# Proposta do resolvedor: ${repo.nome} ${id} (${diag.classe} ${diag.regra ?? ''}, R2 só em sombra)\n\n` +
      `Gerada em ${iso(a.agora)} sobre o diagnóstico ${diag.assinatura}. **Nada foi escrito no repo**: R2 nunca aplica nesta etapa.\n\n` +
      `## ${r.criterio}: ${r.descricao}\n\n- arquivo: \`${rel}\`\n- espera (não muda): \`${r.espera}\`\n- remédio do triador: ${diag.remedio}\n\n` +
      `### cmd antigo\n\n${bloquinho(r.cmd_antigo)}\n\n### cmd novo\n\n${bloquinho(r.cmd_novo)}\n\n` +
      `## Prova\n\nO harness do executor (\`set -euo pipefail\`; \`out="$( ( cd <arvore> && eval "$cmd" ) 2>&1 || true )"\`), numa pasta temporária com cópias dos arquivos que o cmd cita.\n\n` +
      `- não feito: os arquivos no branch alvo (${r.ref_alvo ?? 'nenhum existe lá'}): ${r.arquivos.nao_feito.join(', ') || 'nenhum'}\n` +
      `- head: os arquivos no head da última tentativa (${r.head ?? 'sem head'}): ${r.arquivos.head.join(', ') || 'nenhum'}\n\n` +
      `| estado | cmd | sob set -u | critério | saída |\n|---|---|---|---|---|\n${prova.join('\n')}\n\n` +
      `O cmd novo roda sem abortar e REPROVA o estado em que o trabalho não foi feito.\n\n` +
      `## Diff que o humano aplicaria\n\n\`\`\`diff\n${diff}\`\`\`\n`,
  )
  a.g.escrever(
    pj,
    JSON.stringify({ repo: repo.nome, id, tipo: 'r2', classe: diag.classe, regra: diag.regra, assinatura: diag.assinatura, gerada_em: iso(a.agora), arquivo: rel, indice: r.indice, criterio: r.criterio, espera: r.espera, cmd_antigo: r.cmd_antigo, cmd_novo: r.cmd_novo, head: r.head, ref_alvo: r.ref_alvo, arquivos: r.arquivos, prova: r.prova, arvores: r.arvores }, null, 2) + '\n',
  )
  registrarProposta(a, 'r2_proposta', mudou, pm)
  return { feito: 'proposto', motivo: mudou, proposta: pm, diff }
}
