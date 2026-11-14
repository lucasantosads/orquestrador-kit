# Ticket 009 (CUSTO): sondagem de modelo reaproveitada e escrita de cache medida

## Objetivo (prosa)

Medido em 14/11/2026 no custo.json do dashboard (13 dias): a sondagem de modelo roda antes de cada execução do executor e custou US$ 21,3 em 136 chamadas, 12% do gasto total (US$ 172), cerca de US$ 0,16 cada, porque o cache do prompt expira entre uma execução e outra e toda sondagem paga a escrita do cache. No escritorio-os foram 20 sondagens para 15 tickets. Reaproveitar a sondagem boa por 6 horas corta quase todo esse gasto sem perder a detecção de modelo recusado. O custo.json hoje só guarda a leitura do cache (usage.cache_read_input_tokens, campos_usage do config); sem a escrita do cache não dá para medir o efeito de TTL de cache nem de contexto menor.

Recon feito pelo chat do projeto Orquestrador em 14/11/2026 contra a main a3a90d1 (executor.sh:154 probe_modelos, chamado em :134; custo_registrar perto de :1450).

## Campos de máquina

```json
{
  "id": "009",
  "frente": "CUSTO",
  "slug": "sondagem-reaproveitada-e-cache-medido",
  "origem": "humano",
  "objetivo": "Em scripts/orquestrador/executor.sh: (1) faça o probe_modelos reaproveitar a última sondagem boa. Depois de uma sondagem que passou, grave em runs/sondagem.json o modelo e a hora; na próxima execução, se o modelo do executor for o mesmo e a sondagem boa tiver menos de 6 horas, pule a chamada paga e registre no log 'probe: reaproveitada de <hora>'. Sondagem que adiou ou que achou modelo recusado nunca é gravada como boa, e a checagem de modelo indefinido e o gate de orçamento continuam rodando antes, como hoje. (2) No registro de custo de cada chamada (custo_registrar), grave também tokens_cache_criacao, lido de usage.cache_creation_input_tokens da saída JSON do claude, com 0 quando ausente, sem mudar nenhum campo que já existe. Crie test/orquestrador-sondagem-reaproveitada.test.ts com um claude falso que conta chamadas: duas execuções seguidas com sondagem boa fazem uma chamada só; sondagem gravada há mais de 6 h ou com outro modelo faz a chamada; sondagem que adiou não é reaproveitada; o registro de custo traz tokens_cache_criacao quando o JSON tem o campo e 0 quando não tem.",
  "pathspec_allowlist": [
    "scripts/orquestrador/executor.sh",
    "test/orquestrador-sondagem-reaproveitada.test.ts"
  ],
  "cria_novo": [
    "test/orquestrador-sondagem-reaproveitada.test.ts"
  ],
  "recon": [
    {
      "descricao": "a sondagem fica no executor",
      "cmd": "grep -n '^probe_modelos()' scripts/orquestrador/executor.sh",
      "espera": "probe_modelos"
    }
  ],
  "dependencias": [],
  "diff_estimado": 150,
  "criterios_aceite": [
    {
      "tipo": "alvo",
      "descricao": "o teste da sondagem reaproveitada passa",
      "cmd": "env -u ORQ_CONFIG -u ORQ_GATE TZ=UTC node_modules/.bin/vitest run test/orquestrador-sondagem-reaproveitada.test.ts >/dev/null 2>&1 && echo OK",
      "espera": "OK"
    },
    {
      "tipo": "avaliador",
      "descricao": "avaliador: sondagem só é reaproveitada se foi boa, para o mesmo modelo e com menos de 6 h; adiamento e recusa seguem iguais; checagem de modelo indefinido e gate de orçamento continuam antes; o custo ganhou só o campo novo, sem mudar os existentes.",
      "cmd": "true",
      "espera": "avaliador"
    }
  ],
  "status": "obsoleto",
  "notas_status": "superado pela etapa 2.2.0: fora do escopo da etapa, que tirou a fila-kit do caminho; o custo da sondagem segue em M-29 (status anterior: bloqueado)",
  "tentativas": 0
}
```
