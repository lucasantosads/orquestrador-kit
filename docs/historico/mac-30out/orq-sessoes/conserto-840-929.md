# Conserto 840 e 929 (sessão comarka, 10/10/2026)

Fonte: `~/orq-sessoes/primeiros-diagnosticos-comarka.md`. Só os dois `.md` de `docs/fila/` foram
escritos. Nada de git add, commit, checkout ou stash; nenhum script do repo rodou. Todo git usou
`GIT_OPTIONAL_LOCKS=0`.

**Status.** Os dois voltaram de `bloqueado` para `pendente` com `notas_status` vazio. O
`bloqueado` era writeback do loop ainda não commitado, então o `git diff` contra o HEAD não mostra
a linha de status: no HEAD ela já era `pendente` / `""`.

## 840: diff

```diff
diff --git a/docs/fila/840-sai-resolver-chave-api-e.md b/docs/fila/840-sai-resolver-chave-api-e.md
index a516b85..f4b91bd 100644
--- a/docs/fila/840-sai-resolver-chave-api-e.md
+++ b/docs/fila/840-sai-resolver-chave-api-e.md
@@ -33,7 +33,8 @@ Frente F1d. Antes de apagar `@/lib/clientes/resolver-chave`, os importadores que
     "test/chave-unica-cliente-id.test.ts",
     "test/resolver-chave.test.ts",
     "test/resolver-cliente.test.ts",
-    "test/sai-resolver-chave-api-e.test.ts"
+    "test/sai-resolver-chave-api-e.test.ts",
+    "test/nps-reacao-resposta.test.ts"
   ],
   "dependencias": [
     "800",
@@ -139,7 +140,7 @@ Frente F1d. Antes de apagar `@/lib/clientes/resolver-chave`, os importadores que
     },
     {
       "descricao": "so arquivos da allowlist foram tocados",
-      "cmd": "b=\"$(git merge-base HEAD origin/staging-auto)\"; r=SO_ALLOWLIST; for f in $(git diff --name-only \"$b\" HEAD); do ok=0; for p in 'src/app/api/cron/leitura-relacao/route.ts' 'src/app/api/nps/public/[token]/route.ts' 'src/app/api/nps/token/route.ts' 'src/app/api/perf/clientes/[id]/resolver-chave/route.ts' 'test/leitura-relacao-cron-sem-base.test.ts' 'test/leitura-relacao-gatilhos.test.ts' 'test/chave-unica-cliente-id.test.ts' 'test/resolver-chave.test.ts' 'test/sai-resolver-chave-api-e.test.ts' 'test/resolver-cliente.test.ts'; do if [ \"$f\" = \"$p\" ]; then ok=1; fi; done; [ $ok = 1 ] || r=FORA_$f; done; echo $r",
+      "cmd": "b=\"$(git merge-base HEAD origin/staging-auto)\"; r=SO_ALLOWLIST; for f in $(git diff --name-only \"$b\" HEAD); do ok=0; for p in 'src/app/api/cron/leitura-relacao/route.ts' 'src/app/api/nps/public/[token]/route.ts' 'src/app/api/nps/token/route.ts' 'src/app/api/perf/clientes/[id]/resolver-chave/route.ts' 'test/leitura-relacao-cron-sem-base.test.ts' 'test/leitura-relacao-gatilhos.test.ts' 'test/chave-unica-cliente-id.test.ts' 'test/resolver-chave.test.ts' 'test/sai-resolver-chave-api-e.test.ts' 'test/resolver-cliente.test.ts' 'test/nps-reacao-resposta.test.ts'; do if [ \"$f\" = \"$p\" ]; then ok=1; fi; done; [ $ok = 1 ] || r=FORA_$f; done; echo $r",
       "espera": "SO_ALLOWLIST",
       "tipo": "guarda"
     },
@@ -177,6 +178,12 @@ Frente F1d. Antes de apagar `@/lib/clientes/resolver-chave`, os importadores que
       "espera": "NAO_AFROUXOU",
       "tipo": "guarda"
     },
+    {
+      "descricao": "anti-afrouxamento: test/nps-reacao-resposta.test.ts (entrou na allowlist em 10/10 so para trocar o vi.mock do resolver antigo por @/lib/clientes/resolver-cliente) mantem >= 13 it(/test( e >= 35 expect( e nao tem .skip/.only/.todo (medido na main e na staging-auto em 10/10: 13 it(, 0 test(, 35 expect(, 0 skip/only/todo)",
+      "cmd": "f=test/nps-reacao-resposta.test.ts; [ -f \"$f\" ] || { echo APAGOU_$f; exit 0; }; i=$(grep -cF 'it(' \"$f\" || true); t=$(grep -cF 'test(' \"$f\" || true); e=$(grep -cF 'expect(' \"$f\" || true); s=$(grep -cE '[.](skip|only|todo)[(]' \"$f\" || true); [ $(( ${i:-0} + ${t:-0} )) -ge 13 ] && [ \"${e:-0}\" -ge 35 ] && [ \"${s:-x}\" = 0 ] && echo CONTAGEM_MANTIDA || echo CAIU_${i:-x}_${t:-x}_${e:-x}_${s:-x}",
+      "espera": "CONTAGEM_MANTIDA",
+      "tipo": "guarda"
+    },
     {
       "descricao": "avaliador: os arquivos do pacote nao importam mais @/lib/clientes/resolver-chave, usam o resolver unico com o mesmo comportamento (sem vinculo, 404/erro), lote em vez de consulta por item. REPROVE se: erro vira vazio; comportamento de sem vinculo mudou; assercao afrouxada; arquivo fora da allowlist.",
       "cmd": "",
```

