# Etapa 6b do kit — o resto do enforcement do Actus (K11a-4)

Repo: `~/Projetos/orquestrador-kit`, branch `main`, **nada empurrado**.
Data: 2026-09-08. Zero chamada à API; `launchctl` só pelo stub de `test/fixtures/bin/`.

A pergunta da etapa 6 era: *o Actus perde alguma proteção ao trocar de motor?* A K11a-1
fechou B, C e D e deixou três buracos NOMEADOS. Esta etapa fecha os três. A resposta agora
é **nenhuma**.

---

## 0. PASSO 0 — árvore e leitura

```
pwd                      /Users/lucasantos/Projetos/orquestrador-kit
git branch --show-current main
git status --porcelain   (vazio)
git status -sb           ## main...origin/main      ← sem ahead, sem behind
HEAD                     49869e2 docs: PECAS (K11b refinada), CHANGELOG da etapa 6 …
```

Lido no `~/Projetos/actus-saas`, **só leitura** (nenhum arquivo de lá foi tocado em
nenhum momento — conferido no fim por `git status` e por mtime, §5):

| O quê | Arquivo:linha |
|---|---|
| regra E, `no_write_prefixes` | `scripts/orquestrador/enforcement.mjs:270-275` |
| regra F, `padroes_proibidos_no_diff` | `scripts/orquestrador/enforcement.mjs:277-287` |
| `compilarRegex` (flags inline `(?i)/(?is)`) | `scripts/orquestrador/enforcement.mjs:176-185` |
| tag de dollar-quote que aceita dígito | `scripts/orquestrador/enforcement.mjs:119-124` |
| `removerBlocosDolarCitados` | `scripts/orquestrador/enforcement.mjs:129-131` |
| `removerComentariosDeLinha` | `scripts/orquestrador/enforcement.mjs:136-138` |
| `checarTesteSql`, as 4 condições | `scripts/orquestrador/enforcement.mjs:147-173` |
| a exceção dentro da regra B | `scripts/orquestrador/enforcement.mjs:215-227` |
| as três regexes, no config | `docs/fila/000-config.json:43-59` |
| `no_write_prefixes: ["vw_"]` | `docs/fila/000-config.json:40` |
| `migrations_dir` / `migrations_faixa_loop` | `docs/fila/000-config.json:10-11` |
| casos E | `scripts/orquestrador/enforcement.test.mjs:286-300` |
| casos F | `scripts/orquestrador/enforcement.test.mjs:302-321` |
| casos F, regressão do `[^;]*` | `scripts/orquestrador/enforcement.test.mjs:435-527` |
| casos teste-SQL | `scripts/orquestrador/enforcement.test.mjs:112-237` e `:329-433` |

**O que o `[^;]*` fazia** (`enforcement.test.mjs:435-439`): o padrão existe para pegar
REANCORAGEM — `tenant_id` ATRIBUÍDO no `SET` —, mas `[^;]*` cruzava a fronteira da
cláusula e `set deleted_at = now() where tenant_id = $1` casava, com `tenant_id` só na
WHERE. O conserto é `(?:(?!\bwhere\b)[^;])*`, medido no ticket 615 do Actus.

**As 4 condições do `checarTesteSql`**: (1) nome termina em `.test.sql`; (2) bloco `DO`
com `$$` — tag que aceita DÍGITO, porque o ticket manda nomear 0250/0251/0252 e a classe
antiga `[a-zA-Z_]*` lia todo arquivo como "sem bloco DO"; (3) `RAISE EXCEPTION`, o
rollback proposital; (4) zero DDL/DML de TOPO fora do DO, com o comentário `--` removido
antes — sem isso, explicar o teste em português reprovava o arquivo.

---

## 1. Os commits — um por peça, nenhum push

```
50c061b docs: K11a-4 em FEITAS, CHANGELOG da etapa 6b e a K11b sem a linha do prefixo
c484de1 K11a-4d: migrations_dir → migrations.dir, e só para quem declarou a faixa
4c39821 K11a-4c: a exceção estreita de teste-SQL do Actus, por config
612adac K11a-4b: regra F do Actus — padrões proibidos no texto do diff
367c2ea K11a-4a: regra E do Actus — CREATE/ALTER/DROP por prefixo de objeto
49869e2 (base da etapa)
```

`git status -sb` no fim: `## main...origin/main [ahead 5]` — **local**. Nada foi
empurrado, e nenhuma dessas peças chama a API.

---

## 2. As quatro peças

### K11a-4a · regra E — `zona_proibida.prefixos_sem_ddl`

`violacoesDePrefixo` (`enforcement-core.ts:460`), porte do laço `no_write_prefixes` do
Actus com a MESMA janela de 60 caracteres entre o verbo e o nome. Tipo de violação
PRÓPRIO (`prefixo_sem_ddl`): quem lê o `enforcement.json` precisa saber que a causa foi o
prefixo, e não um caminho de arquivo.

Roda por ARQUIVO, no mesmo laço de C e D: prosa nunca entra (documentar a proibição não é
violá-la), `artefato_sql` entra (um `create view vw_x` dentro de uma migration é
exatamente o que o Actus proíbe — alguém vai aplicar aquele arquivo).

**E é DDL, e só.** `insert into vw_saude (...)` NÃO é desta regra: escrever DADO num
objeto de nome proibido é assunto de `no_write_tables`/`colunas_congeladas`. Sem essa
separação, `prefixos_sem_ddl` viraria um segundo `no_write_tables` por semelhança de nome.
Está num caso de teste, não só no comentário.

Casos do Actus, um a um: `create or replace view vw_x` reprova; `drop view vw_x` reprova;
`create function fn_x` passa. Mais o `ALTER` (a terceira do trio, que o Actus não tinha
caso), o DML acima, a violação NOMEANDO o prefixo, a prosa e o DESLIGADA.

**7 vermelhos antes**, no mesmo commit.

**A tabela de config aprendeu** `zona_proibida.no_write_prefixes → zona_proibida.prefixos_sem_ddl`.
Aqui há uma **consequência que não é do Actus e está dita alto**: diferente dos renomes da
K11a-1, esta chave EXISTE no config do CI (`["supabase_", "auth_"]`) e no template
(`vw_`). Migrar o config deles LIGA a regra E com os prefixos que eles próprios
escreveram. O comentário do CI chama esses prefixos de *"redundante dado
no_write_tables=TODAS"* — e é falso: a regra 3 (`TODAS`) só cobre DML
(`INSERT/UPDATE/DELETE/TRUNCATE`), nunca `CREATE/ALTER/DROP`. A redundância não existe.
Isso é mudança de veredito, então está em três lugares onde ninguém tropeça sem ver:
o `porque` da tabela, a linha do relatório do `--dry-run`, e um caso de teste
(`CONSEQUÊNCIA no CI, dita alto: …`) que roda `propor()` sobre o config REAL do CI.
Quem revisa o proposto tira a chave se não a quiser; o `no_write_prefixes` FICA de
qualquer forma (regra 1: renomear é copiar).

### K11a-4b · regra F — `enforcement.padroes_proibidos_no_diff`

