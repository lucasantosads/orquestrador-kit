# Fixture 903 — o 488 ANTES do refatiamento (21/09/2026), verbatim

Fila de FIXTURE do test/orquestrador-gate-vitest-aviso.test.ts. Só id e status
mudaram. O objetivo manda usar detalhe-mensagem.ts, que não está na allowlist:
tem que disparar o AVISO de caminho fora da allowlist. Os critérios leem a saída
textual do vitest (grep -E passed|failed): tem que reprovar pela regra (a).

```json
{
  "id": "903",
  "bloco": "B3",
  "slug": "referencia-midia-ghl-adapter",
  "objetivo": "Alargar o campo provider da interface ReferenciaMidia em src/lib/comercial/contratos.ts de \"evolution\" para \"evolution\" | \"ghl\", documentado em comentario, SEM acrescentar campo novo de discriminacao e sem remover nem renomear campo existente. Nenhum chamador atual muda: provider e obrigatorio e ja vem explicito em todo ponto de construcao. No adapter de src/lib/comercial/ghl-conversations/adapter.ts, quando a mensagem do GHL for de audio, montar a ReferenciaMidia a partir do anexo do evento (usando o mesmo caminho de detalhe-mensagem.ts ja existente para resolver o anexo por messageId quando o evento nao trouxer), preenchendo midiaExternalId com o ponteiro de refetch do GHL, mimetype (minusculo, que e o nome real do campo no contrato) e provider 'ghl'. NAO preencher duracaoSegundos: a fonte do GHL nao informa duracao, o campo e opcional e nasce ausente. Se nao houver anexo resolvivel, NAO inventar ponteiro: deixar a mensagem sem midia e registrar log estruturado com motivo midia_ghl_sem_anexo. Ajustar persistencia.test.ts apenas para refletir o contrato novo, recalculando os valores esperados com o porque em comentario. FORA DE ESCOPO: tocar src/lib/comercial/midia/** (e o 489), tocar detalhe-mensagem.ts (e o 488a), tocar o adapter da Evolution, reprocessar linha ja gravada, aplicar SQL.",
  "pathspec_allowlist": [
    "src/lib/comercial/contratos.ts",
    "src/lib/comercial/ghl-conversations/adapter.ts",
    "src/lib/comercial/ghl-conversations/adapter.test.ts",
    "src/lib/comercial/ingestao/persistencia.test.ts"
  ],
  "dependencias": [],
  "risco": "",
  "criterios_aceite": [
    {
      "tipo": "alvo",
      "descricao": "teste do adapter do GHL passa",
      "cmd": "npx vitest run src/lib/comercial/ghl-conversations/adapter.test.ts 2>&1 | grep -E 'passed|failed'",
      "espera": "passed"
    },
    {
      "tipo": "guarda",
      "descricao": "teste de persistência segue verde",
      "cmd": "npx vitest run src/lib/comercial/ingestao/persistencia.test.ts 2>&1 | grep -E 'passed|failed'",
      "espera": "passed"
    },
    {
      "tipo": "guarda",
      "descricao": "nenhum arquivo de midia foi tocado",
      "cmd": "git diff --name-only HEAD~1...HEAD | grep -c 'src/lib/comercial/midia/'",
      "espera": "0"
    },
    {
      "tipo": "avaliador",
      "descricao": "avaliador: provider foi alargado para \"evolution\" | \"ghl\" e nenhum campo de ReferenciaMidia foi acrescentado, removido ou renomeado — em particular NAO existe campo novo de discriminacao (origem ou equivalente). O adapter monta a referencia a partir do anexo real, gravando mimetype minusculo, e audio sem anexo resolvivel nao gera ponteiro falso. Em persistencia.test.ts nenhuma assercao foi removida, nenhum toBe virou toBeDefined, nenhum teste ganhou skip: os valores esperados foram RECALCULADOS sob o contrato novo, com o porque em comentario.",
      "cmd": "true",
      "espera": "avaliador"
    }
  ],
  "status": "pendente",
  "notas_status": "",
  "tentativas": 0,
  "adiado_ate": "2026-09-21"
}
```
