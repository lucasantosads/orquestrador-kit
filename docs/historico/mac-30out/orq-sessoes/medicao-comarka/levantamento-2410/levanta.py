#!/usr/bin/env python3
"""Levantamento do PASSO 0 do C5 (so leitura). git: log, show, cat-file, diff."""
import csv, json, os, re, subprocess, sys
from collections import Counter, defaultdict
from datetime import datetime, timedelta, timezone

REPO = os.path.expanduser("~/Projetos/comarka-operacional")
MED = os.path.expanduser("~/orq-sessoes/medicao-comarka")
os.environ["GIT_OPTIONAL_LOCKS"] = "0"
TZL = timezone(timedelta(hours=-3)); UTC = timezone.utc
INI = datetime(2026, 10, 4, tzinfo=TZL); CORTE = datetime(2026, 10, 17, 23, 59, 59, tzinfo=TZL)
HOJE = datetime(2026, 10, 24, 23, 59, 59, tzinfo=TZL)
SEP, FS = "\x1e", "\x1f"

def git(*a):
    return subprocess.run(["git", "-C", REPO] + list(a), capture_output=True, text=True, check=True).stdout

def t(s): return datetime.strptime(s, "%Y-%m-%d %H:%M").replace(tzinfo=TZL)

# universo: done da janela segundo a medicao
done = {}
for r in csv.DictReader(open(os.path.join(MED, "out/14d/tickets.csv"))):
    if r["status"] == "done" and r["data_done_ou_bloqueio"] != "-":
        done[r["id"]] = {"done_em": t(r["data_done_ou_bloqueio"]), "prim": r["aprovado_de_primeira"]}
print("done na janela:", len(done), " apolo(5xxx):", sum(1 for i in done if re.match(r"5\d{3}", i)))

# merges do loop (todas as branches)
MRG = re.compile(r"^orquestrador: merge frente/(\S+) \(ticket (\S+)\) em (\S+)$")
merges = defaultdict(list)
agente = set()
for l in git("log", "--branches", "--merges", "--since=2026-08-01", "--format=%H %P" + FS + "%at" + FS + "%s").splitlines():
    hp, at, s = l.split(FS)
    p = hp.split()
    m = MRG.match(s)
    if m and len(p) >= 3:
        merges[m.group(2)].append({"h": p[0], "p1": p[1], "p2": p[2], "dt": datetime.fromtimestamp(int(at), UTC), "alvo": m.group(3)})
        agente.update(git("log", "--format=%H", p[1] + ".." + p[2]).split())

sem_merge = [i for i in done if not merges.get(i)]
print("done sem merge do loop:", len(sem_merge), sorted(sem_merge)[:30])

# arquivos por ticket (lado frente do merge, contra o merge-base)
arqs = {}
for i in done:
    fs = set()
    for m in merges.get(i, []):
        fs.update(git("diff", "--name-only", m["p1"] + "..." + m["p2"]).split())
    arqs[i] = fs

# commits nao-merge desde 20/09 com arquivos
def commits(since):
    out = git("log", "--branches", "--no-merges", "--since=" + since, "--name-only",
              "--format=" + SEP + "%H" + FS + "%at" + FS + "%an" + FS + "%s" + FS +
              "%(trailers:key=Orq-Resolvedor,valueonly)" + FS + "%(trailers:key=Co-Authored-By,valueonly,separator=;)" + FS)
    res = []
    for blk in out.split(SEP)[1:]:
        cab, _, resto = blk.rpartition(FS)
        h, at, an, s, orr, coa = cab.split(FS)[:6]
        res.append({"h": h, "dt": datetime.fromtimestamp(int(at), UTC), "an": an, "s": s, "orr": orr.strip(),
                    "coa": coa, "fs": [x for x in resto.split("\n") if x.strip()]})
    return res
cs = commits("2026-09-15")
def do_loop(c):
    return c["h"] in agente or c["orr"] or c["s"].startswith("fila: status automatico do loop")

# ---- item 4: reverts
print("\n== reverts (todas as branches, desde 15/09)")
for l in git("log", "--branches", "--since=2026-09-15", "--format=%h" + FS + "%ci" + FS + "%s" + FS + "%b" + SEP).split(SEP):
    if not l.strip():
        continue
    h, ci, s, b = (l.strip("\n").split(FS) + ["", "", ""])[:4]
    if s.lower().startswith("revert") or "This reverts commit" in b or re.search(r"\brevert", s, re.I):
        print(" ", h, ci[:16], s[:120])

# ---- item 8: arquivos quentes na janela (commits nao-merge, fora docs/fila)
quente = Counter(); quente_tk = Counter()
for c in cs:
    if INI <= c["dt"] <= CORTE:
        for f in set(c["fs"]):
            if not f.startswith("docs/fila/"):
                quente[f] += 1
for i, fs in arqs.items():
    for f in fs:
        if not f.startswith("docs/fila/"):
            quente_tk[f] += 1
print("\n== top 20 arquivos por commits nao-merge na janela (fora docs/fila) | n tickets done que tocaram")
for f, n in quente.most_common(20):
    print("  %4d %4d %s" % (n, quente_tk[f], f))
