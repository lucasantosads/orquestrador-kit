# Procedência das fixtures da etapa L14

Cópias byte a byte, tiradas com `GIT_OPTIONAL_LOCKS=0 git show` (só leitura) em 01/11/2026.
`ticket.json` é o primeiro bloco ```json do arquivo do ticket.

| caso | repo | ticket (commit) | base |
|---|---|---|---|
| 853 | comarka-operacional | `docs/fila/853-home-vai-para-portal.md` em `87522d9` (a versão que rodou e virou `obsoleto (recon_esperado)` em `45c5344`, 08/10) | `base/page.tsx.txt` = `src/app/page.tsx` em `6da85e1e` (staging-auto antes de 08/10 18:41): `redirect("/dashboard")`, o recon[2] esperava `/equipe-geral`. `base/page-equipe-geral.tsx.txt` = o mesmo arquivo em `2db91ca4`, com `redirect("/equipe-geral")` (contraprova) |
| 002 | dashboard-comercial-orq | `docs/fila/002-liga-cartas-guarda-count.md` em `HEAD` (`778fe441`) | `base/liga-cartas.ts.txt` = `src/lib/liga-cartas.ts` em `c1051f13` (1º pai do merge da frente/002): a guarda `grep -cF '(count ?? 0) > 0'` espera 0 e a base tem 1 (C5) |
| 019 | dashboard-comercial-orq | `docs/fila/019-*.md` em `HEAD` (`778fe441`) | nenhuma: as quatro guardas citam rotas que o ticket cria (exceção do C5) |
| 926 | comarka-operacional | `docs/fila/926-*.md` em `HEAD` (`3818320`) | `base/pontos-acao.ts.txt` = `src/lib/clientes/pontos-acao.ts` em `eceecf8e` (1º pai do merge): o alvo `SEM_CALCULO` já passa (C6). `base/bloco-vazio-linha.tsx.txt` = `src/components/estados/bloco-vazio-linha.tsx` no mesmo commit, que o recon[0] exige |
| recon do 1084 | comarka-operacional | recon[2] de `docs/fila/1084-*.md` em `4aad08d` | `paste -sd' '` sem `-`: o `paste` do macOS sai com `usage: paste …` (divergiu em produção, `local-loop.log`) |
