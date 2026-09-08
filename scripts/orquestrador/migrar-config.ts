/**
 * migrar-config.ts — `docs/fila/000-config.json` schema 1 → 2, pela tabela
 * explícita de `config-tabela.ts` (peça K8b-4).
 *
 * Uso:
 *   migrar-config.ts <caminho-do-000-config.json> [--dry-run|--propor|--aplicar]
 *
 *   --dry-run  (padrão) calcula, imprime o diff e o veredito do `orq config`
 *              sobre o PROPOSTO. Não escreve nada.
 *   --propor   grava `000-config.proposto.json` AO LADO do oficial. O oficial
 *              não é tocado.
 *   --aplicar  move o proposto para o lugar do oficial e deixa `.bak`.
 *
 * POR QUE TRÊS MODOS, e não os dois das outras migrações: config não é dado, é
 * DECISÃO. As outras migrações mudam a forma de um fato já decidido (um token
 * foi liberado; a fila está pausada). Esta produz um arquivo que ainda tem
 * buracos — as decisões que a v1 nunca tomou — e um instalador que gravasse
 * isso por cima do config em uso trocaria um config que funciona por um cheio de
 * placeholders. O `--aplicar` é passo HUMANO, depois de preencher; o
 * `instalar.sh --migrar` nunca o chama.
 */
import {
  copyFileSync,
  existsSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  renameSync,
  writeFileSync,
} from 'node:fs'
import { spawnSync } from 'node:child_process'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { CHAVES_OBRIGATORIAS } from './config-chaves.js'
import { GATE_TIPOS, NOVAS, PROPRIAS_DE_REPO, RENOMES } from './config-tabela.js'
import { diffUnificado, json, lerJson } from './migrar-comum.js'

/**
 * As obrigatórias que o motor lê. Importadas, nunca recopiadas: uma chave nova
 * no motor que ninguém puser na tabela aparece sozinha no relatório como
 * "AINDA AUSENTE, e a tabela não cobre".
 */
const CHAVES = CHAVES_OBRIGATORIAS.map((c) => c.chave)

const QUEM = 'migrar-config'
export const NOME_PROPOSTO = '000-config.proposto.json'

type Obj = Record<string, unknown>

/** Lê `a.b.c`. `undefined` quando falta (ou quando o caminho passa por escalar). */
export function ler(obj: unknown, caminho: string): unknown {
  let no: unknown = obj
  for (const parte of caminho.split('.')) {
    if (!no || typeof no !== 'object') return undefined
    no = (no as Obj)[parte]
  }
  return no
}

/** Escreve `a.b.c`, criando os objetos do caminho. Não sobrescreve valor existente. */
function porSeFaltar(obj: Obj, caminho: string, valor: unknown): boolean {
  const partes = caminho.split('.')
  const folha = partes.pop()!
  let no: Obj = obj
  for (const p of partes) {
    if (!no[p] || typeof no[p] !== 'object' || Array.isArray(no[p])) no[p] = {}
    no = no[p] as Obj
  }
  if (no[folha] !== undefined && no[folha] !== null) return false
  no[folha] = valor
  return true
}

export interface Proposta {
  /** O config proposto, já serializado. */
  proposto: string
  /** Uma linha por decisão. É o relatório. */
  linhas: string[]
  /** Os placeholders que sobraram, por caminho. */
  placeholders: string[]
}

/**
 * Aplica a tabela. NUNCA remove: renome COPIA, chave nova só entra onde falta,
 * e tudo que a tabela não conhece atravessa intacto.
 */
