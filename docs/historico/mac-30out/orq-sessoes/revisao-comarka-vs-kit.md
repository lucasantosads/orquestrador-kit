# Revisão Comarka x kit · 21/09/2026

Sessão só de leitura. Objetivo: saber o que o harness do comarka-operacional faz que o motor do orquestrador-kit não faz, quanto disso o bloco novo do kit (itens 1 a 9) já cobre, e onde o Comarka é pior. Toda afirmação traz arquivo:linha ou comando.

## 0. Escopo, método e o que mudou durante a sessão

- **Kit:** `~/Projetos/orquestrador-kit` em `6ff6f29`, árvore limpa. O motor do CI é byte a byte igual ao do kit (`cmp` de executor.sh, lib.sh, local-loop.sh, decisao.ts, juiz.ts e perfil.ts). O motor do Actus também é o do kit, com um patch local em executor.sh, lib.sh e decisao.ts: `permissoesNegadas` vira a causa `ambiente` (ver F).
- **Comarka:** `~/Projetos/comarka-operacional`, motor próprio.
- **Mudança durante a sessão.** O "diff não commitado" do enunciado (local-loop.sh, 000-config.json, test-disjuntor.sh) foi commitado por outra sessão às 11:19, como `e0973b0 orquestrador: disjuntor de retry sem progresso (440 rodou 19x)`. Li esse material por `git show e0973b0`. A mesma sessão estava editando `docs/fila/490-*.md`.
- **stash@{0} (`wip-315a-check-baseline`).** É código de PRODUTO: `src/app/api/churn/saidas/route.ts`, `etapa-helpers.ts` e `saidas-em-andamento.tsx`. Não contém harness. Para esta revisão, o que conta do 315a é o incidente de timeout (PLAYBOOK do Comarka, lição de 13/09) que deu origem ao `$vistos` (ver G).
- **Métricas de Actus e CI.** Saíram de um subagente de leitura. Conferi 6 números com o mesmo comando (tentados, aprovados e custo dos dois repos) e todos bateram.
- **Qualidade dos tickets.** Saiu de outro subagente. Conferi 2 exemplos no disco: `002-t-a-registro-whatsapp.md:51` e `local-loop.log:37561`.
- **Arquivos fora do escopo pedido.** Um arquivo temporário ficou no scratchpad da sessão: `.../scratchpad/meta.jsonl`, uma extração de meta.json que abandonei. Não é repo, mas tentei removê-lo e o `rm` foi negado pela permissão. Nenhum outro arquivo foi criado ou editado.

---

## 1. Métricas dos três repos

**Janela pedida:** 22/08 a 21/09. A cobertura real de cada trilha é:
- **Comarka:** `local-loop.log` começa em 21/08 13:23. O `meta.json` foi filtrado por `ts >= 2026-08-22`.
- **Actus:** o events.log só começa em 11/09. Antes disso o formato era outro, sem trilha.
- **CI:** o events.log começa em 03/09, e o último INICIO é de 09/09.

Nas contagens, "tickets" é sempre por ticket distinto.

| Métrica | Comarka | Actus | CI (conteudos) |
|---|---|---|---|
| Tickets tentados | 401 (meta.json); 406 (log `=== ticket`) | 29 | 50 |
| Tickets aprovados | 356 | 20 | 45 |
| Aprovados na 1ª tentativa, estrito | 227 (nenhum reprovado/bloqueado no histórico) | 12 | 34 |
| Aprovados com o rótulo attempt=1 | 274 | 13 | 38 (35 attempt=1 e 3 attempt=0, que é o formato antigo) |
| Aprovação estrita de primeira / tentados | 57% | 41% | 68% |
| Reprovação: juiz com gate verde (eventos / tickets) | 122 / 79 | 18 / 10 | 2 / 2 |
| Reprovação: critério mecânico | 94 / 53 | 53 / 7 | 20 / 9 |
| Reprovação: gate (tsc / vitest / build) | 10/9 · 79/53 · 0 | 10 / 3 (os três somados) | 3 / 1 |
| Reprovação: diff acima do cap | 33 / 24 (consome retry) | 0 (vira REFATIAR) | 0 |
| Reprovação: exit ≠ 0 | não separado | 0 | 1 / 1 |
| Motivo gravado na trilha | texto livre no log | `criterio_qualidade` em 81/81 | `criterio_qualidade` em 26/26 |
| Taxa de reprovação do juiz | 122 de 482 julgamentos (25%) | 18 de 40 (45%) | 2 de 44 (5%) |
| Adiados | executor 45/25, avaliador 3/2 | 5 eventos, 2 tickets, todos `ambiente` | 0 |
| Bloqueados (tickets) | 36 | 11 (4 aprovados depois) | 5 (1 aprovado depois) |
| Enforcement / refatiar | 41 bloqueios em 37 tickets | 2 REFATIAR | 1 REFATIAR |
| Obsoleto por recon | 18 / 17 | não existe | não existe |
| Execução sem registro (aborto antes do agente) | 35 execuções em 3 tickets (440×19, 442×14, 441×1) | não medido | não medido |
| Tentativas do executor com opus | 58 de 798 (7%), só na 3ª tentativa | 61 de 61 RETRY | 21 de 21 RETRY |
| PERMISSAO_NEGADA | não registra (`--output-format text`) | 18 eventos, 38 negações, 6 tickets | 36 eventos, 132 negações, 27 tickets |
| Custo | sem ledger. Proxy: 151,7 h de `claude -p`, 25,6 min por done | US$ 185,66; US$ 9,28 por aprovado; US$ 92,77 em tickets nunca aprovados | US$ 137,89; US$ 3,06 por aprovado |

### 1.1 Comandos e saída crua: Comarka

