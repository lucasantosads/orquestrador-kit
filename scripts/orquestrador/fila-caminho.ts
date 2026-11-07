/**
 * fila-caminho.ts · etapa c0052-B1a (M-54): qual fila este processo serve.
 *
 * Cada fila tem o seu `000-config.json`; `ORQ_CONFIG` diz qual, relativo ao
 * checkout principal (ou absoluto dentro dele). A pasta da fila é o diretório do
 * config. Sem `ORQ_CONFIG`, `docs/fila/000-config.json`: os caminhos de antes.
 * Fora do checkout (absoluto, `..`, symlink que sai) é erro: a fila é fonte única
 * do repo, e um config de fora rodaria o loop contra outra coisa em silêncio.
 * O par em shell é `lib.sh:config_da_fila`; os dois dão a mesma resposta.
 */
import { existsSync, lstatSync, realpathSync } from 'node:fs'
import { basename, dirname, isAbsolute, join, relative, sep } from 'node:path'

export const CONFIG_PADRAO = 'docs/fila/000-config.json'

type Env = Record<string, string | undefined>

/** Caminho absoluto do config da fila. Lança com `ORQ_CONFIG` na mensagem. */
export function caminhoConfig(raiz: string, env: Env = process.env): string {
  const pedido = env.ORQ_CONFIG ?? ''
  if (pedido === '') return join(raiz, CONFIG_PADRAO)
  const abs = isAbsolute(pedido) ? pedido : join(raiz, pedido)
  const erro = (porque: string) => new Error(`ORQ_CONFIG '${pedido}' ${porque} (checkout: ${raiz})`)
  // O nome é fixo: quem só tem a pasta (gate de ticket, painel) lê <pasta>/000-config.json.
  if (basename(abs) !== '000-config.json') throw erro('não se chama 000-config.json')
  if (!existsSync(abs)) throw erro('não existe')
  if (lstatSync(abs).isSymbolicLink()) throw erro('é symlink')
  const rel = relative(realpathSync(raiz), realpathSync(abs))
  if (rel === '' || rel.startsWith('..') || isAbsolute(rel)) throw erro('fica fora do checkout principal')
  return join(raiz, rel.split(sep).join('/'))
}

/** Pasta da fila: o diretório do config. */
export function filaDir(raiz: string, env: Env = process.env): string {
  return dirname(caminhoConfig(raiz, env))
}

/**
 * Checkout de uma pasta de fila, para resolver `filas_irmas` (relativas a ele).
 * A pasta termina no diretório de `ORQ_CONFIG` (o lib.sh exporta relativo) ou
 * em docs/fila; fora disso, dois níveis acima, o layout de docs/fila.
 */
export function raizDaFila(fila: string, env: Env = process.env): string {
  const pedido = env.ORQ_CONFIG ?? ''
  const rel = dirname(pedido !== '' && !isAbsolute(pedido) ? pedido : CONFIG_PADRAO)
  return fila.endsWith(`/${rel}`) ? fila.slice(0, -rel.length - 1) : join(fila, '..', '..')
}
