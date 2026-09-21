# Ticket — carteira-table-codigo-morto

## Objetivo (prosa)

carteira-table.tsx tem 182 linhas e zero importadores.

## Campos de máquina

```json
{
  "id": "148",
  "bloco": "B1",
  "lane": "ux",
  "perfil": "frontend",
  "slug": "carteira-table-codigo-morto",
  "objetivo": "(Auditoria Comercial 21/08, achado #7. Recon revalidado em 22/08 contra origin/staging-auto: continua orfao.) src/components/carteira/carteira-table.tsx tem 182 linhas e nenhum import em todo o src — o unico match do grep e a propria definicao. TAREFA: remover o arquivo. Se a pasta src/components/carteira/ ficar vazia, remover a pasta tambem. FORA DE ESCOPO: a tela /dashboard/carteira (que e um redirect de 14 linhas, tratada no ticket 151); qualquer outra limpeza.",
  "pathspec_allowlist": [
    "src/components/carteira/**"
  ],
  "recon_esperado": [
    {
      "descricao": "arquivo existe e e orfao (estado antes)",
      "cmd": "grep -rn 'CarteiraTable\\|carteira/carteira-table' src | grep -vc '^src/components/carteira/carteira-table.tsx' || true",
      "espera": "0"
    }
  ],
  "criterios_aceite": [
    {
      "descricao": "arquivo removido",
      "cmd": "test -e src/components/carteira/carteira-table.tsx && echo EXISTE || echo REMOVIDO",
      "espera": "REMOVIDO"
    },
    {
      "descricao": "build verde",
      "cmd": "rm -rf .next && npm run build > /dev/null 2>&1 && echo BUILD_OK",
      "espera": "BUILD_OK"
    },
    {
      "descricao": "avaliador: apenas o arquivo orfao removido; nenhum outro arquivo tocado; build e suite verdes",
      "cmd": "true",
      "espera": "avaliador"
    }
  ],
  "status": "done",
  "notas_status": "aprovado (tentativa 2): Diff remove exatamente o arquivo orfao (182 linhas), nenhum outro arquivo tocado; gates tsc/vitest/build verdes. Escopo respeitado: /dashboard/carteira intacta.",
  "dependencias": []
}
```
