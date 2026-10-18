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

## P2a · os casos do replay (`<id>/`)

`gate-vitest.txt` é o recorte verbatim do `gate-vitest.txt` da tentativa, da linha
`⎯ Failed Tests` ao fim (é onde estão as linhas `FAIL`, o erro e o local `❯`). No 711b3
o recorte tinha 5959 linhas de DOM: ficaram só as linhas `FAIL` e o placar. Em
`arvore/`, cada teste falho tem só as linhas de import e citação, com o cabeçalho
`// <sha>:<caminho>`, e o nome ganha `.fixture` (o tsc e o vitest do kit não leem como
código; o teste tira o sufixo na carga, como na 8a). A C11 (`testesVizinhos`) dá nessas árvores reduzidas o mesmo
resultado que nas árvores inteiras do Comarka (conferido caso a caso no PASSO 0).

| caso | arquivo | origem |
|---|---|---|
| 950 | gate-vitest.txt | runs/950/attempt-1.prev1/gate-vitest.txt, linhas 1951 ao fim (de "⎯ Failed Tests"), verbatim |
| 950 | 950-motor-cascata-marcos.md | 378e359:docs/fila/950-motor-cascata-marcos.md (a versão que rodou) |
| 950 | diff-arquivos.txt | runs/950/attempt-1.prev1/diff.raw |
| 950 | arvore/ | 03994f54c070239b4582b735f96852b83891340f: tsconfig.json, testes falhos reduzidos, lista de arquivos |
| 1054 | gate-vitest.txt | runs/1054/attempt-1.prev1/gate-vitest.txt, linhas 2526 ao fim (de "⎯ Failed Tests"), verbatim |
| 1054 | 1054-negocio-leitores-ficha.md | 3718afa:docs/fila/1054-negocio-leitores-ficha.md (a versão que rodou) |
| 1054 | diff-arquivos.txt | runs/1054/attempt-1.prev1/diff.raw |
| 1054 | arvore/ | c375e7c8e944ac79bdb17e16771ca04f24e18b2a: tsconfig.json, testes falhos reduzidos, lista de arquivos |
| 1059 | gate-vitest.txt | runs/1059/attempt-2.prev1/gate-vitest.txt, linhas 2638 ao fim (de "⎯ Failed Tests"), verbatim |
| 1059 | 1059-notion-rotas-renomeadas.md | 757e0da:docs/fila/1059-notion-rotas-renomeadas.md (a versão que rodou) |
| 1059 | diff-arquivos.txt | runs/1059/attempt-2.prev1/diff.raw |
| 1059 | arvore/ | 9907af07dfda7d6f5ed0ff04ac63549726dbb358: tsconfig.json, testes falhos reduzidos, lista de arquivos |
| 924a | gate-vitest.txt | runs/924a/attempt-1.prev1/gate-vitest.txt, linhas 2490 ao fim (de "⎯ Failed Tests"), verbatim |
| 924a | 924a-conta-contrato-montagem.md | bcdc764:docs/fila/924a-conta-contrato-montagem.md (a versão que rodou) |
| 924a | diff-arquivos.txt | runs/924a/attempt-1.prev1/diff.raw |
| 924a | arvore/ | c31dcea42ccb2251f275415709342ae40282911e: tsconfig.json, testes falhos reduzidos, lista de arquivos |
| 855 | gate-vitest.txt | runs/855/attempt-1.prev1/gate-vitest.txt, linhas 2390 ao fim (de "⎯ Failed Tests"), verbatim |
| 855 | 855-remove-team-id.md | 37a1bce:docs/fila/855-remove-team-id.md (a versão que rodou) |
| 855 | diff-arquivos.txt | runs/855/attempt-1.prev1/diff.raw |
| 855 | arvore/ | 71ee1c91b776c62a5c5ab1d706b7edf1c1668f1c: tsconfig.json, testes falhos reduzidos, lista de arquivos |
| 762 | gate-vitest.txt | runs/762/attempt-1.prev1/gate-vitest.txt, linhas 1581 ao fim (de "⎯ Failed Tests"), verbatim |
| 762 | 762-ghl-backfill-job-conexao.md | ef7dea4:docs/fila/762-ghl-backfill-job-conexao.md (a versão que rodou) |
| 762 | diff-arquivos.txt | runs/762/attempt-1.prev1/diff.raw |
| 762 | arvore/ | 6c0b474d9ce157a8ac463059870b64b17aa7af17: tsconfig.json, testes falhos reduzidos, lista de arquivos |
| 854 | gate-vitest.txt | runs/854/attempt-1.prev1/gate-vitest.txt, linhas 2321 ao fim (de "⎯ Failed Tests"), verbatim |
| 854 | 854-remove-equipe-geral.md | b988f6c:docs/fila/854-remove-equipe-geral.md (a versão que rodou) |
| 854 | diff-arquivos.txt | runs/854/attempt-1.prev1/diff.raw |
| 854 | arvore/ | 9b763de6c965fe42333c0ac4caa408168759429a: tsconfig.json, testes falhos reduzidos, lista de arquivos |
| 711b3 | gate-vitest.txt | runs/711b3/attempt-2.prev1/gate-vitest.txt, linhas 1837 ao fim, reduzidas às 4 linhas `FAIL` e ao placar |
| 711b3 | 711b3-saude-chip-ficha-tela.md | f5c235c:docs/fila/711b3-saude-chip-ficha-tela.md (a versão que rodou) |
| 711b3 | diff-arquivos.txt | runs/711b3/attempt-2.prev1/diff.raw |
| 711b3 | arvore/ | a1965f931b1ea9dccc90fcc80ae721bafb2e2cf2: tsconfig.json, testes falhos reduzidos, lista de arquivos |
| 830 | gate-vitest.txt | runs/830/attempt-2/gate-vitest.txt, linhas 2319 ao fim (de "⎯ Failed Tests"), verbatim |
| 830 | 830-sai-identidade-remove.md | b988f6c:docs/fila/830-sai-identidade-remove.md (a versão que rodou) |
| 830 | diff-arquivos.txt | runs/830/attempt-2/diff.raw |
| 830 | arvore/ | 1e3b30654a9ca7a4e5d417ade381682fb30b46a1: tsconfig.json, testes falhos reduzidos, lista de arquivos |