`compilarRegex` (`enforcement-core.ts:512`) e `violacoesDePadrao` (`:533`).

O destino **não** é `zona_proibida`, e é decisão: `zona_proibida` é a fronteira de
ESCRITA (que tabela, que coluna, que caminho, que prefixo); F julga o TEXTO do diff, e
existe para o risco que allowlist de caminho não pega — SQL destrutivo dentro de um
arquivo permitido. Guardar as duas coisas na mesma chave faz a fronteira parecer uma lista
de regexes.

Duas diferenças deliberadas em relação ao Actus, escritas no arquivo:

1. **por ARQUIVO**, não no diff inteiro. A violação passa a nomear onde o padrão casou, e
   um `;` do arquivo A deixa de fechar a cláusula que a regex estava lendo no arquivo B.
2. **regex que não compila tem tipo próprio** (`padrao_regex_invalida`). Config quebrada
   não pode virar "nenhum padrão casou" — é o mesmo fail-closed do Actus, com o tipo
   separando "o diff violou" de "o config está quebrado".

As três regexes viajaram **byte a byte** (o texto escapado do JSON e o de uma string TS
com aspas simples são os mesmos caracteres). O caso de regressão do `[^;]*` audita o
**mesmo diff** com a forma antiga e com a atual:

- antiga → `padrao_proibido` no soft delete (o falso positivo);
- atual → nada;
- e as **duas** continuam reprovando `update comercial.messages set tenant_id = 'x'`.

Sem essa segunda metade, o caso passaria com qualquer regex que não casasse o soft delete
— inclusive uma que tivesse deixado de pegar a reancoragem.

**13 vermelhos antes** (10 da regra + 3 do renome), no mesmo commit.

### K11a-4c · a exceção estreita de teste-SQL — `enforcement.testes_sql`

`checarTesteSql` (`enforcement-core.ts:357`), `ehTesteSql` (`:384`), mais
`removerBlocosDolarCitados` e `removerComentariosDeLinha`. As 4 condições reprovam
individualmente, e o detalhe **cita a condição** — "teste sql inválido" sozinho manda quem
leu abrir o arquivo e adivinhar qual das quatro foi.

**O glob descreve o DIRETÓRIO, não o sufixo**, e é decisão. No Actus quem entra na exceção
é o `tests_dir` inteiro (`enforcement.mjs:217`), e o sufixo `.test.sql` é a CONDIÇÃO 1,
checada pela regra. Um glob já estreitado a `*.test.sql` deixaria a condição 1
inalcançável: o arquivo de nome errado nem entraria na exceção, e cairia na regra B com
outro nome de violação. O caso "nome sem sufixo `.test.sql` bloqueia" só existe porque o
glob é do diretório.

Arquivo que entra **sai da regra B** (cobrar numeração dele bloquearia o teste que o
próprio ticket pediu) e responde pelas 4 condições no lugar.

Os dois defeitos que o Actus mediu viajam já corrigidos, com o porquê no arquivo: a classe
de tag que não aceitava dígito e o `--` não removido antes da checagem de topo. O
`unique`/`materialized` opcionais do DDL de topo também — sem eles, `CREATE UNIQUE INDEX`
de topo passava sob um rótulo válido.

**18 vermelhos antes**: os 16 casos do `enforcement.test.mjs` (com os nomes originais),
mais o negativo da regra B e o de DESLIGADA. Os três "F bom" do ticket 615 entram aqui nos
CAMINHOS ORIGINAIS (`supabase/tests/*.test.sql`), onde só passam quando as duas regras
concordam: a regex nova não casa o soft delete E o arquivo satisfaz as 4 condições.

### K11a-4d · `migrations_dir → migrations.dir`, com `so_quando`

O achado do `--dry-run` da etapa 6: o proposto ganhava `migrations.faixa` sem
`migrations.dir`, o `orq config` acusava, e a regra B não mordia arquivo nenhum — o pior
estado possível, porque o config DIZIA que a faixa estava protegida.

`Renome` ganhou o campo `so_quando`: uma OUTRA chave que precisa existir para o renome
valer. Existe por este caso, e ele é a razão de ser do campo — `migrations_dir` está em
TODO repo (é como o motor classifica `.sql` como artefato inerte), mas o destino LIGA a
regra B. A condição preserva inteira a decisão da K11a-1: **quem pede a regra é a FAIXA**,
o dir só diz onde ela vale. O CI declara `migrations_dir` e não declara faixa — continua
sem `migrations`, com a regra B desligada, e há um caso que prova isso com o config real
dele.

O aviso que faltava ao dono mora onde ele vai ler antes de aplicar — a linha do renome, no
relatório do `--dry-run`: com a regra B ligada, `.sql` fora do dir reprova por
`migration_fora_do_dir`, **inclusive testes SQL**, que no Actus moram em `supabase/tests/`.
Declare `enforcement.testes_sql.glob` na MESMA revisão, ou o loop deixa de conseguir
escrever teste de banco. Há um caso que cobra essa frase no texto do relatório.

**`test/fixtures/config/actus-000-config.json`**: cópia byte a byte (`cmp` + cksum
`4252049310 7679`, ambos na `PROCEDENCIA.md`) do `000-config.json` vivo do Actus. Ler o
repo vizinho passaria só nesta máquina e mudaria de veredito quando alguém editasse o
arquivo que a migração existe para tocar — a mesma decisão de `test/fixtures/liberacoes/`
(K8b-1). Com ele, *"as três regexes viajaram byte a byte"* deixou de ser frase de commit e
virou caso: comparação caractere a caractere, não "compila igual".

**ACHADO, e conserto no mesmo commit:** a `zona_proibida` REAL do Actus **não tem**
`no_write_paths` — ela é uma fronteira de BANCO (tabelas, colunas, prefixos, padrões), e
caminho nunca entrou. `no_write_paths` não é chave obrigatória em `config-chaves.ts`,
então o config estava certo e o motor errado: o spread de `undefined` derrubava o
`enforce` INTEIRO com `TypeError: zp.no_write_paths is not iterable`, antes de qualquer
regra rodar. Lista ausente é lista vazia. Só apareceu porque esta peça passou a alimentar
a barreira com um config real em vez de um literal escrito à mão.

**5 vermelhos antes** (4 do renome + 1 do achado), no mesmo commit.

---

## 3. O que o CI faz diferente: **nada** — provado com o config do CI

Todas as chaves novas são opcionais, e ausente = regra desligada. Os casos rodam contra os
**três configs reais do disco**: `_referencia-ci/000-config.ci.json`,
`fixture/docs/fila/000-config.json` e `test/fixtures/checkout/docs/fila/000-config.json`.

Para cada um dos três:

- `zona_proibida.prefixos_sem_ddl` — ausente → regra E desligada, e um
  `create table supabase_x` (o prefixo que o CI JÁ declara em `no_write_prefixes`) segue
  passando;
- `enforcement` — ausente → regra F e a exceção de teste-SQL desligadas;
- `zona_proibida.padroes_proibidos_no_diff` (o nome v1) — ausente também;
- `no_write_tables` continua sendo a string `"TODAS"`, negação total, e não lista;
- um `.sql` de artefato com `insert into public.leads` continua saindo
  `{ok: true, violations: []}`, byte a byte como antes.

