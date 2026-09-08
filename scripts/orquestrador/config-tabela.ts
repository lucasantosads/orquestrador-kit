/**
 * config-tabela.ts — a tabela `de → para` do `000-config.json` schema 1 → 2.
 *
 * ESCRITA À MÃO, a partir do PASSO 0 da etapa 5: `jq` nos configs reais do
 * actus-saas e do comarka-operacional (só leitura, 2026-09-08) confrontado com
 * `config-chaves.ts`, que é a lista do que o motor deste kit EFETIVAMENTE lê.
 * Não é derivada de heurística e não pode ser: renomear chave de config por
 * semelhança de nome é como se troca a fronteira do enforcement por engano.
 *
 * ─── AS TRÊS REGRAS ────────────────────────────────────────────────────────
 *
 * 1. RENOMEAR É COPIAR. `de` continua onde está; `para` é ACRESCENTADO. Nenhuma
 *    migração deste kit apaga dado, e config é o arquivo onde apagar por engano
 *    custa mais caro: uma chave a menos vira `jq -r` devolvendo a string "null",
 *    que o motor usa como caminho, branch ou número.
 * 2. CHAVE SEM CORRESPONDENTE FICA, INTOCADA, e vira linha do relatório —
 *    "mantida, o motor não lê". Chave que o motor não lê não faz mal nenhum
 *    parada ali; apagá-la faz.
 * 3. CHAVE PRÓPRIA DE UM REPO fica e vira item NOMEADO do relatório, para a K11
 *    decidir o destino (absorver como config, virar peça, ou morrer). São cinco,
 *    todas achadas no PASSO 0 e nenhuma inventada aqui.
 *
 * O que este arquivo NÃO faz: preencher decisão local. Onde a v2 pede uma
 * decisão que a v1 nunca tomou (o teto de orçamento, o label do launchd, os
 * paths de alto risco), a saída é um PLACEHOLDER `<...>` — que `orq config`
 * recusa, alto, na cara de quem vai rodar o loop. Chutar um teto de gasto é
 * pior que não ter teto: o número errado passa despercebido.
 */

/** Uma chave que o motor lê por OUTRO nome. `de` sobrevive; `para` nasce. */
export interface Renome {
  de: string
  para: string
  /** Por que são a mesma coisa — e a linha do motor que prova. */
  porque: string
  /**
   * Caminho de OUTRA chave que precisa existir no config para o renome valer.
   * Existe por um caso só, e ele é a razão de ser do campo: `migrations_dir`
   * está em TODO repo (é como o motor classifica `.sql` como artefato inerte),
   * mas o destino `migrations.dir` LIGA a regra B. Copiar de arrasto ligaria a
   * regra em quem nunca a pediu. Quem pede a regra é a FAIXA — e é ela a
   * condição. Ausente = o renome vale sempre, que é o caso dos outros quatro.
   */
  so_quando?: string
}

/**
 * De onde sai o valor de uma chave que a v1 não tinha:
 *   `politica`     — o valor é do MOTOR, não do repo. Vem preenchido.
 *   `local`        — é decisão do dono. Vem como placeholder `<...>`.
 *   `derivada`     — sai do próprio config (ex.: a ordem dos gates).
 */
export type Procedencia = 'politica' | 'local' | 'derivada'

export interface Nova {
  chave: string
  procedencia: Procedencia
  /** O valor, para `politica`; o texto do placeholder, para `local`. */
  valor: unknown
  porque: string
}

export interface PropriaDeRepo {
  chave: string
  repo: string
  porque: string
}

