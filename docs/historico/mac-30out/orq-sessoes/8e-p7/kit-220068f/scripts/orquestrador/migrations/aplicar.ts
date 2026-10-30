/**
 * aplicar.ts — `orq migrations aplicar <repo> <arquivo> [--token T]` (etapa MIG-A, P4).
 *
 * O único caminho que aplica migration (decisão 1 de 18/10). Nesta ordem, e
 * cada recusa sai antes de qualquer escrita (as primeiras, antes da rede):
 *
 *   1. interruptor `~/.orq/MIGRATIONS_PAUSADO`;
 *   2. o repo é o escritor de um banco (somente_leitura recusa);
 *   3. TTY: só no terminal, com a confirmação digitada;
 *   4. sonda verde do banco (`<banco>.sonda.json`) e linha de base;
 *   5. o repo não está pausado e o arquivo de liberação está limpo (E5);
 *   6. a trava do banco;
 *   7. o arquivo está no plano (pendente ou herdado) e não diverge entre refs;
 *   8. exatamente um token (do .sql ou do --token), ainda não liberado;
 *   9. o SQL passa no preparo (sql.ts);
 *  10. o `pre_check` do repo, com o .sql extraído, sai 0;
 *  11. mostra o SQL e o aviso de classe, e pede a versão digitada.
 *
 * Depois aplica, CONFERE no schema_migrations que a versão entrou com o nome
 * (sem isso, nunca há token: erro, incerto sem a linha ou conferência que falha
 * param aqui) e só então escreve o token no repo (liberacao.ts). Cada passo
 * vai para `~/.orq/migrations/ledger.jsonl`. Nunca push.
 */
