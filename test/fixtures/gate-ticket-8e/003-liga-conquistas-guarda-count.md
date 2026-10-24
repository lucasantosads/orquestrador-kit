# Ticket: `concederConquista` não concede de novo quando a contagem falha

## Objetivo (prosa)

`src/lib/liga-conquistas.ts:71-77` verifica se o gestor já tem a conquista com
`select("id", { count: "exact", head: true })` e decide por `if ((count ?? 0) > 0) return null;`.
É o mesmo defeito do ticket 002: com `head: true`, uma leitura que falha devolve `count: null` e
`error: null`, e o `?? 0` concede a conquista uma segunda vez.

Chamador: `src/app/api/liga-comarka/conquistas/conceder/route.ts:22`. A rota já trata o retorno
`null` (`:23-25`, 400 "Conquista não encontrada ou já obtida"), então devolver `null` na falha não
cria caminho novo nela. A mensagem fica imprecisa no caso de falha; corrigi-la é fora de escopo. A
leitura do tipo (`liga_conquistas_tipos`, `.single()`) já devolve `null` quando falha e fica como está.

`liga_conquistas_obtidas` não está na zona protegida. O conserto remove uma escrita indevida e não
acrescenta nenhuma. A allowlist não se sobrepõe à do 002.

Compromisso: DC-0004, o primeiro lote do loop (confirmar com o Lucas; não há DC próprio).

## Campos de máquina

```json
{
  "id": "003",
  "slug": "liga-conquistas-guarda-count",
  "compromisso": "DC-0004",
  "origem": "humano",
  "objetivo": "Em src/lib/liga-conquistas.ts, função concederConquista: a verificação 'já possui a conquista' usa count com head:true e decide por (count ?? 0) > 0, então uma leitura que falha (count null, com ou sem error) é tratada como 'não possui' e insere a conquista de novo. Corrija para ler também o error da contagem; se houver error OU count == null, registre com console.error (prefixo [liga-conquistas], dizendo que nada foi concedido) e retorne null sem inserir. O caminho feliz não muda: count 0 insere, count > 0 retorna null sem inserir, e tipo inexistente continua retornando null. Crie o teste src/__tests__/liga-conquistas-guarda.test.ts com vitest, mockando getSupabaseAdmin de @/lib/comarka-pro (vi.mock, sem rede e sem credencial). Casos: (a) tipo encontrado, count null e error null: nenhum insert, retorno null; (b) tipo encontrado, count null com error: nenhum insert, retorno null; (c) tipo encontrado, count 1: nenhum insert, retorno null; (d) tipo encontrado, count 0: insert chamado uma vez em liga_conquistas_obtidas, com gestor_id e conquista_id. Os casos (a) e (b) TÊM de falhar contra o código atual: rode o teste antes de corrigir e diga no corpo do commit que falharam. FORA DE ESCOPO: qualquer outro arquivo, inclusive as funções irmãs com o mesmo padrão em outros módulos.",
  "pathspec_allowlist": [
    "src/lib/liga-conquistas.ts",
    "src/__tests__/liga-conquistas-guarda.test.ts"
  ],
  "cria_novo": [
    "src/__tests__/liga-conquistas-guarda.test.ts"
  ],
  "dependencias": [],
  "diff_estimado": 110,
  "risco": "",
  "criterios_aceite": [
    {
      "tipo": "alvo",
      "descricao": "teste novo da guarda verde (o arquivo não existe antes, e os casos (a) e (b) falham contra o código atual)",
      "cmd": "node_modules/.bin/vitest run src/__tests__/liga-conquistas-guarda.test.ts >/dev/null 2>&1 && echo OK",
      "espera": "OK"
    },
    {
      "tipo": "guarda",
      "descricao": "a decisão não lê mais a contagem com ?? 0",
      "cmd": "grep -cF '(count ?? 0) > 0' src/lib/liga-conquistas.ts",
      "espera": "0"
    },
    {
      "tipo": "avaliador",
      "descricao": "avaliador: o teste importa concederConquista de @/lib/liga-conquistas e exercita a função real, não um espelho dela; os 4 casos existem e cada um verifica se o insert foi chamado ou não; os casos (a) e (b) falhariam contra a versão anterior (o corpo do commit diz isso); na falha não há insert e não há throw; o caminho de count 0 continua inserindo; nenhum outro arquivo foi tocado; sem skip, sem asserção afrouxada.",
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
