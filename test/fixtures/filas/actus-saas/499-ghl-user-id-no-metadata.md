# Ticket 499 — Gravar o autor do GHL em `metadata.ghlUserId`

## Objetivo (prosa)

Recon de 20/09/2026:

- `public.webhook_events` tem 6.745 eventos com a chave `userId`, e o payload de `OutboundMessage` traz `userId`, `conversationId`, `messageId` e `direction`. O dado de quem enviou já chega.
- `grep userId src/lib/comercial/ghl-conversations/adapter.ts` não retorna nada: o adapter descarta esse campo hoje.
- `comercial.conversations.responsavel_user_id` existe e está em 0 de 981 conversas, mas `public.tenant_users` tem 1 usuário por tenant, todos `admin_cliente`. Os closers e o SDR não têm conta no Actus, então essa coluna não é o destino possível agora.

Por isso o destino é `messages.metadata`, que é jsonb livre e não exige DDL nem cadastro.
Com ele, tempo de resposta por pessoa, volume por pessoa e ranking passam a ser
calculáveis, e a decisão de criar coluna, tela e contas de closer fica para depois, com
volume medido.

Dependência de fronteira: toca `adapter.ts`, o mesmo arquivo do ticket 488. Dependência
declarada para não nascer de base velha.

## Campos de máquina

```json
{
  "id": "499",
  "bloco": "B3",
  "slug": "ghl-user-id-no-metadata",
  "objetivo": "No adapter de src/lib/comercial/ghl-conversations/adapter.ts, propagar o userId do evento do GHL para o metadata da mensagem, na chave ghlUserId, quando o campo existir no payload e a direção for saida. Ausente ou vazio: não gravar a chave, nunca gravar string vazia ou null. Não alterar nenhuma outra chave de metadata já gravada hoje, não renomear nada, e manter a ReferenciaMidia em metadata.midia exatamente como está. Cobrir em adapter.test.ts: evento de saída com userId grava a chave, evento sem userId não cria a chave, evento de entrada não cria a chave. FORA DE ESCOPO: tocar conversations.responsavel_user_id, tocar ghl_user_map, criar coluna, alterar a rota de atribuição manual, backfill de mensagem já gravada (é o 499a), qualquer UI.",
  "pathspec_allowlist": [
    "src/lib/comercial/ghl-conversations/adapter.ts",
    "src/lib/comercial/ghl-conversations/adapter.test.ts"
  ],
  "dependencias": [
    "488"
  ],
  "risco": "",
  "criterios_aceite": [
    {
      "tipo": "alvo",
      "descricao": "teste do adapter passa",
      "cmd": "npx vitest run src/lib/comercial/ghl-conversations/adapter.test.ts >/dev/null 2>&1 && echo ok",
      "espera": "ok"
    },
    {
      "tipo": "guarda",
      "descricao": "nenhum arquivo de banco ou de conversa foi tocado",
      "cmd": "git diff --name-only $BASE_REF...HEAD | grep -cE 'migrations/|conversas/|ghl_user_map'",
      "espera": "0"
    },
    {
      "tipo": "avaliador",
      "descricao": "avaliador: a chave ghlUserId só é escrita quando o payload traz userId e a direção é saida, nenhuma chave existente de metadata foi alterada ou removida, e o teste cobre os três casos descritos. Nenhuma asserção existente foi afrouxada.",
      "cmd": "true",
      "espera": "avaliador"
    }
  ],
  "status": "pendente",
  "notas_status": "",
  "tentativas": 0
}
```