E, no lado da migração: o config do CI, passado por `propor()`, **não** ganha `migrations`
(sem faixa declarada, o `so_quando` não dispara), e um `.sql` fora do dir continua sem
violação nenhuma de `migration_*`.

A única mudança de comportamento do CI está **na migração, não no motor**, e é a regra E:
migrar o config de lá copia `no_write_prefixes` para `prefixos_sem_ddl` e a regra passa a
valer. Está no §2 (K11a-4a), na tabela, na linha do `--dry-run` e num caso — nunca
escondida.

Os 47 casos de `test/orquestrador-enforcement.test.ts` (C0 do CI, janela de comentário,
ORQ-11, ORQ-12) continuam verdes **sem uma linha de edição**.

---

## 4. Fechamento: as três suítes, cruas

```
$ npx vitest run

 Test Files  41 passed (41)
      Tests  1050 passed (1050)
   Start at  20:12:18
   Duration  22.36s (transform 665ms, setup 0ms, collect 15.71s, tests 139.09s, …)
```

`test/orquestrador-enforcement-actus.test.ts` foi de **41 para 103 casos**. Vermelhos
antes, somados as quatro peças: **43** (7 + 13 + 18 + 5).

```
$ bash scripts/kit/test-shell.sh
== placar ==
  rc=0  test-lib-config.sh
  rc=0  test-drenagem.sh
  rc=0  test-retry-worktree.sh
TODOS OS SCRIPTS SAÍRAM rc 0
```

```
$ bash scripts/kit/test-instalar.sh
… 119 checks ok
TODOS OS CHECKS PASSARAM      (rc 0)
```

`npx tsc --noEmit`: limpo.

---

## 5. `bash instalar.sh --atualizar ~/Projetos/actus-saas --migrar --dry-run`

`rc 0`. **Nada foi escrito no Actus**: `git status` de lá continua com exatamente as
mesmas 7 modificações e os mesmos untracked de antes (as mais recentes de 2026-09-05,
todas anteriores a esta sessão), e `docs/fila/000-config.proposto.json` não existe.

### 5.1 Os renomes: eram 4, agora são **7**

Os três novos, colados do relatório (cortando o `porque`, que é longo de propósito):

```
renome migrations_dir → migrations.dir = "supabase/migrations" (o 'migrations_dir' FICA).
  enforcement-core.ts:273 (violacoesDeMigration) só cobra faixa dos `.sql` sob
  `migrations.dir`. O `--dry-run` do `instalar.sh` sobre o actus-saas (etapa 6) mostrou o
  buraco: a faixa migrava sozinha, o dir ficava para trás, e a regra B não mordia arquivo
  nenhum — com o config DIZENDO que a faixa está protegida. […] ATENÇÃO ao aplicar: com a
  regra B ligada, `.sql` fora do dir reprova por `migration_fora_do_dir` — inclusive testes
  SQL, que no Actus moram em `supabase/tests/`. Declare `enforcement.testes_sql.glob`
  ("supabase/tests/**") na MESMA revisão, ou o loop deixa de conseguir escrever teste de banco.

renome zona_proibida.no_write_prefixes → zona_proibida.prefixos_sem_ddl = ["vw_"]
  (o 'zona_proibida.no_write_prefixes' FICA). enforcement-core.ts:460 (violacoesDePrefixo). […]

renome zona_proibida.padroes_proibidos_no_diff → enforcement.padroes_proibidos_no_diff =
  [{"nome":"update_tenant_id_messages_particionada","regex":"(?is)update\\s+comercial\\.messages\\b[^;]*?\\bset\\b(?:(?!\\bwhere\\b)[^;])*\\btenant_id\\s*=", …},
   {"nome":"session_replication_role","regex":"(?i)session_replication_role", …},
   {"nome":"delete_fisico","regex":"(?is)\\bdelete\\s+from\\b(?![^;]*\\bwhere\\b[^;]*\\bfalse\\b)", …}]
  (o 'zona_proibida.padroes_proibidos_no_diff' FICA). enforcement-core.ts:533 (violacoesDePadrao). […]
```

E a linha das MANTIDAS que mudou de recado:

```
MANTIDA (própria do actus-saas, para a K11 decidir): zona_proibida.padroes_proibidos_no_diff
  — […] ABSORVIDA na K11a-4: o motor lê os mesmos padrões em
  `enforcement.padroes_proibidos_no_diff`, e a tabela COPIA o valor para lá (o renome acima).
```

Na etapa 6 essa mesma linha terminava com *"AINDA NÃO absorvida — é a regra F, e está em
K11a-4 no PECAS.md. Enquanto ela não entrar, o Actus PERDE esta proteção ao trocar de
motor."*

### 5.2 O que o proposto ganha (trecho do diff, colado)

```diff
--- /Users/lucasantos/Projetos/actus-saas/docs/fila/000-config.json (oficial, INTOCADO)
+++ /Users/lucasantos/Projetos/actus-saas/docs/fila/000-config.proposto.json (proposto)
     "excecoes_os_owned": [],
+    "colunas_congeladas": [
+      "etapa_canonica"
+    ],
+    "prefixos_sem_ddl": [
+      "vw_"
+    ]
   },
+  "migrations": {
+    "faixa": "0250-0299",
+    "dir": "supabase/migrations"
+  },
+  "enforcement": {
+    "padroes_proibidos_no_diff": [
+      {
+        "nome": "update_tenant_id_messages_particionada",
+        "regex": "(?is)update\\s+comercial\\.messages\\b[^;]*?\\bset\\b(?:(?!\\bwhere\\b)[^;])*\\btenant_id\\s*=",
+        "motivo": "comercial.messages é particionada por RANGE em enviada_em; UPDATE de tenant_id pode cruzar partição e corromper a linha. Reancoragem é ETL humano, não loop."
+      },
+      {
+        "nome": "session_replication_role",
+        "regex": "(?i)session_replication_role",
+        "motivo": "Desliga triggers/RLS a nível de sessão — ferramenta de humano em ETL/manutenção, nunca do loop."
+      },
+      {
+        "nome": "delete_fisico",
+        "regex": "(?is)\\bdelete\\s+from\\b(?![^;]*\\bwhere\\b[^;]*\\bfalse\\b)",
+        "motivo": "DELETE físico proibido: exclusão de dado de negócio é soft delete (deleted_at). Vale para .sql e SQL cru no código. Expurgo LGPD é migration/rota humana explícita, fora do loop."
+      }
+    ]
+  },
```

As três regexes chegam ao proposto **idênticas** ao que está no `000-config.json` do
Actus. `enforcement.testes_sql` NÃO aparece: não existe chave v1 de onde copiá-lo, e é
por isso que a linha do renome de `migrations.dir` avisa que ele precisa ser declarado à
mão na mesma revisão.

### 5.3 `orq config` sobre o proposto: **de 15 para 14 violações**

