# Revisão do plano de adoção do Actus · kit 2.1.0-dev

Data: 2026-09-09. Sessão de revisão, **só leitura** — a única escrita foi este arquivo.

**Procedência.** Nada aqui é de memória. O que foi lido, no disco:

- kit `~/Projetos/orquestrador-kit` (HEAD `50c061b`, `VERSAO` = `2.1.0-dev`, árvore limpa, em sincronia com `origin/main`): `instalar.sh`, `scripts/orq`, `scripts/orquestrador/{lib.sh,executor.sh,local-loop.sh,gates.ts,config-chaves.ts,config-tabela.ts,config-cli.ts,migrar-config.ts,instalar-launchd.sh}`, `scripts/kit/vendorizado.sh`, `doutrina/templates/config.json`, `_referencia-ci/000-config.ci.json`.
- `~/Projetos/actus-saas` (branch `main`, 1 commit à frente do origin): `docs/fila/000-config.json`, `docs/fila/`, `scripts/orquestrador/`, `test/`, `vitest.config.ts`, `package.json`, `supabase/`, `node_modules/.bin/`.
- **Evidência medida**: `bash ~/Projetos/orquestrador-kit/instalar.sh --atualizar . --migrar --dry-run` rodado dentro do `actus-saas`. Escreveu zero (conferido com `git status --porcelain` antes e depois); o `migrar-config.ts` em dry-run só materializa o proposto num `mkdtemp` (migrar-config.ts:270-276).

Os números citados abaixo — 90 diferenças, 5 liberações, 53 tickets, 14 violações, 12 decisões — saíram dessa execução, não de estimativa.

---

## 1 · Bloqueantes, na ordem em que explodem

### B-1 · O Actus não tem `tsx`, e o motor do kit é TypeScript

**O plano diz.** B3 roda `bash scripts/orq config`, `orq validar --pendentes`, `orq prevoo`, `orq`; B5 põe o loop para drenar.

**O real.** O motor executa TypeScript por `npx tsx`. São 15 linhas casando `npx tsx` no kit — 14 chamadas e 1 comentário:

| arquivo | linhas |
| --- | --- |
| `scripts/orq` | 63 (`config-cli.ts`), 293 (`gate-ticket.ts`), 310 (`prevoo.ts`), 373 (`liberar-cli.ts`) |
| `scripts/orquestrador/executor.sh` | 42 (`decisao-cli.ts`), 570 (`juiz.ts`), 835 (`gates.ts`), 929 (`diagnostico.ts`) |
| `scripts/orquestrador/local-loop.sh` | 40 (`tsx -e`), 223 (`decisao-cli.ts`), 241 (`prevoo.ts`) |
| `scripts/orquestrador/enforcement.sh` | 58 (`enforcement-core.ts`) |
| `scripts/orquestrador/test-retry-worktree.sh` | 346, 350 (`juiz.ts`) |
| `scripts/orquestrador/launchd-run.sh` | 45 — comentário, não chamada |

Não há fallback: nenhum script procura o `tsx` em outro lugar, e nenhum tem caminho alternativo se ele faltar.

No `actus-saas`: `node_modules/.bin/` tem `next`, `tsc` e `vitest` — **não tem `tsx`**; `package.json` não declara `tsx` em `devDependencies`; `find ... -path '*/.bin/*' -name tsx` no workspace inteiro não devolve nada. O CI (`conteudos-infinitos`) declara `"tsx": "^4.19.0"` (package.json:29) e o tem instalado — é por isso que o motor roda lá.

**Onde exatamente quebra.** `scripts/orq` faz `( cd "$ORQ_DIR/.." && npx tsx ... )` (orq:63). No repo instalado, `$ORQ_DIR/..` é a raiz do Actus: o `npx` resolve contra o `node_modules` do Actus, não acha o `tsx` e vai buscá-lo na rede — prompt interativo num TTY, erro fora dele. O mesmo vale para o executor, o juiz, os gates e o enforcement dentro da worktree (cujo `node_modules` é symlink para o do checkout principal, então herda a mesma ausência).