## 1373/ (P2a · critério de lista fechada)

| arquivo | origem | papel |
|---|---|---|
| 1373-ia-registro-funcoes-sem-cadastro.md | 6f94e84:docs/fila/1373-ia-registro-funcoes-sem-cadastro.md | a versão `pendente` que rodou às 11:14 de 18/10 (antes do R1, `6c42ce9`) |
| allowlist-ampliada.txt | runs/1373/attempt-2/allowlist-ampliada.txt | o teste que o 457856c ampliou |
| criterio-lista-fechada.txt | runs/1373/attempt-2/criterios.txt, linhas 9-16 | o critério `SO_ALLOWLIST` que reprovou a tentativa ampliada com `FORA_test/ia-funcoes-agentes-atendimento.test.ts` |
| diff-arquivos.txt | runs/1373/attempt-2/diff.raw | os 3 caminhos do diff |

## 1373-triador/ (P2c · o triador e o teste já ampliado)

No formato de `test/fixtures/triador-7f/` (lido por `lerCasoDeFixture`). É a série do 1373 que
bloqueou às 11:24 de 18/10, a que o R1 D6 do resolvedor consertou às 14:25Z.

| arquivo | origem |
|---|---|
| serie.json | `runs/1373/attempt-1.prev2` (11:14), `attempt-2` (11:16, ampliada), `attempt-3` (11:24) |
| meta.json | `runs/1373/meta.json`, as entradas 4 a 6 (a 2ª série) |
| ticket.json | `6f94e84:docs/fila/1373-ia-registro-funcoes-sem-cadastro.md`, o bloco JSON (a versão que rodou) |
| config.json | `docs/fila/000-config.json` do Comarka (`main b01d9d5`): `diff_cap_linhas` e `claude_timeout_secs` |
| log.txt | `runs/local-loop.log`, linhas 119981 a 120024 (do `drenagem: ticket 1373` ao `reprovado após 2 retries — BLOQUEADO`), com o número original |
| attempt-k/ | os arquivos que o leitor legado lê, da tentativa real; `gate-vitest.txt` e `criterios.txt` recortados por `recortarVitest`/`recortarCriterios`, com o mapa de linhas em `*.linhas.json`; `presenca.json` = `ls` do diretório real; `attempt-2/allowlist-ampliada.txt` é o que o 457856c gravou |
| fontes/ | `git show <head>:test/ia-funcoes-agentes-atendimento.test.ts` de cada `head.txt` |
| vizinhos.tsv | `fonteRepoLegado(comarka, '1373').vizinhos()` (FAIL de outros tickets nas ±6 h) |

