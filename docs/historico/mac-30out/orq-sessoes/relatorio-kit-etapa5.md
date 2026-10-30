# Relatório — kit do Orquestrador, etapa 5

**Data:** 2026-09-08 · **Repo:** `~/Projetos/orquestrador-kit`, branch `main`
**Commits:** `9e97fc4..55c760b` (7, um por peça) · **VERSAO:** `2.1.0-dev`
**Estado:** `git status -sb` limpo, `## main...origin/main [ahead 7]`. **Nada foi pushado.**

O que esta etapa entrega: o kit passa a **instalar em repo que não é o CI**
(`instalar.sh --novo`) e a **migrar** o que os outros dois repos têm em formato
antigo (`--atualizar --migrar`), com a doutrina reescrita para dizer o que o
código passou a fazer.

---

## 0. O PASSO 0 mandou no desenho

Nada aqui saiu de memória nem dos briefs anteriores. O levantamento foi `jq` no
disco dos três repos (só leitura), e três achados decidiram peças inteiras:

1. **`liberacoes.json` tem QUATRO formas vivas, e nenhuma é a do schema.**
   O CI guarda strings COM o prefixo `humano:`; o **Actus guarda os 5 tokens dele
   SEM prefixo** — e, até este commit, **nenhum deles resolvia dependência
   nenhuma, em silêncio**. É o incidente de 2026-09-03 acontecendo de novo num
   repo onde ninguém olhou. O Comarka tem as DUAS listas.
2. **Actus e Comarka estão em `$schema_versao: 1`**, e o Comarka escreve
   `gates[].tipo: "tsc_baseline"` — nome que `gates.ts:151` não conhece. Com ele,
   os 3 erros herdados em `qualificacao*` reprovariam TODO ticket, para sempre,
   sem o motivo aparecer em lugar nenhum.
3. **250 `recon_esperado` e 39 `tentativas_consumidas` no disco**, 42 deles entre
   os pendentes do Comarka.

O que os briefs de 07 e 08/09 diziam sobre os formatos era hipótese; o `jq` é o
fato, e onde os dois discordaram, o disco ganhou.

---

## 1. Diff cru

```
$ git diff --shortstat e52a66e..HEAD
 38 files changed, 5135 insertions(+), 149 deletions(-)

$ git log --oneline main | head -7
55c760b K10: doutrina v2                                   13 arq, +729 -57
195c50d K8b-6: instalar.sh --novo <repo>                    7 arq, +418 -33
56b98db K8b-5: o bloco JSON dos tickets pendentes           7 arq, +640  -6
4f26240 K8b-4: config schema 1 -> 2, por tabela explícita   8 arq, +1149 -7
9cf3638 K8b-3: pause file, .gitignore e o --migrar          5 arq, +360 -28
c20f556 K8b-2: orq liberar e a migração de liberações      11 arq, +1145 -15
9e97fc4 K8b-1: o motor lê liberacoes.json (formas vivas)   12 arq, +748 -57
```

**Arquivos novos** (9 de motor, 5 de teste, 4 de fixture/doc):

```
scripts/orquestrador/liberacoes-core.ts     as 4 formas vivas -> v2 (puro)
scripts/orquestrador/liberar-cli.ts         orq liberar: a decisão, pura
scripts/orquestrador/migrar-comum.ts        as 5 regras de TODA migração
scripts/orquestrador/migrar-liberacoes.ts   liberacoes.json -> v2
scripts/orquestrador/migrar-config.ts       000-config.json 1 -> 2
scripts/orquestrador/config-tabela.ts       a tabela de->para, à MÃO
scripts/orquestrador/migrar-tickets.ts      o bloco JSON dos pendentes
doutrina/templates/PECAS-seed.md            o PECAS que o --novo cria
docs/DOUTRINA-v2.md                         o diff de decisões v1 -> v2
test/doutrina-v2.test.ts                    o lint da doutrina
test/orquestrador-liberacoes-formatos.test.ts
test/orquestrador-liberar-migrar.test.ts
test/orquestrador-migrar-config.test.ts
test/orquestrador-migrar-tickets.test.ts
test/fixtures/liberacoes/{PROCEDENCIA.md,3 arquivos REAIS byte a byte}
```

---

## 2. Testes, crus

```
$ npx vitest run --reporter=dot 2>&1 | tail -6

 Test Files  34 passed (34)
      Tests  831 passed (831)
   Start at  16:12:48
   Duration  16.49s (transform 518ms, setup 0ms, collect 11.81s, tests 109.13s, environment 3ms, prepare 988ms)
```

