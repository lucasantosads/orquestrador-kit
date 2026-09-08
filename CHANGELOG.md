# CHANGELOG

## 2.1.0-dev · 2026-09-08

- Importa o harness do conteudos-infinitos @711ab5e (peças 0 a 13 e peça 1). Ver ORIGEM.md.
- Ainda não instala em repo nenhum: instalar.sh e fixture vêm nas próximas peças (K5, K7).

### Etapa 1 — o kit fica de pé (roda os próprios testes, sem o checkout do CI)

- **K1** `9f9e807` — toolchain do kit: package.json, vitest.config.ts, tsconfig.json,
  .gitignore e package-lock. devDependencies com os mesmos ranges do CI; nenhuma
  dependência de runtime.
- **K2** `71cc719` — `test/fixtures/orq-harness.ts` copiado do CI @711ab5e, byte-idêntico
  (blob `db20a21a`). `test/db.ts` não entra: não existe no CI.
- **K3** `617d6ba` — vitest verde: 24 arquivos, 604 passam, 8 em quarentena
  (`docs/QUARENTENA.md`), `tsc --noEmit` limpo. `FX_CHECKOUT` é o checkout mínimo de
  fixture que faz o papel do repo instalado. Zero mudança em `scripts/orquestrador/**`.
- **K4** — `docs/PECAS.md` com o backlog K5→K15, e esta seção.

Ainda vermelho, por falta da fixture de repo (K7): `test-lib-config.sh`,
`test-drenagem.sh` e `test-retry-worktree.sh`, todos rc 2 — os três precisam de um
checkout com `docs/fila`.
