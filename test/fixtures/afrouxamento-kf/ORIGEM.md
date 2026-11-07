# Origem das fixtures da etapa KF (P1)

Copiadas do git do próprio kit, sem edição (`git show <sha> --format= -- <arquivo>`).

| arquivo | origem | papel |
|---|---|---|
| 617d6ba-agendamento.diff | `617d6ba` (K3, 08/09/2026), `test/orquestrador-agendamento.test.ts` | teste EXISTENTE, nunca ampliado, que ganhou dois `it.skip` (quarentena K7): passa sem a chave e reprova com `enforcement.afrouxamento: todo_teste` |
| 21cf14b-template-recon-novo.diff | `21cf14b` (L14b-P1, 02/11/2026), `test/orquestrador-template-recon.test.ts` | teste CRIADO pelo diff, com `toBeDefined`: fica de fora no modo `todo_teste` (decisão P-5 do Lucas, 07/11) |

Os configs são os reais já versionados: `test/fixtures/config/ci-000-config.json` e
`test/fixtures/l13/config-dashboard.json`.