```
$ bash scripts/kit/test-shell.sh
rc(test-retry-worktree.sh) = 0

== placar ==
  rc=0  test-lib-config.sh
  rc=0  test-drenagem.sh
  rc=0  test-retry-worktree.sh
TODOS OS SCRIPTS SAÍRAM rc 0
```

```
$ bash scripts/kit/test-instalar.sh
  | 20 diferença(s)
  (rc 1 — informativo)

TODOS OS CHECKS PASSARAM
```

`npx tsc --noEmit`: limpo. O `test-instalar.sh` roda **119 checks** em 11 casos
(a → j), 41 deles novos nesta etapa.

**Vermelho antes, por peça** (o número é de casos falhando com o teste escrito e
o código ainda não):

| Peça | Vermelhos | Como foi produzido |
|---|---|---|
| K8b-1 | **16** de 28 | teste novo contra o motor antigo |
| K8b-2 | **9** de 37 | módulos presentes, fiação ausente (verbo fora do `orq`, fixture em v1, schema sem `origem`) |
| K8b-3 | **21** de 32 | `instalar.sh` revertido |
| K8b-4 | **8** de 9 (caso i5b) | `config-tabela.ts` e `migrar-config.ts` removidos |
| K8b-5 | **3** de 6 (caso i5c) | `migrar-tickets.ts` removido |
| K8b-6 | **30** de 33 (caso j) | `--novo` revertido |
| K10 | **15** de 30 | doutrina v1 no disco |

Onde a peça é código NOVO, a suíte inteira não carrega sem os módulos — isso está
dito em cada commit, e o vermelho informativo foi produzido revertendo só a
fiação, não os módulos.

---

## 3. "O que o CI faz diferente", por peça de motor

A pergunta é a mesma em todas: *esta mudança altera o comportamento do
conteudos-infinitos?* A resposta, em todas: **não** — e cada uma tem prova.

| Peça | O que o CI faz diferente | Prova |
|---|---|---|
| **K8b-1** | nada | os 7 tokens reais do CI resolvem antes e depois, e **nenhum grava aviso** (a forma dele não é legada). O caso já estava VERDE no vermelho-antes, que é o que mostra que a mudança não o alcançou. |
| **K8b-2** | nada no motor | o `liberacoes.json` do CI é v1 canônica, então `orq liberar` o **RECUSA** até a migração rodar — e é isso que se quer: a recusa impede o arquivo de ficar em duas formas ao mesmo tempo. |
| **K8b-3** | nada | o `--migrar` acusa `docs/fila/PAUSAR` faltando no `.gitignore` do CI, e é acusação **correta**: depois da migração o kill switch muda de nome e apareceria no `git status` no meio de uma pausa. |
| **K8b-4** | nada | com o config do CI migrado, a linha `GATE` sai **caractere a caractere** igual (`901 GATE typecheck=ok testes=falha enforcement=ok criterios=3/3 build=nao-rodou`); `gates` e `_execucao_dos_gates` atravessam **sem um byte** de diferença; a ÚNICA chave acrescentada é `launchd.label`, que já era passo humano pendente desde a etapa 3. |
| **K8b-5** | nada a migrar | os 6 pendentes do CI já usam `recon`/`tentativas`. O dry-run real diz `nenhum ticket pendente a migrar`. |
| **K8b-6** | nada | `--novo` não roda em repo instalado: o CI já tem `docs/fila` e receberia a recusa 2, que é a resposta certa. |
| **K10** | documento | a doutrina vendorizada muda no próximo `--atualizar`; nenhuma decisão de gate muda. |

Duas asserções antigas foram **revertidas de propósito** na K8b-1, com o porquê
escrito no arquivo de teste: token sem prefixo passou a resolver (o argumento de
"colisão de namespaces" não sobreviveu ao disco — `liberacao_ok` só é chamada
para dependência que já começa com `humano:`), e o texto do aviso passou de
"formato ANTIGO" para "forma LEGADA", porque agora cobre duas legadas e o `jq` da
união não distingue qual resolveu.

---

## 4. Dry-runs contra os três repos (SÓ LEITURA)