```
orq config sobre o PROPOSTO (rc 1):
  orcamento.usd_dia: placeholder não preenchido: "<teto de USD por dia, MEDIDO nas duas primeiras semanas>"
  orcamento.tokens_dia: placeholder não preenchido: "<teto de tokens por dia, medido>"
  orcamento.usd_ticket: placeholder não preenchido: "<teto de USD por ticket, medido>"
  orcamento.campos_usage.custo_usd: placeholder não preenchido: "<nome do campo de custo no JSON de `claude -p --output-format json`, confirmado no pré-voo>"
  orcamento.campos_usage.tokens_in: placeholder não preenchido: "<campo de tokens de entrada no envelope>"
  orcamento.campos_usage.tokens_out: placeholder não preenchido: "<campo de tokens de saída no envelope>"
  orcamento.campos_usage.tokens_cache: placeholder não preenchido: "<campo de tokens de cache no envelope>"
  juiz.paths_alto_risco[0]: placeholder não preenchido: "<ex: supabase/**>"
  juiz.paths_alto_risco[1]: placeholder não preenchido: "<ex: src/auth/**>"
  juiz.paths_alto_risco[2]: placeholder não preenchido: "<ex: src/billing/**>"
  juiz.diff_max_baixo: placeholder não preenchido: "<linhas de diff abaixo das quais o risco é baixo — o CI usa 300>"
  branch_protegida: placeholder não preenchido: "<a branch que o loop NUNCA empurra — ex.: main>"
  worktrees_prefixo: placeholder não preenchido: "<prefixo curto das worktrees deste repo — ex.: ci-, fx-, os->"
  launchd.label: placeholder não preenchido: "<ex: com.suaorg.orquestrador — OBRIGATÓRIO, um por repo>"

14 violação(ões)
```

A décima quinta, que a etapa 6 tinha, **sumiu**:

> ~~`migrations.dir`: migrations.faixa (ou faixas_reservadas) declarada sem migrations.dir —
> a regra B do enforcement só cobra .sql sob migrations.dir, então a faixa não vale para
> arquivo nenhum.~~

As 14 que ficam são todas placeholder de decisão local — ninguém pode tomá-las pelo dono.
O resto do dry-run está igual à etapa 6: liberações (5 tokens, 1 datado pelo git), tickets
(nenhum pendente a migrar), a única `NÃO APLICADA` (`proibicoes_absolutas.tools`, porque
`proibicoes_absolutas` é um array de prosa e a migração recusa escrever dentro dele), e o
`.gitignore` acusando `docs/fila/PAUSAR`.

---

## 6. Passos humanos para a adoção do Actus (atualizados)

Na ordem. Nada aqui é feito pelo kit.

1. `bash scripts/orq pausar` no Actus.
2. `bash instalar.sh --atualizar ~/Projetos/actus-saas` (o motor; hoje o Actus tem o dele
   em `.mjs`).
3. `--migrar --propor`, e então **preencher à mão** no
   `docs/fila/000-config.proposto.json`:
   - as 14 decisões locais (tetos de orçamento, campos do envelope, paths de alto risco,
     `branch_protegida`, `worktrees_prefixo`, `launchd.label`);
   - **`enforcement.testes_sql.glob = "supabase/tests/**"`** — obrigatório agora que
     `migrations.dir` migra sozinho, ou os testes SQL de lá param de passar;
   - `proibicoes_absolutas`: mover a prosa para `.regras` e acrescentar `.tools`.
4. Conferir a regra E: `prefixos_sem_ddl: ["vw_"]` passa a valer de verdade. É o que o
   Actus já queria.
5. `--aplicar`, e `orq config` tem de sair 0.
6. `docs/fila/PAUSAR` no `.gitignore`.

Para o CI, um item NOVO em relação à etapa 6: se/quando o config dele for migrado,
`no_write_prefixes: ["supabase_", "auth_"]` vira regra E ativa. É uma proibição que o
config de lá já declara e que a regra 3 nunca cobriu (ela é só DML) — mas é decisão de
quem revisa o proposto, não efeito colateral aceito em silêncio.

---

## 7. O diff cru do motor

`git diff 49869e2..HEAD --stat`:

```
 CHANGELOG.md                                |  43 ++
 docs/PECAS.md                               |  71 ++-
 scripts/orquestrador/config-chaves.ts       |   9 +-
 scripts/orquestrador/config-tabela.ts       |  35 +-
 scripts/orquestrador/enforcement-core.ts    | 229 ++++++++-
 scripts/orquestrador/migrar-config.ts       |   9 +
 test/fixtures/config/PROCEDENCIA.md         |  27 +
 test/fixtures/config/actus-000-config.json  | 113 +++++
 test/orquestrador-enforcement-actus.test.ts | 734 +++++++++++++++++++++++++++-
 9 files changed, 1236 insertions(+), 34 deletions(-)
```

`git diff 49869e2..HEAD -- scripts/` (415 linhas), na íntegra:

