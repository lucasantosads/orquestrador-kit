# Relatório · sessão do kit · etapa 1 · o kit fica de pé

Repo `~/Projetos/orquestrador-kit`, branch `main`, 2026-09-08.
Base: `e6b3360` (importação do harness do conteudos-infinitos @711ab5e).

## O que mudou

O kit passou a rodar os próprios testes, sem depender do `node_modules` nem do
checkout do `conteudos-infinitos`. **Zero mudança no motor**: `git diff
e6b3360..HEAD -- scripts/orquestrador scripts/orq doutrina _referencia-ci` é vazio.
O que se moveu foi toolchain, fixtures de teste e documento.

A causa raiz de quase toda falha: o motor resolve a fila pelo diretório onde o
`lib.sh` MORA (`lib.sh:24` — `ROOT="${ORQ_EXEC_ROOT:-$(cd "$ORQ_LIB_DIR/../.." && pwd)}"`
— e `lib.sh:42` — `FILA_DIR="$MAIN_CHECKOUT/docs/fila"`). No CI isso caía num repo
com fila; no kit cai no kit, que não tem fila e nem deve ter — a fila é do repo
instalado. A saída, sem tocar o motor, foi dar aos testes um checkout de fixture
(`test/fixtures/checkout/`, exportado como `FX_CHECKOUT`).

## Commits (um por peça)

| sha | peça |
|---|---|
| `9f9e807` | K1 · toolchain do kit (package.json, vitest, tsconfig, gitignore) |
| `71cc719` | K2 · test/fixtures/orq-harness.ts, copiado do CI @711ab5e |
| `617d6ba` | K3 · vitest verde no kit (604 passam, 8 em quarentena) |
| `bdc7b2c` | K4 · docs/PECAS.md (backlog K5 a K15) e CHANGELOG da etapa 1 |

`git status -sb` no fim: `## main`, limpo. Nada foi pushado.

## Placar de testes

```
Test Files  24 passed (24)
     Tests  604 passed | 8 skipped (612)
```

`npx tsc --noEmit`: **limpo**, zero linha de saída.

## Quarentenas (8) — todas por K7, nenhuma por mudança de motor

Nenhuma asserção foi removida, afrouxada (`toBe` → `toBeDefined`) ou apagada.
Cada caso é `it.skip` com o motivo na linha acima; a tabela completa está em
`docs/QUARENTENA.md`.

**Balde 1 — exigem um checkout com `docs/fila` onde o `lib.sh` mora (5):**

| arquivo | caso |
|---|---|
| `orquestrador-agendamento.test.ts` | `sem claude no PATH: rc 127 e mensagem com o PATH usado` |
| `orquestrador-isolamento-teste.test.ts` | `event fora de ORQ_EXEC_ROOT não chega à trilha real, e diz por quê` |
| `orquestrador-isolamento-teste.test.ts` | `status_set fora do fixture não reescreve o STATUS real` |
| `orquestrador-isolamento-teste.test.ts` | `custo_registrar fora do fixture não toca o ledger real` |
| `orquestrador-isolamento-teste.test.ts` | `test-drenagem.sh: fixture recebe os eventos, produção não recebe nada` |

O wrapper e o `bashSemFixture` fazem `source lib.sh` (o segundo SEM `ORQ_EXEC_ROOT`,
de propósito: é o cenário do acidente). Sem config, o `jq` morre com rc 2 antes de a
asserção — `rc 127`, `escrita RECUSADA` — poder acontecer.

**Balde 2 — asseveram sobre a fila / roadmap do repo INSTALADO (3):**

| arquivo | caso | o que lê |
|---|---|---|
| `orquestrador-agendamento.test.ts` | `loga em docs/fila/runs/launchd.log, que o git ignora` | `docs/fila/runs/.gitignore` |
| `orquestrador-gates.test.ts` | `nenhum ticket da fila usa mais "main...HEAD" em critério de escopo` | `grep` em `docs/fila/*.md` |
| `orquestrador-liberacoes.test.ts` | `lint-mapa.py passa sem WARN sobre liberações` | `docs/roadmap/{mapa.json,MAPA.md}` + `docs/fila/*` |

Dar fixture ao balde 2 seria tautologia — o teste passaria a asseverar sobre um
arquivo escrito por mim. Quarentena é o honesto.

## Testes shell — rc de cada um

Rodados com `ORQ_EXEC_ROOT="$(mktemp -d)"` e `ORQ_TESTE=1`. `test-preflight.sh` não
rodou (regra da sessão). Nenhum dos três chama a API: o `test-retry-worktree.sh`
stuba `claude_run` (linha 218).

| script | rc | o que exige |
|---|---|---|
| `test-lib-config.sh` | **2** | `docs/fila/000-config.json` DENTRO do `ORQ_EXEC_ROOT` que recebe — ele não copia o config, espera achá-lo |
| `test-drenagem.sh` | **2** | `$CHECKOUT_REAL/docs/fila/000-config.json` (linhas 25 e 29): monta o próprio `ORQ_EXEC_ROOT` e copia o config do checkout — ignora o que eu passo |
| `test-retry-worktree.sh` | **2** | idem, linhas 32 e 36 |

Os três morrem na mesma linha: `jq: error: Could not open file .../docs/fila/000-config.json`.
Conforme a instrução, foram **reportados, não construídos** — a fixture de repo é K7.

## O que ficou de fora, e por quê

- **A fixture de repo.** É K7 e a instrução mandou não construí-la agora. É o nó do
  backlog: destrava as 8 quarentenas e os três shell tests de uma vez.
- **`test/db.ts`.** Não entra e não é pendência: **não existe no CI**. A string
  `from './db.js'` em `orquestrador-enforcement.test.ts:300` está dentro de um
  argumento — é linha de um diff sintético que o teste passa ao enforcement, não um
  import. Nenhum import do kit cita `db.js`.
- **`test/fixtures/index.ts`.** Existe no CI, nenhum teste do kit o importa.
- **Qualquer mudança de motor.** É a etapa 2, com teste que prova.

## Notas de decisão

- **Versões.** `package.json` usa os mesmos ranges do `package.ci.json`
  (`@types/node ^22.20.0`, `tsx ^4.19.0`, `typescript ^5.6.0`, `vitest ^2.1.0`).
  Resolvido no kit: 22.20.1 / 4.23.13 / 5.9.3 / 2.1.9; no CI: 22.20.0 / 4.22.4 /
  5.9.3 / 2.1.9. Nenhuma dependência de runtime — os testes e os scripts do motor só
  importam `node:*` e `vitest`.
- **`tsconfig.json`** inclui `test` e `scripts` (o do CI incluía `src`/`tests` do app)
  e exclui `_referencia-ci`. Mesmos `compilerOptions`, inclusive `strict` e
  `noUncheckedIndexedAccess`.
- **Caminhos que mudaram de lugar na importação** foram apontados para o arquivo do
  kit, não para uma cópia: `docs/orquestrador/launchd.md` → `docs/launchd.md`;
  `docs/orquestrador/skill/EXECUTOR.md` → `doutrina/EXECUTOR.md`. Os testes seguem
  asseverando sobre o documento de verdade.
- **`.gitignore`** ganhou `!test/fixtures/**/*.log`: `events-quebrado.log` é fixture
  (a trilha corrompida que o `reparar-trilha.sh` conserta), e o `*.log` a deixava
  fora do git.

## Próximo passo

Merge e push são do Lucas. Aqui é `main` direto — o kit ainda não tem loop nem
branch alvo. A etapa 2 começa por onde o backlog manda: K5 (`instalar.sh --verificar`),
e K7 assim que a fixture de repo valer o investimento.

---

# Diff cru, por commit


## 9f9e807 — K1: toolchain do kit (package.json, vitest, tsconfig, gitignore)

### mensagem

```
K1: toolchain do kit (package.json, vitest, tsconfig, gitignore)

O kit passa a rodar os próprios testes sem depender do checkout do CI.

- package.json: orquestrador-kit, private, type module (igual ao
  _referencia-ci/package.ci.json), scripts test / test:watch / typecheck.
  devDependencies com os MESMOS ranges do CI: @types/node ^22.20.0,
  tsx ^4.19.0, typescript ^5.6.0, vitest ^2.1.0. Nenhuma dependência
  runtime: os testes e os scripts do motor só importam node: e vitest.
- vitest.config.ts: derivado do de referência, sem o `tests/` (suíte de
  ingestão do app do CI, que não existe aqui).
- tsconfig.json: mesmos compilerOptions do CI; include = test + scripts
  (o do CI incluía src/tests do app); _referencia-ci fora.
- .gitignore: só o que é do kit.

Pronto quando (verificado): `npx vitest run` executa — 24 arquivos,
todos vermelhos por falta do harness e do config, que é K2/K3 — e
`npx tsc --noEmit` roda até o fim.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01RGxA7pTuEPZ9cSSuuFcd5Z

```

### stat

```
 .gitignore        |    5 +
 package-lock.json | 2021 +++++++++++++++++++++++++++++++++++++++++++++++++++++
 package.json      |   21 +
 tsconfig.json     |   23 +
 vitest.config.ts  |   10 +
 5 files changed, 2080 insertions(+)
```

### diff

