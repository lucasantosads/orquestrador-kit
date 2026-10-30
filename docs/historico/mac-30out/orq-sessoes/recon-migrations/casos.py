#!/usr/bin/env python3
"""Tickets x migration (passos D e F). So leitura."""
import os, re, json, glob, subprocess, collections

REPO = os.path.expanduser("~/Projetos/comarka-operacional")
ENV = dict(os.environ, GIT_OPTIONAL_LOCKS="0")
OUT = os.path.expanduser("~/orq-sessoes/recon-migrations/tickets-migration.tsv")


def git(*a):
    return subprocess.run(["git", "-C", REPO, *a], capture_output=True, text=True, env=ENV).stdout


def bloco(path):
    txt = open(path, encoding="utf-8").read()
    m = re.search(r"```json\s*\n(.*?)\n```", txt, re.S)
    if not m:
        return None, txt
    try:
        return json.loads(m.group(1)), txt
    except Exception:
        return None, txt


arqs = sorted(glob.glob(f"{REPO}/docs/fila/[0-9]*.md") + glob.glob(f"{REPO}/docs/fila/apolo/[0-9]*.md")
              + glob.glob(f"{REPO}/docs/fila/_hold/[0-9]*.md"))
tickets = {}
for a in arqs:
    j, txt = bloco(a)
    if not j:
        continue
    j["_arq"] = os.path.relpath(a, REPO)
    j["_fila"] = "apolo" if "/apolo/" in a else ("hold" if "/_hold/" in a else "comarka")
    j["_txt"] = txt
    tickets[str(j.get("id"))] = j

RX_MIG = re.compile(r"supabase/migrations|\bmigration", re.I)
so_mig = {}  # ticket cuja allowlist (fora test/docs) e so migration
for tid, j in tickets.items():
    allow = j.get("pathspec_allowlist") or []
    j["_toca_mig"] = any(p.startswith("supabase/migrations") for p in allow)
    j["_toca_app"] = any(p.startswith("src/") for p in allow)
    j["_cita"] = bool(RX_MIG.search(j["_txt"]))
    resto = [p for p in allow if not p.startswith(("test/", "docs/"))]
    so_mig[tid] = j["_toca_mig"] and all(p.startswith("supabase/migrations") for p in resto)

# historico: tickets que ja tiveram status bloqueado/refatiar (git log -G nos .md da fila)
hist = collections.defaultdict(set)
log = git("log", "--all", "--format=@@%h|%cI", "-G", r'"status": "(bloqueado|refatiar)"', "--name-only", "--",
          "docs/fila/*.md", "docs/fila/apolo/*.md")
for l in log.splitlines():
    if l.startswith("@@"):
        cur = l[2:]
    elif l.strip():
        m = re.match(r"(\d+[a-z]?)-", os.path.basename(l))
        if m:
            hist[m.group(1)].add(cur.split("|")[1][:10])


def tentativas(tid):
    d = f"{REPO}/docs/fila/runs/{tid}"
    return len(glob.glob(d + "/attempt-*")) if os.path.isdir(d) else 0


linhas = []
for tid, j in tickets.items():
    if not (j["_cita"] or j["_toca_mig"]):
        continue
    deps = j.get("dependencias") or []
    dep_mig_humano = [d for d in deps if re.match(r"humano:(migration|ddl|.*-aplicada)", d)]
    dep_mig_ticket = [d for d in deps if not d.startswith("humano:") and so_mig.get(d)]
    linhas.append(dict(id=tid, fila=j["_fila"], status=j.get("status", ""), toca_mig=j["_toca_mig"],
                       toca_app=j["_toca_app"], tent=tentativas(tid), ja_bloq=",".join(sorted(hist.get(tid, []))),
                       dep_mig_humano=";".join(dep_mig_humano), dep_mig_ticket=";".join(dep_mig_ticket),
                       notas=(j.get("notas") or "").replace("\t", " ").replace("\n", " ")[:300], arq=j["_arq"]))

cols = ["id", "fila", "status", "toca_mig", "toca_app", "tent", "ja_bloq", "dep_mig_humano", "dep_mig_ticket", "notas", "arq"]
with open(OUT, "w") as fh:
    fh.write("\t".join(cols) + "\n")
    for r in linhas:
        fh.write("\t".join(str(r[c]) for c in cols) + "\n")

C = collections.Counter
print("tickets parseados:", len(tickets), dict(C(j["_fila"] for j in tickets.values())))
print("citam migration (texto) ou tocam supabase/migrations:", len(linhas))
print("  por status:", dict(C(r["status"] for r in linhas)))
print("tocam supabase/migrations (allowlist):", sum(r["toca_mig"] for r in linhas),
      dict(C((r["fila"], r["status"]) for r in linhas if r["toca_mig"])))
print("F1 tocam supabase/migrations E src/ no mesmo ticket:", sum(r["toca_mig"] and r["toca_app"] for r in linhas),
      "| por status:", dict(C(r["status"] for r in linhas if r["toca_mig"] and r["toca_app"])))
print("F2 dependem de token humano de migration:", sum(bool(r["dep_mig_humano"]) for r in linhas),
      "| tokens distintos:", len({d for r in linhas for d in r["dep_mig_humano"].split(";") if d}))
print("F2 dependem de ticket que so entrega migration:", sum(bool(r["dep_mig_ticket"]) for r in linhas))
print("F2 qualquer um dos dois:", sum(bool(r["dep_mig_humano"] or r["dep_mig_ticket"]) for r in linhas))
print("ja estiveram bloqueado/refatiar (git):", sum(bool(r["ja_bloq"]) for r in linhas))
print("obsoletos:", sum(r["status"] == "obsoleto" for r in linhas), "| tent>1:", sum(r["tent"] > 1 for r in linhas))
print("pendentes esperando token humano de migration:",
      [(r["id"], r["dep_mig_humano"]) for r in linhas if r["status"] == "pendente" and r["dep_mig_humano"]])
# contagem geral de deps humano: por familia
fam = C()
for j in tickets.values():
    for d in j.get("dependencias") or []:
        if d.startswith("humano:"):
            fam[re.sub(r"[-_]?\d+[a-z]?", "#", d.split(":", 1)[1])[:40]] += 1
print("familias de dep humano (top 15):", fam.most_common(15))