```
cd ~/Projetos/comarka-operacional/docs/fila/runs
M() { for f in */meta.json; do jq -c --arg id "${f%/meta.json}" '.[] | {id:$id, a:.attempt, r:.resultado, ts:.ts}' "$f"; done | jq -c 'select(.ts >= "2026-08-22")'; }
M | wc -l                                   -> 798
M | jq -r .id | sort -u | wc -l             -> 401
M | jq -r '[.r,.id]|@tsv' | sort -u | cut -f1 | uniq -c
  -> 27 adiado · 36 bloqueado · 356 done · 17 obsoleto · 1 pausado · 153 reprovado
M | jq -r 'select(.r=="done")|[.id,.a]|@tsv' | sort -u | awk '$2==1' | wc -l   -> 274
for f in */meta.json; do jq -r 'if any(.[]; .resultado=="done" and .ts>="2026-08-22") then (if any(.[]; .resultado=="reprovado" or .resultado=="bloqueado") then "com_reprova" else "limpo" end) else empty end' "$f"; done | sort | uniq -c
  -> 129 com_reprova · 227 limpo
for f in */meta.json; do jq -r '.[] | select(.ts>="2026-08-22") | "\(.attempt) \(.model)"' "$f"; done | sort | uniq -c
  -> 18 "1 -" · 523 "1 sonnet" · 199 "2 sonnet" · 58 "3 opus"
for f in */meta.json; do jq -r '.[] | select(.ts>="2026-08-22") | .claude_dur_secs // 0' "$f"; done | awk '{s+=$1} END{...}'
  -> claude_dur_secs total=546030 (151,7 h); por done(356)=25,6 min
ls custo.json -> No such file or directory
```

Categorias, com o ticket corrente tirado da linha `=== ticket <id> (`:

```
awk '/=== ticket [^ ]+ \(/{...t=id} /REPROVA \(|avaliador: REPROVADO|ENFORCEMENT BLOQUEOU|RECON_ESPERADO divergiu|ADIADO \((executor|avaliador)\)|git worktree add falhou/{...print c"\t"t}' local-loop.log
eventos:   3 adiado_avaliador · 45 adiado_executor · 122 avaliador · 94 criterio_mecanico · 33 diff_cap · 41 enforcement · 10 gate_tsc · 79 gate_vitest · 18 recon_obsoleto · 35 worktree_add_falhou
distintos: 2 · 25 · 79 · 53 · 24 · 37 · 9 · 53 · 17 · 4
grep -o 'avaliador: REPROVADO — .*' local-loop.log | (classifica) -> 121 merito · 1 json_ilegivel_recuperado
grep -c 'avaliador: APROVADO e mergeado' local-loop.log -> 360
grep -B3 'git worktree add falhou' local-loop.log | grep -oE '=== ticket [^ ]+' | sort | uniq -c -> 19 440 · 1 441 · 14 442
```

Ressalva: o `attempt` do meta.json do Comarka reinicia a cada execução (`executor.sh:688-691`). Por isso o número honesto de "primeira" é o estrito (227), não o rótulo (274).

### 1.2 Comandos e saída crua: Actus e CI

Esta subseção vem do subagente; conferi tentados, aprovados e custo.

```
W() { awk '/^[0-9]{4}-[0-9]{2}-[0-9]{2}T/ && substr($1,1,10)>="2026-08-22" && substr($1,1,10)<="2026-09-21"' $L; }
Actus (L=events.log)
  W | awk '$3=="INICIO"{print $2}' | sort -u | wc -l     -> 29
  W | awk '$3=="APROVADO"{print $2}' | sort -u | wc -l   -> 20
  estrito (um INICIO antes do 1º APROVADO) -> 1:12, 2:3, 3:1, 5:2, 7:1, 11:1
  REPROVADO -> 81 motivo=criterio_qualidade, 17 tickets; sub-motivo por veredito.json: 53 critério, 18 juiz, 10 gate
  ADIADO -> 5 motivo=ambiente (481, 488) · BLOQUEADO -> 20, 11 tickets
  jq '[.dias|to_entries[]|select(.key>="2026-08-22" and .key<="2026-09-21")|.value[]|.custo_usd]|add' custo.json -> 185.66455959999993
  REPROVADO com GATE verde -> 18 gate_verde juiz=reprovado · 63 gate_vermelho
  permissões (claude.txt .permission_denials[]) -> 18 ls, 7 grep, 3 npx next, 3 cat, 2 git diff, 2 cp, ...
CI (L=events.log; 365 linhas de continuação ignoradas, todas de PERMISSAO_NEGADA)
  tentados 50 · aprovados 45 · estrito 34 · custo 137.89442199999996 (US$ 3,06/aprovado)
  REPROVADO 26/12 tickets (20 critério, 3 gate, 2 juiz, 1 exit) · ADIADO 0 · BLOQUEADO 5
  permissões -> 39 test, 17 cd, 12 npm run typecheck, 12 git -C, 7 echo, 6 npm --prefix
```

---

## 2. Mecanismos: Comarka x kit

Legenda da última coluna: **P** = portar como está, **A** = adaptar, **R** = reescrever, **N** = não portar.