**Números da guarda.** Medidos em 10/10 no disco e em `origin/main` e `origin/staging-auto`, os
três iguais: `test/nps-reacao-resposta.test.ts` tem **13** `it(`, **0** `test(`, **35** `expect(`
e **0** `.skip/.only/.todo`. A guarda exige `it(`+`test(` >= 13, `expect(` >= 35 e zero
skip/only/todo. Ela segue o formato de piso numérico do 711b3 (`CONTAGEM_MANTIDA` / `CAIU_…`),
com `|| true` e `${x:-…}` para não depender de set -u.

**Fora do pedido literal.** Mudei também o `cmd` do critério "so arquivos da allowlist foram
tocados". Ele tem a allowlist escrita à mão: sem o novo caminho, editar o teste daria
`FORA_test/nps-reacao-resposta.test.ts` e o 840 reprovaria de novo. A mudança é só acrescentar
esse caminho à lista. Se a regra "não mude nenhum outro critério" tiver que valer à letra,
revertam essa troca. Mas aí o ticket bloqueia de novo.

**Prova da guarda.** Rodei o cmd como o executor roda: `set -euo pipefail` e `eval` em subshell
com `|| true`. Usei cópias temporárias do teste no scratchpad.

```
atual -> CONTAGEM_MANTIDA
menos_um_expect -> CAIU_13_0_34_0
menos_um_it -> CAIU_12_0_35_0
com_skip -> CAIU_12_0_35_1
com_only -> CAIU_13_0_35_1
apagado -> APAGOU_test/nps-reacao-resposta.test.ts
```

O objetivo não mudou. Ele já diz que trocar o alvo de `vi.mock` para o resolver único não é
afrouxar. A troca do mock no teste fica para o agente, quando o ticket rodar de novo.

## 929: diff

```diff
diff --git a/docs/fila/929-nichos-teses-aba.md b/docs/fila/929-nichos-teses-aba.md
index cca57d3..ad3f7fc 100644
--- a/docs/fila/929-nichos-teses-aba.md
+++ b/docs/fila/929-nichos-teses-aba.md
@@ -139,7 +139,7 @@ Ordem dos blocos e `data-testid`: `docs/roadmap/mockups/performance-tese/README.
     },
     {
       "descricao": "page.tsx continua sem seletor de periodo nem aria-label (o seletor mora na aba)",
-      "cmd": "test -f src/app/dashboard/performance/nichos-teses/nichos-teses-aba.tsx && s=$(grep -c '<SeletorPeriodo' src/app/dashboard/performance/page.tsx) && a=$(grep -cE 'aria-label|ariaLabel=' src/app/dashboard/performance/page.tsx) && t=$(grep -c '<SeletorPeriodo' src/app/dashboard/performance/nichos-teses/nichos-teses-aba.tsx); [ \"$s\" = 0 ] && [ \"$a\" = 0 ] && [ \"$t\" = 1 ] && echo PERIODO_NA_ABA || echo ST_${s}_${a}_${t:-0}",
+      "cmd": "test -f src/app/dashboard/performance/nichos-teses/nichos-teses-aba.tsx && s=$(grep -c '<SeletorPeriodo' src/app/dashboard/performance/page.tsx || true) && a=$(grep -cE 'aria-label|ariaLabel=' src/app/dashboard/performance/page.tsx || true) && t=$(grep -c '<SeletorPeriodo' src/app/dashboard/performance/nichos-teses/nichos-teses-aba.tsx || true); [ \"${s:-x}\" = 0 ] && [ \"${a:-x}\" = 0 ] && [ \"${t:-x}\" = 1 ] && echo PERIODO_NA_ABA || echo ST_${s:-x}_${a:-x}_${t:-x}",
       "espera": "PERIODO_NA_ABA"
     },
     {
```

**Prova do cmd novo.** É o mesmo harness (`set -euo pipefail` e `eval` em subshell com
`|| true`). Usei árvores temporárias com o `page.tsx` real copiado do repo. Para comparar, rodei
também o cmd antigo.

```
nao_feito:
  novo -> ST_x_x_x
  velho -> $SP/prova929.sh: line 10: s: unbound variable
feito:
  novo -> PERIODO_NA_ABA
  velho -> $SP/prova929.sh: line 10: a: unbound variable
page_com_seletor:
  novo -> ST_1_0_1
  velho -> ST_1_0_0
page_com_aria:
  novo -> ST_0_1_1
  velho -> $SP/prova929.sh: line 10: a: unbound variable
aba_sem_seletor:
  novo -> ST_0_0_0
  velho -> $SP/prova929.sh: line 10: a: unbound variable
aba_com_2_seletores:
  novo -> ST_0_0_2
  velho -> $SP/prova929.sh: line 10: a: unbound variable
```

- **nao_feito** é o estado antes do ticket, sem a aba. O cmd novo reprova com `ST_x_x_x`.
- **feito** é o estado certo. O cmd novo passa, e o antigo reproduz o erro do bloqueio: `a: unbound variable`.
- **Seletor ou aria-label no page.tsx, aba sem seletor, aba com 2 seletores:** o cmd novo reprova
  todos, com diagnóstico legível. Ele não ficou mais frouxo.

Nenhum outro critério do 929 mudou, e o `espera` continua `PERIODO_NA_ABA`.
