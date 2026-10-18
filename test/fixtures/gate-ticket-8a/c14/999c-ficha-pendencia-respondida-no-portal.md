# Ticket 999c: Ficha: pendencia respondida pelo escritorio aparece com o rotulo certo

> Fonte de maquina e o bloco ```json. A prosa e para humanos.
> Frente: portal do escritorio v1 (spec docs/roadmap/portal-cliente-v2-spec.md, mockup docs/roadmap/mockups/portal-cliente.html, decisoes do Lucas em 10/10/2026).
> Recon contra origin/staging-auto 111a043 e banco vivo em 11/10/2026.

## Objetivo (prosa)

Quando o escritório aprova ou pede ajuste pelo portal, a pendência na aba Conta tem de dizer isso ("aprovada pelo escritório", "escritório pediu ajuste", "por portal"), e não cair no genérico "concluída". Os rótulos vêm da lib (999b), uma fonte só.

## Campos de maquina

```json
{
  "id": "999c",
  "slug": "ficha-pendencia-respondida-no-portal",
  "lane": "produto",
  "perfil": "frontend",
  "objetivo": "ORCAMENTO DE DIFF: teto de 240 linhas (~12 em bloco-contrato.tsx, ~220 em test/bloco-contrato-pendencia-portal.test.tsx NOVO). Se passar do teto, pare e reporte. DEPENDE do 999b (ROTULO_RESOLUCAO_PENDENCIA e ROTULO_CANAL_PENDENCIA em src/lib/contrato/pendencias.ts) e do 924a (que mexe no mesmo arquivo). FAZER: (1) src/app/dashboard/clientes/[id]/_components/bloco-contrato.tsx: apague os mapas locais ROTULO_CANAL e ROTULO_RESOLUCAO e use os da lib; a pilula da resolucao: 'aprovacao_tacita' continua azul; 'ajuste_pedido' em amarelo (atencao: a equipe tem de agir); as demais em verde, como hoje. Nada mais muda no bloco. (2) NOVO test/bloco-contrato-pendencia-portal.test.tsx (render da lista de pendencias como os testes do bloco fazem): pendencia 'aprovada' mostra 'aprovada pelo escritório'; 'ajuste_pedido' mostra 'escritório pediu ajuste' com a cor de atencao; canal 'portal' mostra 'por portal'; o arquivo nao declara mais ROTULO_RESOLUCAO local.  Regras do repo: sem .json() cru novo em src (fetchJson de src/lib/fetch-json no cliente, lerCorpoJson nas rotas); mensagens humanas sem nome de tabela; sem travessao (U+2014) em texto; getSession server-only; nenhuma escrita em zona C0 (clientes_receita, leads_crm*, trafego_*, ads_metadata, ads_performance, vw_atribuicao_proporcional); rota publica nunca usa o cliente anon (src/lib/supabase.ts): service role no servidor, lista explicita de colunas. PROIBIDO remover assercao, afrouxar matcher ou usar .skip/.only. FORA DE ESCOPO: qualquer outro bloco da aba Conta, rotas.",
  "cria_novo": [
    "test/bloco-contrato-pendencia-portal.test.tsx"
  ],
  "pathspec_allowlist": [
    "src/app/dashboard/clientes/[id]/_components/bloco-contrato.tsx",
    "test/bloco-contrato-pendencia-portal.test.tsx"
  ],
  "dependencias": [
    "999b",
    "924a"
  ],
  "prioridade": 42,
  "recon_esperado": [
    {
      "descricao": "test/bloco-contrato-pendencia-portal.test.tsx ainda nao existe",
      "cmd": "test -e 'test/bloco-contrato-pendencia-portal.test.tsx' && echo EXISTE || echo AUSENTE",
      "espera": "AUSENTE"
    },
    {
      "descricao": "o bloco tem rotulos de resolucao locais",
      "cmd": "n=$(grep -c 'const ROTULO_RESOLUCAO' 'src/app/dashboard/clientes/[id]/_components/bloco-contrato.tsx'); [ \"$n\" = 1 ] && echo LOCAL || echo ST_$n",
      "espera": "LOCAL"
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
      "cmd": "b=\"$(git merge-base HEAD origin/staging-auto)\"; n=$(git diff --name-only \"$b\" HEAD | grep -c '[.]sql$'); [ \"$n\" = 0 ] && echo SEM_SQL || echo SQL_$n",
      "espera": "SEM_SQL",
      "tipo": "guarda"
    },
    {
      "descricao": "so arquivos da allowlist foram tocados",
      "cmd": "b=\"$(git merge-base HEAD origin/staging-auto)\"; r=SO_ALLOWLIST; for f in $(git diff --name-only \"$b\" HEAD); do printf '%s\\n' 'src/app/dashboard/clientes/[id]/_components/bloco-contrato.tsx' 'test/bloco-contrato-pendencia-portal.test.tsx' | grep -Fxq \"$f\" || r=FORA_$f; done; echo $r",
      "espera": "SO_ALLOWLIST",
      "tipo": "guarda"
    },
    {
      "descricao": "diff dentro do orcamento (<= 240 linhas somando adicoes e remocoes)",
      "cmd": "b=\"$(git merge-base HEAD origin/staging-auto)\"; t=$(git diff --numstat \"$b\" HEAD | awk '{s+=$1+$2} END {print s+0}'); [ \"$t\" -le 240 ] && echo NO_TETO || echo ESTOUROU_$t",
      "espera": "NO_TETO",
      "tipo": "guarda"
    },
    {
      "descricao": "guardas globais seguem verdes (test/c0-guard.test.ts, test/fetch-json-teto.test.ts, test/travessao-mudo.test.ts, test/ui-guard.test.ts)",
      "cmd": "npx vitest run test/c0-guard.test.ts test/fetch-json-teto.test.ts test/travessao-mudo.test.ts test/ui-guard.test.ts >/dev/null 2>&1 && echo VERDE || echo VERMELHO",
      "espera": "VERDE",
      "tipo": "guarda"
    },
    {
      "descricao": "o bloco usa os rotulos da lib",
      "cmd": "f='src/app/dashboard/clientes/[id]/_components/bloco-contrato.tsx'; a=$(grep -c 'ROTULO_RESOLUCAO_PENDENCIA' \"$f\"); b=$(grep -c 'const ROTULO_RESOLUCAO' \"$f\"); [ \"$a\" -ge 1 ] && [ \"$b\" = 0 ] && echo DA_LIB || echo ST_${a}_${b}",
      "espera": "DA_LIB",
      "tipo": "alvo"
    },
    {
      "descricao": "testes verdes (test/bloco-contrato-pendencia-portal.test.tsx, test/pendencias-portal-tipos.test.ts)",
      "cmd": "test -f test/bloco-contrato-pendencia-portal.test.tsx && npx vitest run 'test/bloco-contrato-pendencia-portal.test.tsx' 'test/pendencias-portal-tipos.test.ts' >/dev/null 2>&1 && echo VERDE || echo VERMELHO",
      "espera": "VERDE"
    },
    {
      "descricao": "avaliador: a aba Conta mostra a resposta do escritorio pelo portal com os rotulos da lib, ajuste pedido em cor de atencao. REPROVE se: sobrou mapa local; outro bloco mudou; assercao removida ou afrouxada.",
      "cmd": "true",
      "espera": "avaliador",
      "tipo": "avaliador"
    }
  ],
  "testes_conferidos": [
    {
      "teste": "test/bloco-contrato-cortesia.test.ts",
      "motivo": "renderizam ou leem bloco-contrato.tsx; o ticket so troca os mapas locais de rotulo pelos da lib com os mesmos textos para os valores antigos; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/contrato-escopo-implementacoes.test.ts",
      "motivo": "renderizam ou leem bloco-contrato.tsx; o ticket so troca os mapas locais de rotulo pelos da lib com os mesmos textos para os valores antigos; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/contrato-parceria-sem-contrato.test.ts",
      "motivo": "renderizam ou leem bloco-contrato.tsx; o ticket so troca os mapas locais de rotulo pelos da lib com os mesmos textos para os valores antigos; se quebrar, PARE e descreva"
    }
  ],
  "status": "pendente",
  "notas_status": ""
}
```
