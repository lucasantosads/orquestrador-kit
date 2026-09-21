# Ticket — Motivo passa a ser obrigatório na rejeição individual

## Objetivo (prosa)

Fatia 3 de 3. Só depois que a tela (461) estiver em produção enviando os campos.
Inverter a ordem quebraria a rejeição com 400 em produção, que foi exatamente o
que o juiz pegou na versão anterior deste trabalho.

Reescrito em 13/09/2026: os DOIS campos passam a ser obrigatórios. Categoria
sozinha não alimenta revisão de prompt, texto sozinho não agrega em ranking.

## Campos de maquina

```json
{
  "id": "462",
  "bloco": "B3",
  "slug": "rejeicao-motivo-obrigatorio",
  "objetivo": "Em src/app/api/comercial/sugestoes/[id]/route.ts, os dois campos de motivo passam a ser OBRIGATORIOS quando a acao for rejeitar: motivo_categoria ausente ou fora das quatro categorias devolve 400 sem tocar o banco, e motivo_texto ausente ou com menos de 3 caracteres apos trim devolve 400 sem tocar o banco. O aceite continua sem exigir nada. Atualize os testes da fatia 460 que assumiam os campos opcionais, mantendo o caso de aceite sem motivo. PRE-REQUISITO DE PRODUCAO: esta fatia so pode ser aplicada depois que a tela do 461 estiver em producao enviando os dois campos; se nao estiver, a rejeicao passa a falhar com 400 para todo usuario. FORA DE ESCOPO: migration, tela, rejeicao em lote.",
  "pathspec_allowlist": [
    "src/app/api/comercial/sugestoes/[id]/route.ts",
    "src/app/api/comercial/sugestoes/[id]/route.test.ts"
  ],
  "dependencias": [
    "461"
  ],
  "criterios_aceite": [
    {
      "descricao": "Suite verde",
      "cmd": "node_modules/.bin/vitest run 2>&1 | tail -5",
      "espera": "passed",
      "tipo": "guarda"
    },
    {
      "descricao": "nenhuma migration",
      "cmd": "git diff --name-only HEAD~1...HEAD -- supabase/migrations/ | wc -l | tr -d ' '",
      "espera": "0",
      "tipo": "guarda"
    },
    {
      "descricao": "avaliador: rejeicao sem categoria devolve 400; rejeicao sem texto devolve 400; rejeicao com categoria fora do enum devolve 400; nenhum desses casos toca o banco; aceite sem motivo continua 200; nenhum outro comportamento da rota mudou.",
      "cmd": "true",
      "espera": "avaliador",
      "tipo": "avaliador"
    }
  ],
  "status": "done",
  "notas_status": "mergeado em staging-auto pela drenagem",
  "tentativas_consumidas": 0,
  "risco": "",
  "tentativas": 0
}
```
