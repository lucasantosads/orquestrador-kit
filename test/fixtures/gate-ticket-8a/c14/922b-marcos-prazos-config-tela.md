# Ticket 922b: prazos dos marcos: tela em Configurações

> Fonte de máquina é o bloco ```json. A prosa é para humanos.

## Objetivo (prosa)

Ticket B2 da frente de marcos: a Tela 3 do mockup aprovado em 09/10 (`docs/specs/2026-10-09-aba-conta-marcos.md`). A tabela é agrupada por produto, e um alerta no topo lista produto com marco sem prazo. A tela tem link para editar as etapas no modelo de onboarding, porque a lista de marcos mora lá e esta tela só define prazos. Só liderança salva.

Hoje não existe "Produtos e escopo" em Configurações (nav em `src/lib/nav/papel.ts:296-364`, 9 telas). A trilha da página mostra "Configurações › Produtos e escopo › Prazos dos marcos", e a entrada nova na nav é "Prazos dos marcos", só para CONFIG (diretor/admin). Com isso a asserção do head em `test/nav-papel.test.ts` fica como está.

## Recon de 09/10

```
test/nav-papel.test.ts:256-285  lista exata de 9 ids de config para diretor/admin; head = ['config.briefings-criativos']
test/nav-5-grupos.test.tsx:70   so config.equipe-cargos sem href
src/lib/nav/papel.ts:182 CONFIG = ['diretor','admin']; :179 LIDERANCA = ['diretor','admin','head']
modelo de onboarding: /dashboard/onboarding/motor/templates (Switch "Aparece na linha do tempo do contrato" = marco_contrato)
```

## Campos de máquina

```json
{
  "id": "922b",
  "slug": "marcos-prazos-config-tela",
  "lane": "produto",
  "perfil": "frontend",
  "objetivo": "ORCAMENTO DE DIFF: teto de 460 linhas (~60 em src/app/dashboard/config/prazos-marcos/page.tsx, ~250 em src/app/dashboard/config/prazos-marcos/prazos-marcos-view.tsx, ~8 em src/lib/nav/papel.ts, ~4 em test/nav-papel.test.ts, ~130 em test/prazos-marcos-tela.test.tsx). Se passar do teto, pare e reporte. SPEC: docs/specs/2026-10-09-aba-conta-marcos.md, Tela 3 (mockup 'Configurações › Prazos dos marcos' aprovado em 09/10). DEPENDE do 922 (GET/PUT /api/config/marcos-prazos). Leia antes PRODUCT.md, DESIGN.md (tokens, Geist Mono para numeros, cor e sinal) e a skill de UI do Comarka OS se disponivel. FAZER: (1) NOVO src/app/dashboard/config/prazos-marcos/prazos-marcos-view.tsx: export function PrazosMarcosView({dados, salvando, onSalvar}) pura (sem fetch): cabecalho com trilha 'Configurações › Produtos e escopo › Prazos dos marcos'; quando dados.alerta nao vazio, UMA faixa no topo (cor de risco) 'N produtos com marco sem prazo' listando produto e marcos; link 'Editar etapas no modelo de onboarding' para /dashboard/onboarding/motor/templates (a lista de marcos se edita la; esta tela so define prazos). Uma tabela agrupada por produto (linha de grupo com o nome do produto) com as colunas exatas Marco | Conta a partir de | Prazo (dias) | Avisar antes (dias) | Justificativa se atrasar | Ativo. 'Conta a partir de' e um select com 'Assinatura do contrato', 'Fim da fidelidade' e os outros marcos do MESMO produto; 'Justificativa se atrasar' alterna Obrigatória/Opcional; marco sem prazo mostra os campos vazios com 'sem prazo' (nunca 0 preenchido). Numeros em fonte mono. Sem pode_editar: campos desabilitados e texto 'Só liderança altera os prazos', sem botao Salvar. Botao 'Salvar' por produto chama onSalvar(produto_id, prazos). Erro 422 do servidor aparece na linha do produto. Produto sem nenhum marco nao aparece na tabela. (2) NOVO src/app/dashboard/config/prazos-marcos/page.tsx: 'use client'; busca GET /api/config/marcos-prazos com fetchJson de @/lib/fetch-json; carregando e erro com texto humano e Tentar de novo; salvar faz PUT e recarrega. Nao importa getSession (server-only). (3) src/lib/nav/papel.ts: tela nova no grupo config, logo depois de 'config.onboarding-motor': { id: 'config.prazos-marcos', rotulo: 'Prazos dos marcos', href: '/dashboard/config/prazos-marcos', visivelPara: CONFIG }. (4) test/nav-papel.test.ts: RECALCULE a lista exata de 'Configurações só para admin e diretor' inserindo 'config.prazos-marcos' depois de 'config.onboarding-motor', com comentario acima explicando 'Ticket 922b: Prazos dos marcos entra depois do Motor (CONFIG); 9 ids viram 10.' Nenhuma outra assercao muda. (5) NOVO test/prazos-marcos-tela.test.tsx (renderToStaticMarkup da view, padrao de test/bloco-radar-renovacao.test.tsx): as 6 colunas na ordem; faixa de alerta so com marco sem prazo; agrupamento por produto; sem pode_editar nao ha botao Salvar; marco sem prazo nao renderiza '0' nos campos; link para o modelo de onboarding; nenhuma string com nome de tabela (ops_, marco_prazo). Regras do repo: sem .json() novo; sem travessao (U+2014); sem Card dentro de Card; WCAG AA (label em todo input). FORA DE ESCOPO: editar etapas ou modelo; rota (922); qualquer outra tela de Configuracoes; mudar visibilidade de outras telas.",
  "cria_novo": [
    "src/app/dashboard/config/prazos-marcos/page.tsx",
    "src/app/dashboard/config/prazos-marcos/prazos-marcos-view.tsx",
    "test/prazos-marcos-tela.test.tsx"
  ],
  "pathspec_allowlist": [
    "src/app/dashboard/config/prazos-marcos/page.tsx",
    "src/app/dashboard/config/prazos-marcos/prazos-marcos-view.tsx",
    "src/lib/nav/papel.ts",
    "test/nav-papel.test.ts",
    "test/prazos-marcos-tela.test.tsx"
  ],
  "dependencias": [
    "922"
  ],
  "prioridade": 60,
  "recon_esperado": [
    {
      "descricao": "src/app/dashboard/config/prazos-marcos/page.tsx ainda nao existe",
      "cmd": "test -e 'src/app/dashboard/config/prazos-marcos/page.tsx' && echo EXISTE || echo AUSENTE",
      "espera": "AUSENTE"
    },
    {
      "descricao": "src/app/dashboard/config/prazos-marcos/prazos-marcos-view.tsx ainda nao existe",
      "cmd": "test -e 'src/app/dashboard/config/prazos-marcos/prazos-marcos-view.tsx' && echo EXISTE || echo AUSENTE",
      "espera": "AUSENTE"
    },
    {
      "descricao": "test/prazos-marcos-tela.test.tsx ainda nao existe",
      "cmd": "test -e 'test/prazos-marcos-tela.test.tsx' && echo EXISTE || echo AUSENTE",
      "espera": "AUSENTE"
    },
    {
      "descricao": "config tem 9 telas e o teste fixa a lista com 9 ids",
      "cmd": "n=$(sed -n \"/id: 'config',/,/^  },/p\" src/lib/nav/papel.ts | grep -c \"id: 'config[.]\"); m=$(grep -c \"'config.briefings-criativos',\" test/nav-papel.test.ts); [ \"$n\" = 9 ] && [ \"$m\" = 1 ] && echo NOVE || echo ST_${n}_${m}",
      "espera": "NOVE"
    }
  ],
  "criterios_aceite": [
    {
      "descricao": "tsc nao regride alem do baseline de 3 (src/ e test/, sem ruido de .next)",
      "cmd": "( [ \"$(npx tsc --noEmit 2>&1 | grep 'error TS' | grep -vc '^\\.next/')\" = 3 ] ) && echo OK || echo FAIL",
      "espera": "OK",
      "tipo": "guarda"
    },
    {
      "descricao": "nenhum .sql novo (zero DDL)",
      "cmd": "b=\"$(git merge-base HEAD staging-auto)\"; n=$(git diff --name-only \"$b\" HEAD | grep -c '[.]sql$'); [ \"$n\" = 0 ] && echo SEM_SQL || echo SQL_$n",
      "espera": "SEM_SQL",
      "tipo": "guarda"
    },
    {
      "descricao": "so arquivos da allowlist foram tocados",
      "cmd": "b=\"$(git merge-base HEAD staging-auto)\"; r=SO_ALLOWLIST; for f in $(git diff --name-only \"$b\" HEAD); do printf '%s\\n' 'src/app/dashboard/config/prazos-marcos/page.tsx' 'src/app/dashboard/config/prazos-marcos/prazos-marcos-view.tsx' 'src/lib/nav/papel.ts' 'test/nav-papel.test.ts' 'test/prazos-marcos-tela.test.tsx' | grep -Fxq \"$f\" || r=FORA_$f; done; echo $r",
      "espera": "SO_ALLOWLIST",
      "tipo": "guarda"
    },
    {
      "descricao": "diff dentro do orcamento (<= 460 linhas somando adicoes e remocoes)",
      "cmd": "b=\"$(git merge-base HEAD staging-auto)\"; t=$(git diff --numstat \"$b\" HEAD | awk '{s+=$1+$2} END {print s+0}'); [ \"$t\" -le 460 ] && echo NO_TETO || echo ESTOUROU_$t",
      "espera": "NO_TETO",
      "tipo": "guarda"
    },
    {
      "descricao": "guardas globais seguem verdes",
      "cmd": "npx vitest run test/c0-guard.test.ts test/fetch-json-teto.test.ts test/travessao-mudo.test.ts >/dev/null 2>&1 && echo VERDE || echo VERMELHO",
      "espera": "VERDE",
      "tipo": "guarda"
    },
    {
      "descricao": "tela nova na nav, so CONFIG, com href da pagina",
      "cmd": "test -f src/app/dashboard/config/prazos-marcos/page.tsx && n=$(grep -c \"id: 'config.prazos-marcos'\" src/lib/nav/papel.ts) && h=$(grep -c \"href: '/dashboard/config/prazos-marcos'\" src/lib/nav/papel.ts) && [ \"$n\" = 1 ] && [ \"$h\" = 1 ] && echo NA_NAV || echo ST",
      "espera": "NA_NAV",
      "tipo": "alvo"
    },
    {
      "descricao": "anti-afrouxamento: nav-papel recalculado para 10 ids com comentario do 922b e sem assercao removida",
      "cmd": "b=\"$(git merge-base HEAD staging-auto)\"; a=$(grep -c \"'config.prazos-marcos',\" test/nav-papel.test.ts); c=$(grep -c '922b' test/nav-papel.test.ts); r=$(git diff \"$b\" HEAD -- test/nav-papel.test.ts | grep -cE '^-[^-]'); e=$(grep -c 'expect(' test/nav-papel.test.ts); [ \"$a\" = 1 ] && [ \"$c\" -ge 1 ] && [ \"$r\" = 0 ] && echo RECALCULADO_$e || echo ST_${a}_${c}_${r}",
      "espera": "RECALCULADO_"
    },
    {
      "descricao": "a tela nao importa getSession (server-only) e usa fetchJson",
      "cmd": "test -f src/app/dashboard/config/prazos-marcos/page.tsx && s=$(grep -c 'getSession' src/app/dashboard/config/prazos-marcos/page.tsx src/app/dashboard/config/prazos-marcos/prazos-marcos-view.tsx | awk -F: '{s+=$2} END {print s+0}') && f=$(grep -c 'fetchJson' src/app/dashboard/config/prazos-marcos/page.tsx) && [ \"$s\" = 0 ] && [ \"$f\" -ge 1 ] && echo CLIENTE_OK || echo ST",
      "espera": "CLIENTE_OK"
    },
    {
      "descricao": "testes verdes (test/prazos-marcos-tela.test.tsx, test/nav-papel.test.ts, test/nav-5-grupos.test.tsx, test/rotas-orfas.test.ts, test/onboarding-menu.test.ts, test/nav-papel-sidebar.test.tsx)",
      "cmd": "test -f test/prazos-marcos-tela.test.tsx && npx vitest run test/prazos-marcos-tela.test.tsx test/nav-papel.test.ts test/nav-5-grupos.test.tsx test/rotas-orfas.test.ts test/onboarding-menu.test.ts test/nav-papel-sidebar.test.tsx >/dev/null 2>&1 && echo VERDE || echo VERMELHO",
      "espera": "VERDE"
    },
    {
      "descricao": "avaliador: tela 3 da spec: tabela agrupada por produto com as 6 colunas, alerta no topo para produto com marco sem prazo, link para editar etapas no modelo de onboarding, so lideranca salva. REPROVE se: lista de marcos hardcoded no front; tela cria ou edita etapa; marco sem prazo exibido como 0; Salvar visivel sem pode_editar; nome de tabela/coluna em texto; Card aninhado; assercao do nav-papel removida ou afrouxada.",
      "cmd": "true",
      "espera": "avaliador",
      "tipo": "avaliador"
    }
  ],
  "testes_conferidos": [
    {
      "teste": "test/nav-5-grupos.test.tsx",
      "motivo": "fixa que so config.equipe-cargos nao tem href; a tela nova tem href; nao muda"
    },
    {
      "teste": "test/rotas-orfas.test.ts",
      "motivo": "pagina nova em /dashboard precisa de href na nav; a entrada nova cobre"
    },
    {
      "teste": "test/onboarding-menu.test.ts",
      "motivo": "config segue com /dashboard/onboarding/motor; nao muda"
    },
    {
      "teste": "test/nav-papel-sidebar.test.tsx",
      "motivo": "le a nav por papel; tela nova so CONFIG; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/menu-alertas-status.test.ts",
      "motivo": "le o grupo config; nao muda"
    },
    {
      "teste": "test/agregacoes-truncadas-ficha.test.ts",
      "motivo": "importa src/lib/nav/papel.ts pelo grafo (papelDe/navPorPapel); o 922b so acrescenta uma tela CONFIG no grupo config; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/apolo-acoes.test.ts",
      "motivo": "importa src/lib/nav/papel.ts pelo grafo (papelDe/navPorPapel); o 922b so acrescenta uma tela CONFIG no grupo config; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/aviso-comarka-pro.test.ts",
      "motivo": "importa src/lib/nav/papel.ts pelo grafo (papelDe/navPorPapel); o 922b so acrescenta uma tela CONFIG no grupo config; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/avisos-operacao.test.ts",
      "motivo": "importa src/lib/nav/papel.ts pelo grafo (papelDe/navPorPapel); o 922b so acrescenta uma tela CONFIG no grupo config; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/avisos-renovacao-nps.test.ts",
      "motivo": "importa src/lib/nav/papel.ts pelo grafo (papelDe/navPorPapel); o 922b so acrescenta uma tela CONFIG no grupo config; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/avisos-vacuo.test.ts",
      "motivo": "importa src/lib/nav/papel.ts pelo grafo (papelDe/navPorPapel); o 922b so acrescenta uma tela CONFIG no grupo config; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/carteira-membro.test.ts",
      "motivo": "importa src/lib/nav/papel.ts pelo grafo (papelDe/navPorPapel); o 922b so acrescenta uma tela CONFIG no grupo config; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/cifra-meta-sem-fallback.test.ts",
      "motivo": "importa src/lib/nav/papel.ts pelo grafo (papelDe/navPorPapel); o 922b so acrescenta uma tela CONFIG no grupo config; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/entrada-inicio-papel.test.ts",
      "motivo": "importa src/lib/nav/papel.ts pelo grafo (papelDe/navPorPapel); o 922b so acrescenta uma tela CONFIG no grupo config; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/equipe-pessoas-grupos-leitura.test.ts",
      "motivo": "importa src/lib/nav/papel.ts pelo grafo (papelDe/navPorPapel); o 922b so acrescenta uma tela CONFIG no grupo config; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/equipe-scorecard.test.tsx",
      "motivo": "importa src/lib/nav/papel.ts pelo grafo (papelDe/navPorPapel); o 922b so acrescenta uma tela CONFIG no grupo config; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/equipe-telefone-adicional.test.ts",
      "motivo": "importa src/lib/nav/papel.ts pelo grafo (papelDe/navPorPapel); o 922b so acrescenta uma tela CONFIG no grupo config; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/equipe-telefone-escrita.test.ts",
      "motivo": "importa src/lib/nav/papel.ts pelo grafo (papelDe/navPorPapel); o 922b so acrescenta uma tela CONFIG no grupo config; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/equipe-vincular-cliente.test.ts",
      "motivo": "importa src/lib/nav/papel.ts pelo grafo (papelDe/navPorPapel); o 922b so acrescenta uma tela CONFIG no grupo config; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/erro-string-tempo-reunioes.test.ts",
      "motivo": "importa src/lib/nav/papel.ts pelo grafo (papelDe/navPorPapel); o 922b so acrescenta uma tela CONFIG no grupo config; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/eventos-resposta-grupo.test.ts",
      "motivo": "importa src/lib/nav/papel.ts pelo grafo (papelDe/navPorPapel); o 922b so acrescenta uma tela CONFIG no grupo config; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/fila-item-abre.test.tsx",
      "motivo": "importa src/lib/nav/papel.ts pelo grafo (papelDe/navPorPapel); o 922b so acrescenta uma tela CONFIG no grupo config; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/getsession-legados-onboarding-churn.test.ts",
      "motivo": "importa src/lib/nav/papel.ts pelo grafo (papelDe/navPorPapel); o 922b so acrescenta uma tela CONFIG no grupo config; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/hoje-acoes.test.tsx",
      "motivo": "importa src/lib/nav/papel.ts pelo grafo (papelDe/navPorPapel); o 922b so acrescenta uma tela CONFIG no grupo config; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/inicio-carteira-tela.test.tsx",
      "motivo": "importa src/lib/nav/papel.ts pelo grafo (papelDe/navPorPapel); o 922b so acrescenta uma tela CONFIG no grupo config; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/inicio-consultas-constantes.test.ts",
      "motivo": "importa src/lib/nav/papel.ts pelo grafo (papelDe/navPorPapel); o 922b so acrescenta uma tela CONFIG no grupo config; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/inicio-equipe-api.test.ts",
      "motivo": "importa src/lib/nav/papel.ts pelo grafo (papelDe/navPorPapel); o 922b so acrescenta uma tela CONFIG no grupo config; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/inicio-midia-coletar.test.ts",
      "motivo": "importa src/lib/nav/papel.ts pelo grafo (papelDe/navPorPapel); o 922b so acrescenta uma tela CONFIG no grupo config; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/inicio-resumo-api.test.ts",
      "motivo": "importa src/lib/nav/papel.ts pelo grafo (papelDe/navPorPapel); o 922b so acrescenta uma tela CONFIG no grupo config; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/menu-grupo-comercial.test.ts",
      "motivo": "importa src/lib/nav/papel.ts pelo grafo (papelDe/navPorPapel); o 922b so acrescenta uma tela CONFIG no grupo config; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/meta-horas-fallback.test.ts",
      "motivo": "importa src/lib/nav/papel.ts pelo grafo (papelDe/navPorPapel); o 922b so acrescenta uma tela CONFIG no grupo config; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/metas-por-gestor.test.tsx",
      "motivo": "importa src/lib/nav/papel.ts pelo grafo (papelDe/navPorPapel); o 922b so acrescenta uma tela CONFIG no grupo config; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/meu-dia-fora-do-menu.test.ts",
      "motivo": "importa src/lib/nav/papel.ts pelo grafo (papelDe/navPorPapel); o 922b so acrescenta uma tela CONFIG no grupo config; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/meu-dia-textos.test.ts",
      "motivo": "importa src/lib/nav/papel.ts pelo grafo (papelDe/navPorPapel); o 922b so acrescenta uma tela CONFIG no grupo config; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/meu-tempo-so-do-proprio.test.ts",
      "motivo": "importa src/lib/nav/papel.ts pelo grafo (papelDe/navPorPapel); o 922b so acrescenta uma tela CONFIG no grupo config; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/operacao-inicio-registro.test.ts",
      "motivo": "importa src/lib/nav/papel.ts pelo grafo (papelDe/navPorPapel); o 922b so acrescenta uma tela CONFIG no grupo config; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/override-cor-api.test.ts",
      "motivo": "importa src/lib/nav/papel.ts pelo grafo (papelDe/navPorPapel); o 922b so acrescenta uma tela CONFIG no grupo config; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/override-cor-tela.test.tsx",
      "motivo": "importa src/lib/nav/papel.ts pelo grafo (papelDe/navPorPapel); o 922b so acrescenta uma tela CONFIG no grupo config; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/papel-nas-escritas.test.ts",
      "motivo": "importa src/lib/nav/papel.ts pelo grafo (papelDe/navPorPapel); o 922b so acrescenta uma tela CONFIG no grupo config; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/pauta-1a1.test.tsx",
      "motivo": "importa src/lib/nav/papel.ts pelo grafo (papelDe/navPorPapel); o 922b so acrescenta uma tela CONFIG no grupo config; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/relacao-promessa-lista.test.ts",
      "motivo": "importa src/lib/nav/papel.ts pelo grafo (papelDe/navPorPapel); o 922b so acrescenta uma tela CONFIG no grupo config; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/relacao-responder-api.test.ts",
      "motivo": "importa src/lib/nav/papel.ts pelo grafo (papelDe/navPorPapel); o 922b so acrescenta uma tela CONFIG no grupo config; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/relacao-subir-tarefa.test.ts",
      "motivo": "importa src/lib/nav/papel.ts pelo grafo (papelDe/navPorPapel); o 922b so acrescenta uma tela CONFIG no grupo config; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/saude-mesma-regra.test.ts",
      "motivo": "importa src/lib/nav/papel.ts pelo grafo (papelDe/navPorPapel); o 922b so acrescenta uma tela CONFIG no grupo config; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/selo-api.test.ts",
      "motivo": "importa src/lib/nav/papel.ts pelo grafo (papelDe/navPorPapel); o 922b so acrescenta uma tela CONFIG no grupo config; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/sinais-id-notion.test.ts",
      "motivo": "importa src/lib/nav/papel.ts pelo grafo (papelDe/navPorPapel); o 922b so acrescenta uma tela CONFIG no grupo config; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/team-redireciona-inicio.test.ts",
      "motivo": "importa src/lib/nav/papel.ts pelo grafo (papelDe/navPorPapel); o 922b so acrescenta uma tela CONFIG no grupo config; se quebrar, PARE e descreva"
    }
  ],
  "status": "pendente",
  "notas_status": ""
}
```
