#!/usr/bin/env python3
"""Tipo (c): ticket criado depois do done que cita o id e toca arquivo dele. So leitura."""
import csv, json, os, re, subprocess
from collections import defaultdict
from datetime import datetime, timedelta, timezone
os.environ["GIT_OPTIONAL_LOCKS"] = "0"
REPO = os.path.expanduser("~/Projetos/comarka-operacional")
MED = os.path.expanduser("~/orq-sessoes/medicao-comarka")
TZL = timezone(timedelta(hours=-3)); UTC = timezone.utc
SEP, FS = "\x1e", "\x1f"
def git(*a):
    return subprocess.run(["git", "-C", REPO] + list(a), capture_output=True, text=True, check=True).stdout

done = {}
for r in csv.DictReader(open(os.path.join(MED, "out/14d/tickets.csv"))):
    if r["status"] == "done" and r["data_done_ou_bloqueio"] != "-":
        done[r["id"]] = {"dt": datetime.strptime(r["data_done_ou_bloqueio"], "%Y-%m-%d %H:%M").replace(tzinfo=TZL), "prim": r["aprovado_de_primeira"]}

MRG = re.compile(r"^orquestrador: merge frente/(\S+) \(ticket (\S+)\) em (\S+)$")
arqs = defaultdict(set); merge_de = defaultdict(list)
for l in git("log", "--branches", "--merges", "--since=2026-09-15", "--format=%H %P" + FS + "%s").splitlines():
    hp, s = l.split(FS); p = hp.split(); m = MRG.match(s)
    if m and len(p) >= 3:
        merge_de[m.group(2)].append(p[0])
        arqs[m.group(2)].update(f for f in git("diff", "--name-only", p[1] + "..." + p[2]).split() if not f.startswith("docs/fila/"))

# criacao de ticket: 1o commit que adiciona o .md
TF = re.compile(r"^docs/fila/(?:apolo/|_hold/|_to_delete/)?([0-9]{3,4}[a-z0-9]*)-[^/]*\.md$")
criado, caminho = {}, {}
out = git("log", "--branches", "--diff-filter=A", "--name-only", "--format=" + SEP + "%at", "--", "docs/fila")
for blk in out.split(SEP)[1:]:
    ls = blk.strip().splitlines()
    dt = datetime.fromtimestamp(int(ls[0]), UTC)
    for p in ls[1:]:
        m = TF.match(p)
        if m and (m.group(1) not in criado or dt < criado[m.group(1)]):
            criado[m.group(1)] = dt; caminho[m.group(1)] = p

# texto do ticket no commit de criacao (o que o autor escreveu ao abrir)
def texto(tid):
    r = subprocess.run(["git", "-C", REPO, "log", "--branches", "--diff-filter=A", "--format=%H", "-1", "--reverse", "--", caminho[tid]], capture_output=True, text=True)
    h = r.stdout.split()[-1] if r.stdout.split() else None
    if not h:
        return ""
    r = subprocess.run(["git", "-C", REPO, "show", h + ":" + caminho[tid]], capture_output=True, text=True)
    return r.stdout

CTX = re.compile(r"(conserta|conserto|corrige|corrigir|correção|correcao|fix|regress|bug|quebrou|quebrado|errado|defeito|faltou|refaz|volta|reabre|desfaz|retrabalho|depois do|pós|pos-)", re.I)
fortes, fracas = [], []
for novo, dc in criado.items():
    if dc < datetime(2026, 10, 4, tzinfo=TZL) or novo in done and False:
        continue
    tx = None
    for tid, d in done.items():
        if tid == novo or not (d["dt"] < dc <= d["dt"] + timedelta(days=14)):
            continue
        if tx is None:
            tx = texto(novo)
        # id isolado: nao colado em digito, letra, ':' (linha), '/' ou '.'
        pat = re.compile(r"(?<![\w:./#-])#?%s(?![\w/.])" % re.escape(tid))
        hits = [m for m in pat.finditer(tx)]
        if not hits:
            continue
        # contexto: 80 chars antes/depois
        ctxs = [tx[max(0, m.start() - 80): m.end() + 80].replace("\n", " ") for m in hits]
        comum = arqs.get(tid, set()) & arqs.get(novo, set())
        # dependencia declarada nao conta como citacao de conserto
        try:
            j = json.loads(re.search(r"```json\n(.*?)\n```", tx, re.S).group(1))
            dep = tid in (j.get("dependencias") or [])
        except Exception:
            dep = False
        so_dep = dep and all(('"%s"' % tid) in c for c in ctxs)
        rec = (tid, novo, d["dt"].strftime("%m-%d"), dc.astimezone(TZL).strftime("%m-%d"), len(comum), so_dep, any(CTX.search(c) for c in ctxs), ctxs[0][:170])
        (fortes if (comum and not so_dep and rec[6]) else fracas).append(rec)
print("pares (done, ticket posterior que cita o id em <=14d):", len(fortes) + len(fracas))
print("com arquivo em comum + palavra de conserto + nao so dependencia:", len(fortes), " tickets done distintos:", len({r[0] for r in fortes}))
for r in sorted(fortes):
    print("  F", r)
print("\noutros (sem arquivo comum, ou so dependencia, ou sem palavra de conserto):", len(fracas))
for r in sorted(fracas)[:25]:
    print("  -", r)