print("\n== top 20 arquivos por n de tickets done da janela que tocaram")
for f, n in quente_tk.most_common(20):
    print("  %4d %s" % (n, f))

# ---- item 5: commits fora do loop na janela tocando arquivo de ticket done nos 14 dias anteriores
print("\n== item 5")
idx = defaultdict(list)   # arquivo -> [(done_em, id)]
for i, fs in arqs.items():
    for f in fs:
        if not f.startswith("docs/fila/"):
            idx[f].append((done[i]["done_em"], i))
# incluir tambem done de 20/09-03/10 para cobrir os 14 dias antes de commits do comeco da janela: usar merges
for i, ms in merges.items():
    if i in done:
        continue
    for m in ms:
        if INI - timedelta(days=14) <= m["dt"] < INI:
            for f in git("diff", "--name-only", m["p1"] + "..." + m["p2"]).split():
                if not f.startswith("docs/fila/"):
                    idx[f].append((m["dt"], i))
hot20 = {f for f, _ in quente.most_common(20)}
FIX = re.compile(r"\b(fix|corrig|corrige|conserta|conserto|hotfix|bug)", re.I)
hits = []
for c in cs:
    if not (INI <= c["dt"] <= CORTE) or do_loop(c):
        continue
    alvo = []
    for f in set(c["fs"]):
        for (d, i) in idx.get(f, []):
            if d < c["dt"] <= d + timedelta(days=14):
                alvo.append((f, i))
    if alvo:
        hits.append((c, alvo))
print("commits fora do loop na janela:", sum(1 for c in cs if INI <= c["dt"] <= CORTE and not do_loop(c)))
print("tocam arquivo de ticket done nos 14d anteriores:", len(hits))
print("  ... com fix/corrige na mensagem:", sum(1 for c, a in hits if FIX.search(c["s"])))
semhot = [(c, a) for c, a in hits if any(f not in hot20 for f, _ in a)]
print("  ... excluindo os 20 quentes:", len(semhot), " com fix:", sum(1 for c, a in semhot if FIX.search(c["s"])))
for c, a in hits:
    if FIX.search(c["s"]):
        tk = sorted({i for _, i in a})
        print("   FIX", c["h"][:9], c["dt"].astimezone(TZL).strftime("%m-%d %H:%M"), c["an"], "| tickets", ",".join(tk[:6]), "|", c["s"][:110])

# ---- item 3: done que saiu de done (status do .md e meta.json com tentativa depois do done)
print("\n== item 3: done -> outro status em ate 14d")
RUNS = os.path.join(REPO, "docs/fila/runs")
for i, d in sorted(done.items(), key=lambda x: x[1]["done_em"]):
    sinais = []
    mf = os.path.join(RUNS, i, "meta.json")
    if os.path.isfile(mf):
        rows = json.load(open(mf))
        for r in rows:
            ts = r.get("ts")
            if ts and ts != "?":
                dt = datetime.strptime(ts, "%Y-%m-%dT%H:%M:%SZ").replace(tzinfo=UTC)
                if d["done_em"] + timedelta(minutes=5) < dt <= d["done_em"] + timedelta(days=14):
                    sinais.append("meta:%s@%s" % (r.get("resultado"), dt.astimezone(TZL).strftime("%m-%d %H:%M")))
    if len(merges.get(i, [])) > 1:
        sinais.append("merges:%d" % len(merges[i]))
    if sinais:
        print("  ", i, d["done_em"].strftime("%m-%d %H:%M"), d["prim"], sinais[:6])

# historico de status no .md: done -> outro
TF = re.compile(r"^docs/fila/(?:apolo/|_hold/|_to_delete/)?([0-9]{3,4}[a-z0-9]*)-[^/]*\.md$")
out = git("log", "--branches", "--since=2026-10-01", "--format=" + SEP + "%H" + FS + "%at" + FS + "%s", "--name-only", "--", "docs/fila")
trans = []
for blk in out.split(SEP)[1:]:
    ls = blk.strip().split("\n")
    h, at, s = ls[0].split(FS)
    for p in ls[1:]:
        m = TF.match(p.strip())
        if not m or m.group(1) not in done:
            continue
        def st(spec):
            r = subprocess.run(["git", "-C", REPO, "show", spec], capture_output=True, text=True)
            mm = re.search(r'"status"\s*:\s*"([^"]+)"', r.stdout) if r.returncode == 0 else None
            return mm.group(1) if mm else None
        a, b = st(h + "^:" + p.strip()), st(h + ":" + p.strip())
        if a == "done" and b and b != "done":
            trans.append((m.group(1), datetime.fromtimestamp(int(at), UTC), h[:9], b, s[:100]))
for x in sorted(set(trans)):
    dd = done[x[0]]["done_em"]
    print("   md", x[0], "done", dd.strftime("%m-%d %H:%M"), "-> %s em %s" % (x[3], x[1].astimezone(TZL).strftime("%m-%d %H:%M")), x[2], "|", x[4],
          "(dentro 14d)" if dd < x[1] <= dd + timedelta(days=14) else "(fora)")

# maturidade: done com 14d de acompanhamento ate hoje
print("\n== maturidade: done da janela com 14d completos ate", HOJE.date(), ":", sum(1 for d in done.values() if d["done_em"] + timedelta(days=14) <= HOJE))