// ─── 1. renomes ──────────────────────────────────────────────────────────────
export const RENOMES: Renome[] = [
  {
    de: 'supabase_project_id',
    para: 'ambiente_id',
    porque:
      'o preflight de identidade extrai o ref do SUPABASE_URL do .env e compara com `ambiente_id` (lib.sh:68, executor.sh:111-114). No Comarka esse valor existe com o nome `supabase_project_id` ("ogfnojbbvumujzfklkhh", um ref de projeto Supabase). Sem o rename, `ambiente_id` vem "null" e o preflight compara o ref real com a string "null" — divergência que ABORTA o run inteiro, corretamente e pelo motivo errado.',
  },
  {
    de: 'avaliador_model',
    para: 'modelos.juiz_alto',
    porque:
      'juiz.ts:76 lê `modelos.juiz_alto`; a v1 tinha UM juiz só, em `avaliador_model` (opus nos dois repos). O motor continua lendo `avaliador_model` em outros pontos, então ele FICA.',
  },
  {
    de: 'avaliador_model',
    para: 'modelos.juiz_baixo',
    porque:
      'juiz.ts:76 lê os DOIS níveis. A v1 não tinha nível baixo: julgava tudo com o mesmo modelo. Copiar o `avaliador_model` para os dois preserva o comportamento EXATO de hoje. Baratear o juiz de risco baixo é uma decisão de custo (o CI escolheu sonnet), e decisão não é efeito colateral de migração — migração que economiza dinheiro sozinha é migração que muda o veredito de alguém sem avisar.',
  },
  // --- K11a-1: as chaves das regras B e D, com as DUAS origens ---------------
  // O nome do kit foi ESCOLHIDO (não inventado): `migrations.dir`/`migrations.faixa`
  // agrupam o que o Actus tem solto em `migrations_dir` + `migrations_faixa_loop`,
  // e `colunas_congeladas` é o `no_write_columns` dele. Onde o nome já era o
  // mesmo nos dois repos — `zona_proibida.no_write_tables`, que o Comarka tem
  // sob `c0_intocavel` — não há renome nenhum: a regra C lê a chave existente.
  {
    de: 'migrations_faixa_loop',
    para: 'migrations.faixa',
    porque:
      'enforcement-core.ts:273 (violacoesDeMigration) lê esta chave: é a faixa do loop no Actus ("0250-0299"). O motor aceita a string e a tupla [min,max] justamente para que este renome seja CÓPIA de valor, e não transformação — transformar valor numa migração é o começo de traduzir errado em silêncio. O par desta chave é `migrations.dir`, e ele vem do renome ABAIXO — que só dispara quando ESTA chave existe (`so_quando`). Até a K11a-4d o `dir` ficava de fora da tabela inteiramente, e o `orq config` cobrava "faixa sem dir" (config-cli.ts:152); o `--dry-run` sobre o Actus mostrou o que isso produzia na prática — faixa declarada valendo para arquivo nenhum. A decisão que motivava aquilo continua de pé, agora dentro da condição: renomear `migrations_dir` de arrasto ligaria a regra B em TODO repo que tem migration (o CI inclusive, que nunca pediu faixa nenhuma).',
  },
  {
    de: 'zona_proibida.no_write_columns',
    para: 'zona_proibida.colunas_congeladas',
    porque:
      'enforcement-core.ts:426 (violacoesDeColuna). O nome novo diz o que a lista É (colunas congeladas) e abre espaço para a irmã `colunas_sombra`, que não existe em repo nenhum hoje e é a saída declarada da família (etapa_v2_*, ledger 0171 do Actus). O `no_write_columns` FICA.',
  },
  // --- K11a-4d: o dir da regra B, e SÓ para quem declarou a faixa -----------
  {
    de: 'migrations_dir',
    para: 'migrations.dir',
    so_quando: 'migrations_faixa_loop',
    porque:
      'enforcement-core.ts:273 (violacoesDeMigration) só cobra faixa dos `.sql` sob `migrations.dir`. O `--dry-run` do `instalar.sh` sobre o actus-saas (etapa 6) mostrou o buraco: a faixa migrava sozinha, o dir ficava para trás, e a regra B não mordia arquivo nenhum — com o config DIZENDO que a faixa está protegida. A K11a-1 tinha deixado este renome de fora para não ligar a regra B em todo repo que tem migration, e a condição `so_quando: migrations_faixa_loop` guarda essa decisão inteira: quem pede a regra é a FAIXA, o dir só diz onde ela vale. O CI declara `migrations_dir` e NÃO declara faixa, então continua sem `migrations` e com a regra B desligada. ATENÇÃO ao aplicar: com a regra B ligada, `.sql` fora do dir reprova por `migration_fora_do_dir` — inclusive testes SQL, que no Actus moram em `supabase/tests/`. Declare `enforcement.testes_sql.glob` (`"supabase/tests/**"`) na MESMA revisão, ou o loop deixa de conseguir escrever teste de banco.',
  },
  // --- K11a-4: a chave da regra E ------------------------------------------
  {
    de: 'zona_proibida.no_write_prefixes',
    para: 'zona_proibida.prefixos_sem_ddl',
    porque:
      'enforcement-core.ts:460 (violacoesDePrefixo). O nome novo diz o RECORTE da regra — prefixos que não recebem DDL —, e o recorte importa: escrever DADO num objeto de nome proibido continua sendo assunto de `no_write_tables`/`colunas_congeladas`, não desta lista. Diferente dos dois renomes acima, este NÃO é chave só do Actus: o CI declara `no_write_prefixes: ["supabase_", "auth_"]` e o template também traz `vw_`, então migrar o config DELES LIGA a regra E com os prefixos que eles próprios escreveram. Isso é mudança de veredito, e está dita aqui, na linha do relatório do `--dry-run` e num caso de teste (`orquestrador-enforcement-actus.test.ts`) em vez de escondida: a regra 3 (`no_write_tables: "TODAS"`) NÃO cobre CREATE/ALTER/DROP, então o `_no_write_prefixes` do CI ("redundante dado no_write_tables=TODAS") descreve uma redundância que não existe. Quem revisa o proposto tira a chave se não a quiser; o `no_write_prefixes` FICA de qualquer forma.',
  },
  // --- K11a-4: a chave da regra F, e ela MUDA DE PAI ------------------------
  {
    de: 'zona_proibida.padroes_proibidos_no_diff',
    para: 'enforcement.padroes_proibidos_no_diff',
    porque:
      'enforcement-core.ts:533 (violacoesDePadrao). O destino não é `zona_proibida` de propósito: `zona_proibida` é a fronteira de ESCRITA (que tabela, que coluna, que caminho, que prefixo), e F julga o TEXTO do diff — o mesmo padrão pega SQL destrutivo dentro de um arquivo que a allowlist permite. Guardar as duas coisas na mesma chave faz a fronteira parecer uma lista de regexes. O VALOR é copiado sem tocar: as três regexes do Actus (reancoragem de tenant_id em tabela particionada, session_replication_role, DELETE físico) viajam byte a byte, incluindo o `(?:(?!\\bwhere\\b)[^;])*` que o ticket 615 de lá mediu — reescrever uma regex numa migração é reescrever a proibição. O `zona_proibida.padroes_proibidos_no_diff` FICA.',
  },
]

