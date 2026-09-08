# Ticket: soma só dos negativos

> A **fonte de verdade de máquina** é o bloco ```json abaixo. Os scripts do
> orquestrador leem e escrevem SÓ esse bloco (via jq). A prosa é para humanos
> e é ignorada pela automação.

## Objetivo (prosa)

`src/soma.ts` hoje exporta uma função só: `soma(numeros)`, que soma a lista
inteira (verificado no disco — o arquivo tem 11 linhas e um único `export`).
Este ticket pede a função irmã, `somaNegativos(numeros)`, que soma só os
elementos menores que zero, mais o caso de teste que a exercita.

Recon feito: os dois paths da allowlist existem no disco (`src/soma.ts` e
`test/soma.test.ts`, ambos versionados no commit inicial do fixture). Nenhum
arquivo novo é criado, por isso `cria_novo` é lista vazia.

É o ticket mais barato que ainda é um ticket de verdade: uma unidade lógica,
uma camada, um critério `alvo` que só fica verde depois da implementação.

## Campos de máquina

```json
{
  "id": "001",
  "bloco": "B0",
  "frente": "B0-F1",
  "slug": "soma-de-negativos",
  "origem": "humano",
  "objetivo": "Adicione a src/soma.ts a função exportada somaNegativos(numeros: number[]): number, que devolve a soma APENAS dos elementos menores que zero (lista sem negativos devolve 0), e acrescente a test/soma.test.ts um caso chamado 'somaNegativos soma só os menores que zero' que verifique somaNegativos([-2, 3, -4]) === -6 e somaNegativos([1, 2]) === 0. FORA DE ESCOPO: alterar a função soma existente, mexer em qualquer outro arquivo, instalar dependência.",
  "pathspec_allowlist": [
    "src/soma.ts",
    "test/soma.test.ts"
  ],
  "cria_novo": [],
  "dependencias": [],
  "diff_estimado": 20,
  "risco": "",
  "criterios_aceite": [
    {
      "tipo": "guarda",
      "descricao": "typecheck não regride: nenhum erro de tipo no fixture",
      "cmd": "npx tsc --noEmit 2>&1 | grep -c 'error TS'",
      "espera": "0"
    },
    {
      "tipo": "alvo",
      "descricao": "o caso novo de somaNegativos aparece no relatório do vitest (DEVE estar ausente antes de implementar)",
      "cmd": "npx vitest run test/soma.test.ts --reporter=verbose 2>&1 | grep -E 'somaNegativos'",
      "espera": "somaNegativos"
    },
    {
      "tipo": "guarda",
      "descricao": "a suíte inteira segue verde",
      "cmd": "npx vitest run 2>&1 | grep -cE 'Tests +[0-9]+ passed'",
      "espera": "1"
    },
    {
      "tipo": "guarda",
      "descricao": "escopo: o diff da worktree toca exatamente os dois arquivos da allowlist",
      "cmd": "git diff --name-only $BASE_REF...HEAD -- src/soma.ts test/soma.test.ts | wc -l | tr -d ' '",
      "espera": "2"
    },
    {
      "tipo": "avaliador",
      "descricao": "avaliador: a função nova é EXPORTADA e o teste novo a IMPORTA e a chama — arquivo que existe mas ninguém importa não conta; nenhuma asserção do teste existente foi removida, afrouxada ou marcada como skip; a função soma original continua byte-idêntica.",
      "cmd": "true",
      "espera": "avaliador"
    }
  ],
  "status": "pendente",
  "notas_status": "",
  "hash_candidato": "",
  "sinal_hash": "",
  "gate_ok": "",
  "pid": null,
  "iniciado_em": "",
  "adiado_ate": ""
}
```
