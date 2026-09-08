# Setup do orquestrador num repo novo

Ordem de bootstrap. Cada passo tem um "pronto quando" — não avance sem ele.

> **O que mudou na v2, e é o passo 1 inteiro:** instalar deixou de ser "gerar a
> implementação lendo a skill como spec" e passou a ser `bash instalar.sh --novo <repo>`.
> Existe UM motor, versionado no `orquestrador-kit`, sem premissa de repo. O que varia vive
> em `docs/fila/000-config.json`. Ver SKILL.md, "Motor único versionado" — e o corolário:
> editar o motor vendorizado dentro do repo é NO-GO no pré-voo.

## 0. Pré-requisitos
- Repo git com remote; branch principal protegida de push do loop.
- Claude Code instalado com assinatura local (`claude -p` funciona sem API key) **ou** `ANTHROPIC_API_KEY` para CI.
- `jq`, `python3`, `node`, e os comandos reais de typecheck/teste/build do projeto rodando verdes localmente.
- O `orquestrador-kit` no disco.

## 1. Instalar o motor (2 min, um comando)

```bash
bash instalar.sh --novo <caminho-do-repo>
```

Ele cria, de uma vez: o motor vendorizado (`scripts/orquestrador/`, `scripts/orq`,
`scripts/roadmap/`, a skill em `docs/orquestrador/skill/` e o carimbo `VERSAO`), a fila
(`000-config.json` a partir do template, `_TEMPLATE.md`, `liberacoes.json` v2 vazio,
`decisoes-pendentes.md`, `rascunhos/`, `runs/`), o roadmap (`mapa.json`, `MAPA.md`), a
memória (`PLAYBOOK.md`, `PECAS.md`) e as linhas de `.gitignore` que faltarem. Ele RECUSA se
`docs/fila` já existir — aí o verbo é `--atualizar`.

**Não escreva script de orquestrador neste repo.** A skill continua vendorizada porque o
loop roda headless e precisa da spec no disco, mas ela é agora a spec de LEITURA (executor,
juiz, sessão de manutenção), não a spec de implementação: quem implementa é o kit, uma vez,
com os testes dele.

**Pronto quando:** `bash instalar.sh --verificar <repo>` diz `idêntico ao kit <VERSAO>` e sai 0.

## 2. Preencher o config (30 min, humano)
O `000-config.json` que o `--novo` criou é um **formulário**: todo `<...>` é uma decisão
local que ninguém pode tomar por você. `bash scripts/orq config` lista cada uma, com a linha
do motor que a lê, e sai != 0 até a última ser preenchida.
1. **Fronteira intocável** (`zona_proibida`): tabelas/paths que o loop NUNCA escreve. Se o banco é compartilhado com outro sistema, liste tudo dele aqui. Na dúvida, proíba — liberar depois é barato, vazar não.
2. **Baseline de typecheck**: rode o typecheck hoje, conte os erros herdados, registre número + escopo (regex de arquivos). O gate compara contra o baseline, nunca contra zero.
3. **Gates**: os 3 comandos reais (typecheck, testes, build) com tipo de veredicto (exit code ou baseline).
4. **Identidade**: string que o `origin` deve conter + identificador do banco/ambiente extraível do `.env`. Divergência = abortar sem gastar.
5. **Política**: branch de staging (ex. `staging-auto`), `max_retries` (2), `cooldown_minutes` (60), `diff_cap_linhas` (2500), `claude_timeout_secs` (1800), modelos por papel (executor barato, juiz forte, retry final forte).

**Pronto quando:** `bash scripts/orq config` sai **0 violações**, e um humano releu o arquivo.
`jq .` só prova que o JSON parseia; `orq config` prova que o motor consegue rodar com ele.

## 3. Estrutura de arquivos (criada pelo passo 1; aqui só para conferência)
```
docs/fila/
├── _TEMPLATE.md        # de templates/TICKET.md
├── 000-config.json
├── liberacoes.json     # v2: {"$schema_versao": 2, "tokens": []} — `orq liberar` escreve aqui
├── rascunhos/          # tickets não promovidos; o leitor da fila NÃO desce aqui
└── runs/               # evidência por ticket/tentativa + log do loop
docs/orquestrador/
├── skill/              # cópia vendorizada desta skill (passo 1) — a spec local
└── PLAYBOOK.md         # de templates/PLAYBOOK-seed.md
docs/roadmap/MAPA.md    # fonte única do roadmap: blocos → frentes → tickets (ID sequencial global)
scripts/orquestrador/   # o motor VENDORIZADO pelo instalar.sh — não se edita aqui
scripts/orq             # o comando de consulta
scripts/roadmap/        # o lint do mapa (motor também: `orq mapa lint` o chama)
```

