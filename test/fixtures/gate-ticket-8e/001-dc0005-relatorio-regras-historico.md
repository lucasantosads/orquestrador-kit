# Ticket: DC-0005, relatório das rotas que escrevem em `trafego_regras_historico` fora da exceção

## Objetivo (prosa)

`trafego_regras_historico` é tabela C0, compartilhada com o Comarka OS. A exceção de escrita de 29/09
cobre só `src/app/api/trafego/regras-historico/route.ts:40`. O compromisso DC-0005 pede investigar
quem mais escreve nela. Este ticket entrega **só um relatório** em `docs/auditoria/`. Nenhum código
muda.

Recon feito no clone em 22/10/2026 (`grep -rn trafego_regras_historico src`). A Pendência do PLAYBOOK
lista 5 rotas, mas o disco tem **6** escritas fora da exceção. A sexta é
`src/app/api/trafego/verificar-regras/route.ts:182`, que não estava na lista. Linhas conferidas:

| Rota | Escrita |
|---|---|
| `src/app/api/trafego/regras-historico/route.ts:40` | insert (a exceção autorizada, só como referência) |
| `src/app/api/ia/avaliar-alerta-trafego/route.ts:186` | insert (o arquivo também lê em `:67`) |
| `src/app/api/meta/ativar/route.ts:53` | insert |
| `src/app/api/meta/duplicar/route.ts:53` | insert |
| `src/app/api/meta/editar-budget/route.ts:66` | insert |
| `src/app/api/meta/pausar/route.ts:64` | insert |
| `src/app/api/trafego/verificar-regras/route.ts:182` | insert |

Leitura sem escrita, fora do escopo do relatório: `src/app/api/trafego/regras/route.ts:27`.

Risco baixo: nenhum arquivo de código, migration ou tabela é tocado. Compromisso: DC-0005.

## Campos de máquina

```json
{
  "id": "001",
  "slug": "dc0005-relatorio-regras-historico",
  "compromisso": "DC-0005",
  "origem": "humano",
  "objetivo": "Escreva o relatório de investigação docs/auditoria/dc-0005-trafego-regras-historico.md, em português, sem alterar nenhum outro arquivo. Uma seção por rota que escreve na tabela C0 trafego_regras_historico fora da exceção autorizada, com: (1) rota HTTP, com método e caminho; (2) arquivo:linha exato do insert, conferido no disco; (3) o que escreve: as colunas e a origem de cada valor do insert; (4) quem chama: componente, hook, cron do Vercel ou webhook, com arquivo:linha de cada chamador encontrado por busca no repo, ou 'nenhum chamador encontrado no repo' quando não houver; (5) desde quando: o commit que introduziu o insert (git log -S); (6) recomendação: manter e incluir na exceção, mover para a rota autorizada, ou remover, com o porquê em uma frase. Abra com uma tabela-resumo das 6 rotas (rota, arquivo:linha, chamador, recomendação) e uma linha sobre a exceção autorizada, só como referência. Feche com a seção 'Perguntas para o Lucas', com o que só ele decide, incluindo se o Comarka OS lê essas linhas. Fato sem prova (arquivo:linha ou commit) não entra; o que não foi possível verificar vai escrito como não verificado. FORA DE ESCOPO e PROIBIDO: alterar qualquer arquivo além do relatório, inclusive as rotas investigadas: src/app/api/ia/avaliar-alerta-trafego/route.ts:186, src/app/api/meta/ativar/route.ts:53, src/app/api/meta/duplicar/route.ts:53, src/app/api/meta/editar-budget/route.ts:66, src/app/api/meta/pausar/route.ts:64, src/app/api/trafego/verificar-regras/route.ts:182 e a exceção autorizada src/app/api/trafego/regras-historico/route.ts:40. Também PROIBIDO: consultar banco, chamar API ou rodar as rotas.",
  "pathspec_allowlist": [
    "docs/auditoria/dc-0005-trafego-regras-historico.md"
  ],
  "cria_novo": [
    "docs/auditoria/dc-0005-trafego-regras-historico.md"
  ],
  "dependencias": [],
  "diff_estimado": 120,
  "risco": "",
  "criterios_aceite": [
    {
      "tipo": "alvo",
      "descricao": "o relatório cita as 6 rotas fora da exceção, cada uma com arquivo:linha",
      "cmd": "grep -ohF -e 'src/app/api/ia/avaliar-alerta-trafego/route.ts:' -e 'src/app/api/meta/ativar/route.ts:' -e 'src/app/api/meta/duplicar/route.ts:' -e 'src/app/api/meta/editar-budget/route.ts:' -e 'src/app/api/meta/pausar/route.ts:' -e 'src/app/api/trafego/verificar-regras/route.ts:' docs/auditoria/dc-0005-trafego-regras-historico.md 2>&1 | sort -u | wc -l | tr -d ' '",
      "espera": "6"
    },
    {
      "tipo": "alvo",
      "descricao": "o relatório tem a seção de perguntas para o Lucas",
      "cmd": "grep -cF 'Perguntas para o Lucas' docs/auditoria/dc-0005-trafego-regras-historico.md 2>&1",
      "espera": "1"
    },
    {
      "tipo": "avaliador",
      "descricao": "avaliador: o diff toca SÓ o relatório. Cada arquivo:linha citado bate com o disco da base (a linha tem o insert em trafego_regras_historico). Cada rota tem os 6 itens (rota, arquivo:linha, o que escreve, quem chama com arquivo:linha ou 'nenhum chamador encontrado', commit de origem, recomendação com porquê). Nenhuma afirmação sem prova; o que não foi verificado está marcado como não verificado. Nenhuma recomendação apresentada como decisão tomada.",
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
