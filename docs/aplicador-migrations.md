# Aplicador de migrations (`orq migrations`)

O único caminho que aplica migration num banco (decisão de 18/10/2026). Ele roda do
checkout principal do kit, no terminal, e trabalha por **banco**: os repos cujas
migrations vão para o mesmo banco estão juntos no bloco `migrations.bancos` do
`~/.orq/repos.json`. Contrato completo: `CONTRATO.md` §20.

## 1. Configurar o banco (uma vez)

No `~/.orq/repos.json`, ao lado de `"repos"`:

```json
"migrations": { "bancos": { "comarka": {
  "ferramenta": "supabase",
  "banco_id": "ogfnojbbvumujzfklkhh",
  "repos": [
    { "repo": "comarka-operacional", "dir": "supabase/migrations",
      "refs": ["HEAD", "origin/staging-auto", "origin/staging-apolo"],
      "credencial_env": "SUPABASE_ACCESS_TOKEN", "env_arquivo": ".env.local",
      "token": { "formato": "liberadas", "molde": "migration-{id}-aplicada", "por": "lucas" },
      "pre_check": ["python3", "scripts/roadmap/checar-promocao.py", "--aplicar", "{arquivo}"] },
    { "caminho": "~/Projetos/dashboard-comercial", "dir": "supabase/migrations", "somente_leitura": true }
  ]
} } }
```

- `credencial_env` é o **nome** da variável no `.env.local` do repo. O valor nunca vai
  para o repos.json, nunca é impresso e só o script o lê.
- O dashboard-comercial fica **fora** de `"repos"`: entra só aqui, como `somente_leitura`,
  para o plano e o drift.
- `orq migrations status` acusa qualquer erro de config, campo por campo.

## 2. Sonda e linha de base (uma vez por banco)

```bash
orq migrations sonda comarka
orq migrations linha-base comarka --herdados-desde 20261004
orq migrations plano comarka
```

- **sonda**: confere que duas instruções no mesmo texto rodam na mesma transação. Sem ela
  verde, o `aplicar` recusa.
- **linha-base**: grava em `~/.orq/migrations/comarka.json` o que está em produção agora
  (o corte é a maior versão). Os arquivos com versão entre o `--herdados-desde` e o corte
  que ainda não estão no ledger viram **herdados**, que o plano mostra à parte e o
  aplicador pode aplicar. Nada abaixo do piso é cobrado. Trocar a linha de base depois
  pede `--substituir`.
- **plano**: pendentes (acima do corte), herdados, drift (linha de produção acima do
  corte sem arquivo em nenhum repo do banco) e o que entrou desde o corte, com o
  `created_by` de cada linha (`orq-aplicador:<usuário>` é o aplicador).

## 3. Aplicar

```bash
orq migrations aplicar comarka-operacional 20261018003100_nps_fila_e_resposta_por_contato.sql
```

1. O comando confere tudo antes de escrever qualquer coisa:
   - a pausa (do aplicador e do repo);
   - a trava do banco;
   - se o arquivo está no plano;
   - o token (lido do cabeçalho do `.sql`; `--token humano:migration-<id>-aplicada` se o
     arquivo não cita um, ou cita mais de um);
   - o SQL e o `pre_check` do repo.
2. Mostra o SQL inteiro, o ref de onde ele veio e o aviso de classe (DROP, GRANT, POLICY,
   ...).
3. Pede a **versão digitada**. Qualquer outra resposta cancela.
4. Aplica numa transação só, com a versão e o nome do arquivo no `schema_migrations`.
5. **Confere** que a linha entrou.
6. Só então commita o token no `docs/fila/liberacoes.json` do repo: um commit só dele, com
   o trailer `Orq-Aplicador:`. **Não dá push**: o push segue no ritual.

Se a resposta for `INCERTO` (timeout, 5xx), o aplicador não emitiu token. Rode
`orq migrations plano <banco>`:
- se a versão aparece em "aplicadas desde o corte", libere o token à mão com a nota que o
  aplicador imprimiu;
- se não aparece, tente de novo.

## 4. Pausar

- `touch ~/.orq/MIGRATIONS_PAUSADO`: nenhum `aplicar` roda até o arquivo sair. O
  `status` e o `plano` continuam.
- O `pausar_file` do repo e o `docs/fila/.orq-pause` (ritual ou promoção) também
  recusam o `aplicar` daquele repo.

## 5. O que o aplicador nunca faz

- push, merge, ou escrever no repo outro arquivo que não o de liberação;
- usar o `apply_migration` ou o `execute_sql` do conector, ou o `POST /database/migrations`
  (que grava a hora da aplicação como versão);
- imprimir ou gravar a credencial;
- aplicar sem TTY, sem a versão digitada ou sem a sonda verde;
- emitir token sem conferir a linha no `schema_migrations`;
- renomear arquivo ou mexer em linha antiga do ledger.

Rastro de tudo: `~/.orq/migrations/ledger.jsonl`.
