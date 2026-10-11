/**
 * acoes.ts — as ações R1 e R5 com as travas (etapa 7f-b2, peça 3).
 *
 * Travas (decisões do chat do programa):
 *   - UMA ação por ticket: se o ledger já tem uma ação aplicada nele, o
 *     segundo bloqueio vai para humano (não age de novo, registra);
 *   - interruptor e trava global: passada.ts, antes de qualquer coisa;
 *   - escrita no repo só por repo.ts (espera git, só o arquivo do ticket,
 *     commit com trailer, nunca --no-verify, nunca push);
 *   - fora do repo, só pela GuardaResolvedor.
 *
 * Modo sombra: o mesmo plano vira `proposta.md` (o diff que aplicaria), e o
 * repo não é tocado. Em --dry-run, nem a proposta: só o registro do que faria.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { Diagnostico } from '../triador/triar.js'
import { dirTicket, type GuardaResolvedor } from './caminhos.js'
import type { Decisao } from './decidir.js'
import { diffLinhas } from './diff.js'
import { acoesDe, lerLedger, registrar } from './ledger.js'
import { planejarR1, type Plano } from './r1.js'
import { planejarR5 } from './r5.js'
import { arquivoDoTicket, escreverEComitar, trailer } from './repo.js'

export interface Feito {
  feito: 'aplicado' | 'proposto' | 'faria' | 'nao_consegui'
  motivo: string
  commit?: string
  proposta?: string
  diff?: string
}

export interface Alvo {
  repo: { nome: string; caminho: string }
  id: string
  diag: Diagnostico
  decisao: Decisao
  agora: number
  dryRun: boolean
  g: GuardaResolvedor
}

const iso = (t: number) => new Date(t).toISOString().replace(/\.\d{3}Z$/, 'Z')
const carimbo = (t: number) => iso(t).replace(/[-:]/g, '')

/** O que mudou, em uma linha, para o ledger e a mensagem do commit. */
function oQueMudou(tipo: 'r1_allowlist' | 'r5_reabrir', p: { teste?: string; criteriosLista?: number[]; guarda?: number; condicao?: string }): string {
  if (tipo === 'r5_reabrir') return `reabriu (status pendente, nota vazia): ${p.condicao}`
  const lista = p.criteriosLista?.length ? `; ${p.teste} na lista de criterio[${p.criteriosLista.join('], criterio[')}]` : ''
  return `${p.teste} na allowlist${lista}; guarda de contagem em criterio[${p.guarda}]; reabriu (status pendente, nota vazia)`
}

export function agirR1R5(a: Alvo, tipo: 'r1_allowlist' | 'r5_reabrir'): Feito {
  const { repo, id, diag } = a
  const sombra = a.decisao.acao === 'sombra'
  if (!sombra && acoesDe(lerLedger(), repo.nome, id).length) {
    return { feito: 'nao_consegui', motivo: 'segunda vez bloqueado depois de uma ação do resolvedor: vai para humano' }
  }
  const rel = arquivoDoTicket(repo.caminho, id)
  if (!rel) return { feito: 'nao_consegui', motivo: `não achei um arquivo docs/fila/${id}-*.md só` }
  const antes = readFileSync(join(repo.caminho, rel), 'utf8')
  const plano: Plano<{ novo: string; teste?: string; criteriosLista?: number[]; guarda?: number; condicao?: string }> =
    tipo === 'r1_allowlist' ? planejarR1(repo.caminho, diag, antes, a.agora) : planejarR5(repo.caminho, diag, antes)
  if (!plano.ok) return { feito: 'nao_consegui', motivo: plano.motivo }
  const mudou = oQueMudou(tipo, plano.plano)
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
    return { feito: 'proposto', motivo: mudou, proposta: p, diff }
  }
  const classe = diag.classe!
  const regra = diag.regra!
  const msg = `orq-resolvedor: ${id} ${classe} ${regra}: ${mudou}\n\n${diag.remedio}\n\n${trailer(classe, regra, diag.assinatura)}\n`
  const e = escreverEComitar(repo.caminho, id, rel, antes, plano.plano.novo, msg)
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
    commit: e.commit,
    arquivo: rel,
    copia,
    bloqueado_em: diag.bloqueio.quando,
  })
  return { feito: 'aplicado', motivo: mudou, commit: e.commit, diff }
}
