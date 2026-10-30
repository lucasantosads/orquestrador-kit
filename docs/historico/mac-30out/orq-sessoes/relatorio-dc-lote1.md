# ADOCAO-DASHBOARD, PRIMEIRO LOTE: relatório (22/10/2026)

Clone `~/Projetos/dashboard-comercial-orq`, `main`. Base `e441b258`; o commit desta sessão é `704917be`.
Kit 2.1.0-dev instalado. O loop não rodou: nesta sessão não houve launchctl, push, `claude -p`, API nem banco.

## 0. Resumo

- **Tickets.** Os 3 estão na fila, num commit só (`704917be`). `orq validar --pendentes`: rc 0. `--relatorio`: **0 violações, 0 isenções, 0 avisos**.
- **Pré-voo relâmpago (`orq prevoo`).** **NO-GO em 1 item**: cat. 6, `docs/fila/runs/` ausente. A causa é um clone novo: o `.gitignore` da raiz ignora `docs/fila/runs/` inteiro, então o `runs/.gitignore` e o `custo.json` que o `--novo` criou nunca entraram no git. Quem resolve é o passo 1 do Lucas: `instalar-launchd.sh:156-158` faz `mkdir -p docs/fila/runs`. Não criei a pasta porque ela fica fora do meu escopo de escrita.
- **Pré-voo completo (`pre-voo.md`, cat. 0 a 6).** Gates verdes: tsc 245 ≤ 246, vitest rc 0 (115 arquivos, 1433 testes), build rc 0. Ficam abertos 3 itens que só o Lucas resolve (§3.3).
- **Achados do recon:**
  - O DC-0005 fala em 5 rotas; o disco tem **6** escritas fora da exceção. A sexta é `src/app/api/trafego/verificar-regras/route.ts:182`.
  - O plist tem `RunAtLoad true`: o próprio passo 1 (instalar) **já dispara o primeiro tick**.

## 1. Escolha dos 3 tickets

| Ticket | Compromisso | Fonte | Risco, DDL, zona | Diff previsto | Critério executável |
|---|---|---|---|---|---|
| 001 relatório DC-0005 | DC-0005 | STATUS-PLANO; Pendência do PLAYBOOK; `relatorio-dc-orq-conteudo.md:83` | só `docs/auditoria/`; nenhum código | ~120 | `grep -ohF … \| sort -u \| wc -l` → 6; `grep -cF` → 1 |
| 002 `distribuirCartasMensais` | DC-0004 (confirmar) | regra do CLAUDE.md "falha de leitura nunca vira 0"; varredura de `count ?? 0` em `src/lib` | `src/lib/liga-cartas.ts` + teste novo; `liga_cartas` fora da zona; nenhuma escrita nova | ~110 | `node_modules/.bin/vitest run <teste> >/dev/null 2>&1 && echo OK` |
| 003 `concederConquista` | DC-0004 (confirmar) | idem | `src/lib/liga-conquistas.ts` + teste novo; `liga_conquistas_obtidas` fora da zona | ~110 | idem |

Por que esses dois consertos:
- **O bug é real e tem causa conhecida.** Com `count` e `head:true`, o supabase-js devolve `count:null` e `error:null` quando a leitura falha. O caso está documentado em `src/lib/pendencias/garantia-contrato.ts:80-83` e derrubou o /crm em 03-04/09. O `(count ?? 0) > 0` lê a falha como "ainda não recebeu" e insere de novo: um segundo lote de cartas no mês, ou a mesma conquista duas vezes.
- **O chamador não muda.** `cartas/minhas/route.ts:16` ignora o retorno. `conquistas/conceder/route.ts:23-25` já trata `null`.
- **As allowlists não se sobrepõem** e nenhum dos dois toca `no_write_paths` nem `paths_alto_risco`. Nenhum objetivo usa palavra de alto risco ("token", "senha", "schema"…).

