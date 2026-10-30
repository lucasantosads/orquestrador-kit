import { expect, mock, test } from 'claude-code/testing'

// FS de mentira que imita o macOS: /tmp e symlink para /private/tmp.
// `links` sao symlinks (origem -> alvo); `existe` sao os caminhos reais que existem.
const ROOT = '/tmp/spike-mods-repo'
const REAL_ROOT = '/private/tmp/spike-mods-repo'
const ESCOPO = '/Users/lucasantos/orq-sessoes/spike-mods/escopo.json'
const LOG = '/Users/lucasantos/orq-sessoes/spike-mods/escopo.log.jsonl'

const links: Record<string, string> = {
  '/tmp': '/private/tmp',
  [`${REAL_ROOT}/link-fora`]: '/Users/lucasantos/segredo.txt',
  [`${REAL_ROOT}/link-tmp`]: '/private/tmp/outro',
}
const existe = new Set([
  '/', '/private', '/private/tmp', '/private/tmp/outro', '/Users', '/Users/lucasantos',
  '/Users/lucasantos/segredo.txt', REAL_ROOT, `${REAL_ROOT}/.git`, `${REAL_ROOT}/.git/config`,
  `${REAL_ROOT}/permitido.txt`, `${REAL_ROOT}/proibido.txt`, `${REAL_ROOT}/src`,
])

const realpath = (p: string): string | undefined => {
  let atual = ''
  for (const parte of p.split('/').filter(Boolean)) {
    if (parte === '.') continue
    if (parte === '..') { atual = atual.slice(0, atual.lastIndexOf('/')); continue }
    atual = `${atual}/${parte}`
    for (let n = 0; links[atual] !== undefined && n < 10; n++) atual = links[atual]
  }
  atual = atual || '/'
  return existe.has(atual) ? atual : undefined
}

type Montagem = { env?: Record<string, string>; escopo?: string; log: string[] }

const montar = (on, m: Montagem) => {
  mock.env(on, m.env ?? { ORQ_ESCOPO_FILE: ESCOPO, ORQ_ESCOPO_LOG: LOG })
  on('session.root', () => ({ value: ROOT }))
  on('fs.stat', ($, e) => {
    const real = realpath(e.path)
    if (real === undefined) return { deny: `ENOENT: ${e.path}` }
    return { value: { kind: 'file', size: 0, mtimeMs: 0, isLink: links[e.path] !== undefined, realPath: real } }
  })
  on('fs.read', ($, e) => {
    if (e.path === ESCOPO) return { value: m.escopo ?? JSON.stringify({ permitidos: ['permitido.txt', 'src/**'] }) }
    if (e.path === LOG) return { value: m.log.join('') }
    return { deny: `ENOENT: ${e.path}` }
  })
  on('fs.write', ($, e) => {
    if (e.path === LOG) { m.log.length = 0; m.log.push(e.text) }
    return { value: undefined }
  })
  on('ui.log', () => ({ value: undefined }))
  // O "motor": se o mod deixar passar, a ferramenta roda e responde ok.
  on('tool.call', () => ({ result: 'ESCREVEU' }))
}

const linhas = (m: Montagem) => m.log.join('').trim().split('\n').filter(Boolean).map(l => JSON.parse(l))

const escrever = ($, file_path: string, tool = 'Write') =>
  $.tool.call({ tool, file_path, content: 'OK' })

test('dentro da raiz e casa o glob: segue e registra', async ($, on) => {
  const m: Montagem = { log: [] }
  montar(on, m)
  expect(await escrever($, `${ROOT}/permitido.txt`)).toEqual({ result: 'ESCREVEU' })
  expect(linhas(m)[0]).toMatchObject({ decisao: 'segue', motivo: 'casa glob', rel: 'permitido.txt' })
})

test('dentro da raiz e casa glob ** em pasta nova: segue', async ($, on) => {
  const m: Montagem = { log: [] }
  montar(on, m)
  expect(await escrever($, `${ROOT}/src/novo/dir/a.ts`)).toEqual({ result: 'ESCREVEU' })
  expect(linhas(m)[0]).toMatchObject({ decisao: 'segue', rel: 'src/novo/dir/a.ts' })
})

test('dentro da raiz e nao casa: nega com a mensagem', async ($, on) => {
  const m: Montagem = { log: [] }
  montar(on, m)
  const r = await escrever($, `${ROOT}/proibido.txt`)
  expect(r).toEqual({ deny: `fora do escopo do ticket: ${ROOT}/proibido.txt` })
  expect(linhas(m)[0]).toMatchObject({ decisao: 'nega', motivo: 'nao casa glob' })
})