import { existsSync, readFileSync, rmSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { join } from 'node:path'
import { arquivosDoBanco, conteudoDe } from './arquivos.js'
import { arquivoLinhaBase, arquivoSonda, guardaDo, interruptorMigrations, lerJson, raizMigrations, registrar, travar } from './caminhos.js'
import { bancoDoEscritor, type Banco, type RepoMig } from './config.js'
import { bloqueiosDoRepo, comitarLiberacao, comToken, configDoRepo, jaLiberadoNoTexto, tokenDado, tokensDoSql } from './liberacao.js'
import { montarPlano, type LinhaBase } from './plano.js'
import { avisosDeClasse, prepararSql } from './sql.js'
import { criarAdaptador, lerCredencial, type Adaptador } from './supabase.js'

export interface Meios {
  tty: boolean
  perguntar: (texto: string) => Promise<string>
  escrever: (texto: string) => void
  usuario: string
  agora: () => Date
}

export type Saida = { ok: true; commit: string; token: string } | { ok: false; tipo: 'recusa' | 'falha' | 'incerto'; motivo: string }

const recusa = (motivo: string): Saida => ({ ok: false, tipo: 'recusa', motivo })

/** O adaptador do banco, com a credencial do escritor (lida só aqui). */
export function adaptadorDo(banco: Banco): Adaptador {
  const r = banco.escritor
  if (!r || !r.credencialEnv) throw new Error(`banco ${banco.nome} sem repo escritor com credencial_env`)
  const httpS = process.env.ORQ_TESTE === '1' && process.env.ORQ_MIGRATIONS_HTTP_TIMEOUT_S ? Number(process.env.ORQ_MIGRATIONS_HTTP_TIMEOUT_S) : banco.timeouts.httpS
  return criarAdaptador({ bancoId: banco.bancoId, token: lerCredencial(r.caminho, r.envArquivo, r.credencialEnv), timeouts: { ...banco.timeouts, httpS } })
}

export async function aplicar(e: { repo: string; arquivo: string; token?: string }, m: Meios): Promise<Saida> {
  if (existsSync(interruptorMigrations())) return recusa(`${interruptorMigrations()} existe (MIGRATIONS_PAUSADO): nada aplica`)
  let banco: Banco
  let repo: RepoMig
  try {
    ;({ banco, repo } = bancoDoEscritor(e.repo))
  } catch (x) {
    return recusa((x as Error).message)
  }
  if (repo.somenteLeitura || !repo.token) return recusa(`${repo.nome} é somente_leitura no banco ${banco.nome}: só conta para o plano e o drift`)
  const molde = repo.token.molde
  if (!m.tty) return recusa('sem TTY: o aplicar só roda no terminal, com a confirmação digitada')
  if (lerJson<{ mesma_transacao?: unknown }>(arquivoSonda(banco.nome))?.mesma_transacao !== true) return recusa(`sem sonda verde do banco ${banco.nome}: rode 'orq migrations sonda ${banco.nome}' antes`)
  const lb = lerJson<LinhaBase>(arquivoLinhaBase(banco.nome))
  if (!lb) return recusa(`sem linha de base do banco ${banco.nome}: rode 'orq migrations linha-base ${banco.nome}' antes`)
  let cfg: ReturnType<typeof configDoRepo>
  try {
    cfg = configDoRepo(repo.caminho)
  } catch (x) {
    return recusa((x as Error).message)
  }
  const bloq = bloqueiosDoRepo(repo.caminho, cfg)
  if (bloq.length) return recusa(bloq.join('; '))

  const g = guardaDo(banco)
  const solta = travar(g, banco.nome)
  if (typeof solta === 'string') return recusa(solta)
  let ad: Adaptador | null = null
  const mask = (s: string) => (ad ? ad.mascarar(s) : s)
  try {
    ad = adaptadorDo(banco)
    const a = ad
    const { arquivos } = arquivosDoBanco(banco)
    const plano = montarPlano(lb, await a.listarAplicadas(), arquivos)
    const quer = e.arquivo.replace(/^\.\//, '')
    const casa = (x: { repo: string; arquivo: string }) => x.repo === repo.nome && (x.arquivo === quer || x.arquivo.split('/').pop() === quer.split('/').pop())
    const herdado = plano.herdados.find(casa)
    const alvo = plano.pendentes.find(casa) ?? herdado
    if (!alvo) return recusa(`${e.arquivo} está fora do plano do banco ${banco.nome} (já aplicado, antigo ou inexistente): veja 'orq migrations plano ${banco.nome}'`)
    if (alvo.divergente) return recusa(`${alvo.arquivo} tem conteúdo diferente entre os refs ${alvo.refs.join(', ')}: alinhe antes`)
    const { ref, sql } = conteudoDe(repo, alvo)

    const doSql = tokensDoSql(sql, molde)
    let token: string
    if (e.token !== undefined) {
      const t = tokenDado(e.token, molde)
      if (!t) return recusa(`--token ${e.token} não casa o molde humano:${molde}`)
      token = t
    } else if (doSql.length === 1) token = doSql[0]!
    else return recusa(doSql.length ? `o .sql cita ${doSql.length} tokens (${doSql.join(', ')}): diga qual com --token` : `o .sql não cita token humano:${molde}: diga qual com --token`)
    const libAbs = join(repo.caminho, cfg.liberacoesFile)
    const antes = readFileSync(libAbs, 'utf8')
    if (jaLiberadoNoTexto(antes, token)) return recusa(`${token} já está liberado em ${cfg.liberacoesFile}`)

    const prep = prepararSql(sql)
    if (!prep.ok) return recusa(`${alvo.arquivo}: ${prep.motivo}`)

    if (repo.preCheck) {
      const tmp = join(raizMigrations(), 'tmp', alvo.arquivo.split('/').pop()!)
      g.escrever(tmp, sql)
      try {
        const args = repo.preCheck.map((x) => x.split('{arquivo}').join(tmp))
        const p = spawnSync(args[0]!, args.slice(1), { cwd: repo.caminho, encoding: 'utf8', timeout: 300_000, stdio: ['ignore', 'pipe', 'pipe'] })
        const out = mask(`${p.stdout ?? ''}${p.stderr ?? ''}`.trim())
        m.escrever(`pre_check (${repo.preCheck.join(' ')}): rc ${p.status ?? 'sem rc'}\n${out}`)
        if (p.status !== 0) return recusa(`pre_check saiu rc ${p.status ?? 'sem rc'}: ${out.split('\n').slice(-5).join(' | ')}`)
      } finally {
        rmSync(tmp, { force: true })
      }
    }

    const avisos = avisosDeClasse(sql)
    m.escrever(
      [
        `banco    ${banco.nome} (${banco.bancoId})`,
        `repo     ${repo.nome}`,
        `arquivo  ${alvo.arquivo} (ref ${ref}${herdado ? ', herdado da linha de base' : ''})`,
        `versão   ${alvo.versao}   nome ${alvo.nome}`,
        `token    ${token}`,
        avisos.length ? `AVISO de classe: ${avisos.join(', ')}` : 'aviso de classe: nenhum',
        prep.envelope ? 'o envelope begin;/commit; do arquivo sai: o aplicador roda tudo numa transação só' : '',
        '----- SQL -----',
        sql.trimEnd(),
        '---------------',
      ]
        .filter(Boolean)
        .join('\n'),
    )
    const resp = (await m.perguntar(`Digite a versão ${alvo.versao} para aplicar (qualquer outra coisa cancela): `)).trim()
    if (resp !== alvo.versao) return recusa(`confirmação não confere ('${resp.slice(0, 40)}'): nada aplicado`)

    const base = { banco: banco.nome, repo: repo.nome, arquivo: alvo.arquivo, versao: alvo.versao, nome: alvo.nome, ref, usuario: m.usuario }
    registrar(g, { ...base, tipo: 'aplicar_inicio', herdado: !!herdado, avisos })
    const criadoPor = `orq-aplicador:${m.usuario}`
    const r = await a.aplicar({ corpo: prep.corpo, statements: prep.statements, versao: alvo.versao, nome: alvo.nome, criadoPor })
    let achou: boolean
    try {
      achou = (await a.listarAplicadas()).some((l) => l.version === alvo.versao && l.name === alvo.nome)
    } catch (x) {
      registrar(g, { ...base, tipo: 'incerto', resultado: r.ok ? 'ok' : r.mensagem, conferencia: mask((x as Error).message) })
      return { ok: false, tipo: 'incerto', motivo: `não consegui conferir no schema_migrations (${mask((x as Error).message)}): não sei se aplicou, e não emiti token; rode 'orq migrations plano ${banco.nome}'` }
    }
    if (!achou) {
      if (r.ok) {
        registrar(g, { ...base, tipo: 'conferencia_falhou' })
        return { ok: false, tipo: 'falha', motivo: `a API disse ok, mas a conferência não achou ${alvo.versao} ${alvo.nome} no schema_migrations: não emiti token; confira à mão` }
      }
      registrar(g, { ...base, tipo: r.incerto ? 'incerto' : 'falhou', mensagem: r.mensagem })
      return r.incerto
        ? { ok: false, tipo: 'incerto', motivo: `${r.mensagem}; a versão não está no schema_migrations agora: não emiti token; rode 'orq migrations plano ${banco.nome}' antes de tentar de novo` }
        : { ok: false, tipo: 'falha', motivo: `o banco recusou (nada aplicado): ${r.mensagem}` }
    }
    registrar(g, { ...base, tipo: 'aplicada', created_by: criadoPor, ...(r.ok ? {} : { resposta: r.mensagem, incerto_resolvido: true }) })

    const ainda = bloqueiosDoRepo(repo.caminho, cfg)
    const nota = `aplicador do kit, versão ${alvo.versao}, arquivo ${alvo.arquivo}, ref ${ref}, usuário ${m.usuario}`
    const novo = ainda.length ? null : comToken(readFileSync(libAbs, 'utf8'), repo.token, token, nota, m.usuario)
    const mensagem = `liberacoes: ${token} (migration ${alvo.versao} aplicada pelo aplicador do kit)\n\n${alvo.arquivo} (ref ${ref}) aplicada no banco ${banco.nome} (${banco.bancoId}) e conferida no schema_migrations.\n\nOrq-Aplicador: ${banco.nome} ${alvo.versao} ${alvo.arquivo}\n`
    const c = novo === null ? { ok: false as const, motivo: ainda.join('; ') } : !novo.ok ? { ok: false as const, motivo: novo.motivo } : comitarLiberacao(repo.caminho, cfg, readFileSync(libAbs, 'utf8'), novo.conteudo, mensagem)
    if (!c.ok) {
      registrar(g, { ...base, tipo: 'token_falhou', token, motivo: c.motivo })
      return { ok: false, tipo: 'falha', motivo: `aplicada e conferida, mas o token ${token} NÃO foi escrito (${c.motivo}): libere à mão, com a nota '${nota}'` }
    }
    registrar(g, { ...base, tipo: 'token_emitido', token, commit: c.commit })
    m.escrever(`APLICADA ${alvo.versao} ${alvo.nome} · conferida · token ${token} no commit ${c.commit.slice(0, 12)} (sem push)`)
    return { ok: true, commit: c.commit, token }
  } catch (x) {
    return { ok: false, tipo: 'falha', motivo: mask((x as Error).message) }
  } finally {
    solta()
  }
}

