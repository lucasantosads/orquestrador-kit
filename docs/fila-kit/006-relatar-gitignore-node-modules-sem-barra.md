# Ticket 006 (DEFEITO-EO): instalador acusa node_modules sem barra no .gitignore

## Objetivo (prosa)

Defeito achado no escritorio-os em 13/11: a primeira drenagem reprovou 001 duas vezes por arquivo_solto com gates verdes, porque o .gitignore do repo só tinha node_modules/ e, na worktree do loop, node_modules é symlink (executor.sh linkar_node_modules), que a linha com barra não casa. O kit já tem a linha sem barra no próprio .gitignore (linhas 2 a 4). O relatar_gitignore do instalar.sh (linha 288) confere PAUSAR e runs/, mas não isso.

Recon feito pelo chat do projeto Orquestrador em 14/11/2026 contra a origin/main bea053c (2.1.8).

## Campos de máquina

```json
{
  "id": "006",
  "frente": "DEFEITO-EO",
  "slug": "relatar-gitignore-node-modules-sem-barra",
  "origem": "humano",
  "objetivo": "No relatar_gitignore de instalar.sh, acrescente a conferência de node_modules sem barra: pergunte ao git se um caminho como docs/node_modules (que não existe) é ignorado e, se não for, imprima FALTA com a linha node_modules e o comentário do kit sobre o symlink da worktree, no mesmo formato das conferências de PAUSAR e runs/. Mantenha a regra de que o instalador não edita .gitignore de repo existente. Se o .gitignore inicial que o --novo escreve não tiver a linha sem barra, acrescente-a lá. Crie test/orquestrador-relatar-gitignore.test.ts com um repo git temporário que só tem node_modules/ (espera FALTA) e outro com node_modules (espera ok). Registre o defeito em docs/defeitos/2026-11-13-node-modules-sem-barra-no-gitignore.md (Estado corrigido, origem escritorio-os). A parte do pré-voo (NO-GO) é régua e fica fora.",
  "pathspec_allowlist": [
    "instalar.sh",
    "test/orquestrador-relatar-gitignore.test.ts",
    "docs/defeitos/2026-11-13-node-modules-sem-barra-no-gitignore.md"
  ],
  "cria_novo": [
    "test/orquestrador-relatar-gitignore.test.ts",
    "docs/defeitos/2026-11-13-node-modules-sem-barra-no-gitignore.md"
  ],
  "recon": [
    {
      "descricao": "o relatar_gitignore existe no instalador",
      "cmd": "grep -n '^relatar_gitignore()' instalar.sh",
      "espera": "relatar_gitignore"
    }
  ],
  "dependencias": [],
  "diff_estimado": 110,
  "criterios_aceite": [
    {
      "tipo": "alvo",
      "descricao": "o teste do relatar_gitignore passa",
      "cmd": "env -u ORQ_CONFIG -u ORQ_GATE TZ=UTC node_modules/.bin/vitest run test/orquestrador-relatar-gitignore.test.ts >/dev/null 2>&1 && echo OK",
      "espera": "OK"
    },
    {
      "tipo": "avaliador",
      "descricao": "avaliador: a conferência nova usa git check-ignore como as vizinhas, imprime FALTA só quando a linha sem barra falta, não edita .gitignore de repo existente; o teste cobre os dois casos.",
      "cmd": "true",
      "espera": "avaliador"
    }
  ],
  "status": "pendente",
  "notas_status": "",
  "tentativas": 1
}
```
