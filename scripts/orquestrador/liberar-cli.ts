/**
 * liberar-cli.ts — `orq liberar <token> [nota]`, o QUARTO verbo que escreve.
 *
 * Uso: liberar-cli.ts <liberacoes.json> <humano:token> [nota]
 * rc 0 gravou · rc 1 recusou · rc 2 erro de uso.
 *
 * Por que existe: até aqui, liberar um token era editar `liberacoes.json` à mão.
 * Foi assim que o Comarka acabou com o MESMO token duplicado dentro de
 * `liberadas[]` (duas entradas idênticas campo a campo, 2026-09-07) e com 13
 * tokens repetidos entre as duas listas. Nenhum desses erros é grave sozinho; o
 * que eles mostram é que o arquivo é editado por humano com pressa, e é o tipo
 * de arquivo que merece um verbo.
 *
 * O que ele NÃO faz, e de propósito: converter o arquivo. Um `liberar` que
 * migrasse de passagem transformaria uma decisão humana de uma linha numa
 * reescrita do arquivo inteiro, sem diff e sem `.bak`. Arquivo fora da v2 é
 * RECUSA, com o comando da migração na mensagem.
 */
import { existsSync, realpathSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { descreverForma, ehV2, jaLiberado, RE_TOKEN } from './liberacoes-core.js'
// `import type` e não import comum: `TokenV2` é interface, some na compilação, e
// o `tsx` que roda este arquivo direto trataria o nome como valor a importar —
// "does not provide an export named 'TokenV2'" em tempo de execução, com o CLI
// inteiro morrendo antes da primeira linha.
import type { TokenV2 } from './liberacoes-core.js'
import { json, lerJson } from './migrar-comum.js'

export interface Recusa {
  ok: false
  motivo: string
}
export interface Aceite {
  ok: true
  /** O conteúdo a gravar. */
  conteudo: string
  registro: TokenV2
}

/** AAAA-MM-DD de hoje, hora local — é a data que o humano reconhece. */
export function hoje(d = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

/**
 * A decisão inteira, PURA: recebe o arquivo já parseado e devolve o que gravar
 * ou o porquê da recusa. Testável sem disco e sem `orq`.
 */
export function liberar(
  raiz: unknown,
  token: string,
  nota: string | undefined,
  por: string,
  data: string,
): Aceite | Recusa {
  // 1. o prefixo, antes de tudo. Um token sem `humano:` seria gravado e nunca
  //    resolveria dependência nenhuma pela via canônica — o defeito de
  //    2026-09-03, agora escrito pela própria ferramenta.
  if (!token.startsWith('humano:')) {
    return { ok: false, motivo: `'${token}' não começa com 'humano:'. A dependência do ticket é escrita COM o prefixo, e é o token INTEIRO que mora no arquivo. Use 'humano:${token}'.` }
  }
  if (!RE_TOKEN.test(token)) {
    return { ok: false, motivo: `'${token}' não casa ${RE_TOKEN.source}. O padrão é 'humano:<tipo>-<id>' — ex.: humano:migration-0025, humano:decisao-D31, humano:tk-201-arquetipos.` }
  }

  // 2. o arquivo tem de estar em v2. `orq liberar` grava OBJETO; um objeto solto
  //    numa lista de strings seria o arquivo em duas formas ao mesmo tempo.
  if (!ehV2(raiz)) {
    return { ok: false, motivo: `o arquivo não está em v2 (${descreverForma(raiz)}). Rode a migração primeiro, do kit:\n  bash instalar.sh --atualizar <repo> --migrar --dry-run   # lê o diff\n  bash instalar.sh --atualizar <repo> --migrar             # aplica` }
  }

  // 3. duplicata, olhando as DUAS listas: liberar de novo o que já está liberado
  //    criaria duas verdades sobre a mesma decisão humana.
  if (jaLiberado(raiz, token)) {
    return { ok: false, motivo: `'${token}' já está liberado neste arquivo. Liberação é fato registrado uma vez; se a nota estava errada, edite a nota — não acrescente um segundo registro.` }
  }

  const o = raiz as Record<string, unknown>
  const registro: TokenV2 = {
    token,
    liberado_em: data,
    por,
    ...(nota && nota.trim() ? { nota: nota.trim() } : {}),
    origem: 'v2',
  }
  const tokens = [...(Array.isArray(o.tokens) ? o.tokens : []), registro]
  return { ok: true, conteudo: json({ ...o, $schema_versao: 2, tokens }), registro }
}

function chamadoComoCli(): boolean {
  try {
    return realpathSync(process.argv[1] ?? '') === realpathSync(fileURLToPath(import.meta.url))
  } catch {
    return false
  }
}

if (chamadoComoCli()) {
  const [arquivo, token, ...notaPartes] = process.argv.slice(2)
  if (!arquivo || !token) {
    process.stderr.write('uso: liberar-cli.ts <liberacoes.json> <humano:token> [nota]\n')
    process.exit(2)
  }
  const abs = resolve(arquivo)
  if (!existsSync(abs)) {
    process.stderr.write(`liberar: '${abs}' não existe. É o 'liberacoes_file' do 000-config.json.\n`)
    process.exit(2)
  }
  let raiz: unknown
  try {
    raiz = lerJson(abs)
  } catch (e) {
    process.stderr.write(`${(e as Error).message}\n`)
    process.exit(2)
  }
  // `$USER` é quem está no teclado. Liberação sem dono não é liberação: é um
  // arquivo que alguém editou (schemas/liberacoes.schema.json, campo `por`).
  const por = process.env.ORQ_LIBERAR_POR || process.env.USER || process.env.LOGNAME || 'desconhecido'
  const r = liberar(raiz, token, notaPartes.join(' '), por, hoje())
  if (!r.ok) {
    process.stderr.write(`RECUSADO: ${r.motivo}\n`)
    process.exit(1)
  }
  const { writeFileSync } = await import('node:fs')
  writeFileSync(abs, r.conteudo)
  process.stdout.write(`LIBERADO  ${r.registro.token}\n`)
  process.stdout.write(`          liberado_em ${r.registro.liberado_em} · por ${r.registro.por}\n`)
  if (r.registro.nota) process.stdout.write(`          nota: ${r.registro.nota}\n`)
  process.stdout.write(`          em ${abs}\n`)
  process.exit(0)
}
