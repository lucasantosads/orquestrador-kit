# Defeito: o prompt manda rodar os gates e a permissão do agente nega

Origem: dashboard-comercial (clone `~/Projetos/dashboard-comercial-orq`), 29/10/2026, tickets 037, 039 e 043. Achado no PASSO 0 da etapa L13. Estado: **consertado na etapa L13** (`50f5700`, P1b). O dashboard só recebe o conserto quando o motor for reinstalado lá.

## O que aconteceu

- O prompt do executor diz "2. Os gates deste repo, nesta ordem: typecheck -> testes -> build" (`executor.sh:481`; `docs/fila/runs/037/attempt-0/prompt.txt:90` no dashboard).
- O `--allowedTools` da mesma chamada (`prompt.txt:52-79`) tem os comandos base e os `cmd` dos critérios, e nenhum dos três gates do dashboard: `node_modules/.bin/tsc --noEmit`, `node_modules/.bin/vitest run`, `NEXT_PUBLIC_…=… node_modules/.bin/next build`.
- Os agentes escreveram: "IMPEDIMENTO: typecheck e build não rodaram (comandos fora da lista permitida na sessão)" (037 `5818364`, 039 `565f237f`, 043 `aa6b4a97`). No 037 a falta de permissão também impediu o controle negativo: "a permissão da sessão só aceita o comando de teste final, então não rodei o teste sem a lib". Foi esse corpo que o juiz reprovou.

Causa: os gates já iam para `toolsDoTicket` (`decisao-cli.ts:87-88`, como diz o comentário de `executor.sh:1172`), mas `comandosDeGates` (`perfil.ts`) só reconhecia `npm run <script>`, `npm test` e `npx <bin>`. Gate que chama `node_modules/.bin` direto sumia da lista em silêncio.

## Conserto (etapa L13, P1b)

`comandosDeGates` reconhece, por segmento (`&&`, `||`, `;`, `|`), `node_modules/.bin/<bin> [args]`, sem as atribuições `VAR=valor` do início e sem o redirecionamento do fim. Cada um entra como `Bash(<cmd>)` e `Bash(<cmd>:*)`. O piso de `proibicoes_absolutas.tools` continua valendo por cima (`filtrarPeloPiso`).

Limite conhecido: o gate de build do dashboard roda com variáveis de ambiente falsas no prefixo. O agente tem permissão para `node_modules/.bin/next build`, e sem essas variáveis o build pode falhar por env ausente. O gate do motor continua rodando o comando inteiro.

## Critério executável

`test/orquestrador-tools-derivadas.test.ts`, describe "L13 P1b": com o config real do dashboard (`test/fixtures/l13/config-dashboard.json`), o `--allowedTools` tem `tsc --noEmit`, `vitest run` e `next build` nas duas formas, e o piso segue negando `rm`, `git push` e `npm install`. Vermelho antes: `expected [ 'Read', 'Edit', 'Write', …(13) ] to include 'Bash(node_modules/.bin/tsc --noEmit)'`.
