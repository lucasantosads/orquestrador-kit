#!/usr/bin/env python3
"""montar.py — os bloqueados SEM TENTATIVA do primeiro dia do resolvedor
(11/10/2026, etapa 7f-b3), reproduzidos como um repo do kit.

SÓ LEITURA do actus-saas: lê os .md da fila e o liberacoes.json; nenhum git,
nenhum script do actus. Escreve só em <saida> (padrão: actus-1110/ ao lado).

    python3 test/fixtures/triador-sem-tentativa/montar.py --actus ~/Projetos/actus-saas

O que vai: o 1º bloco json de cada bloqueado (mascarado, como o triador lê) e,
das dependências, só id, slug e status (é o que o triador olha nelas); os
tokens `humano:` das dependências que estão no liberacoes.json; um
`runs/events.log` vazio (o Actus não tem INICIO desses ids: sem tentativa) e o
diff_cap do config. Os 7 do Actus foram 7 das 8 entradas do ledger de 11/10
(a 8ª, o 243 do conteudos-infinitos, tem 4 tentativas: é da peça 3).
"""
import argparse, glob, json, os, re, sys

AQUI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(AQUI, "..", "triador-7f"))
from montar import mascarar  # noqa: E402

BLOQUEADOS = ["517a", "518", "519", "520", "521", "527", "532"]


def bloco(caminho):
    m = re.search(r"```json\n(.*?)\n```", open(caminho, encoding="utf-8").read(), re.S)
    return json.loads(m.group(1))


def md(j):
    return "# " + str(j.get("id")) + "\n\n```json\n" + json.dumps(j, ensure_ascii=False, indent=2) + "\n```\n"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--actus", default=os.path.expanduser("~/Projetos/actus-saas"))
    ap.add_argument("--saida", default=os.path.join(AQUI, "actus-1110"))
    a = ap.parse_args()
    fila = os.path.join(a.actus, "docs/fila")
    out = os.path.join(a.saida, "docs/fila")
    os.makedirs(os.path.join(out, "runs"), exist_ok=True)
    acha = lambda i: (glob.glob(os.path.join(fila, f"{i}-*.md")) or [None])[0]
    deps, tokens = set(), set()
    for i in BLOQUEADOS:
        f = acha(i)
        j = json.loads(mascarar(json.dumps(bloco(f), ensure_ascii=False)))
        open(os.path.join(out, os.path.basename(f)), "w", encoding="utf-8").write(md(j))
        for d in j.get("dependencias", []):
            (tokens if d.startswith("humano:") else deps).add(d)
    for d in sorted(deps - set(BLOQUEADOS)):
        f = acha(d)
        if f:
            j = bloco(f)
            open(os.path.join(out, os.path.basename(f)), "w", encoding="utf-8").write(md({k: j.get(k) for k in ("id", "slug", "status")}))
    lib = json.load(open(os.path.join(fila, "liberacoes.json")))
    lib["tokens"] = [t for t in lib.get("tokens", []) if t.get("token") in tokens]
    lib["liberadas"] = [t for t in lib.get("liberadas", []) if t.get("token") in tokens]
    json.dump(lib, open(os.path.join(out, "liberacoes.json"), "w"), ensure_ascii=False, indent=1)
    cfg = json.load(open(os.path.join(fila, "000-config.json")))
    json.dump({"diff_cap_linhas": cfg.get("diff_cap_linhas"), "fonte": "actus-saas docs/fila/000-config.json"}, open(os.path.join(out, "000-config.json"), "w"), indent=1)
    open(os.path.join(out, "runs", "events.log"), "w").close()


if __name__ == "__main__":
    main()
