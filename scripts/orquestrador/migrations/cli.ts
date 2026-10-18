/**
 * cli.ts — `orq migrations` (etapa MIG-A, P4).
 *
 *   orq migrations status [<banco>]          linha de base, sonda e contagens do plano
 *   orq migrations plano <banco>             pendentes, herdados, drift e o que entrou desde o corte
 *   orq migrations linha-base <banco> [--corte V] [--herdados-desde V] [--substituir]
 *   orq migrations sonda <banco>             duas instruções, mesma transação? (obrigatória)
 *   orq migrations aplicar <repo> <arquivo> [--token humano:<t>]
 *
 * <banco> é um nome de `migrations.bancos` do ~/.orq/repos.json; <repo>, o nome
 * do escritor no bloco (ou o caminho). Só o `aplicar` escreve num repo, e só o
 * token (aplicar.ts). status, plano e sonda só leem o banco; linha-base e sonda
 * gravam só em ~/.orq/migrations. rc 0 ok · 1 recusa ou falha · 2 uso.
 */
import { existsSync } from 'node:fs'
import { createInterface } from 'node:readline/promises'
import { adaptadorDo, aplicar, type Meios } from './aplicar.js'
import { arquivosDoBanco, conteudoDe } from './arquivos.js'
import { arquivoLinhaBase, arquivoSonda, guardaDo, lerJson } from './caminhos.js'
import { acharBanco, lerBancos, type Banco } from './config.js'
import { tokensDoSql } from './liberacao.js'
import { montarLinhaBase, montarPlano, type ArquivoMig, type LinhaBase, type Plano } from './plano.js'

const USO = [
  'uso: orq migrations status [<banco>]',
  '     orq migrations plano <banco>',
  '     orq migrations linha-base <banco> [--corte AAAAMMDD[HHMMSS]] [--herdados-desde AAAAMMDD[HHMMSS]] [--substituir]',
  '     orq migrations sonda <banco>',
  '     orq migrations aplicar <repo> <arquivo> [--token humano:<tipo>-<id>]',
].join('\n')

class Uso extends Error {}

function flags(args: string[], aceitas: string[], booleanas: string[] = []): { pos: string[]; f: Record<string, string> } {
  const pos: string[] = []
  const f: Record<string, string> = {}
  for (let i = 0; i < args.length; i++) {
    const a = args[i]!
    if (booleanas.includes(a)) f[a] = '1'
    else if (aceitas.includes(a)) {
      const v = args[++i]
      if (v === undefined) throw new Uso(`${a} pede um valor`)
      f[a] = v
    } else if (a.startsWith('--')) throw new Uso(`flag desconhecida: ${a}`)
    else pos.push(a)
  }
  return { pos, f }
}

async function planoDe(b: Banco): Promise<{ lb: LinhaBase; plano: Plano; avisos: string[] }> {
  const lb = lerJson<LinhaBase>(arquivoLinhaBase(b.nome))
  if (!lb) throw new Error(`sem linha de base do banco ${b.nome}: rode 'orq migrations linha-base ${b.nome}'`)
  const { arquivos, avisos } = arquivosDoBanco(b)
  return { lb, plano: montarPlano(lb, await adaptadorDo(b).listarAplicadas(), arquivos), avisos }
}

function linhaArquivo(b: Banco, a: ArquivoMig): string {
  const r = b.repos.find((x) => x.nome === a.repo)
  let token = ''
  if (r?.token && !a.somenteLeitura) {
    try {
      const t = tokensDoSql(conteudoDe(r, a).sql, r.token.molde)
      token = t.length === 1 ? ` · token ${t[0]}` : t.length ? ` · ${t.length} tokens (use --token)` : ' · sem token no .sql (use --token)'
    } catch {
      token = ' · ilegível'
    }
  }
  const marcas = [a.somenteLeitura ? 'somente_leitura: não aplicável aqui' : '', a.divergente ? 'DIVERGE entre refs' : ''].filter(Boolean)
  return `  ${a.repo}  ${a.arquivo}  [${a.refs.join(', ')}]${token}${marcas.length ? ` · ${marcas.join(' · ')}` : ''}`
}