Os três saíram **rc 0** e **nenhum escreveu um byte** — conferido depois, com
`git status`, `find` por `.bak` e por `000-config.proposto.json`. Os três
**RECUSARIAM** o `--atualizar` de verdade, todos pelo mesmo motivo: nenhum está
pausado. A recusa prevista **não** impediu o dry-run de listar tudo, que é o
ponto da mudança feita na K8b-3.

### 4.1 `conteudos-infinitos` (o CI)

```
20 diferença(s)
O --atualizar de verdade RECUSARIA, por:
  · o loop de '/Users/lucasantos/Projetos/conteudos-infinitos' não está pausado: não existe nem docs/fila/PAUSAR nem docs/fila/.orq-pause. Rode 'bash scripts/orq pausar "atualizando o motor"' dentro do repo e tente de novo.
--- pausa: docs/fila/.orq-pause -> docs/fila/PAUSAR ---
nada a fazer: não existe docs/fila/.orq-pause
forma no disco: tokens[]: 7 (7 string, 0 objeto) · sem $schema_versao
7 entrada(s) lida(s) → 7 token(s) único(s) em v2
76 arquivo(s) de ticket em /Users/lucasantos/Projetos/conteudos-infinitos/docs/fila (regra do motor: [0-9]*.md, sem descer em rascunhos/ nem tocar _TEMPLATE.md)
nenhum ticket pendente a migrar.
FALTA    docs/fila/PAUSAR — acrescente ao .gitignore do repo:
ok       docs/fila/runs/ já é ignorado
```

Leitura: 20 diferenças de motor (é o kit que andou), 7 tokens a converter para
v2, **nenhum ticket a migrar**, config já em schema 2 com os dois renomes NÃO
aplicados porque `modelos.juiz_alto`/`juiz_baixo` já existem lá com valor
próprio. A única linha de `.gitignore` que falta é o `PAUSAR`.

### 4.2 `actus-saas`

```
89 diferença(s)
O --atualizar de verdade RECUSARIA, por:
  · o loop de '/Users/lucasantos/Projetos/actus-saas' não está pausado: não existe nem docs/fila/PAUSAR nem docs/fila/.orq-pause. Rode 'bash scripts/orq pausar "atualizando o motor"' dentro do repo e tente de novo.
--- pausa: docs/fila/.orq-pause -> docs/fila/PAUSAR ---
nada a fazer: não existe docs/fila/.orq-pause
forma no disco: tokens[]: 5 (5 string, 0 objeto, 5 sem o prefixo humano:) · sem $schema_versao
5 entrada(s) lida(s) → 5 token(s) único(s) em v2
53 arquivo(s) de ticket em /Users/lucasantos/Projetos/actus-saas/docs/fila (regra do motor: [0-9]*.md, sem descer em rascunhos/ nem tocar _TEMPLATE.md)
nenhum ticket pendente a migrar.
MANTIDA (própria do actus-saas, para a K11 decidir): migrations_faixa_loop — faixa de numeração de migrations reservada ao loop ("0250-0299"). É enforcement do Actus, candidato a união por config na K11.
MANTIDA (própria do actus-saas, para a K11 decidir): zona_proibida.no_write_columns — proibição por COLUNA, não por tabela. O enforcement do kit só conhece tabelas e prefixos; a coluna fica registrada esperando a K11.
MANTIDA (própria do actus-saas, para a K11 decidir): zona_proibida.padroes_proibidos_no_diff — padrões de texto proibidos no diff. Mesma família do anterior, mesmo destino.
14 violação(ões)
12 decisão(ões) local(is) esperando alguém: branch_protegida, worktrees_prefixo, orcamento.usd_dia, orcamento.tokens_dia, orcamento.usd_ticket, orcamento.campos_usage.custo_usd, orcamento.campos_usage.tokens_in, orcamento.campos_usage.tokens_out, orcamento.campos_usage.tokens_cache, juiz.paths_alto_risco, juiz.diff_max_baixo, launchd.label.
FALTA    docs/fila/PAUSAR — acrescente ao .gitignore do repo:
ok       docs/fila/runs/ já é ignorado
(o repo ainda não tem scripts/orq executável)
```

Leitura: os **5 tokens sem prefixo** viram v2 com `liberado_em: "desconhecido"` —
a migração não inventa data. Config sai de **26 para 14 violações**; as 12 que
sobram são decisões locais que a v1 nunca tomou. Três chaves próprias ficam
intocadas e nomeadas para a K11. Nenhum ticket pendente a migrar.

### 4.3 `comarka-operacional`

