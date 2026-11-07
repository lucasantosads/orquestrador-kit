# Ticket 1254: Base viva de aprendizados: POST e GET /api/apolo/conhecimento para o agente de scripts gravar e ler aprendizados por nicho e tese (token de servico), sobre a tabela conhecimento_comercial

> Lote de 17/10/2026 (tarde), loop plataforma, escrito a mao no molde do 1227 apos recon do codigo (origin/staging-auto 537337d) e do schema vivo.

> Fonte de máquina é o bloco ```json. A prosa é para humanos.

## Objetivo (prosa)

O agente de scripts do Lucas roda fora do OS e precisa de uma porta para gravar aprendizados (versionados, com evidencia e status do repertorio) e ler o que ja existe. Autenticacao por Bearer token proprio (APOLO_AGENTE_TOKEN), separado do CRON_SECRET; sem token configurado a rota responde 503 e nao aceita nada. Leitura por cliente usa fn_conhecimento_ler (5197).

## Recon

```
Medido em 17/10: src/app/api/cron/apolo/route.ts protege por Authorization: Bearer CRON_SECRET e responde 503 sem a env; inteligencia.conhecimento_comercial(chave, versao, nicho_id, tese_id, tipo, titulo, texto, evidencia jsonb, status, origem, autor, ativo) unique (chave, versao) e constraint de compliance (5197); fn_conhecimento_ler(p_cliente_id, p_tese_id, p_limite).
```

## Campos de máquina

```json
{
  "id": "1254",
  "slug": "api-apolo-conhecimento-agente",
  "loop": "plataforma",
  "lane": "apolo",
  "perfil": "api",
  "objetivo": "PASSO 0 (regra .claude/rules/apolo.md): leia docs/plano/apolo/00-PRINCIPIOS.md inteiro, o bloco 'Estado agora' do docs/plano/apolo/04-ROADMAP.md, os ADRs de docs/plano/apolo/adr/, as ultimas 30 linhas de docs/plano/apolo/aprendizados.md, docs/plano/apolo/glossario.md e a secao adr/ADR-012 do plano. ORCAMENTO DE DIFF: teto de 360 linhas (src/app/api/apolo/conhecimento/route.ts; src/lib/apolo/conhecimento.ts; test/api-apolo-conhecimento.test.ts). Se passar do teto, pare e reporte. PASSO 1: leia src/app/api/cron/apolo/route.ts (molde do Bearer), src/lib/apolo/db.ts, src/app/api/clientes/[id]/atendimento/feedback/route.ts, src/lib/apolo/comercial/followup-gerar.ts (PADRAO_PROMESSA) (tudo existe na staging-auto) e os testes vizinhos listados nos criterios (molde). FAZER: (1) NOVO src/lib/apolo/conhecimento.ts: export const EntradaConhecimento = z.object({ chave: z.string().min(3).max(80), nicho_id: uuid opcional, tese_id: uuid opcional, tipo: z.enum(['script','objecao','gatilho','padrao','regra']), titulo: z.string().min(3).max(140), texto: z.string().min(10).max(4000), evidencia: z.array(z.object({ fonte: z.string(), ref: z.string(), trecho: z.string().max(500) })).min(1), status: z.enum(['indicio','hipotese','sustentado','contradito','retirado']).default('indicio'), autor: z.string().min(2) }); export async function gravarConhecimento(db, entrada): Promise<{ id; versao }>: recusa texto com PADRAO_PROMESSA (ErroConhecimento 'promessa_de_resultado'); versao = (max versao da chave) + 1; insert em inteligencia(db).from('conhecimento_comercial') com origem 'agente_scripts'; export async function lerConhecimento(db, { cliente_id, tese_id?, limite? }) via rpc fn_conhecimento_ler; (2) NOVO route.ts: autenticacao: Authorization: Bearer igual a process.env.APOLO_AGENTE_TOKEN (503 sem a env, 401 diferente), OU sessao com exigirPapel(['diretor','admin']) para leitura; POST { itens: EntradaConhecimento[] } (1 a 50) grava cada um e devolve { gravados: [{ chave, versao }], recusados: [{ chave, erro }] }; GET ?cliente_id&tese_id&limite devolve { itens }; erro de banco 500 generico; (3) NOVO test: (a) sem env -> 503; (b) token errado -> 401; (c) item com 'causa ganha' -> recusado com promessa_de_resultado e os demais gravados; (d) segunda gravacao da mesma chave -> versao 2; (e) GET chama fn_conhecimento_ler com os parametros. Regras do repo: sem travessao (U+2014); nenhuma escrita nem DDL em zona C0 (clientes_receita, leads_crm*, trafego_*, ads_metadata, ads_performance, vw_*), nem .from() nelas; rota nova no molde de src/app/api/clientes/[id]/atendimento/feedback/route.ts (exigirPapel de src/lib/auth/exigir-papel.ts, getSupabaseAdmin, falha de leitura e 500 com mensagem generica, nunca vazio; sem .json() novo em src, use fetchJson/parseJsonResponse de src/lib/fetch-json.ts); tela no molde do componente irmao mais proximo (tokens do DESIGN.md, estados vazio/erro/carregando, botao e Button, icone com aria-hidden, acao com nome acessivel); proibido remover assercao, trocar matcher por toBeDefined, usar .skip, .only ou .todo; teste novo no molde do teste irmao mais proximo. Commit por unidade logica com git add por pathspec. FORA DE ESCOPO: qualquer arquivo fora da allowlist; migration ou .sql; docs/plano/apolo/; scripts/orquestrador/**.",
  "plano_secao": "adr/ADR-012",
  "atualiza_plano": "nao",
  "plano_item": "C4-07",
  "pathspec_allowlist": [
    "src/app/api/apolo/conhecimento/route.ts",
    "src/lib/apolo/conhecimento.ts",
    "test/api-apolo-conhecimento.test.ts"
  ],
  "cria_novo": [
    "src/app/api/apolo/conhecimento/route.ts",
    "src/lib/apolo/conhecimento.ts",
    "test/api-apolo-conhecimento.test.ts"
  ],
  "dependencias": [
    "5197",
    "humano:migration-5197-aplicada"
  ],
  "prioridade": 56,
  "recon_esperado": [
    {
      "descricao": "route.ts ainda nao existe",
      "cmd": "test -e 'src/app/api/apolo/conhecimento/route.ts' && echo EXISTE || echo AUSENTE",
      "espera": "AUSENTE"
    },
    {
      "descricao": "conhecimento.ts ainda nao existe",
      "cmd": "test -e 'src/lib/apolo/conhecimento.ts' && echo EXISTE || echo AUSENTE",
      "espera": "AUSENTE"
    },
    {
      "descricao": "api-apolo-conhecimento.test.ts ainda nao existe",
      "cmd": "test -e 'test/api-apolo-conhecimento.test.ts' && echo EXISTE || echo AUSENTE",
      "espera": "AUSENTE"
    }
  ],
  "criterios_aceite": [
    {
      "descricao": "tsc nao regride alem do baseline de 3 (src/ e test/, sem ruido de .next)",
      "cmd": "( [ \"$(npx tsc --noEmit 2>&1 | grep 'error TS' | grep -vc '^\\.next/')\" = 3 ] ) && echo OK || echo FAIL",
      "espera": "OK",
      "tipo": "guarda"
    },
    {
      "descricao": "so arquivos da allowlist foram tocados",
      "cmd": "b=\"$(git merge-base HEAD staging-auto)\"; r=SO_ALLOWLIST; for f in $(git diff --name-only \"$b\" HEAD); do printf '%s\\n' 'src/app/api/apolo/conhecimento/route.ts' 'src/lib/apolo/conhecimento.ts' 'test/api-apolo-conhecimento.test.ts' | grep -Fxq \"$f\" || r=FORA_$f; done; echo $r",
      "espera": "SO_ALLOWLIST",
      "tipo": "guarda"
    },
    {
      "descricao": "diff dentro do orcamento (<= 360 linhas somando adicoes e remocoes)",
      "cmd": "b=\"$(git merge-base HEAD staging-auto)\"; t=$(git diff --numstat \"$b\" HEAD | awk '{s+=$1+$2} END {print s+0}'); [ \"$t\" -le 360 ] && echo NO_TETO || echo ESTOUROU_$t",
      "espera": "NO_TETO",
      "tipo": "guarda"
    },
    {
      "descricao": "nenhum .sql novo (zero DDL)",
      "cmd": "b=\"$(git merge-base HEAD staging-auto)\"; n=$(git diff --name-only \"$b\" HEAD | grep -c '[.]sql$'); [ \"$n\" = 0 ] && echo SEM_SQL || echo COM_SQL_$n",
      "espera": "SEM_SQL",
      "tipo": "guarda"
    },
    {
      "descricao": "atualiza_plano nao: nenhum arquivo de docs/plano/apolo/ muda",
      "cmd": "b=\"$(git merge-base HEAD staging-auto)\"; n=$(git diff --name-only \"$b\" HEAD | grep -c '^docs/plano/apolo/'); [ \"$n\" = 0 ] && echo PLANO_INTOCADO || echo PLANO_MUDOU_$n",
      "espera": "PLANO_INTOCADO",
      "tipo": "guarda"
    },
    {
      "descricao": "guardas globais seguem verdes (test/c0-guard.test.ts, test/fetch-json-teto.test.ts, test/travessao-mudo.test.ts)",
      "cmd": "npx vitest run 'test/c0-guard.test.ts' 'test/fetch-json-teto.test.ts' 'test/travessao-mudo.test.ts' >/dev/null 2>&1 && echo VERDE || echo VERMELHO",
      "espera": "VERDE",
      "tipo": "guarda"
    },
    {
      "descricao": "o codigo faz o que o FAZER pede",
      "cmd": "f='src/lib/apolo/conhecimento.ts'; test -f \"$f\" || { echo SEM_ARQUIVO; exit 0; }; v0=$(grep -cE 'export const EntradaConhecimento' \"$f\"); v1=$(grep -cE 'export async function gravarConhecimento' \"$f\"); v2=$(grep -cE 'export async function lerConhecimento' \"$f\"); v3=$(grep -cE '.conhecimento_comercial.' \"$f\"); v4=$(grep -cE 'fn_conhecimento_ler' \"$f\"); v5=$(grep -cE 'PADRAO_PROMESSA' \"$f\"); v6=$(grep -cE 'agente_scripts' \"$f\"); [ \"$v0\" -ge 1 ] && [ \"$v1\" -ge 1 ] && [ \"$v2\" -ge 1 ] && [ \"$v3\" -ge 1 ] && [ \"$v4\" -ge 1 ] && [ \"$v5\" -ge 1 ] && [ \"$v6\" -ge 1 ] && echo CODIGO_CERTO || echo ST_schema${v0}_grava${v1}_le${v2}_tab${v3}_rpc${v4}_prom${v5}_origem${v6}",
      "espera": "CODIGO_CERTO",
      "tipo": "alvo"
    },
    {
      "descricao": "rota do conhecimento",
      "cmd": "f='src/app/api/apolo/conhecimento/route.ts'; test -f \"$f\" || { echo SEM_ARQUIVO; exit 0; }; v0=$(grep -cE 'export async function POST' \"$f\"); v1=$(grep -cE 'export async function GET' \"$f\"); v2=$(grep -cE 'APOLO_AGENTE_TOKEN' \"$f\"); v3=$(grep -cE '503' \"$f\"); v4=$(grep -cE 'CRON_SECRET' \"$f\"); [ \"$v0\" -ge 1 ] && [ \"$v1\" -ge 1 ] && [ \"$v2\" -ge 1 ] && [ \"$v3\" -ge 1 ] && [ \"$v4\" = 0 ] && echo ROTA_CERTA || echo ST_post${v0}_get${v1}_env${v2}_503${v3}_cron${v4}",
      "espera": "ROTA_CERTA",
      "tipo": "alvo"
    },
    {
      "descricao": "teste novo verde (test/api-apolo-conhecimento.test.ts)",
      "cmd": "test -f 'test/api-apolo-conhecimento.test.ts' && npx vitest run 'test/api-apolo-conhecimento.test.ts' >/dev/null 2>&1 && echo VERDE || echo VERMELHO",
      "espera": "VERDE",
      "tipo": "alvo"
    },
    {
      "descricao": "avaliador: o agente grava por token proprio, cada gravacao e versao nova da chave com evidencia obrigatoria e guarda de promessa; sem env a porta fica fechada. REPROVE se: usa CRON_SECRET; aceita sem evidencia; faz update em versao existente; token em codigo.",
      "cmd": "true",
      "espera": "avaliador",
      "tipo": "avaliador"
    }
  ],
  "testes_conferidos": [
    {
      "teste": "test/apolo-decisao-tipada.test.ts",
      "motivo": "varre src/ por importador de decisao-tipada fora de src/lib/apolo: conhecimento.ts mora em src/lib/apolo e nao importa decisao-tipada"
    }
  ],
  "status": "done",
  "notas_status": "aprovado (tentativa 1): Token próprio APOLO_AGENTE_TOKEN com timingSafeEqual; 503 sem env e 401 com token diferente; sem CRON_SECRET e sem token no código. Evidência min(1) testada; só faz insert append-only (versão = max+1, nova tentativa em 23505); guarda de PADRAO_PROMESSA testada; erro de banco devolve 500 genérico."
}
```
