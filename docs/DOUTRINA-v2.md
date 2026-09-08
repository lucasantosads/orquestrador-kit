# DOUTRINA v1 → v2: o diff de DECISÕES

> **O que este documento é:** a lista do que a doutrina passou a dizer diferente, e
> por quê. Não é changelog de arquivo (isso está no `CHANGELOG.md`) nem resumo da
> doutrina (isso é a `doutrina/SKILL.md`). É a resposta a uma pergunta só: *se eu
> operava pela v1, o que muda para mim?*
>
> **Regra deste arquivo:** toda linha da coluna "por quê" aponta para uma medição,
> um incidente com data, ou uma linha de código. Decisão sem custo registrado é
> preferência, e preferência não entra em doutrina.
>
> Escopo: peça **K10** do `docs/PECAS.md`. Kit `VERSAO` 2.1.0-dev.

---

## 1. As seis decisões que mudaram

| # | v1 dizia | v2 diz | Por quê (a evidência) |
|---|---|---|---|
| 1 | **"Nunca copie scripts de outro repo: eles carregam premissas locais que viram falso-verde."** Cada repo GERA a própria implementação, lendo a skill como spec. | **Motor único versionado.** Existe UM motor, sem premissa de repo, instalado por `instalar.sh --novo` e atualizado por `--atualizar`. O que varia vive em `docs/fila/000-config.json`. Editar o motor vendorizado é **NO-GO no pré-voo**. | A regra v1 estava certa sobre o sintoma e errada sobre o remédio. Três repos rodando o "mesmo" loop divergiram: três `liberacoes.json` em formatos diferentes, dois schemas de config, um `tipo: tsc_baseline` que só um deles entende. Reimplementar carrega premissa NOVA a cada repo, e nenhuma das três implementações tem os testes das outras. A premissa local se combate tirando-a do código (três saíram em set/2026: nome de pacote do monorepo, nome de gate na linha `GATE`, label do launchd), não multiplicando o código. |
| 2 | **Faixa de IDs por bloco** (B1=100–199, B2=200–299…), para que o ID sozinho carregue o contexto. | **ID é ordem de fila, sequencial global.** A pertença vive nos campos `bloco` e `frente` do JSON do ticket. | Medido em campo (conteudos-infinitos, 2026-09-04): os blocos progridem em PARALELO e o loop drena em ordem de ID, então faixa por bloco vira **prioridade por bloco** — o B1 inteiro passa na frente do B2 porque começa com 1. Prioridade é decisão de produto e tem de ser explícita, não efeito colateral da numeração. |
| 3 | **Canal de notificação:** "notificação nativa · webhook · e-mail com fallback em arquivo". A nativa era o exemplo primeiro. | **`arquivo` é o PADRÃO** (`runs/notificacoes.log`); qualquer outro canal é acréscimo e mantém o fallback. | O loop roda headless sob launchd/cron/CI, muitas vezes sem sessão gráfica. Canal que depende de sessão falha exatamente quando o humano não está olhando — que é quando a notificação serve para alguma coisa. Arquivo é `tail`-ável, sobrevive a reboot, já está no `.gitignore` e não tem credencial para expirar. |
| 4 | **`risco`** aparecia como campo do ticket, ao lado de `bloco` e `objetivo`, sem dizer quem o preenche. | **`risco` é DERIVADO.** Quem escreve deixa a chave vazia (`"risco": ""`); o passo 6 do gate a preenche, por script, com modelo barato só na dúvida. O gate cobra que a CHAVE exista, nunca que tenha valor. | Pedir a classificação ao autor troca uma medida por uma opinião — e o autor é quem tem interesse em que o ticket dele seja "baixo". Custo registrado (conteudos-infinitos, 2026-09-07): a primeira versão do check 2 do gate cobrava VALOR em `risco` e `dependencias`, e reprovou os 7 pendentes de uma vez. O gate estava reprovando ticket por não ter feito o que o próprio gate ainda vai fazer. |
| 5 | **"Quem escreve o harness":** mudança de motor é "sessão interativa, com diff cru revisado por humano" — dentro do repo. | Mudança de motor é sessão **no kit**, com teste que prova a mudança na peça que a pede, e chega nos repos por `--atualizar`. O repo instalado RECEBE o motor; não o edita. `instalar.sh --verificar` é a asserção. | Incidente de 2026-09-08, no próprio kit: o "vermelho antes" de uma peça rodou o instalador ANTIGO — que ignorava `--dry-run` — e CARREGOU um job de launchd apontando para um fixture em `/private/tmp`, por 1h40, com três disparos morrendo em `rc 127`. "Job carregado" foi lido como "job saudável" porque nada media o contrário. O conserto não foi cuidado: foi um stub de `launchctl` no PATH dos testes e uma RECUSA no instalador. Fronteira precisa de código; disciplina não sobrevive à sexta-feira. |
| 6 | **Instalar** = passo 4 do `setup.md`, "gerar os scripts com Claude Code lendo a skill como spec", seis scripts, cada um com teste próprio. | **Instalar** = `bash instalar.sh --novo <repo>` → preencher o config → `orq config` sai 0 → pré-voo. O passo 4 vira uma TABELA do que já está instalado. | Corolário direto da decisão 1. E a v1 já pagava por ele: `setup.md` mandava "gerar", e o resultado foram três motores diferentes cujas divergências esta etapa passou a migrar uma a uma. |

