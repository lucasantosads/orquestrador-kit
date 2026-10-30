#!/usr/bin/env python3
"""P4: para cada par forte (ticket x conserto), mensagem do conserto e as linhas do ticket que ele apagou.
So git log/show/diff. Uso: python3 -I p4.py ../out/14d/retrabalho.csv:madura ../out/20d/retrabalho.csv:parcial:2026-10-17"""
import csv, os, subprocess, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
import c5
os.environ["GIT_OPTIONAL_LOCKS"] = "0"
REPO = os.path.expanduser("~/Projetos/comarka-operacional")
def git(*a):
    return subprocess.run(["git", "-C", REPO] + list(a), capture_output=True, text=True, check=True).stdout

pares = {}
for spec in sys.argv[1:]:
    arq, coorte, *ate = spec.split(":")
    for r in csv.DictReader(open(arq)):
        if r["coorte"] == coorte and r["forca"] == "forte" and (not ate or r["done_em"][:10] <= ate[0]):
            pares.setdefault((r["evidencia_sha"], r["id"]), r)
merge_de = {}
for l in git("log", "--branches", "--merges", "--since=2026-09-01", "--format=%H %P%x1f%s").splitlines():
    hp, s = l.split("\x1f"); p = hp.split()
    if s.startswith("orquestrador: merge frente/") and len(p) >= 3:
        merge_de.setdefault(p[2][:9], (p[1], p[2]))
for sha in sorted({s for s, _ in pares}, key=lambda s: git("log", "-1", "--format=%at", s)):
    print("=" * 100)
    print(git("log", "-1", "--format=%h %ad %an%n%s%n%n%b", "--date=format:%d/%m %H:%M", sha).strip()[:1500])
    rem = c5.linhas_diff(git("show", "--no-color", "--format=", sha, "--", ".", ":!docs/fila"), "-")
    for (s, tid), r in sorted(pares.items()):
        if s != sha:
            continue
        b, f = merge_de[r["sha_aprovado"]]
        add = c5.linhas_diff(git("diff", "--no-color", b + "..." + f, "--", ".", ":!docs/fila"), "+")
        print("  --- ticket %s (done %s, prim=%s, aprovado %s)" % (tid, r["done_em"], r["aprovado_de_primeira"], r["sha_aprovado"]))
        for arq in sorted(set(rem) & set(add)):
            for l in sorted(rem[arq] & add[arq])[:4]:
                print("      %s: - %s" % (arq.split("/")[-1], l[:150]))