Descartados, com motivo:
- `src/lib/ai-budget.ts:58-79`. Bug real: o erro de leitura vira 0 tokens, e o limite de 24h deixa de valer. Mas o código diz "não bloquear o usuário" de propósito: decidir entre liberar e bloquear na falha é decisão de produto. "token" também é palavra de alto risco.
- TODO de remover o shadow do churn (`api/churn/route.ts:9`, `_churn-content.tsx`, `VisaoGeralExecutiva.tsx`, prazo 15/10). É cutover de cálculo visível e exige aprovação do Lucas. A memória "shadow que vence em silêncio" vale aqui.
- `employees/backfill/route.ts:22`, a senha padrão em env: "senha" é palavra de alto risco, e mexe em credencial.
- `api/notion/member/[id]/route.ts:48`: o DC-0002 tira o Notion; isso é tarefa dele.
- `reunioes-frescas.ts:26-32`: no-show, com regra própria no CANONICO e chamadores em rotas de tráfego que alimentam páginas protegidas.
- Irmãs do mesmo padrão, que **não** entraram e ficam como próximo lote: `src/lib/comarka-pro.ts:178` (`jaExisteLancamento`, deduplicação de pontos; confirmar antes se os pontos pesam em remuneração), `src/lib/liga-streak.ts:86` (`dias = count ?? 0`; a falha zera o streak) e `src/lib/inteligencia/decisoes-pendentes.ts:51-54` (`count || 0` em 4 contadores).

O `compromisso` dos tickets 002 e 003 é `DC-0004` porque não existe DC próprio para eles, e o primeiro lote faz parte da adoção. Nada no motor lê o campo (grep vazio em `scripts/orquestrador`). Se o Lucas preferir um DC novo (por exemplo DC-0006, "falha de leitura que vira zero em guardas de idempotência"), basta trocar o valor no JSON e acrescentar a linha no STATUS-PLANO. Não escrevi no STATUS-PLANO porque ele fica fora do escopo.

## 2. Os 3 tickets, na íntegra

### `docs/fila/001-dc0005-relatorio-regras-historico.md`

````markdown
# Ticket: DC-0005, relatório das rotas que escrevem em `trafego_regras_historico` fora da exceção

## Objetivo (prosa)

`trafego_regras_historico` é tabela C0, compartilhada com o Comarka OS. A exceção de escrita de 29/09
cobre só `src/app/api/trafego/regras-historico/route.ts:40`. O compromisso DC-0005 pede investigar
quem mais escreve nela. Este ticket entrega **só um relatório** em `docs/auditoria/`. Nenhum código
muda.

Recon feito no clone em 22/10/2026 (`grep -rn trafego_regras_historico src`). A Pendência do PLAYBOOK
lista 5 rotas, mas o disco tem **6** escritas fora da exceção. A sexta é
`src/app/api/trafego/verificar-regras/route.ts:182`, que não estava na lista. Linhas conferidas:

| Rota | Escrita |
|---|---|
| `src/app/api/trafego/regras-historico/route.ts:40` | insert (a exceção autorizada, só como referência) |
| `src/app/api/ia/avaliar-alerta-trafego/route.ts:186` | insert (o arquivo também lê em `:67`) |
| `src/app/api/meta/ativar/route.ts:53` | insert |
| `src/app/api/meta/duplicar/route.ts:53` | insert |
| `src/app/api/meta/editar-budget/route.ts:66` | insert |
| `src/app/api/meta/pausar/route.ts:64` | insert |
| `src/app/api/trafego/verificar-regras/route.ts:182` | insert |

Leitura sem escrita, fora do escopo do relatório: `src/app/api/trafego/regras/route.ts:27`.

Risco baixo: nenhum arquivo de código, migration ou tabela é tocado. Compromisso: DC-0005.

## Campos de máquina

