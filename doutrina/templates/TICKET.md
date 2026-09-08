# Ticket: <título curto e humano>

> A **fonte de verdade de máquina** é o bloco ```json abaixo. Os scripts do
> orquestrador leem e escrevem SÓ esse bloco (via jq). A prosa é para humanos
> e é ignorada pela automação. Ticket gerado pelo planejador ou pela sentinela
> nasce com `status: candidato` e só vira `pendente` depois do gate de ticket.

## Objetivo (prosa)

Explique para um humano o que este ticket entrega e por quê. Liste aqui o recon
já feito: todo nome de tabela/rota/arquivo citado no JSON foi verificado no repo
("existe no brief" não é "existe no disco"). Se veio da sentinela, cole o sinal.

## Campos de máquina

```json
{
  "id": "000",
  "bloco": "B0",
  "frente": "B0-F1",
  "slug": "exemplo-slug",
  "origem": "humano",
  "objetivo": "Uma frase imperativa do que construir. Vira o prompt do executor. Inclua: fontes REAIS (verificadas no repo), estados sem_dados explícitos, e o que é FORA de escopo.",
  "pathspec_allowlist": [
    "src/exemplo/**",
    "test/exemplo.test.ts"
  ],
  "cria_novo": ["test/exemplo.test.ts"],
  "dependencias": [],
  "diff_estimado": 200,
  "risco": "",
  "criterios_aceite": [
    {
      "tipo": "guarda",
      "descricao": "typecheck não regride além do baseline",
      "cmd": "<comando de typecheck> 2>&1 | grep 'error' | grep -vic <escopo-baseline>",
      "espera": "0"
    },
    {
      "tipo": "alvo",
      "descricao": "Teste da frente verde (DEVE estar vermelho antes de implementar)",
      "cmd": "<runner> test/exemplo.test.ts 2>&1 | grep -E 'passed|failed'",
      "espera": "passed"
    },
    {
      "tipo": "avaliador",
      "descricao": "avaliador: <o que o juiz cobra por leitura do diff: INTEGRAÇÃO (importado e montado), não só existência; teste novo exercita o comportamento do objetivo, nunca tautologia; se a allowlist inclui testes, anti-afrouxamento: valores recalculados com o porquê em comentário, nenhuma asserção removida, nenhum skip>",
      "cmd": "true",
      "espera": "avaliador"
    }
  ],
  "status": "pendente",
  "notas_status": "",
  "hash_candidato": "",
  "sinal_hash": "",
  "gate_ok": "",
  "pid": null,
  "iniciado_em": "",
  "adiado_ate": ""
}
```

### Dicionário

| Campo | Regras |
|---|---|
| `id` | Identidade estável; arquivo = `<id>-<slug>.md`; branch = `frente/<id>`. Deps referenciam ESTE campo, nunca o nome do arquivo. Número DENTRO da faixa do bloco (`mapa.json`). Atribuído por script quando a origem é máquina. |
| `bloco` / `frente` | IDs de `mapa.json`. Usados no writeback e no planejador; NÃO entram no prompt do executor. |
| `origem` | `humano` \| `planejador` \| `sentinela`. Decide se o juiz de ticket roda e para quem `refatiar` volta. |
| `objetivo` | Corpo do prompt do executor. Frase imperativa. |
| `pathspec_allowlist` | Globs. O enforcement FALHA se o diff tocar qualquer arquivo fora. Máximo `gate_ticket.max_paths_allowlist`. Migrations só como arquivo no diretório de migrations. |
| `cria_novo` | Paths da allowlist que ainda não existem (o recon aceita). Qualquer outro path da allowlist precisa existir no disco. |
| `dependencias` | `id` de outro ticket (resolve quando `done`) ou `humano:<token>` (resolve pelo arquivo de liberações). Obrigatória entre tickets com allowlist sobreposta. |
| `diff_estimado` | Linhas. Declarado por quem escreve. Acima de `diff_cap_ticket` o gate descarta. |
| `risco` | `baixo` \| `alto`. Preenchido pelo gate (passo 6). Humano pode forçar `alto`, nunca `baixo`. |
| `criterios_aceite[].tipo` | `alvo`: DEVE falhar antes e passar depois (mínimo 1 por ticket). `guarda`: regressão, pode estar verde antes. `avaliador`: instrução ao juiz, `cmd: "true"`. |
| `criterios_aceite[].cmd` | Só prefixos de `gate_ticket.cmd_prefixos_permitidos`. Roda com timeout, em worktree, sem env de produção. Robusto > exato. |
| `status` | `candidato` → `pendente` → `em_execucao` → `done` \| `bloqueado` \| `refatiar`; `descartado` (só do gate). Só a automação escreve, exceto `orq promover` no dry-run. |
| `notas_status` | Último motivo (aprovação, reprovação, descarte com passo do gate, bloqueio). Reprovação alimenta o diagnóstico do retry. |
| `hash_candidato` | sha256 de `objetivo + allowlist + critérios + dependencias`. Descarte guarda o hash por 7 dias; hash repetido é descartado sem gate. Deps entram no hash para que a reemissão com dependência acrescentada seja candidato novo. |
| `gate_ok` | Timestamp do último gate verde (passos 1 a 6). Vazio em ticket humano novo: o executor roda o gate antes de gastar. |
| `sinal_hash` | Só sentinela. Liga o ticket ao sinal para dedupe e baseline. |
| `pid` / `iniciado_em` / `adiado_ate` | Staleness (`em_execucao` zumbi volta a `pendente`) e cooldown. |

### Contrato inviolável (herdado por tudo que o ticket gerar)

- Zona proibida (ver `000-config.json`): zero escrita, zero DDL.
- O loop nunca: pusha a branch principal, aplica DDL (só escreve `.sql`), toca credenciais, gasta dinheiro, escreve em `paths_harness`.
- `git add` sempre por pathspec explícito (nunca `-A`/`.`).
- Sem narração no output: saída útil é o commit. Impedimento vira linha `IMPEDIMENTO:` no corpo do commit.
- Lição aprendida neste ticket → linha no PLAYBOOK no MESMO commit.

## Régua de granularidade (obrigatória, vale para humano e planejador)

> **Um ticket = uma unidade que, se reprovar, você aceita refazer inteira.**

O recurso escasso não é tempo de máquina: é cota de API. Ticket gordo que reprova
queima o dia; ticket fino demais gasta um ciclo de juiz para trinta linhas.

| Sinal | Ação |
|---|---|
| Diff estimado > 600 linhas | FATIAR, mesmo que o conteúdo seja repetitivo |
| Toca mais de uma camada (schema + backend + UI) | FATIAR por camada |
| Menos de ~50 linhas e mesma camada do ticket vizinho | JUNTAR |
| Toca arquivo que outro ticket pendente também toca | separado, COM dependência declarada |
| Nenhum critério `alvo` | não é ticket; é guarda solta. Reescrever |

Corolários: UI = **uma tela por ticket**, nunca "a onda inteira". Migrations = uma função
por ticket quando o corpo for complexo; famílias repetitivas em lotes de ~5. Refactor
mecânico = agrupar por diretório, respeitando o teto de linhas.