```
76 diferença(s)
O --atualizar de verdade RECUSARIA, por:
  · o loop de '/Users/lucasantos/Projetos/comarka-operacional' não está pausado: não existe nem docs/fila/PAUSAR nem docs/fila/.orq-pause. Rode 'bash scripts/orq pausar "atualizando o motor"' dentro do repo e tente de novo.
--- pausa: docs/fila/.orq-pause -> docs/fila/PAUSAR ---
nada a fazer: não existe docs/fila/.orq-pause
forma no disco: liberadas[]: 48 objeto(s) legado(s) · sem $schema_versao
48 entrada(s) lida(s) → 47 token(s) único(s) em v2; 1 token(s) apareciam mais de uma vez: humano:migration-196-aplicada (2×)
385 arquivo(s) de ticket em /Users/lucasantos/Projetos/comarka-operacional/docs/fila (regra do motor: [0-9]*.md, sem descer em rascunhos/ nem tocar _TEMPLATE.md)
42 ticket(s) mudariam. (--dry-run: nada foi escrito.)
renome supabase_project_id → ambiente_id = "ogfnojbbvumujzfklkhh" (o 'supabase_project_id' FICA). o preflight de identidade extrai o ref do SUPABASE_URL do .env e compara com `ambiente_id` (lib.sh:68, executor.sh:111-114). No Comarka esse valor existe com o nome `supabase_project_id` ("ogfnojbbvumujzfklkhh", um ref de projeto Supabase). Sem o rename, `ambiente_id` vem "null" e o preflight compara o ref real com a string "null" — divergência que ABORTA o run inteiro, corretamente e pelo motivo errado.
gate 'tsc': tipo 'tsc_baseline' → 'baseline'. gates.ts:151 só honra `tipo === "baseline"` para comparar contra o baseline de erros herdados. O Comarka escreve `tsc_baseline` e declara `baseline: 3` — com o nome que o motor do kit não conhece, o gate cai no caminho de `exit_code` puro, os 3 erros herdados em `qualificacao*` reprovam TODO ticket, para sempre, e o motivo não aparece em lugar nenhum.
MANTIDA (própria do comarka-operacional, para a K11 decidir): c0_intocavel — é a fronteira intocável do Comarka, com a MESMA forma de `zona_proibida` (`no_write_tables`, `no_write_prefixes`, `os_owned_excecoes`) mais duas listas próprias (`dashboard_readonly`, `ghl_comercial`). A tabela NÃO a renomeia: o motor lê `zona_proibida` (enforcement-core.ts:211), e mover a fronteira do enforcement por semelhança de nome é a mudança mais cara que uma migração automática poderia fazer errado. Fica intacta, e o relatório grita que `zona_proibida` está AUSENTE — o enforcement do Comarka não tem fronteira até alguém decidir.
MANTIDA (própria do comarka-operacional, para a K11 decidir): gate_streak_limite — contagem de reprovações seguidas antes de parar a frente. O motor do kit não tem esse conceito hoje.
MANTIDA (própria do comarka-operacional, para a K11 decidir): perfis_tools — mapa de `--allowedTools` por perfil de ticket (api, docs, frontend, sql-proposta). Candidato a entrar como mapa opcional na K11 (inventário §5).
MANTIDA (própria do comarka-operacional, para a K11 decidir): writeback_notion — espelho externo. O motor do kit não faz writeback; entra com o painel ou morre na K11.
AINDA AUSENTE, e a tabela não cobre: zona_proibida — decida à mão (veja config-chaves.ts para quem a lê)
15 violação(ões)
12 decisão(ões) local(is) esperando alguém: branch_protegida, worktrees_prefixo, orcamento.usd_dia, orcamento.tokens_dia, orcamento.usd_ticket, orcamento.campos_usage.custo_usd, orcamento.campos_usage.tokens_in, orcamento.campos_usage.tokens_out, orcamento.campos_usage.tokens_cache, juiz.paths_alto_risco, juiz.diff_max_baixo, launchd.label.
FALTA    docs/fila/PAUSAR — acrescente ao .gitignore do repo:
ok       docs/fila/runs/ já é ignorado
(o repo ainda não tem scripts/orq executável)
```

