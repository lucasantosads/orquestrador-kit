#!/usr/bin/env python3
"""Tabelas da P3 a partir do retrabalho.csv do medir.sh. Uso: python3 -I p3.py <retrabalho.csv> <coorte> [ate AAAA-MM-DD]"""
import csv, sys
from collections import defaultdict

arq, coorte = sys.argv[1], sys.argv[2]
ate = sys.argv[3] if len(sys.argv) > 3 else "9999"
rows = [r for r in csv.DictReader(open(arq)) if r["coorte"] == coorte and r["done_em"][:10] <= ate]
tk = {}
for r in rows:
    tk.setdefault(r["id"], {"loop": r["loop"], "prim": r["aprovado_de_primeira"], "dias": int(r["dias_acompanhados"]), "ev": []})
    if r["tipo"] != "nenhum":
        tk[r["id"]]["ev"].append(r)
TIPOS_F = ["saiu_de_done", "revert", "ticket_conserto", "fix_na_linha"]
TIPOS_W = ["linha_sem_fix", "fix_no_arquivo"]
print("| loop | done | " + " | ".join(TIPOS_F) + " | fracos (sem forte) | ritual | C5 | C2 da coorte | C2 sem retrabalho forte | dias acomp. (min/med) |")
print("|---" * 11 + "|")
for loop in ("plataforma", "apolo", "total"):
    ts = {i: t for i, t in tk.items() if loop == "total" or t["loop"] == loop}
    n = len(ts)
    if not n:
        print("| %s | 0 |%s" % (loop, " — |" * 9)); continue
    forte = {i for i, t in ts.items() if any(e["forca"] == "forte" for e in t["ev"])}
    fraco = {i for i, t in ts.items() if any(e["forca"] == "fraco" for e in t["ev"])} - forte
    rit = {i for i, t in ts.items() if any(e["forca"] == "ritual" for e in t["ev"])}
    por = [len({i for i, t in ts.items() if any(e["tipo"] == k for e in t["ev"])}) for k in TIPOS_F]
    prim = {i for i, t in ts.items() if t["prim"] == "sim"}
    dias = sorted(t["dias"] for t in ts.values())
    print("| %s | %d | %s | %d | %d | %.1f%% (%d) | %.1f%% (%d) | %.1f%% (%d) | %d / %d |" % (
        loop, n, " | ".join(map(str, por)), len(fraco), len(rit), 100.0 * len(forte) / n, len(forte),
        100.0 * len(prim) / n, len(prim), 100.0 * len(prim - forte) / n, len(prim - forte), dias[0], dias[len(dias) // 2]))
print()
print("Aprovados de primeira com retrabalho forte (C2 inflado):")
for i, t in sorted(tk.items(), key=lambda x: x[1]["ev"][0]["done_em"] if x[1]["ev"] else ""):
    fs = [e for e in t["ev"] if e["forca"] == "forte"]
    if fs and t["prim"] == "sim":
        print("  %s (%s, done %s, %dd): %s" % (i, t["loop"], fs[0]["done_em"], t["dias"], "; ".join("%s %s [%s]" % (e["tipo"], e["evidencia_sha"], e["arquivos"][:80]) for e in fs)))
print()
print("Todos os fortes (id, prim, sha aprovado, sha do conserto, arquivos, linhas):")
for i, t in sorted(tk.items()):
    for e in t["ev"]:
        if e["forca"] == "forte":
            print("  %s\t%s\t%s\t%s\t%s\t%s\t%s" % (i, e["done_em"], t["prim"], e["sha_aprovado"], e["evidencia_sha"], e["arquivos"][:90], e["linhas"]))
