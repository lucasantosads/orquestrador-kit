# Ticket 005 (DEFEITO-EO): teste prova que o watchdog do claude_run mata o grupo

## Objetivo (prosa)

Defeito registrado em docs/defeitos/2026-11-12-kill-do-grupo-sem-teste.md (aberto, origem escritorio-os): scripts/orquestrador/lib.sh:1552-1564 roda o agente em process group próprio e o watchdog faz kill -TERM -"$pid". Trocando por kill só do líder, a suíte inteira do kit passa (mutação medida em 12/11): nenhum teste protege o neto do agente (um npx vitest que ele disparou) de sobreviver ao corte.

Recon feito pelo chat do projeto Orquestrador em 14/11/2026 contra a origin/main bea053c (2.1.8).

## Campos de máquina

```json
{
  "id": "005",
  "frente": "DEFEITO-EO",
  "slug": "claude-run-mata-o-grupo-teste",
  "origem": "humano",
  "objetivo": "Crie test/orquestrador-claude-run-grupo.test.ts que roda o claude_run de scripts/orquestrador/lib.sh com um claude falso que dispara um neto (sleep 60 em segundo plano, pid gravado em arquivo) e dorme além do timeout, e afirma rc 124, neto morto logo após o corte e duração menor que timeout mais 15 s. O mesmo arquivo prova a própria sensibilidade: monta uma cópia mutante do claude_run em que os dois kill do grupo viram kill só do pid e afirma que, com ela, o neto sobrevive. Não mexa no lib.sh. Atualize o Estado do defeito para corrigido com o commit.",
  "pathspec_allowlist": [
    "test/orquestrador-claude-run-grupo.test.ts",
    "docs/defeitos/2026-11-12-kill-do-grupo-sem-teste.md"
  ],
  "cria_novo": [
    "test/orquestrador-claude-run-grupo.test.ts"
  ],
  "recon": [
    {
      "descricao": "o watchdog mata o grupo no lib.sh",
      "cmd": "grep -n 'kill -TERM -' scripts/orquestrador/lib.sh",
      "espera": "kill -TERM -"
    }
  ],
  "dependencias": [],
  "diff_estimado": 120,
  "criterios_aceite": [
    {
      "tipo": "alvo",
      "descricao": "o teste do grupo passa",
      "cmd": "env -u ORQ_CONFIG -u ORQ_GATE TZ=UTC node_modules/.bin/vitest run test/orquestrador-claude-run-grupo.test.ts >/dev/null 2>&1 && echo OK",
      "espera": "OK"
    },
    {
      "tipo": "avaliador",
      "descricao": "avaliador: o teste usa o claude_run real do lib.sh, cria um neto de verdade e afirma que ele morreu; a parte mutante afirma que o neto sobrevive sem o kill do grupo (senão o teste não protege nada); o lib.sh não mudou.",
      "cmd": "true",
      "espera": "avaliador"
    }
  ],
  "status": "pendente",
  "notas_status": "",
  "tentativas": 0
}
```