**Armadilha.** A Fase A **não** sofre disso: ela chama o `orq` **do kit**, que faz `cd` para o kit e acha o `tsx` de lá. Fase A passa, B3 quebra. Não leia o verde da Fase A como prova de que o motor roda no Actus.

**Correção.** Passo humano, antes do B3: `pnpm add -D tsx@^4.19.0` no `actus-saas` e conferir `ls node_modules/.bin/tsx`. É `install`, então é do humano com o loop pausado — o piso de tools proíbe o agente de fazer isso, e com razão.

---

### B-2 · O `--migrar` sobrescreve o proposto que a Fase A produziu

**O plano diz.** Fase A grava `docs/fila/000-config.proposto.json` com os placeholders preenchidos. B3, na ordem: `instalar.sh --atualizar . --migrar`, depois `cp docs/fila/000-config.proposto.json docs/fila/000-config.json`, depois `bash scripts/orq config` esperando 0 violações.

**O real.** `000-config.proposto.json` **é o nome que o instalador usa** (`migrar-config.ts:47`, `NOME_PROPOSTO`). Com `--migrar` sem `--dry-run`, `instalar.sh:307-309` chama `migrar-config.ts` em modo `--propor`, e `migrar-config.ts:251` faz `writeFileSync(propostoPath, p.proposto)` — **sem nenhuma guarda de existência**.

Sequência real do B3 como está escrito: o `--migrar` apaga o arquivo da Fase A e escreve o proposto de máquina, com os 14 placeholders `<...>` intactos; o `cp` instala esse arquivo como oficial; o `orq config` sai rc 1 com 14 violações. O oposto do "0 violações" que o plano espera — e o trabalho da Fase A vai para o lixo em silêncio, porque o instalador não avisa que sobrescreveu nada.

**Correção.** Duas mudanças, ambas baratas:

1. A Fase A grava **`docs/fila/000-config.revisado.json`** — nome que o instalador não conhece.
2. B3 roda o `--migrar` **primeiro** e só então instala o revisado.

E o `cp` do plano duplica um caminho que o kit já tem: `npx tsx scripts/orquestrador/migrar-config.ts docs/fila/000-config.json --aplicar` (instalar.sh:315-318) move o proposto para o lugar do oficial, cria o `.bak` sozinho e roda o `orq config` no fim (migrar-config.ts:226-240). Se você mantiver o nome `revisado`, o `cp` explícito é o certo — mas então o `.bak` é responsabilidade sua, e o plano já faz isso (`cp docs/fila/000-config.json docs/fila/000-config.v1.bak`). Ok.

---

### B-3 · O `--atualizar` vai RECUSAR: há arquivo não-rastreado dentro do motor

**O plano diz.** B3 abre com `instalar.sh --atualizar . --migrar`, sem prever recusa. A limpeza do harness antigo só vem no B4.

**O real.** `instalar.sh:430-440` monta a variável `sujo` com `git status --porcelain` sobre `scripts/orquestrador scripts/orq scripts/roadmap docs/orquestrador/skill` + os testes e fixtures do harness, e recusa se houver qualquer coisa. `--porcelain` lista **não-rastreados** (`??`), não só modificados. Medido agora no Actus:

```
?? docs/orquestrador/skill/references/higiene-de-execucao.md
```

→ `RECUSADO: '...' tem modificação não commitada no motor`. É a recusa 3, a única que `--forcar` dispensa (instalar.sh:356-360).

As outras duas recusas estão limpas: `docs/fila/runs/STATUS.md` **não existe** no Actus (então a recusa por snapshot não dispara, instalar.sh:376-381), e a pausa o B1 resolve.

**Correção.** Decidir o destino do `higiene-de-execucao.md` **antes** do B3 — commitar (se é doutrina local que fica) ou apagar (se é resíduo da skill v1) —, ou passar `--forcar` de olhos abertos. O plano trata esse arquivo no B4, tarde demais.

---

## 2 · Mudam veredito em silêncio

### V-1 · Gates "via pnpm" contradizem a decisão que está escrita no próprio config

**O plano diz** (Fase A): "gates com `nome`, `cmd` (os scripts reais do package.json, **via pnpm**), `papel`".

**O real.** O config do Actus roda os binários locais **de propósito**, e o motivo está escrito no `descricao` do gate `typecheck`:

