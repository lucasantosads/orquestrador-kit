# Fixture — critério com `| grep -q` (padrão do 431 e do 472)

Fila de FIXTURE do `test/orquestrador-gate-grep-q.test.ts`. Não é fila viva.
O critério abaixo é o do 431 até 21/09/2026: sob `set -o pipefail` (executor.sh)
o `grep -q` sai no primeiro acerto, o vitest morre de SIGPIPE e o `&& echo ok`
nunca roda — saída vazia com o teste verde.

```json
{
  "id": "901",
  "bloco": "B6",
  "slug": "fixture-grep-q-em-pipe",
  "objetivo": "fixture",
  "pathspec_allowlist": ["src/fixture-901.ts"],
  "dependencias": [],
  "risco": "",
  "criterios_aceite": [
    {
      "tipo": "alvo",
      "descricao": "tem teste e ele passa",
      "cmd": "npx vitest run visao-consolidada --reporter=dot 2>&1 | grep -qE '[1-9][0-9]* passed' && echo ok",
      "espera": "ok"
    }
  ],
  "status": "pendente",
  "notas_status": ""
}
```