| # | Mecanismo | Comarka | Kit | Diferença | Evidência de impacto | Peça proposta | Encaixe | P/A/R/N |
|---|---|---|---|---|---|---|---|---|
| A1 | Prompt do executor | `executor.sh:51-110`: objetivo, allowlist, critérios com cmd; os de curl/localhost são escondidos do agente (`:61-68`); C0 e baseline tsc escritos à mão (`:82-88`); sem lista de tools | `executor.sh:332-403`: a lista de tools é a MESMA string do `--allowedTools` (`:346-350`, `:383-387`); aponta EXECUTOR.md (`:344`); exige trailer (`:396-398`) | Kit mais completo. Comarka hardcoda regra de repo no prompt | Tamanho (prompts desde 10/09): Comarka mediana 5.972 B (n=360); Actus 6.421 B (n=113) | nenhuma | n/a | N |
| A2 | Histórico de reprova no retry | Uma linha de até 160 caracteres (`executor.sh:242`), por exemplo `criterio[3] mecânico: esperado '0', obteve '0 ARQUIVO_AUSENTE'` (`runs/407a0/attempt-2/prompt.txt:73-74`). Gate reprovado manda só "ver gate-tsc.txt" (`:610`) | JSON do `diagnostico.ts` (`executor.sh:923-936`) com gate, arquivo, linha, esperado, obtido e trecho | Kit melhor, com um defeito: saída vazia faz `obtido` receber a DESCRIÇÃO do critério (`diagnostico.ts:196`) | Actus 481: `"esperado":"ok","obtido":"o script existe e tem teste"` (`runs/481/attempt-17/prompt.txt`). O cmd `vitest run ... >/dev/null 2>&1 && echo ok` apaga a evidência, e o 481 tem 18 diretórios de tentativa | Se a saída veio vazia, `obtido` = `"(vazia)"` mais as últimas linhas do cmd rodado sem o redirect | item 6 + nova | A |
| B1 | Worktree no retry | Sempre nova: reset total por tentativa (`executor.sh:406-416`, `:703`) | Reaproveita quando o enforcement passou (`executor.sh:1036-1043`, `:1093-1098`) | Kit melhor: o diagnóstico aponta para código que continua na árvore | Comarka: 199 tentativas 2 com sonnet. Não medi quantas refizeram trabalho | nenhuma | n/a | N |
| B2 | Escalada de modelo | Só na última tentativa (`executor.sh:501-509`). 58 de 798 tentativas com opus | `criterio_qualidade` = ESCALAR já no 1º retry (`decisao.ts:298-306`; config `politica_retry.por_causa.criterio_qualidade.modelo = "ESCALAR"` nos dois repos) | Kit escala por gate quebrado, por critério mal escrito e por ambiente, porque tudo cai em `criterio_qualidade` (`executor.sh:863-865`, `decisao.ts:226-236`) | 82 de 82 RETRY em opus (Actus 61, CI 21); Actus gastou US$ 92,77 em tickets nunca aprovados | Escalar só quando o sub-motivo é `juiz`, ou na última tentativa | item 3 + nova | A |
| B3 | Circuit breaker por motivo repetido | `norm_motivo` igual ao da tentativa anterior bloqueia na hora (`executor.sh:704-725`) | Não existe: `norm_motivo` só gera token (`lib.sh:464`) | Comarka melhor | Actus 461: diff 717/717/717 e depois 684/684/684; 491a: 453×3 | Breaker por (sub-motivo normalizado, diff idêntico) | nova | A |
| B4 | Evidência de tentativa | `attempt-N.prevK` (`executor.sh:461-465`). O 440 acumulou 19 `.prev` vazios | Slot monotônico `attempt-N` + `meta.json.dir` (`executor.sh:653-662`) | Kit melhor | `ls runs/440`: attempt-1 e attempt-1.prev1..prev18, todos vazios | nenhuma | n/a | N |
| C1 | Juiz: material e ferramentas | `avaliador.sh:81-110`: criterios.txt, diff.stat e diff com cap; usa a tool `Read` (`:122`); opus sempre (`:115-116`) | `juiz.ts:157-195`: diff cru, gates.txt e critérios; sem tool, `--max-turns 1` (`executor.sh:608-610`); sonnet/opus por risco (`juiz.ts:62-73`) | O Comarka deixa o juiz abrir arquivo; o kit não | Actus 501 bloqueado: "não traz o conteúdo de supabase/migrations/0264...sql ... não aprovo no benefício da dúvida" (`runs/501/attempt-2/juiz.veredito.json`) | Anexar ao prompt o conteúdo inteiro dos arquivos NOVOS do diff abaixo de N linhas; sem ferramenta | nova | A |
| C2 | Juiz: cobranças | "Se qualquer qualitativo não estiver claramente satisfeito, false" (`avaliador.sh:92-93`); sem anti-afrouxamento | Integração, teste tautológico, controle positivo (`juiz.ts:122-135`), anti-afrouxamento (`:137-144`), "na dúvida, REPROVE" (`:151`) | Kit mais exigente. O Actus usa juiz_baixo = opus | Reprovação do juiz: Comarka 25%, Actus 45%, CI 5% (juiz_baixo sonnet). O Actus 500 foi reprovado com justiça: `svc["from"](...)` para fugir de uma guarda de grep | Nenhuma no juiz. O defeito está no critério (M) | item 6 | N |
| C3 | Parse do veredito | Sem JSON, recupera `"aprovado": true` do texto cru e APROVA (`avaliador.sh:165-172`) | Ilegível = ADIADO, nunca aprova nem reprova (`juiz.ts:218-237`; `executor.sh:620-626`) | Comarka pior: aprova com veredito truncado | 1 caso no log (`json_ilegivel_recuperado`) | nenhuma | n/a | N |
| D1 | Allowlist de tools | Fixa: `ALLOWED_TOOLS` (`executor.sh:46`) + `DISALLOWED_TOOLS` (`:48`). `perfis_tools` do config é MORTO: só `perfil.ts` e `test/orquestrador-lock.test.ts` o leem | Derivada: BASE (`perfil.ts:19-36`) + cmds dos gates + prefixos dos critérios (`:283-301`) + piso T17 | O Comarka não mede negação (`--output-format text`, `executor.sh:519`) | Actus: 18 `ls` (compostos como `ls -la node_modules 2>&1 \| head -3`) e 2 `cp` para /tmp. CI: 39 `test $(grep…)` (o agente roda o critério inteiro), 17 `cd` e 12 `npm run typecheck` | Não portar perfis. Portar a MEDIÇÃO do Comarka? Não existe. Peça: instrução no prompt de rodar o critério como está escrito, e prefixo de critério que aceite `test` | K11b (linha perfis) | N (perfis) |
| E1 | Gate de tipo | `gate_tsc` filtra por `baseline_scope_regex` e reprova só se sobrar erro fora dele (`executor.sh:119-125`); `sanear_tsc` apaga .next (`:116`) | `tipo: baseline` com contagem, direção, `preparo` e guarda de gate mudo (PECAS, peça G) | Kit melhor. No Comarka, tsc que quebra sem imprimir `error TS` PASSA | 0 de 933 `gate-tsc.txt` sem `error TS` (risco não materializado) | nenhuma; `preparo: ["rm -rf .next tsconfig.tsbuildinfo"]` cobre o sanear | n/a | N |
| E2 | Gate streak cross-ticket | Mesmo gate reprovando N tickets diferentes pausa a fila e devolve os tickets a pendente (`lib.sh:422-508`; chamado em `executor.sh:711-741`); enforcement não conta (`:568-583`) | Não existe | Comarka tem, o kit não | Incidente 01/09: 271, 272 e 273 bloqueados por suíte alheia (`lib.sh:412-414`); a pausa de 03/09 foi falso positivo e levou à exclusão do enforcement (`executor.sh:576-580`) | Porte por sub-motivo `gate_<papel>`, nunca por `criterio_qualidade` | K11b | A |
| E3 | Dev server para critério HTTP | `serve_up`/`serve_down` na porta 3004 fixa (`executor.sh:163-190`) | Não existe | Local | 11 tickets bloqueados com "obteve '000'" (comentário `:160-162`) | não portar; critério HTTP é spec de repo | n/a | N |
| E4 | Timeout do claude | 1500 s (config); timeout adia sem cooldown (`executor.sh:542-549`) | 1800 s em Actus e CI; timeout adia e ARMA cooldown (`lib.sh:794-803`) | Comarka melhor | Comarka 02/09: pkill devolveu 124 e deixou a fila 1h parada (`executor.sh:538-541`) | ver F1 | item 3 | A |
| F1 | Ambiente x mérito x timeout | Três desfechos: limite remoto com cooldown; timeout local sem cooldown; 529/500/503 sem cooldown (`lib.sh:335`, `avaliador.sh:133-136` exit 31). Provas em `test-cooldown-causa.sh`, `test-adiado.sh`, `test-parser-verdict.sh` | Tudo que adia arma 60 min (`lib.sh:801`); `503`/`overloaded` = `rate_limit` (`decisao.ts:157`); gate que quebra vira `criterio_qualidade` e escala (`executor.sh:863-865`) | Comarka separa a causa do cooldown, o kit não. O kit separa infra de mérito melhor no juiz ilegível | Actus 481: patch local converte "permissão negada + critério 2/3" em ADIADO `ambiente` e ainda arma cooldown; 18 diretórios de tentativa, nunca aprovado | Item 3 com a tabela de causas do Comarka: cooldown só para `rate_limit`/`quota`; `timeout`, `5xx` e `gate_crash` adiam sem cooldown e sem escalar; permissão negada NÃO converte critério vermelho | item 3 | A |
| G1 | Sem progresso na drenagem | Pula para o próximo não tentado (`local-loop.sh:235-238`, `c31cfc8`) + contador persistente `runs/<id>/.sem-progresso` que bloqueia no limite (`:108-142`, `:239-268`, `e0973b0`) | Encerra a drenagem INTEIRA (`local-loop.sh:197-201`), sem memória entre disparos | Comarka melhor. No kit, um ticket que aborta antes do agente trava a fila toda, a cada tick, para sempre | Comarka 440: 19 execuções vazias. 315a: 8 timeouts deixaram 32 pendentes parados a noite toda (PLAYBOOK, lição de 13/09) | Porte de `$vistos` + contador persistente | item 2 | A |
| G2 | Seleção por prioridade | `selecionar_pendente` com `prioridade` 1-99, padrão 50, casa única (`lib.sh:147-196`; `c4273db`, `819707f`) | Alfabética (`lib.sh:555-562`) | Comarka tem, o kit não | Painel dizia 480 e o loop pegava 476 (`lib.sh:175-180`) | Porte | nova | P |
| G3 | Executor reescolhe o ticket | Loop passa `--ticket`; staging que avançou conta como progresso (`local-loop.sh:226-234`, `test-drenagem-divergente.sh`) | Loop passa `--ticket "$prox"` (`local-loop.sh:164`); o executor não reescolhe (`executor.sh:1193`) | Equivalente | n/a | nenhuma | n/a | N |
| H1 | Topologia | Bancada: `lint_topologia` acusa arquivo da allowlist que existe no disco e não em `origin/<alvo>`, e avisa quando o alvo está atrás de `origin/main` (`validar-fila.py:119-160`, `94d5456`). No loop: `ensure_branch_alvo` faz fast-forward com a origin (`lib.sh:210-236`) e `pull --ff-only` aborta na divergência (`local-loop.sh:349-355`) | `ensure_branch_alvo` só cria a branch (`lib.sh:569-575`); `prevoo.ts` não checa topologia | Comarka checa na bancada e no loop, o kit em nenhum | 392a, 393a e 394a: cerca de 10 tentativas sonnet em 2 dias (mensagem do `94d5456`); 486, 489 e 495 morreram por `PENDENTE_MERGE` (PLAYBOOK, lição de 20/09) | Item 4 + um caso a mais: arquivo da allowlist ausente em `<alvo>` | item 4 | A |
| I1 | Granularidade | `orq-granularidade.py` offline (`pontuar` em `:131-204`); diff cap REPROVA e consome retry (`executor.sh:597-605`); `dl = wc -l diff.raw` conta linhas do patch, contexto incluído (`:563`) | diff cap = `refatiar` sem retry (`decisao.ts:210-217`); DIFF_LINES por numstat (`executor.sh:812`) | Kit melhor nos dois pontos | Comarka: 33 reprovações por cap em 24 tickets, todas com retry gasto | nenhuma | item 7 | N |
| J1 | Faxina de worktrees | `limpar_worktrees_orfaos` no início da drenagem: só `orq-<número>` e só done/obsoleto (`lib.sh:273-302`, `test-cleanup-worktree.sh`); `limpar-worktrees.sh` entre repos, sem teste e fora do loop | `cleanup_worktree` em todo desfecho (`executor.sh:300-306`) e `cleanup_frente` depois do merge (`local-loop.sh:221-227`); dono verificado só no worktree de staging (`lib.sh:597-618`) | Nenhum dos dois verifica o dono do worktree de TICKET antes do `worktree add` (Comarka `executor.sh:410-416`, kit `:274-280`) | 440, 441 e 442: `_worktrees/orq-<id>` é worktree VIVO do actus (`worktrees_prefixo: "orq-"` no config do Actus, `orq-` fixo no Comarka `executor.sh:452`). 35 execuções vazias | Item 9 + dono no `setup_worktree` + pré-voo que recuse dois repos com o mesmo prefixo no mesmo `worktrees_dir` | item 9 + item 4 | A |
| K1 | C0 | `c0_intocavel` (config `:33-80`) + enforcement-core | Regras C/E por config (K11a-1, K11a-4a) | Coberto; falta a decisão de renome | n/a | já na K11b | K11b | decisão |
| K2 | Lock | `mkdir $LOCK` + `trap rmdir` (`local-loop.sh:290-293`); `lock.ts` está testado (`test/orquestrador-lock.test.ts`) mas o loop NÃO o chama | `lock.ts` com pid e idade (`local-loop.sh:38-65`) | Kit melhor. O teste do Comarka testa código morto | FIXES-comarka.md Fix 3: seis `pkill` + `rmdir` em 13/08 | nenhuma | n/a | N |
| K3 | Painel | `orq-server.py` (1.787 linhas), `LABELS` fixo (`:97-100`), lê `events.log` (`:442`), que o próprio Comarka não tem | K12 pendente | Já planejado | O painel não enxerga o Comarka por events.log | K12 como está | K12 | R |
| K4 | Telemetria | `telemetria.ts` está morto: espera um objeto que `write_meta` nunca escreveu ("0 de 313", `orq-telemetria.py:5-8`); `orq-telemetria.py` funciona, com 8 baldes (`:78-87`) | `schemas/motivo_categoria.json` copiou os baldes, e nada os usa | A taxonomia existe, mas não está na trilha | "162 de 162 criterio_qualidade" no Actus: o balde não discrimina | sub-motivo no REPROVADO (ver L1) | nova | A |
| K5 | Writeback de status | `ticket_set_status` NÃO commita (`lib.sh:91-107`); humano commita em lote (`7382ac3`: 32 arquivos; 19 commits de status na janela) | `ticket_commit` a cada transição (`lib.sh:191-196`) | Kit melhor | PLAYBOOK, lição 14-15/09 (346a): writeback sobrescreveu uma edição não commitada | nenhuma | item 8 | N |
| K6 | Push | Push de `staging-auto` por ticket (`local-loop.sh:200-215`) | Nunca pusha (D11) | Comarka contradiz o próprio CLAUDE.md ("Nunca git push") | n/a | nenhuma | n/a | N |
| K7 | Writeback Notion / e-mail | `writeback-notion.ts`, `relatorio-email.ts` (`.github/workflows/orquestrador.yml:106`) | Não tem | Local | Drenagem vazia gastava ~5 min em sync (PLAYBOOK 07-08/09) | não portar | n/a | N |
| L1 | Formato da trilha | Não há events.log. `local-loop.log` (2,7 MB) em texto livre, com 27.519 linhas carimbadas `[orq HH:MM:SS]` em UTC e SEM data (`lib.sh:39`) ao lado de `[AAAA-MM-DD ... -0300]` (`local-loop.sh:47-48`). meta.json sem motivo (`lib.sh:685-701`). Aborto antes do agente não gera registro | `event()` com uma linha por evento, escape de `\n` (`lib.sh:297-324`), vocabulário fechado (CONTRATO §4.1) | Kit muito melhor. As 365 linhas quebradas do CI são todas de 05 a 07/09, anteriores a `3af530d` (07/09, "evento na trilha nunca contém \n") | Comarka: 35 execuções do 440/442 invisíveis em meta.json | `REPROVADO motivo=criterio_qualidade sub=juiz\|criterio\|gate_<papel>\|exit` | nova (L) | A |
| M1 | Qualidade de ticket | `recon_esperado` executado antes do agente (`executor.sh:278-303`, `:477-485`); `validar-fila.py` na bancada | `recon` lido e não executado (1b pendente) | Comarka melhor, com um custo: recon divergente vira OBSOLETO em silêncio | 18 obsoletos sem gasto; 486, 489 e 495 mortos por recon errado (PLAYBOOK, lição de 20/09) | Peça 1b com desfecho `bloqueado` + nota, nunca `obsoleto` | 1b | A |