> "Chamado pelo binário LOCAL, não por 'pnpm': o loop roda gates numa worktree com node_modules symlinkado e o pnpm 11.x faz deps-check pré-run que tenta reinstalar/purgar ali (aborta sem TTY); o binário direto não."

Os três `cmd` de hoje: `rm -rf .next && node_modules/.bin/tsc --noEmit`, `node_modules/.bin/vitest run`, `node_modules/.bin/next build`. O piso de tools do kit proíbe `Bash(pnpm install:*)` pela **mesma** razão (config-tabela.ts:274, com o porquê em :279: "um install lá purga o store do repo de verdade").

Trocar por `pnpm run typecheck` reintroduz exatamente o defeito que aquela linha documenta.

**Correção.** Manter os binários locais. `papel` sim, acrescente: é lido de verdade (`papel_do_gate`, executor.sh:483, "declarado ganha do inferido") e é o que faz a trilha gravar `typecheck=`/`testes=`/`build=` com o nome que o repo deu ao gate.

---

### V-2 · `baseline_scope_regex` deixa de existir, e o gate de tipos muda de significado

**O plano diz.** Nada. O campo não é mencionado em lugar nenhum.

**O real.** O `GateSpec` do kit (gates.ts:30-57) tem `baseline`, `direcao`, `contagem_regex`, `preparo`, `baseline_placar`, `cobertura_minima_services` — **não tem `baseline_scope_regex`**. Ninguém no motor lê essa chave: as duas únicas ocorrências no kit são um comentário (lib.sh:12) e a entrada de `PROPRIAS_DE_REPO` que a registra como assunto do Comarka (config-tabela.ts:388). A avaliação é por **contagem** (gates.ts:229-233).

O gate `typecheck` do Actus hoje **não conta nada**: ele reprova se sobrar qualquer `error TS` fora dos dois arquivos da regex, e o `baseline: 2` é documentação. Depois da adoção passa a significar "no máximo 2 erros, em qualquer arquivo":

- mais frouxo num eixo — 2 erros novos em código de produção passam;
- mais rígido no outro — um 3º erro dentro dos arquivos hoje tolerados reprova.

É a mesma pegadinha que a `config-tabela.ts:388` registrou para o Comarka; ela vale igual para o Actus, e o plano não a herda.

**Correção.** Decidir explicitamente, na revisão do config:
- ou aceitar a contagem e **remedir o baseline hoje**, no HEAD do Actus, anotando o número medido;
- ou usar `contagem_regex` (gates.ts:42) para contar só o que interessa.

E mover o `rm -rf .next &&` de dentro do `cmd` para `preparo: ["rm -rf .next"]` (gates.ts:49 e 285) — o campo existe exatamente para isso, e o rc do preparo é ignorado de propósito.

---

### V-3 · `proibicoes_absolutas`: a prosa pode sumir, e o piso proposto é mais fraco que o do kit

**O plano diz.** "o piso de ferramentas (decisão 17) com a lista do template do kit MAIS `Bash(pnpm install:*)` e SEM `Bash(rm:*)`".

**O real.** Três coisas:

1. `Bash(pnpm install:*)` **já está** no piso do kit (config-tabela.ts:274). O "MAIS" é redundante.
2. `Bash(rm:*)` **está** no piso (config-tabela.ts:271), herdado da `DISALLOWED_TOOLS` do Comarka. Tirá-lo é decisão de **afrouxar**, não de migrar, e o plano não diz por quê.
3. No Actus, `proibicoes_absolutas` é um **array de 8 frases** (verificado no config: "nunca push na branch principal", "nunca aplicar DDL (só escrever arquivo de migration na faixa 0250-0299)", …, "toda RPC nova no diff deve receber p_tenant_id obrigatório"). A migração **recusa** escrever dentro dele — está dito na própria tabela (config-tabela.ts:279): "nos três repos do disco `proibicoes_absolutas` é um ARRAY de prosa, e a migração RECUSA escrever dentro dele (nada é apagado); ligar o piso é passo humano — mover a prosa para `.regras` e acrescentar `.tools`".

