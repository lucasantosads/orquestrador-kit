# Defeito: o plist do launchd fica solto na árvore do kit

Origem: canário 001 da fila do kit (M-68), 09/11/2026. Estado: **fechado (etapa DEFEITO-KF, P2)**.

## O que acontece

O `instalar-launchd.sh` renderiza o plist instanciado dentro do checkout e só depois o copia para
`~/Library/LaunchAgents`:

```
instalar-launchd.sh:97    GERADO="$CHECKOUT/scripts/orquestrador/$LABEL.plist"
instalar-launchd.sh:185   renderiza > "$GERADO"
instalar-launchd.sh:194   cp "$GERADO" "$DST"
```

Todo repo da frota ignora esse arquivo no próprio `.gitignore` (comarka-operacional:47-48,
actus-saas:45, conteudos-infinitos:53, por nome; dashboard-comercial-orq por glob
`scripts/orquestrador/*.plist` no `.git/info/exclude`). O `.gitignore` do kit não ignorava. Quando o
kit passou a rodar a própria fila (M-68), o plist `com.orquestrador-kit.orquestrador.plist` ficou
como `??` no checkout principal e o preflight adiou o ticket por árvore suja.

## Trilha real

`docs/fila-kit/runs/events.log` do checkout principal, 09/11:

```
2026-11-09T00:56:10-0300 001 ADIADO motivo=preflight causa=preflight: árvore de execução suja em /Users/lucasantos/Projetos/orquestrador-kit — commite ou stashe antes:\n?? scripts/orquestrador/com.orquestrador-kit.orquestrador.plist
```

Contorno local até aqui: a linha `scripts/orquestrador/com.orquestrador-kit.orquestrador.plist` em
`.git/info/exclude` do checkout principal (pode sair depois do merge).

## Conserto

Linha `scripts/orquestrador/*.plist` no `.gitignore` do kit. Por sufixo, não por nome: o nome muda
com o `launchd.label` (a mesma regra do `instalar.sh`, que já deixa `*.plist` fora da comparação do
motor). O template termina em `.plist.template` e continua versionado. Renderizar fora da árvore
também resolveria, mas mexe no instalador de toda a frota para um efeito que uma linha cobre.

## Critério executável

`TZ=UTC node_modules/.bin/vitest run test/orquestrador-defeito-kf-plist.test.ts`: num checkout git
descartável com o `.gitignore` do kit, o instalador e o config da fila do kit, depois do
`instalar-launchd.sh --permitir-tmp --config docs/fila-kit/000-config.json` com `launchctl`
stubado, o `git status --porcelain` sai vazio (vermelho antes:
`?? scripts/orquestrador/com.orquestrador-kit.orquestrador.plist`).

## Fora deste conserto (anotado, não feito)

- O `instalar.sh --novo` acrescenta ao `.gitignore` de repo novo só `GITIGNORE_LINHAS`
  (`instalar.sh:626-627`: `docs/fila/PAUSAR` e `docs/fila/runs/`), e o `relatar_gitignore` não cobra
  o plist: um repo instalado do zero tem este mesmo defeito até alguém pôr a linha à mão.
- O `fixture/gitignore` (o checkout dos testes de harness) também não ignora o plist; os testes que
  instalam apagam o arquivo no `finally`.
