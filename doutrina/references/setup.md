# Setup do orquestrador num repo novo

Ordem de bootstrap. Cada passo tem um "pronto quando" — não avance sem ele.

## 0. Pré-requisitos
- Repo git com remote; branch principal protegida de push do loop.
- Claude Code instalado com assinatura local (`claude -p` funciona sem API key) **ou** `ANTHROPIC_API_KEY` para CI.
- `jq`, e os comandos reais de typecheck/teste/build do projeto rodando verdes localmente.

## 1. Vendorizar a skill no repo (5 min, primeiro commit)
Copie esta skill inteira (SKILL.md, references/, templates/) para `docs/orquestrador/skill/` e commite. Motivo: o loop roda headless — `claude -p` via launchd/cron/CI não enxerga skills de chat nem uploads. A cópia local é a spec que o executor, o juiz e toda sessão de manutenção leem. Sem ela, o sistema opera de memória — que é exatamente o que esta doutrina proíbe.

**Pronto quando:** `git log` mostra a skill commitada e `docs/orquestrador/skill/SKILL.md` abre no checkout.

## 2. Decisões locais (30 min, humano)
Preencha `docs/fila/000-config.json` a partir de `templates/config.json`:
1. **Fronteira intocável** (`zona_proibida`): tabelas/paths que o loop NUNCA escreve. Se o banco é compartilhado com outro sistema, liste tudo dele aqui. Na dúvida, proíba — liberar depois é barato, vazar não.
2. **Baseline de typecheck**: rode o typecheck hoje, conte os erros herdados, registre número + escopo (regex de arquivos). O gate compara contra o baseline, nunca contra zero.
3. **Gates**: os 3 comandos reais (typecheck, testes, build) com tipo de veredicto (exit code ou baseline).
4. **Identidade**: string que o `origin` deve conter + identificador do banco/ambiente extraível do `.env`. Divergência = abortar sem gastar.
5. **Política**: branch de staging (ex. `staging-auto`), `max_retries` (2), `cooldown_minutes` (60), `diff_cap_linhas` (2500), `claude_timeout_secs` (1800), modelos por papel (executor barato, juiz forte, retry final forte).

**Pronto quando:** config validada por `jq .` e revisada por humano.

## 3. Estrutura de arquivos
```
docs/fila/
├── _TEMPLATE.md        # de templates/TICKET.md
├── 000-config.json
├── liberacoes.json     # {"tokens": []} — deps humano:<token> resolvem aqui
├── rascunhos/          # tickets não promovidos; o leitor da fila NÃO desce aqui
└── runs/               # evidência por ticket/tentativa + log do loop
docs/orquestrador/
├── skill/              # cópia vendorizada desta skill (passo 1) — a spec local
└── PLAYBOOK.md         # de templates/PLAYBOOK-seed.md
docs/roadmap/MAPA.md    # fonte única do roadmap: blocos → frentes → tickets + faixas de ID
scripts/orquestrador/           # os scripts que o passo 3 vai gerar
```

## 3.4 Observabilidade (junto com os scripts, não depois)
Implemente o contrato de `references/observabilidade.md` — `runs/STATUS.md`, `runs/events.log`, comando de consulta e notificação de fim — **na mesma passada** em que os scripts nascem. Deixar para depois significa operar às cegas justamente na fase em que mais se erra. **Pronto quando:** alguém que não montou o sistema responde, olhando só o comando de consulta, em que ticket está, se o anterior passou e por que a fila parou.

## 3.5 Pré-voo (gate obrigatório)
Rode `references/pre-voo.md` categorias 0–6. Qualquer NO-GO → remediação primeiro. **Pronto quando:** tabela GO/NO-GO registrada em `docs/fila/runs/pre-voo-<data>.md` com GO em 0–6.