Leitura, e é o repo que mais muda: `supabase_project_id → ambiente_id` (sem ele o
preflight compara o ref real com a string `"null"` e **aborta o run inteiro**),
`tsc_baseline → baseline` no gate, 42 tickets com `recon_esperado → recon`, e o
config de **28 para 15 violações**. A décima quinta é a que interessa:
**`zona_proibida` continua AUSENTE**. A tabela deliberadamente NÃO renomeia
`c0_intocavel` para ela — mover a fronteira do enforcement por semelhança de nome
é a mudança mais cara que uma migração automática poderia fazer errado —, então o
relatório grita, e a decisão é humana.

> **Nota sobre o `orq validar`.** Nos dry-runs do Actus e do Comarka ele imprime
> *"o repo ainda não tem scripts/orq executável"*, e está certo: os dois nunca
> receberam o kit. Num `--migrar` de verdade o motor é copiado ANTES da migração,
> então `scripts/orq` existe quando essa seção roda. No CI ele rodou e listou os
> achados do gate de ticket sobre a fila real — nenhum deles é da migração.

---

## 5. Achados desta sessão

**1. O Actus tinha cinco liberações que não liberavam nada.** Os 5 tokens de
`liberacoes.json` estão sem o prefixo `humano:`, e `liberacao_ok` comparava a
string inteira. Nenhuma dependência `humano:*` daquele repo resolvia — o mesmo
modo de falha silenciosa de 2026-09-03, num repo onde ninguém olhou. Fechado pela
K8b-1.

**2. Três leitores discordam sobre qual bloco ```json vale** (`CONTRATO.md` §10,
divergência 10, aberta nesta sessão): o contrato §2 diz o **último**,
`gate-ticket.ts:99-105` lê o **primeiro**, `lib.sh:86-92` concatena **todos** (e
com dois blocos o resultado nem parseia). É **latente** — nenhum dos 517 tickets
dos três repos tem mais de um bloco. `migrar-tickets.ts` PULA esses tickets e
nomeia os três leitores, em vez de desempatar.

**3. O `.gitignore` do Actus versiona a evidência por ticket, de propósito.** O
`runs/.gitignore` de lá lista só os transitórios e diz em comentário que a
evidência **é** versionada — diverge do §1.3 do contrato do kit. Registrado, não
"corrigido": é repo de outra pessoa.

**4. Dois renomes que pareciam simétricos e não entraram na tabela.**
`executor_model → modelos.executor` e `retry_final_model → modelos.retry_final`:
o motor lê os aliases v1 direto e **não** lê o mapa. Copiar dado para chave que
ninguém lê é mover dado para o vazio. Quem achou foi o teste `toda chave 'para' de
um renome é lida pelo motor`, não a leitura.

**5. Um defeito de idempotência na migração de liberações**, achado pelo teste
que roda `--aplicar` duas vezes: a segunda passada reinferia `origem` pela lista
em que o registro estava agora, reescrevendo `v1:tokens` como `v2` — apagando
justamente o dado que explica um `liberado_em: "desconhecido"`.

**6. Dois testes meus mediam o dia, não o código.** Dois casos da K8b-5 afirmavam
a constante **44** sobre a fila do Comarka, e quebraram DENTRO da sessão: o loop
daquele repo está **vivo** e drenou às 16:00 (três tickets para `done`, um para
`em_execucao`), e o `liberacoes.json` de lá mudou de novo às 16:02. Os dois
passaram a derivar o esperado da própria cópia.
*Conferido, com o repo em mãos:* o diff do Comarka não tem **uma** linha de
`recon`, e o do Actus adiciona `tentativas_consumidas` (o nome VELHO, que só o
harness v1 de lá escreve). Nada nos três repos foi tocado por esta sessão. O
`liberacoes.json` modificado do Actus tem mtime **2026-08-28**, onze dias antes.

**7. O template de config do kit estava incompleto.** Faltavam 6 chaves
obrigatórias (`branch_protegida`, `worktrees_prefixo`,
`_execucao_dos_gates.{ordem_obrigatoria,interrupcao}`,
`politica_adiamento.causas_que_adiam`, `politica_retry.por_causa`). Um repo criado
pelo `--novo` sairia obrigando o dono a **autorar** chave, não só preencher. Um
check do caso (j) tranca: placeholder pode; `chave obrigatória ausente` é falha.

---

## 6. Passos humanos para o CI receber esta etapa

Nenhum deles foi executado aqui. Rodar **nesta ordem** — a ordem é o ponto: o
motor primeiro, os dados depois, e a leitura entre cada um.

```bash
KIT=~/Projetos/orquestrador-kit
CI=~/Projetos/conteudos-infinitos

