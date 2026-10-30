/**
 * arquivos.ts — os arquivos de migration de um banco, lidos dos refs git de
 * cada repo (etapa MIG-A, P4). Só leitura, só por `gitLeitura`
 * (GIT_OPTIONAL_LOCKS=0): `rev-parse`, `ls-tree` e `show`.
 *
 * Por que refs e não a árvore: 5 dos 6 pendentes do Comarka em 18/10 só
 * existiam em `origin/staging-auto` ou `origin/staging-apolo` (a expansão é
 * aplicada antes da promoção do código que a usa). O mesmo caminho com blob
 * diferente entre refs é `divergente`, e o aplicador recusa.
 */
import { gitLeitura } from '../triador/git.js'
import type { Banco, RepoMig } from './config.js'
import { versaoDoArquivo, type ArquivoMig } from './plano.js'

export function arquivosDoBanco(banco: Banco): { arquivos: ArquivoMig[]; avisos: string[] } {
  const arquivos: ArquivoMig[] = []
  const avisos: string[] = []
  for (const r of banco.repos) {
    const vistos = new Map<string, { refs: string[]; blobs: Set<string> }>()
    for (const ref of r.refs) {
      if (gitLeitura(r.caminho, ['rev-parse', '--verify', '--quiet', `${ref}^{commit}`]).rc !== 0) {
        avisos.push(`${r.nome}: ref ${ref} não existe em ${r.caminho}`)
        continue
      }
      const ls = gitLeitura(r.caminho, ['ls-tree', ref, '--', `${r.dir.replace(/\/+$/, '')}/`])
      for (const l of ls.stdout.split('\n')) {
        const m = /^\d+ blob ([0-9a-f]+)\t(.+)$/.exec(l)
        if (!m || !versaoDoArquivo(m[2]!)) continue
        const v = vistos.get(m[2]!) ?? { refs: [], blobs: new Set<string>() }
        v.refs.push(ref)
        v.blobs.add(m[1]!)
        vistos.set(m[2]!, v)
      }
    }
    for (const [arquivo, v] of vistos) {
      arquivos.push({ repo: r.nome, arquivo, ...versaoDoArquivo(arquivo)!, refs: v.refs, divergente: v.blobs.size > 1, somenteLeitura: r.somenteLeitura })
    }
  }
  return { arquivos, avisos }
}

/** O conteúdo do arquivo no primeiro ref que o tem. */
export function conteudoDe(r: RepoMig, a: ArquivoMig): { ref: string; sql: string } {
  const ref = a.refs[0]!
  const s = gitLeitura(r.caminho, ['show', `${ref}:${a.arquivo}`])
  if (s.rc !== 0) throw new Error(`não consegui ler ${ref}:${a.arquivo} em ${r.caminho}`)
  return { ref, sql: s.stdout }
}