O risco concreto: escrever `proibicoes_absolutas: { tools: [...] }` à mão, na Fase A, **apaga as 8 regras** — inclusive a de push e a do `p_tenant_id`, que é critério de juiz herdado por todo ticket.

**Correção.**

```jsonc
"proibicoes_absolutas": {
  "regras": [ /* as 8 frases de hoje, byte a byte */ ],
  "tools":  [ /* o piso do template */ ]
}
```

Se `Bash(rm:*)` sair mesmo, que saia com uma linha `_tools` ao lado dizendo o motivo e a data.

---

### V-4 · `push_suprimido` não é interruptor: é documentação

**O plano diz.** "`push_suprimido: true` (decisão 7: o loop não pusha)".

**O real.** A chave **não está** em `config-chaves.ts` e nenhum script do motor a lê. As três ocorrências no kit são: o template (`doutrina/templates/config.json:26`, valor `false`), o config do CI (`_referencia-ci/000-config.ci.json:278`, valor `false`) e uma tabela da doutrina (`references/autoalimentacao.md:158`). Quem não pusha é o `local-loop.sh`, por construção — linha 15: "Sem push: publicar é humano (o comarka pusha por ticket; aqui não)". Note que o CI tem a chave em `false` e mesmo assim não pusha: o valor não faz diferença nenhuma.

**Correção.** Pode escrever, como registro da decisão 7 — mas não a trate como o que impede o push. O que impede é `proibicoes_absolutas.tools` com `Bash(git push:*)` e a `branch_protegida`.

---

### V-5 · Orçamento herdado do CI é decisão, não leitura de disco

**O plano diz.** "modelos e orçamento copiados do CI (`_referencia-ci` no kit) com `usd_ticket` e `usd_dia` iguais aos do CI", sob a regra geral de que "chave de config vem do disco do Actus".

**O real.** O kit transforma esses quatro valores em placeholder **exatamente** para impedir a cópia (config-tabela.ts:314-331): "Orçamento é GATE, não relatório: estourou = adiado. Um teto chutado passa despercebido justamente porque nunca dispara, e aí não é teto." O CI usa `usd_dia: 50`, `tokens_dia: 5000000`, `usd_ticket: 10`.

`campos_usage` é outro caso e a cópia é legítima: são os nomes do envelope do `claude -p --output-format json` (`total_cost_usd`, `usage.input_tokens`, `usage.output_tokens`, `usage.cache_read_input_tokens`), que não dependem do repo — dependem da versão do CLI, e o kit manda confirmar no pré-voo (config-tabela.ts:335-337).

**Correção.** Copiar `campos_usage` (confirmando no pré-voo) e marcar os três tetos como provisórios, com um `_orcamento_provisorio` do tipo "herdado do CI em 2026-09-09; remedir com 2 semanas de medição do Actus". Continua sendo sua decisão; só não entre como se tivesse vindo do disco do Actus, porque não veio.

---

## 3 · Expectativas do plano que o dry-run desmente

Todas medidas na execução de hoje.

**E-1 · Tickets.** B2 espera "tickets pendentes com renome de `tentativas_consumidas`". Medido: *"53 arquivo(s) de ticket em .../docs/fila (regra do motor: `[0-9]*.md`, sem descer em `rascunhos/` nem tocar `_TEMPLATE.md`) — **nenhum ticket pendente a migrar**."* Não há renome de ticket nesta adoção.

**E-2 · "os 7 renomes".** Certo, e vale registrar por quê: a tabela tem **8** (config-tabela.ts:70-129); `supabase_project_id → ambiente_id` não dispara porque o Actus **já tem** `ambiente_id` (`fqwhpcusmkmvtgyofuwh`). Os 7 que saem: `avaliador_model`→`modelos.juiz_alto`, `avaliador_model`→`modelos.juiz_baixo`, `migrations_faixa_loop`→`migrations.faixa`, `zona_proibida.no_write_columns`→`zona_proibida.colunas_congeladas`, `migrations_dir`→`migrations.dir`, `zona_proibida.no_write_prefixes`→`zona_proibida.prefixos_sem_ddl`, `zona_proibida.padroes_proibidos_no_diff`→`enforcement.padroes_proibidos_no_diff`. Em todos, o nome v1 **fica**: renomear é copiar (config-tabela.ts:12-15).

