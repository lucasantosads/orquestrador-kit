import csv, sys, re, collections
for w in ("14d", "30d"):
    rows = [r for r in csv.DictReader(open("out/%s/intervencoes.csv" % w)) if r["classe"].startswith("intervencao")]
    print("=====", w, len(rows), "linhas de intervencao;", len({r['data'][:10] for r in rows}), "dias")
    t = collections.OrderedDict()
    for r in rows:
        k = r["tipo"]; t.setdefault(k, []).append(r)
    for k, rs in sorted(t.items(), key=lambda x: -len(x[1])):
        tk = sorted({x for r in rs for x in r["ticket"].split(";") if x != "-"})
        rv = collections.Counter(r["resolvedor_teria_agido"] for r in rs)
        print("%-18s n=%3d tickets=%3d  %s  ex: %s" % (k, len(rs), len(tk), dict(rv), ",".join(tk[:8])))
    print("-- sobra (nao/sem dado), por causa")
    sob = collections.defaultdict(list)
    for r in rows:
        if r["resolvedor_teria_agido"] in ("nao", "sem dado"):
            m = re.search(r"§3 (#\d+|tabela)|\((R\d\??) (D\w+)\)", r["fonte"])
            cl = ""
            if "classe:" in r["fonte"]:
                mm = re.search(r"§3 (#\d+|tabela)", r["fonte"]); cl = r["fonte"].split("classe:")[1].strip()[:60]
            sob[(r["tipo"], r["resolvedor_teria_agido"])].append((r["ticket"], r["commit"], r["motivo"][:70], cl))
    for k, v in sorted(sob.items(), key=lambda x: -len(x[1])):
        print(k, len(v))
        for x in v[:6]: print("    ", x)