## 4. Gerar os scripts (com Claude Code, no próprio repo)
Peça ao Claude Code para implementar, **lendo a cópia local `docs/orquestrador/skill/` (SKILL.md + templates) + config como spec**, nesta ordem — cada um com teste próprio antes do seguinte:
1. `fila-read` — lê a fila, valida schema, resolve `dependencias` por `id` e `humano:<token>`, ignora `rascunhos/`. Teste: fixture com dep não resolvida, token liberado, rascunho invisível.
2. `enforcement` — recebe um diff, falha se tocar arquivo fora da allowlist do ticket ou qualquer item da zona proibida (inclui SQL cru e chamadas `.rpc()` no diff). Teste com diffs bons e maus.
3. `executor` — worktree nova a partir da staging na 1ª tentativa (o **retry reaproveita a worktree e o commit** quando o enforcement da tentativa anterior passou; worktree nova de novo quando ele reprovou) → preflight de identidade (fatal) → `claude -p` com prompt montado do ticket (objetivo + allowlist + critérios + proibições + `--allowedTools` restritos) → salva prompt/`diff.patch`/outputs em `runs/<id>/attempt-N/` (o patch é gravado antes de qualquer descarte) → roda pipeline fail-fast → estados aprovado/reprovado/adiado. **Parser do veredicto: extrai JSON do output cru com tolerância a lixo; falha de parse = adiado.** Branch de ticket bloqueado não é deletada.
4. `avaliador` — prompt do juiz = diff cru + outputs dos gates + critérios; resposta JSON `{aprovado, motivo}`; aprovado → merge `--no-ff` na staging.
5. `local-loop` — lock (pid + idade máxima + cleanup em TODO exit), drenagem da fila inteira, respeita `runs/.cooldown-until`, push da staging por aprovação, writeback/relatório com fallback em arquivo.
6. Testes de sistema: simular adiado (rate limit não consome retry) e drenagem.

**Pronto quando:** um ticket-fixture trivial (ex.: criar um arquivo + teste) atravessa o loop ponta a ponta e o merge aparece na staging.

## 5. Agendamento
Pré-requisito: categoria 7 do pré-voo (fixture aprovado + teste de lock). launchd/cron/Actions chamando o local-loop no intervalo desejado. O lock torna o intervalo seguro (disparos sobrepostos morrem no lock). `RunAtLoad` desligado; se a máquina dormir, dispara ao acordar. **Nunca reinicie o serviço à força com run vivo** — cheque o lock antes.

## 6. Primeiros tickets reais
Comece com 2–3 tickets pequenos e de leitura pura (uma rota GET + teste). Só depois de um ciclo 100% autônomo aprovado de primeira, aumente o lote. Revise os `runs/` dos primeiros — é onde os defeitos de spec aparecem.

## 7. Ritual humano (o único combustível)
20 min, 2–3×/semana: revisar preview da staging → merge para a principal (humano, sempre) → aplicar `.sql` acumuladas → responder tokens de `liberacoes.json` → ler telemetria e o PLAYBOOK.

---

## Complemento v2 (por passo; os passos acima continuam valendo)

**Passo 0 (antes de tudo):** Fase 0 concluída com `orq dor` verde (`fase-0-arquitetar.md`) e Fase 1 com pré-voo GO em 0 a 8 (`fundacao.md`). Em brownfield com loop v1 já rodando, pule a Fase 0 completa e rode só `/arquitetar` para gerar MAPA.md + mapa.json a partir do roadmap existente.

**Passo 1, vendoring:** além da skill, copiar `templates/EXECUTOR.md` para `docs/orquestrador/skill/EXECUTOR.md` (prefixo do prompt do executor; o pré-voo checa `test -s`); vendorizar em `docs/orquestrador/bmad/` só Analyst, PM e Architect; `templates/arquitetar.md` vai para `.claude/commands/arquitetar.md`; Superpowers instalado como plugin do Claude Code (sessão interativa, não headless).

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

**Passo 4, scripts adicionais (mesma regra: cada um com teste próprio antes do seguinte, lendo a skill vendorizada como spec):**
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