/**
 * NÃO estão na tabela, e é decisão: `executor_model → modelos.executor` e
 * `retry_final_model → modelos.retry_final`. Os dois PARECEM simétricos aos de
 * cima, mas o motor lê os aliases v1 direto (executor.sh:168, decisao.ts:292) e
 * NÃO lê `modelos.executor` nem `modelos.retry_final` — eles não estão em
 * `config-chaves.ts`. Copiar dado para uma chave que ninguém lê é mover dado
 * para o vazio, e depois manter dois lugares em sincronia por educação.
 * Completar o mapa `modelos` inteiro (classificador, planejador, juiz_ticket)
 * é decisão de quem ligar planejador e sentinela, não desta migração. O teste
 * `toda chave "para" de um renome é lida pelo motor` tranca isso.
 */

/**
 * Renome de VALOR, dentro de `gates[]`. Não é chave: é o vocabulário de `tipo`.
 */
export const GATE_TIPOS: Array<{ de: string; para: string; porque: string }> = [
  {
    de: 'tsc_baseline',
    para: 'baseline',
    porque:
      'gates.ts:151 só honra `tipo === "baseline"` para comparar contra o baseline de erros herdados. O Comarka escreve `tsc_baseline` e declara `baseline: 3` — com o nome que o motor do kit não conhece, o gate cai no caminho de `exit_code` puro, os 3 erros herdados em `qualificacao*` reprovam TODO ticket, para sempre, e o motivo não aparece em lugar nenhum. A peça G acrescentou `direcao`, `contagem_regex` e `preparo` a esse tipo; nenhum dos três é renomeado a partir do Comarka, porque nenhum existe lá: `direcao` cai no padrão `max`, e o `preparo` (o `rm -rf .next tsconfig.tsbuildinfo` que o `sanear_tsc` de lá faz antes de todo tsc) é DECISÃO de quem migra — migração que inventa comando para rodar é migração que executa o que ninguém escreveu.',
  },
]