# 1. ENSAIO. Nada é escrito; lê o diff inteiro antes de decidir.
cd "$KIT" && bash instalar.sh --atualizar "$CI" --migrar --dry-run | less

# 2. PAUSAR. O --atualizar RECUSA sem isto, e não cede a --forcar.
cd "$CI" && bash scripts/orq pausar "recebendo o kit 2.1.0-dev"

# 3. MOTOR + MIGRAÇÃO. O motor é copiado ANTES; se parar no meio, o repo fica
#    com motor novo sobre dados velhos, que FUNCIONA (o motor lê todas as formas
#    vivas desde a K8b-1). O contrário é o repo travado.
cd "$KIT" && bash instalar.sh --atualizar "$CI" --migrar

# 4. LER o que a migração de config PROPÔS. Ela não aplica nada sozinha.
cd "$CI" && less docs/fila/000-config.proposto.json
#    Preencher os placeholders <...> — no CI, só `launchd.label`:
#      "launchd": { "label": "com.conteudos.orquestrador" }
npx tsx scripts/orquestrador/migrar-config.ts docs/fila/000-config.json --aplicar
bash scripts/orq config          # tem de sair 0 violações

# 5. VALIDAR a fila e RODAR os testes, no repo.
bash scripts/orq validar --pendentes
npx vitest run

# 6. VERIFICAR que o motor ficou idêntico ao kit.
cd "$KIT" && bash instalar.sh --verificar "$CI"     # `idêntico ao kit 2.1.0-dev`, rc 0

# 7. DOIS COMMITS, separados, com pathspec explícito.
cd "$CI"
git add scripts/orquestrador scripts/orq scripts/roadmap docs/orquestrador/skill \
  test/fixtures/orq-harness.ts test/orquestrador-*.test.ts test/fixtures/criterios \
  test/fixtures/trilha
git commit -m 'motor: kit 2.1.0-dev'

git add .gitignore docs/fila/liberacoes.json docs/fila/000-config.json docs/fila/PAUSAR
git commit -m 'fila: migrada para o formato do kit 2.1.0-dev'
#    Os .bak NÃO entram em commit nenhum. Apague-os depois de revisar o diff.
rm -f docs/fila/*.bak

# 8. RETOMAR e PUSH.
bash scripts/orq retomar
git push
```

**Por que dois commits:** o motor é vendorizado e o diff dele é "o kit mudou";
`docs/fila/**` são os dados do dono e o diff é "os meus dados mudaram de forma".
Juntar os dois faz o `git log` do repo perder a única linha que alguém vai
procurar quando uma liberação parar de resolver.

**Antes do passo 7, acrescente ao `.gitignore` do CI** — o instalador RELATA e não
edita, de propósito:

```
docs/fila/PAUSAR
```

**Não agendado nesta etapa:** o `launchd` do CI não é tocado. Depois do passo 6,
se o `launchd.label` mudou de lugar, `bash scripts/orquestrador/instalar-launchd.sh`
é passo separado, e ele RECUSA sem o label.

### Actus e Comarka: ainda NÃO

Os dois estão em v1 e nunca receberam o kit — não têm `scripts/orq`. Instalá-los é
`--novo`? Não: eles têm `docs/fila`, então é `--atualizar --migrar`, e a sequência
é a mesma de cima **mais** as decisões que a v1 nunca tomou (12 placeholders
cada). O Comarka tem um bloqueador nomeado: **`zona_proibida` ausente** — o
enforcement dele não tem fronteira que o motor do kit leia, e `c0_intocavel` fica
intocada esperando a K11 decidir. Não instale nenhum dos dois sem essa decisão.

---

## 7. O que esta etapa NÃO fez

- **`risco` opcional no gate.** A doutrina diz que quem escreve não classifica; o
  gate continua cobrando que a CHAVE exista. Tornar a chave opcional é mudança de
  motor (`gate-ticket.ts`, `CAMPOS_PENDENTE`) com teste próprio. Registrado em
  `docs/DOUTRINA-v2.md` §5.
- **A triagem das outras 114 lições** do PLAYBOOK do CI — peça **K10b**, aberta.
- **Desempatar qual bloco ```json vale** — divergência 10 do `CONTRATO.md`,
  latente, com peça própria.
- **`c0_intocavel → zona_proibida`** — decisão da K11, por desenho.
- **Nenhum push, nenhuma chamada à API, nenhuma escrita nos três repos.**
