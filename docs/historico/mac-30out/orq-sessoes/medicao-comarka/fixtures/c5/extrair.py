#!/usr/bin/env python3
"""Gera as fixtures reais do C5 a partir do comarka-operacional (so git diff/show/log).
Uso: python3 -I extrair.py   (reescreve as pastas dos casos e ORIGEM.tsv)"""
import csv, json, os, subprocess
os.environ["GIT_OPTIONAL_LOCKS"] = "0"
AQUI = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.expanduser(os.environ.get("COMARKA_REPO", "~/Projetos/comarka-operacional"))
TICKETS = os.path.join(AQUI, "../../out/14d.ate-2026-10-17/tickets.csv")

def git(*a):
    return subprocess.run(["git", "-C", REPO] + list(a), capture_output=True, text=True, check=True).stdout

done = {r["id"]: r for r in csv.DictReader(open(TICKETS))}
# caso, ticket, loop, merge, p1, p2, commit, arquivo, tipo esperado, forca esperada
CASOS = [
    ("d_763", "763", "plataforma", "915d44ad1", "f373db674", "652f46458", "da1f4f1ce", "src/lib/perf/ghl-backfill.ts", "fix_na_linha", "forte"),
    ("d_741a", "741a", "plataforma", "553df03b9", "e202b050f", "e006c6b19", "80a212fdb", "src/lib/promessas/detectar.ts", "fix_na_linha", "forte"),
    ("d_953", "953", "plataforma", "3b5c52916", "25e80c0f6", "52f3ffc80", "10c88edb9", "src/lib/comercial/funil-cliente.ts", "fix_na_linha", "forte"),
    ("e_743", "743", "plataforma", "ae812fd17", "915d44ad1", "907ad050b", "e48094409", "src/lib/qualificacao/motor.ts", "linha_sem_fix", "fraco"),
    ("f_982", "982", "plataforma", "cb63efff6", "98630d01c", "58e384d4f", "07b6ae52f", "src/app/dashboard/clientes/[id]/_components/tabela-campanhas.tsx", "fix_no_arquivo", "fraco"),
    ("n_ritual_5135", "5135", "apolo", "d129b945e", "f24ee8765", "7a7546239", "daa34e62e", "test/inteligencia/fn-ingerir-raw-meta-insights.test.ts", "ritual", "ritual"),
    ("n_ritual_952a", "952a", "plataforma", "115931778", "021a1b5f0", "e5938313d", "079d3f465", "test/perf-leads-origem-ddl.test.ts", "ritual", "ritual"),
    ("n_spec_5053", "5053", "apolo", "a9702859b", "623e0e4ed", "c9f382ecb", "e15c1e284", "test/inteligencia/escritor-forma.test.ts", "", ""),
]
origem = [["caso", "ticket", "merge", "frente_p2", "commit", "arquivo", "fonte"]]
for caso, tid, loop, mg, p1, p2, sha, arq, tipo, forca in CASOS:
    d = os.path.join(AQUI, caso); os.makedirs(d, exist_ok=True)
    open(os.path.join(d, "ticket.patch"), "w").write(git("diff", "--no-color", p1 + "..." + p2, "--", arq))
    open(os.path.join(d, "commit.patch"), "w").write(git("show", "--no-color", "--format=", sha, "--", arq))
    h, at, s = git("log", "-1", "--format=%H%x1f%aI%x1f%s", sha).strip().split("\x1f")
    arqs = [x for x in git("show", "--name-only", "--format=", sha).split("\n") if x]
    r = done[tid]
    json.dump({"ticket": {"id": tid, "loop": loop, "done_em": r["data_done_ou_bloqueio"], "prim": r["aprovado_de_primeira"],
                          "sha_aprovado": git("rev-parse", p2).strip(), "merge": git("rev-parse", mg).strip()},
               "commit": {"sha": h, "dt": at, "assunto": s, "arquivos": arqs},
               "esperado": {"tipo": tipo, "forca": forca}}, open(os.path.join(d, "caso.json"), "w"), ensure_ascii=False, indent=1)
    origem.append([caso, tid, mg, p2, sha, arq, "git diff %s...%s -- ARQ; git show %s -- ARQ" % (p1, p2, sha)])

