# Relatório — SESSÃO ACTUS FASE-A (adoção do orquestrador-kit)

> Sessão de **11/09/2026**, no checkout `~/Projetos/actus-saas` (`main` =
> `origin/main` = `a098cae`, árvore limpa). Escopo de escrita respeitado: os
> ÚNICOS três arquivos tocados são `docs/fila/000-config.revisado.json`,
> `docs/fila/rascunhos/900-fixture-adocao.md` e este relatório. Zero `git add`,
> zero commit, zero push, zero worktree nova, zero `instalar.sh`, zero
> `launchctl`, zero install de dependência, zero migration, zero DDL, zero
> `PAUSAR`, e nenhum byte escrito em `000-config.json` ou
> `000-config.proposto.json`.
>
> **Sobre esta ser a segunda passada.** Os dois artefatos já existiam no disco,
> não versionados, da sessão de 10/09 (que morreu por limite de sessão). Eles
> NÃO foram aceitos como estavam: foram relidos contra o disco e contra o kit,
> e a releitura achou **um defeito real** (§ Peça 1, "o que mudou nesta
> rodada"). As datas de medição de 10/09 que continuam no arquivo foram
> reconferidas hoje, uma a uma, e batem.

---

## PASSO 0 — a leitura, uma linha por arquivo

1. **`orquestrador-kit/CONTRATO.md`** (611 linhas) — determina o que o motor
   FAZ hoje, com `arquivo:linha` de conferência para cada afirmação: layout
   motor × repo, ticket (primeiro bloco ```json manda), `runs/STATUS.md`,
   vocabulário FECHADO de 21 eventos da trilha, evidência por tentativa,
   liberações v2, kill switch `PAUSAR`, o schema 2 do config, os verbos do
   `orq` (read-only, três exceções que escrevem UM arquivo do repo cada) e 10
   divergências conhecidas, cada uma com a peça que a fecha.
2. **`orquestrador-kit/docs/PLAYBOOK.md`** (76 linhas) — determina o formato da
   memória do KIT (causa · detecção · conserto · lição) e registra UM incidente:
   08/09, o teste do instalador sequestrou o job de produção do launchd do CI
   porque o label vivia no SCRIPT, não no config. Origem direta da regra
   `launchd.label` vem do config e o instalador RECUSA sem ele.
3. **`scripts/orquestrador/config-cli.ts`** (238 linhas) + **`config-chaves.ts`**
   (121 linhas, onde o schema efetivo de fato mora) — determinam o que `orq
   config` cobra: placeholder `<...>` (o valor É um, nunca o que apenas menciona
   um), as **41 chaves obrigatórias** com o `arquivo:linha` de quem as lê, gate
   sem papel inferível, e `migrations.faixa` declarada sem `migrations.dir`.
4. **`orquestrador-kit/instalar.sh`** (739 linhas) + **`config-tabela.ts`** (427
   linhas, onde a tabela de renomes mora) — determinam os três verbos
   (`--verificar`/`--atualizar`/`--novo`), as 4 recusas do `--atualizar` (só a
   4ª cede a `--forcar`), e o `--migrar`: pausa e liberações são APLICADAS,
   tickets são aplicados sem `.bak`, e o **config é só PROPOSTO** — 8 renomes,
   28 chaves novas (`politica`/`local`/`derivada`) e 8 chaves próprias de repo
   que ficam intocadas. Regra 1: renomear é COPIAR, o nome antigo FICA.
5. **`actus-saas/docs/fila/000-config.json`** (113 linhas) — o config vivo,
   schema 1: fronteira de BANCO (3 tabelas, 1 coluna, 1 prefixo, 3 regexes),
   3 gates por binário local, faixa de migration 0250–0299, identidade
   (`actus-saas` + `fqwhpcusmkmvtgyofuwh`) e 8 proibições em prosa. Não tem
   kill switch, orçamento, juiz por nível, gate de ticket nem launchd.
6. **`actus-saas/scripts/orquestrador/`** (25 arquivos, 6.313 linhas, zero
   python) — o harness antigo inteiro: `local-loop.mjs` (drenagem, lock,
   cooldown, órfãos, **push**, relatório), `executor.mjs` (worktree, claude,
   commit por pathspec, gates, critérios, juiz, merge), `enforcement.mjs`
   (regras A–F), `avaliador.mjs` (juiz + merge), `pre-voo.mjs` (cat. J/0/1/6/3
   + contrato-em-teste), `fila-read.mjs`, `ticket-md.mjs`, `telemetria.mjs`,
   `sql-pendentes.mjs`, os dois shell do launchd e 9 arquivos de teste.
7. **`conteudos-infinitos/docs/fila/000-config.json`** (481 linhas) — a
   referência de schema 2 já migrado: mostra o que é `politica` (as 7 causas de
   adiamento, a política de retry, `campos_usage` sondado de verdade), o que é
   `local` (tetos medidos, `paths_alto_risco` validados com `git ls-files`), e
   o que fica como registro sem interruptor (`push_suprimido`,
   `_v2_aditivo`).

---

## PEÇA 1 — `docs/fila/000-config.revisado.json`

### O que mudou NESTA rodada (a releitura não foi carimbo)

1. **DEFEITO REAL CORRIGIDO — o renome da regra F tinha apagado a chave v1.**
   `zona_proibida.padroes_proibidos_no_diff` havia sumido do arquivo, enquanto
   a nota vizinha afirmava, por escrito, que ela "fica intocada". Duas coisas
   erradas de uma vez: a regra 1 da tabela do kit (*renomear é COPIAR, o nome
   antigo fica*, `config-tabela.ts:32-36`) foi violada só nesse renome — os
   outros três (`migrations_faixa_loop`, `no_write_columns`,
   `no_write_prefixes`) preservam a chave v1 —, e o harness antigo
   (`enforcement.mjs:278`, que lê `zona.padroes_proibidos_no_diff`) perderia as
   três regexes **em silêncio**. As 3 regexes foram repostas e provadas iguais
   campo a campo às do v1 e às da cópia nova.
2. **Aviso de INCOMPATIBILIDADE acrescentado no topo** (`_INCOMPATIVEL_COM_O_HARNESS_ANTIGO`).
   Medido, não suposto: `proibicoes_absolutas` virou OBJETO, e
   `executor.mjs:35` faz `[...(config.proibicoes_absolutas || [])]` — spread de
   objeto é `TypeError: (…) is not iterable`, reproduzido em `node -e` nesta
   sessão. Copiar este config por cima do vivo **com o harness .mjs ainda no
   comando derruba todo ticket na montagem do prompt**. Troca de config e
   instalação do motor são UM passo, com o loop pausado.
3. **`no_write_paths`: a ausência tem efeito colateral medido.**
   `executor.sh:373` monta a linha do prompt com
   `$(cfg '.zona_proibida.no_write_paths | join(", ")')`, e `jq` sobre chave
   ausente/nula sai com **erro rc 5** ("Cannot iterate over null"). Não derruba
   o run (a substituição está dentro do heredoc do prompt), mas produz a linha
   `Zona proibida: .` vazia e um erro de `jq` no stderr a cada prompt. Como a
   decisão é do Lucas, o valor NÃO foi escrito: entrou uma
   `_no_write_paths_PROPOSTA` com os globs já validados por `git ls-files`,
   para que adotar seja renomear a chave.
4. **`sql_pendente_dir`: mesma honestidade.** `executor.sh:368` interpola
   `$(cfg '.sql_pendente_dir')` no prompt e `jq -r` devolve a STRING `"null"`
   tanto para chave nula quanto ausente — a linha do prompt vira "só sob
   supabase/migrations ou **null**". Não quebra (o core filtra o falsy,
   `enforcement-core.ts:217`), mas está registrado no arquivo.

### Os vereditos que o prompt fechou, e como foram cumpridos

**Gate typecheck.** O v1 declara `tipo:"baseline"`, `baseline:2` e
`baseline_scope_regex`. O que o harness antigo FAZ com isso
(`executor.mjs:518-524`) não é comparar contagem: filtra as linhas `error TS`
pelo `baseline_scope_regex` e reprova se sobrar QUALQUER uma fora do escopo —
o `baseline:2` é documentação, não regra (mesmo achado que a peça G do kit
registrou no Comarka). O kit **não lê `baseline_scope_regex`**, então a
semântica foi reproduzida por `contagem_regex` **por linha, com lookahead
negativo**, `baseline: 0`, `direcao: "max"`, `preparo: ["rm -rf .next"]`.
Provado nesta sessão, chamando o próprio `gates.ts` do kit:

```
regex: ^(?!.*(?:comercial/ajuda/conteudo\.test\.ts|produtos/entitlements\.paridade\.integration\.test\.ts)).*error TS[0-9]+
contagem (3 linhas de erro, 2 delas no escopo herdado): 1
veredito baseline 0/max: {"ok":false,"motivo":"1 erro(s) de tipo, baseline 0"}
contagem só com os 2 herdados: 0
veredito: {"ok":true}
```

⚠️ E a armadilha que ficou escrita no próprio gate: `gates.ts:243-245` reprova
quando `exit != 0` **com contagem ZERO** ("o comando falhou por outro motivo").
Hoje é inócuo (o `tsc` sai 0 e conta 0 — os dois erros de 08/08 não existem
mais). Se um dos dois arquivos do escopo voltar a errar, o `tsc` sai != 0, a
contagem continua 0 e o guard reprova TODO ticket apontando para a causa
errada. A saída, se for preciso tolerar erro herdado de novo, é medir e
declarar `baseline > 0` com o regex PADRÃO — nunca reintroduzir o escopo.

**`enforcement.testes_sql.glob` na MESMA revisão que `migrations.dir`.** Feito:
`"supabase/tests/**"`. Sem ele a regra B reprova todo `.sql` de
`supabase/tests/` por `migration_fora_do_dir` (`config-tabela.ts:113` avisa
literalmente isso) e o loop deixa de conseguir escrever teste de banco. Estado
do diretório hoje: 6 arquivos `.test.sql` (0250, 0251, 0252, 0255, 0259, 0260),
mais `README.md` e `s3a_metricas_harness.sql` — este último NÃO termina em
`.test.sql` e seria reprovado pela condição 1 se entrasse num diff. Correto:
ele é harness, não teste.

**`proibicoes_absolutas` como objeto.** As **8 frases estão inteiras**, na
mesma ordem, byte a byte, em `.regras`. `.tools` recebeu o piso da decisão 17
na íntegra — 12 entradas, incluindo `Bash(rm:*)`, `Bash(git push:*)`,
`Bash(pnpm install:*)` e `Bash(npm install:*)`. A migração do kit nunca escreve
dentro do array antigo, e aqui não escreveu: o array virou `.regras` e nada
foi reescrito.

**Gates chamam binário local.** Os três: `node_modules/.bin/tsc`,
`node_modules/.bin/vitest`, `node_modules/.bin/next`. Nenhum `pnpm run`. Isso é
invariante do repo e não estilo — a worktree tem `node_modules` symlinkado para
o store do checkout principal (`executor.mjs:479-487`) e o pnpm 11.x faz
deps-check pré-run que tenta reinstalar/purgar ali.

**`canal_notificacao: "arquivo"`** e **`launchd.label` vindo do config**
(`com.actus.orquestrador`, levantado de `instalar-launchd.sh:17`, onde hoje ele
é uma string HARDCODED — exatamente o que causou o incidente de 08/09 no kit).

**Orçamento provisório**, com `_orcamento_provisorio` **datado 10/09/2026 e
remedição marcada para 24/09/2026**: `usd_ticket 5`, `usd_dia 25`,
`tokens_dia 2.500.000`. `campos_usage` copiado do CI — é o único bloco copiado
de lá, e por um motivo que não é conveniência: são os nomes dos campos NO
ENVELOPE do `claude -p --output-format json`, que são do CLI e não do repo.

**Regra E (`prefixos_sem_ddl`) e regra F (`padroes_proibidos_no_diff`)**,
preenchidas a partir do que o enforcement do harness antigo FAZ hoje:

| Regra | O que o Actus faz hoje | Valor | Chave no schema 2 |
|---|---|---|---|
| E | `enforcement.mjs:270-275`: para cada prefixo monta `/\b(create\|alter\|drop)\b[\s\S]{0,60}?\b<pref>\w+/i` e aplica ao BLOB de todas as linhas `+` do diff | `["vw_"]` (`000-config.json:40`) | `zona_proibida.prefixos_sem_ddl` |
| F | `enforcement.mjs:277-287`: compila cada `regex` com flags inline via `compilarRegex` (`:178`) e testa contra o mesmo blob | as 3 regexes de `000-config.json:43-59`, byte a byte | `enforcement.padroes_proibidos_no_diff` |

O porte do kit (`enforcement-core.ts:577-592` e `:611-639`) é o MESMO regex e a
MESMA janela de 60 caracteres. Só uma diferença de efeito, e ela é ganho: o kit
aplica **por arquivo** e nomeia o arquivo na violação, enquanto o antigo aplica
ao diff inteiro concatenado — por arquivo, um `;` do arquivo A deixa de fechar
a cláusula que a regex lia no arquivo B.

### Saída CRUA do validador do kit (`config-cli.ts`)

```
$ cd ~/Projetos/orquestrador-kit && npx tsx scripts/orquestrador/config-cli.ts \
    ~/Projetos/actus-saas/docs/fila/000-config.revisado.json
CONFIG   /Users/lucasantos/Projetos/actus-saas/docs/fila/000-config.revisado.json
0 violações — o config está preenchido e as chaves que o motor lê estão lá.
rc=0
```

### Diff CRU de `docs/fila/000-config.revisado.json` (arquivo novo, não versionado)

```diff
diff --git a/docs/fila/000-config.revisado.json b/docs/fila/000-config.revisado.json
new file mode 100644
index 0000000..58f91bf
--- /dev/null
+++ b/docs/fila/000-config.revisado.json
@@ -0,0 +1,408 @@
+{
+  "$schema_versao": 2,
+  "descricao": "Config do Orquestrador Autônomo — Actus SaaS, schema 2 do orquestrador-kit. REVISÃO HUMANA em 10/09/2026 (sessão FASE-A). Este arquivo NÃO é lido por ninguém: é a proposta que o Lucas copia por cima de docs/fila/000-config.json quando decidir adotar o motor do kit. O nome 000-config.revisado.json é a convenção do kit para revisão humana (CONTRATO.md §8) — 000-config.proposto.json é nome RESERVADO do instalador e não pode ser usado para isto.",
+
+  "_procedencia": "Todo valor abaixo saiu do disco do actus-saas em 10/09/2026, com arquivo:linha no campo _evidencia vizinho. Nada foi copiado do conteudos-infinitos por conveniência; as três exceções são declaradas e justificadas: (a) orcamento.campos_usage, que é o nome do campo NO ENVELOPE do claude e não do repo; (b) os valores de procedência 'politica' da tabela de migração do kit (scripts/orquestrador/config-tabela.ts), que são do MOTOR e não do repo; (c) os tetos de orçamento, que são PROVISÓRIOS e estão marcados como tal.",
+
+  "_INCOMPATIVEL_COM_O_HARNESS_ANTIGO": "⚠️ LEIA ANTES DE COPIAR ESTE ARQUIVO POR CIMA DO 000-config.json. Este config QUEBRA o harness antigo, e quebra alto: proibicoes_absolutas deixou de ser ARRAY e virou OBJETO, e scripts/orquestrador/executor.mjs:35 faz `[...(config.proibicoes_absolutas || [])]` — spread de objeto não-iterável é TypeError, em TODO ticket, na montagem do prompt. Ou seja: a troca do config e a instalação do motor do kit são UM passo só, na mesma janela, com o loop pausado. Copiar este arquivo com o harness .mjs ainda no comando é derrubar a drenagem inteira. As outras chaves v1 foram todas PRESERVADAS justamente para que nada mais quebre (migrations_faixa_loop, zona_proibida.no_write_columns, no_write_prefixes e padroes_proibidos_no_diff continuam onde o enforcement.mjs os procura) — proibicoes_absolutas é a única exceção, e é inevitável: o schema 2 exige o objeto para que o piso de tools exista.",
+
+  "_o_que_muda_de_comportamento": "Três mudanças reais em relação ao 000-config.json vivo, e nenhuma é cosmética. 1) migrations.dir + migrations.faixa LIGAM a regra B do enforcement do kit sobre .sql — hoje a mesma regra existe no enforcement.mjs, então é paridade, não regra nova; mas ela passa a cobrar também supabase/tests/*.sql, e por isso enforcement.testes_sql.glob entra NA MESMA revisão (sem ele o loop deixa de conseguir escrever teste de banco: migration_fora_do_dir). 2) zona_proibida.prefixos_sem_ddl LIGA a regra E no motor do kit com o mesmo valor de hoje (vw_). 3) proibicoes_absolutas deixa de ser array de prosa e vira objeto com regras + tools — o piso de --disallowedTools passa a existir, e antes não existia (o executor.mjs só passava --allowedTools).",
+
+  "branch_alvo": "staging-auto",
+  "_branch_alvo_evidencia": "docs/fila/000-config.json:5 (valor v1, inalterado) e scripts/orquestrador/executor.mjs:463-468, que cria a worktree a partir dela. ATENÇÃO OPERACIONAL medida em 10/09/2026: staging-auto está 14 commits à frente e 63 ATRÁS de main. O loop nasce de uma base velha; isso não é config, é decisão de branch — ver o relatório da sessão.",
+
+  "branch_protegida": "main",
+  "_branch_protegida_evidencia": "scripts/orquestrador/local-loop.mjs:100 — validarBranchPush recusa push em main e master, e é a única proibição de branch escrita em código no harness antigo. O kit lê ESTE nome (local-loop.sh:28, executor.sh:130); o v1 não tinha a chave.",
+
+  "max_retries": 2,
+  "_max_retries_evidencia": "docs/fila/000-config.json:6 (valor v1, inalterado).",
+
+  "cooldown_minutes": 60,
+  "_cooldown": "Adiamento por limite (rate limit/quota/timeout) grava runs/.cooldown-until = agora + cooldown_minutes. O loop encerra cedo enquanto valer. NÃO conta como retry; status volta a pendente. Valor v1 de docs/fila/000-config.json:7, inalterado.",
+
+  "politica_adiamento": {
+    "regra": "Falha de INFRAESTRUTURA adia. Nunca reprova.",
+    "causas_que_adiam": [
+      "erro de conexão",
+      "sessão expirada",
+      "rate limit",
+      "quota estourada",
+      "timeout de claude_timeout_secs",
+      "gate interrompido no meio",
+      "veredito do juiz ilegível"
+    ],
+    "_procedencia": "CHAVE NOVA do schema 2, procedência 'politica' (orquestrador-kit/scripts/orquestrador/config-tabela.ts:194-207). As SETE causas são cobradas por teste do MOTOR (test-lib-config.sh:50,58,61) — não são preferência do repo. O harness antigo do Actus tinha a mesma ideia em código, não em config: scripts/orquestrador/executor.mjs:204 (detectarAdiamento) e :220 ('usage limit'). Sem esta chave nada é adiável e falha de infra vira reprovação, que consome retry.",
+    "efeito": {
+      "status": "pendente",
+      "conta_como_retry": false,
+      "cooldown": "grava runs/.cooldown-until = agora + cooldown_minutes"
+    }
+  },
+
+  "politica_retry": {
+    "descricao": "A causa da reprovação decide o que muda no retry. Tamanho, fronteira e qualidade são problemas diferentes e não compartilham remédio.",
+    "_procedencia": "CHAVE NOVA do schema 2, procedência 'politica' (config-tabela.ts:209-227). decisao.ts:277 REJEITA a config que mandar o contrário — escalar modelo por falha de TAMANHO ou de FRONTEIRA é gasto sem hipótese.",
+    "por_causa": {
+      "diff_cap": {
+        "modelo": "MANTER",
+        "acao": "estreitar o escopo no prompt de retry (fatiar o ticket, reduzir pathspec_allowlist)"
+      },
+      "enforcement": {
+        "modelo": "MANTER",
+        "acao": "estreitar o escopo no prompt de retry (respeitar a pathspec_allowlist, sair da zona proibida)"
+      },
+      "criterio_qualidade": {
+        "modelo": "ESCALAR",
+        "acao": "subir para retry_final_model e repetir com o mesmo escopo"
+      }
+    }
+  },
+
+  "migrations_dir": "supabase/migrations",
+  "_migrations_dir_evidencia": "docs/fila/000-config.json:10 (valor v1, inalterado). No motor do kit esta chave de TOPO classifica .sql como artefato inerte (enforcement-core.ts:207-236); ela NÃO liga a regra B — quem liga é o bloco migrations abaixo.",
+
+  "migrations_faixa_loop": "0250-0299",
+  "_migrations_faixa_loop": "CHAVE V1 PRESERVADA de propósito (regra 1 da tabela do kit: renomear é COPIAR, o nome antigo fica). O motor do kit NÃO a lê — ele lê migrations.faixa, abaixo, com o mesmo valor. Ela fica porque quem edita este arquivo à mão procura por este nome. Valor original em docs/fila/000-config.json:11.",
+
+  "migrations": {
+    "dir": "supabase/migrations",
+    "faixa": "0250-0299",
+    "faixas_reservadas": ["0200-0249"],
+    "_procedencia": "RENOMES da tabela do kit: migrations_faixa_loop → migrations.faixa (config-tabela.ts:95-100) e migrations_dir → migrations.dir, este ÚLTIMO só porque a faixa existe (so_quando, config-tabela.ts:107-114). Os dois juntos LIGAM a regra B (enforcement-core.ts:392-438), que é a mesma regra que scripts/orquestrador/enforcement.mjs:215-242 já aplica hoje — paridade, não regra nova.",
+    "_faixas_reservadas_evidencia": "CLAUDE.md, seção ALOCAÇÃO DE FAIXAS: '0200–0249 · AGÊNCIA (E4) — RESERVADA'. Zero arquivos no disco nessa faixa (ls supabase/migrations, 10/09/2026: a sequência salta de 0187 para 0250). O harness antigo NÃO tem este conceito: enforcement.mjs só conhece a faixa do loop, então uma migration 0210 seria acusada como 'fora da faixa'. Com faixas_reservadas ela é acusada como 'faixa RESERVADA', que é o dado acionável.",
+    "_estado_da_faixa_em_10_09_2026": "0250 a 0263 ocupados. Próximo livre do loop: 0264. O 0264 e o 0265 foram ESCRITOS pelos tickets 430 e 442 dentro de worktree e NUNCA mergeados (os dois estão bloqueados) — conferir antes de numerar."
+  },
+
+  "sql_pendente_dir": null,
+  "_sql_pendente_dir": "DECISÃO ABERTA, deixada NULA de propósito. O Actus não tem docs/sql-pendente (verificado em 10/09/2026: o diretório não existe) e o motor trata ausência como 'segundo diretório de artefato .sql inexistente' (enforcement-core.ts:216-218). O que o Actus TEM no lugar é outra coisa: docs/fila/ultima-migration-aplicada.txt (conteúdo: 0257) + scripts/orquestrador/sql-pendentes.mjs, que empacota as migrations com número maior que o marcador. Não é o mesmo conceito e não deve ser mapeado para cá sem decisão. ⚠️ CONSEQUÊNCIA MEDIDA de deixar null (11/09/2026): executor.sh:368 interpola $(cfg '.sql_pendente_dir') no prompt do executor, e `jq -r` devolve a STRING 'null' tanto para chave nula quanto para chave ausente — a linha do prompt vira \"SQL só como ARQUIVO .sql, e só sob supabase/migrations ou null\". Não quebra nada (o enforcement filtra o falsy em enforcement-core.ts:217), mas é uma linha de prompt que diz bobagem, e as duas saídas honestas são declarar um diretório de verdade ou aceitar isso por escrito. Ver o relatório da sessão, seção Decisões abertas.",
+
+  "worktrees_dir": "../_worktrees",
+  "_worktrees_dir_evidencia": "docs/fila/000-config.json:13 (valor v1, inalterado). Diretório COMPARTILHADO: 40 worktrees em 10/09/2026, de pelo menos quatro repos.",
+
+  "worktrees_prefixo": "orq-",
+  "_worktrees_prefixo_evidencia": "scripts/orquestrador/executor.mjs:468 — o worktree nasce como join(wtBase, `orq-${ticket.id}`). Valor de FATO no disco: orq-430, orq-440, orq-441, orq-442 em ~/Projetos/_worktrees. ⚠️ COLISÃO POTENCIAL: o mesmo diretório tem orq-037-recovery e orq-runner, que NÃO são do Actus. Manter orq- preserva o comportamento de hoje byte a byte; trocar por actus- é a decisão que a chave existe para permitir, e órfã os quatro diretórios acima. Ver Decisões abertas.",
+
+  "runs_dir": "docs/fila/runs",
+  "_runs_dir_evidencia": "docs/fila/000-config.json:14 (valor v1, inalterado). git check-ignore confirma que docs/fila/runs/ é ignorado (.gitignore:46).",
+
+  "liberacoes_file": "docs/fila/liberacoes.json",
+  "_liberacoes_file_evidencia": "docs/fila/000-config.json:15 (valor v1, inalterado). ⚠️ O ARQUIVO está na forma v1 'tokens[] de strings SEM prefixo' (5 tokens, docs/fila/liberacoes.json:2-8) — a forma que o kit resolve mas AVISA a cada uso (CONTRATO.md §6.1). Migrar é passo do instalador (--atualizar --migrar), não deste arquivo.",
+
+  "pausar_file": "docs/fila/PAUSAR",
+  "_pausar_file": "CHAVE NOVA, procedência 'politica' (config-tabela.ts:161-166). É o kill switch em arquivo (CONTRATO.md §7). ⚠️ O harness antigo do Actus NÃO TEM kill switch nenhum — nenhum arquivo de scripts/orquestrador/ lê PAUSAR nem .orq-pause (grep em 10/09/2026: zero ocorrências); a única forma de parar o loop era launchctl bootout. Esta chave é a maior mudança operacional da adoção. ⚠️ docs/fila/PAUSAR NÃO está no .gitignore hoje (git check-ignore: só docs/fila/runs/) — o instalador RELATA isso e não edita o arquivo.",
+
+  "decisoes_file": "docs/fila/decisoes-pendentes.md",
+  "_decisoes_file": "CHAVE NOVA, procedência 'politica' (config-tabela.ts:167-172; lida em lib.sh:723). O arquivo ainda não existe no Actus — o instalador --novo o cria a partir do template, mas em repo existente ele é criado no primeiro DECISAO_PENDENTE.",
+
+  "_modelos": "executor_model implementa (barato/rápido); avaliador_model julga o diff (forte); retry_final_model roda a ÚLTIMA tentativa com modelo forte antes de bloquear. Os três nomes v1 CONTINUAM sendo lidos pelo motor do kit (executor.sh:151 varre os três procurando papel PENDENTE_*; decisao.ts:14-16 os exige no tipo), por isso ficam.",
+  "executor_model": "sonnet",
+  "avaliador_model": "opus",
+  "retry_final_model": "opus",
+  "_modelos_evidencia": "docs/fila/000-config.json:18-20 (valores v1, inalterados).",
+
+  "modelos": {
+    "juiz_alto": "opus",
+    "juiz_baixo": "opus"
+  },
+  "_modelos_juiz": "RENOME da tabela do kit: avaliador_model → modelos.juiz_alto E modelos.juiz_baixo (config-tabela.ts:77-88). Os DOIS recebem opus de propósito — é o que preserva o comportamento EXATO de hoje, em que existe um juiz só (scripts/orquestrador/avaliador.mjs:70 chama claude -p --model config.avaliador_model, sem nível de risco). Baratear o juiz de risco baixo é decisão de CUSTO e não pode ser efeito colateral da migração. Consequência: enquanto os dois forem iguais, juiz.diff_max_baixo e juiz.paths_alto_risco não mudam gasto nenhum — só rotulam.",
+
+  "_economia": "diff_cap_linhas: acima disso reprova mecanicamente ('fatiar o ticket') sem chamar o juiz. claude_timeout_secs: corte de cada claude -p; estouro = adiado, não reprova. preflight_env_keys: envs obrigatórias antes de qualquer chamada de modelo.",
+  "diff_cap_linhas": 2500,
+  "_diff_cap_linhas_evidencia": "docs/fila/000-config.json:23 (valor v1, inalterado). MEDIÇÃO de 10/09/2026 sobre as 121 tentativas com evidência em docs/fila/runs/: mediana 231 linhas, p90 533, máximo 1323. Nas 54 tentativas APROVADAS: mediana 346, p90 556, máximo 1323. O cap de 2500 nunca disparou — é teto folgado, e baixá-lo é decisão de produto, não de migração.",
+
+  "claude_timeout_secs": 1800,
+  "_claude_timeout_secs_evidencia": "docs/fila/000-config.json:24 (valor v1, inalterado); scripts/orquestrador/executor.mjs:501 o usa como timeout do spawn.",
+
+  "claude_max_turns": 80,
+  "_claude_max_turns": "CHAVE NOVA, procedência 'politica' (config-tabela.ts:281-287; lida em executor.sh:784). O harness antigo NÃO passa --max-turns: executor.mjs:500 monta apenas -p, --model e --allowedTools. 80 é teto de segurança contra sessão que não termina, não alavanca de qualidade.",
+
+  "preflight_probe": true,
+  "_preflight_probe": "Sondagem de modelo no preflight, ANTES de criar worktree e de consumir tentativa (executor.sh:146). O harness antigo não sonda modelo, mas TEM a checagem irmã: pre-voo.mjs:130 (cat.3, autenticação do claude). Ligada porque o modo de falha que ela pega é real: o claude NÃO sai com erro em modelo desconhecido — responde texto e o run acaba com diff vazio, que o harness lê como reprovação de mérito.",
+
+  "preflight_env_keys": ["SUPABASE_URL", "SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY"],
+  "_preflight_env_keys_evidencia": "docs/fila/000-config.json:25 (valor v1, inalterado). As três existem no .env.local do checkout (conferido por nome de chave em 10/09/2026, sem ler valor).",
+
+  "restricao_execucao": {
+    "ativa": false,
+    "motivo": "Inativa: os três papéis têm modelo definido (sonnet/opus/opus), nenhum é PENDENTE_*.",
+    "modo": "allowlist_estrita",
+    "tickets_permitidos": [],
+    "acao_ticket_fora_da_allowlist": "recusar",
+    "recusa_exit_code": 78,
+    "recusa_mensagem": "RECUSADO: há modelo por papel em PENDENTE_* e a restrição de execução está ativa. Preencha executor_model/avaliador_model/retry_final_model — não escolha um modelo padrão, não siga em frente.",
+    "desbloqueio": "N/A — já desbloqueado. Os três papéis têm modelo definido e ativa=false.",
+    "_porque_a_chave_existe_apesar_de_inativa": "⚠️ ACHADO DESTA SESSÃO, e é por isso que ela NÃO pode ser omitida: config-chaves.ts:73 marca restricao_execucao como obrigatoria:false ('inativa quando ausente'), mas decisao.ts:70-71 faz `const r = config.restricao_execucao` e lê `r.ativa` SEM GUARDA, e executor.sh:1002 chama `decisao restricao` para TODO ticket. Ausente, isso é TypeError em todo ticket, não 'inativa'. A anotação do config do conteudos-infinitos (linha 56) registra o mesmo achado de forma independente. Divergência entre config-chaves.ts e o código do motor — reportada no relatório da sessão."
+  },
+
+  "_identidade": "Antes de qualquer gasto: origin do checkout DEVE conter repo_origin_deve_conter; ref do banco extraída de SUPABASE_URL no .env.local DEVE bater com ambiente_id. Divergência = aborta o run inteiro, zero tentativa. fqwhpcusmkmvtgyofuwh = Actus (produção do produto); ogfnojbbvumujzfklkhh = dashboard legado (PROIBIDO, ver CLAUDE.md).",
+  "repo_origin_deve_conter": "actus-saas",
+  "ambiente_id": "fqwhpcusmkmvtgyofuwh",
+  "_identidade_evidencia": "docs/fila/000-config.json:28-29 (valores v1, inalterados). O harness antigo os confere em executor.mjs:445-458 (preflightIdentidade) e pre-voo.mjs:58 (cat.1); o kit, em lib.sh:67-68 e executor.sh:104-114.",
+
+  "zona_proibida": {
+    "descricao": "Tudo que o loop NUNCA escreve nem gera DDL. Revisada por humano (Lucas). Na dúvida, proíba — liberar depois é barato, vazar não. É fronteira de BANCO: o Actus nunca teve fronteira de CAMINHO aqui (ver _no_write_paths abaixo).",
+
+    "no_write_tables": ["public.leads", "public.contratos", "public.clientes_receita"],
+    "_no_write_tables": "Valor v1 inalterado (docs/fila/000-config.json:34). Tabelas de negócio CONGELADAS desde a reancoragem/backfill de 29/07. No motor do kit isto é a regra C nomeada (enforcement-core.ts:515-540); no harness antigo, enforcement.mjs:244-257. Mesma lista, mesmo efeito. Note que o kit também aceita a string 'TODAS' (negação total, o modo do conteudos-infinitos) — o Actus usa LISTA, e continua usando.",
+
+    "no_write_columns": ["etapa_canonica"],
+    "_no_write_columns": "CHAVE V1 PRESERVADA (regra 1 da tabela: renomear é copiar). O motor do kit lê colunas_congeladas, abaixo, com o mesmo valor. Valor original em docs/fila/000-config.json:37.",
+
+    "colunas_congeladas": ["etapa_canonica"],
+    "_colunas_congeladas": "RENOME de zona_proibida.no_write_columns (config-tabela.ts:101-106; lida em enforcement-core.ts:549-563). MESMO valor, MESMO efeito de hoje. ⚠️ No kit estes itens são GLOBS, não nomes literais — 'etapa_canonica' é o glob que casa só a si mesmo, então o comportamento não muda. ⚠️ ACHADO OPERACIONAL (ticket 442, docs/fila/runs/442/attempt-3/diff.patch): comercial.funnel_stages tem etapa_canonica NOT NULL sem default, logo TODO INSERT naquela tabela escreve a coluna congelada e é reprovado pela regra D. Isso não é defeito da regra — é o motivo real do bloqueio do 442, e a decisão é do Lucas (ver Peça 4 do relatório).",
+
+    "no_write_prefixes": ["vw_"],
+    "_no_write_prefixes": "CHAVE V1 PRESERVADA. Valor original em docs/fila/000-config.json:40. O motor do kit lê prefixos_sem_ddl, abaixo.",
+
+    "prefixos_sem_ddl": ["vw_"],
+    "_prefixos_sem_ddl": "REGRA E. RENOME de zona_proibida.no_write_prefixes (config-tabela.ts:116-121; lida em enforcement-core.ts:577-592). O que a regra faz HOJE no Actus, medido em scripts/orquestrador/enforcement.mjs:270-275: para cada prefixo, monta /\\b(create|alter|drop)\\b[\\s\\S]{0,60}?\\b<prefixo>\\w+/i e aplica ao BLOB de todas as linhas adicionadas do diff; qualquer match vira a violação 'no_write_prefix'. O porte do kit é byte a byte o mesmo regex e a MESMA janela de 60 caracteres — a única diferença é que o kit aplica por ARQUIVO (e nomeia o arquivo na violação) em vez de no diff inteiro misturado. Escrever DADO num objeto vw_ continua sendo assunto das regras C e D; esta é só DDL. Motivo do repo (docs/fila/000-config.json:41): vw_ são views de leitura, propriedade de decisão humana (shadow para headline).",
+
+    "readonly_ok": [
+      "comercial.contacts",
+      "comercial.conversations",
+      "comercial.messages",
+      "comercial.analyses",
+      "comercial.suggestions",
+      "comercial.briefing",
+      "public.tenants",
+      "public.tenant_users",
+      "public.tenant_features",
+      "public.tenant_configs",
+      "public.tenant_connectors"
+    ],
+    "_readonly_ok": "Valor v1 inalterado (docs/fila/000-config.json:62-74). Lista INFORMATIVA: nenhum motor a lê, nem o antigo nem o do kit. Fica como documentação para o juiz e para quem escreve ticket.",
+
+    "excecoes_os_owned": [],
+
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
+    ],
+    "_padroes_proibidos_no_diff_v1": "CHAVE V1 PRESERVADA, byte a byte de docs/fila/000-config.json:43-59, pela regra 1 da tabela do kit: renomear é COPIAR, o nome antigo FICA (config-tabela.ts:32-36). O motor do kit NÃO lê daqui — ele lê enforcement.padroes_proibidos_no_diff, que tem as MESMAS três regexes. É a mesma decisão já tomada para no_write_columns e no_write_prefixes acima, e existe pelo mesmo motivo: quem edita este arquivo à mão procura a proibição dentro de zona_proibida, e o harness antigo (scripts/orquestrador/enforcement.mjs:278) só enxerga este caminho. ⚠️ PREÇO DA DUPLICAÇÃO, dito por escrito: são DUAS cópias da mesma regex e elas podem divergir. Quem mexer numa tem de mexer na outra, até o dia em que o harness antigo for aposentado e a cópia v1 sair por edição explícita.",
+
+    "_no_write_paths": "AUSENTE de propósito, e é DECISÃO ABERTA. A zona_proibida do Actus sempre foi só de banco — não existe fronteira de CAMINHO aqui, e o motor do kit trata a ausência como lista vazia no ENFORCEMENT (enforcement-core.ts:646-653, achado da peça K11a-4d: o spread de undefined derrubava o enforce inteiro, e o config do Actus foi o caso que expôs isso). Hoje a única fronteira de caminho é a pathspec_allowlist do próprio ticket, que é dado escrito por humano — um ticket cuja allowlist inclua docs/fila/** ou scripts/orquestrador/** deixa o agente reescrever a própria fila, o próprio config e o próprio motor, e NADA no banco de regras o impede. ⚠️ EFEITO COLATERAL MEDIDO da ausência (11/09/2026): executor.sh:373 monta a linha do prompt com $(cfg '.zona_proibida.no_write_paths | join(\", \")'), e jq sobre chave ausente/nula sai com ERRO (rc 5, 'Cannot iterate over null'). Como a substituição está dentro do heredoc do prompt, ela não derruba o run: o que sai é a linha 'Zona proibida: .' (vazia) mais um erro de jq no stderr a cada prompt montado. Omitir a chave e declará-la null dão o MESMO resultado — só um valor de verdade cala o erro. Ver Decisões abertas no relatório.",
+
+    "_no_write_paths_PROPOSTA": "NÃO é config — é o rascunho da decisão, guardado aqui para que adotá-la seja copiar e renomear a chave para no_write_paths. Cada glob foi validado com `git ls-files -- ':(glob)GLOB'` em 11/09/2026 e o número é quantos arquivos VERSIONADOS ele casa hoje: .env* (1), **/.env* (1), .github/workflows/** (1), docs/orquestrador/** (8), scripts/orquestrador/** (24), docs/fila/** (197), CLAUDE.md (1). Os três de credencial do template (**/*.pem, **/*.key, **/service-account*.json) casam ZERO hoje e por isso entrariam em no_write_credenciais.padroes, que é regra de FORMA e não de existência. O item que mais custa decidir é docs/fila/**: ele fecha a fila contra o agente (que nunca deveria escrever ticket nem config), e não atrapalha o motor, porque quem escreve status de ticket é o harness no checkout PRINCIPAL, não o diff da worktree. O preço é que nenhum ticket poderá jamais editar um .md da fila pela mão do agente.",
+    "_no_write_paths_PROPOSTA_valor": [".env*", "**/.env*", ".github/workflows/**", "docs/orquestrador/**", "scripts/orquestrador/**", "docs/fila/**", "CLAUDE.md"],
+
+    "_colunas_sombra": "AUSENTE de propósito. O kit aceita colunas_sombra como globs que VENCEM as congeladas (enforcement-core.ts:549-563), e a saída declarada da família etapa_* no Actus é etapa_v2_* (CLAUDE.md, migration 0171). Não entra porque não faz falta: 'etapa_canonica' é glob literal e etapa_v2_* já não casa com ele. Declarar sombra sem congelar a família seria config decorativo."
+  },
+
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
+    ],
+    "_padroes_proibidos_no_diff": "REGRA F. As três regexes são CÓPIA BYTE A BYTE de docs/fila/000-config.json:43-59 — inclusive o (?:(?!\\bwhere\\b)[^;])* que o ticket 615 mediu. Reescrever regex numa migração é reescrever a proibição. O que muda de PAI: no v1 elas moram em zona_proibida; no kit moram aqui, porque zona_proibida é fronteira de ESCRITA (que tabela, que coluna, que prefixo) e F julga o TEXTO do diff (config-tabela.ts:122-128). A cópia v1 fica intocada em zona_proibida.padroes_proibidos_no_diff, ACIMA, pela regra 1 da tabela (conferido em 11/09/2026: as duas cópias e o v1 são o MESMO objeto, campo a campo). O que muda de EFEITO: o kit aplica por ARQUIVO (enforcement-core.ts:611-639) e o harness antigo aplica ao diff inteiro concatenado (enforcement.mjs:277-287) — por arquivo é mais preciso, porque um ';' do arquivo A deixa de fechar a cláusula que a regex lia no arquivo B.",
+
+    "testes_sql": {
+      "glob": "supabase/tests/**"
+    },
+    "_testes_sql": "OBRIGATÓRIO NESTA MESMA REVISÃO, junto com migrations.dir — sem ele a regra B reprova todo .sql de supabase/tests/ por 'migration_fora_do_dir' e o loop deixa de conseguir escrever teste de banco (config-tabela.ts:113, aviso literal). O glob descreve quem ENTRA na exceção, não quem passa: o sufixo .test.sql é a CONDIÇÃO 1, checada pela regra (enforcement-core.ts:358-389). É o mesmo recorte do harness antigo, que usa config.tests_dir com default 'supabase/tests' (enforcement.mjs:217,221). Estado do diretório em 10/09/2026: 6 arquivos .test.sql (0250, 0251, 0252, 0255, 0259, 0260), mais README.md e s3a_metricas_harness.sql — este último NÃO termina em .test.sql e, se algum dia entrar num diff, será reprovado pela condição 1. Correto: ele não é teste, é harness."
+  },
+
+  "politica_schema": {
+    "regra": "Ticket que precise de mudança de schema PRODUZ o arquivo .sql e PARA. Nunca aplica.",
+    "comportamento_vigente": "produzir_e_parar",
+    "aplicacao": "sempre humana, via MCP do Supabase, pelo Lucas (CLAUDE.md, FLUXO DE MIGRATION: db push CONGELADO; só o Lucas aplica).",
+    "_lido_pelo_motor": "NÃO é lido em runtime hoje: politica_schema aparece na interface EnforceConfig (enforcement-core.ts:82) e em nenhum outro lugar do motor — a classificação de arquivo é deliberadamente independente dela (enforcement-core.ts:250-254). Entra aqui como documento da política, com esta ressalva escrita, não como interruptor."
+  },
+
+  "_execucao_dos_gates": {
+    "ordem_obrigatoria": ["typecheck", "testes", "build"],
+    "interrupcao": "NAO_VALE_PARCIALMENTE",
+    "_ordem": "DERIVADA do próprio gates[], na ordem do arquivo (procedência 'derivada', config-tabela.ts:290-296). gates.ts:91-101 ERRA se a ordem divergir da lista — derivar é a única forma de nascer certa. A ordem é a mesma que o harness antigo executa hoje (executor.mjs:332-341 itera config.gates na ordem do array).",
+    "_interrupcao": "Procedência 'politica' (config-tabela.ts:186-192). Gate interrompido no meio (exit 124/129/130/137/143) NÃO conta como parcialmente aprovado — reexecuta a sequência inteira. O harness antigo NÃO tem este conceito: executor.mjs:339 lê só `g.ok`, e um gate morto por sinal é indistinguível de um gate que reprovou."
+  },
+
+  "gates": [
+    {
+      "nome": "typecheck",
+      "cmd": "node_modules/.bin/tsc --noEmit",
+      "tipo": "baseline",
+      "baseline": 0,
+      "direcao": "max",
+      "contagem_regex": "^(?!.*(?:comercial/ajuda/conteudo\\.test\\.ts|produtos/entitlements\\.paridade\\.integration\\.test\\.ts)).*error TS[0-9]+",
+      "preparo": ["rm -rf .next"],
+      "papel": "typecheck",
+      "descricao": "GATE REAL de tipos (= o que 'pnpm typecheck' roda: tsc --noEmit). Chamado pelo binário LOCAL, nunca por 'pnpm': o loop roda gates numa worktree com node_modules symlinkado e o pnpm 11.x faz deps-check pré-run que tenta reinstalar/purgar ali (aborta sem TTY); o binário direto não. Falha se surgir 'error TS' FORA dos dois arquivos do baseline herdado.",
+      "_traducao_do_v1": "O v1 declarava tipo:'baseline', baseline:2 e baseline_scope_regex (docs/fila/000-config.json:84-86). O que o harness antigo FAZ com isso (executor.mjs:518-526) não é comparar contagem: ele filtra as linhas 'error TS' pelo baseline_scope_regex e reprova se sobrar QUALQUER UMA fora do escopo — o baseline:2 é documentação, não regra (mesmo achado que a peça G do kit registrou no comarka-operacional). O kit NÃO lê baseline_scope_regex, então a semântica é reproduzida por contagem_regex: um regex POR LINHA com lookahead negativo dos dois arquivos, baseline 0, direção max. Conferido em 10/09/2026 contra uma saída de tsc sintética com as três formas de linha: contagem 1 para o erro fora do escopo, 0 para os dois de dentro, e ZERO grupos de captura (o kit conta LINHAS quando o regex não captura — gates.ts:175-192).",
+      "_medicao_10_09_2026": "`node_modules/.bin/tsc --noEmit --incremental false` na raiz do checkout: exit 0, ZERO ocorrências de 'error TS'. Os dois erros herdados de 08/08/2026 (TS1501/TS2802, 'target' ausente no tsconfig) NÃO existem mais — os dois arquivos continuam no disco (src/lib/comercial/ajuda/conteudo.test.ts, src/lib/produtos/entitlements.paridade.integration.test.ts) e não produzem erro. O lookahead é, hoje, um no-op.",
+      "_armadilha_do_guard": "⚠️ LER ANTES DE MEXER. gates.ts:243-245 tem um guard: em direcao 'max', exit != 0 COM contagem ZERO reprova o gate com a mensagem 'o comando falhou por outro motivo'. Isso é correto para gate mudo (binário ausente, tsconfig quebrado), mas interage com o lookahead: se um dos DOIS arquivos do escopo voltar a produzir 'error TS', o tsc sai != 0, a contagem continua 0, e o guard reprova TODO ticket com uma mensagem que aponta para a causa errada. Hoje isso não acontece porque a contagem total é 0 e o exit é 0. Se a intenção for tolerar erro herdado de novo, a saída é medir e declarar baseline > 0 com o regex PADRÃO (sem lookahead), não reintroduzir o escopo.",
+      "_preparo_porque": "O `rm -rf .next` saiu de dentro do cmd (onde estava no v1) para o campo preparo: o kit roda preparo antes do cmd e IGNORA o rc dele (gates.ts:285), que é o tratamento certo para higiene — um `rm` de diretório inexistente não pode reprovar o ticket. Ele importa porque o tsconfig inclui '.next/types/**/*.ts' (tsconfig.json:22): artefato velho injeta erro-fantasma."
+    },
+    {
+      "nome": "testes",
+      "cmd": "node_modules/.bin/vitest run",
+      "tipo": "exit_code",
+      "papel": "testes",
+      "descricao": "Suite verde (= 'pnpm test' = vitest run), pelo binário LOCAL (ver typecheck para o porquê de não usar pnpm na worktree).",
+      "_v1": "Valor inalterado de docs/fila/000-config.json:91.",
+      "_cobertura_muda_com_a_adocao": "⚠️ vitest.config.ts:10 tem include ['src/**/*.test.ts', 'scripts/orquestrador/**/*.test.mjs']. Os 9 arquivos *.test.mjs de scripts/orquestrador/ testam o harness ANTIGO (enforcement.mjs, executor.mjs, local-loop.mjs, pre-voo.mjs, telemetria.mjs, sql-pendentes.mjs, fila-read.mjs, avaliador.mjs, sistema/drenagem). Como o instalador do kit é `cp` e nunca `rsync --delete` (instalar.sh:492-494), os .mjs SOBREVIVEM à instalação e esses testes continuam rodando dentro deste gate — verdes, testando um motor que ninguém mais chama. Decidir o destino deles é passo da adoção, não deste config."
+    },
+    {
+      "nome": "build",
+      "cmd": "node_modules/.bin/next build",
+      "tipo": "exit_code",
+      "papel": "build",
+      "descricao": "next build (= 'pnpm build'), pelo binário LOCAL. NÃO é o gate de tipos de verdade — o next.config não tem ignoreBuildErrors, mas o typecheck explícito (gate acima) é a fonte da verdade de tipos. Build valida bundling/rotas/RSC.",
+      "_v1": "Valor inalterado de docs/fila/000-config.json:97."
+    }
+  ],
+  "_gates_papel_declarado": "Os três declaram papel explicitamente, mesmo sendo inferível do nome (config-cli.ts:80-88 e executor.sh:476-492 inferem typecheck/testes/build desses nomes). Declarado ganha do inferido, e declarar tira a linha GATE da trilha da dependência de o nome do gate nunca mudar.",
+  "_gates_binario_local": "Os três chamam node_modules/.bin/<bin> e nenhum chama `pnpm run`. Isto é INVARIANTE do repo, não estilo: a worktree tem node_modules symlinkado para o store do checkout principal (executor.mjs:479-487) e o pnpm 11.x faz deps-check pré-run que tenta reinstalar/purgar ali — aborta sem TTY, e no pior caso mexe no store real. O harness antigo ainda escreve um .npmrc na worktree com verify-deps-before-run=false (executor.mjs:490) como segunda trava.",
+
+  "gate_ticket": {
+    "max_paths_allowlist": 8,
+    "timeout_cmd_secs": 120,
+    "cmd_prefixos_permitidos": [
+      "node_modules/.bin/vitest run",
+      "node_modules/.bin/next build",
+      "node_modules/.bin/tsc",
+      "npx vitest run",
+      "npx tsc",
+      "npm run test",
+      "npm run typecheck",
+      "npm run build",
+      "node scripts/",
+      "node -e",
+      "test -f",
+      "test -s",
+      "test -d",
+      "git diff",
+      "grep -",
+      "jq ",
+      "ls ",
+      "wc -l",
+      "sed -n",
+      "find ",
+      "awk ",
+      "true"
+    ],
+    "_cmd_prefixos_permitidos": "LEVANTADO DO DISCO, não copiado do template: os 211 cmd distintos dos criterios_aceite dos 62 tickets de docs/fila/ (varredura de 10/09/2026). Frequência do primeiro segmento: true 60, node_modules/.bin/vitest run 41, test -f 27, git diff 26, grep -q 25, grep -c 22, npm run 18, npx vitest 15, grep -qi 14, node_modules/.bin/next build 11, npx tsc 4, node -e 3, test -d 3, test -s 3, awk 3, ls 1, find 1, sed -n 1, wc -l 1. As entradas do template que o Actus NÃO usa (npx jest, npm run lint) ficaram DE FORA — prefixo a mais é superfície de execução que ninguém pediu.",
+    "_conflitos_conhecidos": "⚠️ Três formas REAIS em uso na fila colidem com proibido_no_cmd, e nenhuma delas é coberta pelos prefixos acima: (a) `rm -rf` aparece como primeiro segmento em 13 cmd (o padrão 'rm ' é proibido); (b) `f=$(git diff ...)` e `[ $(grep ...)` e `test $(grep ...)` usam '$(' em 15 cmd; (c) redirecionamentos '>' aparecem em vários. O kit tem uma ISENÇÃO só para o segmento 1 quando um prefixo casa (gate-ticket.ts:281-292), e 'test $(' resolveria o caso (c) do conteudos-infinitos — não incluí porque no Actus a forma dominante é `f=$(...)`, que nenhum prefixo alcança. Consequência prática HOJE: nenhuma, porque os 62 tickets estão todos em status terminal (57 done, 5 bloqueado) e o gate só cobra campos de `pendente`. Consequência AMANHÃ: todo ticket novo escrito nessas formas reprova em `orq validar`. Decisão do Lucas: ampliar os prefixos, ou escrever os critérios novos sem essas formas. Recomendo a segunda — ver o relatório.",
+    "proibido_no_cmd": ["$(", "`", "sh -c", "eval", "sudo", "rm ", "curl http", "curl https", "wget", "> ", ">>"],
+    "_proibido_no_cmd": "Lista do template do kit, procedência 'politica' (config-tabela.ts:249-253; lida em gate-ticket.ts:281). É o que separa critério executável de comando arbitrário. NÃO foi afrouxada para acomodar os conflitos acima: afrouxar a proibição para caber no que já existe é como se perde a proibição."
+  },
+
+  "juiz": {
+    "diff_max_baixo": 350,
+    "_diff_max_baixo": "MEDIDO em 10/09/2026 sobre docs/fila/runs/: a mediana do diff das 54 tentativas APROVADAS é 346 linhas (p90 556, máximo 1323). 350 é a mediana arredondada. ⚠️ Enquanto modelos.juiz_alto e modelos.juiz_baixo forem os dois 'opus' (acima), este número não muda gasto nenhum — ele só rotula o risco. Ele passa a valer dinheiro no dia em que o juiz_baixo baratear, e esse dia é decisão do Lucas.",
+    "paths_alto_risco": [
+      "supabase/**",
+      "src/middleware.ts",
+      "src/lib/auth/**",
+      "src/app/auth/**",
+      "src/app/login/**",
+      "src/app/definir-senha/**",
+      "src/app/recuperar-senha/**",
+      "src/app/admin/**",
+      "src/app/api/admin/**",
+      "src/lib/admin/**",
+      "src/lib/produtos/**",
+      "src/lib/connectors/**",
+      "src/app/api/webhooks/**",
+      "src/lib/vault.ts",
+      "src/lib/env.ts"
+    ],
+    "_paths_alto_risco": "Cada glob foi validado com `git ls-files -- ':(glob)GLOB'` em 10/09/2026 e casa pelo menos 1 arquivo versionado: supabase 91, src/lib/connectors 33, src/lib/auth 14, src/app/api/admin 13, src/lib/admin 11, src/app/admin 10, src/lib/produtos 9, src/app/api/webhooks 6, e 1 cada para middleware.ts, app/auth, login, definir-senha, recuperar-senha, vault.ts, env.ts. O recorte sai das premissas de segurança do CLAUDE.md (RLS/tenant, service role só server-side, credenciais no Vault, entitlement) mais o que o próprio repo trata como sensível. Globs do config do conteudos-infinitos que NÃO existem aqui foram descartados em vez de copiados: src/lib/supabase/**, src/app/(auth)/**, billing (0 arquivos cada). ⚠️ É DECISÃO ABERTA: a chave é nova no schema 2 e não tem correspondente v1 — ver o relatório.",
+    "palavras_alto_risco": ["auth", "login", "senha", "token", "pagamento", "billing", "migration", "schema", "rls", "permiss"],
+    "_palavras_alto_risco": "Procedência 'politica' (config-tabela.ts:254-260). São palavras de DOMÍNIO, não do repo: nenhum projeto quer que uma mudança em autenticação seja julgada pelo modelo barato.",
+    "max_tokens_veredicto": 300
+  },
+
+  "commit_checkpoint": {
+    "obrigatorio": true,
+    "quando": "a cada unidade lógica que passe typecheck + teste — não só no fim do ticket",
+    "_regra": "Passou typecheck e teste? Commita. Não espere o ticket fechar, não acumule várias unidades num commit final. Commit intermediário é barato; perder trabalho verificado não é.",
+    "_procedencia": "Texto de prompt (executor.sh:383-384), não regra de máquina. O harness antigo commita uma vez por tentativa (executor.mjs:504-508, `orq(<id>): tentativa N`), então isto é comportamento NOVO no prompt do executor."
+  },
+
+  "executor": {
+    "trailer_commit": "Orq-Ticket",
+    "_trailer_commit": "CHAVE NOVA, procedência 'politica' (config-tabela.ts:179-185; lida em executor.sh:388 e local-loop.sh:95). Todo merge commit do loop na branch_alvo passa a carregar 'Orq-Ticket: <id>'. ⚠️ Os merges já feitos NÃO têm trailer — conferido em `git log staging-auto`: as mensagens são 'Merge branch frente/447 into staging-auto', sem trailer. Consequência: `orq ticket <id>` não acha commit para nenhum dos 57 tickets já fechados. É perda aceita, não bug."
+  },
+
+  "canal_notificacao": "arquivo",
+  "_canal_notificacao": "DECISÃO REGISTRADA: arquivo, e só arquivo. lib.sh:820 trata qualquer valor diferente de 'notificacao_nativa' como arquivo, e escreve em runs/notificacoes.log. O harness antigo do Actus não notifica nada (não há osascript, webhook nem e-mail em scripts/orquestrador/) — o mais próximo é o relatório local em runs/relatorio-ultimo.md (local-loop.mjs:349-355). 'arquivo' é o valor que preserva isso e não acrescenta canal novo para falhar em silêncio.",
+
+  "orcamento": {
+    "usd_dia": 25,
+    "tokens_dia": 2500000,
+    "usd_ticket": 5,
+    "custo_file": "docs/fila/runs/custo.json",
+    "campos_usage": {
+      "custo_usd": "total_cost_usd",
+      "tokens_in": "usage.input_tokens",
+      "tokens_out": "usage.output_tokens",
+      "tokens_cache": "usage.cache_read_input_tokens"
+    },
+    "_orcamento_provisorio": "PROVISÓRIO, datado 10/09/2026. REMEDIR EM 24/09/2026 (duas semanas). Os três tetos NÃO foram medidos: o harness antigo do Actus não tem ledger de custo — não existe custo.json, nenhum script lê usage do envelope do claude, e `grep -n 'custo|orcamento|usage'` em scripts/orquestrador/*.mjs devolve zero ocorrência de contabilidade (só a string 'usage limit' em executor.mjs:220, que é detecção de rate limit). Portanto não há histórico deste repo para calibrar. Os números são um PISO conservador escolhido para disparar cedo e ser corrigido com dado: o conteudos-infinitos opera com 50/5000000/10 e o Actus tem diff_cap 4x maior mas fila menor. Regra de remedição: rodar duas semanas, ler `orq custo`, e fixar com 30% de folga sobre a mediana. Um teto chutado que nunca dispara não é teto — a data acima existe para que este comentário não vire permanente.",
+    "_campos_usage": "ÚNICO bloco copiado do conteudos-infinitos, e por um motivo que não é conveniência: estes são os nomes dos campos NO ENVELOPE de `claude -p --output-format json`, que são do CLI e não do repo — o mesmo binário na mesma máquina devolve o mesmo envelope para os dois repos. Eles foram confirmados por sondagem real lá (conteudos-infinitos/docs/fila/000-config.json:435). ⚠️ Mudam de versão para versão do Claude Code: chutar aqui faz o ledger somar zero para sempre, em silêncio, e o gate de orçamento nunca disparar. CONFERIR na primeira drenagem: se runs/custo.json vier com custo_usd 0 em toda linha, é ISTO que está errado, não o gasto."
+  },
+
+  "proibicoes_absolutas": {
+    "regras": [
+      "nunca push na branch principal",
+      "nunca aplicar DDL (só escrever arquivo de migration na faixa 0250-0299)",
+      "nunca escrever na zona proibida",
+      "nunca tocar credenciais/segredos",
+      "nunca gastar dinheiro",
+      "git add sempre por pathspec explícito",
+      "nunca tocar branches de feature vivas (o loop nasce de staging-auto e mergeia nela)",
+      "toda RPC nova no diff deve receber p_tenant_id obrigatório — critério de juiz herdado por todo ticket"
+    ],
+    "_regras": "As OITO frases de docs/fila/000-config.json:104-111, na mesma ordem, byte a byte. Nenhuma foi perdida, reescrita nem fundida — a migração move o array para .regras e não escreve dentro dele (config-tabela.ts:279). A oitava é CRITÉRIO DE JUIZ, não regra de tool: ela já vive no prompt do juiz do harness antigo (avaliador.mjs:35, 'REPROVE se qualquer RPC/função SQL NOVA no diff não receber p_tenant_id obrigatório') e continua sendo cobrada por leitura do diff, não por bloqueio de ferramenta.",
+    "tools": [
+      "Bash(git push:*)",
+      "Bash(git reset:*)",
+      "Bash(psql:*)",
+      "Bash(supabase:*)",
+      "Bash(npx supabase:*)",
+      "Bash(curl:*)",
+      "Bash(rm:*)",
+      "WebFetch",
+      "WebSearch",
+      "Bash(pnpm install:*)",
+      "Bash(npm install:*)",
+      "Bash(npm ci:*)"
+    ],
+    "_tools": "O PISO de --disallowedTools (peça T17 do kit; executor.sh:tools_proibidas e perfil.ts:190). É o piso da decisão 17 na íntegra, incluindo Bash(rm:*), Bash(git push:*), Bash(pnpm install:*) e Bash(npm install:*). Não é redundante com .regras: regra é prosa no prompt e o modelo pode contrariá-la; o piso é passado na flag E é subtraído da allowlist derivada do ticket (perfil.ts:filtrarPeloPiso) — o ticket pede, o config nega, o config ganha. Os três install estão aqui por um risco MEDIDO neste repo: o node_modules da worktree é SYMLINK para o do checkout principal (executor.mjs:479-487), e um install lá dentro purga o store do repo de verdade. ⚠️ MUDANÇA REAL DE COMPORTAMENTO: hoje o harness antigo não passa --disallowedTools em lugar nenhum (executor.mjs:500 monta só -p/--model/--allowedTools, com allowedTools default Read/Edit/Write/Grep/Glob). O piso é fronteira nova, e é a única linha deste arquivo que restringe o agente por FERRAMENTA em vez de por diff.",
+    "_push_e_de_quem": "⚠️ DIFERENÇA DE MOTOR que este piso torna visível. O harness antigo PUSHA: local-loop.mjs:246-247 chama deps.pushStaging por aprovação, e local-loop.mjs:344-348 roda `git push origin <branch_alvo>` de verdade (só main/master são recusadas, :99-105). O motor do kit NÃO pusha por construção — não há um único `git push` nele, e local-loop.sh abre dizendo 'Sem push: publicar é humano'. Adotar o kit REMOVE o push automático da staging-auto. Isso é mudança de operação, não de config, e precisa de decisão explícita: quem publica a staging-auto depois da adoção."
+  },
+
+  "push_suprimido": true,
+  "_push_suprimido": "INFORMATIVA, não interruptor (CONTRATO.md §8, peça D11): a chave não está em config-chaves.ts e nenhum script do motor a lê. Escrita aqui como REGISTRO da decisão que a adoção toma — o motor do kit não pusha por construção. Quem de fato impede o push são outras duas coisas, e são elas que se conferem: proibicoes_absolutas.tools com Bash(git push:*), e branch_protegida.",
+
+  "launchd": {
+    "label": "com.actus.orquestrador",
+    "start_interval": 1800
+  },
+  "_launchd": "AMBOS levantados do disco, não escolhidos: o label é a string hardcoded em scripts/orquestrador/instalar-launchd.sh:23 (LABEL=\"com.actus.orquestrador\") e o mesmo valor está em com.actus.orquestrador.plist.template:15; o intervalo é o StartInterval do mesmo template (1800). ⚠️ É EXATAMENTE O PONTO DA REGRA: no harness antigo o label vive no SCRIPT, e foi um label fixo em script que sequestrou o job de produção de outro repo no incidente de 08/09/2026 do kit (PLAYBOOK.md do kit) — para o launchd, dois repos com o mesmo label são o MESMO job. instalar-launchd.sh do kit RECUSA sem launchd.label e nunca inventa um. O job com.actus.orquestrador foi removido por bootout em 10/09/2026 e nenhum executor está vivo; reinstalar é passo separado, depois deste config."
+}
```

---

## PEÇA 2 — `docs/fila/rascunhos/900-fixture-adocao.md`

**O trabalho.** `src/lib/format.ts` exporta 7 funções; `src/lib/format.test.ts`
importa 5. `fmtTempoRelativo` (`format.ts:72`) é a única do arquivo que faz
aritmética — subtrai timestamps e escolhe entre 5 faixas — e tem um segundo
parâmetro `agora` que existe justamente para o teste ser determinístico.
`grep -c fmtTempoRelativo src/lib/format.test.ts` = **0** hoje: ninguém a
testa. Cobri-la é ganho real de cobertura e não muda comportamento nenhum.

**Os requisitos, um a um.** Primeiro bloco do arquivo é o bloco ```json do
ticket ✓ · `status: "pendente"` ✓ · toca **1** arquivo de aplicação, e a
`pathspec_allowlist` tem uma entrada só ✓ · 4 critérios executáveis por comando
+ 1 de avaliador ✓ · zero SQL, zero migration, zero UI nova, zero dependência
nova ✓ (e o piso `proibicoes_absolutas.tools` já nega `Bash(pnpm install:*)` e
`Bash(npm install:*)`, então "sem dependência nova" não depende de boa vontade).

