# Ticket — Higiene: warning de multiplos lockfiles

## Campos de maquina

```json
{
  "id": "001b",
  "bloco": "B1",
  "slug": "higiene-lockfile",
  "objetivo": "PASSO 1: confirme o estado dos lockfiles antes de agir. O build emite warning de multiplos lockfiles (ha 4 commitados). Elimine o warning SEM remover nenhum package-lock.json. Se a unica solucao exigir remover algum, PARE e reporte as opcoes. FORA DE ESCOPO: credenciais, persona, qualquer tela.",
  "pathspec_allowlist": [
    "package.json",
    "apps/web/package.json",
    "next.config.mjs",
    "apps/web/next.config.mjs"
  ],
  "dependencias": [
    "004"
  ],
  "criterios_aceite": [
    {
      "descricao": "(c) o build não emite mais o warning de múltiplos lockfiles",
      "cmd": "cd apps/web && rm -rf .next && npm run build 2>&1 | grep -ci 'multiple lockfiles'",
      "espera": "0"
    },
    {
      "descricao": "nenhum package-lock.json foi removido",
      "cmd": "ls package-lock.json apps/web/package-lock.json >/dev/null 2>&1 && echo ok",
      "espera": "ok"
    }
  ],
  "status": "done",
  "notas_status": "mergeado em staging-auto pela drenagem"
}
```
