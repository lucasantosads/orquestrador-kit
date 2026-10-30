"""Contagem estatica (so leitura) das formas da P4 nos criterios dos 3 repos.

A: atribuicao `v=$(... grep -c ...)` seguida de `&&` sem `|| true`/`;` dentro do $( ).
B: `origin/` em cmd de criterio ou recon.
Por status: aberto (pendente/em_execucao/bloqueado) e done.
"""
import glob, json, os, re, sys

REPOS = ["comarka-operacional", "actus-saas", "conteudos-infinitos"]
RE_A = re.compile(r"\b\w+=\$\((?:(?!\|\|)[^()])*grep\s+-[a-zA-Z]*c[a-zA-Z]*\b(?:(?!\|\|)[^()])*\)\s*&&")
RE_B = re.compile(r"\borigin/")

def bloco(path):
    s = open(path, encoding="utf-8").read()
    m = re.search(r"```json\n(.*?)\n```", s, re.S)
    return json.loads(m.group(1)) if m else None

for r in REPOS:
    cont = {"A": {"aberto": [], "done": []}, "B": {"aberto": [], "done": []}}
    n = 0
    for f in sorted(glob.glob(os.path.expanduser(f"~/Projetos/{r}/docs/fila/*.md"))):
        try:
            t = bloco(f)
        except Exception:
            continue
        if not isinstance(t, dict):
            continue
        n += 1
        st = t.get("status")
        g = "done" if st == "done" else ("aberto" if st in ("pendente", "em_execucao", "bloqueado") else None)
        if not g:
            continue
        cmds = [c.get("cmd") or "" for c in (t.get("criterios_aceite") or []) if isinstance(c, dict)]
        cmds += [c.get("cmd") or "" for c in (t.get("recon_esperado") or t.get("recon") or []) if isinstance(c, dict)]
        tid = str(t.get("id"))
        if any(RE_A.search(c) for c in cmds):
            cont["A"][g].append(tid)
        if any(RE_B.search(c) for c in cmds):
            cont["B"][g].append(tid)
    print(f"{r}: {n} tickets")
    for k in "AB":
        print(f"  {k}: aberto={len(cont[k]['aberto'])} {cont[k]['aberto'][:15]} | done={len(cont[k]['done'])}")