---

## 3. Os itens 1 a 9 do bloco novo

**1 · test-drenagem.sh roda no kit com fixture própria**
- **O Comarka já resolve.** Os testes de drenagem dele montam fila e config em heredoc, sem depender do checkout (`test-drenagem.sh:11-21`, `test-disjuntor.sh:17-27`, `test-drenagem-sem-progresso.sh:14-23`).
- **O problema no kit.** O `test-drenagem.sh` do kit copia o `000-config.json` do checkout (`scripts/orquestrador/test-drenagem.sh:22-29` e `:87`). O kit não tem `docs/fila` (estado0-kit: `ls: docs/fila: No such file or directory`).
- **Contra-teste vermelho:** rodar o `test-drenagem.sh` atual na raiz do kit tem de falhar no `cp`, e o novo tem de passar sem `docs/fila`. O padrão de fixture do Comarka serve de molde; o teste em si não, porque os stubs chamam funções do motor dele.

**2 · Guarda de sem-progresso**
- **O Comarka já resolve, em duas camadas.**
  - `$vistos` pula para o próximo ticket em vez de encerrar a drenagem (`local-loop.sh:235-238`).
  - Um contador persistente bloqueia o ticket no limite configurado (`:108-142`, `:239-268`, commit `e0973b0`).
- **O kit encerra a fila inteira** (`local-loop.sh:197-201`).
- **Contra-testes vermelhos, prontos para adaptar:**
  - `test-drenagem-sem-progresso.sh`: 2 tickets que abortam. O Comarka faz 2 chamadas; o kit, hoje, faz 1.
  - `test-disjuntor.sh` casos 1 a 4: bloqueia no 3º disparo; exit 31 não conta; staging que avança zera o contador; o limite vem do config. O kit, hoje, nunca bloqueia.
