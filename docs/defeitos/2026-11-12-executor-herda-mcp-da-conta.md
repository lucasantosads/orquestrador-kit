# Defeito: sondagem e agente do executor rodam com os MCP da conta

Origem: pré-voo do escritorio-os, 12/11/2026. Estado: **fechado (2.1.8)**.

## O que acontece

O `executor.sh` chama `claude -p` em três lugares. Só o juiz (`:1092`, etapa 8e) passava
`--strict-mcp-config`. A sondagem (`probe_modelos`, `:182`) e o agente (`run_attempt`, `:1456`)
não passavam, e o CLI carregava os conectores claude.ai da conta do dono da máquina.

No Mac do Lucas isso põe ao alcance do agente, entre outros, `mcp__claude_ai_GHL__execute_operation`
e `mcp__claude_ai_Supabase__execute_sql`, com escrita. O que segurava era só permissão: o `-p` nega
o que não está em `--allowedTools`, e o `~/.claude/settings.local.json` do usuário já tem
`mcp__claude_ai_Supabase__execute_sql` em `permissions.allow`. Fronteira dependendo de permissão de
usuário não é fronteira.

## Medição (controle negativo)

`scripts/kit/sonda-mcp.sh` (paga, `ORQ_SONDA_OK=1`) lê o evento `init` do
`claude -p --output-format stream-json --verbose`. Claude Code 2.1.321, cwd vazio:

```
== sem-flag: mcp_servers=38, tools=689, mcp__claude_ai_*=661
== com-flag: mcp_servers=0,  tools=25,  mcp__claude_ai_*=0
```

Resumo em `2026-11-12-executor-herda-mcp-da-conta.sonda.txt` (contagens e as duas ferramentas de escrita;
a lista completa não vai para o repo, só sai com `--lista-completa`, em pasta temporária).

## Conserto

`--strict-mcp-config` sem `--mcp-config` na sondagem e no agente, o padrão do juiz.
`--setting-sources project` (proposto no registro do escritorio-os) ficou de fora: não foi pedido
nesta etapa e muda de onde vêm as permissões; vai para decisão própria.

## Prova

`test/orquestrador-executor-sem-mcp.test.ts`: `probe_modelos` e `run_attempt` de verdade
(executor.sh sourced) com `claude` falso no PATH que grava o argv. Com o conserto: 2 verdes.
Com o `executor.sh` de b59937b: 2 vermelhos (`expected [...] to include '--strict-mcp-config'`).
