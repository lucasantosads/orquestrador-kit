# Ticket — onboarding-id-rota-morta

## Objetivo (prosa)

DECISAO NECESSARIA antes de executar: /dashboard/onboarding/[id] nunca renderiza nada e ninguem linka pra ela.

## Campos de máquina

```json
{
  "id": "147",
  "bloco": "B1",
  "lane": "ux",
  "perfil": "frontend",
  "slug": "onboarding-id-rota-morta",
  "objetivo": "DECISAO DO LUCAS (22/08): MATAR a rota. Dado que fundamenta: onboarding_checklist_items tem 108 linhas em apenas 4 notion_id distintos, entao reapontar produziria tela vazia para 233 dos 237 cards. CONDICAO DA DECISAO: o sheet lateral do kanban PRECISA cobrir integralmente o caso de uso de ver o detalhe de um onboarding (etapas, checklist, responsavel, prazo). Se o recon mostrar que o sheet NAO cobre, o ticket deve REPROVAR e voltar para reescrita como ampliacao do sheet — matar a rota nao pode deixar buraco funcional no modulo. (Auditoria Onboarding 21/08, achado #7.) A rota /dashboard/onboarding/[id] depende de /api/notion/onboarding/[id], que devolve blocks: [] hardcoded na linha 10; parseChecklists sempre recebe array vazio, entao a tela mostra 0/0 e nenhuma secao, sempre. Alem disso ha ZERO links de entrada em todo o src (grep de 'dashboard/onboarding/${' nao retorna nada). O sheet lateral do kanban ja cobre o caso de uso de ver o detalhe de um onboarding. TAREFA: remover src/app/dashboard/onboarding/[id]/ e src/app/api/notion/onboarding/[id]/, garantindo que o build continua verde e que nenhum link fica quebrado. RECON OBRIGATORIO ANTES DE REMOVER: abrir o sheet lateral do kanban e colar em comentario o que ele exibe hoje, provando que o caso de uso esta coberto. FORA DE ESCOPO: alterar o sheet lateral do kanban; qualquer DDL.",
  "pathspec_allowlist": [
    "src/app/dashboard/onboarding/[id]/**",
    "src/app/api/notion/onboarding/[id]/**",
    "test/onboarding-rota-morta.test.ts"
  ],
  "recon_esperado": [
    {
      "descricao": "API devolve blocks vazio hardcoded (estado antes)",
      "cmd": "grep -c 'blocks: \\[\\]' 'src/app/api/notion/onboarding/[id]/route.ts'",
      "espera": "1"
    },
    {
      "descricao": "zero links de entrada (estado antes)",
      "cmd": "grep -rn 'dashboard/onboarding/\\${' src --include=\"*.tsx\" | wc -l | tr -d ' '",
      "espera": "0"
    }
  ],
  "criterios_aceite": [
    {
      "descricao": "rota removida",
      "cmd": "test -e 'src/app/dashboard/onboarding/[id]' && echo EXISTE || echo REMOVIDA",
      "espera": "REMOVIDA"
    },
    {
      "descricao": "build verde",
      "cmd": "rm -rf .next && npm run build > /dev/null 2>&1 && echo BUILD_OK",
      "espera": "BUILD_OK"
    },
    {
      "descricao": "avaliador: rota e API removidas juntas; nenhum link quebrado; sheet lateral do kanban intacto; recon do sheet lateral colado provando cobertura do caso de uso; se o sheet NAO cobrir, REPROVAR",
      "cmd": "true",
      "espera": "avaliador"
    }
  ],
  "status": "obsoleto",
  "notas_status": "OBSOLETO: contrato em test/rotas-orfas.test.ts linha 163. A constante LEGACY_DINAMICA ja lista a rota como legado dinamico conhecido. Nao e orfa a remover. Mesma classe do 160 e 162: o contrato mora no teste.",
  "dependencias": []
}
```
