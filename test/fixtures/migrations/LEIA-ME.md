# Fixture da etapa MIG-A (P3)

Cópia reduzida do recon de 18/10/2026 (`~/orq-sessoes/recon-migrations/`):

- `comarka-arquivos.tsv`: os 272 arquivos de `supabase/migrations` do Comarka (união de
  `main`, `origin/staging-auto` e `origin/staging-apolo`), colunas `arquivo` e `refs`
  (as branches onde o arquivo existe), copiadas de `arquivos-migrations.tsv`.
- `comarka-producao.tsv`: as 491 linhas de `supabase_migrations.schema_migrations` do
  `ogfnojbbvumujzfklkhh`, exportadas pelo chat em 18/10 (`producao-migrations.tsv`),
  colunas `version`, `name` e `created_by`. Os nomes e as versões são os reais; o
  `created_by` real (o e-mail da conta, o mesmo nas 491 linhas) foi trocado por
  `conector-mcp`, que é o que ele significa: aplicada pelo conector do claude.ai.

Números que o teste trava (`cruzamento-producao.md`): com o corte 20261004, 6 pendentes
e 29 de drift; com o corte de hoje (a maior versão, 20261018030500) e herdados desde
20261004, drift zero, 5 herdados e 1 pendente (20261019000100).
