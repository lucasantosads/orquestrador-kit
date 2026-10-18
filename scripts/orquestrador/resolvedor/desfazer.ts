/**
 * desfazer.ts — `orq desfazer <repo> <id>` (etapa 7f-b2, peça 7): reverte a
 * ÚLTIMA ação do resolvedor naquele ticket.
 *
 * Só desfaz se:
 *   - o ledger tem a ação (e ela ainda não foi desfeita);
 *   - o commit dela tem o trailer `Orq-Resolvedor: <classe> <regra> <assinatura>`
 *     igual ao do ledger;
 *   - o arquivo do ticket não mudou depois: nenhum commit depois dele toca o
 *     arquivo, e o arquivo no disco é o do commit (nem writeback do loop).
 *
 * O ticket volta ao que era antes da ação (a cópia `acoes/<ts>/antes.md`; sem
 * ela, o pai do commit), num commit só dele pela mesma porta (repo.ts: espera
 * git, nunca --no-verify), com o trailer `Orq-Resolvedor-Desfaz: <sha>`. O
 * ledger ganha `desfeito` e o desfecho `desfeito` (ruim: conta para o
 * rebaixamento). A ação continua contando como a única do ticket: o próximo
 * bloqueio vai para humano.
 *
 * Não respeita o interruptor de propósito: é o comando do humano, e o
 * interruptor existe para parar o que roda sozinho.
 */
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { gitLeitura } from '../triador/git.js'
import { GuardaResolvedor } from './caminhos.js'
import { subclasseDe } from './desfecho.js'
import { acoesDe, lerLedger, registrar } from './ledger.js'
import { acharRepo } from './modos.js'
import { escreverEComitar, retratoDoLoop, trailer } from './repo.js'

export type Desfeito = { ok: true; commit: string; desfez: string } | { ok: false; motivo: string }

const iso = (t: number) => new Date(t).toISOString().replace(/\.\d{3}Z$/, 'Z')

export function desfazer(o: { repo: string; id: string; agora?: number }): Desfeito {
  const agora = o.agora ?? Date.now()
  const repo = acharRepo(o.repo)
  const l = lerLedger()
  const desfeitos = new Set(l.filter((e) => e.tipo === 'desfeito' && e.repo === repo.nome).map((e) => e.commit_desfeito))
  const a = acoesDe(l, repo.nome, o.id).at(-1)
  if (!a) return { ok: false, motivo: `o ledger não tem ação do resolvedor em ${repo.nome} ${o.id}` }
  const sha = String(a.commit)
  if (desfeitos.has(sha)) return { ok: false, motivo: `a última ação (${sha.slice(0, 12)}) já foi desfeita` }
  const rel = String(a.arquivo)

  const tr = gitLeitura(repo.caminho, ['log', '-1', '--format=%(trailers:key=Orq-Resolvedor,valueonly)', sha])
  if (tr.rc !== 0) return { ok: false, motivo: `commit ${sha.slice(0, 12)} não existe no repo` }
  const esperado = trailer(String(a.classe), String(a.regra), String(a.assinatura)).replace(/^Orq-Resolvedor: /, '')
  if (tr.stdout.trim() !== esperado) return { ok: false, motivo: `commit ${sha.slice(0, 12)} sem o trailer Orq-Resolvedor da ação (tem: ${tr.stdout.trim() || 'nenhum'})` }
  const depois = gitLeitura(repo.caminho, ['log', '--format=%h %s', `${sha}..HEAD`, '--', rel])
  if (depois.rc !== 0) return { ok: false, motivo: `commit ${sha.slice(0, 12)} não é ancestral do HEAD` }
  if (depois.stdout.trim()) return { ok: false, motivo: `${rel} mudou depois da ação: ${depois.stdout.trim().split('\n').join('; ')}` }
  const noCommit = gitLeitura(repo.caminho, ['show', `${sha}:${rel}`]).stdout
  const noDisco = readFileSync(join(repo.caminho, rel), 'utf8')
  const retrato = retratoDoLoop(repo.caminho, o.id)
  if (noDisco !== noCommit) return { ok: false, motivo: `${rel} no disco não é o do commit ${sha.slice(0, 12)} (mudança não commitada depois da ação)` }

  const copia = typeof a.copia === 'string' ? join(a.copia, 'antes.md') : null
  const antes = copia && existsSync(copia) ? readFileSync(copia, 'utf8') : gitLeitura(repo.caminho, ['show', `${sha}^:${rel}`]).stdout
  const msg = `orq-resolvedor: desfaz ${sha.slice(0, 12)} (${o.id} ${a.classe} ${a.regra})\n\n${a.mudou ?? ''}\n\nOrq-Resolvedor-Desfaz: ${sha}\n`
  const e = escreverEComitar(repo.caminho, o.id, rel, noDisco, antes, msg, retrato, repo.branch)
  if (!e.ok) return { ok: false, motivo: e.motivo }
  const g = new GuardaResolvedor([repo.caminho])
  const base = { ts: iso(agora), repo: repo.nome, id: o.id, classe: a.classe ?? null, regra: a.regra ?? null, assinatura: a.assinatura }
  registrar(g, { ...base, tipo: 'desfeito', commit_desfeito: sha, commit: e.commit, arquivo: rel })
  registrar(g, { ...base, tipo: 'desfecho', acao: a.acao, commit: sha, acao_ts: a.ts, desfecho: 'desfeito', subclasse: subclasseDe(a), bom: false, tempo_ate_destravar_s: a.tempo_ate_destravar_s ?? null, tempo_ate_desfecho_s: Math.round((agora - Date.parse(a.ts)) / 1000) })
  return { ok: true, commit: e.commit, desfez: sha }
}