- **Defeitos a não copiar:**
  - O disjuntor muda o status sem commitar (`local-loop.sh:261-262`).
  - A causa é a última linha que casa `ERRO|fatal|FAIL` na saída (`:139-142`). Frágil, mas útil.

**3 · Reprova ambiental x mérito**
- **O Comarka resolve parte.**
  - Separa limite remoto (com cooldown), timeout local (sem cooldown) e 5xx (sem cooldown), em `executor.sh:531-555`, `lib.sh:335` e `avaliador.sh:133-141`.
  - Recusa de preflight morre antes da tentativa (`executor.sh:774-832`).
- **O Comarka NÃO resolve:**
  - Crash de gate: vitest que não roda reprova como mérito; tsc que não imprime `error TS` passa.
  - Teste fora da allowlist: só avisa (`executor.sh:378-402`).
  - O disjuntor BLOQUEIA ticket por ambiente. O 440 é colisão de worktree, não spec.
- **Contra-testes vermelhos:**
  - `test-cooldown-causa.sh`: timeout não arma cooldown. No kit, `mark_adiado` sempre arma (`lib.sh:801`), então fica vermelho.
  - `test-adiado.sh` parte A: gate duplo rc + texto. Já é verde no kit e serve de regressão.
  - Caso novo: `gates_rc != 0` sem nenhuma linha de falha de teste não pode escalar modelo. Hoje escala (`executor.sh:863-865` + `decisao.ts:298-306`).

