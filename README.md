# orquestrador-kit

Uma implementação, N instalações. O motor do orquestrador autônomo (loop de tickets com Claude Code headless, gates mecânicos, juiz LLM, merge em staging-auto) vive aqui, versionado. Cada repo recebe uma cópia vendorizada por `instalar.sh` e guarda o que é local só em `docs/fila/000-config.json`.

- `scripts/orquestrador/` motor (driver bash + decisores TS) e testes shell
- `scripts/orq` CLI de leitura e operação
- `doutrina/` skill, referências e templates (vendorizada em `docs/orquestrador/skill/` de cada repo)
- `test/` vitest do harness
- `_referencia-ci/` cópias do repo de origem para derivar templates; não fazem parte do kit instalado
- `docs/` inventário, launchd, decisões

Regras: correção de harness entra AQUI primeiro e propaga por versão; nenhum script carrega premissa de repo (nome de branch, ref de banco, caminho de worktree); o que varia vive em config.