```json
{
  "id": "001",
  "slug": "dc0005-relatorio-regras-historico",
  "compromisso": "DC-0005",
  "origem": "humano",
  "objetivo": "Escreva o relatório de investigação docs/auditoria/dc-0005-trafego-regras-historico.md, em português, sem alterar nenhum outro arquivo. Uma seção por rota que escreve na tabela C0 trafego_regras_historico fora da exceção autorizada, com: (1) rota HTTP, com método e caminho; (2) arquivo:linha exato do insert, conferido no disco; (3) o que escreve: as colunas e a origem de cada valor do insert; (4) quem chama: componente, hook, cron do Vercel ou webhook, com arquivo:linha de cada chamador encontrado por busca no repo, ou 'nenhum chamador encontrado no repo' quando não houver; (5) desde quando: o commit que introduziu o insert (git log -S); (6) recomendação: manter e incluir na exceção, mover para a rota autorizada, ou remover, com o porquê em uma frase. Abra com uma tabela-resumo das 6 rotas (rota, arquivo:linha, chamador, recomendação) e uma linha sobre a exceção autorizada, só como referência. Feche com a seção 'Perguntas para o Lucas', com o que só ele decide, incluindo se o Comarka OS lê essas linhas. Fato sem prova (arquivo:linha ou commit) não entra; o que não foi possível verificar vai escrito como não verificado. FORA DE ESCOPO e PROIBIDO: alterar qualquer arquivo além do relatório, inclusive as rotas investigadas: src/app/api/ia/avaliar-alerta-trafego/route.ts:186, src/app/api/meta/ativar/route.ts:53, src/app/api/meta/duplicar/route.ts:53, src/app/api/meta/editar-budget/route.ts:66, src/app/api/meta/pausar/route.ts:64, src/app/api/trafego/verificar-regras/route.ts:182 e a exceção autorizada src/app/api/trafego/regras-historico/route.ts:40. Também PROIBIDO: consultar banco, chamar API ou rodar as rotas.",
  "pathspec_allowlist": [
    "docs/auditoria/dc-0005-trafego-regras-historico.md"
  ],
  "cria_novo": [
    "docs/auditoria/dc-0005-trafego-regras-historico.md"
  ],
  "dependencias": [],
  "diff_estimado": 120,
  "risco": "",
  "criterios_aceite": [
    {
      "tipo": "alvo",
      "descricao": "o relatório cita as 6 rotas fora da exceção, cada uma com arquivo:linha",
      "cmd": "grep -ohF -e 'src/app/api/ia/avaliar-alerta-trafego/route.ts:' -e 'src/app/api/meta/ativar/route.ts:' -e 'src/app/api/meta/duplicar/route.ts:' -e 'src/app/api/meta/editar-budget/route.ts:' -e 'src/app/api/meta/pausar/route.ts:' -e 'src/app/api/trafego/verificar-regras/route.ts:' docs/auditoria/dc-0005-trafego-regras-historico.md 2>&1 | sort -u | wc -l | tr -d ' '",
      "espera": "6"
    },
    {
      "tipo": "alvo",
      "descricao": "o relatório tem a seção de perguntas para o Lucas",
      "cmd": "grep -cF 'Perguntas para o Lucas' docs/auditoria/dc-0005-trafego-regras-historico.md 2>&1",
      "espera": "1"
    },
    {
      "tipo": "avaliador",
      "descricao": "avaliador: o diff toca SÓ o relatório. Cada arquivo:linha citado bate com o disco da base (a linha tem o insert em trafego_regras_historico). Cada rota tem os 6 itens (rota, arquivo:linha, o que escreve, quem chama com arquivo:linha ou 'nenhum chamador encontrado', commit de origem, recomendação com porquê). Nenhuma afirmação sem prova; o que não foi verificado está marcado como não verificado. Nenhuma recomendação apresentada como decisão tomada.",
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
````

### `docs/fila/002-liga-cartas-guarda-count.md`

````markdown
# Ticket: `distribuirCartasMensais` não distribui de novo quando a contagem falha

## Objetivo (prosa)

`src/lib/liga-cartas.ts:76-83` verifica se o gestor já recebeu as cartas do mês com
`select("id", { count: "exact", head: true })` e decide por `if ((count ?? 0) > 0) return [];`.
Com `head: true`, o supabase-js devolve `count: null` **e** `error: null` quando a leitura falha
(o mesmo caso está documentado em `src/lib/pendencias/garantia-contrato.ts:80-83`, origem da queda do
/crm em 03-04/09). O `?? 0` lê a falha como "ainda não recebeu", e o
gestor ganha um segundo lote de cartas no mesmo mês. Isso viola a regra do CLAUDE.md: falha de
leitura nunca vira 0.

Chamador único: `src/app/api/liga-comarka/cartas/minhas/route.ts:16`, que ignora o retorno e lê
`getCartasMes` em seguida. Por isso devolver `[]` na falha não muda a resposta da rota, só deixa de
inserir.

`liga_cartas` não está na zona protegida. O conserto não acrescenta escrita nova: ele remove uma
escrita indevida. Irmãs do mesmo padrão: `src/lib/liga-conquistas.ts:77` (ticket 003),
`src/lib/comarka-pro.ts:178` e `src/lib/liga-streak.ts:86` (fora deste lote, registradas no relatório
do lote).

Compromisso: DC-0004, o primeiro lote do loop (confirmar com o Lucas; não há DC próprio).

## Campos de máquina

```json
{
  "id": "002",
  "slug": "liga-cartas-guarda-count",
  "compromisso": "DC-0004",
  "origem": "humano",
  "objetivo": "Em src/lib/liga-cartas.ts, função distribuirCartasMensais: a verificação 'já recebeu cartas neste mês' usa count com head:true e decide por (count ?? 0) > 0, então uma leitura que falha (count null, com ou sem error) é tratada como 'ainda não recebeu' e insere um segundo lote. Corrija para ler também o error da contagem; se houver error OU count == null, registre com console.error (prefixo [liga-cartas], dizendo que nada foi distribuído) e retorne [] sem inserir. O caminho feliz não muda: count 0 distribui e count > 0 retorna [] sem inserir. Crie o teste src/__tests__/liga-cartas-guarda.test.ts com vitest, mockando getSupabaseAdmin de @/lib/comarka-pro e getRegraNum de @/lib/comarka-pro-config (vi.mock, sem rede e sem credencial). Casos: (a) count null e error null: nenhum insert, retorno []; (b) count null com error: nenhum insert, retorno []; (c) count 2: nenhum insert, retorno []; (d) count 0: insert chamado uma vez, com o número de cartas de getRegraNum. Os casos (a) e (b) TÊM de falhar contra o código atual: rode o teste antes de corrigir e diga no corpo do commit que falharam. FORA DE ESCOPO: qualquer outro arquivo, inclusive as funções irmãs com o mesmo padrão em outros módulos.",
  "pathspec_allowlist": [
    "src/lib/liga-cartas.ts",
    "src/__tests__/liga-cartas-guarda.test.ts"
  ],
  "cria_novo": [
    "src/__tests__/liga-cartas-guarda.test.ts"
  ],
  "dependencias": [],
  "diff_estimado": 110,
  "risco": "",
  "criterios_aceite": [
    {
      "tipo": "alvo",
      "descricao": "teste novo da guarda verde (o arquivo não existe antes, e os casos (a) e (b) falham contra o código atual)",
      "cmd": "node_modules/.bin/vitest run src/__tests__/liga-cartas-guarda.test.ts >/dev/null 2>&1 && echo OK",
      "espera": "OK"
    },
    {
      "tipo": "guarda",
      "descricao": "a decisão não lê mais a contagem com ?? 0",
      "cmd": "grep -cF '(count ?? 0) > 0' src/lib/liga-cartas.ts",
      "espera": "0"
    },
    {
      "tipo": "avaliador",
      "descricao": "avaliador: o teste importa distribuirCartasMensais de @/lib/liga-cartas e exercita a função real, não um espelho dela; os 4 casos existem e cada um verifica se o insert foi chamado ou não; os casos (a) e (b) falhariam contra a versão anterior (o corpo do commit diz isso); na falha não há insert e não há throw; o caminho de count 0 continua inserindo; nenhum outro arquivo foi tocado; sem skip, sem asserção afrouxada.",
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
````

### `docs/fila/003-liga-conquistas-guarda-count.md`

````markdown
# Ticket: `concederConquista` não concede de novo quando a contagem falha

## Objetivo (prosa)

`src/lib/liga-conquistas.ts:71-77` verifica se o gestor já tem a conquista com
`select("id", { count: "exact", head: true })` e decide por `if ((count ?? 0) > 0) return null;`.
É o mesmo defeito do ticket 002: com `head: true`, uma leitura que falha devolve `count: null` e
`error: null`, e o `?? 0` concede a conquista uma segunda vez.

Chamador: `src/app/api/liga-comarka/conquistas/conceder/route.ts:22`. A rota já trata o retorno
`null` (`:23-25`, 400 "Conquista não encontrada ou já obtida"), então devolver `null` na falha não
cria caminho novo nela. A mensagem fica imprecisa no caso de falha; corrigi-la é fora de escopo. A
leitura do tipo (`liga_conquistas_tipos`, `.single()`) já devolve `null` quando falha e fica como está.

`liga_conquistas_obtidas` não está na zona protegida. O conserto remove uma escrita indevida e não
acrescenta nenhuma. A allowlist não se sobrepõe à do 002.

Compromisso: DC-0004, o primeiro lote do loop (confirmar com o Lucas; não há DC próprio).

## Campos de máquina

```json
{
  "id": "003",
  "slug": "liga-conquistas-guarda-count",
  "compromisso": "DC-0004",
  "origem": "humano",
  "objetivo": "Em src/lib/liga-conquistas.ts, função concederConquista: a verificação 'já possui a conquista' usa count com head:true e decide por (count ?? 0) > 0, então uma leitura que falha (count null, com ou sem error) é tratada como 'não possui' e insere a conquista de novo. Corrija para ler também o error da contagem; se houver error OU count == null, registre com console.error (prefixo [liga-conquistas], dizendo que nada foi concedido) e retorne null sem inserir. O caminho feliz não muda: count 0 insere, count > 0 retorna null sem inserir, e tipo inexistente continua retornando null. Crie o teste src/__tests__/liga-conquistas-guarda.test.ts com vitest, mockando getSupabaseAdmin de @/lib/comarka-pro (vi.mock, sem rede e sem credencial). Casos: (a) tipo encontrado, count null e error null: nenhum insert, retorno null; (b) tipo encontrado, count null com error: nenhum insert, retorno null; (c) tipo encontrado, count 1: nenhum insert, retorno null; (d) tipo encontrado, count 0: insert chamado uma vez em liga_conquistas_obtidas, com gestor_id e conquista_id. Os casos (a) e (b) TÊM de falhar contra o código atual: rode o teste antes de corrigir e diga no corpo do commit que falharam. FORA DE ESCOPO: qualquer outro arquivo, inclusive as funções irmãs com o mesmo padrão em outros módulos.",
  "pathspec_allowlist": [
    "src/lib/liga-conquistas.ts",
    "src/__tests__/liga-conquistas-guarda.test.ts"
  ],
  "cria_novo": [
    "src/__tests__/liga-conquistas-guarda.test.ts"
  ],
  "dependencias": [],
  "diff_estimado": 110,
  "risco": "",
  "criterios_aceite": [
    {
      "tipo": "alvo",
      "descricao": "teste novo da guarda verde (o arquivo não existe antes, e os casos (a) e (b) falham contra o código atual)",
      "cmd": "node_modules/.bin/vitest run src/__tests__/liga-conquistas-guarda.test.ts >/dev/null 2>&1 && echo OK",
      "espera": "OK"
    },
    {
      "tipo": "guarda",
      "descricao": "a decisão não lê mais a contagem com ?? 0",
      "cmd": "grep -cF '(count ?? 0) > 0' src/lib/liga-conquistas.ts",
      "espera": "0"
    },
    {
      "tipo": "avaliador",
      "descricao": "avaliador: o teste importa concederConquista de @/lib/liga-conquistas e exercita a função real, não um espelho dela; os 4 casos existem e cada um verifica se o insert foi chamado ou não; os casos (a) e (b) falhariam contra a versão anterior (o corpo do commit diz isso); na falha não há insert e não há throw; o caminho de count 0 continua inserindo; nenhum outro arquivo foi tocado; sem skip, sem asserção afrouxada.",
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
````

### Critérios vistos vermelhos antes (controle negativo)

Rodei os `cmd` não avaliadores no clone, na base:

```
001 alvo1 (espera 6):   1      # o arquivo não existe; o 2>&1 joga o aviso no pipe, e 1 ≠ 6
001 alvo2 (espera 1):   ugrep: warning: docs/auditoria/dc-0005-trafego-regras-historico.md: No such file or directory
002 alvo (espera OK):   (sem OK)  rc=1
002 guarda (espera 0):  1      # o padrão existe hoje, como esperado antes do conserto
003 alvo (espera OK):   (sem OK)  rc=1
003 guarda (espera 0):  1
```

No shell interativo o `grep` é ugrep. O harness roda os critérios com `bash -c`, e a forma da mensagem de erro muda, mas a saída continua diferente da `espera` nos dois casos.

## 3. Validador e pré-voo

### 3.1 Validador da fila

Um aviso `6b` na primeira rodada: o objetivo do 001 citava `vercel.json`, fora da allowlist. Reescrevi para "cron do Vercel" e a segunda rodada saiu limpa. Saída crua final:

```
$ bash scripts/orq validar --pendentes
rc=0

$ bash scripts/orq validar --relatorio --pendentes
GATE DE TICKET · 3 ticket(s) · fila /Users/lucasantos/Projetos/dashboard-comercial-orq/docs/fila

001-dc0005-relatorio-regras-historico.md  OK
002-liga-cartas-guarda-count.md  OK
003-liga-conquistas-guarda-count.md  OK

TOTAL: 0 violação(ões), 0 isenção(ões), 0 aviso(s), em 3 ticket(s)
rc=0
```

### 3.2 Onde está o pré-voo no harness instalado

- `instalar.sh` do kit, bloco PRÓXIMOS PASSOS do `--novo`, item 3: "pré-voo: `docs/orquestrador/skill/references/pre-voo.md`, categorias 0 a 6". O item 5 diz: "SÓ ENTÃO agendar: `instalar-launchd.sh`".
- `docs/orquestrador/skill/references/pre-voo.md:1-63`: o checklist completo, de 0 a 8. Pela linha 3, os itens ⚡ rodam em toda drenagem.
- O relâmpago automático: `scripts/orq:381-386` (`orq prevoo` → `scripts/orquestrador/prevoo.ts`). O loop o chama em `scripts/orquestrador/local-loop.sh:733-734` (`run_prevoo`) e `:767-781` (`prevoo_ou_sai`, que aborta em NO-GO), a partir do `main_local_loop`, em `:852`.

### 3.3 Pré-voo relâmpago, saída crua

```
$ bash scripts/orq prevoo
ok    cat.7 toolchain (tsx do repo)
ok    cat.0 spec vendorizada
ok    cat.1 identidade
NO-GO cat.6 pré-voo cat.6 (estrutura da fila): docs/fila/runs/ — ausente
NO-GO cat.6 · pré-voo cat.6 (estrutura da fila): docs/fila/runs/ — ausente
rc=1
```

O NO-GO vem de `prevoo.ts:186-189`, que exige o diretório `runs/`. `git check-ignore -v docs/fila/runs/.gitignore` responde `.gitignore:47:docs/fila/runs/`. Na instalação, o `--novo` criou `runs/.gitignore` e `runs/custo.json`, mas o `.gitignore` da raiz engole o diretório, e o clone, que vem do git, ficou sem ele.

O loop de verdade cria o diretório antes do pré-voo: `launchd-run.sh:122` e `local-loop.sh` (`mkdir -p "$(dirname "$LOG")"`, com `LOG=$RUNS_BASE/local-loop.log` em `:29`). O problema é que o plist manda stdout e stderr para `docs/fila/runs/launchd-agent.log` (template `:73-76`), e o launchd não cria diretório. Quem cobre isso é `instalar-launchd.sh:156-158` (`mkdir -p "$CHECKOUT/docs/fila/runs"`). O `custo.json` ausente não bloqueia: o gate de orçamento sai em fail-open sem ele (`lib.sh`, "sem ledger legível … veredito ok (fail-open)").

### 3.4 Pré-voo completo, categorias 0 a 6 (mais os itens ⚡ da 8)

| Cat. | Item | Resultado | Prova |
|---|---|---|---|
| 0 | spec vendorizada com conteúdo | GO | `test -s` em SKILL.md, templates/TICKET.md, templates/config.json, references/pre-voo.md, references/setup.md; `git ls-files docs/orquestrador/skill/ \| wc -l` → 24 (≥ 5) |
| 1 | origin | GO | `git@github.com:lucasantosads/dashboard-comercial.git` contém `lucasantosads/dashboard-comercial` |
| 1 | banco | N/A por config | `ambiente_id=""` (L3); o único `.env*` é `.env.example` |
| 2 | árvore limpa | GO | `git --no-optional-locks status --short` → 0 linhas |
| 2 | locks órfãos | GO | `find .git -name '*.lock'` → 0 |
| 2 | principal protegida | GO | `branch_protegida=main`; `proibicoes_absolutas.tools` tem `Bash(git push:*)` |
| 2 | staging | GO | `staging-auto` não existe; o executor cria local, sem push (`executor.sh:135` → `lib.sh:853-858`) |
| 3 | git, jq | GO | `/usr/bin/git`, `/usr/bin/jq` |
| 3 | `claude -p 'responda apenas OK'` | **NÃO RODADO** (proibido nesta sessão) | fica para o Lucas, antes do passo 1 |
| 3 | lockfile único | GO | `git ls-files` → só `package-lock.json` |
| 3 | runner de testes | GO | `vitest.config.ts`; script `test` = `vitest run` |
| 3 | build | GO | ver cat. 4 |
| 4 | typecheck | **GO** | preparo `rm -rf .next; rm -f next-env.d.ts tsconfig.tsbuildinfo`; `node_modules/.bin/tsc --noEmit` exit 2, contagem `error TS` fora de `.next/` = **245** ≤ 246 (em `max`, quem decide é a contagem) |
| 4 | testes | **GO** | `node_modules/.bin/vitest run` exit **0**: `Test Files 115 passed (115)`, `Tests 1433 passed (1433)` |
| 3/4 | build (o `cmd` do gate) | **GO** | `rm -rf .next`; `NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:9 … node_modules/.bin/next build` exit **0**, `✓ Generating static pages (278/278)` (`⚠ Compiled with warnings`) |
| 5 | config válido, sem placeholder | GO | `jq .` ok; os 4 `<` estão em notas `_*` (`<id>`); `orq config` → 0 violações, rc 0 |
| 5 | zona proibida revisada por humano | **PENDENTE (Lucas)** | `zona_proibida.revisado_humano=false`. Nenhum script lê a chave, mas o checklist pede a confirmação explícita |
| 5 | faixa de migrations | N/A neste lote | nenhum ticket tem migration; checar a faixa exige o ledger (banco, proibido aqui) |
| 6 | `_TEMPLATE.md`, `liberacoes.json`, `rascunhos/` | GO | existem; `jq .` em liberacoes ok |
| 6 | `runs/` | **NO-GO → o passo 1 resolve** | §3.3 |
| 6 | allowlist sobreposta sem dependência | GO | regra 8 do validador: 0 avisos |
| 8 ⚡ | schema 2, PAUSAR, loops, modelos | GO | `schema=2`; PAUSAR ausente; executor `true`, sentinela `false`, planejador `false/dry_run`; forte só em juiz_alto/juiz_ticket/retry_final; aliases v1 iguais |
| 8 | EXECUTOR.md ≤ 60 linhas | GO | 29 |
| 8 | contabilidade de usage | **NÃO RODADO** (`claude -p`) | `campos_usage` copiados do CI e nunca sondados aqui |
| 8 | REPO-MAP | informativo | `docs/orquestrador/REPO-MAP.md` ausente; nada no motor lê a chave (grep vazio em executor.sh e lib.sh) |
| 7 | fixture trivial atravessou o loop antes de agendar | **NO-GO pelo checklist** | não houve fixture. Pela linha 41 do `pre-voo.md` (e pelo item 4 do PRÓXIMOS PASSOS), agendar vem depois. Se o Lucas aceitar o lote 1 como o primeiro atravessamento, isso é decisão dele |

Veredito no formato do `pre-voo.md:62-63`: **NO-GO com plano ordenado**.
1. O Lucas roda `claude -p 'responda apenas OK'` e confirma que a sessão do CLI está logada.
2. O Lucas confirma a zona proibida e decide se vira `revisado_humano` para `true`.
3. O Lucas decide a cat. 7: um ticket-fixture antes, ou o lote 1 como primeiro atravessamento.
4. O passo 1 abaixo cria o `runs/`, e o `orq prevoo` tem de sair GO antes do tick.

Os artefatos de build voltaram ao estado de antes: só o `tsconfig.tsbuildinfo` (ignorado, existia antes). `.next/` e `next-env.d.ts` foram apagados depois do build. As saídas cruas dos gates estão em `/private/tmp/claude-501/lote1-{tsc,vitest,build}.out`.

## 4. Git

```
$ git log --oneline -2
704917be fila: primeiro lote, tickets 001-003
e441b258 merge: orquestrador-kit instalado no dashboard (--novo, config, exclusões)
$ git status --short
(vazio: 0 linhas)
```

## 5. Comandos do Lucas, na ordem

No clone, depois de resolver os itens 1 a 3 do plano do §3.4:

```bash
cd ~/Projetos/dashboard-comercial-orq

# 1. instalar o launchd com o label do config (com.dashboard-comercial.orquestrador)
bash scripts/orquestrador/instalar-launchd.sh --dry-run     # só imprime o plist; confira Label, CHECKOUT e StartInterval 1800
bash scripts/orquestrador/instalar-launchd.sh               # cria docs/fila/runs (:156-158), copia para ~/Library/LaunchAgents (:83), bootstrap (:184)
#    ATENÇÃO: o plist tem RunAtLoad true (template :67-71). O bootstrap JÁ dispara o primeiro tick.
#    Para ver o GO antes do disparo, rode estas duas linhas logo antes do instalar-launchd.sh:
#      mkdir -p docs/fila/runs && bash scripts/orq prevoo  # tem de sair só "ok", rc 0

# 2. conferir
launchctl print gui/$(id -u)/com.dashboard-comercial.orquestrador | head -20

# 3. o primeiro tick, sem -k (se o tick do RunAtLoad ainda estiver rodando, o kickstart sem -k não o mata;
#    um segundo disparo concorrente morre no lock .local-loop.lock)
launchctl kickstart gui/$(id -u)/com.dashboard-comercial.orquestrador

# 4. ler o STATUS depois do tick
bash scripts/orq                                            # snapshot de docs/fila/runs/STATUS.md (lib.sh:397)
cat docs/fila/runs/STATUS.md
bash scripts/orq fila                                       # placar por status dos tickets 001-003
bash scripts/orq eventos 30                                 # últimas linhas de runs/events.log
tail -50 docs/fila/runs/launchd.log                         # log do loop (launchd-run.sh:64)
```

Para desinstalar: `launchctl bootout gui/$(id -u)/com.dashboard-comercial.orquestrador && rm -f ~/Library/LaunchAgents/com.dashboard-comercial.orquestrador.plist` (`instalar-launchd.sh:192`).

## 6. Para a próxima sessão do kit

- **`runs/` não viaja pelo git.** O `--novo` grava `docs/fila/runs/.gitignore` e `custo.json`, mas acrescenta `docs/fila/runs/` ao `.gitignore` da raiz, e o diretório inteiro fica de fora do commit. Todo clone novo nasce com `orq prevoo` em NO-GO até o `instalar-launchd.sh` criar a pasta. Saídas possíveis: ignorar `docs/fila/runs/*` com a exceção `!docs/fila/runs/.gitignore`, ou o `orq prevoo` criar a pasta.
- **`pre-voo.md` cita comandos que o `orq` instalado não tem:** `orq gate <id>` (cat. 8, l. 55) e `orq mapa-repo` (l. 54). O mais próximo do primeiro é `orq validar`.
- **O PRÓXIMOS PASSOS do `--novo` e a cat. 7 mandam rodar o fixture antes de agendar,** mas o plist com `RunAtLoad true` faz do "agendar" o primeiro disparo. A ordem do kit e o efeito do instalador se contradizem.

## 7. Desvios desta sessão

- Gravei 1 arquivo temporário em `/tmp/claude-lote1/` (saída do `--relatorio`) e o apaguei. Uma primeira tentativa de apagar, junto com um `bash -c`, foi barrada pela checagem de segurança e não rodou. A remoção que valeu foi `rm -f` do arquivo e `rmdir`, por caminho literal.
- As saídas cruas dos gates e do validador ficaram em `/private/tmp/claude-501/lote1-*.out`, fora do repo.
- Os gates escreveram artefatos ignorados no clone (`.next/`, `next-env.d.ts`, `tsconfig.tsbuildinfo`). Voltei ao estado de antes: só o `tsconfig.tsbuildinfo` (regerado pelo tsc, já existia). Árvore limpa: 0 linhas.
