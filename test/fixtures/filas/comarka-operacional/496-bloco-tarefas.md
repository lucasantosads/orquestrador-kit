# Ticket 496 — Bloco Tarefas abertas do cliente

> Serie Visao v2 da ficha do cliente. Plano: `docs/roadmap/PLANO-VISAO-V2.md`.
> Mockup: `docs/roadmap/mockups/visao-geral-ficha-cliente.html`.
> Origem: plano, V17.

## Objetivo (prosa)

`tarefas_kanban.cliente_id` tem 23 tarefas e e lida por 27 arquivos em `src/`;
`src/app/api/tarefas-kanban/route.ts` e a rota principal.

## Campos de maquina

```json
{
  "id": "496",
  "slug": "bloco-tarefas",
  "lane": "produto",
  "perfil": "frontend",
  "objetivo": "Monte o bloco Tarefas na Visao: tarefas abertas do cliente, com as atrasadas\nprimeiro. Permita concluir uma tarefa e criar tarefa nova pelo proprio bloco,\nsem sair da Visao, usando as rotas de `tarefas_kanban` que ja existem em vez de\ncriar rota nova. Cliente sem tarefa aberta vira uma linha com a acao de criar,\nnunca card vazio nem contador zerado. REGRAS DE COPY E ESTADO, valem para tudo que este ticket tocar: ausencia e sempre a palavra \"sem base\", em cinza, com o motivo quando couber, e nunca \"s/ dado\", \"sem dado\" ou 0; \"Nao calculavel\" sempre escrito com acento (Nao calculavel); bloco vazio e uma linha (Rotulo, ponto medio, Acao), nunca card nem heading; sem periodo anterior real nao existe seta, cor nem variacao; nenhum travessao em copy de interface; zona C0 e leitura pura, clientes_receita.fidelidade_fim inclusive; Set e Map so com Array.from; largura de referencia 1366 a 1440px.",
  "pathspec_allowlist": [
    "src/app/dashboard/clientes/[id]/_components/bloco-tarefas.tsx",
    "src/app/dashboard/clientes/[id]/tabs/geral-tab.tsx",
    "test/bloco-tarefas-visao.test.tsx"
  ],
  "dependencias": [
    "491",
    "493",
    "494",
    "495"
  ],
  "prioridade": 1,
  "recon_esperado": [
    {
      "descricao": "a rota de tarefas ja existe",
      "cmd": "test -f src/app/api/tarefas-kanban/route.ts && echo EXISTE",
      "espera": "EXISTE"
    },
    {
      "descricao": "o bloco ainda nao existe",
      "cmd": "test -e 'src/app/dashboard/clientes/[id]/_components/bloco-tarefas.tsx' && echo EXISTE || echo AUSENTE",
      "espera": "AUSENTE"
    }
  ],
  "criterios_aceite": [
    {
      "descricao": "tsc nao regride alem do baseline de 3 em src/",
      "cmd": "( [ \"$(npx tsc --noEmit 2>&1 | grep 'error TS' | grep -c '^src/')\" = 3 ] ) && echo OK || echo FAIL",
      "espera": "OK",
      "tipo": "guarda"
    },
    {
      "descricao": "o bloco existe",
      "cmd": "test -f 'src/app/dashboard/clientes/[id]/_components/bloco-tarefas.tsx' && echo EXISTE || echo AUSENTE",
      "espera": "EXISTE"
    },
    {
      "descricao": "a pasta de rotas de tarefas nao ganha rota nova",
      "cmd": "ls src/app/api/tarefas-kanban/ | wc -l | tr -d ' '",
      "espera": "13",
      "tipo": "guarda"
    },
    {
      "descricao": "nenhuma forma antiga de ausencia no componente",
      "cmd": "grep -ohE 's/ dado|sem dado' 'src/app/dashboard/clientes/[id]/_components/bloco-tarefas.tsx' 2>/dev/null | wc -l | tr -d ' '",
      "espera": "0",
      "tipo": "guarda"
    },
    {
      "descricao": "teste novo verde (test/bloco-tarefas-visao.test.tsx)",
      "cmd": "test -f test/bloco-tarefas-visao.test.tsx && npx vitest run test/bloco-tarefas-visao.test.tsx 2>&1 | grep -E 'Tests +[0-9]+ passed|failed' | head -1 || echo ARQUIVO_AUSENTE",
      "espera": "passed"
    },
    {
      "descricao": "o componente esta IMPORTADO e MONTADO na Visao (existe branch de render que o renderiza), nao apenas escrito no disco",
      "cmd": "",
      "espera": "avaliador"
    },
    {
      "descricao": "atrasadas vem primeiro; concluir e criar funcionam inline; sem tarefa aberta e uma linha com acao",
      "cmd": "",
      "espera": "avaliador"
    }
  ],
  "status": "pendente",
  "notas_status": "",
  "cria_novo": [
    "src/app/dashboard/clientes/[id]/_components/bloco-tarefas.tsx",
    "test/bloco-tarefas-visao.test.tsx"
  ]
}
```