**E-3 · "os 14 placeholders".** O `orq config` sobre o proposto sai rc 1 com "**14 violação(ões)**", mas são **12 decisões**: `juiz.paths_alto_risco` conta 3 linhas, uma por item da lista de exemplo. Preencher 12 coisas zera as 14 linhas. As 12: `branch_protegida`, `worktrees_prefixo`, `orcamento.usd_dia`, `orcamento.tokens_dia`, `orcamento.usd_ticket`, `orcamento.campos_usage.{custo_usd,tokens_in,tokens_out,tokens_cache}`, `juiz.paths_alto_risco`, `juiz.diff_max_baixo`, `launchd.label`.

**E-4 · Pause file.** B2 espera "pause file nada a fazer (já é `PAUSAR`)". Medido: *"nada a fazer: não existe `docs/fila/.orq-pause`"* — e também não existe `PAUSAR`. Não há nada a migrar porque não há nada dos dois lados; quem cria o `PAUSAR` é o B1.

**E-5 · Liberações.** Confere com o plano: 5 strings sem prefixo → 5 objetos v2 com `humano:`, `$schema_versao: 2`. Uma delas ganha data do git (`migration-0255-aplicada` → `2026-08-14`); as outras quatro saem com `liberado_em: "desconhecido"`, e o kit avisa que **não inventa data**.

**E-6 · O que sobra "só no repo".** O dry-run lista 90 diferenças. Depois do B4 (remover os `.mjs`, o `com.actus.orquestrador.plist.template` e o `__fixtures__`), o que continua "só no repo" é **um** arquivo: `docs/orquestrador/skill/references/higiene-de-execucao.md`. O `com.actus.orquestrador.plist` instanciado não aparece: é ignorado pelo git e a comparação o exclui por sufixo (instalar.sh:37-41, "a regra é por sufixo e não por nome porque o nome muda por repo").

**E-7 · `.gitignore`.** O dry-run acusa `FALTA docs/fila/PAUSAR`, e o instalador **não edita** `.gitignore` de repo existente (instalar.sh:243-250: "ele é do dono"). O B4 dá `git add .gitignore` sem que passo nenhum o tenha editado — e o `PAUSAR` criado no B1 fica aparecendo como não-rastreado até alguém acrescentar a linha à mão.

**E-8 · Fase A, passo 3.** `orq config` não aceita argumento (orq:59) e resolve o caminho sozinho, sempre o **oficial** (`$_main/docs/fila/000-config.json`, orq:60-63). O plano prevê o desvio ("copie o proposto para um diretório temporário"), mas ele é desnecessário: o CLI por baixo aceita caminho arbitrário — é assim que o próprio kit valida o proposto (migrar-config.ts:206-210). Use:

```
cd ~/Projetos/orquestrador-kit && npx tsx scripts/orquestrador/config-cli.ts \
  ~/Projetos/actus-saas/docs/fila/000-config.revisado.json
```

Se for mesmo usar diretório temporário, ele precisa ficar **fora de qualquer repo git**: o `orq config` resolve o `--git-common-dir` a partir do `ORQ_EXEC_ROOT` (orq:61-62), então um tmp criado dentro do `actus-saas` faria o comando ler o config oficial de novo, sem dizer que ignorou o seu arquivo.

**E-9 · Fase A, passo 5.** `bash ~/Projetos/orquestrador-kit/scripts/orq validar` **sem** `ORQ_EXEC_ROOT` resolve `ROOT` para o kit (lib.sh:24), `MAIN_CHECKOUT` para o kit, e `CONFIG` para `<kit>/docs/fila/000-config.json`, que não existe — o kit não tem fila, por desenho. O `cfg` do topo do `orq` (linha 70) morre no `jq` e derruba o comando inteiro. O passo 3 já usa `ORQ_EXEC_ROOT=.`; o passo 5 precisa do mesmo:

```
ORQ_EXEC_ROOT=. bash ~/Projetos/orquestrador-kit/scripts/orq validar <id-do-rascunho>
```

