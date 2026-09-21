# Ticket — Seletor da fila reprocessa ticket já concluído

## Objetivo (prosa)

Em 13/09/2026 o loop pegou o ticket **480**, gastou três tentativas, escalou para
opus na segunda e na terceira, e bloqueou. O 480 estava `"status": "done"` em
`docs/fila/480-ghl-detalhe-mensagem.md` e o commit `cbadb75` já estava em
`origin/main`.

Custo do episódio: parte relevante dos US$ 26,48 que estouraram o teto diário
daquele dia, para reentregar trabalho já mergeado.

Este defeito está no motor vendorizado do kit, então a correção vale para os três
repos, não só para o Actus.

## Campos de maquina

```json
{
  "id": "497",
  "bloco": "B3",
  "slug": "fila-ignora-ticket-done",
  "objetivo": "PASSO 0 obrigatorio e diagnostico ANTES de corrigir: encontre no motor vendorizado do orquestrador o ponto que monta a lista de tickets processaveis, e descubra POR QUE o ticket 480, com status done no arquivo da fila, entrou na drenagem de 13/09/2026. Leia scripts/orquestrador e o log docs/fila/runs/local-loop.log na janela das 13h00 as 13h16 daquele dia. Hipoteses a testar por leitura, sem assumir nenhuma: o seletor le uma fonte diferente do arquivo (STATUS.md congelado, cache, .status.json); o parser do bloco de campos de maquina falha silenciosamente e trata status ausente como pendente; o cabecalho do bloco varia entre Campos de maquina com e sem acento e um dos casos nao casa. SE a causa nao ficar provada por leitura, PARE e reporte o que encontrou, sem escrever correcao. SE ficar provada: corrija o seletor para que ticket com status done nunca entre na lista de processaveis, e faca a falha de parse ser RUIDOSA — ticket cujo status nao puder ser lido deve ser reportado e ignorado, nunca tratado como pendente, porque tratar como pendente e exatamente o que gasta dinheiro. ACRESCENTE teste cobrindo: ticket done fica fora dos processaveis; ticket pendente entra; ticket com bloco de campos de maquina ilegivel fica fora e e reportado. PROIBIDO: alterar arquivo de ticket em docs/fila; mudar a politica de retry, os tetos de orcamento ou a politica de adiamento; migration; tocar em src/.",
  "pathspec_allowlist": [
    "scripts/orquestrador/**"
  ],
  "dependencias": [],
  "risco": "",
  "criterios_aceite": [
    {
      "descricao": "Suite verde",
      "cmd": "node_modules/.bin/vitest run 2>&1 | tail -5",
      "espera": "passed",
      "tipo": "guarda"
    },
    {
      "descricao": "nenhum ticket da fila foi alterado",
      "cmd": "git diff --name-only $BASE_REF...HEAD | grep -c '^docs/fila/'",
      "espera": "0",
      "tipo": "guarda"
    },
    {
      "descricao": "nenhuma migration e nenhum arquivo de aplicacao",
      "cmd": "git diff --name-only $BASE_REF...HEAD | grep -cE '^(src/|supabase/)'",
      "espera": "0",
      "tipo": "guarda"
    },
    {
      "descricao": "avaliador: confirme que (a) a causa foi PROVADA por leitura de codigo e do log, e esta descrita no commit ou em comentario, nao suposta; (b) ticket done nao entra mais nos processaveis; (c) falha de leitura de status vira reporte explicito e o ticket fica FORA da fila, nunca tratado como pendente; (d) a politica de retry, os tetos de orcamento e a politica de adiamento nao foram tocados; (e) ha teste para os tres casos. Se a causa nao estiver provada, REPROVE.",
      "cmd": "true",
      "espera": "avaliador",
      "tipo": "avaliador"
    }
  ],
  "status": "refatiar",
  "notas_status": "refatiar (enforcement): scripts/orquestrador/lib.sh (casa 'scripts/orquestrador/**') — não consome tentativa; resolver ampliando a allowlist ou fatiando o ticket",
  "tentativas": 0
}
```
