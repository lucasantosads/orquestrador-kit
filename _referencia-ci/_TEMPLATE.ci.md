# Ticket — <título curto e humano>

> A **fonte de verdade de máquina** é o bloco ```json abaixo — os scripts do
> orquestrador leem e escrevem SÓ esse bloco (via jq). A prosa é para humanos
> e é ignorada pela automação.

## Objetivo (prosa)

Explique para um humano o que este ticket entrega e por quê. Liste aqui o recon
já feito: todo nome de tabela/rota/arquivo citado no JSON foi verificado no repo
("existe no brief" ≠ existe no disco).

## Campos de máquina

```json
{
  "id": "000",
  "bloco": "B0",
  "slug": "exemplo-slug",
  "objetivo": "Uma frase imperativa do que construir. Vira o prompt do executor. Inclua: fontes REAIS (verificadas no repo), estados sem_dados explícitos, e o que é FORA de escopo.",
  "pathspec_allowlist": [
    "src/exemplo/**",
    "test/exemplo.test.ts"
  ],
  "dependencias": [],
  "criterios_aceite": [
    {
      "descricao": "typecheck não regride além do baseline",
      "cmd": "<comando de typecheck> 2>&1 | grep 'error' | grep -vic <escopo-baseline>",
      "espera": "0"
    },
    {
      "descricao": "Teste da frente verde",
      "cmd": "<runner> test/exemplo.test.ts 2>&1 | grep -E 'passed|failed'",
      "espera": "passed"
    },
    {
      "descricao": "avaliador: <o que o juiz deve cobrar por leitura do diff — inclua INTEGRAÇÃO (importado e montado), não só existência>",
      "cmd": "true",
      "espera": "avaliador"
    }
  ],
  "status": "pendente",
  "notas_status": ""
}
```

### Dicionário

| Campo | Regras |
|---|---|
| `id` | Identidade estável; arquivo = `<id>-<slug>.md`; branch = `frente/<id>`. Deps referenciam ESTE campo, nunca o nome do arquivo. O número vive DENTRO da faixa do bloco (ver MAPA.md). |
| `bloco` | Bloco do roadmap (`docs/roadmap/MAPA.md`) dono deste ticket. Usado no writeback agregado; NÃO entra no prompt do executor. |
| `objetivo` | Corpo do prompt do executor. Frase imperativa. |
| `pathspec_allowlist` | Globs. O enforcement FALHA se o diff tocar qualquer arquivo fora. Migrations só como arquivo no diretório de migrations. Tickets pendentes com allowlists sobrepostas exigem `dependencias` entre si. |
| `dependencias` | `id` de outro ticket (resolve quando `done`) ou `humano:<token>` (resolve quando o token está no arquivo de liberações). |
| `criterios_aceite` | `cmd` executável + `espera` (substring/valor). Subjetivos: `cmd:"true"` + `espera:"avaliador"` com a instrução ao juiz na `descricao`. Robusto > exato. |
| `status` | `pendente` → `em_execucao` → `done` \| `bloqueado`. Só a automação escreve. |
| `notas_status` | Último motivo (aprovação/reprovação/bloqueio). Reprovação alimenta o prompt do retry. |

### Contrato inviolável (herdado por tudo que o ticket gerar)

- Zona proibida (ver `000-config.json`): zero escrita, zero DDL.
- O loop nunca: pusha a branch principal, aplica DDL (só escreve `.sql`), toca credenciais, gasta dinheiro.
- `git add` sempre por pathspec explícito (nunca `-A`/`.`).
- Lição aprendida neste ticket → linha no PLAYBOOK no MESMO commit.


## Régua de granularidade (obrigatória)

> **Um ticket = uma unidade que, se reprovar, você aceita refazer inteira.**

O recurso escasso não é tempo de máquina: é cota de API. Ticket gordo que reprova
queima o dia; ticket fino demais gasta um ciclo de juiz para trinta linhas.

| Sinal | Ação |
|---|---|
| Diff estimado > 600 linhas | FATIAR, mesmo que o conteúdo seja repetitivo |
| Toca mais de uma camada (schema + backend + UI) | FATIAR por camada |
| Menos de ~50 linhas e mesma camada do ticket vizinho | JUNTAR |
| Toca arquivo que outro ticket pendente também toca | separado, COM dependência declarada |

Corolários: UI = **uma tela por ticket**, nunca "a onda inteira". Migrations = uma função
por ticket quando o corpo for complexo; famílias repetitivas em lotes de ~5. Refactor
mecânico = agrupar por diretório, respeitando o teto de linhas.