**E-10 · B4, `git add test`.** O kit instala **10** arquivos enumerados (scripts/kit/vendorizado.sh:46-65): 7 testes (`orquestrador-{morte-por-sinal,pacotes,prefixo-aspas,prompt-como-rodar,reparo-trilha,trilha-uma-linha}.test.ts` + `fixtures/orq-harness.ts`) e 3 fixtures de dados. O `test/` do Actus tem 2 arquivos próprios (`fila-sugestoes-baldes.test.ts`, `painel-objecoes.test.ts`). `git add test` funciona; prefira os 10 caminhos, e a guarda do plano ("se puxar arquivo que não é do kit, para e cola") continua valendo.

**E-11 · O `vitest.config.ts` do Actus deixa os testes do kit fora do gate.** Hoje:

```ts
include: ["src/**/*.test.ts", "scripts/orquestrador/**/*.test.mjs"]
```

Depois do B4 o segundo padrão não casa mais nada (os `.mjs` foram removidos) e o primeiro **não cobre `test/`**. Resultado: os 7 testes do kit nunca rodam, e o gate `testes` deixa de incluir o teste do enforcement que a própria `descricao` dele promete ("INCLUI o teste do próprio enforcement"). Correção, na mesma revisão do B4:

```ts
include: ["src/**/*.test.ts", "test/**/*.test.ts"]
```

---

## 4 · O que o plano acerta (para não reabrir na execução)

- **`enforcement.testes_sql.glob = "supabase/tests/**"` é obrigatório, e pelo motivo exato que o plano dá.** Com `migrations.dir` a regra B liga (enforcement-core.ts:273) e todo `.sql` fora do dir reprova por `migration_fora_do_dir` — inclusive os testes, e o Actus tem `supabase/tests/0250_*.test.sql`, `0251_`, `0252_`, `0255_`, `0259_`… Sem o glob, o loop perde a capacidade de escrever teste de banco. O próprio dry-run grita isso na linha do renome.
- **`papel` nos gates**: lido de verdade (executor.sh:483).
- **`launchd.label` obrigatório**: o instalador recusa sem ele (instalar-launchd.sh:65-66); `start_interval` ausente vira 1800 (config-chaves.ts:117).
- **`rascunhos/`**: a regra do motor é `[0-9]*.md` sem descer em `rascunhos/` — rascunho ali não entra na fila nem é migrado.
- **Passo 1 da Fase A**: correto, a recusa por falta de pausa não impede o dry-run de listar tudo (instalar.sh:402-411).
- **B6, plists**: nada a remover. O gerado é `$CHECKOUT/scripts/orquestrador/$LABEL.plist` (instalar-launchd.sh:82) — mesmo nome do atual, porque o label é o mesmo.
- **B1**: a leitura de que parar o Actus é desagendar e esperar o run vivo está certa, e o `STATUS.md` inexistente confirma que nada do harness antigo deixou snapshot para trás.

---

## 5 · Ordem corrigida, B1 a B6

### B0 (novo) · pré-condições que não estavam no plano

```
cd ~/Projetos/actus-saas
pnpm add -D tsx@^4.19.0 && ls node_modules/.bin/tsx          # B-1
git status --porcelain -- docs/orquestrador/skill             # B-3: decidir o higiene-de-execucao.md
printf '%s\n' 'docs/fila/PAUSAR' >> .gitignore                # E-7
```

O `pnpm add` é o único install da adoção inteira, é humano, e roda com o loop já pausado (ou seja, depois do B1 — veja a ordem abaixo).

### B1 · estado e janela de pausa (como está no plano) + o install

Sem mudanças até o `git branch legado/harness-2026-09`. Depois dele, ainda no B1: o `pnpm add -D tsx` e a linha do `.gitignore`. Motivo de ficar aqui e não antes: `pnpm add` mexe no `node_modules` e no lockfile, e isso não se faz por baixo de uma drenagem viva.

### B2 · dry-run da migração (sem mudança de comando)

Expectativas corrigidas: ~90 diferenças; liberações 5→5 com `humano:`; **nenhum ticket a migrar**; pausa "nada a fazer" porque não existe `.orq-pause`; config proposto com **7** renomes e **14 linhas de placeholder / 12 decisões**; e a previsão de recusa some, porque o `PAUSAR` já existe e o `higiene-de-execucao.md` já foi resolvido.

