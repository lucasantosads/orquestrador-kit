# Conserto 1006 (11/10/2026)

## Veredito: adaptação legítima, não afrouxamento

O teste `test/quem-cuida.test.ts` > "alerta de campanha... manda para o telefone do gestor principal ou do head" injetava `process.env.META_ADS_ACCESS_TOKEN = "token-teste"` (linha 125) para a rota alertas-campanha chamar a Meta. O 1006 tira essa leitura do ambiente: o token passa a vir de conn-resolver (rpc decrypt_meta_token), que o supabase em memória do teste não tem. Sem token, a rota não manda alerta e `enviados` fica vazio. Foi isso que deu vermelho em :137 na tentativa 1 (`expected [] to deeply equal [ '5571999990001', …(2) ]`).

Na tentativa 2, o agente só acrescentou um `vi.mock` do conn-resolver. Nenhuma asserção, nenhum valor esperado e nenhum matcher mudou, e não entrou nenhum skip/only/todo. O motor bloqueou só por enforcement (fora_do_pathspec).

Trecho (docs/fila/runs/1006/attempt-2/diff.raw):

```diff
diff --git a/test/quem-cuida.test.ts b/test/quem-cuida.test.ts
index aa50f6c..1174ef7 100644
--- a/test/quem-cuida.test.ts
+++ b/test/quem-cuida.test.ts
@@ -21,6 +21,11 @@ vi.mock("@supabase/supabase-js", async () => {
   return { createClient: () => clienteMemoria(mem) };
 });
 vi.mock("@/lib/session", () => ({ getSession: vi.fn(async () => sessao.atual) }));
+// 1006: o token da Meta vem da conexão de agência (rpc de decifragem), não do ambiente;
+// o supabase em memória não tem essa rpc, então a conexão é simulada aqui.
+vi.mock("@/lib/perf/conn-resolver", () => ({
+  tokenAgenciaPorRequisicao: () => async () => "token-teste",
+}));
 vi.mock("@/lib/evolution", () => ({
   sendWhatsAppText: vi.fn(async (tel: string, msg: string) => {
     enviados.push({ tel, msg });
```

Observação: o mock exporta `tokenAgenciaPorRequisicao`, um nome do desenho da tentativa 2. Se a próxima tentativa usar outro nome (por exemplo, `resolveMetaConnAgencia` direto nas rotas), o mock tem de acompanhar. A guarda nova protege as asserções, não o nome.

## Números da guarda (medidos em 11/10)

