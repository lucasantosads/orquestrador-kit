# Fixture — controle: o mesmo critério lendo o rc do vitest

Mesma intenção do 901, sem pipe: ninguém morre de SIGPIPE e nada interpreta a
saída textual do vitest (regra de 21/09/2026 — `grep -cE ... passed` também
casava `Tests 1 failed | 5 passed`). Quem decide é o rc.

```json
{
  "id": "902",
  "bloco": "B6",
  "slug": "fixture-grep-c-controle",
  "objetivo": "fixture",
  "pathspec_allowlist": ["src/fixture-902.ts"],
  "dependencias": [],
  "risco": "",
  "criterios_aceite": [
    {
      "tipo": "alvo",
      "descricao": "tem teste e ele passa",
      "cmd": "npx vitest run visao-consolidada >/dev/null 2>&1 && echo ok",
      "espera": "ok"
    }
  ],
  "status": "pendente",
  "notas_status": ""
}
```
