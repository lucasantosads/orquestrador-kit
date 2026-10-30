#!/usr/bin/env python3
"""Commit fora do loop que APAGA linha que o ticket done ADICIONOU (<=14d). So git log/show/diff."""
import csv, os, re, subprocess
from collections import defaultdict
from datetime import datetime, timedelta, timezone
os.environ["GIT_OPTIONAL_LOCKS"] = "0"
REPO = os.path.expanduser("~/Projetos/comarka-operacional")
MED = os.path.expanduser("~/orq-sessoes/medicao-comarka")
TZL = timezone(timedelta(hours=-3)); UTC = timezone.utc
SEP, FS = "\x1e", "\x1f"
INI = datetime(2026, 10, 4, tzinfo=TZL); FIM = datetime(2026, 10, 24, 23, 59, tzinfo=TZL)
def git(*a):
    return subprocess.run(["git", "-C", REPO] + list(a), capture_output=True, text=True, check=True).stdout

done = {}
for r in csv.DictReader(open(os.path.join(MED, "out/14d/tickets.csv"))):
    if r["status"] == "done" and r["data_done_ou_bloqueio"] != "-":
        done[r["id"]] = {"dt": datetime.strptime(r["data_done_ou_bloqueio"], "%Y-%m-%d %H:%M").replace(tzinfo=TZL), "prim": r["aprovado_de_primeira"]}

def linhas_diff(txt, sinal):
    """{arquivo: set(linhas normalizadas)} das linhas com o sinal dado ('+' ou '-')."""
    out, cur = defaultdict(set), None
    for l in txt.split("\n"):
        if l.startswith("+++ ") or l.startswith("--- "):
            if l.startswith("+++ ") and sinal == "+":
                cur = l[6:] if l.startswith("+++ b/") else None
            if l.startswith("--- ") and sinal == "-":
                cur = l[6:] if l.startswith("--- a/") else None
            continue
        if l.startswith("diff --git"):
            cur = None
            continue
        if cur and l.startswith(sinal):
            s = re.sub(r"\s+", " ", l[1:]).strip()
            if len(s) >= 12 and re.search(r"[A-Za-z]{3}", s):   # ignora }, ), linhas curtas
                out[cur].add(s)
    return out

MRG = re.compile(r"^orquestrador: merge frente/(\S+) \(ticket (\S+)\) em (\S+)$")
add = {}; agente = set(); mh = {}
for l in git("log", "--branches", "--merges", "--since=2026-09-15", "--format=%H %P" + FS + "%s").splitlines():
    hp, s = l.split(FS); p = hp.split(); m = MRG.match(s)
    if m and len(p) >= 3:
        agente.update(git("log", "--format=%H", p[1] + ".." + p[2]).split())
        if m.group(2) in done:
            d = linhas_diff(git("diff", "--no-color", p[1] + "..." + p[2], "--", ".", ":!docs/fila"), "+")
            add.setdefault(m.group(2), defaultdict(set))
            for f, ls in d.items():
                add[m.group(2)][f] |= ls
            mh.setdefault(m.group(2), p[2][:9])

out = git("log", "--branches", "--no-merges", "--since=2026-10-04", "--format=" + SEP + "%H" + FS + "%at" + FS + "%an" + FS + "%s" + FS + "%(trailers:key=Orq-Resolvedor,valueonly)")
res = []
for blk in out.split(SEP)[1:]:
    h, at, an, s, orr = blk.strip("\n").split(FS)[:5]
    dt = datetime.fromtimestamp(int(at), UTC)
    if h in agente or orr.strip() or s.startswith("fila: status automatico do loop") or not (INI <= dt <= FIM):
        continue
    rem = None
    for tid, fa in add.items():
        d0 = done[tid]["dt"]
        if not (d0 < dt <= d0 + timedelta(days=14)):
            continue
        if rem is None:
            rem = linhas_diff(git("show", "--no-color", "--format=", h, "--", ".", ":!docs/fila"), "-")
        hit = {f: len(rem[f] & fa[f]) for f in rem if f in fa and rem[f] & fa[f]}
        if hit:
            res.append((tid, done[tid]["dt"], done[tid]["prim"], mh.get(tid), h[:9], dt, an, s, hit))
print("pares (ticket done, commit fora do loop que apaga linha adicionada pelo ticket, <=14d):", len(res))
print("tickets done distintos:", len({r[0] for r in res}), " | done na janela 04-17/10 com isso:", len({r[0] for r in res if r[1] <= datetime(2026,10,17,23,59,tzinfo=TZL)}))
print("commits distintos:", len({r[4] for r in res}))
prim = {r[0] for r in res if r[2] == "sim"}
print("desses tickets, aprovados de primeira:", len(prim))
for r in sorted(res, key=lambda r: (r[5], r[0])):
    print("  %-6s done %s prim=%-3s frente=%s | %s %s %-14s | %s | %s" % (r[0], r[1].strftime("%m-%d %H:%M"), r[2], r[3], r[4],
          r[5].astimezone(TZL).strftime("%m-%d %H:%M"), r[6][:14], r[7][:80], ";".join("%s:%d" % kv for kv in list(r[8].items())[:3])))