test/quem-cuida.test.ts, iguais na main local, em origin/main e em origin/staging-auto:
- it( = 14, test( = 0 → mínimo 14
- expect( = 32 → mínimo 32
- .skip/.only/.todo = 0

A guarda roda hoje e dá CONTAGEM_MANTIDA.

## git diff do .md

```diff
diff --git a/docs/fila/1006-token-meta-pela-conexao.md b/docs/fila/1006-token-meta-pela-conexao.md
index 9f0c140..5bc048e 100644
--- a/docs/fila/1006-token-meta-pela-conexao.md
+++ b/docs/fila/1006-token-meta-pela-conexao.md
@@ -26,7 +26,8 @@ Recon de 10/10: a conexão system user (2c3cba71) está ativa e sem vencimento;
     "src/app/api/clientes/[id]/performance/route.ts",
     "src/app/api/clientes/calcular-score/route.ts",
     "src/app/api/clientes/alertas-campanha/route.ts",
-    "test/token-meta-sem-env.test.ts"
+    "test/token-meta-sem-env.test.ts",
+    "test/quem-cuida.test.ts"
   ],
   "dependencias": [],
   "prioridade": 20,
@@ -62,7 +63,7 @@ Recon de 10/10: a conexão system user (2c3cba71) está ativa e sem vencimento;
     },
     {
       "descricao": "so arquivos da allowlist foram tocados",
-      "cmd": "b=\"$(git merge-base HEAD origin/staging-auto)\"; r=SO_ALLOWLIST; for f in $(git diff --name-only \"$b\" HEAD); do printf '%s\\n' 'src/lib/perf/conn-resolver.ts' 'src/app/api/clientes/performance/route.ts' 'src/app/api/clientes/[id]/performance/route.ts' 'src/app/api/clientes/calcular-score/route.ts' 'src/app/api/clientes/alertas-campanha/route.ts' 'test/token-meta-sem-env.test.ts' | grep -Fxq \"$f\" || r=FORA_$f; done; echo $r",
+      "cmd": "b=\"$(git merge-base HEAD origin/staging-auto)\"; r=SO_ALLOWLIST; for f in $(git diff --name-only \"$b\" HEAD); do printf '%s\\n' 'src/lib/perf/conn-resolver.ts' 'src/app/api/clientes/performance/route.ts' 'src/app/api/clientes/[id]/performance/route.ts' 'src/app/api/clientes/calcular-score/route.ts' 'src/app/api/clientes/alertas-campanha/route.ts' 'test/token-meta-sem-env.test.ts' 'test/quem-cuida.test.ts' | grep -Fxq \"$f\" || r=FORA_$f; done; echo $r",
       "espera": "SO_ALLOWLIST",
       "tipo": "guarda"
     },
@@ -78,6 +79,12 @@ Recon de 10/10: a conexão system user (2c3cba71) está ativa e sem vencimento;
       "espera": "VERDE",
       "tipo": "guarda"
     },
+    {
+      "descricao": "anti-afrouxamento: test/quem-cuida.test.ts (entrou na allowlist em 11/10 so para simular a conexao Meta com vi.mock de @/lib/perf/conn-resolver, ja que o alerta de campanha deixa de ler o token do ambiente) mantem >= 14 it(/test( e >= 32 expect( e nao tem .skip/.only/.todo (medido na main, origin/main e origin/staging-auto em 11/10: 14 it(, 0 test(, 32 expect(, 0 skip/only/todo)",
+      "cmd": "f=test/quem-cuida.test.ts; [ -f \"$f\" ] || { echo APAGOU_$f; exit 0; }; i=$(grep -cF 'it(' \"$f\" || true); t=$(grep -cF 'test(' \"$f\" || true); e=$(grep -cF 'expect(' \"$f\" || true); s=$(grep -cE '[.](skip|only|todo)[(]' \"$f\" || true); [ $(( ${i:-0} + ${t:-0} )) -ge 14 ] && [ \"${e:-0}\" -ge 32 ] && [ \"${s:-x}\" = 0 ] && echo CONTAGEM_MANTIDA || echo CAIU_${i:-x}_${t:-x}_${e:-x}_${s:-x}",
+      "espera": "CONTAGEM_MANTIDA",
+      "tipo": "guarda"
+    },
     {
       "descricao": "src sem token do env e resolver exportado",
       "cmd": "n=$(grep -rn 'META_ADS_ACCESS_TOKEN' src | wc -l | tr -d ' '); m=$(grep -c 'export async function resolveMetaConnAgencia' src/lib/perf/conn-resolver.ts); [ \"$n\" = 0 ] && [ \"$m\" = 1 ] && echo FEITO || echo ST_${n}_${m}",
@@ -286,7 +293,7 @@ Recon de 10/10: a conexão system user (2c3cba71) está ativa e sem vencimento;
       "motivo": "importam o conn-resolver ou as rotas legadas; o ticket so acrescenta resolveMetaConnAgencia (resolveMetaConn intacto) e troca a origem do token nas 4 rotas, sem mudar calculo nem resposta; se quebrar, PARE e descreva"
     }
   ],
-  "status": "bloqueado",
-  "notas_status": "enforcement: fora_do_pathspec: test/quem-cuida.test.ts"
+  "status": "pendente",
+  "notas_status": ""
 }
 ```
```
