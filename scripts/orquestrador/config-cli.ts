/**
 * config-cli.ts — o validador de `docs/fila/000-config.json` (`orq config`).
 *
 * O modo de falha que ele existe para pegar: o config recém-copiado de
 * `doutrina/templates/config.json`. Ele é um FORMULÁRIO — `<ex: ...>` em toda
 * parte — e nada no motor recusa um placeholder. O `jq` devolve a string
 * literal `<ex: supabase/migrations | db/migrations>`, o motor a usa como
 * caminho, e o run morre depois, longe da causa, com uma mensagem sobre um
 * diretório de nome improvável. O mesmo vale para chave AUSENTE: `jq -r` de uma
 * chave que não existe devolve a string `"null"`, e o motor segue com uma
 * branch chamada "null".
 *
 * READ-ONLY, como todo o `orq` fora de pausar/retomar: abre o config, imprime, sai.
 *
 * Uso: config-cli.ts <caminho-do-000-config.json>
 * rc 0 sem violação; rc 1 com. Uma linha por violação, e cada uma NOMEIA a
 * chave — e, quando é chave obrigatória ausente, diz de onde o motor a lê.
 */
import { readFileSync, realpathSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { CHAVES_OBRIGATORIAS } from './config-chaves.js'

export interface Violacao {
  /** Caminho da chave, com ponto e índice: `gates[0].nome`. */
  chave: string
  /** O que está errado. Uma linha. */
  mensagem: string
}

/**
 * Um valor é PLACEHOLDER quando ele É um — começa com `<` e termina com `>` —,
 * nunca quando apenas MENCIONA um. A `descricao` do template diz "Placeholders
 * <ASSIM> são decisões locais": cobrar por substring reprovaria o próprio texto
 * que explica a regra, e um validador que reprova config correto é um validador
 * que alguém desliga.
 */
export function ehPlaceholder(v: unknown): boolean {
  if (typeof v !== 'string') return false
  const t = v.trim()
  return t.startsWith('<') && t.endsWith('>') && t.length > 2
}

/** Anda o objeto inteiro e devolve o caminho de todo valor que É placeholder. */
export function placeholders(no: unknown, prefixo = ''): string[] {
  const achados: string[] = []
  if (Array.isArray(no)) {
    no.forEach((v, i) => achados.push(...placeholders(v, `${prefixo}[${i}]`)))
  } else if (no && typeof no === 'object') {
    for (const [k, v] of Object.entries(no as Record<string, unknown>)) {
      achados.push(...placeholders(v, prefixo ? `${prefixo}.${k}` : k))
    }
  } else if (ehPlaceholder(no)) {
    achados.push(prefixo)
  }
  return achados
}

/** Lê `a.b.c` (sem índices) de um objeto. `undefined` quando falta. */
function emCaminho(obj: unknown, caminho: string): unknown {
  let no: unknown = obj
  for (const parte of caminho.split('.')) {
    if (!no || typeof no !== 'object') return undefined
    no = (no as Record<string, unknown>)[parte]
  }
  return no
}

/** Ausente = a chave não existe, ou existe como null. Lista/objeto VAZIO conta como presente. */
function ausente(v: unknown): boolean {
  return v === undefined || v === null
}

/**
 * O papel de um gate: `papel` declarado, ou inferido do nome. É a MESMA regra
 * de `papel_do_gate` (executor.sh:476-492), na mesma ordem — e é por isso que
 * ela está transcrita aqui em vez de reinventada: um gate que este validador
 * aprova e o executor lê como `nao-configurado` seria um validador mentindo.
 */
export function papelDoGate(nome: string, declarado?: unknown): string {
  if (typeof declarado === 'string' && declarado !== '' && declarado !== 'null') return declarado
  const n = nome.toLowerCase()
  if (n.includes('typecheck') || n.includes('tsc') || n.includes('types')) return 'typecheck'
  if (n.includes('lint')) return 'lint'
  if (n.includes('build') || n.includes('compil')) return 'build'
  if (n.includes('test') || n.includes('spec')) return 'testes'
  return ''
}

export function validarConfig(cfg: unknown): Violacao[] {
  const v: Violacao[] = []
  if (!cfg || typeof cfg !== 'object' || Array.isArray(cfg)) {
    return [{ chave: '(raiz)', mensagem: 'o config não é um objeto JSON' }]
  }
  const c = cfg as Record<string, unknown>

  // 1. placeholders — o formulário em branco.
  for (const p of placeholders(c)) {
    v.push({ chave: p, mensagem: `placeholder não preenchido: ${JSON.stringify(emPath(c, p))}` })
  }

  // 2. chave obrigatória ausente, com o lugar de onde o motor a lê.
  for (const k of CHAVES_OBRIGATORIAS) {
    if (ausente(emCaminho(c, k.chave))) {
      v.push({
        chave: k.chave,
        mensagem: `chave obrigatória ausente — lida em ${k.onde}${k.nota ? ` (${k.nota})` : ''}`,
      })
    }
  }

  // 3. gates: cada um precisa de `nome`, e de um PAPEL que o executor consiga
  //    ver. Gate sem papel não some da execução — ele some da TRILHA: a linha
  //    GATE o reporta como `nao-configurado`, que é o vocabulário de "o repo
  //    não tem gate desse papel". Foi assim que a trilha do e2e de 2026-09-08
  //    disse `typecheck=nao-rodou` sobre gates que tinham passado (peça K6b).
  const gates = c.gates
  if (Array.isArray(gates)) {
    gates.forEach((g, i) => {
      if (!g || typeof g !== 'object') {
        v.push({ chave: `gates[${i}]`, mensagem: 'gate não é objeto' })
        return
      }
      const gg = g as Record<string, unknown>
      const nome = typeof gg.nome === 'string' ? gg.nome : ''
      if (nome === '') {
        v.push({ chave: `gates[${i}]`, mensagem: 'gate sem `nome` — é o nome que amarra o config ao gates.txt' })
        return
      }
      // `tipo: preparacao` não verifica nada — no config do CI é
      // `limpeza_artefatos`, um `rm -rf` do artefato de build que roda ANTES
      // dos gates de verdade. Gate que não verifica não tem papel na linha
      // GATE, e cobrar um seria o validador reprovando config correto: o
      // `gates_do_papel` (executor.sh:494-503) simplesmente não o encontra em
      // papel nenhum, que é o comportamento certo. Conferido nos dois configs
      // reais do disco (`_referencia-ci/000-config.ci.json` e
      // `test/fixtures/checkout/`), onde `limpeza_artefatos` é o único gate sem
      // papel e a linha GATE do CI está correta há meses.
      if (gg.tipo === 'preparacao') return
      if (papelDoGate(nome, gg.papel) === '') {
        v.push({
          chave: `gates[${i}].papel`,
          mensagem:
            `o gate '${nome}' não tem papel inferível do nome e não declara "papel". ` +
            'Declare "papel": "typecheck" | "testes" | "build" | "lint" — sem isso a linha GATE da trilha ' +
            'o reporta como nao-configurado, mesmo quando ele roda e passa.',
        })
      }
    })
  }

  // 4. regra B do enforcement (K11a-1): faixa SEM diretório. A faixa só é
  //    cobrada dos `.sql` sob `migrations.dir`, então uma faixa declarada sem o
  //    dir é uma proibição que não vale para arquivo nenhum — o pior estado
  //    possível, porque o config DIZ que a faixa está protegida. E `dir` não
  //    cai no `migrations_dir` de topo de propósito: esse é obrigatório em todo
  //    repo, e o fallback ligaria a regra B em quem nunca a pediu.
  const mig = c.migrations
  if (mig && typeof mig === 'object' && !Array.isArray(mig)) {
    const m = mig as Record<string, unknown>
    const temFaixa = !ausente(m.faixa) || (Array.isArray(m.faixas_reservadas) && m.faixas_reservadas.length > 0)
    if (temFaixa && ausente(m.dir)) {
      v.push({
        chave: 'migrations.dir',
        mensagem:
          'migrations.faixa (ou faixas_reservadas) declarada sem migrations.dir — a regra B do ' +
          'enforcement só cobra .sql sob migrations.dir, então a faixa não vale para arquivo nenhum. ' +
          'Declare o diretório (no Actus: "supabase/migrations") ou tire a faixa.',
      })
    }
  }

  return v
}

/** Só para a mensagem: o valor num caminho que pode ter índice de lista. */
function emPath(obj: unknown, caminho: string): unknown {
  let no: unknown = obj
  for (const parte of caminho.split('.')) {
    const m = /^(.*?)((\[\d+\])*)$/.exec(parte)
    const chave = m?.[1] ?? parte
    if (chave !== '') {
      if (!no || typeof no !== 'object') return undefined
      no = (no as Record<string, unknown>)[chave]
    }
    for (const idx of (m?.[2] ?? '').matchAll(/\[(\d+)\]/g)) {
      if (!Array.isArray(no)) return undefined
      no = no[Number(idx[1])]
    }
  }
  return no
}

export function main(argv: string[]): number {
  const caminho = argv[0]
  if (!caminho) {
    process.stderr.write('uso: config-cli.ts <caminho-do-000-config.json>\n')
    return 2
  }
  let cfg: unknown
  try {
    cfg = JSON.parse(readFileSync(caminho, 'utf8'))
  } catch (e) {
    // Ilegível é rc 1, não rc 2: para quem roda `orq config`, config que não
    // parseia e config com violação são a mesma notícia — este arquivo não
    // serve. Sair 0 aqui seria o pior desfecho possível.
    process.stdout.write(`CONFIG   ${caminho}\n`)
    process.stdout.write(`ilegível: ${(e as Error).message}\n`)
    return 1
  }
  const v = validarConfig(cfg)
  process.stdout.write(`CONFIG   ${caminho}\n`)
  if (v.length === 0) {
    process.stdout.write('0 violações — o config está preenchido e as chaves que o motor lê estão lá.\n')
    return 0
  }
  for (const x of v) process.stdout.write(`  ${x.chave}: ${x.mensagem}\n`)
  process.stdout.write(`\n${v.length} violação(ões)\n`)
  return 1
}

// Guard de CLI com realpath dos dois lados — peça 1d. `resolve(argv[1])` não
// resolve symlink e o `import.meta.url` vem fisicamente resolvido: sob caminho
// com symlink (no macOS `/tmp` é symlink de `/private/tmp`), a comparação crua
// falhava e o processo saía 0 com stdout VAZIO.
function chamadoComoCli(): boolean {
  const argv1 = process.argv[1]
  if (!argv1) return false
  try {
    return realpathSync(fileURLToPath(import.meta.url)) === realpathSync(resolve(argv1))
  } catch {
    return false
  }
}

if (chamadoComoCli()) {
  process.exit(main(process.argv.slice(2)))
}
