# Origem das fixtures da etapa 8c

Tudo copiado do comarka-operacional, só leitura (`GIT_OPTIONAL_LOCKS=0`, `git show`
e leitura de `docs/fila/runs/`), sem edição de conteúdo. A medição está em
`~/orq-sessoes/relatorio-kit-etapa8c.md`.

## 295/ (P1 · `dir/` na allowlist)

| arquivo | origem | papel |
|---|---|---|
| 295-fetch-json-teto.md | 7057ab0:docs/fila/295-fetch-json-teto.md | a versão `pendente` que rodou às 15:06 de 03/09; allowlist com `src/app/dashboard/clientes/[id]/tabs/` |
| arquivos-do-diff.txt | runs/295/attempt-1.prev1/diff.raw | os 43 caminhos do diff da tentativa |
| violacoes-comarka.txt | runs/295/attempt-1.prev1/enforcement.json | as 41 `fora_do_pathspec` que o motor do Comarka deu antes de normalizar `dir/`: 31 sob `tabs/` (ruído) e os 10 testes de fato fora da allowlist |
