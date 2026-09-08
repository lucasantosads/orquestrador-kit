# `test/fixtures/liberacoes/` — as formas VIVAS de `liberacoes.json`

Os três arquivos são cópias **byte a byte** do disco, tiradas em 2026-09-08.
Nenhum foi editado, reindentado ou reduzido: o que a peça K8b-1 ensina o motor a
ler é o formato que existe, não o que seria conveniente inventar.

| Arquivo | Origem (só leitura) | Forma | cksum |
|---|---|---|---|
| `ci-tokens-com-prefixo.json` | `~/Projetos/conteudos-infinitos/docs/fila/liberacoes.json` | `tokens[]` de STRINGS **com** `humano:` | `1096212929 229` |
| `actus-tokens-sem-prefixo.json` | `~/Projetos/actus-saas/docs/fila/liberacoes.json` | `tokens[]` de STRINGS **sem** `humano:` | `2383659333 176` |
| `comarka-duas-listas.json` | `~/Projetos/comarka-operacional/docs/fila/liberacoes.json` | `liberadas[]` de OBJETOS (`token`, `em`, `por`, `nota`) **+** `tokens[]` de strings, ambos sem prefixo | `3876021824 15828` |

O `ci-tokens-com-prefixo.json` é o mesmo conteúdo de
`test/fixtures/checkout/docs/fila/liberacoes.json`, duplicado aqui para que as
três formas fiquem lado a lado e a tabela acima possa ser lida de uma vez.

## O que cada um prova, e por quê está aqui

- **CI**: a forma que o motor já lia. É o NEGATIVO da peça — depois da mudança,
  os 7 tokens continuam resolvendo, e nenhum aviso novo aparece no log.
- **Actus**: `tokens[]` sem prefixo. Hoje **nenhum** dos 5 resolve: o
  `liberacao_ok` compara `.tokens | index("humano:migration-0255-aplicada")`
  contra a string `"migration-0255-aplicada"`, e o ramo de compat só olha
  `.liberadas`, que o Actus não tem. É o mesmo modo de falha silenciosa de
  2026-09-03, num repo diferente.
- **Comarka**: as DUAS listas, e é o arquivo que faz a união valer a pena —
  31 entradas em `liberadas[]` + 30 em `tokens[]` = 61, com 47 tokens únicos:
  13 aparecem nas duas listas e `migration-196-aplicada` está DUPLICADO dentro
  de `liberadas[]` (as duas entradas são idênticas campo a campo). É o insumo do
  dedup da K8b-2.

Nenhuma forma v2 (`tokens[]` de OBJETOS) existe no disco de repo nenhum hoje: v2
é o DESTINO da migração, descrito em `schemas/liberacoes.schema.json`. Ela entra
nos testes como literal, e é a divergência 2 do `CONTRATO.md` §10.
