/**
 * triador-repo-legado.ts — auxiliar dos testes do triador (não é teste): um
 * repo do legado-comarka montado num `mktemp -d` a partir de um caso de
 * `test/fixtures/triador-7f/`.
 */
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, utimesSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'

const json = <T>(p: string): T => JSON.parse(readFileSync(p, 'utf8')) as T

/**
 * Um repo do legado a partir de um caso da fixture: os artefatos voltam ao
 * caminho original, cada linha no número original. A linha que o recorte não
 * guardou vira um quadro de pilha (que o recorte nunca escolhe), e o PASS de
 * critério vira reticências; assim o leitor do repo recorta o mesmo.
 */
export function materializar(d: string, raizDada?: string): string {
  const raiz = raizDada ?? mkdtempSync(join(tmpdir(), 'triador-legado-'))
  const caso = json<{ id: string; arquivo_ticket: string; fim: string }>(join(d, 'caso.json'))
  const serie = json<{ k: number; dir: string }[]>(join(d, 'serie.json'))
  const escreve = (rel: string, txt: string) => {
    mkdirSync(dirname(join(raiz, rel)), { recursive: true })
    writeFileSync(join(raiz, rel), txt)
  }
  escreve(caso.arquivo_ticket, `# ${caso.id}\n\n\`\`\`json\n${readFileSync(join(d, 'ticket.json'), 'utf8')}\`\`\`\n`)
  escreve('docs/fila/000-config.json', readFileSync(join(d, 'config.json'), 'utf8'))
  const log = readFileSync(join(d, 'log.txt'), 'utf8').split('\n').filter(Boolean)
  const ultimo = Number(log.at(-1)!.split('\t')[0])
  const linhas = Array.from({ length: ultimo }, () => '')
  for (const l of log) linhas[Number(l.slice(0, l.indexOf('\t'))) - 1] = l.slice(l.indexOf('\t') + 1)
  escreve('docs/fila/runs/local-loop.log', linhas.join('\n') + '\n')
  const base = serie[0]!.dir.split('/').slice(0, 4).join('/')
  escreve(`${base}/meta.json`, readFileSync(join(d, 'meta.json'), 'utf8'))
  const fimS = Date.parse(caso.fim) / 1000 - 60
  for (const s of serie) {
    const de = join(d, `attempt-${s.k}`)
    for (const f of readdirSync(de)) {
      if (f.endsWith('.linhas.json') || f === 'presenca.json') continue
      let txt = readFileSync(join(de, f), 'utf8')
      const mapa = join(de, f.replace(/\.txt$/, '.linhas.json'))
      if (f.endsWith('.txt') && existsSync(mapa)) {
        const { total, faixas } = json<{ total: number; faixas: [number, number][] }>(mapa)
        const enche = f === 'gate-vitest.txt' ? '    at fora (do-recorte.js:1:1)' : '…'
        const out: string[] = Array.from({ length: total }, () => enche)
        const ts = txt.split('\n')
        let i = 0
        for (const [a, b] of faixas) for (let n = a; n <= b; n++) out[n - 1] = ts[i++]!
        txt = out.join('\n')
      }
      escreve(`${s.dir}/${f}`, txt)
    }
    // os arquivos que a fixture não copiou (gate-build, diff.raw…) existem pela presença
    for (const f of json<string[]>(join(de, 'presenca.json'))) {
      if (!existsSync(join(raiz, s.dir, f))) escreve(`${s.dir}/${f}`, '')
    }
    for (const f of readdirSync(join(raiz, s.dir))) utimesSync(join(raiz, s.dir, f), fimS, fimS)
  }
  return raiz
}
