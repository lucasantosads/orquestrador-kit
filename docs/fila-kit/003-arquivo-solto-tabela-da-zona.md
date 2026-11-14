# Ticket 003 (DEFEITO-EO): teste de arquivo solto lê a tabela proibida do config

## Objetivo (prosa)

Defeito achado no escritorio-os em 12/11 (docs/orquestrador/defeitos-para-o-kit.md de lá): test/orquestrador-arquivo-solto.test.ts:150 escreve 'insert into public.leads' fixo no contra-teste de zona proibida (linha 146). Num repo cuja zona não tem public.leads (escritorio-os usa core, bancario, trabalhista) só sai fora_do_pathspec e o teste falha depois de instalar.sh --novo.

Recon feito pelo chat do projeto Orquestrador em 14/11/2026 contra a origin/main bea053c (2.1.8).

## Campos de máquina

```json
{
  "id": "003",
  "frente": "DEFEITO-EO",
  "slug": "arquivo-solto-tabela-da-zona",
  "origem": "humano",
  "objetivo": "Em test/orquestrador-arquivo-solto.test.ts, no contra-teste 'arquivo solto que casa zona proibida -> refatiar' (linha 146), troque a tabela fixa public.leads (linha 150) por uma tabela lida de zona_proibida.no_write_tables do config que o próprio fixtureRepo grava (linha 39), para o teste valer em qualquer repo instalado. Se o config do fixture não tiver tabela proibida, o teste falha com mensagem clara em vez de passar. Registre o defeito em docs/defeitos/2026-11-12-teste-arquivo-solto-tabela-fixa.md (formato da pasta, Estado corrigido, origem escritorio-os). Fora de escopo: qualquer outro caso do arquivo.",
  "pathspec_allowlist": [
    "test/orquestrador-arquivo-solto.test.ts",
    "docs/defeitos/2026-11-12-teste-arquivo-solto-tabela-fixa.md"
  ],
  "cria_novo": [
    "docs/defeitos/2026-11-12-teste-arquivo-solto-tabela-fixa.md"
  ],
  "recon": [
    {
      "descricao": "a tabela fixa está no contra-teste",
      "cmd": "grep -n 'public.leads' test/orquestrador-arquivo-solto.test.ts",
      "espera": "public\\.leads"
    }
  ],
  "dependencias": [],
  "diff_estimado": 30,
  "criterios_aceite": [
    {
      "tipo": "alvo",
      "descricao": "nenhuma tabela fixa no teste (vermelho antes: 1)",
      "cmd": "grep -c 'public\\.leads' test/orquestrador-arquivo-solto.test.ts",
      "espera": "0"
    },
    {
      "tipo": "alvo",
      "descricao": "o arquivo de teste passa",
      "cmd": "env -u ORQ_CONFIG -u ORQ_GATE TZ=UTC node_modules/.bin/vitest run test/orquestrador-arquivo-solto.test.ts >/dev/null 2>&1 && echo OK",
      "espera": "OK"
    },
    {
      "tipo": "avaliador",
      "descricao": "avaliador: o contra-teste continua existindo e continua exigindo refatiar por zona proibida; a tabela vem do config do fixture; nenhum outro caso mudou.",
      "cmd": "true",
      "espera": "avaliador"
    }
  ],
  "status": "pendente",
  "notas_status": "",
  "tentativas": 1
}
```
