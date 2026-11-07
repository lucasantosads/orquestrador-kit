# Ticket 5197: Base viva de aprendizados por nicho e tese: tabela conhecimento_comercial (o agente de scripts grava, o Apolo le) e fn_conhecimento_ler(cliente, tese)

> Lote de 17/10/2026 (tarde), escrito a mao no molde do 5051/5146/5165 apos recon do codigo (origin/main 457856c, origin/staging-auto 537337d) e do schema vivo. Sem humano:revisao-escritor porque nao saiu do escritor.

> Fonte de máquina é o bloco ```json. A prosa é para humanos.

## Objetivo (prosa)

Lucas esta criando um agente que analisa o CRM e monta scripts por nicho e tese, com uma base viva de aprendizados (16/10). Esses aprendizados entram nas analises do Apolo (kernel comercial). Esta migration cria o lugar, versionado e append-only, com evidencia obrigatoria, e a leitura por cliente (nicho e teses do cliente). A rota que o agente usa para gravar e o 1254 da plataforma; os juizes e o copiloto leem pela 5198.

## Recon

```
Medido em 17/10: inteligencia.hipotese_comercial(id, versao, titulo, texto, origem, status_repertorio, par, medidas, ativo) e append-only por versao; dim_nicho(id, origem_id?), dim_tese(id, origem_id, nicho_id, nome); public.clientes_teses(cliente_id, tese_id, nicho_id); public.perf_teses(id, nome, nicho_id?); conferir no banco vivo as colunas de dim_nicho e perf_teses antes de escrever o join. Nenhuma tabela conhecimento* existe.
```

## Campos de máquina

```json
{
  "id": "5197",
  "slug": "apolo-conhecimento-comercial-sql",
  "loop": "apolo",
  "lane": "apolo",
  "perfil": "sql-proposta",
  "objetivo": "PASSO 0 (regra .claude/rules/apolo.md): leia docs/plano/apolo/00-PRINCIPIOS.md inteiro, o bloco 'Estado agora' do docs/plano/apolo/04-ROADMAP.md, os ADRs de docs/plano/apolo/adr/, as ultimas 30 linhas de docs/plano/apolo/aprendizados.md, docs/plano/apolo/glossario.md e a secao adr/ADR-012 do plano. ORCAMENTO DE DIFF: teto de 300 linhas (supabase/migrations/20261017161200_inteligencia_conhecimento_comercial.sql; test/inteligencia/conhecimento-comercial.test.ts). Se passar do teto, pare e reporte. PASSO 1: leia supabase/migrations/20261015202634_inteligencia_raw_ghl_conversas.sql (molde de cabecalho) e supabase/migrations/20261015202634_inteligencia_raw_ghl_conversas.sql (molde de funcao invoker, search_path e grants). As colunas citadas abaixo foram conferidas no banco vivo em 17/10/2026: use exatamente esses nomes. FAZER: 1) create table inteligencia.conhecimento_comercial (id bigserial pk, chave text not null, versao int not null default 1, nicho_id uuid null, tese_id uuid null (ids do catalogo public: perf_teses / nichos, sem FK entre schemas), tipo text not null check (tipo in ('script','objecao','gatilho','padrao','regra')), titulo text not null, texto text not null, evidencia jsonb not null default '[]' (lista de {fonte, ref, trecho}), status text not null default 'indicio' check (status in ('indicio','hipotese','sustentado','contradito','retirado')), origem text not null default 'agente_scripts', autor text not null, ativo boolean not null default true, criado_em timestamptz default now()), unique (chave, versao); RLS ligada sem policy, revoke all de anon e authenticated; trigger de imutabilidade (UPDATE so em ativo; DELETE recusado); check de compliance: texto nao contem (case insensitive) 'garantia de', '100%', 'causa ganha', 'sem risco' (constraint); 2) create or replace function inteligencia.fn_conhecimento_ler(p_cliente_id uuid, p_tese_id uuid default null, p_limite int default 20) returns table (id bigint, chave text, versao int, tipo text, titulo text, texto text, status text, tese_id uuid, nicho_id uuid, escopo text) language sql stable security invoker: ultima versao ativa de cada chave, com status <> 'retirado' e <> 'contradito', cujo tese_id e null ou esta nas teses do cliente (public.clientes_teses deleted_at is null, ou = p_tese_id quando informado) ou cujo nicho_id e null ou esta nos nichos do cliente; escopo = 'tese' | 'nicho' | 'geral'; ordena escopo tese > nicho > geral, status sustentado > hipotese > indicio, versao desc; limite p_limite; 3) POS-APLICACAO: select count(*) from inteligencia.fn_conhecimento_ler('7837ac12-c6db-47e8-b4e8-6e043633eb6d'); Depois: revoke execute de public, anon e authenticated e grant execute a service_role e a apolo em toda funcao nova; NOVO test/inteligencia/conhecimento-comercial.test.ts: le o .sql com readFileSync e prova por regex cada item do FAZER (nomes de funcao e tabela, regras, tolerancias, security, grants) e que nenhuma tabela C0 aparece. REGRAS DA MIGRATION: so escreva o .sql, nunca aplique (o Lucas aplica pela skill aplicar-migration-ddl). Cabecalho no molde de supabase/migrations/20261015202634_inteligencia_raw_ghl_conversas.sql (ticket 5035): titulo com o ticket, 'APLICAR E HUMANO. Este arquivo e so a proposta versionada.', o token humano:migration-5197-aplicada, O QUE FAZ, POR QUE, QUEM APLICA, POS-APLICACAO (consultas que o Lucas roda) e REVERSAO EXATA; nunca a expressao NAO APLICADA nas 5 primeiras linhas (test/migrations-cabecalho-aplicada.test.ts). Corpo entre begin; e commit;. Toda tabela nova: RLS ligada, sem policy, revoke all de anon e authenticated. Toda funcao nova: revoke execute de public, anon e authenticated e grant execute a service_role e a apolo (o Apolo roda como service_role, ADR-010); funcao que so le schema public e inteligencia e security invoker com set search_path = pg_catalog, public, inteligencia, pg_temp (molde da 5061); funcao que le tabela da zona C0 e security definer com set search_path = '' e todo nome qualificado (molde da 5048). Nenhuma linha de DDL (drop, alter table, create trigger) a menos de 10 linhas de um nome de tabela da zona C0, e nenhum nome de tabela C0 em comentario (test/c0-guard.test.ts); nunca cite vw_atribuicao_proporcional. Regras do repo: sem travessao (U+2014); nenhuma escrita nem DDL em zona C0 (clientes_receita, leads_crm*, trafego_*, ads_metadata, ads_performance, vw_*); tudo do Apolo nasce no schema inteligencia; termos de docs/plano/apolo/glossario.md, sem sinonimo inventado; nunca current_date (o dia e (now() at time zone 'America/Sao_Paulo')::date); round sobre double precision exige cast ::numeric antes (round(x::numeric, 1)); proibido remover assercao, trocar matcher por toBeDefined, usar .skip, .only ou .todo. O teste novo em test/inteligencia/ le o .sql com readFileSync e prova por regex o que o FAZER pede (molde test/inteligencia/fn-cliente-ativo.test.ts). FORA DE ESCOPO: qualquer arquivo fora da allowlist; aplicar a migration; rota, cron ou codigo TypeScript; docs/plano/apolo/ (atualiza_plano nao); scripts/orquestrador/**.",
  "plano_secao": "adr/ADR-012",
  "atualiza_plano": "nao",
  "pathspec_allowlist": [
    "supabase/migrations/20261017161200_inteligencia_conhecimento_comercial.sql",
    "test/inteligencia/conhecimento-comercial.test.ts"
  ],
  "cria_novo": [
    "supabase/migrations/20261017161200_inteligencia_conhecimento_comercial.sql",
    "test/inteligencia/conhecimento-comercial.test.ts"
  ],
  "dependencias": [],
  "prioridade": 59,
  "recon_esperado": [
    {
      "descricao": "20261017161200_inteligencia_conhecimento_comercial.sql ainda nao existe",
      "cmd": "test -e 'supabase/migrations/20261017161200_inteligencia_conhecimento_comercial.sql' && echo EXISTE || echo AUSENTE",
      "espera": "AUSENTE"
    },
    {
      "descricao": "conhecimento-comercial.test.ts ainda nao existe",
      "cmd": "test -e 'test/inteligencia/conhecimento-comercial.test.ts' && echo EXISTE || echo AUSENTE",
      "espera": "AUSENTE"
    },
    {
      "descricao": "a versao da migration e unica (nenhum outro .sql com o mesmo prefixo)",
      "cmd": "n=$(ls supabase/migrations/ | grep -c '^20261017161200_'); [ \"$n\" = 0 ] && echo VERSAO_LIVRE || echo VERSAO_USADA_$n",
      "espera": "VERSAO_LIVRE"
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
      "cmd": "b=\"\"; nb=\"\"; for r in staging-apolo staging-auto; do m=$(git merge-base HEAD \"$r\" 2>/dev/null) || continue; n=$(git rev-list --count \"$m\"..HEAD); if [ -z \"$nb\" ] || [ \"$n\" -lt \"$nb\" ]; then b=$m; nb=$n; fi; done; r=SO_ALLOWLIST; for f in $(git diff --name-only \"$b\" HEAD); do printf '%s\\n' 'supabase/migrations/20261017161200_inteligencia_conhecimento_comercial.sql' 'test/inteligencia/conhecimento-comercial.test.ts' | grep -Fxq \"$f\" || r=FORA_$f; done; echo $r",
      "espera": "SO_ALLOWLIST",
      "tipo": "guarda"
    },
    {
      "descricao": "diff dentro do orcamento (<= 300 linhas somando adicoes e remocoes)",
      "cmd": "b=\"\"; nb=\"\"; for r in staging-apolo staging-auto; do m=$(git merge-base HEAD \"$r\" 2>/dev/null) || continue; n=$(git rev-list --count \"$m\"..HEAD); if [ -z \"$nb\" ] || [ \"$n\" -lt \"$nb\" ]; then b=$m; nb=$n; fi; done; t=$(git diff --numstat \"$b\" HEAD | awk '{s+=$1+$2} END {print s+0}'); [ \"$t\" -le 300 ] && echo NO_TETO || echo ESTOUROU_$t",
      "espera": "NO_TETO",
      "tipo": "guarda"
    },
    {
      "descricao": "atualiza_plano nao: nenhum arquivo de docs/plano/apolo/ muda",
      "cmd": "b=\"\"; nb=\"\"; for r in staging-apolo staging-auto; do m=$(git merge-base HEAD \"$r\" 2>/dev/null) || continue; n=$(git rev-list --count \"$m\"..HEAD); if [ -z \"$nb\" ] || [ \"$n\" -lt \"$nb\" ]; then b=$m; nb=$n; fi; done; n=$(git diff --name-only \"$b\" HEAD | grep -c '^docs/plano/apolo/'); [ \"$n\" = 0 ] && echo PLANO_INTOCADO || echo PLANO_MUDOU_$n",
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
      "descricao": "testes que varrem as migrations seguem verdes",
      "cmd": "npx vitest run 'test/c0-guard.test.ts' 'test/migrations-cabecalho-aplicada.test.ts' 'test/migrations-policy-idempotente.test.ts' 'test/migration-security-definer-anon.test.ts' 'test/sync-log-status.test.ts' 'test/inteligencia/escritor-forma.test.ts' >/dev/null 2>&1 && echo VERDE || echo VERMELHO",
      "espera": "VERDE",
      "tipo": "guarda"
    },
    {
      "descricao": "um unico .sql novo, e e supabase/migrations/20261017161200_inteligencia_conhecimento_comercial.sql",
      "cmd": "b=\"\"; nb=\"\"; for r in staging-apolo staging-auto; do m=$(git merge-base HEAD \"$r\" 2>/dev/null) || continue; n=$(git rev-list --count \"$m\"..HEAD); if [ -z \"$nb\" ] || [ \"$n\" -lt \"$nb\" ]; then b=$m; nb=$n; fi; done; n=$(git diff --name-only \"$b\" HEAD | grep -c '[.]sql$'); m=$(git diff --name-only \"$b\" HEAD | grep -cF 'supabase/migrations/20261017161200_inteligencia_conhecimento_comercial.sql'); [ \"$n\" = 1 ] && [ \"$m\" = 1 ] && echo SQL_UNICO || echo ST_sqlnovos${n}_alvo${m}",
      "espera": "SQL_UNICO",
      "tipo": "alvo"
    },
    {
      "descricao": "o .sql faz o que o FAZER pede",
      "cmd": "f='supabase/migrations/20261017161200_inteligencia_conhecimento_comercial.sql'; test -f \"$f\" || { echo SEM_ARQUIVO; exit 0; }; v0=$(grep -cE 'create table inteligencia[.]conhecimento_comercial' \"$f\"); v1=$(grep -cE 'script.,[[:space:]]*.objecao.,[[:space:]]*.gatilho.,[[:space:]]*.padrao.,[[:space:]]*.regra' \"$f\"); v2=$(grep -cE 'indicio.,[[:space:]]*.hipotese.,[[:space:]]*.sustentado.,[[:space:]]*.contradito.,[[:space:]]*.retirado' \"$f\"); v3=$(grep -cE 'unique \\(chave, versao\\)' \"$f\"); v4=$(grep -cE 'causa ganha' \"$f\"); v5=$(grep -cE 'create or replace function inteligencia[.]fn_conhecimento_ler\\(p_cliente_id uuid, p_tese_id uuid default null, p_limite int default 20\\)' \"$f\"); v6=$(grep -cE 'public[.]clientes_teses' \"$f\"); v7=$(grep -cE ''geral'' \"$f\"); v8=$(grep -cE 'enable row level security' \"$f\"); v9=$(grep -cE 'create trigger' \"$f\"); v10=$(grep -cE 'security invoker' \"$f\"); [ \"$v0\" -ge 1 ] && [ \"$v1\" -ge 1 ] && [ \"$v2\" -ge 1 ] && [ \"$v3\" -ge 1 ] && [ \"$v4\" -ge 1 ] && [ \"$v5\" -ge 1 ] && [ \"$v6\" -ge 1 ] && [ \"$v7\" -ge 1 ] && [ \"$v8\" -ge 1 ] && [ \"$v9\" -ge 1 ] && [ \"$v10\" -ge 1 ] && echo SQL_CERTO || echo ST_tab${v0}_tipo${v1}_status${v2}_uniq${v3}_compl${v4}_fn${v5}_teses${v6}_escopo${v7}_rls${v8}_trg${v9}_invoker${v10}",
      "espera": "SQL_CERTO",
      "tipo": "alvo"
    },
    {
      "descricao": "CRM da Comarka e demais C0 fora",
      "cmd": "f='supabase/migrations/20261017161200_inteligencia_conhecimento_comercial.sql'; test -f \"$f\" || { echo SEM_ARQUIVO; exit 0; }; n=$(grep -ciE 'leads_crm|trafego_|ads_metadata|ads_performance|vw_atribuicao' \"$f\"); m=$(grep -ciE 'create or replace function inteligencia[.]' \"$f\"); [ \"$n\" = 0 ] && [ \"$m\" -ge 1 ] && echo SEM_C0 || echo ST_c0${n}_fn${m}",
      "espera": "SEM_C0",
      "tipo": "alvo"
    },
    {
      "descricao": "teste novo verde (test/inteligencia/conhecimento-comercial.test.ts)",
      "cmd": "test -f 'test/inteligencia/conhecimento-comercial.test.ts' && npx vitest run 'test/inteligencia/conhecimento-comercial.test.ts' >/dev/null 2>&1 && echo VERDE || echo VERMELHO",
      "espera": "VERDE",
      "tipo": "alvo"
    },
    {
      "descricao": "avaliador: aprendizado e versionado por chave, com evidencia e status do repertorio, compliance da OAB na constraint, e a leitura prioriza tese > nicho > geral do cliente. REPROVE se: tabela mutavel alem de ativo; sem constraint de compliance; leitura devolve contradito ou retirado; FK fisica para public.",
      "cmd": "true",
      "espera": "avaliador",
      "tipo": "avaliador"
    }
  ],
  "testes_conferidos": [
    {
      "teste": "test/c0-guard.test.ts",
      "motivo": "varre supabase/migrations: a migration nova so cria objetos em inteligencia e nao cita tabela C0 perto de DDL"
    },
    {
      "teste": "test/migrations-cabecalho-aplicada.test.ts",
      "motivo": "varre o cabecalho de toda migration: o cabecalho no molde da 5035 nao tem NAO APLICADA"
    },
    {
      "teste": "test/migrations-policy-idempotente.test.ts",
      "motivo": "varre policies das migrations: a migration nova nao cria policy"
    },
    {
      "teste": "test/migration-security-definer-anon.test.ts",
      "motivo": "varre funcoes das migrations: funcao nova revoga execute de anon"
    },
    {
      "teste": "test/sync-log-status.test.ts",
      "motivo": "le so a ultima migration que troca perf_sync_logs_status_check; a migration nova nao toca essa constraint"
    },
    {
      "teste": "test/inteligencia/escritor-forma.test.ts",
      "motivo": "so le a lista de supabase/migrations para achar uma versao existente; a migration nova nao muda o que ele prova"
    }
  ],
  "plano_item": "C4-05",
  "status": "done",
  "notas_status": "aprovado (tentativa 1): Tabela versionada (unique chave,versao), evidencia jsonb e status do glossario; constraint de compliance OAB case-insensitive; trigger só deixa mudar ativo e recusa delete; leitura pega a última versão ativa, exclui contradito/retirado e ordena tese>nicho>geral; sem FK para public; grants certos."
}
```
