# Ticket 830: Remove resolverUuid de src/lib/identidade/resolver.ts

> Fonte de máquina é o bloco ```json. A prosa é para humanos.

## Objetivo (prosa)

Frente F1d, último passo de `resolverUuid`: sem importador (tickets 828 e 829), a função e o `describe` dela em `test/identidade-resolver.test.ts` (7 casos, linha 79) saem. **Apagar esse describe é autorizado por este ticket**: os 3 caminhos estão cobertos nos testes novos dos dois tickets anteriores.

## Campos de máquina

```json
{
  "id": "830",
  "slug": "sai-identidade-remove",
  "lane": "produto",
  "perfil": "api",
  "objetivo": "ORCAMENTO DE DIFF: so remocao; teto de 200 linhas. Se passar do teto, pare e reporte. FONTE: docs/mapa/00-MAPA-GERAL.md (divida 6), docs/mapa/04-notion.md secao 3 (chave dupla; tabela dos resolvers) e docs/mapa/ref-auditoria-26set.md:57 e :201 (resolver unico e prioridade 1 da auditoria de 26/09). PASSO 1: grep -rn 'resolverUuid' src test scripts: so pode sobrar src/lib/identidade/resolver.ts (definicao :106 e a chamada interna em planejarIdentidade :228), test/identidade-resolver.test.ts, scripts/dados/370-identidade.ts (import :26 e reexport :290), scripts/dados/685-dono-dry-run.ts (comentario :10, import :25, chamada :73) e test/dono-dry-run.test.ts (titulo do it :54); sobrou outro, PARE e descreva. Por que scripts/ entra: test/identidade-resolver.test.ts importa o 370 e test/dono-dry-run.test.ts importa o 685, entao o tsc confere os dois scripts (remover a funcao sem mexer neles leva o tsc de 3 a 5). FAZER: (1) src/lib/identidade/resolver.ts: resolverUuid deixa de ser exportada e de existir com esse nome; a mesma logica (cliente_id existente, mirror via notion_id, casarPorNome) vira uma funcao PRIVADA (sem export) com nome que NAO contenha a substring resolverUuid (ex.: identificarReceita), e planejarIdentidade passa a chamar ela; comentarios que citam resolverUuid passam a citar o nome novo; as demais exportacoes ficam iguais. (1b) scripts/dados/370-identidade.ts: tirar resolverUuid do import e do reexport da linha 290 (que fica `export { construirIndicesClientes };`); nada mais muda. (1c) scripts/dados/685-dono-dry-run.ts: tirar resolverUuid do import, importar casarPorNome de ../../src/lib/identidade/resolver, e na linha 73 trocar a chamada pela mesma ordem que src/app/api/equipe/distribuir/route.ts usa desde o 829, em memoria: `const porId = r.cliente_id && indices.porId.has(r.cliente_id) ? r.cliente_id : null; const viaMirror = r.notion_id ? (mirrorPorNotionId.get(r.notion_id)?.cliente_id ?? null) : null; const uuid = porId ?? (viaMirror && indices.porId.has(viaMirror) ? viaMirror : null) ?? casarPorNome(r.nome, indices);`; o comentario do cabecalho (:10) diz 'pela ordem cliente_id, espelho, nome' sem citar resolverUuid; montarRelatorioDono continua com a mesma assinatura e a mesma saida. (1d) test/dono-dry-run.test.ts: so o titulo do it da linha 54 muda para 'alcance e sugestao seguem a ordem cliente_id, espelho e nome, inclusive por nome'; nenhuma assercao muda. (2) remover de test/identidade-resolver.test.ts o describe 'resolverUuid — ordem cliente_id → mirror → nome' inteiro (7 it, AUTORIZADO por este ticket); os outros describes ficam intactos. (3) NOVO test/sai-identidade-removido.test.ts: resolverUuid nao existe em src e as outras exportacoes de src/lib/identidade/resolver.ts seguem (normalizeClienteNome, planejarIdentidade, casarPorNome). FORA DE ESCOPO: qualquer arquivo fora da allowlist (inclusive src/app/api/equipe/distribuir/route.ts e src/lib/clientes/resolver-cliente.ts), migration. REGRAS: zona C0 (clientes_receita, leads_crm, leads_crm_historico, ads_metadata, ads_performance, fn_mql_sql_by_month, prefixos trafego_* e vw_*) e leitura pura: nada de escrita, DDL, grant, RLS ou trigger nelas; zero migration e zero .sql; chave oficial do cliente e cliente_id (uuid), notion_id e so apelido aceito em URL legada (decisao-chave-oficial-cliente-id, 26/09); falha de leitura nunca vira zero, lista vazia ou verde: erro aparece como erro (500 na rota, aviso na tela); dado ausente aparece como 'sem base' com o motivo; nenhum jargao de banco em texto de tela (nome de tabela, coluna ou operador); nenhum travessao (U+2014) em texto de tela nem em string de copy (guarda travessao-mudo); numeros de tela em font-mono; Set e Map so com Array.from (tsc sem downlevelIteration); nenhum .json() literal novo em src (cliente: fetchJson de @/lib/fetch-json; rota: lerCorpoJson de @/lib/fetch-json, nunca req.json()); getSession e server-only, nunca em arquivo 'use client'; supabase, fetch e getSession sempre mockados nos testes (vi.mock), nunca banco real; fixture de uuid RFC-4122 (00000000-0000-4000-8000-000000000000 ou crypto.randomUUID()); testes sem JSX (React.createElement + renderToStaticMarkup ou readFileSync da fonte; o projeto nao tem jsdom nem @testing-library); teste ancora em texto visivel, data-testid ou nome exportado, nunca em classe de estilo; nunca toEqual numa lista inteira. TESTES EXISTENTES da allowlist: se a mudanca quebrar uma assercao, RECALCULE o valor sob a regra nova com comentario acima citando o ticket e de onde veio o numero; trocar o alvo de um vi.mock do resolver antigo para @/lib/clientes/resolver-cliente nao e afrouxar; PROIBIDO remover assercao, trocar toBe/toEqual/toMatch por toBeDefined/toBeTruthy, usar .skip/.only/.todo, apagar it( ou o arquivo (excecao unica deste ticket: o describe de resolverUuid em test/identidade-resolver.test.ts). GUARDAS GLOBAIS (fora da allowlist, nao edite): test/fetch-json-teto.test.ts, test/consistencia-contagens.test.ts, test/bloco-vazio-linha.test.ts, test/abas-montadas.test.ts, test/cartao-topo-perfil.test.tsx, test/travessao-mudo.test.ts, test/c0-guard.test.ts. Se um teste FORA da allowlist quebrar, PARE e descreva. Motor do orquestrador (scripts/orquestrador/, docs/orquestrador/) intocado.",
  "cria_novo": [
    "test/sai-identidade-removido.test.ts"
  ],
  "pathspec_allowlist": [
    "src/lib/identidade/resolver.ts",
    "test/identidade-resolver.test.ts",
    "test/sai-identidade-removido.test.ts",
    "scripts/dados/370-identidade.ts",
    "scripts/dados/685-dono-dry-run.ts",
    "test/dono-dry-run.test.ts"
  ],
  "dependencias": [
    "828",
    "829",
    "800",
    "826",
    "801",
    "802",
    "803",
    "804",
    "805",
    "806",
    "807",
    "808",
    "809",
    "810",
    "811",
    "812",
    "813",
    "814",
    "815",
    "816",
    "817",
    "818",
    "819",
    "820",
    "821",
    "822",
    "823",
    "824",
    "825",
    "humano:decisao-chave-oficial-cliente-id"
  ],
  "prioridade": 44,
  "recon_esperado": [
    {
      "descricao": "src/lib/identidade/resolver.ts existe na arvore do loop",
      "cmd": "test -e 'src/lib/identidade/resolver.ts' && echo EXISTE || echo AUSENTE",
      "espera": "EXISTE"
    },
    {
      "descricao": "test/identidade-resolver.test.ts existe na arvore do loop",
      "cmd": "test -e 'test/identidade-resolver.test.ts' && echo EXISTE || echo AUSENTE",
      "espera": "EXISTE"
    },
    {
      "descricao": "test/sai-identidade-removido.test.ts ainda nao existe",
      "cmd": "test -e 'test/sai-identidade-removido.test.ts' && echo EXISTE || echo AUSENTE",
      "espera": "AUSENTE"
    },
    {
      "descricao": "it( em test/identidade-resolver.test.ts hoje",
      "cmd": "grep -c 'it(' test/identidade-resolver.test.ts",
      "espera": "28"
    },
    {
      "descricao": "os 2 scripts de scripts/dados citam resolverUuid 5 vezes no total (370: import e reexport; 685: comentario, import e chamada)",
      "cmd": "n=$(cat 'scripts/dados/370-identidade.ts' 'scripts/dados/685-dono-dry-run.ts' | grep -c 'resolverUuid'); [ \"$n\" = 5 ] && echo CINCO_NOS_SCRIPTS || echo ST_$n",
      "espera": "CINCO_NOS_SCRIPTS"
    },
    {
      "descricao": "fora de resolver.ts, identidade-resolver.test.ts, dono-dry-run.test.ts e os 2 scripts, ninguem em src, test ou scripts cita resolverUuid",
      "cmd": "n=$(grep -rl 'resolverUuid' src test scripts | grep -vFx -e 'src/lib/identidade/resolver.ts' -e 'test/identidade-resolver.test.ts' -e 'test/dono-dry-run.test.ts' -e 'scripts/dados/370-identidade.ts' -e 'scripts/dados/685-dono-dry-run.ts' | wc -l | tr -d ' '); [ \"$n\" = 0 ] && echo SO_OS_CINCO || echo SOBRA_$n",
      "espera": "SO_OS_CINCO"
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
      "descricao": "nenhum .sql novo (zero DDL)",
      "cmd": "b=\"$(git merge-base HEAD staging-auto)\"; n=$(git diff --name-only \"$b\" HEAD | grep -c '[.]sql$'); [ \"$n\" = 0 ] && echo SEM_SQL || echo SQL_$n",
      "espera": "SEM_SQL",
      "tipo": "guarda"
    },
    {
      "descricao": "guardas globais seguem verdes",
      "cmd": "npx vitest run test/fetch-json-teto.test.ts test/consistencia-contagens.test.ts test/bloco-vazio-linha.test.ts test/abas-montadas.test.ts test/cartao-topo-perfil.test.tsx test/travessao-mudo.test.ts test/c0-guard.test.ts >/dev/null 2>&1 && echo VERDE || echo VERMELHO",
      "espera": "VERDE",
      "tipo": "guarda"
    },
    {
      "descricao": "nenhuma guarda global foi editada (diff contra o merge-base com staging-auto)",
      "cmd": "n=$(git diff --name-only \"$(git merge-base HEAD staging-auto)\" -- test/fetch-json-teto.test.ts test/consistencia-contagens.test.ts test/bloco-vazio-linha.test.ts test/abas-montadas.test.ts test/cartao-topo-perfil.test.tsx test/travessao-mudo.test.ts test/c0-guard.test.ts | wc -l | tr -d ' '); [ \"$n\" = 0 ] && echo INTOCADAS || echo EDITOU_$n",
      "espera": "INTOCADAS",
      "tipo": "guarda"
    },
    {
      "descricao": "nenhuma linha nova com .json() nos arquivos de src do ticket (teto do 295)",
      "cmd": "b=\"$(git merge-base HEAD staging-auto)\"; n=$(git diff \"$b\" HEAD -- 'src/lib/identidade/resolver.ts' | grep -cE '^[+][^+].*[.]json[(][)]'); [ \"$n\" = 0 ] && echo ZERO_JSON_NOVO || echo JSON_NOVO_$n",
      "espera": "ZERO_JSON_NOVO",
      "tipo": "guarda"
    },
    {
      "descricao": "arquivos fora do escopo intocados",
      "cmd": "n=$(git diff --name-only \"$(git merge-base HEAD staging-auto)\" -- 'src/lib/jobs/sync-clientes.ts' 'src/app/api/equipe/distribuir/route.ts' 'src/lib/clientes/resolver-cliente.ts' | wc -l | tr -d ' '); [ \"$n\" = 0 ] && echo INTOCADOS || echo TOCOU_$n",
      "espera": "INTOCADOS",
      "tipo": "guarda"
    },
    {
      "descricao": "so arquivos da allowlist foram tocados",
      "cmd": "b=\"$(git merge-base HEAD staging-auto)\"; r=SO_ALLOWLIST; for f in $(git diff --name-only \"$b\" HEAD); do ok=0; for p in 'src/lib/identidade/resolver.ts' 'test/identidade-resolver.test.ts' 'test/sai-identidade-removido.test.ts' 'scripts/dados/370-identidade.ts' 'scripts/dados/685-dono-dry-run.ts' 'test/dono-dry-run.test.ts'; do if [ \"$f\" = \"$p\" ]; then ok=1; fi; done; [ $ok = 1 ] || r=FORA_$f; done; echo $r",
      "espera": "SO_ALLOWLIST",
      "tipo": "guarda"
    },
    {
      "descricao": "diff dentro do orcamento (<= 200 linhas somando adicoes e remocoes)",
      "cmd": "b=\"$(git merge-base HEAD staging-auto)\"; t=$(git diff --numstat \"$b\" HEAD | awk '{s+=$1+$2} END {print s+0}'); [ \"$t\" -le 200 ] && echo NO_TETO || echo ESTOUROU_$t",
      "espera": "NO_TETO",
      "tipo": "guarda"
    },
    {
      "descricao": "resolverUuid nao existe mais em src",
      "cmd": "n=$(grep -rn 'resolverUuid' src | grep -vE ':[0-9]+:\\s*(//|\\*|/\\*)' | cut -d: -f1 | sort -u | wc -l | tr -d ' '); [ \"$n\" = 0 ] && echo REMOVIDO || echo SOBRA_$n",
      "espera": "REMOVIDO"
    },
    {
      "descricao": "anti-afrouxamento: test/identidade-resolver.test.ts perdeu exatamente os 7 it do describe de resolverUuid e nada mais",
      "cmd": "b=\"$(git merge-base HEAD staging-auto)\"; a=$(git show \"$b:test/identidade-resolver.test.ts\" | grep -c 'it('); n=$(grep -c 'it(' test/identidade-resolver.test.ts); [ \"$n\" = $((a-7)) ] && echo SO_O_DESCRIBE || echo IT_${a}_${n}",
      "espera": "SO_O_DESCRIBE"
    },
    {
      "descricao": "teste novo verde (test/sai-identidade-removido.test.ts)",
      "cmd": "test -f test/sai-identidade-removido.test.ts && npx vitest run test/sai-identidade-removido.test.ts >/dev/null 2>&1 && echo VERDE || echo VERMELHO",
      "espera": "VERDE"
    },
    {
      "descricao": "resolverUuid sumiu tambem de scripts/ e de test/ (inclusive titulo de it)",
      "cmd": "n=$(grep -rl 'resolverUuid' scripts test | wc -l | tr -d ' '); [ \"$n\" = 0 ] && echo FORA_DE_SRC_LIMPO || echo SOBRA_$n",
      "espera": "FORA_DE_SRC_LIMPO",
      "tipo": "alvo"
    },
    {
      "descricao": "anti-afrouxamento em test/dono-dry-run.test.ts: mesmo numero de it( e de expect(, so o titulo do it de resolverUuid mudou, nenhum skip ou only",
      "cmd": "b=\"$(git merge-base HEAD staging-auto)\"; f=test/dono-dry-run.test.ts; ia=$(git show \"$b:$f\" | grep -c 'it('); ea=$(git show \"$b:$f\" | grep -c 'expect('); i=$(grep -c 'it(' \"$f\"); e=$(grep -c 'expect(' \"$f\"); rem=$(git diff \"$b\" HEAD -- \"$f\" | grep -cE '^-[^-]'); sk=$(grep -cE '\\.(skip|only|todo)\\(' \"$f\"); [ \"$i\" = \"$ia\" ] && [ \"$e\" = \"$ea\" ] && [ \"$rem\" -le 1 ] && [ \"$sk\" = 0 ] && echo DONO_INTACTO || echo ST_${ia}_${i}_${ea}_${e}_${rem}_${sk}",
      "espera": "DONO_INTACTO",
      "tipo": "guarda"
    },
    {
      "descricao": "testes que importam os 2 scripts seguem verdes (test/dono-dry-run.test.ts e test/identidade-resolver.test.ts)",
      "cmd": "npx vitest run test/dono-dry-run.test.ts test/identidade-resolver.test.ts >/dev/null 2>&1 && echo VERDE || echo VERMELHO",
      "espera": "VERDE",
      "tipo": "guarda"
    },
    {
      "descricao": "avaliador: so resolverUuid e o describe dela sairam; resto da identidade igual. REPROVE se: outro describe mudou; outra exportacao sumiu; a ordem cliente_id, mirror, nome mudou em planejarIdentidade ou no 685; o 685 passou a importar de @/lib/clientes ou a fazer leitura nova.",
      "cmd": "",
      "espera": "avaliador"
    }
  ],
  "status": "pendente",
  "notas_status": "",
  "testes_conferidos": [
    {
      "teste": "test/alerta-onboarding.test.ts",
      "motivo": "importa src/lib/identidade/resolver.ts so transitivamente e nao cita resolverUuid (grep em 03/10); a remocao nao muda o que ele afirma; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/backfill-cliente-id.test.ts",
      "motivo": "migrado pelo(s) ticket(s) 828 (dependencia deste): na hora deste ticket ja nao importa nem mocka src/lib/identidade/resolver.ts"
    },
    {
      "teste": "test/distribuir-carteira-api.test.ts",
      "motivo": "migrado pelo(s) ticket(s) 829 (dependencia deste): na hora deste ticket ja nao importa nem mocka src/lib/identidade/resolver.ts"
    },
    {
      "teste": "test/hoje-fontes.test.ts",
      "motivo": "importa src/lib/identidade/resolver.ts so transitivamente e nao cita resolverUuid (grep em 03/10); a remocao nao muda o que ele afirma; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/meu-dia-textos.test.ts",
      "motivo": "importa src/lib/identidade/resolver.ts so transitivamente e nao cita resolverUuid (grep em 03/10); a remocao nao muda o que ele afirma; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/onboarding-match.test.ts",
      "motivo": "migrado pelo(s) ticket(s) 828 (dependencia deste): na hora deste ticket ja nao importa nem mocka src/lib/identidade/resolver.ts"
    },
    {
      "teste": "test/onboarding-sla-meu-dia-motor.test.ts",
      "motivo": "importa src/lib/identidade/resolver.ts so transitivamente e nao cita resolverUuid (grep em 03/10); a remocao nao muda o que ele afirma; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/retencao-rota.test.ts",
      "motivo": "importa src/lib/identidade/resolver.ts so transitivamente e nao cita resolverUuid (grep em 03/10); a remocao nao muda o que ele afirma; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/sync-clientes-job.test.ts",
      "motivo": "migrado pelo(s) ticket(s) 828 (dependencia deste): na hora deste ticket ja nao importa nem mocka src/lib/identidade/resolver.ts"
    }
  ]
}
```
