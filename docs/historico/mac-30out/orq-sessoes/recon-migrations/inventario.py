#!/usr/bin/env python3
"""Inventario das migrations do Comarka (so leitura; git com GIT_OPTIONAL_LOCKS=0).
Saida: arquivos-migrations.tsv + resumo em stdout."""
import os, re, subprocess, collections, glob

REPO = os.path.expanduser("~/Projetos/comarka-operacional")
OUT = os.path.expanduser("~/orq-sessoes/recon-migrations/arquivos-migrations.tsv")
ENV = dict(os.environ, GIT_OPTIONAL_LOCKS="0")
BRANCHES = ["main", "origin/staging-auto", "origin/staging-apolo"]
DIRS = ["supabase/migrations", "migrations", "supabase/migrations_descartadas", "docs/fila/runs/ddl-13out"]
DESDE = "2026-10-04"


def git(*a):
    return subprocess.run(["git", "-C", REPO, *a], capture_output=True, text=True, env=ENV).stdout


# arquivo -> branches onde existe
onde = collections.defaultdict(list)
for b in BRANCHES:
    for d in DIRS:
        for p in git("ls-tree", "-r", "--name-only", b, d + "/").splitlines():
            if p.endswith(".sql"):
                onde[p].append(b)

# primeiro commit que adicionou cada caminho (em qualquer ref)
primeiro = {}
log = git("log", "--all", "--reverse", "--diff-filter=A", "--name-only", "--format=@@%h|%cI|%s", "--", *DIRS)
cur = None
for l in log.splitlines():
    if l.startswith("@@"):
        cur = l[2:].split("|", 2)
    elif l.strip() and l not in primeiro:
        primeiro[l] = cur

# horario em que o caminho entrou em cada branch (commit que o adicionou na historia da branch)
entrou = {}
for b in BRANCHES:
    entrou[b] = {}
    log = git("log", b, "--reverse", "--diff-filter=A", "--name-only", "--format=@@%h|%cI|%aI", "--", *DIRS)
    for l in log.splitlines():
        if l.startswith("@@"):
            cur = l[2:].split("|")
        elif l.strip() and l not in entrou[b]:
            entrou[b][l] = cur

apolo_ids = {re.match(r"(\d+[a-z]?)", os.path.basename(f)).group(1)
             for f in glob.glob(f"{REPO}/docs/fila/apolo/[0-9]*.md")}
comarka_ids = {re.match(r"(\d+[a-z]?)", os.path.basename(f)).group(1)
               for f in glob.glob(f"{REPO}/docs/fila/[0-9]*.md")}


def ticket_de(msg):
    for m in re.finditer(r"(?<![\w.])(\d{3,4}[a-z]?)(?![\w.])", msg or ""):
        t = m.group(1)
        if t in apolo_ids or t in comarka_ids:
            return t
    return ""


def fila_de(t):
    if not t:
        return ""
    if t in apolo_ids:
        return "apolo"
    return "comarka" if t in comarka_ids else ""


RX14 = re.compile(r"^(\d{14})_(.+)\.sql$")
linhas = []
for p in sorted(onde):
    base = os.path.basename(p)
    m = RX14.match(base)
    if m:
        versao, nome, padrao = m.group(1), m.group(2), "14dig"
        padrao += "_ss00" if versao.endswith("00") else "_ssNN"
    else:
        m2 = re.match(r"^(\d+)_(.+)\.sql$", base)
        versao, nome = (m2.group(1), m2.group(2)) if m2 else ("", base[:-4])
        padrao = f"{len(versao)}dig" if versao else "sem_prefixo"
    c = primeiro.get(p) or ["", "", ""]
    t = ticket_de(c[2])
    linhas.append(dict(arquivo=p, pasta=os.path.dirname(p), versao=versao, nome=nome, padrao=padrao,
                       branches=",".join(onde[p]), add_commit=c[0], add_data=c[1][:19], ticket=t,
                       fila=fila_de(t), assunto=c[2].replace("\t", " ")[:120],
                       versao_hora=(f"{versao[:4]}-{versao[4:6]}-{versao[6:8]}T{versao[8:10]}:{versao[10:12]}:{versao[12:14]}"
                                    if len(versao) == 14 else ""),
                       main_data=(entrou["main"].get(p) or ["", ""])[1][:19],
                       main_commit=(entrou["main"].get(p) or [""])[0],
                       staging_auto_data=(entrou["origin/staging-auto"].get(p) or ["", ""])[1][:19],
                       staging_apolo_data=(entrou["origin/staging-apolo"].get(p) or ["", ""])[1][:19]))