```diff
diff --git a/scripts/orquestrador/config-chaves.ts b/scripts/orquestrador/config-chaves.ts
index a5ac79b..1251223 100644
--- a/scripts/orquestrador/config-chaves.ts
+++ b/scripts/orquestrador/config-chaves.ts
@@ -94,7 +94,7 @@ export const CHAVES_CONFIG: ChaveConfig[] = [
   // --- enforcement B/C/D (peça K11a-1) --------------------------------------
   // Todas OPCIONAIS, e é o desenho: ausente = regra desligada. O CI não tem
   // nenhuma delas e o enforcement dele sai byte a byte igual.
-  { chave: 'migrations.dir', onde: 'enforcement-core.ts:273', obrigatoria: false, nota: 'liga a regra B; sem ele nenhum .sql é cobrado por faixa. NÃO cai no migrations_dir de topo de propósito' },
+  { chave: 'migrations.dir', onde: 'enforcement-core.ts:273', obrigatoria: false, nota: 'liga a regra B; sem ele nenhum .sql é cobrado por faixa. O motor NÃO cai no migrations_dir de topo de propósito; quem copia o valor é a tabela, e só para quem declarou a faixa (K11a-4d)' },
   { chave: 'migrations.faixa', onde: 'enforcement-core.ts:273', obrigatoria: false, nota: '[min,max] ou "0250-0299"; no Actus é migrations_faixa_loop' },
   { chave: 'migrations.faixas_reservadas', onde: 'enforcement-core.ts:273', obrigatoria: false, nota: 'faixas de OUTRO dono (no Actus, 0200-0249 é da Agência)' },
   { chave: 'zona_proibida.schemas_permitidos', onde: 'enforcement-core.ts:392', obrigatoria: false, nota: 'ausente = sem restrição por schema; presente = tudo fora dele reprova' },
@@ -102,6 +102,13 @@ export const CHAVES_CONFIG: ChaveConfig[] = [
   { chave: 'zona_proibida.colunas_congeladas', onde: 'enforcement-core.ts:426', obrigatoria: false, nota: 'globs; no Actus é no_write_columns' },
   { chave: 'zona_proibida.colunas_sombra', onde: 'enforcement-core.ts:426', obrigatoria: false, nota: 'globs que VENCEM as congeladas — a saída declarada (etapa_v2_*)' },
 
+  // --- enforcement E/F e a exceção de teste-SQL (peça K11a-4) ---------------
+  // Mesmo desenho das de cima: ausente = regra desligada, e nenhuma existe no
+  // config do CI, do fixture ou do checkout.
+  { chave: 'zona_proibida.prefixos_sem_ddl', onde: 'enforcement-core.ts:460', obrigatoria: false, nota: 'regra E: CREATE/ALTER/DROP de objeto com o prefixo. No Actus e no Comarka é no_write_prefixes' },
+  { chave: 'enforcement.padroes_proibidos_no_diff', onde: 'enforcement-core.ts:533', obrigatoria: false, nota: 'regra F: lista de {nome, regex, motivo}, flags inline (?i)/(?is). No Actus mora em zona_proibida' },
+  { chave: 'enforcement.testes_sql.glob', onde: 'enforcement-core.ts:384', obrigatoria: false, nota: 'quem ENTRA na exceção de teste-SQL (no Actus, supabase/tests/**). Tira o arquivo da regra B e o cobra nas 4 condições do checarTesteSql. Repo com regra B ligada e testes .sql fora do migrations.dir PRECISA declará-lo, ou a regra B reprova esses arquivos' },
+
   // --- piso de tools (peça T17) ---------------------------------------------
   { chave: 'proibicoes_absolutas.tools', onde: 'executor.sh:tools_proibidas, perfil.ts:190', obrigatoria: false, nota: 'o PISO de --disallowedTools; ausente = piso vazio e a flag não é passada. Nos três repos do disco `proibicoes_absolutas` ainda é um ARRAY de prosa, e ali o piso nasce vazio' },
 
diff --git a/scripts/orquestrador/config-tabela.ts b/scripts/orquestrador/config-tabela.ts
index e4b84a8..43b6c46 100644
--- a/scripts/orquestrador/config-tabela.ts
+++ b/scripts/orquestrador/config-tabela.ts
@@ -33,6 +33,15 @@ export interface Renome {
   para: string
   /** Por que são a mesma coisa — e a linha do motor que prova. */
   porque: string
+  /**
+   * Caminho de OUTRA chave que precisa existir no config para o renome valer.
+   * Existe por um caso só, e ele é a razão de ser do campo: `migrations_dir`
+   * está em TODO repo (é como o motor classifica `.sql` como artefato inerte),
+   * mas o destino `migrations.dir` LIGA a regra B. Copiar de arrasto ligaria a
+   * regra em quem nunca a pediu. Quem pede a regra é a FAIXA — e é ela a
+   * condição. Ausente = o renome vale sempre, que é o caso dos outros quatro.
+   */
+  so_quando?: string
 }
 
 /**
@@ -87,7 +96,7 @@ export const RENOMES: Renome[] = [
     de: 'migrations_faixa_loop',
     para: 'migrations.faixa',
     porque:
-      'enforcement-core.ts:273 (violacoesDeMigration) lê esta chave: é a faixa do loop no Actus ("0250-0299"). O motor aceita a string e a tupla [min,max] justamente para que este renome seja CÓPIA de valor, e não transformação — transformar valor numa migração é o começo de traduzir errado em silêncio. `migrations.dir` NÃO entra na tabela, e é decisão: renomear `migrations_dir` para dentro de `migrations` ligaria a regra B em TODO repo que tem migration (o CI inclusive, que nunca pediu faixa nenhuma). Quem cobra o `dir` é o `orq config`, que acusa "faixa sem dir" (config-cli.ts:152) — o dono declara, e a regra nasce ligada de propósito, nunca de arrasto.',
+      'enforcement-core.ts:273 (violacoesDeMigration) lê esta chave: é a faixa do loop no Actus ("0250-0299"). O motor aceita a string e a tupla [min,max] justamente para que este renome seja CÓPIA de valor, e não transformação — transformar valor numa migração é o começo de traduzir errado em silêncio. O par desta chave é `migrations.dir`, e ele vem do renome ABAIXO — que só dispara quando ESTA chave existe (`so_quando`). Até a K11a-4d o `dir` ficava de fora da tabela inteiramente, e o `orq config` cobrava "faixa sem dir" (config-cli.ts:152); o `--dry-run` sobre o Actus mostrou o que isso produzia na prática — faixa declarada valendo para arquivo nenhum. A decisão que motivava aquilo continua de pé, agora dentro da condição: renomear `migrations_dir` de arrasto ligaria a regra B em TODO repo que tem migration (o CI inclusive, que nunca pediu faixa nenhuma).',
   },
   {
     de: 'zona_proibida.no_write_columns',
@@ -95,6 +104,28 @@ export const RENOMES: Renome[] = [
     porque:
       'enforcement-core.ts:426 (violacoesDeColuna). O nome novo diz o que a lista É (colunas congeladas) e abre espaço para a irmã `colunas_sombra`, que não existe em repo nenhum hoje e é a saída declarada da família (etapa_v2_*, ledger 0171 do Actus). O `no_write_columns` FICA.',
   },
+  // --- K11a-4d: o dir da regra B, e SÓ para quem declarou a faixa -----------
+  {
+    de: 'migrations_dir',
+    para: 'migrations.dir',
+    so_quando: 'migrations_faixa_loop',
+    porque:
+      'enforcement-core.ts:273 (violacoesDeMigration) só cobra faixa dos `.sql` sob `migrations.dir`. O `--dry-run` do `instalar.sh` sobre o actus-saas (etapa 6) mostrou o buraco: a faixa migrava sozinha, o dir ficava para trás, e a regra B não mordia arquivo nenhum — com o config DIZENDO que a faixa está protegida. A K11a-1 tinha deixado este renome de fora para não ligar a regra B em todo repo que tem migration, e a condição `so_quando: migrations_faixa_loop` guarda essa decisão inteira: quem pede a regra é a FAIXA, o dir só diz onde ela vale. O CI declara `migrations_dir` e NÃO declara faixa, então continua sem `migrations` e com a regra B desligada. ATENÇÃO ao aplicar: com a regra B ligada, `.sql` fora do dir reprova por `migration_fora_do_dir` — inclusive testes SQL, que no Actus moram em `supabase/tests/`. Declare `enforcement.testes_sql.glob` (`"supabase/tests/**"`) na MESMA revisão, ou o loop deixa de conseguir escrever teste de banco.',
+  },
+  // --- K11a-4: a chave da regra E ------------------------------------------
+  {
+    de: 'zona_proibida.no_write_prefixes',
+    para: 'zona_proibida.prefixos_sem_ddl',
+    porque:
+      'enforcement-core.ts:460 (violacoesDePrefixo). O nome novo diz o RECORTE da regra — prefixos que não recebem DDL —, e o recorte importa: escrever DADO num objeto de nome proibido continua sendo assunto de `no_write_tables`/`colunas_congeladas`, não desta lista. Diferente dos dois renomes acima, este NÃO é chave só do Actus: o CI declara `no_write_prefixes: ["supabase_", "auth_"]` e o template também traz `vw_`, então migrar o config DELES LIGA a regra E com os prefixos que eles próprios escreveram. Isso é mudança de veredito, e está dita aqui, na linha do relatório do `--dry-run` e num caso de teste (`orquestrador-enforcement-actus.test.ts`) em vez de escondida: a regra 3 (`no_write_tables: "TODAS"`) NÃO cobre CREATE/ALTER/DROP, então o `_no_write_prefixes` do CI ("redundante dado no_write_tables=TODAS") descreve uma redundância que não existe. Quem revisa o proposto tira a chave se não a quiser; o `no_write_prefixes` FICA de qualquer forma.',
+  },
+  // --- K11a-4: a chave da regra F, e ela MUDA DE PAI ------------------------
+  {
+    de: 'zona_proibida.padroes_proibidos_no_diff',
+    para: 'enforcement.padroes_proibidos_no_diff',
+    porque:
+      'enforcement-core.ts:533 (violacoesDePadrao). O destino não é `zona_proibida` de propósito: `zona_proibida` é a fronteira de ESCRITA (que tabela, que coluna, que caminho, que prefixo), e F julga o TEXTO do diff — o mesmo padrão pega SQL destrutivo dentro de um arquivo que a allowlist permite. Guardar as duas coisas na mesma chave faz a fronteira parecer uma lista de regexes. O VALOR é copiado sem tocar: as três regexes do Actus (reancoragem de tenant_id em tabela particionada, session_replication_role, DELETE físico) viajam byte a byte, incluindo o `(?:(?!\\bwhere\\b)[^;])*` que o ticket 615 de lá mediu — reescrever uma regex numa migração é reescrever a proibição. O `zona_proibida.padroes_proibidos_no_diff` FICA.',
+  },
 ]
 
 /**
@@ -391,6 +422,6 @@ export const PROPRIAS_DE_REPO: PropriaDeRepo[] = [
     chave: 'zona_proibida.padroes_proibidos_no_diff',
     repo: 'actus-saas',
     porque:
-      'padrões de texto proibidos no diff (regexes com flags inline `(?i)/(?is)`, três no Actus: reancoragem de tenant_id em tabela particionada, session_replication_role, DELETE físico). AINDA NÃO absorvida — é a regra F, e está em K11a-4 no PECAS.md. Enquanto ela não entrar, o Actus PERDE esta proteção ao trocar de motor.',
+      'padrões de texto proibidos no diff (regexes com flags inline `(?i)/(?is)`, três no Actus: reancoragem de tenant_id em tabela particionada, session_replication_role, DELETE físico). ABSORVIDA na K11a-4: o motor lê os mesmos padrões em `enforcement.padroes_proibidos_no_diff`, e a tabela COPIA o valor para lá (o renome acima). A chave v1 fica intocada pelo mesmo motivo das duas anteriores — o motor não a lê, e quem edita o config do Actus à mão procura por este nome.',
   },
 ]
diff --git a/scripts/orquestrador/enforcement-core.ts b/scripts/orquestrador/enforcement-core.ts
index c1e5f3f..1588b39 100644
--- a/scripts/orquestrador/enforcement-core.ts
+++ b/scripts/orquestrador/enforcement-core.ts
@@ -42,6 +42,39 @@ export interface MigrationsRegra {
   faixas_reservadas?: Faixa[]
 }
 
+/**
+ * Regra F (K11a-4): uma regex de texto proibida no diff, com NOME. O nome é o
+ * que aparece na violação — uma regex crua na mensagem manda quem lê o
+ * enforcement.json decifrar o padrão para descobrir o que ele proíbe.
+ */
+export interface PadraoProibido {
+  nome: string
+  /** Sintaxe JS, com flags inline `(?i)`/`(?is)` opcionais no começo. */
+  regex: string
+  motivo?: string
+}
+
+/**
+ * As regras de enforcement que não são fronteira de ESCRITA e por isso não moram
+ * em `zona_proibida`: F julga o TEXTO do diff, e a exceção de teste-SQL julga a
+ * forma de um arquivo. Ausente = as duas desligadas.
+ */
+/**
+ * A exceção estreita de teste-SQL (K11a-4). `glob` descreve quem ENTRA nela —
+ * no Actus, o `tests_dir` inteiro (`enforcement.mjs:217`) —, e o sufixo
+ * `.test.sql` é a CONDIÇÃO 1, checada pela regra. Um glob já estreitado a
+ * `*.test.sql` deixaria a condição 1 inalcançável: o arquivo de nome errado nem
+ * entraria na exceção, e cairia na regra B com outro nome de violação.
+ */
+export interface TestesSqlRegra {
+  glob?: string | string[] | undefined
+}
+
+export interface EnforcementRegras {
+  padroes_proibidos_no_diff?: PadraoProibido[] | undefined
+  testes_sql?: TestesSqlRegra | undefined
+}
+
 export interface EnforceConfig {
   migrations_dir: string
   /** Segundo diretório de artefato .sql (ORQ-08). Opcional: config antiga sem o campo continua válida. */
@@ -49,8 +82,11 @@ export interface EnforceConfig {
   politica_schema: { comportamento_vigente: string }
   /** Regra B. Ausente = desligada (o CI e o fixture não têm a chave). */
   migrations?: MigrationsRegra | undefined
+  /** Regras F e da exceção de teste-SQL. Ausente = desligadas. */
+  enforcement?: EnforcementRegras | undefined
   zona_proibida: {
-    no_write_paths: string[]
+    /** Ausente = lista vazia: a `zona_proibida` do Actus é só de banco, sem caminho. */
+    no_write_paths?: string[] | undefined
     /** `"TODAS"` = negação total (CI); LISTA de tabelas = regra C nomeada (Actus). */
     no_write_tables: string | string[]
     no_write_credenciais?: { padroes?: string[] }
@@ -62,6 +98,8 @@ export interface EnforceConfig {
     colunas_congeladas?: string[] | undefined
     /** Regra D: as sombras declaradas (glob), que passam mesmo casando uma congelada. */
     colunas_sombra?: string[] | undefined
+    /** Regra E: prefixos de OBJETO que o loop nunca cria, altera nem apaga (`no_write_prefixes` no Actus). */
+    prefixos_sem_ddl?: string[] | undefined
   }
 }
 
@@ -88,6 +126,15 @@ export type TipoViolacao =
   | 'tabela_congelada'
   | 'tabela_nao_permitida'
   | 'coluna_congelada'
+  // --- K11a-4: a regra E do Actus. Tipo PRÓPRIO, e não `zona_proibida`: o que
+  // ela acusa é DDL de um objeto pelo NOME dele, e quem lê o enforcement.json
+  // precisa saber que a causa foi o prefixo — não um caminho de arquivo.
+  | 'prefixo_sem_ddl'
+  | 'padrao_proibido'
+  // Config quebrada NÃO é diff limpo: regex que não compila tem tipo próprio,
+  // para não virar "nenhum padrão casou" em silêncio.
+  | 'padrao_regex_invalida'
+  | 'teste_sql_invalido'
 
 export interface Violation {
   tipo: TipoViolacao
@@ -269,6 +316,78 @@ export function parseFaixa(faixa: Faixa): [number, number] {
   return [Number(m[1]), Number(m[2])]
 }
 
+// ─── K11a-4 · a exceção estreita de teste-SQL ───────────────────────────────
+
+/**
+ * Tag de dollar-quoting do Postgres: ou vazia (`$$`), ou um identificador que
+ * começa por letra/underscore e SEGUE com letras, DÍGITOS ou underscore
+ * (`$teste_0250$`). Porte de `enforcement.mjs:124`, com o defeito que o Actus
+ * mediu já corrigido: a classe antiga (`[a-zA-Z_]*`) não aceitava dígito, e como
+ * o ticket manda nomear os testes 0250/0251/0252 a tag natural leva número —
+ * todo arquivo era lido como "sem bloco DO".
+ */
+const TAG_DOLAR = '(?:[A-Za-z_][A-Za-z0-9_]*)?'
+
+/**
+ * Remove o CORPO dos blocos `$$ ... $$` / `$tag$ ... $tag$` — sobra só o SQL de
+ * nível de topo, que é o que a condição 4 julga. O que roda DENTRO do `DO` é o
+ * teste; o que roda FORA dele é schema de verdade.
+ */
+export function removerBlocosDolarCitados(sql: string): string {
+  return sql.replace(new RegExp(`\\$(${TAG_DOLAR})\\$[\\s\\S]*?\\$\\1\\$`, 'g'), ' ')
+}
+
+/**
+ * Remove comentários de linha `--` do que sobrou. A PALAVRA "UPDATE" num
+ * cabeçalho em prosa não é DML: sem isto, explicar o teste em português reprova
+ * o arquivo. Só `--`; comentário de bloco não (`enforcement.mjs:136`).
+ */
+export function removerComentariosDeLinha(sql: string): string {
+  return sql.replace(/--[^\n]*/g, ' ')
+}
+
+/**
+ * As 4 condições, verificadas no conteúdo ADICIONADO do próprio arquivo:
+ * 1) nome termina em `.test.sql`; 2) bloco `DO` com `$$` (tag com dígito vale);
+ * 3) `RAISE EXCEPTION`, o rollback proposital; 4) nenhum DDL (CREATE/ALTER/DROP
+ * de TABLE/FUNCTION/VIEW/POLICY/INDEX) nem DML (INSERT/UPDATE/DELETE) de TOPO,
+ * fora do bloco DO. Devolve o motivo da PRIMEIRA que falhar — a mensagem cita a
+ * condição, porque "teste sql inválido" sozinho manda quem leu abrir o arquivo
+ * e adivinhar qual das quatro foi.
+ */
+export function checarTesteSql(arquivo: string, conteudo: string): { ok: boolean; motivo: string } {
+  if (!arquivo.endsWith('.test.sql')) {
+    return { ok: false, motivo: 'nome não termina em .test.sql' }
+  }
+  if (!new RegExp(`\\bdo\\b\\s*(?:language\\s+\\w+\\s*)?\\$${TAG_DOLAR}\\$`, 'i').test(conteudo)) {
+    return { ok: false, motivo: 'sem bloco DO com $$ (rollback proposital não identificado)' }
+  }
+  if (!/\braise\s+exception\b/i.test(conteudo)) {
+    return { ok: false, motivo: 'sem RAISE EXCEPTION (o rollback proposital do teste)' }
+  }
+  const semBlocosDo = removerComentariosDeLinha(removerBlocosDolarCitados(conteudo))
+  // `unique`/`materialized` entram ENTRE create/or-replace e a palavra-tipo em
+  // sintaxe Postgres real (`CREATE UNIQUE INDEX`, `CREATE MATERIALIZED VIEW`) —
+  // sem essas duas peças opcionais o regex deixava passar DDL de topo de
+  // verdade sob um rótulo válido, furando a condição 4 fail-closed.
+  const ddlDeTopo = /\b(create|alter|drop)\s+(or\s+replace\s+)?(unique\s+)?(materialized\s+)?(table|function|view|policy|index)\b/i
+  const dmlDeTopo = /\binsert\s+into\b|\bupdate\b\s+\S|\bdelete\s+from\b/i
+  if (ddlDeTopo.test(semBlocosDo)) {
+    return { ok: false, motivo: 'DDL de topo fora do bloco DO (CREATE/ALTER/DROP de TABLE/FUNCTION/VIEW/POLICY/INDEX)' }
+  }
+  if (dmlDeTopo.test(semBlocosDo)) {
+    return { ok: false, motivo: 'DML de topo fora do bloco DO (INSERT/UPDATE/DELETE)' }
+  }
+  return { ok: true, motivo: '' }
+}
+
+/** O arquivo entra na exceção de teste-SQL? Vazio/ausente = a exceção não existe. */
+export function ehTesteSql(arquivo: string, config: EnforceConfig): boolean {
+  const g = config.enforcement?.testes_sql?.glob
+  const globs = g === undefined || g === null ? [] : Array.isArray(g) ? g : [g]
+  return globs.some((x) => globToRegExp(x).test(arquivo))
+}
+
 /** Regra B, arquivo a arquivo. Vazio quando `migrations.dir` não está no config. */
 export function violacoesDeMigration(arquivos: string[], config: EnforceConfig): Violation[] {
   const regra = config.migrations
@@ -285,6 +404,10 @@ export function violacoesDeMigration(arquivos: string[], config: EnforceConfig):
   for (const arq of arquivos) {
     if (!arq || !/\.sql$/i.test(arq)) continue
     if (ehArtefatoSql(arq, outrosDirs)) continue
+    // A exceção de teste-SQL TIRA o arquivo da faixa: ele não é migration, e
+    // cobrar numeração dele bloquearia o teste que o próprio ticket pediu. Em
+    // troca ele responde pelas 4 condições, abaixo.
+    if (ehTesteSql(arq, config)) continue
     if (!arq.startsWith(dir + '/')) {
       v.push({ tipo: 'migration_fora_do_dir', detalhe: `${arq}: .sql fora de ${dir}/` })
       continue
@@ -439,12 +562,95 @@ export function violacoesDeColuna(arquivo: string, texto: string, config: Enforc
   return v
 }
 
+/**
+ * Regra E · CREATE/ALTER/DROP de objeto cujo nome começa por um prefixo
+ * declarado. Porte do laço `no_write_prefixes` do actus-saas
+ * (`enforcement.mjs:270-275`), com a MESMA janela de 60 caracteres entre o verbo
+ * e o nome — é ela que faz `create or replace view vw_x` casar sem que a regra
+ * precise conhecer a gramática de `CREATE`, e o Comarka usa a mesma chave com
+ * outros donos (`trafego_`, `vw_`).
+ *
+ * E é DDL, e só. Escrever DADO num objeto de nome proibido é assunto das regras
+ * C e D, que julgam por tabela e por coluna: sem essa separação, `prefixos_sem_ddl`
+ * viraria um segundo `no_write_tables` por semelhança de nome.
+ */
+export function violacoesDePrefixo(arquivo: string, texto: string, config: EnforceConfig): Violation[] {
+  const prefixos = config.zona_proibida.prefixos_sem_ddl ?? []
+  if (prefixos.length === 0) return []
+  const v: Violation[] = []
+  for (const pref of prefixos) {
+    const p = pref.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
+    const re = new RegExp(`\\b(create|alter|drop)\\b[\\s\\S]{0,60}?\\b${p}\\w+`, 'i')
+    if (re.test(texto)) {
+      v.push({
+        tipo: 'prefixo_sem_ddl',
+        detalhe: `${arquivo}: CREATE/ALTER/DROP de objeto com prefixo proibido '${pref}'`,
+      })
+    }
+  }
+  return v
+}
+
+// ─── K11a-4 · regra F: padrões proibidos no texto do diff ───────────────────
+
+/**
+ * `new RegExp` que aceita o prefixo `(?flags)` — V8 não honra o `(?i)` cru, e as
+ * regexes do config do Actus vêm todas com ele. Porte de `compilarRegex`
+ * (`enforcement.mjs:178`). Flags desconhecidas são descartadas em vez de fazer o
+ * construtor lançar: o que importa preservar é a regex, não o dedo do digitador.
+ */
+export function compilarRegex(str: string): RegExp {
+  const m = /^\(\?([a-z]+)\)/.exec(str)
+  if (m) {
+    const flags = (m[1] ?? '').replace(/[^gimsuy]/g, '')
+    return new RegExp(str.slice(m[0].length), flags)
+  }
+  return new RegExp(str)
+}
+
+/**
+ * Regra F · as regexes de `enforcement.padroes_proibidos_no_diff`, aplicadas ao
+ * bloco de linhas ADICIONADAS de um arquivo. Porte de `enforcement.mjs:277-287`.
+ *
+ * Ela existe para o risco que allowlist de caminho não pega: SQL destrutivo
+ * DENTRO de um arquivo permitido. Por isso roda também no `artefato_sql`, pela
+ * mesma razão de C e D — alguém vai aplicar aquele arquivo — e nunca na prosa.
+ *
+ * Por ARQUIVO, e não no diff inteiro como o Actus faz: a violação passa a
+ * nomear onde o padrão casou, e um `;` do arquivo A deixa de fechar a cláusula
+ * que a regex estava lendo no arquivo B.
+ */
+export function violacoesDePadrao(arquivo: string, texto: string, config: EnforceConfig): Violation[] {
+  const padroes = config.enforcement?.padroes_proibidos_no_diff ?? []
+  const v: Violation[] = []
+  for (const pad of padroes) {
+    let re: RegExp
+    try {
+      re = compilarRegex(pad.regex)
+    } catch (e) {
+      v.push({ tipo: 'padrao_regex_invalida', detalhe: `${arquivo}: regex do padrão '${pad.nome}' não compila: ${(e as Error).message}` })
+      continue
+    }
+    if (re.test(texto)) {
+      v.push({ tipo: 'padrao_proibido', detalhe: `${arquivo}: ${pad.nome} — ${pad.motivo || 'padrão proibido no diff'}` })
+    }
+  }
+  return v
+}
+
 export function enforce(input: EnforceInput): EnforceResult {
   const v: Violation[] = []
   const zp = input.config.zona_proibida
   const negacaoTotal = zp.no_write_tables === 'TODAS'
 
-  const proibidos = [...zp.no_write_paths, ...(zp.no_write_credenciais?.padroes ?? [])]
+  // ACHADO da K11a-4d, alimentando a barreira com o `000-config.json` REAL do
+  // actus-saas: a `zona_proibida` de lá não tem `no_write_paths` — ela é uma
+  // fronteira de BANCO (tabelas, colunas, prefixos, padrões), e caminho nunca
+  // entrou. O spread de `undefined` derrubava o `enforce` inteiro com um
+  // TypeError, antes de qualquer regra rodar. `no_write_paths` não é chave
+  // obrigatória em `config-chaves.ts`, então o config estava certo e o motor
+  // errado: lista ausente é lista VAZIA, e a regra 2 simplesmente não acusa.
+  const proibidos = [...(zp.no_write_paths ?? []), ...(zp.no_write_credenciais?.padroes ?? [])]
 
   for (const f of input.changedFiles) {
     if (!f) continue
@@ -460,7 +666,8 @@ export function enforce(input: EnforceInput): EnforceResult {
 
   const linhas = addedLines(input.diff)
 
-  // C+D) escrita por tabela e por coluna, POR ARQUIVO — o bloco de linhas
+  // C+D+E+F) escrita por tabela, por coluna, DDL por prefixo e padrões proibidos,
+  // POR ARQUIVO — o bloco de linhas
   // adicionadas daquele arquivo, não a linha solta (a cadeia
   // `.from('x')\n.insert({})` é a forma normal em TS).
   //
@@ -484,6 +691,22 @@ export function enforce(input: EnforceInput): EnforceResult {
     const texto = corpo.join('\n')
     v.push(...violacoesDeTabela(arquivo, texto, input.config))
     v.push(...violacoesDeColuna(arquivo, texto, input.config))
+    v.push(...violacoesDePrefixo(arquivo, texto, input.config))
+    v.push(...violacoesDePadrao(arquivo, texto, input.config))
+  }
+
+  // Exceção de teste-SQL (K11a-4c): o arquivo saiu da regra B lá em cima, e
+  // aqui responde pelas 4 condições, contra o conteúdo do PRÓPRIO arquivo — não
+  // contra o diff inteiro misturado, que é o que faria o DO de um arquivo valer
+  // como rollback de outro. Sem linhas adicionadas próprias (arquivo só
+  // renomeado, por exemplo), cai no conteúdo geral, como o Actus faz.
+  for (const arq of input.changedFiles) {
+    if (!arq || !/\.sql$/i.test(arq)) continue
+    if (!ehTesteSql(arq, input.config)) continue
+    const corpo = porArquivo.get(arq)
+    const conteudo = (corpo && corpo.length ? corpo : linhas.map((l) => l.linha)).join('\n')
+    const r = checarTesteSql(arq, conteudo)
+    if (!r.ok) v.push({ tipo: 'teste_sql_invalido', detalhe: `${arq}: ${r.motivo}` })
   }
 
   for (let i = 0; i < linhas.length; i++) {
diff --git a/scripts/orquestrador/migrar-config.ts b/scripts/orquestrador/migrar-config.ts
index 50a6952..9c8b940 100644
--- a/scripts/orquestrador/migrar-config.ts
+++ b/scripts/orquestrador/migrar-config.ts
@@ -118,6 +118,15 @@ export function propor(raiz: unknown): Proposta {
   for (const r of RENOMES) {
     const valor = ler(cfg, r.de)
     if (valor === undefined || valor === null) continue
+    // `so_quando`: o renome que só vale para quem declarou OUTRA chave. Sem
+    // isto, `migrations_dir → migrations.dir` ligaria a regra B em todo repo
+    // que tem migration — e ligar regra de enforcement de arrasto é o oposto do
+    // que uma migração pode fazer sozinha. Silencioso de propósito: o config
+    // que não satisfaz a condição não tem nada a relatar sobre ela.
+    if (r.so_quando) {
+      const gatilho = ler(cfg, r.so_quando)
+      if (gatilho === undefined || gatilho === null) continue
+    }
     const jaTinha = ler(cfg, r.para)
     if (jaTinha !== undefined && jaTinha !== null) {
       linhas.push(`renome ${r.de} → ${r.para}: NÃO aplicado, '${r.para}' já existe com valor próprio`)
```
