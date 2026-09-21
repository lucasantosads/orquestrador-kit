# Ticket — fixture smoke do Orquestrador (E2E de montagem)

> A **fonte de verdade de máquina** é o bloco ```json abaixo — os scripts do
> orquestrador leem e escrevem SÓ esse bloco. A prosa é para humanos.

## Objetivo (prosa)

Ticket-fixture trivial da TAREFA 7: prova o loop ponta a ponta (worktree →
edição → commit por allowlist → enforcement → gates → juiz → merge na
`staging-auto` → evidência em `runs/001/`). Cria um módulo mínimo e seu teste.

Recon de fonte: os dois caminhos citados na allowlist NÃO existem ainda no
disco (são criados por este ticket) — `src/lib/orquestrador-fixture.ts` e
`src/lib/orquestrador-fixture.test.ts`. O teste é `.test.ts` sob `src/`, então
entra no gate `pnpm test` (include `src/**/*.test.ts`). Fora de escopo: qualquer
outra coisa.

## Campos de máquina

```json
{
  "id": "001",
  "bloco": "B-ORQ",
  "slug": "fixture-smoke",
  "objetivo": "Crie src/lib/orquestrador-fixture.ts exportando `export const ORQUESTRADOR_FIXTURE = \"ok\" as const;` e src/lib/orquestrador-fixture.test.ts com um teste vitest que importa a constante e afirma que vale 'ok'. Não toque em mais nada.",
  "pathspec_allowlist": [
    "src/lib/orquestrador-fixture.ts",
    "src/lib/orquestrador-fixture.test.ts"
  ],
  "dependencias": [],
  "criterios_aceite": [
    {
      "descricao": "typecheck não regride além do baseline",
      "cmd": "node_modules/.bin/tsc --noEmit 2>&1 | grep 'error TS' | grep -vic 'conteudo.test.ts\\|entitlements.paridade.integration.test.ts'",
      "espera": "0"
    },
    {
      "descricao": "teste do fixture verde",
      "cmd": "node_modules/.bin/vitest run src/lib/orquestrador-fixture.test.ts 2>&1 | grep -E 'passed|failed'",
      "espera": "passed"
    },
    {
      "descricao": "avaliador: a constante exportada em orquestrador-fixture.ts é de fato importada e exercida pelo teste (integração, não só existência)",
      "cmd": "true",
      "espera": "avaliador"
    }
  ],
  "status": "done",
  "notas_status": "const ORQUESTRADOR_FIXTURE exportada e exercida pelo teste (integração)"
}
```