**4 · Pré-voo de topologia**
- **O Comarka resolve na bancada, não no loop** (`validar-fila.py:119-160`, `94d5456`). Esse gate não tem teste versionado: `grep -rln topologia test/ scripts/` só acha o próprio script.
- **No loop, o Comarka faz:** fast-forward do alvo (`lib.sh:210-236`) e abort em divergência (`local-loop.sh:349-355`).
- **Um risco que o item 4 deve pegar:** o `local-loop.sh` do Comarka fixa `BRANCH_ALVO="staging-auto"` e `REPO=$HOME/...` (`:41-42`) sem ler o config. É exatamente a divergência "config x raiz".
- **Contra-teste vermelho:** fixture com a branch alvo atrás de `origin/main` e um arquivo da allowlist ausente em `origin/<alvo>`. O pré-voo do kit hoje dá GO.

**5 · Done sem trailer Orq-Ticket**
- **O Comarka não tem trailer:** `git log origin/staging-auto --grep='Orq-Ticket:' --oneline | wc -l` dá 0.
- **14 tickets `done` sem a marca `(ticket <id>)`** em `origin/staging-auto`: 025 103a 111 152 207 208 209 210 211 213 218 219 259 368.
- **Contra-teste vermelho:** esses 14 ids viram a fixture de "done sem prova no git".

**6 · Validador de critério**
- **O Comarka resolve parte:** `lint_forma` (`validar-fila.py:71-106`) pega `grep -P`, saída prefixada, `rc > 1` e falta de `2>&1`.
- **Não pega:**
  - `grep -c … || echo X`, consertado à mão em `0ece764`, com 6 critérios pendentes ainda assim (`407b:89,94`);
  - espera não numérica que casa `passed` num cmd que também imprime `failed` (184 done no Comarka, 7 done + 6 pendentes no Actus);
  - `>/dev/null 2>&1 && echo ok` (Actus 481);
  - `| tail -N` com espera de texto (Actus 461);
  - contagem exata de literal em src (Comarka 80, CI 64).
- **Defeito que o kit NÃO pode copiar:** `compara()` usa substring (`validar-fila.py:36-40`), enquanto o motor usa regex ERE (`lib.sh:619-629`). O próprio arquivo avisa que divergir disso é falso verde (`:31-34`).
- **Contra-teste vermelho:**
  - o critério 3 do 407a0 antes de `0ece764` (`git show 0ece764^:docs/fila/407a0-churn-log-cliente-receita-id.md`);
  - `002-t-a-registro-whatsapp.md:51`;
  - o critério do 481 em `runs/481/attempt-16/criterios.txt`.

**7 · Status precisa_quebrar para diff acima do teto**
- **O Comarka não resolve:** reprova e gasta retry (`executor.sh:597-605`), 33 vezes em 24 tickets.
- **O kit já tem `refatiar`** (`decisao.ts:210-217`).
- O item 7 só acrescenta algo se `precisa_quebrar` for distinto de `refatiar` (pergunta 9). Não há contra-teste no Comarka para aproveitar.

