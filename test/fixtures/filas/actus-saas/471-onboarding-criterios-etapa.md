# Ticket — Cliente descreve entrada e saída de cada etapa do funil

## Objetivo (prosa)

Fatia 2. Depois que o 470 trouxe as etapas reais, quem sabe o que cada uma
significa é o cliente, não a agência. As colunas `criterios_entrada` e
`criterios_saida` já existem em `comercial.funnel_stages` e estão vazias em
100% das linhas.

Exemplo real do porquê: no Covas, "Aguardando o cálculo" pode ser qualificação
(ainda avaliando o lead) ou apresentação (montando a oferta). Só o escritório
sabe. O motor usa essa descrição para inferir etapa.

## Campos de maquina

```json
{
  "id": "471",
  "bloco": "B2",
  "slug": "onboarding-criterios-etapa",
  "objetivo": "PASSO 0 DE RECON: localize a tela de briefing/onboarding do cliente (procure em src/app sob comercial/briefing) e a rota que a alimenta; confirme o padrao de gate de papel usado nelas. TAREFA: tela onde o gestor do tenant ve as etapas do funil dele, na ordem, e preenche para cada uma: o que faz um lead ENTRAR nessa etapa e o que faz ele SAIR. Grava em comercial.funnel_stages.criterios_entrada e criterios_saida. Campos opcionais — etapa sem descricao continua funcionando, so aparece marcada como incompleta. Teto de 500 caracteres por campo, validado no SERVIDOR e nao so no cliente. Papel: apenas gestor, fail-closed, mesmo padrao das telas vizinhas. Siga a organizacao e o estilo dos componentes ja existentes, nao invente design system. O componente precisa estar IMPORTADO e MONTADO — componente criado e nao usado sera reprovado. FORA DE ESCOPO: migration (as colunas ja existem); alterar etapa_canonica (e o 472); sincronismo com o GHL (e o 470); qualquer mudanca no motor de analise.",
  "pathspec_allowlist": [
    "src/app/**/comercial/**",
    "src/app/api/comercial/**",
    "src/components/comercial/**",
    "src/lib/comercial/funil/**"
  ],
  "dependencias": [
    "470"
  ],
  "risco": "",
  "criterios_aceite": [
    {
      "tipo": "guarda",
      "descricao": "Suite verde",
      "cmd": "node_modules/.bin/vitest run 2>&1 | tail -5",
      "espera": "passed"
    },
    {
      "tipo": "alvo",
      "descricao": "build passa com a tela nova",
      "cmd": "pnpm run build 2>&1 | tail -3",
      "espera": "Finalizing"
    },
    {
      "tipo": "guarda",
      "descricao": "nenhuma migration foi escrita",
      "cmd": "git diff --name-only $BASE_REF...HEAD -- supabase/migrations/ | wc -l | tr -d ' '",
      "espera": "0"
    },
    {
      "tipo": "avaliador",
      "descricao": "avaliador: confirme que (a) o componente esta importado e renderizado, nao apenas criado; (b) o teto de 500 caracteres e validado no servidor; (c) o gate de papel e fail-closed e segue o padrao das telas vizinhas; (d) etapa sem descricao continua funcionando e so aparece como incompleta; (e) nada do motor de analise foi tocado.",
      "cmd": "true",
      "espera": "avaliador"
    }
  ],
  "status": "bloqueado",
  "notas_status": "bloqueado: aguarda o 470 em main (sem as etapas reais sincronizadas nao ha o que descrever). Criterios com 'main...HEAD' trocados para 'HEAD~1...HEAD' em 13/09/2026: a frente nasce de staging-auto e herda migrations de tickets anteriores (a 0264 do 430), entao comparar com main acusa arquivo que o ticket nao escreveu. Travou o 460 em 9 tentativas e o 480 em 3.",
  "tentativas": 0
}
```
