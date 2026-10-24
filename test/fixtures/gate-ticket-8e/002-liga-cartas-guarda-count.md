# Ticket: `distribuirCartasMensais` não distribui de novo quando a contagem falha

## Objetivo (prosa)

`src/lib/liga-cartas.ts:76-83` verifica se o gestor já recebeu as cartas do mês com
`select("id", { count: "exact", head: true })` e decide por `if ((count ?? 0) > 0) return [];`.
Com `head: true`, o supabase-js devolve `count: null` **e** `error: null` quando a leitura falha
(o mesmo caso está documentado em `src/lib/pendencias/garantia-contrato.ts:80-83`, origem da queda do
/crm em 03-04/09). O `?? 0` lê a falha como "ainda não recebeu", e o
gestor ganha um segundo lote de cartas no mesmo mês. Isso viola a regra do CLAUDE.md: falha de
leitura nunca vira 0.

Chamador único: `src/app/api/liga-comarka/cartas/minhas/route.ts:16`, que ignora o retorno e lê
`getCartasMes` em seguida. Por isso devolver `[]` na falha não muda a resposta da rota, só deixa de
inserir.

`liga_cartas` não está na zona protegida. O conserto não acrescenta escrita nova: ele remove uma
escrita indevida. Irmãs do mesmo padrão: `src/lib/liga-conquistas.ts:77` (ticket 003),
`src/lib/comarka-pro.ts:178` e `src/lib/liga-streak.ts:86` (fora deste lote, registradas no relatório
do lote).

Compromisso: DC-0004, o primeiro lote do loop (confirmar com o Lucas; não há DC próprio).

## Campos de máquina

```json
{
  "id": "002",
  "slug": "liga-cartas-guarda-count",
  "compromisso": "DC-0004",
  "origem": "humano",
  "objetivo": "Em src/lib/liga-cartas.ts, função distribuirCartasMensais: a verificação 'já recebeu cartas neste mês' usa count com head:true e decide por (count ?? 0) > 0, então uma leitura que falha (count null, com ou sem error) é tratada como 'ainda não recebeu' e insere um segundo lote. Corrija para ler também o error da contagem; se houver error OU count == null, registre com console.error (prefixo [liga-cartas], dizendo que nada foi distribuído) e retorne [] sem inserir. O caminho feliz não muda: count 0 distribui e count > 0 retorna [] sem inserir. Crie o teste src/__tests__/liga-cartas-guarda.test.ts com vitest, mockando getSupabaseAdmin de @/lib/comarka-pro e getRegraNum de @/lib/comarka-pro-config (vi.mock, sem rede e sem credencial). Casos: (a) count null e error null: nenhum insert, retorno []; (b) count null com error: nenhum insert, retorno []; (c) count 2: nenhum insert, retorno []; (d) count 0: insert chamado uma vez, com o número de cartas de getRegraNum. Os casos (a) e (b) TÊM de falhar contra o código atual: rode o teste antes de corrigir e diga no corpo do commit que falharam. FORA DE ESCOPO: qualquer outro arquivo, inclusive as funções irmãs com o mesmo padrão em outros módulos.",
  "pathspec_allowlist": [
    "src/lib/liga-cartas.ts",
    "src/__tests__/liga-cartas-guarda.test.ts"
  ],
  "cria_novo": [
    "src/__tests__/liga-cartas-guarda.test.ts"
  ],
  "dependencias": [],
  "diff_estimado": 110,
  "risco": "",
  "criterios_aceite": [
    {
      "tipo": "alvo",
      "descricao": "teste novo da guarda verde (o arquivo não existe antes, e os casos (a) e (b) falham contra o código atual)",
      "cmd": "node_modules/.bin/vitest run src/__tests__/liga-cartas-guarda.test.ts >/dev/null 2>&1 && echo OK",
      "espera": "OK"
    },
    {
      "tipo": "guarda",
      "descricao": "a decisão não lê mais a contagem com ?? 0",
      "cmd": "grep -cF '(count ?? 0) > 0' src/lib/liga-cartas.ts",
      "espera": "0"
    },
    {
      "tipo": "avaliador",
      "descricao": "avaliador: o teste importa distribuirCartasMensais de @/lib/liga-cartas e exercita a função real, não um espelho dela; os 4 casos existem e cada um verifica se o insert foi chamado ou não; os casos (a) e (b) falhariam contra a versão anterior (o corpo do commit diz isso); na falha não há insert e não há throw; o caminho de count 0 continua inserindo; nenhum outro arquivo foi tocado; sem skip, sem asserção afrouxada.",
      "cmd": "true",
      "espera": "avaliador"
    }
  ],
  "status": "pendente",
  "notas_status": "",
  "hash_candidato": "",
  "sinal_hash": "",
  "gate_ok": "",
  "pid": null,
  "iniciado_em": "",
  "adiado_ate": ""
}
```
