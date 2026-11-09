# Ticket 001 (M-68-0): canário da fila do kit, citação de max_retries em config-chaves.ts

## Objetivo (prosa)

Primeiro ticket da fila do próprio kit (etapa KF, M-68). É o canário: a mudança é de uma linha,
fora da régua, e serve para provar o ciclo inteiro (worktree `kit-orq-001`, os 4 gates, o juiz e o
merge na `staging-kit`) antes de qualquer ticket de verdade.

Recon feito em `ee8c4a7` (main, c0052-B1a dentro): `scripts/orquestrador/config-chaves.ts:39` diz que
`max_retries` é lido em `lib.sh:53`; a leitura está em `lib.sh:118`
(`CFG_MAX_RETRIES="$(cfg '.max_retries')"`). O B1a acrescentou `config_da_fila` no topo do `lib.sh` e
empurrou o bloco de leitura.

Fora de escopo: as outras citações velhas do mesmo arquivo (linhas 38, 40 a 46, `pausar_file` e
`decisoes_file`). Ficam para o ticket seguinte, depois que o canário passar.

## Campos de máquina

```json
{
  "id": "001",
  "frente": "M-68-0",
  "slug": "canario-citacao-max-retries",
  "origem": "humano",
  "objetivo": "Em scripts/orquestrador/config-chaves.ts, na entrada de max_retries (linha 39), troque onde: 'lib.sh:53' por onde: 'lib.sh:118', que é a linha real da leitura (CFG_MAX_RETRIES em scripts/orquestrador/lib.sh). Não mexa em nenhuma outra linha nem em nenhum outro arquivo: as demais citações velhas do arquivo são de outro ticket.",
  "pathspec_allowlist": [
    "scripts/orquestrador/config-chaves.ts"
  ],
  "recon": [
    {
      "descricao": "a leitura de max_retries está na linha 118 do lib.sh da branch alvo",
      "cmd": "grep -n \"CFG_MAX_RETRIES=\" scripts/orquestrador/lib.sh",
      "espera": "^118:"
    }
  ],
  "dependencias": [],
  "diff_estimado": 2,
  "criterios_aceite": [
    {
      "tipo": "alvo",
      "descricao": "a entrada de max_retries cita lib.sh:118 (vermelho antes: 0)",
      "cmd": "grep -cF \"chave: 'max_retries', onde: 'lib.sh:118'\" scripts/orquestrador/config-chaves.ts",
      "espera": "1"
    },
    {
      "tipo": "guarda",
      "descricao": "nenhuma outra entrada mudou: a de branch_alvo segue citando lib.sh:52",
      "cmd": "grep -cF \"chave: 'branch_alvo', onde: 'lib.sh:52'\" scripts/orquestrador/config-chaves.ts",
      "espera": "1"
    },
    {
      "tipo": "avaliador",
      "descricao": "avaliador: o diff é uma linha só, em config-chaves.ts, trocando lib.sh:53 por lib.sh:118 na entrada de max_retries; nada mais muda.",
      "cmd": "true",
      "espera": "avaliador"
    }
  ],
  "status": "pendente",
  "notas_status": "recusado: "
}
```