// ─── 2. chaves novas do schema 2 ─────────────────────────────────────────────
// Cada uma é obrigatória em `config-chaves.ts` (ou parte de um objeto que é), e
// nenhuma existe nos configs v1 do Actus e do Comarka. A `procedencia` diz quem
// decide: o motor, o dono, ou o próprio arquivo.
export const NOVAS: Nova[] = [
  // --- política do motor: o valor não é do repo -------------------------------
  {
    chave: 'pausar_file',
    procedencia: 'politica',
    valor: 'docs/fila/PAUSAR',
    porque: 'o kill switch por contrato (CONTRATO.md §7); é o mesmo caminho no template e no CI.',
  },
  {
    chave: 'decisoes_file',
    procedencia: 'politica',
    valor: 'docs/fila/decisoes-pendentes.md',
    porque: 'lib.sh:723; caminho de contrato, igual no template e no CI.',
  },
  {
    chave: 'orcamento.custo_file',
    procedencia: 'politica',
    valor: 'docs/fila/runs/custo.json',
    porque: 'o ledger (lib.sh:845), dentro do `runs/` que já é efêmero por contrato.',
  },
  {
    chave: 'executor.trailer_commit',
    procedencia: 'politica',
    valor: 'Orq-Ticket',
    porque:
      'executor.sh:388 e local-loop.sh:95. É o trailer que liga o merge commit ao ticket; a quarentena da sentinela e o relatório leem o GIT por ele, não o log.',
  },
  {
    chave: '_execucao_dos_gates.interrupcao',
    procedencia: 'politica',
    valor: 'NAO_VALE_PARCIALMENTE',
    porque:
      'gates.ts:177. Gate interrompido no meio não conta como parcialmente aprovado — é o único valor que o motor trata, e o outro seria aprovar trabalho que ninguém verificou.',
  },
  {
    chave: 'politica_adiamento.causas_que_adiam',
    procedencia: 'politica',
    valor: [
      'erro de conexão',
      'sessão expirada',
      'rate limit',
      'quota estourada',
      'timeout de claude_timeout_secs',
      'gate interrompido no meio',
      'veredito do juiz ilegível',
    ],
    porque:
      'decisao.ts:113. As SETE causas são cobradas por teste do motor (test-lib-config.sh:50,58,61): não são preferência, são a lista que o motor espera. Sem ela nada é adiável e falha de infra vira reprovação, que consome retry e no limite bloqueia um ticket que nunca foi julgado pelo mérito.',
  },
  {
    chave: 'politica_retry.por_causa',
    procedencia: 'politica',
    valor: {
      diff_cap: {
        modelo: 'MANTER',
        acao: 'estreitar o escopo no prompt de retry (fatiar o ticket, reduzir pathspec_allowlist)',
      },
      enforcement: {
        modelo: 'MANTER',
        acao: 'estreitar o escopo no prompt de retry (respeitar a pathspec_allowlist, sair da zona proibida)',
      },
      criterio_qualidade: {
        modelo: 'ESCALAR',
        acao: 'subir para retry_final_model e repetir com o mesmo escopo',
      },
    },
    porque:
      'decisao.ts:277, e `decisao.ts` REJEITA a config que mandar o contrário. Escalar modelo por falha de TAMANHO (diff_cap) ou de FRONTEIRA (enforcement) é gasto sem hipótese: um modelo mais forte escreve o mesmo excesso e cruza a mesma fronteira, só mais caro.',
  },
  {
    chave: 'gate_ticket.cmd_prefixos_permitidos',
    procedencia: 'politica',
    valor: [
      'npx vitest run',
      'npx jest',
      'npx tsc',
      'npm run test',
      'npm run typecheck',
      'npm run lint',
      'npm run build',
      'node scripts/',
      'test -f',
      'test -s',
      'grep -',
      'jq ',
    ],
    porque:
      'gate-ticket.ts:275, e lista VAZIA reprova todo critério com `cmd`. A lista sai do template; ela é conservadora de propósito — acrescentar prefixo é decisão barata e reversível, e um prefixo a mais aqui é superfície de execução que ninguém pediu.',
  },
  {
    chave: 'gate_ticket.proibido_no_cmd',
    procedencia: 'politica',
    valor: ['$(', '`', 'sh -c', 'eval', 'sudo', 'rm ', 'curl http', 'curl https', 'wget', '> ', '>>'],
    porque: 'gate-ticket.ts:281; a lista do template, que é o que separa critério executável de comando arbitrário.',
  },
  {
    chave: 'juiz.palavras_alto_risco',
    procedencia: 'politica',
    valor: ['auth', 'login', 'senha', 'token', 'pagamento', 'billing', 'migration', 'schema', 'rls', 'permiss'],
    porque:
      'juiz.ts:67. São palavras de domínio, não do repo: nenhum projeto quer que uma mudança em autenticação seja julgada pelo modelo barato.',
  },
  {
    chave: 'proibicoes_absolutas.tools',
    procedencia: 'politica',
    valor: [
      'Bash(git push:*)',
      'Bash(git reset:*)',
      'Bash(psql:*)',
      'Bash(supabase:*)',
      'Bash(npx supabase:*)',
      'Bash(curl:*)',
      'Bash(rm:*)',
      'WebFetch',
      'WebSearch',
      'Bash(pnpm install:*)',
      'Bash(npm install:*)',
      'Bash(npm ci:*)',
    ],
    porque:
      'executor.sh:tools_proibidas e perfil.ts:190 (PISO_TOOLS_SEMENTE). É o PISO de `--disallowedTools` (T17): a allowlist é derivada dos `cmd` do ticket, que são DADO escrito por gerador, e dado não pode ser a última palavra sobre permissão. As nove primeiras são a DISALLOWED_TOOLS do comarka-operacional; `pnpm install`/`npm install`/`npm ci` entram porque o node_modules da worktree é LINKADO para o store do checkout principal — um install lá purga o store do repo de verdade. ATENÇÃO: nos três repos do disco `proibicoes_absolutas` é um ARRAY de prosa, e a migração RECUSA escrever dentro dele (nada é apagado); ligar o piso é passo humano — mover a prosa para `.regras` e acrescentar `.tools`.',
  },
  {
    chave: 'claude_max_turns',
    procedencia: 'politica',
    valor: 80,
    porque:
      'executor.sh:784. 80 é o valor do CI, medido em produção. É teto de segurança contra sessão que não termina, não uma alavanca de qualidade.',
  },

  // --- derivadas do próprio config -------------------------------------------
  {
    chave: '_execucao_dos_gates.ordem_obrigatoria',
    procedencia: 'derivada',
    valor: null, //  preenchida com os `gates[].nome`, na ordem do arquivo
    porque:
      'gates.ts:176 e executor.sh:382. `gates.ts` ERRA se a ordem divergir da lista de gates, então derivá-la do próprio `gates[]` é a única forma de ela nascer certa. Rodar fora de ordem invalida o resultado mesmo que todos os comandos saiam verdes.',
  },

  // --- decisão local: placeholder, e `orq config` recusa até alguém decidir ---
  {
    chave: 'branch_protegida',
    procedencia: 'local',
    valor: '<a branch que o loop NUNCA empurra — ex.: main>',
    porque:
      'local-loop.sh:28 e executor.sh:130. É a branch que o loop está proibido de tocar, e chutar "main" num repo que usa outro nome é escrever a proibição no lugar errado — que é o mesmo que não ter proibição.',
  },
  {
    chave: 'worktrees_prefixo',
    procedencia: 'local',
    valor: '<prefixo curto das worktrees deste repo — ex.: ci-, fx-, os->',
    porque:
      'lib.sh:498 e decisao.ts:363. Prefixo diferente por repo é o que impede dois repos de colidirem na mesma worktree; um default igual para todos anularia a única coisa que a chave faz.',
  },
  {
    chave: 'orcamento.usd_dia',
    procedencia: 'local',
    valor: '<teto de USD por dia, MEDIDO nas duas primeiras semanas>',
    porque:
      'lib.sh:913. Orçamento é GATE, não relatório: estourou = adiado. Um teto chutado passa despercebido justamente porque nunca dispara, e aí não é teto.',
  },
  {
    chave: 'orcamento.tokens_dia',
    procedencia: 'local',
    valor: '<teto de tokens por dia, medido>',
    porque: 'lib.sh:914; mesmo motivo do teto em USD — medido, nunca chutado.',
  },
  {
    chave: 'orcamento.usd_ticket',
    procedencia: 'local',
    valor: '<teto de USD por ticket, medido>',
    porque: 'lib.sh:915; mesmo motivo do teto diário — medido, nunca chutado.',
  },
  {
    chave: 'orcamento.campos_usage.custo_usd',
    procedencia: 'local',
    valor: '<nome do campo de custo no JSON de `claude -p --output-format json`, confirmado no pré-voo>',
    porque:
      'lib.sh:859. É o nome do campo NO ENVELOPE do agente, e ele muda de versão para versão do Claude Code — chutar aqui faz o ledger somar zero para sempre, silenciosamente, e o gate de orçamento nunca disparar.',
  },
  {
    chave: 'orcamento.campos_usage.tokens_in',
    procedencia: 'local',
    valor: '<campo de tokens de entrada no envelope>',
    porque: 'lib.sh:860; mesmo envelope do custo, mesma volatilidade entre versões.',
  },
  {
    chave: 'orcamento.campos_usage.tokens_out',
    procedencia: 'local',
    valor: '<campo de tokens de saída no envelope>',
    porque: 'lib.sh:861; mesmo envelope, mesma volatilidade entre versões.',
  },
  {
    chave: 'orcamento.campos_usage.tokens_cache',
    procedencia: 'local',
    valor: '<campo de tokens de cache no envelope>',
    porque: 'lib.sh:862; mesmo envelope, mesma volatilidade entre versões.',
  },
  {
    chave: 'juiz.paths_alto_risco',
    procedencia: 'local',
    valor: ['<ex: supabase/**>', '<ex: src/auth/**>', '<ex: src/billing/**>'],
    porque:
      'juiz.ts:64. Pode ser lista VAZIA; o que não pode é a chave sumir. Quais paths são de alto risco é a pergunta mais local que este arquivo faz — e a que mais custa errar, porque a resposta decide qual modelo julga uma mudança de autenticação.',
  },
  {
    chave: 'juiz.diff_max_baixo',
    procedencia: 'local',
    valor: '<linhas de diff abaixo das quais o risco é baixo — o CI usa 300>',
    porque: 'juiz.ts:69. Depende do tamanho típico do ticket naquele repo — o CI usa 300, medido.',
  },
  {
    chave: 'launchd.label',
    procedencia: 'local',
    valor: '<ex: com.suaorg.orquestrador — OBRIGATÓRIO, um por repo>',
    porque:
      'instalar-launchd.sh:47, que RECUSA sem ele em vez de inventar um. Label inventado não dá erro visível: carrega um SEGUNDO job ao lado do antigo, os dois disparando no mesmo checkout.',
  },
]