export async function main(argv: string[], meios: Partial<Meios> & { erro?: (t: string) => void } = {}): Promise<number> {
  const out = meios.escrever ?? ((t: string) => void process.stdout.write(`${t}\n`))
  const err = meios.erro ?? (meios.escrever ? meios.escrever : (t: string) => void process.stderr.write(`${t}\n`))
  const [verbo, ...resto] = argv
  try {
    if (verbo === 'status') {
      const { pos } = flags(resto, [])
      const { bancos, erros } = lerBancos()
      if (erros.length) throw new Error(`config de migrations inválida:\n  ${erros.join('\n  ')}`)
      const alvo = pos[0] ? [acharBanco(pos[0])] : bancos
      if (!alvo.length) out('nenhum banco em migrations.bancos do repos.json')
      for (const b of alvo) {
        const lb = lerJson<LinhaBase>(arquivoLinhaBase(b.nome))
        const sonda = lerJson<{ mesma_transacao?: unknown }>(arquivoSonda(b.nome))
        const partes = [
          `${b.nome} (${b.bancoId})`,
          lb ? `corte ${lb.corte} (linha de base de ${lb.criado_em.slice(0, 10)})` : 'sem linha de base',
          sonda ? (sonda.mesma_transacao === true ? 'sonda ok' : 'sonda VERMELHA') : 'sem sonda',
        ]
        if (lb && b.escritor) {
          try {
            const { plano } = await planoDe(b)
            partes.push(`${plano.pendentes.length} pendente(s) · ${plano.herdados.length} herdado(s) · ${plano.drift.length} drift`)
          } catch (e) {
            partes.push(`plano indisponível: ${(e as Error).message}`)
          }
        }
        out(partes.join(' · '))
      }
      return 0
    }
    if (verbo === 'plano') {
      const { pos } = flags(resto, [])
      if (pos.length !== 1) throw new Uso('plano pede o banco')
      const b = acharBanco(pos[0]!)
      const { lb, plano, avisos } = await planoDe(b)
      const linhas = [`banco ${b.nome} (${b.bancoId}) · corte ${lb.corte}${lb.herdados_desde ? ` · herdados desde ${lb.herdados_desde}` : ''} · ${lb.antigos_sem_ledger} antigos sem ledger fora do plano`]
      for (const a of avisos) linhas.push(`aviso: ${a}`)
      linhas.push(`Pendentes (${plano.pendentes.length})`, ...plano.pendentes.map((a) => linhaArquivo(b, a)))
      linhas.push(`Herdados (${plano.herdados.length})`, ...plano.herdados.map((a) => linhaArquivo(b, a)))
      linhas.push(`Drift (${plano.drift.length}): linha de produção acima do corte sem arquivo em nenhum repo do banco`, ...plano.drift.map((l) => `  ${l.version} ${l.name ?? '(sem nome)'}  created_by ${l.created_by ?? '(vazio)'}`))
      linhas.push(`Aplicadas desde o corte (${plano.aplicadasDesdeCorte.length})`, ...plano.aplicadasDesdeCorte.map((l) => `  ${l.version} ${l.name ?? '(sem nome)'}  created_by ${l.created_by ?? '(vazio)'}  ${l.arquivo ?? '(sem arquivo)'}`))
      out(linhas.join('\n'))
      return 0
    }
    if (verbo === 'linha-base') {
      const { pos, f } = flags(resto, ['--corte', '--herdados-desde'], ['--substituir'])
      if (pos.length !== 1) throw new Uso('linha-base pede o banco')
      const b = acharBanco(pos[0]!)
      const arq = arquivoLinhaBase(b.nome)
      if (existsSync(arq) && !f['--substituir']) {
        err(`[orq migrations] a linha de base de ${b.nome} já existe (${arq}); trocar é decisão: use --substituir`)
        return 1
      }
      const { arquivos, avisos } = arquivosDoBanco(b)
      const lb = montarLinhaBase({ banco: b.nome, aplicadas: await adaptadorDo(b).listarAplicadas(), arquivos, ...(f['--corte'] ? { corte: f['--corte'] } : {}), ...(f['--herdados-desde'] ? { herdadosDesde: f['--herdados-desde'] } : {}), agora: new Date() })
      guardaDo(b).escrever(arq, `${JSON.stringify(lb, null, 2)}\n`)
      for (const a of avisos) out(`aviso: ${a}`)
      out(`linha de base de ${b.nome}: corte ${lb.corte}, ${lb.aplicadas.length} linhas no ledger, ${lb.pendentes_herdados.length} herdado(s), ${lb.antigos_sem_ledger} antigo(s) sem ledger fora do plano · ${arq}`)
      return 0
    }
    if (verbo === 'sonda') {
      const { pos } = flags(resto, [])
      if (pos.length !== 1) throw new Uso('sonda pede o banco')
      const b = acharBanco(pos[0]!)
      const ok = await adaptadorDo(b).sonda()
      guardaDo(b).escrever(arquivoSonda(b.nome), `${JSON.stringify({ banco: b.nome, banco_id: b.bancoId, mesma_transacao: ok, em: new Date().toISOString() }, null, 2)}\n`)
      out(ok ? `sonda ${b.nome}: duas instruções no mesmo texto rodam na mesma transação; o aplicar está liberado neste banco` : `sonda ${b.nome}: VERMELHA (txid diferente): o aplicar fica recusado neste banco`)
      return ok ? 0 : 1
    }
    if (verbo === 'aplicar') {
      const { pos, f } = flags(resto, ['--token'])
      if (pos.length !== 2) throw new Uso('aplicar pede o repo e o arquivo')
      const tty = meios.tty ?? (!!process.stdin.isTTY && !!process.stdout.isTTY)
      let rl: ReturnType<typeof createInterface> | null = null
      const perguntar =
        meios.perguntar ??
        (async (t: string) => {
          rl ??= createInterface({ input: process.stdin, output: process.stdout })
          return rl.question(t)
        })
      try {
        const r = await aplicar(
          { repo: pos[0]!, arquivo: pos[1]!, ...(f['--token'] ? { token: f['--token'] } : {}) },
          { tty, perguntar, escrever: out, usuario: meios.usuario ?? process.env.USER ?? process.env.LOGNAME ?? 'desconhecido', agora: meios.agora ?? (() => new Date()) },
        )
        if (r.ok) return 0
        err(`[orq migrations] ${r.tipo === 'recusa' ? 'RECUSADO' : r.tipo === 'incerto' ? 'INCERTO' : 'FALHOU'}: ${r.motivo}`)
        return 1
      } finally {
        ;(rl as ReturnType<typeof createInterface> | null)?.close()
      }
    }
    throw new Uso(verbo ? `verbo desconhecido: ${verbo}` : 'falta o verbo')
  } catch (e) {
    if (e instanceof Uso) {
      err(`[orq migrations] ${e.message}\n${USO}`)
      return 2
    }
    err(`[orq migrations] ${(e as Error).message}`)
    return 1
  }
}

if (/migrations\/cli\.(ts|js)$/.test(process.argv[1] ?? '')) process.exit(await main(process.argv.slice(2)))