**8 · Commit automático do writeback sem push**
- **O Comarka não resolve:** nem commita (`lib.sh:91-107`) e ainda pusha por ticket (`local-loop.sh:200-215`).
- **O kit já commita** a cada transição (`lib.sh:191-196`) e nunca pusha.
- **Evidência de que falta no Comarka:**
  - 19 commits manuais de status na janela (`git log --since=2026-08-22 -- docs/fila | grep -ciE 'status|devolvid|reconcil'`);
  - o incidente 346a.
- O Comarka não tem contra-teste para oferecer.

**9 · Faxineiro de worktrees**
- **O Comarka resolve parte:**
  - `lib.sh:273-302` + `test-cleanup-worktree.sh`, cobrindo done/obsoleto e os nomes intocáveis;
  - `limpar-worktrees.sh`, que remove órfã sem registro em nenhum repo e com árvore limpa.
- **Nenhum dos dois detecta um worktree VIVO de outro repo com o mesmo nome.** Foi o caso do 440.
- **Contra-testes vermelhos:**
  - `test-cleanup-worktree.sh` casos A a D, que servem como estão;
  - caso novo: `_worktrees/<prefixo><id>` pertence a outro repo. O `setup_worktree` precisa recusar com `ambiente`, sem consumir tentativa. Hoje o kit morre no `worktree add` (`set -e`) e cai no G1.

---

## 4. Onde o Comarka é pior que o kit

1. **Trilha.**
   - Não há events.log, e o motivo só existe em texto livre.
   - Há dois relógios no mesmo log: 27.519 linhas em UTC sem data.
   - `attempt` reinicia por execução, e aborto não deixa registro (L1).
   - Não há ledger de custo nem registro de negação de permissão (`--output-format text`, `executor.sh:519`, `avaliador.sh:124`).
2. **Push por ticket** (`local-loop.sh:200-215`), contra a regra do próprio CLAUDE.md.
3. **Writeback sem commit** (`lib.sh:91-107`). São 19 commits manuais na janela e houve a sobrescrita do 346a.
4. **Diff cap gasta retry** e mede linhas de patch, não linhas mudadas (`executor.sh:563`, `:597-605`).
5. **Enforcement bloqueia direto** (`executor.sh:584-594`), em vez de devolver para refatiar com a lista de arquivos. Foram 41 bloqueios em 37 tickets.
6. **Parser do avaliador aprova veredito ilegível** quando acha `"aprovado": true` no texto cru (`avaliador.sh:165-172`).
7. **Gate tsc por regex de escopo** passa quando o tsc quebra sem imprimir `error TS` (`executor.sh:123`). Risco ainda não observado: 0 de 933.
8. **Código morto que parece vivo.**
   - `perfis_tools` no config.
   - `telemetria.ts` ("0 de 313").
   - `lock.ts`, testado mas não chamado: o loop usa `mkdir` (`local-loop.sh:290`).
9. **Caminhos e branch fixos no loop** (`local-loop.sh:39-45`), e prefixo `orq-` fixo no nome da worktree (`executor.sh:452`). Isso produziu a colisão do 440.
10. **O validador de bancada compara diferente do motor** (substring x regex, `validar-fila.py:36-40`).
11. **Recon divergente vira `obsoleto` em silêncio** (`executor.sh:477-485`). Matou 486, 489 e 495 com spec boa.

---

## 5. Top 5 peças, ranqueadas por reprova evitada sobre esforço

**1. Validador de critério com os anti-padrões medidos (item 6).** Esforço baixo: é lint, sem motor.
- **Reprova evitada:**
  - Comarka: as mecânicas cuja saída foi `'FAIL'` 17, `''` 13 e `grep: invalid option -- P` 7;
  - as falsas aprovações de `passed|failed` (184 critérios done);
  - Actus 461 (6 tentativas) e 481 (18 diretórios).
- **Pronto quando:** `orq validar` rejeita, com rc 1 e nomeando o padrão:
  - `grep -c … || echo`;
  - espera não numérica sobre cmd que pode imprimir `failed`;
  - `>/dev/null 2>&1 && echo`;
  - `| tail -N` com espera de texto;
  - e a comparação do validador É a `criterio_match` do motor (importada, não reescrita).
- **Contra-teste vermelho:** o critério 3 do 407a0 de `0ece764^`, `002:51` e o critério do 481. Hoje os três passam no gate de ticket do kit.

**2. Sem-progresso persistente e drenagem que pula (item 2).** Esforço médio.
- **Reprova evitada:** não é reprova, é fila parada. No kit, um único ticket que aborta antes do agente para a drenagem a cada tick. No Comarka, o 440 fez 19 execuções e o 315a deixou 32 pendentes parados.
- **Pronto quando:**
  - a drenagem segue para o próximo ticket não tentado;
  - `runs/<id>/.sem-progresso` persiste entre disparos;
  - no limite, o ticket vira `bloqueado`, COMMITADO, com evento `BLOQUEADO motivo=sem_progresso`;
  - adiamento não conta.
- **Contra-teste vermelho:** `test-drenagem-sem-progresso.sh` e `test-disjuntor.sh` adaptados ao `drenar()` do kit. Hoje, 1 chamada em vez de 2 e nenhum bloqueio.

**3. Ambiental x mérito com a tabela de causas do Comarka (item 3).** Esforço médio.
- **Reprova evitada:** retries e escaladas por crash de gate e por permissão; cooldown de 60 min por timeout local ou por 5xx.
- **Pronto quando:**
  - `decisao.ts` devolve `adiado` sem cooldown para `timeout`, `5xx` e `gate_crash` (gate rc ≠ 0 sem placar de testes);
  - cooldown só para `rate_limit` e `quota`;
  - nenhum desses consome tentativa nem escala;
  - permissão negada com critério vermelho segue como mérito, sem escalar.
