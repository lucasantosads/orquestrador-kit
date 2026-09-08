# PEÇAS — backlog de `<projeto>`

> **Backlog, não histórico.** O que já aconteceu e o porquê ficam no CHANGELOG e nos
> commits. Aqui fica o que ainda vai acontecer, em ordem, e uma peça sai desta lista
> quando o commit dela existe.
>
> **Formato de cada peça:** uma linha de objetivo · evidência (arquivo e linha no
> disco, ou a medição) · teste que prova. Sem os três, não é peça — é ideia.
>
> Este arquivo é do REPO, não do motor: o `instalar.sh` o cria no `--novo` e nunca
> mais o toca. `docs/roadmap/MAPA.md` é o roadmap de PRODUTO (blocos → frentes →
> tickets); este é o backlog do que o loop **não** faz sozinho — harness,
> ferramenta, decisão de infraestrutura.

## FEITAS

(nenhuma ainda)

## PENDENTES

- **Preencher `docs/fila/000-config.json`.** O arquivo nasceu do template e está
  cheio de placeholders `<...>`.
  *Evidência:* `bash scripts/orq config` sai != 0 e lista cada um.
  *Pronto quando:* `orq config` sai 0.

- **Medir o baseline de typecheck.** O gate compara contra o baseline, nunca
  contra zero absoluto: rode o typecheck HOJE, conte os erros herdados e registre
  número + escopo (regex de arquivos) em `gates[].baseline`.
  *Evidência:* a contagem, na data em que foi feita.
  *Pronto quando:* o número no config é o número no disco.

- **Pré-voo GO.** `docs/orquestrador/skill/references/pre-voo.md`, categorias 0 a 6.
  *Pronto quando:* a tabela GO/NO-GO está em `docs/fila/runs/pre-voo-<data>.md`.

- **Primeiro ticket-fixture atravessa o loop.** Um ticket trivial (criar um arquivo
  + teste) de ponta a ponta, com merge na branch de staging.
  *Pronto quando:* o merge aparece na staging e `orq ticket <id>` mostra a
  evidência da tentativa.

- **Agendar (`instalar-launchd.sh`).** Só DEPOIS do config preenchido e do
  ticket-fixture — o instalador do job RECUSA sem `launchd.label`, de propósito.
  *Pronto quando:* `launchctl print` mostra o job com o label do config.
