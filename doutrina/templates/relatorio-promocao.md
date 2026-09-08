# Relatório de promoção · <ano>-S<semana>

> Gerado por `orq relatorio` (upsert). Base da sessão humana de 20 min. Se o item 3 estiver
> vermelho, não há promoção nesta semana.

## 1. Placar por bloco
| Bloco | done | pendente | bloqueado | descartado | frentes concluídas |
|---|---|---|---|---|---|

## 2. O que entrou na staging (`git log principal..staging`)
| Ticket | Commit | Arquivos | +/- |
|---|---|---|---|

## 3. Saúde da staging
- Suíte completa: rc <n> · <tempo>
- Smoke: rc <n>

## 4. Sentinela
- Novos: <n> · Em quarentena: <n> · Resolvidos: <n>

## 5. Decisões pendentes
<cópia de decisoes-pendentes.md>

## 6. Custo e qualidade
- Total: US$ <x> · por ticket aprovado: US$ <y> · tokens/ticket: <z>
- Aprovação de primeira: <p>% · Causa nº 1 de reprovação: <motivo=>

## 7. Migrations aguardando aplicação humana
- <arquivo.sql>

## 8. Blocos com DoD aguardando validação
- <B1>: <dod>

## Checklist do ritual
- [ ] DoD validado / decidido
- [ ] `.sql` aplicadas
- [ ] Decisões resolvidas (`/arquitetar --decisoes`)
- [ ] Tokens de `liberacoes.json` respondidos
- [ ] `git merge --no-ff staging` na principal (humano)
- [ ] Baseline da sentinela promovida
