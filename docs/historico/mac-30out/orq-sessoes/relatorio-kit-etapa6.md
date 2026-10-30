# Relatório — kit do Orquestrador, etapa 6

**Repo:** `~/Projetos/orquestrador-kit`, branch `main`, **8 commits novos, nenhum push.**
**Data:** 2026-09-08. **Nenhuma chamada à API** foi feita nesta sessão.

Esta etapa absorve o que o **actus-saas** pagou com incidente e o motor do CI não tinha, e
fecha o que o Comarka e o dashboard-comercial exigem do gate. A pergunta que julgou cada
peça foi sempre a mesma: **o Actus perde alguma proteção ao trocar de motor?** Onde a
resposta ainda é "sim", está NOMEADO — não escondido (ver §6).

---

## 1. Os commits

| # | sha | peça | vermelhos antes |
|---|---|---|---|
| 1 | `6f37c21` | K11a-1 · enforcement B/C/D do Actus como regras por config | 16 de 41 |
| 2 | `9944986` | K11a-2 · pré-voo relâmpago, sem nenhuma chamada nova | 34 de 34 |
| 3 | `96d711d` | K11a-3 · os padrões de adiamento do Actus em `decisao.ts` | 5 de 13 |
| 4 | `d0eecdb` | G · gate `tipo: baseline` com `direcao`, `contagem_regex`, `preparo` | 10 de 21 |
| 5 | `50a4f6c` | D10 · o ticket é o PRIMEIRO bloco ```json | 8 de 13 |
| 6 | `22794fd` | T17 · piso de blacklist de ferramentas | 21 de 23 |
| 7 | `4caa1ac` | K8b-7 · datar as liberações migradas pelo git | 9 de 11 |
| 8 | `49869e2` | docs: PECAS (K11b refinada), CHANGELOG, tabela sem item vencido | — |

O vermelho-antes de cada peça foi MEDIDO, não estimado: o arquivo de teste rodou contra a
versão anterior do motor (arquivo revertido por `git checkout --`, restaurado em seguida).

---

## 2. O PASSO 0 — o que foi lido, e onde

Tudo só leitura. Cada afirmação deste relatório aponta para o arquivo:linha que a sustenta.

**No kit:** `docs/PECAS.md`, `CONTRATO.md` (§2, §4.1, §8, §10), `enforcement-core.ts`,
`gates.ts`, `decisao.ts`, `executor.sh` (`preflight:53`, `probe_modelos:145`,
`build_prompt:323`, a chamada do `claude -p` em `:791-793`), `perfil.ts`, `lib.sh`
(`ticket_json:86`, `ticket_set:110`).

**No actus-saas** (`~/Projetos/actus-saas`):
- `scripts/orquestrador/enforcement.mjs` — 6 regras (A allowlist, B faixa de migrations,
  C `no_write_tables`, D `no_write_columns`, E `no_write_prefixes`, F
  `padroes_proibidos_no_diff`) e a exceção estreita de `supabase/tests/*.test.sql`
  (`:117-187`);
- `enforcement.test.mjs` — 45 casos;
- `pre-voo.mjs` / `pre-voo.test.mjs` — cat. 0/1/6/3, 41 casos;
- `executor.mjs:189-228` — `SINAIS_AUTENTICACAO` e `detectarAdiamento`;
- `executor.mjs:428-495` — o comentário do pnpm: *"node_modules da worktree é symlink p/ o
  do repo — pnpm veria deps desatualizadas e tentaria reinstalar/purgar (perigoso)"*, mais
  o `.npmrc` de worktree com `verify-deps-before-run=false` e `confirm-modules-purge=false`;
- `sql-pendentes.mjs` — o ritual humano de migration (não entrou em peça nenhuma);
- `docs/fila/000-config.json` — `zona_proibida` (3 tabelas congeladas, 1 coluna, 1 prefixo,
  3 padrões de diff, 11 `readonly_ok`), `migrations_faixa_loop: "0250-0299"`,
  `migrations_dir: "supabase/migrations"`, `gates` (`typecheck` já é
  `tipo: "baseline"`, `baseline: 2`).

**No comarka-operacional** (`~/Projetos/comarka-operacional`):
- `docs/fila/000-config.json` — o gate `tsc`: `{"tipo":"tsc_baseline","baseline":3,
  "baseline_scope_regex":"qualificacao"}`;
- `scripts/orquestrador/executor.sh:119-125` (`gate_tsc`) e `:48` (`DISALLOWED_TOOLS`).

---

## 3. As sete peças, uma a uma

### K11a-1 · enforcement B/C/D como regras por config  `6f37c21`

`enforcement-core.ts` ganhou três regras, **todas desligadas quando a chave não existe**:

- **B** (`migrations.dir`, `.faixa`, `.faixas_reservadas`): `.sql` só no dir, com número
  legível, dentro da faixa e fora das reservadas. Quatro tipos de violação NOMEIAM a regra
  (`migration_fora_do_dir`, `_sem_numero`, `_fora_da_faixa`, `_faixa_reservada`).
- **C** (`no_write_tables` como LISTA + `schemas_permitidos`/`tabelas_permitidas`):
  `INSERT/UPDATE/DELETE` em SQL e `.from('t').insert/update/upsert/delete` no cliente.
  Leitura nunca reprova — o detector só extrai tabela ESCRITA, então isso é propriedade
  do código, não caso de teste.
- **D** (`colunas_congeladas` como globs + `colunas_sombra`): a sombra VENCE a congelada.
  É essa precedência que torna `["etapa_*"] / ["etapa_v2_*"]` exprimível; sem ela a lista
  de sombras não decidiria nada.

**Duas decisões, escritas no código:**

1. **C e D auditam também o `artefato_sql`; a regra 3 (`TODAS`) não.** Um
   `insert into public.leads` dentro de `supabase/migrations/0250_x.sql` é exatamente o que
   o Actus proíbe — alguém vai APLICAR aquele arquivo. A negação em BLOCO dentro do
   artefato é que foi o falso positivo do ORQ-11. Nomear é o que separa a regra do falso
   positivo. Prosa (`.md`) fica de fora nas três.
2. **`migrations.dir` NÃO entra na tabela de renomes.** Renomear `migrations_dir` para
   dentro de `migrations` ligaria a regra B em TODO repo que tem migration — o CI
   inclusive, que nunca pediu faixa. Quem cobra o dir é o `orq config`
   (`config-cli.ts:152`): *"migrations.faixa declarada sem migrations.dir — a regra B só
   cobra .sql sob migrations.dir, então a faixa não vale para arquivo nenhum"*.

**Nomes de chave:** nenhum inventado. `migrations_faixa_loop → migrations.faixa` e
`zona_proibida.no_write_columns → zona_proibida.colunas_congeladas` entraram em `RENOMES`
com as duas origens. Onde o nome já era o mesmo nos dois repos — `no_write_tables` — não há
renome: a regra C lê a chave existente.

*O que o CI faz diferente:* **nada**, provado contra os TRÊS configs reais do disco
(`_referencia-ci/`, `fixture/`, `test/fixtures/checkout/`): nenhuma das chaves novas existe
em nenhum deles, `no_write_tables` é `"TODAS"` nos três, e um `.sql` de artefato com DML
segue devolvendo `{ok: true, violations: []}`. Os 47 casos de
`test/orquestrador-enforcement.test.ts` continuam verdes **sem edição**.

*Dois guards de teste foram ALARGADOS, com o porquê no arquivo:* "toda chave `para` é lida
pelo motor" passou a olhar `CHAVES_CONFIG` em vez de só as obrigatórias (as chaves novas
são lidas e OPCIONAIS por desenho); "TODA chave do config real sobrevive" passou de
igualdade estrita para SUBCONJUNTO (um renome de destino ANINHADO acrescenta chave dentro
de um objeto existente, que é o que a regra 1 permite).

### K11a-2 · pré-voo ⚡  `9944986`

`scripts/orquestrador/prevoo.ts` + `orq prevoo` + `prevoo_ou_sai` no `local-loop.sh`.
Três checagens com veredito (cat.0 spec vendorizada, cat.1 identidade, cat.6 estrutura da
fila) e uma **informativa** (cat.3, a última sondagem de modelo).

**A cat.3 NÃO virou chamada.** No Actus ela é um `claude -p "responda apenas OK"` por
drenagem. Aqui quem sonda é o `probe_modelos` do executor (ORQ-07), que já roda antes de
qualquer gasto e já sabe distinguir config errada (aborta) de ambiente caído (adia com
cooldown). O pré-voo LÊ o resultado da última sondagem em `runs/` — o papel `probe` do
`custo.json` e os `probe-falha-*` — e diz há quanto tempo foi.

**A ordem é a decisão da peça, e difere do Actus:** lock → PAUSA → pré-voo → reconcile →
drenar. Lá o pré-voo vem antes do lock. Aqui quem protege o run alheio é o `lock_adquirir`
(sai 0 sem tocar lock nenhum quando há outro vivo), e a PAUSA vem antes de tudo porque é a
palavra do humano — quem pausou quer silêncio, não diagnóstico de ambiente. A propriedade
que importa se mantém: **em NO-GO nenhum ticket é tocado**, porque o primeiro passo que
escreve em ticket é o `--reconcile`.

`notificar` foi extraída de dentro do `notificar_fim` (lib.sh), sem mudar um byte do que
ela faz: o NO-GO precisa avisar pelo mesmo canal, e duas cópias da entrega seriam dois
lugares para o canal divergir.

*O que o CI faz diferente:* uma linha a mais no `local-loop.log` por drenagem. **Medido**
contra `~/Projetos/conteudos-infinitos` (só leitura):

```
ok    cat.0 spec vendorizada
ok    cat.1 identidade
ok    cat.6 estrutura da fila
info  cat.3 sondagem de modelo — última sondagem 2026-09-08 (hoje)
GO
rc=0
```

`git status` do CI, depois: limpo. Contra o Actus e o Comarka: **NO-GO cat.0**,
`docs/orquestrador/skill/EXECUTOR.md` ausente — os dois ainda não têm o motor vendorizado,
que é o primeiro passo da adoção. O pré-voo acertou nos três.

### K11a-3 · adiamento  `96d711d`

`PADRAO_CAUSA` ganhou os seis sinais de autenticação do `SINAIS_AUTENTICACAO` do Actus
(causa `sessao`) e `service unavailable`/`503` (família `rate_limit`). As strings são o
texto REAL do incidente de 13/08/2026, copiado dos testes de lá. O `503` entra com borda de
PALAVRA, e não por substring como no Actus: `15039 tokens` numa saída qualquer viraria
adiamento.

*O que o CI faz diferente:* **nada nos casos que já cobria** — `orquestrador-decisao`,
`orquestrador-trilha` e `orquestrador-envelope` (84 casos) e o `test-lib-config.sh` seguem
verdes sem edição. Nos casos NOVOS o motor passa a ADIAR onde reprovava, e é intencional:
adiado não consome retry.

**Duas divergências DELIBERADAS**, registradas no teste:

1. **O gate duplo fica.** Texto só conta com `rc != 0`. O Actus adia com `code 0`; um ticket
   que MENCIONE "rate limit" ou "invalid api key" no código que escreveu sai com rc 0, e
   adiar por isso é a fila parando por causa do próprio trabalho. O incidente que pagou a
   lição no Actus saiu com `code 1` (`executor.test.mjs:177`) — o caso com `code 0` de lá é
   guarda de drift entre duas listas, não um incidente. **Nada se perde.**
2. **"stdout vazio COM stderr cheio" não é exprimível aqui.** O `claude_run` do kit funde
   stdout e stderr num arquivo só, então a regra vale para a saída COMBINADA. Separar os
   fluxos muda a evidência de `attempt-N/` (CONTRATO §5.3) e é peça própria. O que cobre
   esse buraco hoje é o `probe_modelos`, que o Actus não tem: uma ferramenta quebrada é
   pega ANTES de qualquer ticket, em vez de ticket a ticket.

### G · gate `tipo: baseline`  `d0eecdb`

`direcao: "max" | "min"` (padrão `max`), `contagem_regex` (sem grupo de captura conta
LINHAS; com grupo, SOMA os números — um placar por bloco) e `preparo: [...]`, rodado antes
do `cmd` com o **rc ignorado** (é higiene, não verificação; é o mesmo `|| true` que o
`sanear_tsc` do Comarka já escreve).

**Um DEFEITO caiu no caminho, e vale mais que a peça:** em `direcao: max`, quem decide
passou a ser a CONTAGEM, não o exit code. Um `tsc` com 3 erros herdados **sempre** sai
!= 0, então exigir exit 0 junto tornava todo `baseline > 0` **impossível de satisfazer, em
silêncio**. O CI nunca viu porque os dois baselines dele são 0, onde as duas leituras
coincidem — e o Comarka teria migrado para um gate que reprova todo ticket para sempre.
Com o conserto veio o guard do gate MUDO: exit != 0 com contagem ZERO reprova assim mesmo,
porque é o comando que falhou por outro motivo. Em `direcao: min` o exit code continua
valendo: ali a contagem mede sucesso, e placar alto não desfaz o que quebrou.

**ACHADO, registrado em `PROPRIAS_DE_REPO`:** o `gate_tsc` do Comarka
(`executor.sh:119-125` de lá) **não conta nada** — filtra a saída por
`baseline_scope_regex` e reprova se sobrar qualquer `error TS` FORA do escopo
`qualificacao`. O `baseline: 3` é documentação naquele repo. Traduzir para contagem muda o
SIGNIFICADO do gate (mais frouxo num eixo, mais rígido noutro), e isso é **decisão humana**
na adoção do Comarka — a tabela não converte sozinha.

*O que o CI faz diferente:* nada. Nenhum gate dele declara `direcao`, `contagem_regex` ou
`preparo`; os dois `baseline: 0` seguem com a MESMA mensagem de motivo, byte a byte
(`1 erro(s) de tipo, baseline 0`); `ACEITA placar MAIOR que o baseline` continua indo pelo
caminho do `baseline_placar`, que esta peça não toca; os 29 casos de
`orquestrador-gates.test.ts` seguem verdes sem edição.

### D10 · o ticket é o PRIMEIRO bloco ```json  `50a4f6c`

Divergência 10 do `CONTRATO.md`, **fechada**. Três leitores davam três respostas; agora dão
uma. `lib.sh:ticket_json` deixou de CONCATENAR todos os blocos (com dois, o resultado não
parseava e o `jq` derrubava o preflight do run inteiro); `ticket_set` deixou de reescrever
mais de um (com dois blocos ele DESPEJAVA o JSON do ticket por cima do exemplo da prosa);
`gate-ticket.ts` e `fila-read.ts` já liam o primeiro; `migrar-tickets.ts` deixou de PULAR e
passou a NOTAR.

**Por que o primeiro, e não o último que a §2 dizia:** dois dos três leitores já liam o
primeiro, e o ticket abre o arquivo. Um bloco JSON no meio da prosa é exemplo de payload —
coisa que todo ticket sobre API descreve —, e "vale o último" transforma qualquer exemplo
colado no fim numa troca silenciosa da fonte de verdade da máquina.

*De quebra:* a cerca passou a ser comparada SEM o espaço em volta também no `lib.sh`, como
os dois leitores de TS já faziam. Três leitores que concordam sobre qual bloco e discordam
sobre o que é uma cerca não concordam.

*Uma asserção da K8b-5 foi REVERTIDA, com o porquê no arquivo:* "DOIS blocos: pulado" virou
"migra o PRIMEIRO e NOTA o segundo". Quando ela foi escrita, o motor discordava de si mesmo
e recusar era o certo; agora pular seria a migração discordando do motor.

*O que o CI faz diferente:* **nada** — nenhum dos 517 tickets dos três repos tem mais de um
bloco (medido no PASSO 0 da etapa 5). Esta peça muda o comportamento em ZERO arquivo vivo:
fecha um buraco latente antes de alguém cair nele.

### T17 · piso de blacklist de ferramentas  `22794fd`

A allowlist continua DERIVADA do ticket (peça 0c) e ganha um PISO de negação vindo do
config: `proibicoes_absolutas.tools`. Ele vai em `--disallowedTools` na chamada **E** sai
da allowlist derivada (`perfil.ts:filtrarPeloPiso`) — duas trancas para a mesma proibição,
de propósito: depender só da precedência entre as duas flags é depender de uma regra do CLI
que não é deste repo, e o dia em que ela mudasse o piso silenciaria sem ninguém notar.

**A semente** tem as 9 entradas da `DISALLOWED_TOOLS` do Comarka mais `Bash(pnpm install:*)`,
`Bash(npm install:*)` e `Bash(npm ci:*)`. **Motivo do pnpm:** o `node_modules` da worktree é
LINKADO para o store do checkout principal; um install lá dentro faz o gerenciador ver
"deps fora de sincronia" e PURGAR o store do repo de verdade — o dano não é na worktree
descartável. O Actus se defende com um `.npmrc` de worktree; o piso é a tranca do outro
lado, na porta que CONCEDE o poder.

**Casamento por prefixo de comando com BORDA:** `Bash(npm install:*)` nega `npm install` e
`npm install --save-dev x`, e NÃO nega `npm installer` nem `npm i`.

*O que o CI faz diferente:* **hoje nada** — o `proibicoes_absolutas` dele é um ARRAY de
prosa, o piso nasce vazio e a flag nem é passada; a allowlist derivada sai byte a byte
igual (provado contra o config real). **Declarado** com a semente, ele passa a negar o que
já não usava: nenhuma tool da allowlist de hoje cai — também provado.

*A migração NOMEIA o caso em vez de resolver sozinha:* `porSeFaltar` passou a RECUSAR
escrever dentro de um segmento que não é objeto. Nos três repos `proibicoes_absolutas` é um
array de prosa, e escrever `.tools` ali dentro trocaria a lista de proibições absolutas por
um objeto — a migração apagando a coisa mais importante do arquivo para acrescentar uma
chave. O relatório do `--migrar` diz `NÃO APLICADA … Nada foi apagado`, com a instrução.

### K8b-7 · datar as liberações migradas  `4caa1ac`

`git log --format='%cs %an' -S'<token>' -- <arquivo>`, e o commit que vale é o **MAIS
VELHO** (o que introduziu o token), não o mais novo (a última vez que alguém mexeu na
linha). Sem história — fora do git, `git` ausente, timeout, saída ilegível —,
`desconhecido` FICA. A busca é pelo token SEM o prefixo `humano:`, que é acrescentado pela
própria migração: procurar a forma com prefixo não acharia nada justamente no Actus.

**Nunca sobrescreve dado presente**, campo a campo: data escrita à mão carrega intenção; a
data do commit é quando o registro foi COMMITADO.

*Medido no Actus, agora:* **1 de 5** tokens datado —
`humano:migration-0255-aplicada → 2026-08-14, lucasantosads`. Os outros 4 estão na árvore
de trabalho e **ainda não foram commitados** (`git status` do Actus:
` M docs/fila/liberacoes.json`), então o git não sabe nada sobre eles e `desconhecido`
fica. É a resposta certa, e é a demonstração do desenho num caso real que ninguém montou.

*O que o CI faz diferente:* os 7 tokens dele estão em v1 canônica e sem data; um
`instalar.sh --atualizar <ci> --migrar` de novo agora os DATA pelo git. **Passo humano
OPCIONAL e sem efeito no motor** — `liberacao_ok` resolve token por token e nunca lê
`liberado_em`.

---

## 4. Fechamento: as três suítes, cruas

```
$ npx vitest run --reporter=dot 2>&1 | tail -6

 Test Files  41 passed (41)
      Tests  987 passed (987)
   Start at  18:18:02
   Duration  20.61s (transform 605ms, setup 0ms, collect 14.66s, tests 126.77s, ...)

$ bash scripts/kit/test-shell.sh
== placar ==
  rc=0  test-lib-config.sh
  rc=0  test-drenagem.sh
  rc=0  test-retry-worktree.sh
TODOS OS SCRIPTS SAÍRAM rc 0

$ bash scripts/kit/test-instalar.sh
  | 17 diferença(s)
  (rc 1 — informativo)

TODOS OS CHECKS PASSARAM
```

`git log --oneline main`: **um commit por peça**, oito no total. `git status -sb`: limpo,
`ahead 8`, nenhum push. Nenhum `/tmp/orq-fixture*` sobrou.

**Os outros três repos:** `conteudos-infinitos` com árvore LIMPA depois de tudo. O
`actus-saas` (21 arquivos) e o `comarka-operacional` (1) já estavam sujos no PASSO 0 — o
loop do Comarka está vivo, e o Actus tem fila em edição. Todo acesso desta sessão a eles
foi `cat`/`jq`/`grep`/`git log`/`git status` e dois `--dry-run` que não escrevem: nenhum
byte de nenhum dos três foi alterado por esta sessão.

---

## 5. O rascunho da adoção — os dois dry-run, comentados

### 5.1 `bash instalar.sh --atualizar ~/Projetos/conteudos-infinitos --dry-run`

17 diferenças, **todas do motor desta etapa** e nenhuma de dado:

```
diferente   config-chaves.ts, config-cli.ts, config-tabela.ts, decisao-cli.ts,
            decisao.ts, enforcement-core.ts, executor.sh, gates.ts, lib.sh,
            local-loop.sh, migrar-config.ts, migrar-liberacoes.ts,
            migrar-tickets.ts, perfil.ts, scripts/orq
só no kit   scripts/orquestrador/prevoo.ts
diferente   docs/orquestrador/skill/templates/config.json
RECUSARIA: o loop não está pausado
```

`docs/fila/**` não aparece — o `--atualizar` não toca fila em caso nenhum. A recusa por
falta de pausa é a esperada e não impede a listagem.

### 5.2 `bash instalar.sh --atualizar ~/Projetos/actus-saas --migrar --dry-run`

90 diferenças de motor — o Actus tem o motor **em `.mjs`**, próprio, então a lista é
`só no repo` (o dele) contra `só no kit` (o nosso). A adoção substitui um pelo outro; é
disso que a etapa 7 trata.

O que interessa aqui é o bloco `=== MIGRAR docs/fila/** ===`, item a item:

| item | o que saiu | comentário |
|---|---|---|
| pausa | `nada a fazer: não existe docs/fila/.orq-pause` | o Actus nunca usou o sentinela v1 |
| **liberações** | `tokens[]: 5 (5 string, 0 objeto, 5 sem o prefixo humano:)` → 5 objetos v2, **1 datado pelo git** | K8b-7 no primeiro contato com um repo real. Os 4 sem data não estão commitados |
| **tickets** | `53 arquivo(s) de ticket … nenhum ticket pendente a migrar` | os pendentes do Actus já usam os nomes novos |
| **config** | 4 renomes, 12 chaves novas de política, 12 decisões locais em placeholder, 1 `NÃO APLICADA`, 3 `MANTIDA` | detalhado abaixo |
| `.gitignore` | `FALTA docs/fila/PAUSAR` | acusação correta: depois da migração o kill switch muda de nome |
| `orq validar` | `(o repo ainda não tem scripts/orq executável)` | só depois da vendorização |

**Os 4 renomes do config**, com a linha do motor que lê cada destino:

- `avaliador_model → modelos.juiz_alto = "opus"` e `→ modelos.juiz_baixo = "opus"`
  (`juiz.ts:76`). Copiar para os dois preserva o comportamento EXATO de hoje; baratear o
  juiz de risco baixo é decisão de custo, não efeito colateral de migração.
- **`migrations_faixa_loop → migrations.faixa = "0250-0299"`** (`enforcement-core.ts:273`).
  Novo nesta etapa. O motor aceita a string e a tupla `[min,max]` para que o renome seja
  CÓPIA de valor, e não transformação.
- **`zona_proibida.no_write_columns → zona_proibida.colunas_congeladas = ["etapa_canonica"]`**
  (`enforcement-core.ts:426`). Novo nesta etapa.

**A única `NÃO APLICADA`**, e é o desenho funcionando:

> `proibicoes_absolutas.tools` — `proibicoes_absolutas` neste repo é
> `["nunca push na branch principal", …]`, e não um objeto. **Nada foi apagado.** Para
> ligar: mova o conteúdo atual para `proibicoes_absolutas.regras` e acrescente
> `proibicoes_absolutas.tools` = `[…12 entradas…]`.

**As 3 `MANTIDA`** (`migrations_faixa_loop`, `zona_proibida.no_write_columns`,
`zona_proibida.padroes_proibidos_no_diff`): as duas primeiras agora dizem **ABSORVIDA** e
para onde a tabela copia o valor; a terceira diz que **ainda falta** (é a regra F, K11a-4)
e que o Actus perde essa proteção até lá.

**`orq config` sobre o proposto: 15 violações** — 14 placeholders de decisão local (tetos de
orçamento, campos do envelope, paths de alto risco, `branch_protegida`,
`worktrees_prefixo`, `launchd.label`) **mais uma nova, que é a peça K11a-1 falando**:

> `migrations.dir`: migrations.faixa (ou faixas_reservadas) declarada sem migrations.dir —
> a regra B do enforcement só cobra .sql sob migrations.dir, então a faixa não vale para
> arquivo nenhum. Declare o diretório (no Actus: `"supabase/migrations"`) ou tire a faixa.

É exatamente o comportamento pedido: a faixa migra sozinha, o diretório é declarado à mão, e
a regra nasce ligada **de propósito**.

---

## 6. O que o Actus AINDA perde ao trocar de motor — nomeado, não escondido

Três coisas, todas em **K11a-4** (`docs/PECAS.md`, PENDENTES), e o cabeçalho de
`test/orquestrador-enforcement-actus.test.ts` as repete para quem abrir o teste:

1. **regra E, `no_write_prefixes`** — CREATE/ALTER/DROP de objeto com prefixo (`vw_` no
   Actus, `trafego_`/`vw_` no Comarka). 3 casos lá. É a MESMA regra com dois donos, e é o
   argumento para fazê-la antes das duas adoções.
2. **regra F, `padroes_proibidos_no_diff`** — regexes com flags inline `(?i)/(?is)`, três no
   Actus: reancoragem de `tenant_id` em tabela particionada, `session_replication_role`,
   DELETE físico. 10 casos, e a mais cara de portar: cada uma carrega uma regressão medida
   junto (o `[^;]*` que atravessava SET→WHERE).
3. **a exceção estreita de `supabase/tests/*.test.sql`** — as 4 condições do
   `checarTesteSql` (nome, bloco `DO $$` com tag que aceita dígito, `RAISE EXCEPTION`, zero
   DDL/DML de topo fora do DO, com comentário `--` removido antes). 14 casos.

**Recomendação:** K11a-4 antes de trocar o motor do Actus. As três são enforcement, e
enforcement é a única parte do motor onde "faltar" não dá erro — dá aprovação.

---

## 7. Passos humanos para o CI receber esta etapa

Na ordem. Nada aqui é feito pelo kit.

1. **Revisar** os 8 commits em `~/Projetos/orquestrador-kit` e dar `git push`.
2. **Pausar o loop do CI:** dentro de `~/Projetos/conteudos-infinitos`,
   `bash scripts/orq pausar "atualizando o motor para a etapa 6"`.
3. **Atualizar o motor:** `bash instalar.sh --atualizar ~/Projetos/conteudos-infinitos`
   (sem `--dry-run`). Ele imprime o `--verificar` no fim e sugere os dois commits separados
   (motor × dados).
4. **Rodar `bash scripts/orq prevoo` no CI** e confirmar `GO` (foi o que deu nesta sessão,
   em modo leitura).
5. **Retomar:** `bash scripts/orq retomar`.

**Opcionais, e cada um é uma decisão:**

6. **Ligar o piso de tools no CI (T17).** Editar `docs/fila/000-config.json`: trocar
   `"proibicoes_absolutas": [ …prosa… ]` por
   `"proibicoes_absolutas": { "regras": [ …a mesma prosa… ], "tools": [ …a semente… ] }`.
   A semente está em `perfil.ts:PISO_TOOLS_SEMENTE` e no
   `doutrina/templates/config.json`. **O CI passa a NEGAR o que já não usava** — nenhuma
   tool da allowlist de hoje cai, e isso está provado por teste.
7. **Redatar as 7 liberações do CI (K8b-7).** `instalar.sh --atualizar <ci> --migrar` de
   novo agora as data pelo git. **Sem efeito no motor:** `liberacao_ok` nunca lê
   `liberado_em`. É higiene de procedência, não requisito.
8. **Ligar a regra B no CI?** NÃO. O CI não tem faixa de migrations; declarar
   `migrations.dir` lá ligaria uma regra que ninguém pediu.

**Para a adoção do Actus (etapa 7), na ordem:**

1. Fazer a **K11a-4** primeiro (§6).
2. `bash scripts/orq pausar` no Actus, depois `instalar.sh --atualizar ~/Projetos/actus-saas`.
3. `--migrar` para gerar `000-config.proposto.json`; preencher as 12 decisões locais,
   declarar `migrations.dir: "supabase/migrations"`, e converter `proibicoes_absolutas` nas
   duas metades. **Só então** `migrar-config.ts --aplicar`.
4. Commitar os 4 tokens de liberação que estão na árvore de trabalho **antes** de rodar a
   migração de liberações, se quiser que eles sejam datados.
5. `orq config` até sair 0. `orq prevoo` até sair `GO`.
