import type { Register } from 'claude-code'

// guarda-escopo: nega escrita fora dos globs do ticket ANTES da escrita.
// Regra do programa: so nega, nunca aprova. Toda saida e `next(e)` (segue
// para a checagem de permissao normal do claude) ou `{ deny }`.

const FERRAMENTAS = ['Edit', 'Write', 'MultiEdit', 'NotebookEdit']
const TMP = ['/tmp', '/private/tmp']

const msgFora = (caminho: string) => `fora do escopo do ticket: ${caminho}`

// Glob do ticket -> RegExp sobre o caminho relativo a raiz.
// `**/` = zero ou mais diretorios, `**` = qualquer coisa, `*` e `?` sem `/`.
export const globParaRegex = (glob: string): RegExp => {
  let re = ''
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i]
    if (c === '*' && glob[i + 1] === '*') {
      if (glob[i + 2] === '/') { re += '(?:.*/)?'; i += 2 } else { re += '.*'; i += 1 }
    } else if (c === '*') re += '[^/]*'
    else if (c === '?') re += '[^/]'
    else re += c.replace(/[.+^${}()|[\]\\]/g, '\\$&')
  }
  return new RegExp(`^${re}$`)
}

export const casa = (rel: string, globs: readonly string[]) =>
  globs.some(g => globParaRegex(g.replace(/^\.\//, '')).test(rel))

const dentro = (p: string, raiz: string) => p === raiz || p.startsWith(raiz + '/')

// Onde o caminho cai de verdade (realpath, symlinks seguidos, `..` dobrado).
// Arquivo que ainda nao existe: sobe ate o primeiro ancestral que resolve e
// recoloca o resto, que nao pode ter `.`/`..`. Sem lugar: undefined -> nega.
async function situar($, caminho: string): Promise<string | undefined> {
  const proprio = await $.fs.stat(caminho, { resolve: true }).catch(() => undefined)
  if (proprio) return proprio.realPath
  const partes = caminho.split('/')
  const resto: string[] = []
  while (partes.length > 1) {
    const nome = partes.pop() as string
    if (nome === '' || nome === '.' || nome === '..') return undefined
    resto.unshift(nome)
    const pasta = partes.join('/') || '/'
    const st = await $.fs.stat(pasta, { resolve: true }).catch(() => undefined)
    if (st) return st.realPath === undefined ? undefined
      : `${st.realPath.replace(/\/$/, '')}/${resto.join('/')}`
  }
  return undefined
}

async function registrar($, linha: Record<string, unknown>) {
  const log = await $.env.get('ORQ_ESCOPO_LOG')
  const texto = JSON.stringify({ ts: new Date().toISOString(), ...linha })
  if (!log) {
    $.ui.log(`guarda-escopo ${texto}`, { to: 'debug' })
    return
  }
  const antes = await $.fs.read(log).catch(() => '')
  await $.fs.write(log, `${antes}${texto}\n`)
}

async function decidir($, e) {
  const caminho = e.file_path ?? e.notebook_path
  const base = { tool: e.tool, caminho }
  const escopoFile = await $.env.get('ORQ_ESCOPO_FILE')
  if (!escopoFile) {
    await registrar($, { ...base, decisao: 'segue', motivo: 'sem ORQ_ESCOPO_FILE' })
    return undefined
  }
  if (typeof caminho !== 'string' || caminho === '') {
    await registrar($, { ...base, decisao: 'nega', motivo: 'sem caminho' })
    return msgFora(String(caminho))
  }
  let permitidos: string[]
  try {
    const j = JSON.parse(await $.fs.read(escopoFile))
    if (!Array.isArray(j.permitidos) || j.permitidos.some(g => typeof g !== 'string')) throw new Error('permitidos invalido')
    permitidos = j.permitidos
  } catch (err) {
    // Escopo declarado e ilegivel: fecha, nao abre.
    await registrar($, { ...base, decisao: 'nega', motivo: `escopo ilegivel: ${err}` })
    return msgFora(caminho)
  }
  const raizSessao = await $.session.root()
  const raiz = (await $.fs.stat(raizSessao, { resolve: true }).catch(() => undefined))?.realPath
  const real = await situar($, caminho)
  if (raiz === undefined || real === undefined) {
    await registrar($, { ...base, real, raiz, decisao: 'nega', motivo: 'nao resolve' })
    return msgFora(caminho)
  }
  if (dentro(real, raiz)) {
    const rel = real === raiz ? '' : real.slice(raiz.length + 1)
    if (rel === '.git' || rel.startsWith('.git/')) {
      await registrar($, { ...base, real, rel, decisao: 'nega', motivo: '.git' })
      return msgFora(caminho)
    }
    if (rel !== '' && casa(rel, permitidos)) {
      await registrar($, { ...base, real, rel, decisao: 'segue', motivo: 'casa glob' })
      return undefined
    }
    await registrar($, { ...base, real, rel, decisao: 'nega', motivo: 'nao casa glob' })
    return msgFora(caminho)
  }
  if (TMP.some(t => dentro(real, t))) {
    await registrar($, { ...base, real, decisao: 'segue', motivo: '/tmp' })
    return undefined
  }
  await registrar($, { ...base, real, decisao: 'nega', motivo: 'fora da raiz' })
  return msgFora(caminho)
}

export const register: Register = on => {
  on('tool.call', { tool: FERRAMENTAS }, async ($, e, next) => {
    const negar = await decidir($, e)
    return negar === undefined ? next(e) : { deny: negar }
  }).catch(($, e, next) =>
    // Falha do guarda antes de decidir: nega (fail closed).
    next.called ? next(e) : { deny: `guarda-escopo falhou (${next.error?.kind}); escrita nao feita` },
  )
}