**Mudança desta rodada: os dois critérios de escopo negativo passaram a usar
`$BASE_REF`, não `staging-auto` hardcoded.** `BASE_REF` não é invenção do
ticket — o motor do kit o EXPORTA para todo critério com o valor de
`branch_alvo` lido do config (`executor.sh:436`:
`export BASE_REF="$CFG_BRANCH_ALVO"`), e o comentário ali chama `main...HEAD`
de "gate inalcançável, pior a cada ticket aprovado". É literalmente a lição do
ticket 430 (§ Peça 4), transformada em idioma.

**O ticket foi PASSADO PELO GATE DO KIT antes de ser entregue**, com o config
revisado no lugar do config (cópia em diretório descartável — nada foi escrito
no repo): `0 violações, 0 isenções`. A saída crua está abaixo.

**Onde ele está e por que não está na fila.** `docs/fila/rascunhos/` é fora da
fila viva: os dois leitores (`gate-ticket.ts:lerFila` e o `fila-read.mjs`
antigo) fazem `readdirSync` **não-recursivo** na raiz de `docs/fila`. Um ticket
`pendente` ali dentro é inerte. Promover é um `git mv`, e é ato do Lucas.
A fila viva hoje, conferida por varredura do bloco ```json de cada arquivo:
**57 `done`, 5 `bloqueado`, ZERO pendentes** — o 900 seria o único ticket
processável da primeira drenagem, que é exatamente o que se quer de um fixture.

### Saída CRUA do gate de ticket do kit, com o config revisado no lugar

```
$ cd ~/Projetos/orquestrador-kit && npx tsx scripts/orquestrador/gate-ticket.ts \
    --fila <cópia descartável da fila> --pendentes --relatorio
