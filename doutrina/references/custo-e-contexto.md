# Custo e contexto: errar o mínimo gastando o mínimo

Os dois objetivos puxam para o mesmo lado: o que mais gasta é retry, e o que mais gera retry é ticket ruim e contexto grande. Toda alavanca aqui reduz erro do modelo médio; nenhuma chama o modelo forte mais vezes.

## 1. Escada de decisão (quem decide o quê)

| Degrau | Custo | Decide | Exemplos |
|---|---|---|---|
| Script | 0 | tudo que é determinístico | recon, dedupe, diff cap, lint de ticket, staleness, hash de sinal, sobreposição de allowlist, risco por path |
| Modelo barato | ¢ | classificação com JSON curto | risco quando o script não decide, extração do motivo de reprovação, triagem de sinal ambíguo |
| Modelo médio | $ | produção | executor, planejador, redação de candidato de bug, juiz de ticket baixo risco |
| Modelo forte | $$$ | julgamento e último recurso | juiz de diff alto risco, juiz de ticket (candidato de máquina), retry final |

Config: `modelos.{classificador, executor, planejador, juiz_baixo, juiz_alto, juiz_ticket, retry_final}`. Modelo forte em qualquer outro papel é bug de config; o pré-voo cat. 8 checa.

## 2. Context pack (regra 18)

Montado por script antes de cada `claude -p`. Ordem = prioridade de truncamento (o último a entrar é o primeiro a sair):

1. Ticket (objetivo, allowlist, critérios, proibições)
2. Conteúdo integral dos arquivos da allowlist que **já existem** (com cap por arquivo `contexto.cap_linhas_arquivo`; acima disso só o trecho ao redor de símbolos citados no objetivo)
3. Assinaturas (não corpo) de tudo que os arquivos da allowlist importam, via repo map
4. ADR(s) da frente
5. Trecho do PLAYBOOK marcado como `#executor` (lições que o executor precisa, ≤ 30 linhas)

Cap total `contexto.cap_tokens_executor` (15k default). O executor **não** recebe: bloco, frente, PRD, brief, histórico de outros tickets, o repo inteiro, nem a SKILL.md completa: recebe `docs/orquestrador/skill/EXECUTOR.md`, extrato de ≤ 60 linhas com só o que ele precisa (`templates/EXECUTOR.md`). Ferramentas permitidas (`--allowedTools` e regras de permissão do Claude Code na worktree) restritas a leitura da allowlist + repo map, escrita só na allowlist, e os comandos dos gates. Onde a versão instalada não suportar padrão por path, a permissão é conveniência e o enforcement por diff continua sendo a lei (regra 2).

Por que funciona: modelo médio com 15k de contexto relevante erra menos que modelo forte com 150k de contexto misto, porque não tem onde se perder. E cada ciclo de exploração livre (`ls`, `cat`, `grep` em sessão headless) custa 30 a 40% dos tokens de uma execução típica.

## 3. Repo map (`orq mapa-repo`)

`docs/orquestrador/REPO-MAP.md`: uma linha por símbolo exportado (arquivo, nome, assinatura, quem importa), ranqueada por relevância, com cap `contexto.cap_tokens_repo_map` (4k). Regenerado no passo 7 de toda drenagem com merge e commitado na staging.

Implementação: extrair só o módulo de repo map do Aider (tree-sitter + ranking por grafo de referências) ou equivalente da stack; Graphify é alternativa. **Um dos dois entra, decidido por medição**: tokens por ticket aprovado com cada um, 10 tickets, mesmo lote. Nunca os dois.

## 4. Prompt estável para cache

Claude Code faz cache de prefixo automaticamente; o que decide o hit é a ordem. Sempre:

```
[system/append-system-prompt]  EXECUTOR.md (extrato da doutrina) + proibições do config                 ← estável
[CLAUDE.md da worktree]         gates, comandos, convenções do repo                                     ← estável
[prompt]                        repo map (muda só a cada merge) → PLAYBOOK #executor → context pack → ticket ← variável por último
```

Qualquer string com timestamp, id de tentativa ou pid vai para o **fim** do prompt. Um número no início invalida o cache inteiro. Medir: `tokens_cache / tokens_in` por ticket no `custo.json`; abaixo de 50% em drenagem com ≥3 tickets, a ordem está errada.