---

## 2. O que NÃO mudou, e vale dizer

Doutrina que muda demais não é doutrina. Estas continuam idênticas, e são a maior
parte do documento:

- **as 12 regras inegociáveis da v1**, sem exceção — critério executável, fronteira
  em código, três estados, fonte única, git é ground truth, fail-fast por custo,
  fronteiras duras, evidência sagrada, read-back, PLAYBOOK no mesmo commit, rc
  checado em toda preparação, estado de segurança em arquivo;
- **as 8 regras da v2** (13 a 20), que nasceram por desenho e continuam marcadas
  como tal;
- a **arquitetura da Fase 2** inteira, o pipeline fail-fast e a ordem dele;
- a **escada de modelos** e as 10 alavancas de custo;
- a seção de **colisão de teste entre tickets**, com os três remédios;
- os **critérios de maturidade** por camada.

---

## 3. Onde cada decisão está escrita

| Decisão | Arquivo |
|---|---|
| 1 · motor único versionado | `doutrina/SKILL.md`, abertura + "Quem escreve o harness"; `references/setup.md` §1 e §4 |
| 2 · ID sequencial global | `doutrina/SKILL.md`, "Roadmap hierárquico"; `templates/MAPA.md`; `templates/mapa.json`; `templates/TICKET.md`; `references/fase-0-arquitetar.md`; `references/autoalimentacao.md` |
| 3 · canal padrão = arquivo | `doutrina/SKILL.md`, "Observabilidade obrigatória" e a tabela de decisões locais |
| 4 · `risco` derivado | `doutrina/SKILL.md`, "Escrevendo tickets para a fila"; `templates/PLAYBOOK-seed.md` |
| 5 · harness é do kit | `doutrina/SKILL.md`, "Quem escreve o harness" |
| 6 · instalar = `--novo` | `references/setup.md` §1, §3, §3.5 e §4 |

---

## 4. O que a v2 ACRESCENTA ao seed do PLAYBOOK

`doutrina/templates/PLAYBOOK-seed.md` ganhou **15 lições de campo triadas** do
PLAYBOOK do conteudos-infinitos (129 registradas entre 01 e 08/set/2026, lido só
para leitura). O critério de entrada, escrito no próprio arquivo, tem três
filtros: a lição é sobre o MECANISMO (não sobre o produto, a stack ou o roadmap
daquele repo); foi PAGA com incidente ou medição; e muda o que alguém faria num
repo novo. Cada uma carrega data e origem — lição sem procedência vira folclore
em três meses.

As outras 114 não são piores: são locais, já estão na `SKILL.md`, ou são variações
das 15. A triagem do resto é a peça **K10b**.

---

## 5. O que esta peça NÃO resolveu

Registrado aqui porque doutrina que esconde a própria lacuna é pior que lacuna:

- **`risco` derivado ainda exige a CHAVE presente.** A doutrina diz que quem
  escreve não classifica; o gate continua cobrando que `risco` exista no JSON, com
  valor vazio. Tornar a chave opcional é mudança de motor
  (`gate-ticket.ts`, `CAMPOS_PENDENTE`), com teste próprio, e não entrou aqui —
  fazê-la de passagem numa peça de documento juntaria duas mudanças com raios de
  alcance muito diferentes.
- **A triagem das outras 114 lições** (K10b).
- **O `EXECUTOR.md`** não foi retriado nesta peça: ele é o extrato de ≤ 60 linhas
  que vai no prompt, e mexer nele muda o que o executor lê a cada ticket.