```diff
diff --git a/.gitignore b/.gitignore
new file mode 100644
index 0000000..f6720e1
--- /dev/null
+++ b/.gitignore
@@ -0,0 +1,5 @@
+node_modules/
+docs/fila/runs/
+*.log
+.DS_Store
+.claude/settings.local.json
diff --git a/package.json b/package.json
new file mode 100644
index 0000000..29b29a5
--- /dev/null
+++ b/package.json
@@ -0,0 +1,21 @@
+{
+  "name": "orquestrador-kit",
+  "version": "2.1.0",
+  "private": true,
+  "type": "module",
+  "description": "Motor do orquestrador autônomo: uma implementação, N instalações",
+  "engines": {
+    "node": ">=20"
+  },
+  "scripts": {
+    "test": "vitest run",
+    "test:watch": "vitest",
+    "typecheck": "tsc --noEmit"
+  },
+  "devDependencies": {
+    "@types/node": "^22.20.0",
+    "tsx": "^4.19.0",
+    "typescript": "^5.6.0",
+    "vitest": "^2.1.0"
+  }
+}
diff --git a/tsconfig.json b/tsconfig.json
new file mode 100644
index 0000000..b0c7166
--- /dev/null
+++ b/tsconfig.json
@@ -0,0 +1,23 @@
+{
+  "compilerOptions": {
+    "target": "ES2022",
+    "module": "NodeNext",
+    "moduleResolution": "NodeNext",
+    "lib": ["ES2022"],
+    "types": ["node"],
+    "strict": true,
+    "noUncheckedIndexedAccess": true,
+    "exactOptionalPropertyTypes": true,
+    "noImplicitOverride": true,
+    "verbatimModuleSyntax": true,
+    "resolveJsonModule": true,
+    "esModuleInterop": true,
+    "skipLibCheck": true,
+    "forceConsistentCasingInFileNames": true,
+    "noEmit": true,
+    "outDir": "dist",
+    "rootDir": "."
+  },
+  "include": ["test", "scripts"],
+  "exclude": ["node_modules", "dist", "_referencia-ci"]
+}
diff --git a/vitest.config.ts b/vitest.config.ts
new file mode 100644
index 0000000..e5c504c
--- /dev/null
+++ b/vitest.config.ts
@@ -0,0 +1,10 @@
+import { defineConfig } from 'vitest/config';
+
+export default defineConfig({
+  test: {
+    // Só test/: o kit não tem o `tests/` (suíte de ingestão) do repo de origem.
+    include: ['test/**/*.test.ts'],
+    environment: 'node',
+    globals: false,
+  },
+});
(package-lock.json: 2021 linhas, omitido — gerado por `npm install`)
```

## 71cc719 — K2: test/fixtures/orq-harness.ts, copiado do CI @711ab5e

### mensagem

```
K2: test/fixtures/orq-harness.ts, copiado do CI @711ab5e

17 dos 24 arquivos de teste importam `./fixtures/orq-harness.js`; o
extrator do harness não o trouxe. Copiado do conteudos-infinitos no
mesmo commit 711ab5e, byte-idêntico (blob db20a21a, conferido por
`git hash-object` contra `git rev-parse 711ab5e:<path>`). Sem edição:
ele importa só `node:*`, então não arrastou mais nada do test/ do CI.

`test/db.ts` não entra e não fica pendente: não existe no CI. O
`from './db.js'` de orquestrador-enforcement.test.ts:300 está DENTRO de
uma string — é linha de um diff sintético que o teste passa ao
enforcement, não um import. Nenhum import do kit cita db.js.

Pronto quando (verificado): todo import relativo de test/*.ts resolve
para arquivo existente pela convenção .js -> .ts.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01RGxA7pTuEPZ9cSSuuFcd5Z

```

### stat

```
 ORIGEM.md                    |  17 +++++++
 test/fixtures/orq-harness.ts | 109 +++++++++++++++++++++++++++++++++++++++++++
 2 files changed, 126 insertions(+)
```

### diff

```diff
diff --git a/ORIGEM.md b/ORIGEM.md
index 8d93f58..5a963bf 100644
--- a/ORIGEM.md
+++ b/ORIGEM.md
@@ -90,3 +90,20 @@ package.json -> _referencia-ci/package.ci.json
 tsconfig.json -> _referencia-ci/tsconfig.json
 vitest.config.ts -> _referencia-ci/vitest.config.ts
 ```
