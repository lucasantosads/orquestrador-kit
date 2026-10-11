#!/usr/bin/env python3
"""montar.py — o 243 do conteudos-infinitos de 11/10/2026 (etapa 7f-b3, peça 3).

O 243 tem 4 tentativas e nenhuma regra casa: vai ao modelo. Em 11/10 o
`claude` não estava no PATH do job do launchd, a chamada nem começou (rc 127,
0 ms) e o ledger ficou com custo nulo, contado como o pior caso no teto.

Fonte: a CÓPIA DA EVIDÊNCIA que o triador gravou naquele dia
(~/.orq/diagnosticos/conteudos-infinitos/243/<assinatura>/evidencia: só o que
ele leu), mais o runs/243/meta.json do repo (lido, não copiado na evidência).
Tudo passa pela máscara. SÓ LEITURA de ~/.orq e do repo.

    python3 test/fixtures/triador-custo-real/montar.py
"""
import argparse, os, shutil, sys

AQUI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(AQUI, "..", "triador-7f"))
from montar import mascarar  # noqa: E402

ASSINATURA = "0a6368fbb44b"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--diag", default=os.path.expanduser(f"~/.orq/diagnosticos/conteudos-infinitos/243/{ASSINATURA}/evidencia"))
    ap.add_argument("--repo", default=os.path.expanduser("~/Projetos/conteudos-infinitos"))
    ap.add_argument("--saida", default=os.path.join(AQUI, "conteudos-243"))
    a = ap.parse_args()
    shutil.rmtree(a.saida, ignore_errors=True)
    pares = [(os.path.join(r, f), os.path.relpath(os.path.join(r, f), a.diag)) for r, _, fs in os.walk(a.diag) for f in fs]
    pares.append((os.path.join(a.repo, "docs/fila/runs/243/meta.json"), "docs/fila/runs/243/meta.json"))
    for src, rel in sorted(pares):
        dst = os.path.join(a.saida, rel)
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        with open(src, encoding="utf-8", errors="replace") as fh:
            open(dst, "w", encoding="utf-8").write(mascarar(fh.read()))


if __name__ == "__main__":
    main()