export function propor(raiz: unknown): Proposta {
  if (!raiz || typeof raiz !== 'object' || Array.isArray(raiz)) {
    throw new Error('000-config.json não é um objeto JSON')
  }
  // Cópia profunda: a entrada é do chamador e o teste compara com ela.
  const cfg = JSON.parse(JSON.stringify(raiz)) as Obj
  const linhas: string[] = []
  const placeholders: string[] = []

  const versaoAntes = cfg.$schema_versao
  cfg.$schema_versao = 2
  linhas.push(
    versaoAntes === 2
      ? '$schema_versao já era 2'
      : `$schema_versao: ${JSON.stringify(versaoAntes ?? null)} → 2`,
  )

  // --- 1. renomes: `de` fica, `para` nasce ----------------------------------
  for (const r of RENOMES) {
    const valor = ler(cfg, r.de)
    if (valor === undefined || valor === null) continue
    const jaTinha = ler(cfg, r.para)
    if (jaTinha !== undefined && jaTinha !== null) {
      linhas.push(`renome ${r.de} → ${r.para}: NÃO aplicado, '${r.para}' já existe com valor próprio`)
      continue
    }
    porSeFaltar(cfg, r.para, valor)
    linhas.push(`renome ${r.de} → ${r.para} = ${JSON.stringify(valor)} (o '${r.de}' FICA). ${r.porque}`)
  }

  // --- 2. gates: o vocabulário de `tipo`, e a ordem obrigatória --------------
  const gates = Array.isArray(cfg.gates) ? (cfg.gates as Obj[]) : []
  for (const g of gates) {
    const t = GATE_TIPOS.find((x) => x.de === g.tipo)
    if (!t) continue
    g.tipo = t.para
    linhas.push(`gate '${g.nome}': tipo '${t.de}' → '${t.para}'. ${t.porque}`)
  }
  const semNome = gates.filter((g) => typeof g.nome !== 'string' || !g.nome).length
  if (semNome) linhas.push(`ATENÇÃO: ${semNome} gate(s) sem 'nome' — o motor não consegue nomeá-los na linha GATE`)

  // --- 3. chaves novas ------------------------------------------------------
  for (const n of NOVAS) {
    if (n.procedencia === 'derivada') {
      if (n.chave === '_execucao_dos_gates.ordem_obrigatoria') {
        const ordem = gates.map((g) => g.nome).filter((x): x is string => typeof x === 'string')
        if (porSeFaltar(cfg, n.chave, ordem)) {
          linhas.push(`nova ${n.chave} = ${JSON.stringify(ordem)} (derivada de gates[], na ordem do arquivo). ${n.porque}`)
        }
      }
      continue
    }
    if (!porSeFaltar(cfg, n.chave, n.valor)) continue
    if (n.procedencia === 'local') {
      placeholders.push(n.chave)
      linhas.push(`nova ${n.chave}: PLACEHOLDER — decisão local, ninguém pode tomá-la por você. ${n.porque}`)
    } else {
      linhas.push(`nova ${n.chave} = ${JSON.stringify(n.valor)} (política do motor, não do repo). ${n.porque}`)
    }
  }

  // --- 4. o que fica, e por quê ---------------------------------------------
  for (const p of PROPRIAS_DE_REPO) {
    if (ler(cfg, p.chave) === undefined) continue
    linhas.push(`MANTIDA (própria do ${p.repo}, para a K11 decidir): ${p.chave} — ${p.porque}`)
  }
  // Chaves obrigatórias que a tabela não cobre: o relatório tem de dizer, e não
  // pode inventar. Silêncio aqui seria a migração declarando completo o que não é.
  const naoCobertas = obrigatoriasAusentes(cfg)
  for (const c of naoCobertas) {
    linhas.push(`AINDA AUSENTE, e a tabela não cobre: ${c} — decida à mão (veja config-chaves.ts para quem a lê)`)
  }

  return { proposto: json(cfg), linhas, placeholders }
}

/** As obrigatórias do motor que continuam ausentes DEPOIS da tabela. */
function obrigatoriasAusentes(cfg: Obj): string[] {
  return CHAVES.filter((c) => {
    const v = ler(cfg, c)
    return v === undefined || v === null
  })
}

/** Roda o `orq config` REAL contra um arquivo, e devolve o que ele disse. */
export function orqConfig(caminho: string): { rc: number; saida: string } {
  const cli = join(dirname(fileURLToPath(import.meta.url)), 'config-cli.ts')
  const r = spawnSync('npx', ['tsx', cli, caminho], { encoding: 'utf8' })
  return { rc: r.status ?? 1, saida: `${r.stdout ?? ''}${r.stderr ?? ''}` }
}

export type Modo = 'dry-run' | 'propor' | 'aplicar'