- **Contra-teste vermelho:** `test-cooldown-causa.sh` (timeout não arma cooldown; hoje arma, `lib.sh:801`) e um caso de `gates_rc=1` com `gates.txt` sem placar (hoje `escalou=true`).

**4. Sub-motivo na trilha e breaker por repetição (L1 + B2 + B3).** Esforço baixo a médio.
- **Reprova evitada:**
  - retry idêntico: Actus 461 com 717×3 e 684×3, 491a com 453×3;
  - escalada indevida: 82 de 82 retries em opus;
  - US$ 92,77 do Actus em tickets nunca aprovados.
- **Pronto quando:**
  - `REPROVADO` traz `sub=juiz|criterio|gate_<papel>|exit`;
  - `decidirRetry` escala só com `sub=juiz` ou na última tentativa;
  - o 2º REPROVADO com o mesmo `sub` normalizado e o mesmo `diff=` bloqueia sem 3ª volta.
- **Contra-teste vermelho:** trilha fixture com `461 REPROVADO … diff=717` duas vezes. Hoje sai um RETRY com `model=opus`.

**5. Dono da worktree de ticket e faxineiro (item 9 + item 4).** Esforço baixo.
- **Reprova evitada:** 35 execuções vazias (440, 441, 442).
- **Pronto quando:**
  - `setup_worktree` confere `git_common_abs` do caminho antes de `remove`/`add` e recusa com `adiado motivo=ambiente`, citando o dono;
  - o pré-voo recusa dois repos com o mesmo `worktrees_prefixo` no mesmo `worktrees_dir`;
  - o faxineiro só remove o que é do próprio repo, ou órfã sem registro.
- **Contra-teste vermelho:** fixture com `_worktrees/fx-900` pertencendo a outro repo git. Hoje `executor.sh` morre no `worktree add` e o ticket segue pendente. Mais `test-cleanup-worktree.sh` A a D.

**Logo abaixo do corte:**
- gate streak por `sub=gate_<papel>` (E2);
- prioridade na seleção (G2);
- `obtido` honesto no diagnóstico (A2);
- juiz com o conteúdo dos arquivos novos (C1).

---

## 6. O que NÃO portar, e por quê

- **`perfis_tools`.** Está morto no próprio Comarka: o executor usa `ALLOWED_TOOLS` fixo (`executor.sh:46`). No kit, a allowlist derivada mais o piso já cobre a função.
- **`orq-granularidade.py`.** Sinais literais dão pontuação alta em todo ticket, e uma `{` na prosa faz o parser ler o trecho errado e sair 0 (PLAYBOOK do Comarka, "Chave na prosa quebra"). O kit tem `refatiar` como gate de saída; o de entrada é o validador (item 6).
- **`telemetria.ts`.** Formato que nunca existiu. Dos Python, só a taxonomia de `orq-telemetria.py`, que já está em `schemas/motivo_categoria.json`.
- **Lock por `mkdir`, e `lock.ts` do Comarka.** O kit já usa `lock.ts` com pid e idade.
- **Push por ticket** (`local-loop.sh:200-215`). Publicar é humano.
- **Parser do avaliador que recupera o booleano do texto cru** (`avaliador.sh:165-172`). Ilegível tem de adiar.
- **Juiz com a tool `Read`** (`avaliador.sh:122`). Quebra a independência. A peça C1 dá o material sem dar ferramenta.
- **`gate_tsc` por regex de escopo.** O `tipo: baseline` do kit já conta e tem a guarda de gate mudo.
- **Dev server na porta 3004 e critérios HTTP.** É spec de repo.
- **`writeback-notion.ts` e `relatorio-email.ts`.** Canais locais.
- **`recon_esperado` → `obsoleto`.** Portar a execução (peça 1b), nunca esse desfecho.
- **Caminhos fixos do `local-loop.sh`** (`REPO`, `PATH` com versão de node, `BRANCH_ALVO`).
- **Evidência `attempt-N.prevK`.** O slot monotônico do kit é melhor.

---

## 7. Perguntas que só o Lucas decide

1. **Disjuntor.** Falha de ambiente repetida (o 440) deve BLOQUEAR o ticket, como faz o Comarka, ou pausar a fila / adiar com alarme? Bloquear por ambiente contradiz o item 3.
2. **Escalada de modelo.** Na primeira reprova (kit, 82 de 82 retries em opus) ou só na última (Comarka, 7% opus)? Ou só quando quem reprovou foi o juiz?
3. **Patch `ambiente` do Actus.** Permissão negada junto com critério vermelho: fica `adiado` (hoje, com o 481 em 18 tentativas) ou reprova como mérito sem escalar?
4. **Juiz.** Recebe o conteúdo dos arquivos novos do diff (Actus 501) ou continua só com o diff? E o Actus mantém `juiz_baixo = opus` (45% de reprovação)?
5. **Colisão de prefixo.** Quem troca de prefixo em `../_worktrees`, Actus (`orq-`) ou Comarka (`orq-` fixo)? Ou cada repo passa a ter seu próprio `worktrees_dir`?
6. **Adoção pelo Comarka.** O Comarka adota o motor do kit, perdendo push por ticket e writeback Notion no loop, ou o kit só recebe peças e o Comarka segue com motor próprio?
7. **Recon divergente.** Vira `obsoleto` (Comarka) ou `bloqueado` com nota (proposta da 1b)?
8. **C0.** `c0_intocavel` → `zona_proibida`: renomear na migração ou manter à mão (K11b)?
9. **Item 7.** `precisa_quebrar` é um status novo ou um novo nome para `refatiar`, que o kit já tem?