// ─── 3. chaves próprias de um repo — ficam, e a K11 decide ───────────────────
export const PROPRIAS_DE_REPO: PropriaDeRepo[] = [
  {
    chave: 'c0_intocavel',
    repo: 'comarka-operacional',
    porque:
      'é a fronteira intocável do Comarka, com a MESMA forma de `zona_proibida` (`no_write_tables`, `no_write_prefixes`, `os_owned_excecoes`) mais duas listas próprias (`dashboard_readonly`, `ghl_comercial`). A tabela NÃO a renomeia: o motor lê `zona_proibida` (enforcement-core.ts:211), e mover a fronteira do enforcement por semelhança de nome é a mudança mais cara que uma migração automática poderia fazer errado. Fica intacta, e o relatório grita que `zona_proibida` está AUSENTE — o enforcement do Comarka não tem fronteira até alguém decidir.',
  },
  {
    chave: 'gates[].baseline_scope_regex',
    repo: 'comarka-operacional',
    porque:
      'ACHADO da peça G: o `gate_tsc` do Comarka (executor.sh:119-125 de lá) não CONTA erro nenhum — ele filtra a saída por este regex e reprova se sobrar qualquer `error TS` FORA do escopo `qualificacao`. O `baseline: 3` de lá é documentação, não regra. O `tipo: baseline` do kit compara CONTAGEM, então o gate migrado passa a significar "no máximo 3 erros, em qualquer arquivo" — mais frouxo num eixo (aceita 3 erros em qualquer lugar) e mais rígido noutro (um 4º erro dentro de qualificacao passa a reprovar). É mudança de SIGNIFICADO, não de forma: fica registrada aqui para decisão humana na adoção do Comarka, e a tabela não a converte sozinha.',
  },
  {
    chave: 'gate_streak_limite',
    repo: 'comarka-operacional',
    porque: 'contagem de reprovações seguidas antes de parar a frente. O motor do kit não tem esse conceito hoje.',
  },
  {
    chave: 'perfis_tools',
    repo: 'comarka-operacional',
    porque:
      'mapa de `--allowedTools` por perfil de ticket (api, docs, frontend, sql-proposta). Candidato a entrar como mapa opcional na K11 (inventário §5).',
  },
  {
    chave: 'writeback_notion',
    repo: 'comarka-operacional',
    porque: 'espelho externo. O motor do kit não faz writeback; entra com o painel ou morre na K11.',
  },
  {
    chave: 'migrations_faixa_loop',
    repo: 'actus-saas',
    porque:
      'faixa de numeração de migrations reservada ao loop ("0250-0299"). ABSORVIDA na K11a-1: o motor passou a ler a mesma faixa em `migrations.faixa`, e a tabela COPIA o valor para lá (o renome acima). A chave v1 fica intocada porque o motor não a lê — e porque quem edita o config do Actus à mão procura por este nome.',
  },
  {
    chave: 'zona_proibida.no_write_columns',
    repo: 'actus-saas',
    porque:
      'proibição por COLUNA, não por tabela. ABSORVIDA na K11a-1: o enforcement do kit passou a ler `zona_proibida.colunas_congeladas`, e a tabela copia o valor para lá. A chave v1 fica intocada pelo mesmo motivo da anterior.',
  },
  {
    chave: 'zona_proibida.padroes_proibidos_no_diff',
    repo: 'actus-saas',
    porque:
      'padrões de texto proibidos no diff (regexes com flags inline `(?i)/(?is)`, três no Actus: reancoragem de tenant_id em tabela particionada, session_replication_role, DELETE físico). ABSORVIDA na K11a-4: o motor lê os mesmos padrões em `enforcement.padroes_proibidos_no_diff`, e a tabela COPIA o valor para lá (o renome acima). A chave v1 fica intocada pelo mesmo motivo das duas anteriores — o motor não a lê, e quem edita o config do Actus à mão procura por este nome.',
  },
]
