# Ticket 440 — A1 em page.tsx

## Objetivo (prosa)

1 controle(s) so-icone sem nome acessivel em `src/app/churn/page.tsx`.
Acrescentar `aria-label` (verbo + objeto + alvo) e `aria-hidden` no icone.
Nada alem de atributo muda.

## Achados (medidos em 17/09)

- linha 582
  - `<Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { setRejeitandoId(null); setRejeitarMotivo(""); }}>`

## Criterio

`test/a11y/app-churn-page.test.ts` verde e helper devolvendo lista vazia.

```json
{
  "id": "440",
  "slug": "a11y-app-churn-page",
  "onda": "a11y",
  "frente": "acessibilidade",
  "camada": "ui",
  "serie": "a11y-a1",
  "tam": "P",
  "objetivo": "Regra A1 (P0) em src/app/churn/page.tsx: 1 controle(s) so-icone sem nome acessivel. Leitor de tela anuncia 'botao' sem objeto; o significado esta so no desenho do icone. ACHADOS MEDIDOS EM 17/09 (linha e tag de abertura): linha 582: <Button size=\"sm\" variant=\"ghost\" className=\"h-7 text-xs\" onClick={() => { setRejeitandoId(null); setRejeitarMotivo(\"\"); }}>. FAZER: (1) em cada um, adicionar aria-label com VERBO + OBJETO + ALVO, ex.: aria-label=\"Excluir tese {t.nome}\" -- nunca so o verbo; use a variavel do escopo quando ela identificar o item. (2) no icone filho, adicionar aria-hidden=\"true\". (3) criar test/a11y/app-churn-page.test.ts importando controlesSemNomeAcessivel de test/a11y/_helper e afirmando lista vazia para este arquivo. RECON: leia test/a11y/_helper.ts (ticket 413) antes; NAO reimplemente a deteccao. FORA DE ESCOPO: mudar className, tamanho, cor, posicao, variant, o icone em si, o onClick ou qualquer outro arquivo. Este ticket so ACRESCENTA atributo. ORCAMENTO: diff <= 60 linhas. REGRAS INVIOLAVEIS: (1) git add so por pathspec explicito. (2) Zona C0 = zero escrita e zero DDL. (3) Nenhum DDL, grant, RLS ou trigger. (4) Regra 19: nenhuma cifra em R$ de MRR da agencia. (6) localStorage/sessionStorage proibidos. (7) Nao editar docs/FAQ-USO.md nem tsconfig.tsbuildinfo. (9) Se o arquivo nao existir, pare e registre no commit. (11) So edite testes existentes se estiverem na allowlist.",
  "pathspec_allowlist": [
    "src/app/churn/page.tsx",
    "test/a11y/app-churn-page.test.ts"
  ],
  "criterios_aceite": [
    {
      "descricao": "helper nao acha mais controle sem nome em src/app/churn/page.tsx",
      "cmd": "( npx tsx -e \"import{controlesSemNomeAcessivel as f}from'./test/a11y/_helper';process.exit(f('src/app/churn/page.tsx').length===0?0:1)\" ) >/dev/null 2>&1 && echo OK || echo FAIL",
      "espera": "OK"
    },
    {
      "descricao": "teste novo verde",
      "cmd": "( npx vitest run 'test/a11y/app-churn-page.test.ts' ) >/dev/null 2>&1 && echo OK || echo FAIL",
      "espera": "OK"
    },
    {
      "descricao": "so atributo foi acrescentado: nenhuma classe mexida",
      "cmd": "( ! git diff --cached -- 'src/app/churn/page.tsx' | grep -E '^[-+].*className' | grep -qv 'aria-' ) && echo OK || echo FAIL",
      "espera": "OK",
      "tipo": "guarda"
    },
    {
      "descricao": "typecheck: 3 erros pre-existentes em src/, nenhum novo (.next/types fica de fora: e saida de build, varia sozinho)",
      "cmd": "( [ \"$(npx tsc --noEmit 2>&1 | grep 'error TS' | grep -c '^src/')\" = 3 ] ) && echo OK || echo FAIL",
      "espera": "OK",
      "tipo": "guarda"
    },
    {
      "descricao": "avaliador: cada aria-label nomeia VERBO + OBJETO + ALVO e identifica qual item da lista, nao apenas a acao generica. O icone filho ganhou aria-hidden. Nenhuma classe, cor, tamanho, variant, icone ou handler mudou: o diff em src/app/churn/page.tsx so acrescenta atributo. O teste novo importa o helper do 413 em vez de reimplementar a deteccao.",
      "espera": "avaliador"
    }
  ],
  "dependencias": [
    "413"
  ],
  "status": "pendente",
  "notas_status": "reaberto 21/09: causa era colisao de worktree com actus-saas (orq-440), resolvida por worktree_prefix"
}
```
