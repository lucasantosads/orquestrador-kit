# Ticket 004 (DEFEITO-EO): lock órfão volta a ser recuperado

## Objetivo (prosa)

Defeito registrado em docs/defeitos/2026-11-12-lock-stale-importa-lock-js.md (aberto, origem escritorio-os): scripts/orquestrador/local-loop.sh:38-48 importa '$ORQ_LIB_DIR/lock.js' no tsx -e; com tsx 4.23 e Node 24 o import falha com rc 1 e o lock_adquirir lê isso como 'outro run vivo'. Um lock órfão de run que caiu nunca é removido e toda drenagem seguinte encerra calada.

Recon feito pelo chat do projeto Orquestrador em 14/11/2026 contra a origin/main bea053c (2.1.8).

## Campos de máquina

```json
{
  "id": "004",
  "frente": "DEFEITO-EO",
  "slug": "lock-stale-importa-lock-ts",
  "origem": "humano",
  "objetivo": "Em scripts/orquestrador/local-loop.sh, faça o lock_stale importar lock.ts (o arquivo que existe) e trate falha do próprio tsx como erro alto: evento na trilha e saída do run com mensagem que diga que a checagem do lock falhou, nunca como 'outro run vivo'. Crie test/orquestrador-lock-orfao.test.ts que monta um lock com pid morto e epoch antigo e prova que o run seguinte registra RECUPERADO motivo=lock-orfao e segue, e que um lock de pid vivo continua barrando. Atualize o Estado do defeito para corrigido com o commit.",
  "pathspec_allowlist": [
    "scripts/orquestrador/local-loop.sh",
    "test/orquestrador-lock-orfao.test.ts",
    "docs/defeitos/2026-11-12-lock-stale-importa-lock-js.md"
  ],
  "cria_novo": [
    "test/orquestrador-lock-orfao.test.ts"
  ],
  "recon": [
    {
      "descricao": "o import quebrado está no local-loop",
      "cmd": "grep -n \"lock.js'\" scripts/orquestrador/local-loop.sh",
      "espera": "lock\\.js'"
    }
  ],
  "dependencias": [],
  "diff_estimado": 140,
  "criterios_aceite": [
    {
      "tipo": "alvo",
      "descricao": "o local-loop não importa mais lock.js (vermelho antes: 1)",
      "cmd": "grep -c 'lock\\.js' scripts/orquestrador/local-loop.sh",
      "espera": "0"
    },
    {
      "tipo": "alvo",
      "descricao": "o teste do lock órfão passa",
      "cmd": "env -u ORQ_CONFIG -u ORQ_GATE TZ=UTC node_modules/.bin/vitest run test/orquestrador-lock-orfao.test.ts >/dev/null 2>&1 && echo OK",
      "espera": "OK"
    },
    {
      "tipo": "avaliador",
      "descricao": "avaliador: o teste cobre lock órfão (recupera e segue) e lock vivo (barra); falha do tsx vira erro alto com evento, nunca 'vivo'; o defeito está marcado corrigido.",
      "cmd": "true",
      "espera": "avaliador"
    }
  ],
  "status": "pendente",
  "notas_status": "",
  "tentativas": 1
}
```
