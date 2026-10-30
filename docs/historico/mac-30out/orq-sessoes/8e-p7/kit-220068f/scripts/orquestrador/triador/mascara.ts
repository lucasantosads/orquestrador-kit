/**
 * mascara.ts — segredo vira `‹segredo›` antes de qualquer envio ao modelo e na
 * cópia de evidência (spec 7f-a §4 e §6, regra 8).
 *
 * Os padrões são os mesmos do `test/fixtures/triador-7f/montar.py`
 * (`SEGREDOS`): `sk-…`, JWT (`eyJ…`), `service_role`, `SUPABASE_*=`,
 * `*_KEY=`, `*_TOKEN=` com valor, e e-mail. Cobre os padrões conhecidos, não
 * todos (spec §9): a cópia fica em `~/.orq`, fora de git.
 *
 * Nunca muda o número de linhas: a máscara não tem quebra.
 */
export const MASCARA = '‹segredo›'

const SEGREDOS = [
  /\bsk-[A-Za-z0-9_-]{8,}/g,
  /\beyJ[A-Za-z0-9_-]{8,}(?:\.[A-Za-z0-9_-]+){0,2}/g,
  /\bservice_role\b/g,
  /\b(?:SUPABASE_[A-Z0-9_]*|[A-Z0-9_]*_KEY|[A-Z0-9_]*_TOKEN)=[^\s"'`]+/g,
  /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g,
]

export function mascarar(s: string): string {
  let out = s
  for (const r of SEGREDOS) out = out.replace(r, MASCARA)
  return out
}
