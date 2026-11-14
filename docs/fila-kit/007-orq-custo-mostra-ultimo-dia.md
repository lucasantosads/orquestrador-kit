# Ticket 007 (DEFEITO-EO): orq custo sem argumento mostra também o último dia com gasto

## Objetivo (prosa)

Defeito achado no escritorio-os em 13/11: depois da drenagem de 12/11 23:47 a 23:54, orq custo mostrava DIA 2026-11-13 CHAMADAS 0 US$ 0, enquanto o custo.json guardava US$ 0,86 em dias[2026-11-12]. O cmd_custo de scripts/orq (linha 287) só olha o dia de hoje quando não recebe argumento.

Recon feito pelo chat do projeto Orquestrador em 14/11/2026 contra a origin/main bea053c (2.1.8).

## Campos de máquina

```json
{
  "id": "007",
  "frente": "DEFEITO-EO",
  "slug": "orq-custo-mostra-ultimo-dia",
  "origem": "humano",
  "objetivo": "No cmd_custo de scripts/orq, sem argumento, mostre o dia corrente e, quando o último dia com registro no custo.json for outro, mostre também esse dia, em bloco próprio com a data escrita. Com argumento, nada muda. Crie test/orquestrador-orq-custo.test.ts com um custo.json que só tem o dia de ontem e prove que orq custo sem argumento imprime o total de ontem com a data de ontem; e que com o dia de hoje presente só sai um bloco. Registre o defeito em docs/defeitos/2026-11-13-orq-custo-so-o-dia-corrente.md (Estado corrigido, origem escritorio-os).",
  "pathspec_allowlist": [
    "scripts/orq",
    "test/orquestrador-orq-custo.test.ts",
    "docs/defeitos/2026-11-13-orq-custo-so-o-dia-corrente.md"
  ],
  "cria_novo": [
    "test/orquestrador-orq-custo.test.ts",
    "docs/defeitos/2026-11-13-orq-custo-so-o-dia-corrente.md"
  ],
  "recon": [
    {
      "descricao": "o verbo custo usa o dia de hoje por padrão",
      "cmd": "grep -n 'local dia=' scripts/orq",
      "espera": "date"
    }
  ],
  "dependencias": [],
  "diff_estimado": 90,
  "criterios_aceite": [
    {
      "tipo": "alvo",
      "descricao": "o teste do orq custo passa",
      "cmd": "env -u ORQ_CONFIG -u ORQ_GATE TZ=UTC node_modules/.bin/vitest run test/orquestrador-orq-custo.test.ts >/dev/null 2>&1 && echo OK",
      "espera": "OK"
    },
    {
      "tipo": "avaliador",
      "descricao": "avaliador: sem argumento sai o dia de hoje e, se diferente, o último dia com registro, cada bloco com a data; com argumento o comportamento é o de antes; o teste usa data relativa, sem depender do dia em que roda.",
      "cmd": "true",
      "espera": "avaliador"
    }
  ],
  "status": "bloqueado",
  "notas_status": "bloqueado: base_vermelha — gate testes falhou só em arquivo(s) fora do diff e da allowlist: test/orquestrador-resolvedor-job-claude.test.ts; evidência: /Users/lucasantos/Projetos/orquestrador-kit/docs/fila-kit/runs/007/attempt-0/gates.txt",
  "tentativas": 0
}
```
