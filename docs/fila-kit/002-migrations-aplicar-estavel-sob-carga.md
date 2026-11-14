# Ticket 002 (DEFEITO-EO): test/orquestrador-migrations-aplicar.test.ts estável sob carga

## Objetivo (prosa)

O canário 001 da fila do kit está bloqueado desde 09/11 01:53 por base_vermelha: no gate de testes o caso 'arquivo fora do plano (já aplicado) e arquivo que não existe' (linha 305) falhou com motivo 'listar o schema_migrations: falha de rede…' em vez de /fora do plano/, com o arquivo levando 44 s sob a suíte inteira; isolado passou 23/23 em 13 s (docs/fila-kit/runs/001/attempt-0/gates.txt e isolado-1.txt). A mensagem vem de scripts/orquestrador/migrations/supabase.ts:104 (catch do fetch que não é timeout) chamado em :139. Enquanto isso não for estável, todo ticket da fila do kit pode bloquear pela mesma base.

Recon feito pelo chat do projeto Orquestrador em 14/11/2026 contra a origin/main bea053c (2.1.8).

## Campos de máquina

```json
{
  "id": "002",
  "frente": "DEFEITO-EO",
  "slug": "migrations-aplicar-estavel-sob-carga",
  "origem": "humano",
  "objetivo": "Ache e conserte a causa de test/orquestrador-migrations-aplicar.test.ts falhar sob carga com 'listar o schema_migrations: falha de rede' (scripts/orquestrador/migrations/supabase.ts:104, o catch do fetch ao servidor http local do teste) quando o arquivo roda junto com a suíte inteira, sem afrouxar nenhuma asserção, sem skip e sem aumentar timeout de teste como única medida. Reproduza primeiro rodando o arquivo em 3 processos paralelos e registre a causa com evidência (mensagem de erro completa) em docs/defeitos/2026-11-14-migrations-aplicar-instavel-sob-carga.md, no formato dos outros arquivos dessa pasta, com Estado corrigido e o porquê. Se a causa for do adaptador (por exemplo conexão keep-alive reaproveitada que o servidor já fechou), o conserto vai em supabase.ts mantendo a classificação incerto para rede de verdade; se for do teste, vai no teste.",
  "pathspec_allowlist": [
    "test/orquestrador-migrations-aplicar.test.ts",
    "scripts/orquestrador/migrations/supabase.ts",
    "docs/defeitos/2026-11-14-migrations-aplicar-instavel-sob-carga.md"
  ],
  "cria_novo": [
    "docs/defeitos/2026-11-14-migrations-aplicar-instavel-sob-carga.md"
  ],
  "recon": [
    {
      "descricao": "a mensagem de falha de rede sai do catch do fetch",
      "cmd": "grep -n 'falha de rede' scripts/orquestrador/migrations/supabase.ts",
      "espera": "falha de rede"
    }
  ],
  "dependencias": [],
  "diff_estimado": 80,
  "criterios_aceite": [
    {
      "tipo": "alvo",
      "descricao": "o arquivo passa em 3 execuções paralelas (carga)",
      "cmd": "ok=1; p=''; for i in 1 2 3; do env -u ORQ_CONFIG -u ORQ_GATE TZ=UTC node_modules/.bin/vitest run test/orquestrador-migrations-aplicar.test.ts >/dev/null 2>&1 & p=\"$p $!\"; done; for x in $p; do wait $x || ok=0; done; [ $ok = 1 ] && echo OK || echo FALHOU",
      "espera": "OK"
    },
    {
      "tipo": "guarda",
      "descricao": "o arquivo passa sozinho",
      "cmd": "env -u ORQ_CONFIG -u ORQ_GATE TZ=UTC node_modules/.bin/vitest run test/orquestrador-migrations-aplicar.test.ts >/dev/null 2>&1 && echo OK",
      "espera": "OK"
    },
    {
      "tipo": "avaliador",
      "descricao": "avaliador: o defeito registrado nomeia a causa com evidência; nenhuma asserção do teste foi removida ou afrouxada, nenhum skip; erro de rede de verdade continua saindo como incerto no adaptador.",
      "cmd": "true",
      "espera": "avaliador"
    }
  ],
  "status": "pendente",
  "notas_status": "",
  "tentativas": 0
}
```