+
+## Adendo · 2026-09-08 · K2 (helpers de teste que ficaram no CI)
+
+O extrator trouxe `test/*.test.ts` mas não os helpers que eles importam. Copiados
+depois, do mesmo commit 711ab5e do conteudos-infinitos:
+
+| origem no CI | destino no kit | blob sha (CI @711ab5e) |
+|---|---|---|
+| `test/fixtures/orq-harness.ts` | `test/fixtures/orq-harness.ts` | `db20a21a6532f994e6dc4f60505517b03aff5e44` |
+
+Cópia byte-idêntica (`git hash-object` do kit == `git rev-parse 711ab5e:<path>` do
+CI). O harness importa só `node:*`, então não arrastou mais nada do `test/` do CI.
+
+`test/db.ts` NÃO entra no kit e não é pendência: não existe no CI. A string
+`from './db.js'` que aparece em `test/orquestrador-enforcement.test.ts:300` é
+conteúdo de um diff SINTÉTICO passado como argumento para o enforcement — não é
+um import. Nenhuma linha de import do kit referencia `db.js`.
diff --git a/test/fixtures/orq-harness.ts b/test/fixtures/orq-harness.ts
new file mode 100644
index 0000000..db20a21
--- /dev/null
+++ b/test/fixtures/orq-harness.ts
@@ -0,0 +1,109 @@
+/**
+ * Fixture de harness do orquestrador: um checkout FALSO, fora de git, para os
+ * testes de lib.sh / local-loop.sh / scripts/orq.
+ *
+ * Por que fora de git: lib.sh resolve MAIN_CHECKOUT por
+ * `git rev-parse --git-common-dir` e cai em ROOT só quando o diretório NÃO é
+ * repositório. Rodar os testes contra um dir versionado faria o lib.sh ler (e,
+ * nos casos de escrita, MEXER em) docs/fila do checkout principal — que é a
+ * fonte única da fila real. O fixture é sempre um dir temporário puro.
+ */
+import { spawnSync } from 'node:child_process';
+import { mkdirSync, mkdtempSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
+import { tmpdir } from 'node:os';
+import { join, dirname } from 'node:path';
+
+export const REPO_ROOT = join(import.meta.dirname, '..', '..');
+export const LIB = join(REPO_ROOT, 'scripts', 'orquestrador', 'lib.sh');
+
+export interface Ticket {
+  id: string;
+  slug?: string;
+  status?: string;
+  dependencias?: string[];
+  frente?: string;
+  bloco?: string;
+  [k: string]: unknown;
+}
+
+/** Cria o fixture: docs/fila/{000-config.json,runs/} + os tickets pedidos. */
+export function criarFixture(tickets: Ticket[] = []): string {
+  const raiz = mkdtempSync(join(tmpdir(), 'orq-fx-'));
+  mkdirSync(join(raiz, 'docs', 'fila', 'runs'), { recursive: true });
+  // Config REAL: os testes têm que falhar quando o config muda de forma
+  // incompatível, não passar contra uma cópia congelada.
+  escrever(
+    join(raiz, 'docs', 'fila', '000-config.json'),
+    readFileSync(join(REPO_ROOT, 'docs', 'fila', '000-config.json'), 'utf8'),
+  );
+  for (const t of tickets) escreverTicket(raiz, t);
+  return raiz;
+}
+
+export function escrever(caminho: string, conteudo: string): void {
+  mkdirSync(dirname(caminho), { recursive: true });
+  writeFileSync(caminho, conteudo);
+}
+
+/** Ticket no formato do repo: prosa + bloco ```json``` que é a fonte de máquina. */
+export function escreverTicket(raiz: string, t: Ticket): string {
+  // Defaults primeiro, ticket por cima: o caso do teste manda, e campos que ele
+  // não cita ganham um valor plausível em vez de sumir.
+  const json = {
+    objetivo: 'fixture',
+    pathspec_allowlist: ['src/nada.ts'],
+    criterios_aceite: [],
+    ...t,
+    id: t.id,
+    slug: t.slug ?? `fixture-${t.id}`,
+    status: t.status ?? 'pendente',
+    dependencias: t.dependencias ?? [],
+  };
+  const caminho = join(raiz, 'docs', 'fila', `${t.id}-${json.slug}.md`);
+  escrever(caminho, `# ${t.id}\n\nfixture.\n\n\`\`\`json\n${JSON.stringify(json, null, 2)}\n\`\`\`\n`);
+  return caminho;
+}
+
+export function liberacoes(raiz: string, conteudo: unknown): void {
+  escrever(join(raiz, 'docs', 'fila', 'liberacoes.json'), JSON.stringify(conteudo, null, 2));
+}
+
+/**
+ * Roda um script bash com o lib.sh carregado e ORQ_EXEC_ROOT no fixture.
+ * Devolve { rc, stdout, stderr } — stderr importa: `log` escreve nele.
+ */
+export function bashNoFixture(
+  raiz: string,
+  corpo: string,
+  extra: Record<string, string> = {},
+): { rc: number; stdout: string; stderr: string } {
+  // lib.sh liga `set -euo pipefail`; nos testes rc != 0 é resultado esperado de
+  // metade dos casos, então errexit sai DEPOIS do source também.
+  const script = [`export ORQ_EXEC_ROOT="${raiz}"`, `source "${LIB}"`, 'set +e', corpo].join('\n');
+  const r = spawnSync('bash', ['-c', script], {
+    encoding: 'utf8',
+    cwd: raiz,
+    env: { ...process.env, ...extra },
+  });
+  return { rc: r.status ?? 1, stdout: r.stdout ?? '', stderr: r.stderr ?? '' };
+}
+
+/** Igual ao bashNoFixture, mas junta stdout+stderr (para asserção sobre log). */
+export function bashComLog(raiz: string, corpo: string): { rc: number; saida: string } {
+  const r = bashNoFixture(raiz, corpo);
+  return { rc: r.rc, saida: `${r.stdout}${r.stderr}` };
+}
+
+/** Roda o scripts/orq REAL com o fixture como checkout. */
+export function orq(raiz: string, ...args: string[]): { rc: number; out: string; err: string } {
+  const r = spawnSync(join(REPO_ROOT, 'scripts', 'orq'), args, {
+    encoding: 'utf8',
+    cwd: raiz,
+    env: { ...process.env, ORQ_EXEC_ROOT: raiz },
+  });
+  return { rc: r.status ?? 1, out: r.stdout ?? '', err: r.stderr ?? '' };
+}
+
+export function ler(caminho: string): string {
+  return existsSync(caminho) ? readFileSync(caminho, 'utf8') : '';
+}
```

## 617d6ba — K3: vitest verde no kit (604 passam, 8 em quarentena)

### mensagem

```
K3: vitest verde no kit (604 passam, 8 em quarentena)

O kit roda os próprios testes. Zero mudança em scripts/orquestrador/**.

Fixtures copiadas do CI @711ab5e, sem edição:
  test/fixtures/{claude-envelope,criterios,runs-201,trilha}/  (já eram
  fixtures de teste lá; o extrator não as trouxe)
  test/fixtures/checkout/docs/fila/{000-config.json,liberacoes.json,
  _TEMPLATE.md}  (de _referencia-ci/ e do docs/fila do CI)

`FX_CHECKOUT` (novo export do orq-harness) é o checkout MÍNIMO de fixture:
o análogo, dentro do kit, do repo instalado que o motor espera achar. O kit
não tem fila — ela é do repo alvo —, então tudo que os testes liam de
`REPO_ROOT/docs/fila` agora leem de lá. Mesma ideia para os CLIs que
recebem a raiz por argumento (decisao-cli, juiz --run-cli) e para o
`source executor.sh` do gates.test.ts, que ganhou ORQ_EXEC_ROOT num tmp.

Caminhos que mudaram de lugar na importação, apontados para o arquivo do
kit (mesmo documento, não cópia): docs/orquestrador/launchd.md ->
docs/launchd.md; docs/orquestrador/skill/EXECUTOR.md -> doutrina/EXECUTOR.md.

.gitignore: exceção `!test/fixtures/**/*.log` — events-quebrado.log é
fixture, não log de execução, e o `*.log` o deixava fora.

8 casos em quarentena (docs/QUARENTENA.md), todos por K7 (fixture de repo),
nenhum por mudança de motor: 5 porque o lib.sh resolve a fila pelo diretório
onde ELE mora (lib.sh:24,42) e o kit não tem docs/fila; 3 porque asseveram
sobre a fila/roadmap do repo instalado. Nenhuma asserção foi removida,
afrouxada ou apagada — só `it.skip` com o motivo na linha acima.

Placar: 24 arquivos, 604 passam, 8 skip (612). `npx tsc --noEmit` limpo.

Shell tests, todos rc 2, mesma causa (relatados, não construídos — K7):
  test-lib-config.sh      espera docs/fila/000-config.json dentro do
                          ORQ_EXEC_ROOT que recebe
  test-drenagem.sh        copia $CHECKOUT_REAL/docs/fila/000-config.json
                          (linhas 25,29) e monta o próprio ORQ_EXEC_ROOT
  test-retry-worktree.sh  idem (linhas 32,36)

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01RGxA7pTuEPZ9cSSuuFcd5Z

```

### stat

```
 .gitignore                                         |   4 +
 docs/QUARENTENA.md                                 |  48 ++
 test/fixtures/checkout/docs/fila/000-config.json   | 460 ++++++++++++++++++
 test/fixtures/checkout/docs/fila/_TEMPLATE.md      |  85 ++++
 test/fixtures/checkout/docs/fila/liberacoes.json   |  11 +
 test/fixtures/claude-envelope/conexao-recusada.txt |   2 +
 test/fixtures/claude-envelope/rate-limit-429.txt   |   2 +
 test/fixtures/criterios/lote8-246-250.json         | 527 +++++++++++++++++++++
 test/fixtures/orq-harness.ts                       |  15 +-
 test/fixtures/runs-201/PROCEDENCIA.md              |  28 ++
 test/fixtures/runs-201/attempt-0.criterios.txt     |  70 +++
 test/fixtures/runs-201/attempt-0.gates.txt         |   6 +
 test/fixtures/runs-201/attempt-1.enforcement.json  |   9 +
 test/fixtures/runs-201/attempt-2.gates.txt         |   5 +
 test/fixtures/runs-201/vitest-falha.saida.txt      |  33 ++
 test/fixtures/trilha/events-quebrado.log           | 130 +++++
 test/fixtures/trilha/permissao-negada-234.cmd      |  23 +
 test/orquestrador-agendamento.test.ts              |   8 +-
 test/orquestrador-custo.test.ts                    |   4 +-
 test/orquestrador-decisao.test.ts                  |   2 +-
 test/orquestrador-disparo-congelado.test.ts        |   4 +-
 test/orquestrador-enforcement.test.ts              |   2 +-
 test/orquestrador-envelope.test.ts                 |   4 +-
 test/orquestrador-gate-ticket.test.ts              |   5 +-
 test/orquestrador-gates.test.ts                    |  17 +-
 test/orquestrador-isolamento-teste.test.ts         |  12 +-
 test/orquestrador-juiz.test.ts                     |  12 +-
 test/orquestrador-liberacoes.test.ts               |  10 +-
 test/orquestrador-lock.test.ts                     |   2 +-
 test/orquestrador-notificacao.test.ts              |   4 +-
 test/orquestrador-pausa-e-prompt.test.ts           |   6 +-
 test/orquestrador-refatiar.test.ts                 |  10 +-
 test/orquestrador-tools-derivadas.test.ts          |   3 +-
 test/orquestrador-trilha.test.ts                   |   6 +-
 34 files changed, 1523 insertions(+), 46 deletions(-)
```

### diff

```diff
diff --git a/.gitignore b/.gitignore
index f6720e1..30bc6d5 100644
--- a/.gitignore
+++ b/.gitignore
@@ -1,5 +1,9 @@
 node_modules/
 docs/fila/runs/
 *.log
+# Exceção: `events-quebrado.log` é FIXTURE de teste (a trilha corrompida que o
+# reparar-trilha.sh conserta), não log de execução. Sem esta linha o `*.log`
+# acima o deixa de fora e o teste passa a depender de arquivo não versionado.
+!test/fixtures/**/*.log
 .DS_Store
 .claude/settings.local.json
diff --git a/docs/QUARENTENA.md b/docs/QUARENTENA.md
new file mode 100644
index 0000000..767f122
--- /dev/null
+++ b/docs/QUARENTENA.md
@@ -0,0 +1,48 @@
+# Quarentena
+
+Testes que vieram do harness do conteudos-infinitos e ainda não rodam no kit.
+Nenhum foi afrouxado: as asserções estão intactas, só o caso está `it.skip` com o
+motivo na linha acima. Sair da quarentena = a peça citada ficar pronta e o `skip`
+voltar a ser `it`.
+
+Regra: verde por afrouxamento não conta. Nada aqui perdeu asserção, trocou `toBe`
+por `toBeDefined` nem foi apagado.
+
+## Aberta
+
+### Balde 1 · exigem um checkout com `docs/fila` no lugar onde o `lib.sh` mora
+
+O `lib.sh` resolve a fila pelo diretório do PRÓPRIO arquivo
+(`ROOT="${ORQ_EXEC_ROOT:-$(cd "$ORQ_LIB_DIR/../.." && pwd)}"`, `lib.sh:24`, e
+`FILA_DIR="$MAIN_CHECKOUT/docs/fila"`, `lib.sh:42`). Rodar o motor a partir de
+`<kit>/scripts/orquestrador/` faz o kit ser o checkout — e o kit não tem fila.
+Sai com **K7** (fixture de repo), não com mudança de motor.
+
+| Arquivo | Caso | Motivo |
+|---|---|---|
+| `test/orquestrador-agendamento.test.ts` | `sem claude no PATH: rc 127 e mensagem com o PATH usado` | O wrapper faz `source lib.sh` antes do check de PATH; o source morre em `jq` (rc 2) por falta de `docs/fila/000-config.json`, então o rc 127 nunca chega. |
+| `test/orquestrador-isolamento-teste.test.ts` | `event fora de ORQ_EXEC_ROOT não chega à trilha real, e diz por quê` | `bashSemFixture` faz `source lib.sh` SEM `ORQ_EXEC_ROOT` de propósito (é o cenário do acidente); sem config o `jq` morre antes do `escrita RECUSADA`. |
+| `test/orquestrador-isolamento-teste.test.ts` | `status_set fora do fixture não reescreve o STATUS real` | Idem. |
+| `test/orquestrador-isolamento-teste.test.ts` | `custo_registrar fora do fixture não toca o ledger real` | Idem. |
+| `test/orquestrador-isolamento-teste.test.ts` | `test-drenagem.sh: fixture recebe os eventos, produção não recebe nada` | Roda `test-drenagem.sh` de verdade, que copia `$CHECKOUT_REAL/docs/fila/000-config.json` (`test-drenagem.sh:25,29`). |
+
+### Balde 2 · asseveram sobre a fila / roadmap do repo INSTALADO
+
+Dado local do repo alvo, não comportamento do motor. Também sai com **K7**, contra
+o repo de fixture.
+
+| Arquivo | Caso | Motivo |
+|---|---|---|
+| `test/orquestrador-agendamento.test.ts` | `loga em docs/fila/runs/launchd.log, que o git ignora` | Lê `docs/fila/runs/.gitignore` do repo instalado. A primeira asserção (o wrapper cita o caminho) é do motor e passa; a segunda é do repo. |
+| `test/orquestrador-gates.test.ts` | `nenhum ticket da fila usa mais "main...HEAD" em critério de escopo` | `grep` em `docs/fila/*.md` — os tickets são do repo instalado. |
+| `test/orquestrador-liberacoes.test.ts` | `lint-mapa.py passa sem WARN sobre liberações` | `lint-mapa.py` abre `docs/roadmap/mapa.json`, `docs/roadmap/MAPA.md`, `docs/fila/000-config.json`, `docs/fila/liberacoes.json` e `docs/fila/*.md` do repo instalado (`scripts/roadmap/lint-mapa.py:2-4,97,117`). |
+
+## Fora do vitest, mesma causa
+
+`test-lib-config.sh`, `test-drenagem.sh` e `test-retry-worktree.sh` saem com rc 2
+pelo mesmo motivo. Não estão em `it.skip` (não são vitest); o que cada um exige
+está no relatório da etapa 1 e em `docs/PECAS.md`, peça K7.
+
+## Saíram da quarentena
+
+(nenhum ainda)
diff --git a/test/fixtures/orq-harness.ts b/test/fixtures/orq-harness.ts
index db20a21..d5f9128 100644
--- a/test/fixtures/orq-harness.ts
+++ b/test/fixtures/orq-harness.ts
@@ -16,6 +16,14 @@ import { join, dirname } from 'node:path';
 export const REPO_ROOT = join(import.meta.dirname, '..', '..');
 export const LIB = join(REPO_ROOT, 'scripts', 'orquestrador', 'lib.sh');
 
+/**
+ * Checkout MÍNIMO de fixture: o análogo, dentro do kit, do repo instalado que o
+ * motor espera encontrar (docs/fila/000-config.json, liberacoes.json). O kit não
+ * tem fila própria — ela é do repo alvo —, então tudo que o motor leria de
+ * `docs/fila` do checkout, os testes leem daqui.
+ */
+export const FX_CHECKOUT = join(import.meta.dirname, 'checkout');
+
 export interface Ticket {
   id: string;
   slug?: string;
@@ -30,11 +38,12 @@ export interface Ticket {
 export function criarFixture(tickets: Ticket[] = []): string {
   const raiz = mkdtempSync(join(tmpdir(), 'orq-fx-'));
   mkdirSync(join(raiz, 'docs', 'fila', 'runs'), { recursive: true });
-  // Config REAL: os testes têm que falhar quando o config muda de forma
-  // incompatível, não passar contra uma cópia congelada.
+  // Config do checkout de fixture (FX_CHECKOUT). No repo de origem esta linha
+  // lia docs/fila/000-config.json do próprio checkout; o kit não tem fila —
+  // ela é do repo instalado —, então a referência mora em test/fixtures/.
   escrever(
     join(raiz, 'docs', 'fila', '000-config.json'),
-    readFileSync(join(REPO_ROOT, 'docs', 'fila', '000-config.json'), 'utf8'),
+    readFileSync(join(FX_CHECKOUT, 'docs', 'fila', '000-config.json'), 'utf8'),
   );
   for (const t of tickets) escreverTicket(raiz, t);
   return raiz;
diff --git a/test/orquestrador-agendamento.test.ts b/test/orquestrador-agendamento.test.ts
index 252f627..aed3db1 100644
--- a/test/orquestrador-agendamento.test.ts
+++ b/test/orquestrador-agendamento.test.ts
@@ -14,7 +14,7 @@ import { spawnSync } from 'node:child_process';
 import { escrever, REPO_ROOT } from './fixtures/orq-harness.js';
 
 const WRAPPER = join(REPO_ROOT, 'scripts', 'orquestrador', 'launchd-run.sh');
-const DOC = join(REPO_ROOT, 'docs', 'orquestrador', 'launchd.md');
+const DOC = join(REPO_ROOT, 'docs', 'launchd.md');
 const fonte = readFileSync(WRAPPER, 'utf8');
 /** Só o CÓDIGO: comentário citando o dono de um estado não é ler esse estado. */
 const codigo = fonte
@@ -47,7 +47,8 @@ function rodarWrapper(temClaude: boolean, temNode = true) {
 }
 
 describe('o wrapper falha alto quando falta ferramenta', () => {
-  it('sem claude no PATH: rc 127 e mensagem com o PATH usado (não roda o loop)', () => {
+  // QUARENTENA (K7): o wrapper faz `source lib.sh`, que resolve a fila pelo diretório onde o lib.sh MORA — exige um checkout com docs/fila/000-config.json; a fixture de repo é a peça K7.
+  it.skip('sem claude no PATH: rc 127 e mensagem com o PATH usado (não roda o loop)', () => {
     const r = rodarWrapper(false);
     expect(r.rc).toBe(127);
     expect(r.saida).toMatch(/'claude' fora do PATH/);
@@ -101,7 +102,8 @@ describe('o wrapper NÃO duplica estado do loop', () => {
     expect(fonte).toMatch(/command -v caffeinate/); // ausência não pode quebrar
   });
 
-  it('loga em docs/fila/runs/launchd.log, que o git ignora', () => {
+  // QUARENTENA (K7): assevera sobre docs/fila/runs/.gitignore do repo INSTALADO; o kit não tem fila própria.
+  it.skip('loga em docs/fila/runs/launchd.log, que o git ignora', () => {
     expect(fonte).toContain('docs/fila/runs/launchd.log');
     expect(readFileSync(join(REPO_ROOT, 'docs', 'fila', 'runs', '.gitignore'), 'utf8')).toContain('*');
   });
diff --git a/test/orquestrador-custo.test.ts b/test/orquestrador-custo.test.ts
index 02a210e..3e07538 100644
--- a/test/orquestrador-custo.test.ts
+++ b/test/orquestrador-custo.test.ts
@@ -10,11 +10,11 @@ import { describe, it, expect } from 'vitest';
 import { readFileSync, existsSync } from 'node:fs';
 import { join } from 'node:path';
 import { spawnSync } from 'node:child_process';
-import { bashComLog, bashNoFixture, criarFixture, escrever, ler, REPO_ROOT } from './fixtures/orq-harness.js';
+import { FX_CHECKOUT, REPO_ROOT, bashComLog, bashNoFixture, criarFixture, escrever, ler } from './fixtures/orq-harness.js';
 
 const custoFile = (raiz: string) => join(raiz, 'docs', 'fila', 'runs', 'custo.json');
 const runs = (raiz: string, ...p: string[]) => join(raiz, 'docs', 'fila', 'runs', ...p);
-const CFG = JSON.parse(readFileSync(join(REPO_ROOT, 'docs', 'fila', '000-config.json'), 'utf8'));
+const CFG = JSON.parse(readFileSync(join(FX_CHECKOUT, 'docs', 'fila', '000-config.json'), 'utf8'));
 const HOJE = new Date().toISOString().slice(0, 10);
 
 const FILA = [{ id: '901', slug: 'da-vez', status: 'pendente' }, { id: '902', slug: 'depois', status: 'pendente' }];
diff --git a/test/orquestrador-decisao.test.ts b/test/orquestrador-decisao.test.ts
index 0f05be2..9aaee0f 100644
--- a/test/orquestrador-decisao.test.ts
+++ b/test/orquestrador-decisao.test.ts
@@ -19,7 +19,7 @@ import {
 } from '../scripts/orquestrador/decisao.js';
 import type { DecisaoConfig, SinalTentativa } from '../scripts/orquestrador/decisao.js';
 
-const CONFIG_PATH = join(import.meta.dirname, '..', 'docs', 'fila', '000-config.json');
+const CONFIG_PATH = join(import.meta.dirname, 'fixtures', 'checkout', 'docs', 'fila', '000-config.json');
 const cfg = JSON.parse(readFileSync(CONFIG_PATH, 'utf8')) as DecisaoConfig;
 
 const sinal = (s: Partial<SinalTentativa> = {}): SinalTentativa => ({
diff --git a/test/orquestrador-disparo-congelado.test.ts b/test/orquestrador-disparo-congelado.test.ts
index 7463bf3..407718e 100644
--- a/test/orquestrador-disparo-congelado.test.ts
+++ b/test/orquestrador-disparo-congelado.test.ts
@@ -18,11 +18,11 @@ import { describe, it, expect } from 'vitest';
 import { writeFileSync, readFileSync, existsSync } from 'node:fs';
 import { join } from 'node:path';
 import { spawnSync } from 'node:child_process';
-import { criarFixture, bashNoFixture, ler, orq, REPO_ROOT } from './fixtures/orq-harness.js';
+import { FX_CHECKOUT, REPO_ROOT, bashNoFixture, criarFixture, ler, orq } from './fixtures/orq-harness.js';
 
 const LAUNCHD = join(REPO_ROOT, 'scripts', 'orquestrador', 'launchd-run.sh');
 const TIMEOUT = JSON.parse(
-  readFileSync(join(REPO_ROOT, 'docs', 'fila', '000-config.json'), 'utf8'),
+  readFileSync(join(FX_CHECKOUT, 'docs', 'fila', '000-config.json'), 'utf8'),
 ).claude_timeout_secs as number;
 
 const agora = () => Math.floor(Date.now() / 1000);
diff --git a/test/orquestrador-enforcement.test.ts b/test/orquestrador-enforcement.test.ts
index 6185486..cab8b41 100644
--- a/test/orquestrador-enforcement.test.ts
+++ b/test/orquestrador-enforcement.test.ts
@@ -19,7 +19,7 @@ import {
 } from '../scripts/orquestrador/enforcement-core.js';
 import type { EnforceConfig, TipoViolacao } from '../scripts/orquestrador/enforcement-core.js';
 
-const CONFIG_PATH = join(import.meta.dirname, '..', 'docs', 'fila', '000-config.json');
+const CONFIG_PATH = join(import.meta.dirname, 'fixtures', 'checkout', 'docs', 'fila', '000-config.json');
 const cfg = JSON.parse(readFileSync(CONFIG_PATH, 'utf8')) as EnforceConfig;
 
 /** Monta um diff unificado sintético para um arquivo. */
diff --git a/test/orquestrador-envelope.test.ts b/test/orquestrador-envelope.test.ts
index e84b216..57f771e 100644
--- a/test/orquestrador-envelope.test.ts
+++ b/test/orquestrador-envelope.test.ts
@@ -24,12 +24,12 @@
 import { describe, it, expect } from 'vitest';
 import { readFileSync } from 'node:fs';
 import { join } from 'node:path';
-import { bashNoFixture, criarFixture, escrever, REPO_ROOT } from './fixtures/orq-harness.js';
+import { FX_CHECKOUT, REPO_ROOT, bashNoFixture, criarFixture, escrever } from './fixtures/orq-harness.js';
 import { decidirDesfecho, detectarCausaInfra } from '../scripts/orquestrador/decisao.js';
 import type { DecisaoConfig, SinalTentativa } from '../scripts/orquestrador/decisao.js';
 
 const cfg = JSON.parse(
-  readFileSync(join(REPO_ROOT, 'docs', 'fila', '000-config.json'), 'utf8'),
+  readFileSync(join(FX_CHECKOUT, 'docs', 'fila', '000-config.json'), 'utf8'),
 ) as DecisaoConfig;
 
 const envelopeReal = (nome: string) =>
diff --git a/test/orquestrador-gate-ticket.test.ts b/test/orquestrador-gate-ticket.test.ts
index 63a8fee..15631d7 100644
--- a/test/orquestrador-gate-ticket.test.ts
+++ b/test/orquestrador-gate-ticket.test.ts
@@ -27,10 +27,11 @@ import {
   segmentarCmd,
   validarTicket,
 } from '../scripts/orquestrador/gate-ticket.js';
+import { FX_CHECKOUT } from './fixtures/orq-harness.js';
 
 const REPO_ROOT = join(import.meta.dirname, '..');
 const GATE = join(REPO_ROOT, 'scripts', 'orquestrador', 'gate-ticket.ts');
-const CFG_REAL = readFileSync(join(REPO_ROOT, 'docs', 'fila', '000-config.json'), 'utf8');
+const CFG_REAL = readFileSync(join(FX_CHECKOUT, 'docs', 'fila', '000-config.json'), 'utf8');
 
 interface Ticket {
   id: string;
@@ -290,7 +291,7 @@ describe('check 6 · leitura do cmd: aspas, segmentos, redirecionamento', () =>
 });
 
 describe('check 6 · o veto, a isenção e o que a isenção NÃO alcança', () => {
-  const cfg = carregarCfg(join(REPO_ROOT, 'docs', 'fila'));
+  const cfg = carregarCfg(join(FX_CHECKOUT, 'docs', 'fila'));
 
   it('a chave lida é `proibido_no_cmd` (é o nome que está no disco)', () => {
     expect(cfg.proibido_no_cmd).toContain('$(');
diff --git a/test/orquestrador-gates.test.ts b/test/orquestrador-gates.test.ts
index 0b1c351..5cae80c 100644
--- a/test/orquestrador-gates.test.ts
+++ b/test/orquestrador-gates.test.ts
@@ -17,7 +17,7 @@ import {
 } from '../scripts/orquestrador/gates.js';
 import type { GatesConfig, Execucao, Placar } from '../scripts/orquestrador/gates.js';
 
-const CONFIG_PATH = join(import.meta.dirname, '..', 'docs', 'fila', '000-config.json');
+const CONFIG_PATH = join(import.meta.dirname, 'fixtures', 'checkout', 'docs', 'fila', '000-config.json');
 const cfg = JSON.parse(readFileSync(CONFIG_PATH, 'utf8')) as GatesConfig;
 
 const ok = (saida = ''): Execucao => ({ exitCode: 0, saida, ms: 1 });
@@ -257,6 +257,12 @@ function rodarCriterio(cmd: string, espera: string): { falhos: string; saida: st
     'tmp="$(mktemp -d)"',
     `trap 'rm -rf "$tmp"' EXIT`,
     'mkdir -p "$tmp/wt" "$tmp/run"',
+    // O executor lê docs/fila/000-config.json do CHECKOUT. O kit não tem fila
+    // (ela é do repo instalado), então o dir temporário é o checkout: mesmo
+    // padrão de fixtures/orq-harness.ts.
+    'mkdir -p "$tmp/docs/fila"',
+    `cp "${CONFIG_PATH}" "$tmp/docs/fila/000-config.json"`,
+    'export ORQ_EXEC_ROOT="$tmp"',
     `cat > "$tmp/ticket.md" <<'FIXTURE'`,
     '```json',
     JSON.stringify(
@@ -302,6 +308,12 @@ describe('critérios do executor — strip de ANSI', () => {
 
   it('REGRESSÃO: sem o strip a mesma saída NÃO casava — a cegueira era do harness', () => {
     const script = [
+      'set -euo pipefail',
+      'tmp="$(mktemp -d)"',
+      `trap 'rm -rf "$tmp"' EXIT`,
+      'mkdir -p "$tmp/docs/fila"',
+      `cp "${CONFIG_PATH}" "$tmp/docs/fila/000-config.json"`,
+      'export ORQ_EXEC_ROOT="$tmp"',
       'export EXECUTOR_SOURCED=1',
       `source "${REPO_ROOT}/scripts/orquestrador/executor.sh"`,
       `crua="$(${PLACAR_COLORIDO})"`,
@@ -331,7 +343,8 @@ describe('critérios do executor — BASE_REF', () => {
     expect(falhos).toBe('');
   });
 
-  it('nenhum ticket da fila usa mais "main...HEAD" em critério de escopo', () => {
+  // QUARENTENA (K7): grep em docs/fila/*.md — os tickets são do repo instalado, não do kit.
+  it.skip('nenhum ticket da fila usa mais "main...HEAD" em critério de escopo', () => {
     const cmds = execFileSync('bash', ['-c', `grep -h '"cmd"' docs/fila/*.md || true`], {
       encoding: 'utf8',
       cwd: REPO_ROOT,
diff --git a/test/orquestrador-isolamento-teste.test.ts b/test/orquestrador-isolamento-teste.test.ts
index 43028f0..c253259 100644
--- a/test/orquestrador-isolamento-teste.test.ts
+++ b/test/orquestrador-isolamento-teste.test.ts
@@ -47,7 +47,8 @@ function bashSemFixture(corpo: string): { rc: number; saida: string } {
 describe('ORQ_TESTE=1 recusa escrita fora do fixture', () => {
   const marca = `MARCA-0D-${process.pid}-${Date.now()}`;
 
-  it('event fora de ORQ_EXEC_ROOT não chega à trilha real, e diz por quê', () => {
+  // QUARENTENA (K7): `source lib.sh` sem ORQ_EXEC_ROOT exige que o checkout onde o lib.sh mora tenha docs/fila/000-config.json.
+  it.skip('event fora de ORQ_EXEC_ROOT não chega à trilha real, e diz por quê', () => {
     const antes = ler(TRILHA_REAL);
     const { saida } = bashSemFixture(`event 999 ${marca}`);
     expect(saida).toContain('escrita RECUSADA');
@@ -59,7 +60,8 @@ describe('ORQ_TESTE=1 recusa escrita fora do fixture', () => {
     expect(depois.startsWith(antes)).toBe(true);
   });
 
-  it('status_set fora do fixture não reescreve o STATUS real', () => {
+  // QUARENTENA (K7): mesmo motivo — o lib.sh sem ORQ_EXEC_ROOT resolve a fila pelo próprio diretório.
+  it.skip('status_set fora do fixture não reescreve o STATUS real', () => {
     const antes = ler(STATUS_REAL);
     const { saida } = bashSemFixture(`status_set "ultimo=${marca}"`);
     expect(saida).toContain('escrita RECUSADA');
@@ -67,7 +69,8 @@ describe('ORQ_TESTE=1 recusa escrita fora do fixture', () => {
     if (antes) expect(existsSync(STATUS_REAL)).toBe(true);
   });
 
-  it('custo_registrar fora do fixture não toca o ledger real', () => {
+  // QUARENTENA (K7): mesmo motivo — o lib.sh sem ORQ_EXEC_ROOT resolve a fila pelo próprio diretório.
+  it.skip('custo_registrar fora do fixture não toca o ledger real', () => {
     const { saida } = bashSemFixture(
       `printf '{"total_cost_usd":9.99}\\n' > /tmp/${marca}.json; custo_registrar executor 999 0 /tmp/${marca}.json; rm -f /tmp/${marca}.json`,
     );
@@ -123,7 +126,8 @@ describe('cada test-*.sh declara o isolamento ANTES de carregar o lib', () => {
 });
 
 describe('o test-*.sh rodando de verdade não deixa marca na trilha real', () => {
-  it('test-drenagem.sh: fixture recebe os eventos, produção não recebe nada', () => {
+  // QUARENTENA (K7): roda test-drenagem.sh de verdade, que precisa de um checkout com docs/fila.
+  it.skip('test-drenagem.sh: fixture recebe os eventos, produção não recebe nada', () => {
     const antes = ler(TRILHA_REAL);
     const r = spawnSync('bash', [join(ORQ_DIR, 'test-drenagem.sh')], { encoding: 'utf8', cwd: REPO_ROOT });
     expect(r.status).toBe(0);
diff --git a/test/orquestrador-juiz.test.ts b/test/orquestrador-juiz.test.ts
index 94f31ff..6c58b70 100644
--- a/test/orquestrador-juiz.test.ts
+++ b/test/orquestrador-juiz.test.ts
@@ -13,7 +13,7 @@ import { describe, it, expect } from 'vitest';
 import { readFileSync, existsSync } from 'node:fs';
 import { join } from 'node:path';
 import { spawnSync } from 'node:child_process';
-import { criarFixture, escrever, ler, REPO_ROOT } from './fixtures/orq-harness.js';
+import { FX_CHECKOUT, REPO_ROOT, criarFixture, escrever, ler } from './fixtures/orq-harness.js';
 import {
   classeDeRisco,
   modeloDoJuiz,
@@ -24,7 +24,7 @@ import {
 } from '../scripts/orquestrador/juiz.js';
 
 const CFG = JSON.parse(
-  readFileSync(join(REPO_ROOT, 'docs', 'fila', '000-config.json'), 'utf8'),
+  readFileSync(join(FX_CHECKOUT, 'docs', 'fila', '000-config.json'), 'utf8'),
 ) as JuizCfg & { politica_adiamento: { causas_que_adiam: string[] } };
 
 const RISCO_BASE = { arquivos: ['apps/web/src/app/home/page.tsx'], objetivo: 'ajusta o texto do card', diffLines: 40, retryFinal: false };
@@ -81,7 +81,7 @@ describe('LIXO é adiado, nunca reprovado', () => {
   });
 
   it('o parse do CLI sai com rc 3 (o código que o executor lê como ADIADO)', () => {
-    const r = spawnSync('npx', ['tsx', join(REPO_ROOT, 'scripts', 'orquestrador', 'juiz.ts'), '--run-cli', REPO_ROOT, 'parse'], {
+    const r = spawnSync('npx', ['tsx', join(REPO_ROOT, 'scripts', 'orquestrador', 'juiz.ts'), '--run-cli', FX_CHECKOUT, 'parse'], {
       input: envelope('nada de json aqui'),
       encoding: 'utf8',
     });
@@ -89,7 +89,7 @@ describe('LIXO é adiado, nunca reprovado', () => {
   });
 
   it('a fronteira está no decisao.ts: juizIlegivel ADIA e NÃO conta retry', () => {
-    const r = spawnSync('npx', ['tsx', join(REPO_ROOT, 'scripts', 'orquestrador', 'decisao-cli.ts'), REPO_ROOT, 'desfecho'], {
+    const r = spawnSync('npx', ['tsx', join(REPO_ROOT, 'scripts', 'orquestrador', 'decisao-cli.ts'), FX_CHECKOUT, 'desfecho'], {
       input: JSON.stringify({ exitCode: 0, saida: '', diffLines: 10, juizIlegivel: true }),
       encoding: 'utf8',
     });
@@ -100,7 +100,7 @@ describe('LIXO é adiado, nunca reprovado', () => {
   });
 
   it('NEGATIVO: sem o campo, o mesmo sinal segue aprovando como antes', () => {
-    const r = spawnSync('npx', ['tsx', join(REPO_ROOT, 'scripts', 'orquestrador', 'decisao-cli.ts'), REPO_ROOT, 'desfecho'], {
+    const r = spawnSync('npx', ['tsx', join(REPO_ROOT, 'scripts', 'orquestrador', 'decisao-cli.ts'), FX_CHECKOUT, 'desfecho'], {
       input: JSON.stringify({ exitCode: 0, saida: '', diffLines: 10 }),
       encoding: 'utf8',
     });
@@ -150,7 +150,7 @@ describe('modelo por classe de risco (custo-e-contexto §7)', () => {
   });
 
   it('o CLI devolve classe + modelo juntos (é o que o shell consome)', () => {
-    const r = spawnSync('npx', ['tsx', join(REPO_ROOT, 'scripts', 'orquestrador', 'juiz.ts'), '--run-cli', REPO_ROOT, 'nivel'], {
+    const r = spawnSync('npx', ['tsx', join(REPO_ROOT, 'scripts', 'orquestrador', 'juiz.ts'), '--run-cli', FX_CHECKOUT, 'nivel'], {
       input: JSON.stringify({ ...RISCO_BASE, arquivos: ['supabase/migrations/x.sql'] }),
       encoding: 'utf8',
     });
diff --git a/test/orquestrador-liberacoes.test.ts b/test/orquestrador-liberacoes.test.ts
index 25b7640..b74dcc7 100644
--- a/test/orquestrador-liberacoes.test.ts
+++ b/test/orquestrador-liberacoes.test.ts
@@ -78,7 +78,8 @@ describe('lint do mapa confere que o HARNESS lê o formato canônico', () => {
     expect(corpo).toContain('.tokens');
   });
 
-  it('lint-mapa.py passa sem WARN sobre liberações', () => {
+  // QUARENTENA (K7): lint-mapa.py lê docs/roadmap/{mapa.json,MAPA.md} e docs/fila/* do repo instalado.
+  it.skip('lint-mapa.py passa sem WARN sobre liberações', () => {
     const r = spawnSync('python3', ['scripts/roadmap/lint-mapa.py'], {
       encoding: 'utf8',
       cwd: REPO_ROOT,
@@ -88,15 +89,18 @@ describe('lint do mapa confere que o HARNESS lê o formato canônico', () => {
   });
 });
 
+// "arquivo REAL": no kit é a cópia do liberacoes.json do conteudos-infinitos em
+// test/fixtures/checkout/ — dado de verdade, não fabricado aqui. O kit não tem
+// fila própria; ela é do repo instalado.
 describe('o arquivo REAL do repo resolve as dependências que declara', () => {
   it('todo token de liberacoes.json está na forma canônica humano:<algo>', () => {
-    const lib = JSON.parse(readFileSync(join(REPO_ROOT, 'docs', 'fila', 'liberacoes.json'), 'utf8'));
+    const lib = JSON.parse(readFileSync(join(REPO_ROOT, 'test', 'fixtures', 'checkout', 'docs', 'fila', 'liberacoes.json'), 'utf8'));
     expect(Array.isArray(lib.tokens)).toBe(true);
     for (const t of lib.tokens) expect(t).toMatch(/^humano:/);
   });
 
   it('cada token do arquivo real resolve via liberacao_ok', () => {
-    const lib = JSON.parse(readFileSync(join(REPO_ROOT, 'docs', 'fila', 'liberacoes.json'), 'utf8'));
+    const lib = JSON.parse(readFileSync(join(REPO_ROOT, 'test', 'fixtures', 'checkout', 'docs', 'fila', 'liberacoes.json'), 'utf8'));
     const raiz = criarFixture([]);
     liberacoes(raiz, lib);
     for (const t of lib.tokens) {
diff --git a/test/orquestrador-lock.test.ts b/test/orquestrador-lock.test.ts
index 23c7063..32e0760 100644
--- a/test/orquestrador-lock.test.ts
+++ b/test/orquestrador-lock.test.ts
@@ -20,7 +20,7 @@ import {
 import { extractJsonBlock, readTickets, classificar } from '../scripts/orquestrador/fila-read.js';
 
 const RAIZ = join(import.meta.dirname, '..');
-const FILA_DIR = join(RAIZ, 'docs', 'fila');
+const FILA_DIR = join(RAIZ, 'test', 'fixtures', 'checkout', 'docs', 'fila');
 const CONFIG_PATH = join(FILA_DIR, '000-config.json');
 
 const config = JSON.parse(readFileSync(CONFIG_PATH, 'utf8')) as {
diff --git a/test/orquestrador-notificacao.test.ts b/test/orquestrador-notificacao.test.ts
index 4eb7761..a55bcdb 100644
--- a/test/orquestrador-notificacao.test.ts
+++ b/test/orquestrador-notificacao.test.ts
@@ -11,11 +11,11 @@ import { readFileSync, mkdtempSync, chmodSync } from 'node:fs';
 import { tmpdir } from 'node:os';
 import { join } from 'node:path';
 import { spawnSync } from 'node:child_process';
-import { bashNoFixture, criarFixture, escrever, ler, REPO_ROOT } from './fixtures/orq-harness.js';
+import { FX_CHECKOUT, REPO_ROOT, bashNoFixture, criarFixture, escrever, ler } from './fixtures/orq-harness.js';
 
 const LIB = join(REPO_ROOT, 'scripts', 'orquestrador', 'lib.sh');
 const notif = (raiz: string) => join(raiz, 'docs', 'fila', 'runs', 'notificacoes.log');
-const CFG = JSON.parse(readFileSync(join(REPO_ROOT, 'docs', 'fila', '000-config.json'), 'utf8'));
+const CFG = JSON.parse(readFileSync(join(FX_CHECKOUT, 'docs', 'fila', '000-config.json'), 'utf8'));
 
 /**
  * PATH de teste. Provar "osascript ausente" numa máquina macOS exige um PATH em
diff --git a/test/orquestrador-pausa-e-prompt.test.ts b/test/orquestrador-pausa-e-prompt.test.ts
index a96e43a..cfd3bee 100644
--- a/test/orquestrador-pausa-e-prompt.test.ts
+++ b/test/orquestrador-pausa-e-prompt.test.ts
@@ -9,7 +9,7 @@ import { describe, it, expect } from 'vitest';
 import { existsSync, readFileSync } from 'node:fs';
 import { join } from 'node:path';
 import { spawnSync } from 'node:child_process';
-import { criarFixture, escrever, ler, REPO_ROOT } from './fixtures/orq-harness.js';
+import { FX_CHECKOUT, REPO_ROOT, criarFixture, escrever, ler } from './fixtures/orq-harness.js';
 
 const LOOP = join(REPO_ROOT, 'scripts', 'orquestrador', 'local-loop.sh');
 const EXEC = join(REPO_ROOT, 'scripts', 'orquestrador', 'executor.sh');
@@ -111,7 +111,7 @@ describe('pausar_file presente encerra a drenagem em ocioso, sem erro', () => {
   });
 
   it('o caminho vem do config (pausar_file), não hardcoded', () => {
-    const cfg = JSON.parse(readFileSync(join(REPO_ROOT, 'docs', 'fila', '000-config.json'), 'utf8'));
+    const cfg = JSON.parse(readFileSync(join(FX_CHECKOUT, 'docs', 'fila', '000-config.json'), 'utf8'));
     expect(cfg.pausar_file).toBe('docs/fila/PAUSAR');
     const lib = readFileSync(join(REPO_ROOT, 'scripts', 'orquestrador', 'lib.sh'), 'utf8');
     expect(lib).toMatch(/CFG_PAUSAR_FILE=.*cfg '\.pausar_file'/);
@@ -221,7 +221,7 @@ describe('o executor aponta para EXECUTOR.md, não para a SKILL.md', () => {
   });
 
   it('o EXECUTOR.md real existe e continua curto (≤ 60 linhas, cat. 8 do pré-voo)', () => {
-    const f = join(REPO_ROOT, 'docs', 'orquestrador', 'skill', 'EXECUTOR.md');
+    const f = join(REPO_ROOT, 'doutrina', 'EXECUTOR.md');
     expect(existsSync(f)).toBe(true);
     expect(readFileSync(f, 'utf8').trimEnd().split('\n').length).toBeLessThanOrEqual(60);
   });
diff --git a/test/orquestrador-refatiar.test.ts b/test/orquestrador-refatiar.test.ts
index e308e06..7913c00 100644
--- a/test/orquestrador-refatiar.test.ts
+++ b/test/orquestrador-refatiar.test.ts
@@ -16,7 +16,7 @@ import { describe, it, expect } from 'vitest';
 import { readFileSync } from 'node:fs';
 import { join } from 'node:path';
 import { spawnSync } from 'node:child_process';
-import { criarFixture, escrever, ler, REPO_ROOT } from './fixtures/orq-harness.js';
+import { FX_CHECKOUT, REPO_ROOT, criarFixture, escrever, ler } from './fixtures/orq-harness.js';
 import { classificar } from '../scripts/orquestrador/fila-read.js';
 import {
   montarDiagnostico,
@@ -27,7 +27,7 @@ import {
 } from '../scripts/orquestrador/diagnostico.js';
 import { recorteDeFalha } from '../scripts/orquestrador/gates.js';
 
-const CFG = JSON.parse(readFileSync(join(REPO_ROOT, 'docs', 'fila', '000-config.json'), 'utf8'));
+const CFG = JSON.parse(readFileSync(join(FX_CHECKOUT, 'docs', 'fila', '000-config.json'), 'utf8'));
 const FIXT = join(REPO_ROOT, 'test', 'fixtures', 'runs-201');
 const fx = (f: string) => readFileSync(join(FIXT, f), 'utf8');
 
@@ -42,7 +42,7 @@ const TESTE_QUEBRADO = 'test/zz-captura-falha.test.ts';
 
 const decisao = (sinal: unknown) =>
   JSON.parse(
-    spawnSync('npx', ['tsx', join(REPO_ROOT, 'scripts', 'orquestrador', 'decisao-cli.ts'), REPO_ROOT, 'desfecho'], {
+    spawnSync('npx', ['tsx', join(REPO_ROOT, 'scripts', 'orquestrador', 'decisao-cli.ts'), FX_CHECKOUT, 'desfecho'], {
       input: JSON.stringify(sinal),
       encoding: 'utf8',
     }).stdout,
@@ -77,7 +77,7 @@ describe('reprovação MECÂNICA vira refatiar, sem consumir retry', () => {
   it('refatiar NÃO gera retry (o plano diz deveTentar=false)', () => {
     const r = spawnSync(
       'npx',
-      ['tsx', join(REPO_ROOT, 'scripts', 'orquestrador', 'decisao-cli.ts'), REPO_ROOT, 'retry', '0', 'sonnet'],
+      ['tsx', join(REPO_ROOT, 'scripts', 'orquestrador', 'decisao-cli.ts'), FX_CHECKOUT, 'retry', '0', 'sonnet'],
       { input: JSON.stringify({ desfecho: 'refatiar', causa: 'enforcement', motivo: 'x', contaComoRetry: false }), encoding: 'utf8' },
     );
     const plano = JSON.parse(r.stdout);
@@ -92,7 +92,7 @@ describe('reprovação MECÂNICA vira refatiar, sem consumir retry', () => {
     expect(v.causa).toBe('criterio_qualidade');
     expect(v.contaComoRetry).toBe(true);
     const plano = JSON.parse(
-      spawnSync('npx', ['tsx', join(REPO_ROOT, 'scripts', 'orquestrador', 'decisao-cli.ts'), REPO_ROOT, 'retry', '0', 'sonnet'], {
+      spawnSync('npx', ['tsx', join(REPO_ROOT, 'scripts', 'orquestrador', 'decisao-cli.ts'), FX_CHECKOUT, 'retry', '0', 'sonnet'], {
         input: JSON.stringify(v),
         encoding: 'utf8',
       }).stdout,
diff --git a/test/orquestrador-tools-derivadas.test.ts b/test/orquestrador-tools-derivadas.test.ts
index 58a84fa..d7f5651 100644
--- a/test/orquestrador-tools-derivadas.test.ts
+++ b/test/orquestrador-tools-derivadas.test.ts
@@ -17,11 +17,12 @@ import {
   prefixoSimples,
   toolsDoTicket,
 } from '../scripts/orquestrador/perfil.js';
+import { FX_CHECKOUT } from './fixtures/orq-harness.js';
 
 const REPO_ROOT = join(__dirname, '..');
 const EXECUTOR = join(REPO_ROOT, 'scripts', 'orquestrador', 'executor.sh');
 const CONFIG = JSON.parse(
-  readFileSync(join(REPO_ROOT, 'docs', 'fila', '000-config.json'), 'utf8'),
+  readFileSync(join(FX_CHECKOUT, 'docs', 'fila', '000-config.json'), 'utf8'),
 ) as { gates: { nome: string; cmd: string }[]; claude_max_turns: number };
 const GATES = CONFIG.gates.map((g) => g.cmd);
 
diff --git a/test/orquestrador-trilha.test.ts b/test/orquestrador-trilha.test.ts
index be4721d..082a51c 100644
--- a/test/orquestrador-trilha.test.ts
+++ b/test/orquestrador-trilha.test.ts
@@ -14,9 +14,9 @@ import { describe, it, expect } from 'vitest';
 import { readFileSync } from 'node:fs';
 import { join } from 'node:path';
 import { spawnSync } from 'node:child_process';
-import { criarFixture, escrever, ler, orq, REPO_ROOT } from './fixtures/orq-harness.js';
+import { FX_CHECKOUT, REPO_ROOT, criarFixture, escrever, ler, orq } from './fixtures/orq-harness.js';
 
-const CFG = JSON.parse(readFileSync(join(REPO_ROOT, 'docs', 'fila', '000-config.json'), 'utf8'));
+const CFG = JSON.parse(readFileSync(join(FX_CHECKOUT, 'docs', 'fila', '000-config.json'), 'utf8'));
 const TRAILER = CFG.executor.trailer_commit;
 const EXECUTOR = join(REPO_ROOT, 'scripts', 'orquestrador', 'executor.sh');
 const LOOP = join(REPO_ROOT, 'scripts', 'orquestrador', 'local-loop.sh');
@@ -115,7 +115,7 @@ describe('o prompt do executor cobra o trailer no commit do agente', () => {
   });
 
   it('EXECUTOR.md, o prefixo estável do prompt, já cobrava o mesmo trailer', () => {
-    const md = readFileSync(join(REPO_ROOT, 'docs', 'orquestrador', 'skill', 'EXECUTOR.md'), 'utf8');
+    const md = readFileSync(join(REPO_ROOT, 'doutrina', 'EXECUTOR.md'), 'utf8');
     expect(md).toContain(`${TRAILER}: <id>`);
   });
 });
(fixtures copiadas do CI sem edição, conteúdo omitido: test/fixtures/{checkout,claude-envelope,criterios,runs-201,trilha}/)
```

## bdc7b2c — K4: docs/PECAS.md (backlog K5 a K15) e CHANGELOG da etapa 1

### mensagem

```
K4: docs/PECAS.md (backlog K5 a K15) e CHANGELOG da etapa 1

PECAS.md no formato do CI (objetivo · evidência · teste; FEITAS /
PENDENTES). FEITAS: K1, K2, K3, K4. PENDENTES na ordem de execução:
K5 (instalar.sh --verificar), K6 (pureza), K7 (fixture), K8 (--novo /
--atualizar), K9 (contrato), K10 (doutrina v2), K11 (absorções),
1b (o gate executa o que hoje só lê), 1c (gate no loop), K12 (painel),
K13 (python -> TS), K14 (driver em Node), K15 (job único de launchd).

Cada evidência aponta para uma seção do docs/INVENTARIO-2026-09-07.md
ou para arquivo e linha no disco. As linhas citadas foram conferidas:
executor.sh:219,240,247 (`apps/web services/*/`, a premissa de monorepo
que K6 remove), lib.sh:24,42 (por que o kit sem fila não satisfazia o
motor), test-drenagem.sh:25,29 e test-retry-worktree.sh:32,36 (o
CHECKOUT_REAL que K7 fornece).

K7 é o nó: destrava as 8 quarentenas de K3 e os três shell tests.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01RGxA7pTuEPZ9cSSuuFcd5Z

```

### stat

```
 CHANGELOG.md  |  18 ++++++-
 docs/PECAS.md | 149 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
 2 files changed, 166 insertions(+), 1 deletion(-)
```

### diff

```diff
diff --git a/CHANGELOG.md b/CHANGELOG.md
index 234e13e..2939f7d 100644
--- a/CHANGELOG.md
+++ b/CHANGELOG.md
@@ -3,4 +3,20 @@
 ## 2.1.0-dev · 2026-09-08
 
 - Importa o harness do conteudos-infinitos @711ab5e (peças 0 a 13 e peça 1). Ver ORIGEM.md.
-- Ainda não instala em repo nenhum: instalar.sh, fixture e testes autônomos vêm nas próximas peças.
+- Ainda não instala em repo nenhum: instalar.sh e fixture vêm nas próximas peças (K5, K7).
+
+### Etapa 1 — o kit fica de pé (roda os próprios testes, sem o checkout do CI)
+
+- **K1** `9f9e807` — toolchain do kit: package.json, vitest.config.ts, tsconfig.json,
+  .gitignore e package-lock. devDependencies com os mesmos ranges do CI; nenhuma
+  dependência de runtime.
+- **K2** `71cc719` — `test/fixtures/orq-harness.ts` copiado do CI @711ab5e, byte-idêntico
+  (blob `db20a21a`). `test/db.ts` não entra: não existe no CI.
+- **K3** `617d6ba` — vitest verde: 24 arquivos, 604 passam, 8 em quarentena
+  (`docs/QUARENTENA.md`), `tsc --noEmit` limpo. `FX_CHECKOUT` é o checkout mínimo de
+  fixture que faz o papel do repo instalado. Zero mudança em `scripts/orquestrador/**`.
+- **K4** — `docs/PECAS.md` com o backlog K5→K15, e esta seção.
+
+Ainda vermelho, por falta da fixture de repo (K7): `test-lib-config.sh`,
+`test-drenagem.sh` e `test-retry-worktree.sh`, todos rc 2 — os três precisam de um
+checkout com `docs/fila`.
diff --git a/docs/PECAS.md b/docs/PECAS.md
new file mode 100644
index 0000000..60d4827
--- /dev/null
+++ b/docs/PECAS.md
@@ -0,0 +1,149 @@
+# PEÇAS — backlog do kit
+
+> **Backlog, não histórico.** O que já aconteceu e o porquê ficam no CHANGELOG e nos
+> commits. Aqui fica o que ainda vai acontecer, em ordem, e uma peça sai desta lista
+> quando o commit dela existe.
+>
+> **Formato de cada peça:** uma linha de objetivo · evidência (seção do inventário,
+> ou arquivo e linha no disco) · teste que prova. Sem os três, não é peça — é ideia.
+>
+> Escopo: o kit inteiro. `scripts/orquestrador/**`, `scripts/orq` e `doutrina/**` são o
+> MOTOR: mudança neles exige teste que prove a mudança, na peça que a pede.
+
+## FEITAS
+
+- **K1 · toolchain do kit.** `package.json` (orquestrador-kit, private, `type: module`),
+  `vitest.config.ts`, `tsconfig.json` e `.gitignore` próprios; devDependencies com os
+  mesmos ranges do CI (`@types/node ^22.20.0`, `tsx ^4.19.0`, `typescript ^5.6.0`,
+  `vitest ^2.1.0`) e nenhuma dependência de runtime — os testes e os scripts do motor
+  só importam `node:*` e `vitest`.
+  *Evidência:* `9f9e807`; `_referencia-ci/package.ci.json`, `_referencia-ci/vitest.config.ts`,
+  `_referencia-ci/tsconfig.json`. Antes disto o kit não tinha como rodar nada: dependia do
+  `node_modules` e do checkout do CI.
+  *Teste:* `npx vitest run` executa e `npx tsc --noEmit` roda até o fim.
+
+- **K2 · helpers de teste que ficaram no CI.** `test/fixtures/orq-harness.ts` copiado do
+  conteudos-infinitos @711ab5e, byte-idêntico (blob `db20a21a`), sem edição.
+  *Evidência:* `71cc719`; 17 dos 24 arquivos de teste importam `./fixtures/orq-harness.js`
+  e o extrator não o trouxe (`ORIGEM.md`, adendo K2). `test/db.ts` não entra: não existe no
+  CI — o `from './db.js'` de `test/orquestrador-enforcement.test.ts:300` está dentro de uma
+  string, é linha de diff sintético, não import.
+  *Teste:* todo import relativo de `test/*.ts` resolve para arquivo existente (`.js` → `.ts`).
+
+- **K3 · vitest verde.** `FX_CHECKOUT` (`test/fixtures/checkout/`) é o checkout mínimo de
+  fixture: o análogo, dentro do kit, do repo instalado que o motor espera achar. Tudo que os
+  testes liam de `REPO_ROOT/docs/fila` lê de lá; idem os CLIs que recebem a raiz por argumento
+  e o `source executor.sh`, que ganhou `ORQ_EXEC_ROOT` num tmp. Fixtures de teste do CI
+  (`claude-envelope`, `criterios`, `runs-201`, `trilha`) copiadas sem edição.
+  *Evidência:* `617d6ba`; `scripts/orquestrador/lib.sh:24` (`ROOT` sai do diretório onde o
+  lib.sh mora) e `lib.sh:42` (`FILA_DIR="$MAIN_CHECKOUT/docs/fila"`) — é por isso que o kit,
+  sem fila própria, não satisfazia o motor. Zero mudança em `scripts/orquestrador/**`.
+  *Teste:* `npx vitest run` — 24 arquivos, 604 passam, 8 em quarentena (`docs/QUARENTENA.md`),
+  todos por K7 e nenhum por mudança de motor; `npx tsc --noEmit` limpo.
+
+- **K4 · PECAS.md e CHANGELOG do kit.** Este arquivo, com o backlog de K5 a K15 na ordem de
+  execução, mais a seção 2.1.0-dev do CHANGELOG com uma linha por peça e o sha.
+  *Evidência:* `docs/INVENTARIO-2026-09-07.md` §4 (decisões), §5 (quem doa o quê) e §8 (plano
+  da fase 1). Backlog que só existe no chat some com o chat.
+  *Teste:* não tem teste próprio (é documento); o que ele afirma sobre o disco está verificado
+  por `grep`/`cat` nas linhas citadas em cada peça.
+
+## PENDENTES
+
+- **K5 · `instalar.sh --verificar`.** `diff -r` entre `scripts/orquestrador/**`, `scripts/orq` e
+  `doutrina/` do kit e `scripts/orquestrador/**`, `scripts/orq` e `docs/orquestrador/skill/` de um
+  repo, ignorando o plist instanciado e `runs/`; imprime `idêntico ao kit <VERSAO>` ou a lista de
+  diferenças; rc 0 ou 1.
+  *Evidência:* inventário §4 decisão 2 (vendorizado por cópia, hash conferido no pré-voo) e §8
+  pronto-quando. O mapa origem→destino já está em `ORIGEM.md`.
+  *Teste:* contra o checkout do CI em 711ab5e devolve idêntico.
+
+- **K6 · pureza.** `scripts/kit/pureza.sh`: grep em CÓDIGO (não em comentário) de
+  `scripts/orquestrador/**` e `scripts/orq` por premissa de repo. As duas reais hoje:
+  (a) diretórios do monorepo fixos no `executor.sh` (`apps/web`, `services/*/`, linhas 219, 240 e
+  247) → viram `toolchain.pacotes` no config, ou leitura dos `workspaces` do `package.json`;
+  (b) nome e label do plist template (`scripts/orquestrador/com.conteudos.orquestrador.plist.template`)
+  → `com.orquestrador.plist.template` com `{{LABEL}}`, e `instalar-launchd.sh` deriva o label do
+  config.
+  *Evidência:* inventário §8 item 5; as linhas citadas, no disco.
+  *Teste:* pureza = 0 em código; comentário de proveniência pode ficar.
+
+- **K7 · fixture.** `fixture/`: repo mínimo (package.json + vitest + um ticket trivial +
+  `000-config.json` schema 2) que atravessa o loop ponta a ponta localmente, sem push. É onde
+  `--novo` é exercitado.
+  *Evidência:* inventário §8 item 2 e pronto-quando. **Destrava as 8 quarentenas de K3**
+  (`docs/QUARENTENA.md`) e os três shell tests, que hoje saem rc 2 pedindo um checkout com
+  `docs/fila`: `test-lib-config.sh` (espera o config dentro do `ORQ_EXEC_ROOT` que recebe),
+  `test-drenagem.sh:25,29` e `test-retry-worktree.sh:32,36` (copiam
+  `$CHECKOUT_REAL/docs/fila/000-config.json` e montam o próprio `ORQ_EXEC_ROOT`).
+  *Teste:* o fixture atravessa o loop até a sua `staging-auto`; os 8 `it.skip` voltam a `it` e
+  passam; os três shell tests devolvem rc 0.
+
+- **K8 · `instalar.sh --novo | --atualizar`, com `--dry-run` e relatório.** Migra
+  `liberacoes.json` (duas listas do Comarka → objetos, `em` → `liberado_em`, prefixo `humano:`),
+  pause file (`.orq-pause` → `PAUSAR`), config (mapa de chaves legadas → schema 2 limpo) e o bloco
+  JSON dos tickets pendentes (prosa intacta). Nunca reescreve objetivo de ticket.
+  *Evidência:* inventário §4 decisões 3 e 4, §6 itens 9 e 12, §8 item 4.
+  *Teste:* migração de cada artefato legado, com o caso NEGATIVO de que a prosa e o objetivo não
+  se movem.
+
+- **K9 · contrato.** `CONTRATO.md`, `ticket.schema.json`, `liberacoes.schema.json` e o enum
+  `motivo_categoria` (os 8 baldes do `orq-telemetria.py` do Comarka). `risco` é derivado (passo 6
+  do gate), não exigido do humano.
+  *Evidência:* inventário §4 decisões 4 e 9, §8 item 5.
+  *Teste:* o schema recusa os defeitos reais catalogados no §6 item 8 (ID com sufixo, `tipo`
+  ausente, três gerações de schema).
+
+- **K10 · doutrina v2.** A regra "nunca copie scripts de outro repo" reescrita para "motor único
+  versionado sem premissa local; o que varia vive no config"; faixa de IDs por bloco → sequencial
+  global + campo `bloco`; canal padrão de notificação = arquivo; `PLAYBOOK-seed` triado (universal
+  aqui, local marcado `[local]` no repo).
+  *Evidência:* inventário §4 decisões 6 e 8, §8 item 6.
+  *Teste:* a doutrina não contradiz o config nem o CONTRATO (lint da doutrina).
+
+- **K11 · absorções, uma sessão cada, teste junto.** Pré-voo do Actus (`pre-voo.mjs` → TS, chamado
+  pelo preflight); enforcement como união por config (Comarka: C0 com DDL/TRIGGER/VIEW, janela de
+  comentário, isenção de fixture; Actus: faixa de migrations com faixa reservada, escrita por
+  schema/tabela, colunas-sombra); `detectarAdiamento` do Actus em `decisao.ts` (stdout vazio, texto
+  real, case-insensitive); placar/telemetria do Actus em `orq custo`; `perfis_tools` do Comarka como
+  mapa opcional.
+  *Evidência:* inventário §5 (a tabela de doação) e §8 item 3.
+  *Teste:* o teste que vem junto com cada doador, listado no §5.
+
+- **1b · o gate executa o que hoje só lê.** `alvo` que já passa contra HEAD, `guarda` que já falha,
+  `recon[]` — em worktree descartável com timeout.
+  *Evidência:* inventário §4 decisão 9 (o validador recusa `alvo` que já passa e `guarda` que já
+  falha) — hoje o gate lê esses campos sem executá-los.
+  *Teste:* caso bom e caso mau por campo, com o timeout provado.
+
+- **1c · gate no loop e checks que faltaram.** O `drenar` roda o gate no próximo pendente antes de
+  gastar agente (violação = `bloqueado` com nota e evento na trilha); sobreposição de allowlist por
+  glob, não por igualdade de string; "migration nunca depende do próprio token";
+  `gate_ticket.modo_prefixo: isentar | exigir`; `contar_eventos` casando `( |$)` depois do nome do
+  evento.
+  *Evidência:* inventário §5 (linha do validador de ticket).
+  *Teste:* um caso por check, mais o NEGATIVO do gate barrando antes do agente.
+
+- **K12 · painel.** `orq-server.py` + `orq-painel.py` do Comarka entram como `painel/`, refatorados
+  para ler só o contrato (STATUS, events, custo, liberacoes v2, PAUSAR, tickets); `LABELS` →
+  `~/.orq/repos.json`; ações via `orq`; notificação nativa desligada; zero `if repo`.
+  *Evidência:* inventário §4 decisão 18, §6 item 6 (1.935 linhas Python, dois scripts, mora dentro
+  do Comarka e ainda notifica o macOS).
+  *Teste:* o painel lê um repo de fixture sem nenhum ramo por nome de repo.
+
+- **K13 · python → TS.** `scripts/roadmap/lint-mapa.py` vira TS; triagem de `orq-telemetria.py`,
+  `orq-granularidade.py`, `orq-contrato.py` e `gera_tickets.py` (Comarka) na fase do Comarka.
+  *Evidência:* inventário §4 decisão 19 (só o painel fica em Python).
+  *Teste:* os 10 checks do lint, um a um, no TS.
+
+- **K14 · driver em Node.** Reescrita de `executor.sh`, `local-loop.sh` e `lib.sh` em TS, com os 25
+  cenários de drenagem do Actus como spec (órfão, lock roubado, morte do executor, auth quebrada,
+  claude mudo, cooldown, infra aborta a fila). Só depois de K5 a K11.
+  *Evidência:* inventário §4 decisão 1 (driver em Node = peça 2 do kit) e §5 (os 25 cenários viram
+  a spec).
+  *Teste:* os 25 cenários.
+
+- **K15 · job único de launchd.** `com.comarka.orq.loop` lendo `~/.orq/repos.json`, lock global,
+  `max_tickets_por_passada`, NO-GO num repo pula para o próximo; plists por repo saem na adoção.
+  *Evidência:* inventário §4 decisão 5, §6 item 14 (plists `.bak`/`.repo-noturno` soltos).
+  *Teste:* dois repos no `repos.json`, NO-GO no primeiro, o segundo drena.
```