GATE DE TICKET · 1 ticket(s) · fila <cópia descartável>

900-fixture-adocao.md  OK

TOTAL: 0 violação(ões), 0 isenção(ões), em 1 ticket(s)
rc=0
```

### Diff CRU de `docs/fila/rascunhos/900-fixture-adocao.md` (arquivo novo, não versionado)

```diff
diff --git a/docs/fila/rascunhos/900-fixture-adocao.md b/docs/fila/rascunhos/900-fixture-adocao.md
new file mode 100644
index 0000000..b937103
--- /dev/null
+++ b/docs/fila/rascunhos/900-fixture-adocao.md
@@ -0,0 +1,141 @@
+```json
+{
+  "id": "900",
+  "bloco": "B0",
+  "frente": "adocao-orquestrador-kit",
+  "slug": "fixture-adocao",
+  "origem": "humano",
+  "objetivo": "Acrescente casos de teste para fmtTempoRelativo em src/lib/format.test.ts, que é o ÚNICO arquivo que este ticket pode tocar. A função já existe em src/lib/format.ts (export fmtTempoRelativo(iso, agora = new Date())) e hoje não tem NENHUM teste: o import de src/lib/format.test.ts traz só fmtDataBR, fmtInteiro, fmtMoeda, fmtMultiplo e fmtPercent. Importe fmtTempoRelativo de './format' e cubra as cinco faixas que a própria função declara, sempre passando a data de referência pelo SEGUNDO parâmetro e nunca deixando o relógio real decidir: abaixo de 60 segundos devolve 'agora'; abaixo de 60 minutos devolve 'há N min'; abaixo de 24 horas devolve 'há N h'; até 30 dias devolve 'há N d'; acima de 30 dias devolve a data absoluta de fmtDataHoraBR. Cubra também as duas bordas exatas: exatamente 60 segundos e exatamente 30 dias. Siga o estilo do arquivo (describe/it do vitest, e o helper norm() já existente quando a string comparada puder trazer espaço não-quebrável). PROIBIDO e motivo de reprovação: alterar src/lib/format.ts ou qualquer outro arquivo; mudar, afrouxar ou remover qualquer asserção que já existe no arquivo; usar .skip ou .todo; acrescentar dependência. FORA DE ESCOPO: testar fmtDataHoraBR isoladamente, mexer em qualquer componente de UI, e escrever SQL ou migration de qualquer tipo.",
+  "pathspec_allowlist": [
+    "src/lib/format.test.ts"
+  ],
+  "cria_novo": [],
+  "dependencias": [],
+  "diff_estimado": 45,
+  "risco": "",
+  "criterios_aceite": [
+    {
+      "tipo": "alvo",
+      "descricao": "o arquivo de teste passa a exercitar fmtTempoRelativo (hoje não menciona a função em lugar nenhum)",
+      "cmd": "grep -q \"fmtTempoRelativo\" src/lib/format.test.ts && echo pronto",
+      "espera": "pronto"
+    },
+    {
+      "tipo": "guarda",
+      "descricao": "a suíte do arquivo continua verde",
+      "cmd": "node_modules/.bin/vitest run src/lib/format.test.ts 2>&1 | tail -5",
+      "espera": "passed"
+    },
+    {
+      "tipo": "guarda",
+      "descricao": "nenhum arquivo além de src/lib/format.test.ts foi tocado",
+      "cmd": "git diff --name-only $BASE_REF...HEAD | grep -vc \"^src/lib/format.test.ts$\"",
+      "espera": "0"
+    },
+    {
+      "tipo": "guarda",
+      "descricao": "nenhuma linha foi REMOVIDA do arquivo de teste (anti-afrouxamento mecânico)",
+      "cmd": "git diff $BASE_REF...HEAD -- src/lib/format.test.ts | grep -c \"^-[^-]\"",
+      "espera": "0"
+    },
+    {
+      "tipo": "avaliador",
+      "descricao": "avaliador: confirme que cada caso novo exercita a FAIXA que o nome dele descreve, com a data de referência INJETADA pelo segundo parâmetro (nenhum caso pode depender do relógio real); que nenhum caso é tautologia (asserção sobre um valor que o próprio teste acabou de montar, ou expect de string contra ela mesma); que as duas bordas exatas — 60 segundos e 30 dias — estão cobertas e não apenas os miolos das faixas; que nenhuma asserção pré-existente mudou de valor e nenhum it virou skip/todo; e que src/lib/format.ts não aparece no diff.",
+      "cmd": "true",
+      "espera": "avaliador"
+    }
+  ],
+  "status": "pendente",
+  "notas_status": "",
+  "tentativas": 0
+}
+```
+
+# Ticket 900 — fixture de adoção do orquestrador-kit
+
+> O bloco ```json acima é a fonte de verdade de máquina, e é o PRIMEIRO bloco do
+> arquivo de propósito: os três leitores do motor (`gate-ticket.ts:blocoJson`,
+> `fila-read.ts:extractJsonBlock`, `lib.sh:ticket_json`) leem o primeiro e
+> tratam qualquer outro como prosa. Toda a prosa abaixo é para humano.
+
+## Por que este ticket existe
+
+Ele **não entrega valor de produto**. Ele existe para provar, uma vez, o
+caminho inteiro do motor novo com dinheiro de verdade e risco perto de zero:
+
+```
+pré-voo → worktree → claude -p → commit por pathspec → enforcement →
+GATE (typecheck · testes · build) → critérios → JUIZ → APROVADO → MERGE
+```
+
+A primeira drenagem com um motor recém-instalado falha por coisas que nada têm
+a ver com o trabalho pedido: `tsx` ausente, `launchd.label` errado, papel de
+gate que não aparece na trilha, `campos_usage` com nome de campo velho fazendo
+o ledger somar zero. Um ticket trivial faz esses erros aparecerem em minutos,
+com um diff que ninguém precisa revisar de verdade. Um ticket de valor faz o
+mesmo erro aparecer depois de trinta minutos de execução, misturado com uma
+reprovação de mérito que pode ou não ser real.
+
+## Onde ele está, e por que não está na fila
+
+Este arquivo mora em `docs/fila/rascunhos/`, **fora** da fila viva. Os dois
+leitores de fila do repo são não-recursivos — `fila-read.ts:readTickets` faz
+`readdirSync(filaDir)` e filtra `/^\d.*\.md$/` na raiz; o `fila-read.mjs`
+antigo faz o mesmo —, então um ticket `pendente` aqui dentro é **inerte**:
+nenhuma drenagem o pega.
+
+Promover é um `git mv` para `docs/fila/900-fixture-adocao.md`, e é um ato
+deliberado do Lucas, depois de o config revisado estar no lugar. Em 10/09/2026
+a fila viva tem 57 `done` e 5 `bloqueado` e **zero pendentes** — este seria o
+único ticket processável da primeira drenagem, o que é exatamente o que se quer
+de um fixture.
+
+## O trabalho, em uma frase
+
+`src/lib/format.ts` exporta sete funções; `src/lib/format.test.ts` importa
+cinco. `fmtTempoRelativo` é uma das duas que ninguém testa — e é a única do
+arquivo que faz **aritmética** (subtrai timestamps e decide faixa), com um
+segundo parâmetro `agora` que existe justamente para o teste ser determinístico.
+Cobri-la é ganho real de cobertura e não muda nenhum comportamento.
+
+## Por que ele é seguro
+
+| Risco | Por que não se aplica |
+|---|---|
+| quebrar produção | o diff toca **um arquivo de teste**; `pathspec_allowlist` tem uma entrada só, e o enforcement reprova qualquer arquivo fora dela antes de chamar o juiz |
+| SQL / migration | nenhum. O ticket não pode tocar `supabase/**`, e as regras B a F do enforcement nem chegam a ter matéria |
+| UI nova | nenhuma. Nada em `src/app/**` |
+| dependência nova | nenhuma. O piso `proibicoes_absolutas.tools` do config revisado já nega `Bash(pnpm install:*)` e `Bash(npm install:*)` |
+| afrouxar teste existente | duas travas: o critério mecânico `grep -c "^-[^-]"` reprova qualquer linha REMOVIDA do arquivo, e o critério de avaliador cobra o mesmo por leitura |
+
+## Uma nota sobre os critérios, que é a lição do ticket 430
+
+Os dois critérios que olham o diff comparam contra **`$BASE_REF`**, e não
+contra `main`. `BASE_REF` não é invenção deste ticket: o motor do kit o EXPORTA
+para todo critério, com o valor de `branch_alvo` lido do config
+(`executor.sh:436` — `export BASE_REF="$CFG_BRANCH_ALVO"`), justamente para que
+critério de escopo negativo não precise hardcodar nome de branch. Hoje ele vale
+`staging-auto`; se a `branch_alvo` mudar, o critério acompanha sozinho.
+
+O ticket 430 está bloqueado hoje exatamente por não ter isso: o critério dele é
+`git diff --name-only main...HEAD | grep -c '^src/'`, e como a worktree nasce de
+`staging-auto` — que em 11/09/2026 está 14 commits à frente e 63 atrás de `main`
+—, esse comando devolve os arquivos da divergência das duas branches, não os do
+ticket. Ele reprovou por `saída: 5` três vezes seguidas com o trabalho correto
+no disco (`docs/fila/runs/430/attempt-3/criterios.txt`: os outros três critérios
+passaram e o diff tem UM arquivo só, a migration). O critério estava errado, não
+o diff — e é por isso que o comentário do próprio motor chama `main...HEAD` de
+gate inalcançável, que piora a cada ticket aprovado.
+
+Vale também registrar a diferença de motor que muda a leitura de `espera`: o
+harness antigo compara com `String(saída).includes(espera)` (`executor.mjs:349`),
+onde `espera: "0"` casa com uma saída `"10"`; o motor do kit compara número puro
+por **igualdade exata** (`lib.sh:criterio_match`, `:1093-1103`) e só cai em regex
+quando a espera não é numérica. Os `espera: "0"` acima contam com a regra nova.
+O exit code do `cmd` é irrelevante nos dois motores — o kit fecha o pipeline com
+`|| true` (`executor.sh:436`) —, então o `grep -vc` que sai 1 quando a contagem
+é zero não reprova nada: quem julga é a SAÍDA.
+
+Este bloco ```json foi passado pelo gate de ticket do kit antes de ser entregue:
+`npx tsx scripts/orquestrador/gate-ticket.ts --fila <cópia> --pendentes`, com o
+`000-config.revisado.json` no lugar do config — **0 violações, 0 isenções**.
```

---

## PEÇA 3 — inventário do harness antigo (`actus-saas/scripts/orquestrador/`)

25 arquivos, 6.313 linhas, **zero python** (não há o que triar nesse eixo: o
`orq-telemetria.py` que o kit cita é do comarka-operacional, não daqui).

Legenda: **(a)** perda aceita · **(b)** já existe no kit com outro nome ·
**(c)** vira peça do kit.

### 1. O kill switch — achado confirmado, e é o maior

`grep -rn "PAUSAR\|orq-pause\|pausar" scripts/` no actus-saas devolve **zero
linhas**. Nenhum arquivo do harness lê arquivo de pausa; `local-loop.mjs`
consulta `.cooldown-until` (`:152`) e `.loop.lock` (`:159`), e mais nada. A
única forma de parar o loop era `launchctl bootout` — matar o processo, que é
justamente o que gera ticket órfão em `em_execucao`.

**O que muda quando o kit entrar:** passa a existir `docs/fila/PAUSAR`
(`pausar_file` no config revisado), lido ENTRE tickets (`lib.sh:619`), com
`orq pausar [motivo]` / `orq retomar`. **Não interrompe o ticket em curso** —
a drenagem lê o arquivo entre tickets e encerra em `ocioso` —, e é essa a razão
de ser dele: matar o processo garante órfão, o arquivo não. E vira
pré-condição de manutenção: `instalar.sh --atualizar` **RECUSA** com o loop não
pausado, e essa recusa não cede a `--forcar`. Classificação: **(c) → já
resolvido no kit** (é ganho, não perda). ⚠️ Dívida que vem junto:
`docs/fila/PAUSAR` **não está no `.gitignore` do Actus** hoje (`git check-ignore`
só pega `docs/fila/runs/`) — o instalador RELATA e não edita; a linha é do dono.

### 2. O que o harness antigo faz e o kit NÃO faz

| # | O quê | Onde (arquivo:linha) | Classe | Por quê |
|---|---|---|---|---|
| 2.1 | **`git push origin <branch_alvo>` por aprovação** | `local-loop.mjs:246-247` (chamada) e `:344-348` (o push); guarda em `:99-105`, que só recusa `main`/`master` | **(a) perda aceita — mas é DECISÃO, não detalhe** | O motor do kit **não pusha por construção**: não há um único `git push` nele, e `local-loop.sh` abre dizendo "Sem push: publicar é humano". Adotar o kit REMOVE a publicação automática da `staging-auto`. Quem publica depois disso é pergunta aberta (§ Só o Lucas decide). |
| 2.2 | **`telemetria.mjs`** — placar reconstruído do disco: estados finais por ticket, motivos normalizados, mediana de duração por mtime com piso de 1s, contagem de `attempt` ilegível, saída `--json` | 380 linhas; `lerAttempt:48`, `coletarRuns:114`, `calcularPlacar:221`, CLI `:351` | **(c) vira peça do kit** | O kit tem consulta PONTUAL (`orq fila`, `orq custo`, `orq ticket`, `orq erro`) e não tem placar agregado nem duração mediana. O próprio CONTRATO §10 registra a lacuna (divergência 5: os 8 baldes de `motivo_categoria.json` não são usados por nada; "entram com o painel", peça **K12**). Este arquivo é o insumo pronto dessa peça. |
| 2.3 | **`sql-pendentes.mjs`** — lê `docs/fila/ultima-migration-aplicada.txt` (hoje `0257`), lista as `.sql` de número maior e emite um bundle único em `runs/` para o ritual humano de aplicar via MCP | 138 linhas; `lerMarcador:27`, `listarPendentes:42`, CLI `:91` | **(c) vira peça do kit** | O kit não tem nada equivalente — tem só o conceito de `sql_pendente_dir` (diretório de artefato), que é outra coisa. E este script é o casamento exato com o CLAUDE.md do Actus (§FLUXO DE MIGRATION: `db push` CONGELADO, só o Lucas aplica). Nunca conecta em banco, nunca aplica, nunca move o marcador. |
| 2.4 | **Relatório de drenagem com gancho de writeback externo** | `emitirRelatorio:116-128` (tenta `writeback`, cai para arquivo em QUALQUER falha) e `:349-355` (grava `runs/relatorio-ultimo.md`; `writeback: null` na montagem real) | **(a) perda aceita** | O gancho nunca foi ligado neste repo — `writeback` é literalmente `null`. O kit tem `runs/notificacoes.log` (canal `arquivo`) e o `STATUS.md`. O `writeback_notion` do Comarka está catalogado como `PROPRIA_DE_REPO` e decidido na K11. Perder um gancho morto não é perda. |
| 2.5 | **`.npmrc` escrito na worktree** (`verify-deps-before-run=false`, `confirm-modules-purge=false`) | `executor.mjs:488-494` | **(c) vira peça do kit (pequena)** | O kit CONHECE o truque e escolheu o outro lado da porta: nega a tool (`perfil.ts:183-185` explica isso por escrito). A negação prende o AGENTE; ela não prende um **gate** cujo `cmd` use `pnpm`. Enquanto os gates do Actus chamarem `node_modules/.bin/*` não há risco — mas a trava some no dia em que alguém escrever um gate com `pnpm`. Vale a peça. |
| 2.6 | **Pré-voo "contrato em teste"** — se o `objetivo` manda remover um caminho da allowlist que um teste ainda CITA, o ticket é obsoleto: bloqueia SEM consumir tentativa | `pre-voo.mjs:191-209` (`extrairAlvosDeRemocao`) e `:210-244` (`checarContratoEmTeste`); chamado em `local-loop.mjs:198-209` | **(c) vira peça do kit** | O pré-voo do kit tem cat. 7/0/1/6/3 e nada disso. É uma checagem barata que impede gastar agente num ticket que já nasceu obsoleto. |
| 2.7 | **Pré-voo cat. J** — varre o bloco ```json de TODO ticket da fila antes de drenar | `pre-voo.mjs:281-323`, ligado em `:330-338` | **(c) vira peça do kit — e já está catalogada** | É a divergência 7 do CONTRATO ("o `drenar` não roda o gate de ticket antes de gastar agente", peça **1c**). O kit tem o gate de ticket bem mais forte (`gate-ticket.ts`), só não o roda na drenagem. |
| 2.8 | **`executor.exit.txt`** — exit code, signal, stderr e stack do que morreu, gravado pelo LOOP (não pelo executor, que pode ter morrido antes de escrever) | `local-loop.mjs:291-308` (`salvarEvidenciaFalha`) e `:404-422` (`morrerComEvidencia` + handlers de `uncaughtException`, `unhandledRejection`, SIGINT/SIGTERM/SIGHUP) | **(b) parcial** | O kit cobre a MORTE na trilha — evento `EXECUTOR_MORREU rc= fase= sinal=` (`executor.sh:1136`) mais limpeza do `STATUS.md` ("quem morre desliga a própria luz"). O que não existe lá é o ARTEFATO por tentativa com o stderr. Perda pequena, registrada. |
| 2.9 | **Critério herdado `p_tenant_id` no prompt do JUIZ** | `avaliador.mjs:35`: "REPROVE se qualquer RPC/função SQL NOVA no diff não receber `p_tenant_id` obrigatório" | **(c) vira peça do kit — e é a perda mais cara da lista** | Ver §3 abaixo: o kit **não lê `proibicoes_absolutas.regras`**, e o prompt do juiz dele (`juiz.ts:COBRANCAS`) não tem nada de domínio do repo. Num SaaS multi-tenant, perder essa cobrança é perder a trava de isolamento no julgamento. |
| 2.10 | **`~/.env.orquestrador.actus` carregado pelo wrapper do launchd** | `launchd-run.sh:43-47` | **(a) perda aceita, trivialmente** | O arquivo **não existe** no disco (conferido). O wrapper do kit não carrega env externo de propósito e diz por quê (`launchd-run.sh:8-9`): `lib.sh` já lê o `.env.local` do repo. |
| 2.11 | **Comparação de critério por `includes`** | `executor.mjs:349`: `String(saída).includes(c.espera)` | **(b), com mudança de significado a favor** | No kit, `espera` numérica pura é **igualdade exata** (`lib.sh:criterio_match`, `:1093-1103`) e só cai em regex quando não é número. No antigo, `espera:"0"` casa com uma saída `"10"` — um critério de escopo negativo podia passar com 10 arquivos fora do escopo. O exit code do `cmd` é ignorado nos dois. |
| 2.12 | **Gate `baseline` que ignora o exit code** | `executor.mjs:514-524`: devolve `ok: fora.length === 0` e nunca olha `r.code` | **(b), com o kit mais rígido** | O kit reprova `exit != 0` com contagem ZERO (`gates.ts:243-245`): gate mudo (binário ausente, tsconfig quebrado) deixa de passar por verde. |
| 2.13 | **`fila-read.mjs` com 4 status** (`pendente`, `em_execucao`, `done`, `bloqueado`) | `fila-read.mjs:35` | **(b)** | O kit conhece 6 (`+ obsoleto`, `+ refatiar`) e tem o evento `REFATIAR`. Ganho: o desfecho "fatiar isto" deixa de ter que virar `bloqueado`. |
| 2.14 | **`instalar-launchd.sh` com o label HARDCODED** | `instalar-launchd.sh:17`: `LABEL="com.actus.orquestrador"` | **(b), e o kit conserta** | É exatamente o defeito do incidente de 08/09 do PLAYBOOK do kit: label no script, não no config. O instalador do kit lê `launchd.label` e **RECUSA sem ele**, e recusa instalar de checkout sob `/tmp` ou com `ORQ_TESTE=1`. |
| 2.15 | **9 arquivos `*.test.mjs` do próprio harness** (2.981 linhas) | `enforcement.test.mjs`, `executor.test.mjs`, `local-loop.test.mjs`, `pre-voo.test.mjs`, `telemetria.test.mjs`, `sql-pendentes.test.mjs`, `fila-read.test.mjs`, `avaliador.test.mjs`, `drenagem-real.test.mjs`, `sistema.test.mjs` | **(a) perda aceita — mas com armadilha** | ⚠️ `vitest.config.ts:10` inclui `scripts/orquestrador/**/*.test.mjs`, e o instalador do kit é `cp`, **nunca `rsync --delete`** (`instalar.sh:492-494`): os `.mjs` SOBREVIVEM à instalação e esses testes continuam rodando DENTRO do gate `testes` — verdes, testando um motor que ninguém mais chama. Decidir o destino deles é passo da adoção. |

### 3. A perda que não é de script, é de CONFIG — e ninguém a veria sozinho

`grep -rn "proibicoes_absolutas" scripts/orquestrador/*.sh *.ts` no kit devolve
**só `proibicoes_absolutas.tools`**. A metade `.regras` **não é lida por
script nenhum do motor** — o bloco "REGRAS INVIOLÁVEIS" do prompt do executor
está HARDCODED no heredoc de `executor.sh:363-377`.

No harness antigo, as 8 frases VÃO para o prompt: `executor.mjs:35-40` monta
`proib` a partir de `config.proibicoes_absolutas` e `:56` as imprime uma a uma.
Com o kit, elas viram documentação. O que cada uma perde:

| # | Frase | Coberta pelo kit? |
|---|---|---|
| 1 | nunca push na branch principal | **Sim** — `branch_protegida` + `Bash(git push:*)` no piso |
| 2 | nunca aplicar DDL (só `.sql` na faixa) | **Sim** — prompt fixo + regra B + `APLICA_MIGRATION` |
| 3 | nunca escrever na zona proibida | **Sim** — prompt fixo + enforcement |
| 4 | nunca tocar credenciais/segredos | **Sim** — prompt fixo + `pareceCredencial` |
| 5 | nunca gastar dinheiro | **Parcial** — só pelo piso (`curl`, `WebFetch`, `WebSearch` negados); some do prompt |
| 6 | `git add` sempre por pathspec explícito | **Sim** — prompt fixo |
| 7 | nunca tocar branches de feature vivas | **Parcial** — a worktree nasce de `branch_alvo`; a frase some |
| 8 | **toda RPC nova recebe `p_tenant_id` obrigatório** | **NÃO** — nem no prompt do executor, nem no do juiz |

A 8ª é a que dói. Ela é critério de JUIZ (por isso ficou em `.regras`, e não em
`.tools` — não há tool a negar), e no harness antigo o juiz a cobra
explicitamente (`avaliador.mjs:35`). Saídas possíveis, nenhuma decidida aqui:
escrevê-la como critério `avaliador` em CADA ticket que toque SQL; ou abrir
peça no kit para o juiz ler cobranças de domínio do config. Enquanto não, a
trava de isolamento multi-tenant sai do julgamento **em silêncio**.

### 4. O que o kit tem e o Actus não tem (o outro lado do inventário)

Kill switch (§1) · trilha `events.log` com vocabulário fechado de 21 eventos ·
`STATUS.md` que se corrige na leitura quando o processo morreu · **ledger de
custo e orçamento como GATE** (o Actus não tem `custo.json`, não lê `usage` de
envelope nenhum, e `grep` por contabilidade em `*.mjs` devolve só a string
`"usage limit"` em `executor.mjs:220`) · gate de ticket com 8 checagens ·
liberações v2 com `orq liberar` · juiz por NÍVEL de risco · anti-afrouxamento
no prompt do juiz · `orq` read-only por construção · e `refatiar` como desfecho
de primeira classe.

---

## PEÇA 4 — 430, 441 e 442: o veredito real

> ⚠️ **A premissa do prompt está errada em dois dos três, e o dado é do disco.**
> O prompt diz "430, 441 e 442 estão bloqueados por falha de MÉRITO". Só o
> **442** está. O **430** e o **441** foram bloqueados por **defeito do
> harness**, com o trabalho correto no disco — e o mesmo defeito do 441 queimou
> um QUARTO ticket, o **440**, que o prompt nem cita. Nenhum arquivo de ticket
> foi editado, como mandado.

### 430 · `admin-visao-consolidada-rpc` — o critério estava errado, não o diff

O diff da tentativa 3 tem **UM arquivo só**
(`grep -c '^diff --git' = 1`: a migration `0264_admin_visao_consolidada.sql`), e
`criterios.txt` mostra **3 de 4 critérios OK**. O que reprovou, três vezes:

```
[FALHOU] nenhum arquivo de aplicacao foi tocado
  cmd: git diff --name-only main...HEAD | grep -c '^src/'
  espera: 0   saída: 5
```

A worktree nasce de `staging-auto`, que está **14 commits à frente e 63 atrás
de `main`** (medido hoje: `git rev-list --left-right --count main...staging-auto`
= `63  14`). `main...HEAD` devolve a divergência das duas branches, não os
arquivos do ticket. O comentário do próprio motor do kit nomeia isso: gate
inalcançável, que piora a cada ticket aprovado.

**Caminho: REESCREVER A SPEC — e é uma linha.** Trocar o 4º critério para
`git diff --name-only $BASE_REF...HEAD | grep -c '^src/'`, com `espera: "0"`.
Não é refatiar: o ticket é do tamanho certo e o trabalho já existe na branch
`frente/430`. Adotar o kit **não conserta sozinho** — ele exporta `BASE_REF`
(`executor.sh:436`), mas quem escreveu `main` foi o ticket.

### 441 · `rejeicao-individual-motivo-livre` — três tentativas queimadas por um `git add` que falhou inteiro

`notas_status` diz "nenhuma mudança produzida (diff vazio)" e os três
`diff.patch` têm **0 bytes**. Mas o trabalho existe: `git status` na worktree
`orq-441` mostra 2 arquivos modificados e 2 novos, e os três commits
(`git show --stat`) estão **VAZIOS**. Causa-raiz, reproduzida na worktree:

```
$ git add -n -- "src/app/api/comercial/sugestoes/**" "src/app/**/comercial/sugestoes/**" \
                "src/components/comercial/**" "src/lib/comercial/painel/**"
fatal: pathspec 'src/components/comercial/**' did not match any files
```

`src/components/comercial/` **não existe neste repo**. `git add` é ATÔMICO: um
pathspec que não casa nada faz o comando inteiro falhar e **nada é
estageado** — e `commitTrabalho` (`executor.mjs:504-507`) segue direto para
`commit --allow-empty`, que nasceu para não travar o loop e aqui **apaga a
evidência da falha**. Diff vazio, três vezes, com o trabalho intacto no disco.
(O rastro de que a tentativa anterior chegou longe está no mesmo diretório:
`attempt-3/juiz.raw.txt`, de uma drenagem anterior às 18:51, traz um veredito
de MÉRITO — "o componente foi criado mas não é importado/montado em lugar
nenhum, e a rota passou a exigir motivo enquanto o card continua enviando sem o
campo". As 21:29 outra drenagem sobrescreveu `diff.patch` e `resultado.json`
por cima.)

**Caminho: REESCREVER A SPEC, e em dois eixos.** (1) Tirar
`src/components/comercial/**` da allowlist e pôr o caminho REAL da UI —
`src/components/painel/comercial/sugestao-card.tsx`, que é quem chama o PATCH;
sem ele, o ticket é fisicamente incapaz de ligar o campo na tela, que foi o
motivo do veredito de mérito da rodada anterior. (2) Resolver a contradição que
o recon achou e o ticket não previu: `fn_sugestao_resolver` (0181) **não aceita
motivo** e a coluna `motivo_rejeicao` (0186) tem **CHECK de vocabulário
fechado** — texto livre não cabe nela sem DDL, e o ticket proíbe migration.
Ou ele vira "grava na trilha `audit_log`", ou passa a exigir migration e muda
de bloco. **Refatiar não resolve nenhum dos dois.**

⚠️ **O mesmo defeito no 440** (`ghl-midia-por-messageid`, também `bloqueado`,
também "diff vazio", 3 tentativas): a allowlist declara
`src/lib/comercial/midia/ghl.ts` e `.test.ts`, **que não existem**, e o
`git add -n` na worktree `orq-440` falha na primeira delas. Alguém já recuperou
o trabalho à mão — há um commit lá chamado *"recuperado do worktree, commit
perdido pelo loop"* com 4+ arquivos — mas a CAUSA não foi identificada e o
ticket seguiu bloqueado.

**Isto é (b): o kit fecha o buraco sozinho.** Quando o agente sai sem commitar,
o harness do kit commita por ele com `git add -A` (`executor.sh:719-737`,
evento `COMMIT_HARNESS`) — *"restringir a add por allowlist esconderia do
enforcement justamente o arquivo fora do escopo que ele existe para pegar"*.
Com `-A` não existe pathspec que não casa, o trabalho SEMPRE aparece no diff, e
quem julga o escopo é o enforcement (`fora_do_pathspec`), que é o lugar certo.
Os três tickets teriam sido julgados pelo mérito.

### 442 · `funil-covas-espelha-ghl` — mérito de verdade, e o ticket é impossível como está

O único dos três bloqueado por mérito, e nem isso é culpa do executor:

- tentativas **1 e 2**: `enforcement reprovou: [no_write_column] escrita
  tocando coluna proibida: etapa_canonica`;
- tentativa **3**: o agente fez o recon, entendeu a fronteira, entregou só a
  linha de `comercial.pipelines` e DECLAROU que não inseriria as etapas — e o
  juiz reprovou, com razão: "o objetivo do ticket não foi entregue, ficando
  apenas como comentário de handoff".

A contradição é estrutural e está no schema: `comercial.funnel_stages`
(migration `0160:72`) tem `etapa_canonica text NOT NULL` **sem default**, com
CHECK fechado em 5 valores. Todo `INSERT` naquela tabela **nomeia a coluna
congelada** — e `zona_proibida.no_write_columns: ["etapa_canonica"]` reprova.
O ticket manda inserir 15 linhas lá. **Não existe recorte do ticket que
satisfaça as duas coisas**, e é por isso que:

**Caminho: REESCREVER A SPEC — e a decisão é de FRONTEIRA, não de tamanho.**
Refatiar é gasto puro: qualquer fatia que insira etapa bate na mesma parede, e
uma fatia que não insira não entrega nada. As duas saídas honestas são (i) o
Lucas escrever a migration à mão, que é o tratamento normal de escrita em
coluna promovida, ou (ii) declarar a exceção no config e reescrever o ticket em
cima dela. A exceção **não é trivial**: `colunas_sombra` vence `colunas_congeladas`
por GLOB (`enforcement-core.ts:549-563`), mas `etapa_canonica` é o nome exato
da congelada — uma sombra que a cubra abriria a coluna para todo ticket, em
toda tabela, que é o oposto do que a proibição quer. E o motor não distingue
"INSERT de linha nova" de "UPDATE de linha viva", que é a distinção que
importaria aqui. Ou seja: a saída (ii) exige peça no motor, não edição de
config. **Recomendo (i).**

### 431 · nota de dependência

`431-admin-visao-consolidada-tela` está `bloqueado` com **0 tentativas**,
esperando a `0264` do 430 ser aplicada em produção. Ele destrava sozinho quando
o 430 fechar — não precisa de decisão própria.

---

## DECISÕES ABERTAS da Peça 1 — opções e recomendação

Nenhuma foi decidida no arquivo. Cada uma está marcada lá dentro, no comentário
vizinho à chave.

### D1 · `sql_pendente_dir` — hoje `null`

O Actus **não tem** `docs/sql-pendente/` (o diretório não existe). O que ele
tem no lugar é outra coisa: `docs/fila/ultima-migration-aplicada.txt` (conteúdo
`0257`) + `sql-pendentes.mjs`, que empacota as migrations de número maior. Não é
o mesmo conceito — o do kit é "segundo diretório onde `.sql` é artefato inerte";
o do Actus é "quais das migrations que já estão no lugar certo ainda não foram
aplicadas".

| Opção | Efeito |
|---|---|
| **(A) deixar `null` (como está)** | Enforcement inalterado (o core filtra falsy). Preço: `executor.sh:368` põe a string `"null"` na linha do prompt — e **omitir a chave dá exatamente o mesmo**, porque `jq -r` de chave ausente também devolve `"null"` |
| (B) declarar `docs/sql-pendente` | Cala o prompt e cria um segundo lugar legítimo para `.sql`. Mas o diretório não existe e não há prática que o use: seria config descrevendo um fluxo que ninguém pratica |
| (C) apontar para `supabase/tests` | **Errado.** Tiraria os testes SQL da cobrança das 4 condições de `checarTesteSql`, que é justamente o que `enforcement.testes_sql.glob` existe para fazer |

**Recomendo (A)**, com o preço escrito no arquivo — e ele já está. O fluxo real
de SQL pendente do Actus não é um diretório: é o marcador + o bundle, e o lugar
disso é a peça 2.3 do inventário, não esta chave.

### D2 · `zona_proibida.no_write_paths` — hoje AUSENTE

A `zona_proibida` do Actus sempre foi fronteira de BANCO. Caminho nunca entrou —
e o config do Actus foi o caso que expôs o bug do spread de `undefined` no kit
(peça K11a-4d). Hoje **a única fronteira de caminho é a `pathspec_allowlist` do
ticket**, que é dado escrito por humano: um ticket cuja allowlist inclua
`docs/fila/**` ou `scripts/orquestrador/**` deixa o agente reescrever a própria
fila, o próprio config e o próprio motor, e nada no banco de regras o impede.

| Opção | Efeito |
|---|---|
| **(A) declarar a lista proposta** | Fecha o buraco acima e cala o erro de `jq` do prompt. Globs já validados com `git ls-files` (arquivos versionados que cada um casa hoje): `.env*` 1 · `**/.env*` 1 · `.github/workflows/**` 1 · `docs/orquestrador/**` 8 · `scripts/orquestrador/**` 24 · `docs/fila/**` 197 · `CLAUDE.md` 1. Preço: nenhum ticket poderá editar um `.md` da fila pela mão do agente |
| (B) deixar ausente | Status quo. Preço: a linha do prompt sai vazia, um erro de `jq` por prompt montado, e a fronteira de caminho continua sendo só o ticket |
| (C) lista mínima (só `.env*` e `**/.env*`) | Meio-termo sem valor: credencial já é pega por conteúdo (`pareceCredencial`), e o que falta proteger é o harness |

**Recomendo (A)**, com a lista completa. O rascunho está no arquivo em
`_no_write_paths_PROPOSTA` / `_no_write_paths_PROPOSTA_valor` — adotar é
renomear a chave. Observação sobre `docs/fila/**`: **não atrapalha o motor**,
porque quem escreve status de ticket é o harness no checkout PRINCIPAL, não o
diff da worktree.

### D3 · `worktrees_prefixo` — hoje `orq-`

Valor de FATO: `executor.mjs:468` cria `join(wtBase, "orq-" + ticket.id)`, e
`~/Projetos/_worktrees` tem `orq-430`, `orq-440`, `orq-441`, `orq-442` agora.
O diretório é COMPARTILHADO com outros repos, e lá dentro existem `orq-runner` e
`orq-037-recovery`, que **não são do Actus**. A chave existe exatamente para
impedir colisão entre repos, e o prefixo genérico `orq-` a enfraquece.

**Recomendo manter `orq-` nesta rodada** (preserva o comportamento byte a byte e
não órfã os quatro diretórios com trabalho ainda não recuperado do 430/440/441)
e trocar para `actus-` numa rodada dedicada, depois que 430/440/441 fecharem.

### D4 · `juiz.paths_alto_risco` — chave NOVA, sem correspondente v1

15 globs, todos validados com `git ls-files -- ':(glob)…'` e todos casando ≥1
arquivo versionado (`supabase/**` 91 · `src/lib/connectors/**` 33 ·
`src/lib/auth/**` 14 · `src/app/api/admin/**` 13 · `src/lib/admin/**` 11 ·
`src/app/admin/**` 10 · `src/lib/produtos/**` 9 · `src/app/api/webhooks/**` 6 ·
e 1 cada para `middleware.ts`, `app/auth`, `login`, `definir-senha`,
`recuperar-senha`, `vault.ts`, `env.ts`). O recorte saiu das premissas de
segurança do CLAUDE.md. Globs do config do CI que casam ZERO aqui foram
DESCARTADOS, não copiados.

⚠️ **Hoje esta lista não muda gasto nenhum**, porque `modelos.juiz_alto` e
`juiz_baixo` são os DOIS `opus` — o que preserva o comportamento exato de hoje
(`avaliador.mjs:70` chama um juiz só). Ela só rotula. **Recomendo aceitar a
lista como está** e tratar "baratear o juiz de risco baixo" como decisão de
custo separada, depois de duas semanas de ledger.

### D5 · `juiz.diff_max_baixo` — 350

Medido sobre `docs/fila/runs/`: **121 tentativas** com evidência; nas **54
APROVADAS**, mediana 346 linhas, p90 556, máximo 1323. 350 é a mediana
arredondada. Mesma ressalva do D4: só passa a valer dinheiro quando o juiz baixo
baratear. **Recomendo aceitar.**

### D6 · `gate_ticket.cmd_prefixos_permitidos` — o conflito que só morde amanhã

A lista foi levantada do disco (os 211 `cmd` distintos dos 62 tickets), não
copiada do template; `npx jest` e `npm run lint` ficaram de fora por não
existirem aqui. **Mas três formas REAIS em uso na fila colidem com
`proibido_no_cmd`**: `rm -rf` como primeiro segmento (13 `cmd`), `$(` em
`f=$(git diff …)` / `test $(grep …)` (15 `cmd`), e redirecionamentos `>`.

Consequência HOJE: **nenhuma** — os 62 tickets estão todos em status terminal, e
o gate só cobra campos de `pendente`. Consequência AMANHÃ: todo ticket novo
escrito nessas formas reprova em `orq validar`.

| Opção | Efeito |
|---|---|
| **(A) escrever os critérios novos sem essas formas** | Zero mudança de config. O ticket 900 é a prova de que dá: 5 critérios, nenhuma forma proibida, gate 0 violações |
| (B) acrescentar `test $(` aos prefixos (como o CI fez) | Resolve só `test $(…)`; a forma dominante aqui é `f=$(…)`, que nenhum prefixo alcança |
| (C) afrouxar `proibido_no_cmd` | **Não.** Afrouxar a proibição para caber no que já existe é como se perde a proibição |

**Recomendo (A).**

### D7 · `orcamento` — provisório por escrito, com data de remedição

`usd_dia 25`, `tokens_dia 2.500.000`, `usd_ticket 5`. **Não são medidos, e o
arquivo diz isso**: o harness antigo não tem ledger de custo — não existe
`custo.json`, nenhum script lê `usage` do envelope, e a única ocorrência da
palavra em `*.mjs` é a string `"usage limit"` (`executor.mjs:220`, detecção de
rate limit). Não há histórico deste repo para calibrar. São um PISO conservador
escolhido para disparar cedo e ser corrigido com dado, com
`_orcamento_provisorio` datado **10/09/2026** e remedição em **24/09/2026**:
rodar duas semanas, ler `orq custo`, fixar com 30% de folga sobre a mediana.

⚠️ **A conferência da primeira drenagem é `campos_usage`**: se `runs/custo.json`
vier com `custo_usd: 0` em toda linha, o errado são os nomes dos campos do
envelope, não o gasto.

---

## O QUE SÓ O LUCAS DECIDE

Ordenado por quanto custa errar. Nenhum destes foi tocado nesta sessão.

1. **Quem publica a `staging-auto` depois da adoção.** O harness antigo dá
   `git push origin staging-auto` a cada aprovação (`local-loop.mjs:344-348`);
   o motor do kit **não pusha, por construção**. Adotar remove a publicação
   automática. É mudança de OPERAÇÃO, não de config.
2. **A 8ª proibição (`p_tenant_id` em toda RPC nova) some do julgamento.**
   O kit não lê `proibicoes_absolutas.regras` e o prompt do juiz dele não tem
   cobrança de domínio. Ou ela vira critério `avaliador` em cada ticket que
   toque SQL, ou vira peça no kit. Num SaaS multi-tenant, seguir sem decidir é
   perder a trava de isolamento **em silêncio**.
3. **A janela da troca.** Este config **quebra o harness antigo** (spread de
   objeto em `executor.mjs:35` = `TypeError` em todo ticket). Copiar o revisado
   por cima do vivo e instalar o motor do kit são UM passo, com o loop pausado.
4. **`no_write_paths` (D2).** Recomendo adotar a lista proposta. É a única
   fronteira que hoje impede o loop de reescrever a própria fila, o próprio
   config e o próprio motor.
5. **430 / 440 / 441 / 442 (Peça 4).** Três reescritas de spec e uma decisão de
   fronteira. **440 e 441 têm trabalho pronto nas worktrees `orq-440` e
   `orq-441` agora** — recuperável enquanto os diretórios existirem.
6. **O destino dos 9 `*.test.mjs` do harness antigo.** O instalador é `cp`, não
   `rsync --delete`: eles sobrevivem e continuam rodando dentro do gate
   `testes`, verdes, testando um motor que ninguém chama.
7. **`docs/fila/PAUSAR` no `.gitignore`.** O instalador RELATA e não edita — o
   arquivo é do dono. Sem a linha, o kill switch suja a árvore e o preflight do
   run seguinte morre.
8. **`liberacoes.json` na forma v1** (5 tokens de string SEM prefixo). O kit
   resolve, mas AVISA a cada uso. Migrar é `instalar.sh --atualizar --migrar`,
   não deste arquivo.
9. **`staging-auto` está 63 commits atrás de `main`.** O loop nasce de uma base
   velha. Não é config, é decisão de branch — e afeta todo ticket que o motor
   novo rodar.
10. **As três peças candidatas do inventário** (2.2 telemetria, 2.3
    sql-pendentes, 2.6 contrato-em-teste) e as duas menores (2.5 `.npmrc`, 2.7
    cat. J): entram no kit, morrem, ou ficam como script solto do Actus.
11. **`worktrees_prefixo` (D3)** — manter `orq-` agora, `actus-` depois que
    430/440/441 fecharem.
12. **Promover o ticket 900** (`git mv docs/fila/rascunhos/900-fixture-adocao.md
    docs/fila/`), que é o gatilho da primeira drenagem com o motor novo.