### B3 · aplicar — **ordem trocada**

```
cd ~/Projetos/actus-saas
bash ~/Projetos/orquestrador-kit/instalar.sh --atualizar . --migrar 2>&1 | grep -vE 'ISENCAO|padrão proibido' | tail -20
# só AGORA o config revisado entra — o --migrar acabou de reescrever o 000-config.proposto.json
cp docs/fila/000-config.json docs/fila/000-config.v1.bak
cp docs/fila/000-config.revisado.json docs/fila/000-config.json
bash scripts/orq config                                   # tem de sair 0 violações
bash scripts/orq versao --kit ~/Projetos/orquestrador-kit | head -3
bash ~/Projetos/orquestrador-kit/instalar.sh --verificar .
bash scripts/orq validar --pendentes --relatorio | tail -3
bash scripts/orq prevoo
bash scripts/orq
git status -sb | head -40
```

O `000-config.proposto.json` gerado pelo `--migrar` fica no disco como segunda opinião; some no `rm` do B4.

### B4 · harness antigo para o legado, `vitest.config` e commits

```
cd ~/Projetos/actus-saas
git rm -q scripts/orquestrador/*.mjs scripts/orquestrador/com.actus.orquestrador.plist.template
git rm -rq scripts/orquestrador/__fixtures__ 2>/dev/null; git status -sb | head -40
```

**Novo passo, antes de commitar**: trocar o `include` do `vitest.config.ts` para `["src/**/*.test.ts", "test/**/*.test.ts"]` (E-11). Sem isso os 7 testes do kit não rodam e o gate `testes` fica cego para o enforcement.

Depois, os commits do plano, com dois cuidados:

- `git add test` → prefira os 10 caminhos de `scripts/kit/vendorizado.sh:46-65`.
- o segundo commit dá `git add docs/fila/*.md`, e há **6 tickets já modificados** na árvore desde antes da adoção (`114`, `115`, `212`, `271`, `275`, `619`) mais 11 tickets novos não-rastreados. Ou eles entram de propósito, ou o `git add` tem de ser por caminho.

O `git add .gitignore` agora tem o que adicionar (a linha do `PAUSAR`, do B1).

Espere sobrar exatamente um "só no repo" no `--verificar` seguinte: `docs/orquestrador/skill/references/higiene-de-execucao.md`, se você tiver escolhido mantê-lo no B0.

### B5 · launchd e primeira drenagem (sem mudança de comando)

Antes do `kickstart`, uma conferência que o plano não tem e que custa 2 segundos — é o que prova que o B-1 foi resolvido de verdade:

```
bash scripts/orq prevoo && echo "PREVOO GO"
```

Se o `prevoo` sair GO, o `tsx` está resolvendo dentro do Actus e o resto do motor também vai resolver.

### B6 · fechamento (como está no plano), mais três linhas no PLAYBOOK

Além do que o plano já lista, registre no PLAYBOOK do Actus:

1. **`tsx` é dependência do motor, não do produto** — o `pnpm add -D tsx` da adoção, e por que o `orq` do kit passava enquanto o `orq` do repo falhava.
2. **O gate `typecheck` mudou de significado** (V-2): qual foi a decisão, e o baseline remedido.
3. **`000-config.proposto.json` é nome reservado do instalador** (B-2): por isso o revisado da Fase A tem outro nome.

---

## Anexo · o que ficou fora desta revisão

Passo 4 da Fase A — o inventário do que o harness antigo fazia e o kit não faz (`sql-pendentes.mjs`, `telemetria.mjs`, relatório/writeback) — não foi levantado aqui: é leitura arquivo a arquivo dos 12 `.mjs` do Actus e é o trabalho da Fase A. Uma pista para lá: `sql_pendente_dir` é chave **opcional** do kit (config-chaves.ts:74, "só importa em repo com banco") e o config do Actus **não a declara** — se o fluxo do `sql-pendentes.mjs` importa, essa chave precisa entrar no revisado, senão o enforcement não classifica os `.sql` propostos.