# (c) negativo real: 1044 cita "do 1043" (lote irmao) e toca arquivo em comum
d = os.path.join(AQUI, "n_cita_1043_1044"); os.makedirs(d, exist_ok=True)
arq = "src/app/dashboard/onboarding/motor/[id]/page.tsx"
open(os.path.join(d, "ticket.patch"), "w").write(git("diff", "--no-color", "45b6f90a2...24fdbbd46", "--", arq))
open(os.path.join(d, "novo.patch"), "w").write(git("diff", "--no-color", "9c9f49bea...bc1ec1beb", "--", arq))
open(os.path.join(d, "novo.md"), "w").write(git("show", "3718afa:docs/fila/1044-onboarding-etapa-briefing-usa-construtor.md"))
json.dump({"ticket": {"id": "1043", "loop": "plataforma", "done_em": done["1043"]["data_done_ou_bloqueio"], "prim": done["1043"]["aprovado_de_primeira"],
                      "sha_aprovado": git("rev-parse", "24fdbbd46").strip(), "merge": git("rev-parse", "9c9f49bea").strip()},
           "novo": {"id": "1044", "sha": git("rev-parse", "a2b4efe8c").strip(), "dt": "2026-10-13T05:26:39-03:00"},
           "esperado": {"tipo": "", "forca": ""}}, open(os.path.join(d, "caso.json"), "w"), ensure_ascii=False, indent=1)
origem.append(["n_cita_1043_1044", "1043", "9c9f49bea", "24fdbbd46", "a2b4efe8c (merge do 1044)", arq,
               "git diff 45b6f90a2...24fdbbd46; git diff 9c9f49bea...bc1ec1beb; git show 3718afa:docs/fila/1044-*.md"])
# volta 2: linha que o mesmo commit readiciona igual (qualquer arquivo) nao conta; commit.patch vai INTEIRO
d = os.path.join(AQUI, "m_997_movido"); os.makedirs(d, exist_ok=True)
arq = "src/app/r/escritorio/[token]/page.tsx"
open(os.path.join(d, "ticket.patch"), "w").write(git("diff", "--no-color", "3543cc9a1...af11b9fa3", "--", arq))
open(os.path.join(d, "commit.patch"), "w").write(git("show", "--no-color", "--format=", "2c76b10f7", "--", ".", ":!docs/fila"))
h, at, s = git("log", "-1", "--format=%H%x1f%aI%x1f%s", "2c76b10f7").strip().split("\x1f")
json.dump({"ticket": {"id": "997", "loop": "plataforma", "done_em": done["997"]["data_done_ou_bloqueio"], "prim": done["997"]["aprovado_de_primeira"],
                      "sha_aprovado": git("rev-parse", "af11b9fa3").strip(), "merge": git("rev-parse", "6b7f8aeac").strip()},
           "commit": {"sha": h, "dt": at, "assunto": s, "arquivos": [x for x in git("show", "--name-only", "--format=", h).split("\n") if x]},
           "esperado": {"tipo": "fix_na_linha", "forca": "forte", "linhas": 4}}, open(os.path.join(d, "caso.json"), "w"), ensure_ascii=False, indent=1)
origem.append(["m_997_movido", "997", "6b7f8aeac", "af11b9fa3", "2c76b10f7", arq + " (commit.patch inteiro, sem docs/fila)",
               "git diff 3543cc9a1...af11b9fa3 -- ARQ; git show 2c76b10f7 -- . :!docs/fila"])
with open(os.path.join(AQUI, "ORIGEM.tsv"), "w") as fh:
    fh.write("# fixtures do C5 copiadas do comarka-operacional (main b4c0ca0 em 24/10/2026); casos s_* do teste sao sinteticos\n")
    for l in origem:
        fh.write("\t".join(l) + "\n")
print("ok", len(origem) - 1, "casos")