export function migrarArquivo(caminho: string, modo: Modo): { linhas: string[]; proposto: string } {
  const propostoPath = join(dirname(caminho), NOME_PROPOSTO)

  if (modo === 'aplicar') {
    // Passo HUMANO. Ele não recalcula nada: move o arquivo que a pessoa leu e
    // (provavelmente) editou. Recalcular aqui aplicaria um proposto diferente
    // do que foi revisado, que é a única coisa que este modo não pode fazer.
    if (!existsSync(propostoPath)) {
      throw new Error(`${QUEM}: não existe ${propostoPath}. Rode com --propor primeiro, leia o diff, preencha os placeholders.`)
    }
    const linhas: string[] = []
    if (existsSync(caminho)) {
      const bak = `${caminho}.bak`
      if (!existsSync(bak)) {
        copyFileSync(caminho, bak)
        linhas.push(`cópia do config anterior em ${bak}`)
      } else {
        linhas.push(`o .bak já existia e NÃO foi tocado (é o estado ANTES da primeira migração)`)
      }
    }
    renameSync(propostoPath, caminho)
    linhas.push(`APLICADO: ${propostoPath} → ${caminho}`)
    const v = orqConfig(caminho)
    linhas.push('', `orq config sobre o config novo (rc ${v.rc}):`, v.saida.trimEnd())
    return { linhas, proposto: readFileSync(caminho, 'utf8') }
  }

  const raiz = lerJson(caminho)
  const antes = readFileSync(caminho, 'utf8')
  const p = propor(raiz)
  const linhas = [...p.linhas]

  const d = diffUnificado(antes, p.proposto, `${caminho} (oficial, INTOCADO)`, `${propostoPath} (proposto)`)
  linhas.push('', d ? d.trimEnd() : 'nada a mudar: o config já está no schema 2 e completo.')

  if (modo === 'propor') {
    writeFileSync(propostoPath, p.proposto)
    linhas.push('', `PROPOSTO gravado em ${propostoPath}. O oficial NÃO foi tocado.`)
  }

  // `orq config` contra o PROPOSTO — o número que interessa não é quantas
  // chaves entraram, é quantas decisões ainda faltam.
  const alvo = modo === 'propor' ? propostoPath : escreverTemporario(p.proposto)
  const v = orqConfig(alvo)
  linhas.push('', `orq config sobre o PROPOSTO (rc ${v.rc}):`, v.saida.trimEnd())
  if (p.placeholders.length) {
    linhas.push(
      '',
      `${p.placeholders.length} decisão(ões) local(is) esperando alguém: ${p.placeholders.join(', ')}.`,
      'Preencha no proposto e SÓ ENTÃO rode --aplicar. O instalador nunca aplica config por conta própria.',
    )
  }
  return { linhas, proposto: p.proposto }
}

/** O proposto num tmp, só para o `orq config` ter um arquivo para abrir. */
function escreverTemporario(conteudo: string): string {
  const dir = mkdtempSync(join(tmpdir(), 'orq-cfg-'))
  const p = join(dir, '000-config.json')
  writeFileSync(p, conteudo)
  return p
}

function chamadoComoCli(): boolean {
  try {
    return realpathSync(process.argv[1] ?? '') === realpathSync(fileURLToPath(import.meta.url))
  } catch {
    return false
  }
}

if (chamadoComoCli()) {
  try {
    const args = process.argv.slice(2)
    let modo: Modo = 'dry-run'
    const resto: string[] = []
    for (const a of args) {
      if (a === '--dry-run') modo = 'dry-run'
      else if (a === '--propor') modo = 'propor'
      else if (a === '--aplicar') modo = 'aplicar'
      else if (a.startsWith('--')) throw new Error(`${QUEM}: opção desconhecida '${a}'`)
      else resto.push(a)
    }
    const caminho = resto[0]
    if (!caminho) throw new Error(`${QUEM}: falta o caminho do 000-config.json`)
    const abs = resolve(caminho)
    if (!existsSync(abs) && modo !== 'aplicar') throw new Error(`${QUEM}: '${abs}' não existe`)
    const rotulo =
      modo === 'dry-run'
        ? '--dry-run: NADA é escrito'
        : modo === 'propor'
          ? `--propor: grava ${NOME_PROPOSTO} ao lado; o oficial NÃO é tocado`
          : '--aplicar: move o proposto para o lugar do oficial'
    process.stdout.write(`MIGRAR-CONFIG  ${abs}\n               ${rotulo}\n`)
    const r = migrarArquivo(abs, modo)
    for (const l of r.linhas) process.stdout.write(`${l}\n`)
    process.exit(0)
  } catch (e) {
    process.stderr.write(`${(e as Error).message}\n`)
    process.exit(2)
  }
}