cols = ["arquivo", "pasta", "versao", "versao_hora", "nome", "padrao", "branches", "add_commit", "add_data",
        "staging_auto_data", "staging_apolo_data", "main_commit", "main_data", "ticket", "fila", "assunto"]
with open(OUT, "w") as fh:
    fh.write("\t".join(cols) + "\n")
    for r in linhas:
        fh.write("\t".join(r[c] for c in cols) + "\n")

print("arquivos (uniao main+staging-auto+staging-apolo):", len(linhas))
print("por pasta:", dict(collections.Counter(r["pasta"] for r in linhas)))
print("por padrao:", dict(collections.Counter(r["padrao"] for r in linhas)))
print("so na main:", sum(1 for r in linhas if r["branches"] == "main"),
      "| nao estao na main:", [r["arquivo"].split("/")[-1] for r in linhas if "main" not in r["branches"].split(",")])
sm = [r for r in linhas if r["pasta"] == "supabase/migrations"]
print("\nsem 14 digitos no comeco (todas as pastas):")
for r in linhas:
    if not r["padrao"].startswith("14dig"):
        print("  ", r["arquivo"])
dv = collections.Counter(r["versao"] for r in sm if r["versao"])
print("\nversoes repetidas em supabase/migrations:", {k: v for k, v in dv.items() if v > 1})
dn = collections.defaultdict(list)
for r in linhas:
    dn[r["nome"]].append(r["arquivo"])
print("nomes (sem versao) repetidos em qualquer pasta:")
for k, v in dn.items():
    if len(v) > 1:
        print("  ", k, "->", v)
rec = [r for r in linhas if r["add_data"] >= DESDE]
print(f"\nadicionadas desde {DESDE} (primeiro commit, qualquer ref): {len(rec)}")
print("  por fila:", dict(collections.Counter(r["fila"] or "sem_ticket" for r in rec)))
print("  por dia:", dict(sorted(collections.Counter(r["add_data"][:10] for r in rec).items())))
print("  por padrao:", dict(collections.Counter(r["padrao"] for r in rec)))
print("sem ticket (recentes):", [r["arquivo"].split("/")[-1] + " :: " + r["assunto"][:60] for r in rec if not r["ticket"]][:20])

# H: distancia entre o horario da versao (nome) e o primeiro commit do arquivo.
# versao com segundos != 00 costuma ser a hora da aplicacao (apply_migration grava UTC);
# versao com segundos 00 e horario inventado na escrita do arquivo.
import datetime as dt
def utc(s):
    try:
        d = dt.datetime.fromisoformat(s)
    except ValueError:
        return None
    return d.astimezone(dt.timezone.utc) if d.tzinfo else d.replace(tzinfo=dt.timezone.utc)
gaps = []
for r in linhas:
    if r["versao_hora"] and r["add_data"] and r["pasta"] == "supabase/migrations":
        v, a = utc(r["versao_hora"]), utc(git("log", "-1", "--format=%cI", r["add_commit"]).strip() or r["add_data"])
        if v and a:
            gaps.append(((a - v).total_seconds() / 3600, r))
print("\nH: horas entre versao (nome, lida como UTC) e primeiro commit; n =", len(gaps))
for tag in ("14dig_ssNN", "14dig_ss00"):
    g = sorted(x[0] for x in gaps if x[1]["padrao"] == tag)
    if g:
        print(f"  {tag}: n={len(g)} mediana={g[len(g)//2]:.1f}h  >+24h={sum(x > 24 for x in g)}  <-24h={sum(x < -24 for x in g)}")
print("  ssNN com commit >24h depois da versao (arquivo entrou bem depois da aplicacao provavel):")
for h, r in sorted(gaps, key=lambda x: -x[0]):
    if r["padrao"] == "14dig_ssNN" and h > 24:
        print(f"    {h:7.1f}h  {r['arquivo'].split('/')[-1]}  commit {r['add_commit']} {r['add_data']}")
print("  ss00 com commit >24h antes da versao (versao no futuro):")
for h, r in sorted(gaps, key=lambda x: x[0]):
    if h < -24:
        print(f"    {h:7.1f}h  {r['arquivo'].split('/')[-1]}  commit {r['add_commit']} {r['add_data']}")
