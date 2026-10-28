# Origem das fixtures da L11 (gate de instável)

Copiadas do comarka-operacional, só leitura (`docs/fila/runs/`, motor do Comarka com o
`86dec07`), sem edição de conteúdo: `sed -n <faixa>p` do arquivo real, com a cor ANSI.
Medição no `~/orq-sessoes/relatorio-kit-l11.md`.

| arquivo | origem | papel |
|---|---|---|
| vitest-1523-attempt-1.txt | runs/1523/attempt-1/gate-vitest.txt, linhas 3818-3856 (de 3856) | a cauda da suíte de 28/10 13:49: um FAIL em `test/estado-plano-orfas.test.ts`, fora do diff (`scripts/roadmap/plano.py`, `test/plano-brief.test.ts`) e da allowlist (os mesmos dois); `Test Files  1 failed` |
| isolado-1523-attempt-1.txt | runs/1523/attempt-1/isolado-1.txt, inteiro | o mesmo arquivo rodado isolado 3 s depois: 6/6 verdes |
| vitest-5263-attempt-1.txt | runs/5263/attempt-1/gate-vitest.txt, linhas 3530-3581 (de 3581) | dois instáveis no mesmo run (24/10 16:01): `test/estado-plano-orfas.test.ts` e `test/sem-segredo-no-repo.test.ts` (timeout de 5000 ms); `Test Files  2 failed`. Diff e allowlist: `supabase/migrations/20261023020200_inteligencia_fase2_anon_sistema_fila_erros.sql`, `test/inteligencia/fase2-anon-sistema-fila-erros.test.ts` |
