# Ticket — <título curto e humano>

> Formato de ticket da fila do Orquestrador Autônomo (Bloco 0).
> A **fonte de verdade de máquina** é o bloco ` ```json ` abaixo — os scripts
> (`executor.sh`, `avaliador.sh`, `enforcement.sh`, `writeback-notion.ts`) leem
> e escrevem SÓ esse bloco (via `jq`). O texto em prosa é para humanos e é
> ignorado pela automação.

## Objetivo (prosa)

Explique aqui, para um humano, o que este ticket entrega e por quê. O campo
`objetivo` do JSON é o resumo curto que vai no prompt do executor.

## Campos de máquina

```json
{
  "id": "000",
  "slug": "exemplo-slug",
  "lane": "",
  "perfil": "",
  "objetivo": "Uma frase imperativa do que construir. Vira o prompt do executor.",
  "pathspec_allowlist": [
    "src/app/exemplo/**",
    "src/lib/exemplo/**",
    "test/exemplo.test.ts"
  ],
  "dependencias": [],
  "prioridade": 50,
  "criterios_aceite": [
    {
      "descricao": "tsc não regride além do baseline",
      "cmd": "npx tsc --noEmit 2>&1 | grep 'error TS' | grep -vi qualificacao | wc -l",
      "espera": "0"
    },
    {
      "descricao": "Endpoint exige sessão",
      "cmd": "curl -s -o /dev/null -w '%{http_code}' -X POST http://localhost:3004/api/exemplo",
      "espera": "401"
    }
  ],
  "status": "pendente",
  "notas_status": ""
}
```

### Dicionário dos campos

| Campo | Tipo | Regras |
|---|---|---|
| `id` | string | Identidade estável. Nome do arquivo é `<id>-<slug>.md`. Vira a branch `frente/<id>`. |
| `slug` | string | Rótulo humano (kebab-case). Não usado como chave. |
| `lane` | string | Fila/categoria do ticket (ex.: `produto`, `infra`, `dados`). Opcional — sem matriz ainda, apenas armazena o dado. |
| `perfil` | string | Perfil de execução: `frontend`, `api`, `sql-proposta`, `docs` ou vazio. Define a allowlist de tools do `claude -p`. Omitido = default atual. |
| `objetivo` | string | Frase imperativa. É o corpo do prompt enviado ao `claude -p` do executor. |
| `pathspec_allowlist` | string[] | Globs (`*`, `**`, `?`). O `enforcement.sh` **falha** se o diff tocar qualquer arquivo fora desta lista. Migrations só via `supabase/migrations/**`. |
| `dependencias` | string[] | Cada item é um `id` de outro ticket (resolvido quando aquele está `done`) **ou** `humano:<token>` (resolvido quando `<token>` está em `docs/fila/liberacoes.json`). |
| `prioridade` | int? | **Opcional.** Inteiro `1..99`, **menor = mais urgente**. Ausente vale **50**. O loop percorre os pendentes ordenados por (`prioridade`, nome do arquivo), então é o único jeito de furar a ordem alfabética de id sem renomear ticket. Não atropela `dependencias`: prioridade 1 com dep aberta continua sendo pulado. Fora de `1..99` ou não-inteiro = ERRO no `validar-fila.py`. |
| `criterios_aceite` | objeto[] | Cada critério tem `descricao`, `cmd` (comando executável) e `espera` (substring esperada no stdout, ou código HTTP). Alimentam o avaliador; podem ser rodados mecanicamente. |
| `status` | enum | `pendente` → `em_execucao` → `done` \| `bloqueado`. Só a automação escreve. |
| `notas_status` | string | Último motivo (aprovação/reprovação/bloqueio). Preenchido pelo avaliador. |

### Contrato inviolável (herdado pelo que o ticket gerar)

- **Zona C0 intocável** (ver `docs/fila/000-config.json`): zero escrita, zero DDL.
- O loop **nunca**: pusha `main`, aplica DDL (só escreve `.sql` em `supabase/migrations/`), escreve em C0, toca credenciais, gasta dinheiro.
- `git add` sempre por pathspec explícito (nunca `git add -A`/`.`).
- Lição aprendida neste ticket? → linha no `docs/orquestrador/PLAYBOOK.md` no MESMO commit.
