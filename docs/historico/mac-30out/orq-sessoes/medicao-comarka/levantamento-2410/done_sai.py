#!/usr/bin/env python3
"""Toda transicao done -> outro em qualquer .md de ticket, historia toda (--branches). So leitura."""
import os, re, subprocess
os.environ["GIT_OPTIONAL_LOCKS"] = "0"
REPO = os.path.expanduser("~/Projetos/comarka-operacional")
SEP, FS = "\x1e", "\x1f"
TF = re.compile(r"^docs/fila/(?:apolo/|_hold/|_to_delete/)?([0-9]{3,4}[a-z0-9]*)-[^/]*\.md$")
out = subprocess.run(["git", "-C", REPO, "log", "--branches", "--no-merges", "-M", "--name-status",
                      "--format=" + SEP + "%H" + FS + "%ci" + FS + "%an" + FS + "%s", "--", "docs/fila"],
                     capture_output=True, text=True, check=True).stdout
cat = subprocess.Popen(["git", "-C", REPO, "cat-file", "--batch"], stdin=subprocess.PIPE, stdout=subprocess.PIPE)
def st(spec):
    cat.stdin.write((spec + "\n").encode()); cat.stdin.flush()
    head = cat.stdout.readline().decode()
    if head.endswith("missing\n"):
        return None
    n = int(head.split()[2]); d = cat.stdout.read(n); cat.stdout.read(1)
    m = re.search(r'"status"\s*:\s*"([^"]+)"', d.decode("utf-8", "replace"))
    return m.group(1) if m else None
n = 0
for blk in out.split(SEP)[1:]:
    ls = blk.strip().split("\n")
    h, ci, an, s = ls[0].split(FS)
    for l in ls[1:]:
        p = l.split("\t")
        if len(p) < 2:
            continue
        stt, velho, novo = p[0][0], p[1], p[-1]
        m = TF.match(novo) or TF.match(velho)
        if not m:
            continue
        a = st(h + "^:" + velho)
        b = st(h + ":" + novo) if stt != "D" else "(apagado)"
        if a == "done" and b != "done":
            n += 1
            print(h[:9], ci[:16], an, m.group(1), "done ->", b, "|", s[:110])
print("total:", n)
cat.stdin.close(); cat.wait()