## triador-sem-ampliacao.json (P2c · byte a byte)

O sha256 (16 hex) de `JSON.stringify` da evidência e da extração dos 65 casos reais sem
ampliação (todo caso com `caso.json` em `triador-7f/`, mais os dois repos `conteudos-243`
pelo leitor kit, sem o `mtime_ns` de `lidos`, que muda a cada checkout), gravado com o
triador do commit `8b4c6e1`, antes da P2c. Na 8c-6, os dois casos kit passaram a ter `repo`
relativo (`triador-custo-real/conteudos-243`, `triador-leitor-kit/conteudos-243`) no lugar
do caminho absoluto do checkout, recalculados com o triador de `49cf161` (o `8b4c6e1`
rebaseado sobre a MIG-A): o hash antigo só valia no worktree da etapa.

## afrouxamento/ (P3 · os consertos reais passam)

Cada `<id>.diff` é o recorte do `diff.raw` da tentativa APROVADA depois do resgate (o
conserto real), só com as seções dos arquivos de teste medidos no item 4 do PASSO 0: nos
resgates, os testes que o resgate liberou; em 966, 854, 867 e 840 (os consertos
legítimos), todo teste editado que já existia. São 33 arquivos em 18 tickets. Seções
verbatim; arquivo novo fica de fora.

| caso | tentativa (runs/) | arquivos |
|---|---|---|
| 856 | 856/attempt-1 | test/rotas-orfas.test.ts |
| 711a | 711a/attempt-1 | test/sem-insumo.test.ts |
| 950 | 950/attempt-1 | test/etapa2-funil-motor.test.ts |
| 1006 | 1006/attempt-1 | test/quem-cuida.test.ts |
| 840 | 840/attempt-1 | test/chave-unica-cliente-id.test.ts, test/nps-reacao-resposta.test.ts, test/rate-limit-publico.test.ts, test/resolver-chave.test.ts |
| 924a | 924a/attempt-1 | test/conta-entregas-vazio-unico.test.ts, test/visao-aceite-mockup.test.tsx |
| 1054 | 1054/attempt-1 | test/resolver-cliente-rota-diagnostico.test.ts, test/resolver-cliente-rota-resumo.test.ts |
| 1055b | 1055b/attempt-1 | test/acoes-recomendadas-chave.test.ts, test/relatorio-sem-cliente-id.test.ts |
| 1058 | 1058/attempt-1 | test/negocio-temperatura.test.ts, test/quem-cuida.test.ts |
| 854 | 854/attempt-1 | test/error-boundaries-rotas-lote5.test.ts, test/rotas-orfas.test.ts |
| 966 | 966/attempt-1 | test/campanhas-sem-duplicatas.test.ts, test/ficha-nav-colapsavel.test.ts |
| 830 | 830/attempt-1 | test/dono-dry-run.test.ts |
| 855 | 855/attempt-1 | test/adocao-predicado.test.ts |
| 1059 | 1059/attempt-3 | test/leitores-carteira-casa-nova.test.ts, test/leitores-ficha-casa-nova.test.ts |
| 1195 | 1195/attempt-1 | test/reuniao-manual-registro.test.ts |
| 711b3 | 711b3/attempt-2 | test/saude-motivo-sem-base.test.ts, test/sem-insumo.test.ts |
| 1053 | 1053/attempt-1 | test/papel-nas-escritas.test.ts |
| 867 | 867/attempt-1 | test/acao-unica-ficha-controles.test.tsx, test/acao-unica-ficha-mutacoes.test.tsx, test/ficha-relacao-estados.test.tsx, test/relacao-aceite.test.tsx, test/timeline-relacao.test.tsx |