test('Edit e NotebookEdit tambem sao guardados', async ($, on) => {
  const m: Montagem = { log: [] }
  montar(on, m)
  expect((await $.tool.call({ tool: 'Edit', file_path: `${ROOT}/proibido.txt`, old_string: 'a', new_string: 'b' })).deny).toBeDefined()
  expect((await $.tool.call({ tool: 'NotebookEdit', notebook_path: `${ROOT}/x.ipynb`, new_source: '' })).deny).toBeDefined()
  expect((await $.tool.call({ tool: 'MultiEdit', file_path: `${ROOT}/proibido.txt`, edits: [] })).deny).toBeDefined()
})

test('.git: nega mesmo com glob que casaria', async ($, on) => {
  const m: Montagem = { log: [], escopo: JSON.stringify({ permitidos: ['**'] }) }
  montar(on, m)
  const r = await escrever($, `${ROOT}/.git/config`, 'Edit')
  expect(r).toEqual({ deny: `fora do escopo do ticket: ${ROOT}/.git/config` })
  expect(linhas(m)[0]).toMatchObject({ decisao: 'nega', motivo: '.git' })
})

test('/tmp fora da raiz: segue', async ($, on) => {
  const m: Montagem = { log: [] }
  montar(on, m)
  expect(await escrever($, '/tmp/outro/rascunho.txt')).toEqual({ result: 'ESCREVEU' })
  expect(linhas(m)[0]).toMatchObject({ decisao: 'segue', motivo: '/tmp' })
})

test('.. que volta para dentro e nao casa: nega', async ($, on) => {
  const m: Montagem = { log: [] }
  montar(on, m)
  const r = await escrever($, `${ROOT}/src/../proibido.txt`)
  expect(r.deny).toBe(`fora do escopo do ticket: ${ROOT}/src/../proibido.txt`)
  expect(linhas(m)[0]).toMatchObject({ rel: 'proibido.txt', decisao: 'nega' })
})

test('.. que escapa da raiz para fora de tudo: nega', async ($, on) => {
  const m: Montagem = { log: [] }
  montar(on, m)
  const r = await escrever($, `${ROOT}/../../../Users/lucasantos/novo.txt`)
  expect(r.deny).toBeDefined()
  expect(linhas(m)[0]).toMatchObject({ real: '/Users/lucasantos/novo.txt', motivo: 'fora da raiz' })
})

test('.. num arquivo que ainda nao existe nao vira atalho: nega', async ($, on) => {
  const m: Montagem = { log: [] }
  montar(on, m)
  const r = await escrever($, `${ROOT}/src/nao-existe/../../../../Users/lucasantos/x.txt`)
  expect(r.deny).toBeDefined()
})

test('symlink dentro da raiz apontando para fora: nega', async ($, on) => {
  const m: Montagem = { log: [], escopo: JSON.stringify({ permitidos: ['link-fora'] }) }
  montar(on, m)
  const r = await escrever($, `${ROOT}/link-fora`)
  expect(r).toEqual({ deny: `fora do escopo do ticket: ${ROOT}/link-fora` })
  expect(linhas(m)[0]).toMatchObject({ real: '/Users/lucasantos/segredo.txt', motivo: 'fora da raiz' })
})

test('fora de tudo: nega', async ($, on) => {
  const m: Montagem = { log: [] }
  montar(on, m)
  const r = await escrever($, '/Users/lucasantos/segredo.txt')
  expect(r.deny).toBe('fora do escopo do ticket: /Users/lucasantos/segredo.txt')
})

test('sem ORQ_ESCOPO_FILE: segue e registra', async ($, on) => {
  const m: Montagem = { log: [], env: { ORQ_ESCOPO_LOG: LOG } }
  montar(on, m)
  expect(await escrever($, '/Users/lucasantos/segredo.txt')).toEqual({ result: 'ESCREVEU' })
  expect(linhas(m)[0]).toMatchObject({ decisao: 'segue', motivo: 'sem ORQ_ESCOPO_FILE' })
})

test('escopo ilegivel: nega (fecha, nao abre)', async ($, on) => {
  const m: Montagem = { log: [], escopo: '{nao e json' }
  montar(on, m)
  expect((await escrever($, `${ROOT}/permitido.txt`)).deny).toBeDefined()
})

test('ferramenta fora da lista (Read) nao passa pelo guarda', async ($, on) => {
  const m: Montagem = { log: [] }
  montar(on, m)
  expect(await $.tool.call({ tool: 'Read', file_path: '/Users/lucasantos/segredo.txt' })).toEqual({ result: 'ESCREVEU' })
  expect(m.log.length).toBe(0)
})

test('o log acumula uma linha JSON por decisao', async ($, on) => {
  const m: Montagem = { log: [] }
  montar(on, m)
  await escrever($, `${ROOT}/permitido.txt`)
  await escrever($, `${ROOT}/proibido.txt`)
  expect(linhas(m).map(l => l.decisao)).toEqual(['segue', 'nega'])
})
