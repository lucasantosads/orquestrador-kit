# Ticket 489 — Pipeline de mídia escolhe o downloader por origem

## Objetivo (prosa)

Recon de 20/09/2026: `src/lib/comercial/midia/pipeline.ts:13` importa
`criarEvolutionClient` e as linhas 184 e 185 fazem

```
const evolution = await deps.criarEvolution(deps.svc, ini.tenant_id);
const audio = await evolution.baixarAudio(referencia.midiaExternalId);
```

Ou seja, a Evolution está cravada no único caminho de download. Mesmo com o 488
preenchendo a referência, áudio que veio pelo GHL tentaria baixar na Evolution e falharia
de novo, só que com outro erro.

Entrega uma camada só (mídia), com o cliente novo espelhando a interface que o pipeline
já injeta por `deps`, para o teste continuar podendo substituir o cliente.

## Campos de máquina

```json
{
  "id": "489",
  "bloco": "B3",
  "slug": "midia-downloader-por-origem",
  "objetivo": "Criar src/lib/comercial/midia/ghl.ts com um cliente de midia do GHL que satisfaz ESTRUTURALMENTE a interface EvolutionMediaClient ja existente em src/lib/comercial/midia/evolution.ts — baixarAudio(midiaExternalId) devolvendo AudioBaixado { bytes, mimeType } —, baixando os bytes a partir da url do anexo exposta pelo ticket 488a em buscarEnriquecimentoDetalheGhl. NAO renomear a interface nem refatorar o cliente da Evolution: a tipagem estrutural resolve, e renomear estoura o diff. Em src/lib/comercial/midia/pipeline.ts, onde hoje o download e feito com criarEvolution, selecionar o cliente por referencia.provider: 'ghl' usa o cliente novo, 'evolution' mantem o comportamento atual bit a bit. Manter a injecao por deps para que o teste substitua qualquer um dos dois clientes. Falha de download registra o erro com o provider tentado na mensagem, para o proximo diagnostico nao precisar adivinhar. FORA DE ESCOPO: alterar o adapter do GHL ou contratos.ts (e o 488), alterar detalhe-mensagem.ts (e o 488a), mexer em transcricao/**, reprocessar linha ja gravada (e o 496), aplicar SQL.",
  "pathspec_allowlist": [
    "src/lib/comercial/midia/pipeline.ts",
    "src/lib/comercial/midia/pipeline.test.ts",
    "src/lib/comercial/midia/ghl.ts",
    "src/lib/comercial/midia/ghl.test.ts"
  ],
  "dependencias": [
    "488",
    "488a",
    "488b"
  ],
  "risco": "",
  "criterios_aceite": [
    {
      "tipo": "alvo",
      "descricao": "testes de mídia passam",
      "cmd": "npx vitest run src/lib/comercial/midia >/dev/null 2>&1 && echo ok",
      "espera": "ok"
    },
    {
      "tipo": "guarda",
      "descricao": "o caminho da Evolution continua existindo no pipeline",
      "cmd": "grep -q 'deps.criarEvolution' src/lib/comercial/midia/pipeline.ts && echo ok",
      "espera": "ok"
    },
    {
      "tipo": "avaliador",
      "descricao": "avaliador: o cliente do GHL satisfaz estruturalmente a interface EvolutionMediaClient (nenhum ramo paralelo de pipeline, nenhuma renomeacao de interface, nenhum refactor do cliente da Evolution), a selecao do cliente e por referencia.provider, e o teste cobre os dois caminhos ('ghl' e 'evolution'). Nenhuma assercao existente foi removida ou afrouxada.",
      "cmd": "true",
      "espera": "avaliador"
    }
  ],
  "status": "pendente",
  "notas_status": "",
  "tentativas": 0
}
```
