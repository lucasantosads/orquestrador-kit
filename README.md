# orquestrador-kit

Uma implementação, N instalações. O motor do orquestrador autônomo (loop de tickets com Claude Code headless, gates mecânicos, juiz LLM, merge em staging-auto) vive aqui, versionado. Cada repo recebe uma cópia vendorizada por `instalar.sh` e guarda o que é local só em `docs/fila/000-config.json`.

- `scripts/orquestrador/` motor (driver bash + decisores TS) e testes shell
- `scripts/orq` CLI de leitura e operação
- `scripts/roadmap/` lint do MAPA — também vendorizado (`orq mapa lint` o chama no repo instalado)
- `scripts/kit/` ferramentas do KIT, que não vão para repo nenhum: `fixture.sh` (instancia o repo
  de fixture), `test-shell.sh`, `test-instalar.sh`, `fixture-e2e.sh`, `extrair-do-ci.sh`
- `doutrina/` skill, referências e templates (vendorizada em `docs/orquestrador/skill/` de cada repo)
- `fixture/` TEMPLATE do repo mínimo que o `scripts/kit/fixture.sh` instancia num tmp para
  exercitar o motor ponta a ponta
- `instalar.sh` hoje só `--verificar <repo>` (`--novo`/`--atualizar` são a peça K8)
- `test/` vitest do harness
- `_referencia-ci/` cópias do repo de origem para derivar templates; não fazem parte do kit instalado
- `docs/` inventário, launchd, decisões

Regras: correção de harness entra AQUI primeiro e propaga por versão; nenhum script carrega premissa de repo (nome de branch, ref de banco, caminho de worktree); o que varia vive em config.