## 3.4 Observabilidade (junto com os scripts, não depois)
Implemente o contrato de `references/observabilidade.md` — `runs/STATUS.md`, `runs/events.log`, comando de consulta e notificação de fim — **na mesma passada** em que os scripts nascem. Deixar para depois significa operar às cegas justamente na fase em que mais se erra. **Pronto quando:** alguém que não montou o sistema responde, olhando só o comando de consulta, em que ticket está, se o anterior passou e por que a fila parou.

## 3.5 Pré-voo (gate obrigatório)
Rode `references/pre-voo.md` categorias 0–6, mais estes dois, que a v2 acrescenta e que são
um comando cada:

- `bash instalar.sh --verificar <repo>` sai **0** — o motor deste repo é byte a byte o do
  kit. Divergência é NO-GO: motor editado no lugar é motor sem teste e sem caminho de volta.
- `bash scripts/orq config` sai **0** — nenhum placeholder, nenhuma chave obrigatória
  ausente.

**Pronto quando:** tabela GO/NO-GO registrada em `docs/fila/runs/pre-voo-<data>.md` com GO em 0–6 e nos dois acima.

## 4. O motor que o passo 1 instalou (o que existe, para você saber o que ler)
Nada a gerar. Os scripts abaixo já estão no repo desde o `--novo`, com os testes deles, e
mudança em qualquer um é sessão **no kit** — nunca edição no lugar (SKILL.md, "Quem escreve
o harness"):

| No repo | O que faz |
|---|---|
| `scripts/orquestrador/fila-read.ts` | lê a fila, resolve `dependencias` por `id` e `humano:<token>`, ignora `rascunhos/` |
| `scripts/orquestrador/enforcement.sh` + `enforcement-core.ts` | recebe o diff e FALHA o processo fora da allowlist ou na zona proibida |
| `scripts/orquestrador/executor.sh` | worktree → preflight de identidade → `claude -p` → evidência em `runs/<id>/attempt-N/` → pipeline fail-fast |
| `scripts/orquestrador/juiz.ts` + `decisao.ts` | juiz por classe de risco; aprovado/reprovado/**adiado**/refatiar |
| `scripts/orquestrador/local-loop.sh` | lock (pid + idade + cleanup em todo exit), drenagem inteira, cooldown, orçamento |
| `scripts/orquestrador/gate-ticket.ts` | o gate de ticket; `orq validar` é a porta dele |
| `scripts/orq` | o comando de consulta, read-only exceto `pausar`/`retomar`/`liberar` |

Se algum comportamento acima não bate com o que este repo precisa, a saída é **config** ou
uma peça no kit — não um script local. Script local é a premissa de repo voltando pela
janela, e ela volta sem teste.

**Pronto quando:** um ticket-fixture trivial (ex.: criar um arquivo + teste) atravessa o loop ponta a ponta e o merge aparece na staging.

## 5. Agendamento
Pré-requisito: categoria 7 do pré-voo (fixture aprovado + teste de lock). launchd/cron/Actions chamando o local-loop no intervalo desejado. O lock torna o intervalo seguro (disparos sobrepostos morrem no lock). `RunAtLoad` desligado; se a máquina dormir, dispara ao acordar. **Nunca reinicie o serviço à força com run vivo** — cheque o lock antes.

## 6. Primeiros tickets reais
Comece com 2–3 tickets pequenos e de leitura pura (uma rota GET + teste). Só depois de um ciclo 100% autônomo aprovado de primeira, aumente o lote. Revise os `runs/` dos primeiros — é onde os defeitos de spec aparecem.

## 7. Ritual humano (o único combustível)
20 min, 2–3×/semana: revisar preview da staging → merge para a principal (humano, sempre) → aplicar `.sql` acumuladas → responder tokens com `bash scripts/orq liberar humano:<tipo>-<id> "o que eu conferi"` (o verbo recusa token duplicado e token fora do padrão; editar o `liberacoes.json` à mão é como um repo real acabou com o mesmo token duas vezes) → ler telemetria e o PLAYBOOK.

---

## Complemento v2 (por passo; os passos acima continuam valendo)

**Passo 0 (antes de tudo):** Fase 0 concluída com `orq dor` verde (`fase-0-arquitetar.md`) e Fase 1 com pré-voo GO em 0 a 8 (`fundacao.md`). Em brownfield com loop v1 já rodando, pule a Fase 0 completa e rode só `/arquitetar` para gerar MAPA.md + mapa.json a partir do roadmap existente.

**Passo 1, vendoring:** o `instalar.sh --novo` já traz a skill inteira, `EXECUTOR.md`
incluído. O que sobra para a mão: vendorizar em `docs/orquestrador/bmad/` só Analyst, PM e
Architect; `templates/arquitetar.md` vai para `.claude/commands/arquitetar.md`; Superpowers
instalado como plugin do Claude Code (sessão interativa, não headless).

**Passo 2, decisões locais v2:** preencher também `modelos`, `juiz.paths_alto_risco`, `gate_ticket.cmd_prefixos_permitidos`, `paths_harness`, `sentinela.smoke_cmd`, `orcamento` (alto nas 2 primeiras semanas), `relatorio.canal`. Deixar `loops.sentinela.ativo:false` e `loops.planejador.ativo:false`.

**Passo 3, estrutura:** acrescentar
```
docs/fila/decisoes-pendentes.md   # de templates/decisoes-pendentes.md
docs/fila/runs/custo.json         # {"dias":{}} inicial
docs/fila/runs/gate/              # evidência do gate de ticket por candidato
docs/fila/runs/sentinela/         # sinais.json, baseline.json
docs/roadmap/mapa.json            # de templates/mapa.json (MAPA.md já existia)
docs/orquestrador/REPO-MAP.md     # gerado por orq mapa-repo
docs/adr/                         # ADRs da Fase 0
```
`docs/fila/PAUSAR` **não** existe por padrão; sua presença é o kill switch global.

**Passo 4, o que AINDA não está no motor.** Os itens abaixo são peças do kit, não scripts a
escrever neste repo. Onde uma delas ainda não existe, o comportamento correspondente não
existe — e a saída é abrir peça no kit, com teste, nunca improvisar um script local:
7. `context-pack` — monta o contexto do executor a partir do ticket (§2 de `custo-e-contexto.md`), com cap e ordem de truncamento. Teste: ticket com allowlist grande é truncado na ordem certa e nunca passa do cap.
8. `mapa-repo` — gera `REPO-MAP.md` com cap. Teste: tamanho ≤ cap; símbolo exportado aparece com quem o importa.
9. `custo` — grava usage por chamada em `custo.json`; `orq custo` agrega; gate de orçamento consultado pelo executor, planejador e sentinela. Teste: chamada simulada acima do teto vira `adiado` e evento `ORCAMENTO`.
10. `gate-ticket` — os 7 passos (§2 de `autoalimentacao.md`). Testes: fixture com path inexistente (descarta `recon`), critério já verde (descarta `vermelho`), cmd com prefixo proibido (`invalido`), allowlist sobreposta sem dep (`sobreposicao`), juiz com JSON sujo (candidato adiado, não descartado).
11. `sentinela` — coleta, normaliza, aplica as 6 regras, gera candidato com reprodução. Testes: sinal em arquivo mergeado há 2h vira `QUARENTENA`; sinal em `paths_harness` vira `DECISAO_PENDENTE`; sinal repetido não duplica.
12. `planejador` — seleção de frente, context pack da frente, lote, atribuição de IDs por script, pós-gate. Testes: fila acima do limiar não dispara; dois lotes 100% descartados bloqueiam a frente; frente sem deps satisfeitas é ignorada.
13. `mapa` — `lint` (MAPA.md × mapa.json), `status`, writeback de status de frente, `importar` (task-master → frentes, opcional).
14. `relatorio` — `relatorio-promocao.md` preenchido por upsert.
15. Extensão do `local-loop` — passos 4 a 8 da drenagem (§0 de `autoalimentacao.md`), leitura de `PAUSAR` e `loops.*` entre tickets, modo `continuo`.
16. Extensão do `executor` — estado `refatiar`, diagnóstico estruturado no retry, auto-verificação com teto, `--max-turns`, `--allowedTools` derivados da allowlist, wrapper de saída compactada, juiz por classe de risco.

**Pronto quando:** um candidato-fixture do planejador (frente fixture com 1 arquivo) atravessa gate → executor → merge sem intervenção, e um sinal-fixture da sentinela (teste que falha de propósito na staging) vira ticket com reprodução vermelha e é resolvido na drenagem seguinte.

**Passo 6, primeiros tickets:** continuam humanos. O gate de ticket roda neles (pré-voo cat. 8) e a taxa de descarte é o termômetro do gate.

**Passo 7, ritual humano:** vira a Fase 3 (§6 de `autoalimentacao.md`): ler `orq relatorio` → DoD → `.sql` → `/arquitetar --decisoes` → tokens → merge para a principal → promover baseline da sentinela.

**Passo 8, ativação por camada:** §8 de `autoalimentacao.md`. Sentinela (suite + smoke) → gate com tickets humanos → planejador dry-run → planejador auto → modo contínuo. Cada camada com a maturidade da tabela da SKILL.