## 5. Auto-verificação com teto

O prompt do executor manda: implementar → rodar os `cmd` dos critérios `alvo` e os gates de typecheck/testes na allowlist → corrigir → repetir **no máximo 2 vezes** → commitar. Depois do teto, commita o que tem e o harness julga. Motivo: a falha corrigida dentro da sessão custa uma fração de um ciclo completo (worktree nova, gates, juiz, retry). Teto para não virar loop interno de queima. `--max-turns` no `claude -p` como cinto de segurança.

## 6. Retry com diagnóstico estruturado

O motivo do retry é um JSON de até 500 tokens, extraído por script (ou modelo barato quando o gate não estrutura):

```json
{"gate":"testes","arquivo":"src/x.test.ts","linha":42,"esperado":"200","obtido":"500","trecho":"...(≤15 linhas)...","fora_da_allowlist":["test/y.test.ts"],"instrucao":"corrija só o apontado; não toque fora da allowlist; se o quebrado está fora, reporte no commit"}
```

Nunca o log inteiro. O log inteiro fica em `runs/<id>/attempt-N/` (regra 8).

## 7. Juiz: dois níveis, um formato

| Risco | Juiz | Quando |
|---|---|---|
| baixo | `juiz_baixo` (médio) | gates verdes E diff ≤ `juiz.diff_max_baixo` (300) E nenhum path em `paths_alto_risco` |
| alto | `juiz_alto` (forte) | qualquer outro caso, e sempre no retry final |

Entrada idêntica nos dois: diff cru + outputs dos gates + critérios do ticket. Saída: `{"aprovado":bool,"motivo":"","criterios_falhos":[]}` com `max_tokens` pequeno. Juiz não recebe resumo do executor, nem o prompt do executor, nem o context pack (independência).

## 8. Saída compactada (padrão RTK)

Wrapper nos comandos que o executor roda dentro da sessão: `git diff --stat` + hunks só dos arquivos da allowlist; runner de testes com reporter mínimo (só falhas + contagem); typecheck só as linhas de erro; `ls` proibido (repo map no lugar). Medir antes/depois em 10 tickets: se não cortar ≥30% dos tokens de saída, não vale a complexidade.

## 9. Executor não narra

Prompt termina com: "Não escreva resumo, explicação ou próximos passos. Sua saída útil é o commit. Se algo impediu o critério, escreva UMA linha no corpo do commit começando com `IMPEDIMENTO:`". O harness lê `IMPEDIMENTO:` do `git log` (ground truth), não do stdout.

## 10. Modo arquiteto/editor (opcional, só risco alto)

`executor.modo_arquiteto_para_alto: true`: para ticket `risco: alto`, uma chamada curta ao modelo médio produz um plano de mudança (≤ 300 tokens: arquivos, funções, ordem), e a implementação roda com esse plano no prompt. Mesma sessão, mesmo cap. Padrão emprestado do Aider. Ligar só depois de medir aprovação de primeira em ticket alto com e sem.

## 11. Métricas que governam a semana

Em `STATUS.md` e no relatório, sempre os mesmos três:

| Métrica | Fonte | Meta inicial |
|---|---|---|
| tokens por ticket aprovado | `custo.json` / done | cair 10% por mês |
| aprovação de primeira | `events.log` (APROVADO com attempt=1 / total done) | ≥ 70%, depois 80% |
| causa nº 1 de reprovação | `events.log` motivo= mais frequente | muda de lugar toda semana |

Regra do PLAYBOOK: a semana ataca só a causa nº 1. Otimizar sem os três números é chute.

## 12. O que NÃO economiza (armadilhas)

- Cache semântico de resposta de LLM (AI Gateway) para o executor: hit rate zero, cada ticket é único. Vale para os SaaS, não para o loop.
- Modelo barato como executor: aprovação de primeira cai mais do que o custo por chamada; o retry devolve a economia com juros.
- Cortar o juiz em ticket baixo: o juiz médio custa menos que um bug que chega na staging e vira sinal de sentinela.
- Lote grande do planejador: tickets nascem de base velha e conflitam no merge; cada conflito é um ciclo perdido.
