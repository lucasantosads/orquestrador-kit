#!/usr/bin/env python3
"""montar.py — o 243 do conteudos-infinitos com as 4 tentativas (etapa 7f-b5, peça 2).

O events.log do 243 tem dois `INICIO attempt=1` (a 1ª volta, que terminou em
REFATIAR, e a volta seguinte) e o meta.json diz o diretório de cada tentativa
(`dir`: attempt-0..3). Esta fixture guarda só o necessário para o leitor do
kit: as linhas do 243 na trilha (com o número original perdido: só elas), o
ticket, o meta.json e, de cada attempt-0..3, os arquivos que o leitor lê.
Tudo passa pela máscara. SÓ LEITURA do repo.

    python3 test/fixtures/triador-leitor-kit/montar.py
"""
import argparse, os, shutil, sys

AQUI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(AQUI, "..", "triador-7f"))
from montar import mascarar  # noqa: E402

LIDOS = ["gates.txt", "criterios.txt", "enforcement.json", "veredito.json", "juiz.veredito.json", "diff.patch"]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--repo", default=os.path.expanduser("~/Projetos/conteudos-infinitos"))
    ap.add_argument("--saida", default=os.path.join(AQUI, "conteudos-243"))
    a = ap.parse_args()
    shutil.rmtree(a.saida, ignore_errors=True)
    runs = os.path.join(a.repo, "docs/fila/runs")
    def grava(rel, txt):
        dst = os.path.join(a.saida, rel)
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        open(dst, "w", encoding="utf-8").write(mascarar(txt))
    ler = lambda p: open(p, encoding="utf-8", errors="replace").read()
    trilha = [l for l in ler(os.path.join(runs, "events.log")).split("\n") if l.split(" ")[1:2] == ["243"]]
    grava("docs/fila/runs/events.log", "\n".join(trilha) + "\n")
    tk = [f for f in os.listdir(os.path.join(a.repo, "docs/fila")) if f.startswith("243-") and f.endswith(".md")][0]
    grava(f"docs/fila/{tk}", ler(os.path.join(a.repo, "docs/fila", tk)))
    grava("docs/fila/runs/243/meta.json", ler(os.path.join(runs, "243/meta.json")))
    for k in range(4):
        for f in LIDOS:
            p = os.path.join(runs, f"243/attempt-{k}", f)
            if os.path.exists(p):
                grava(f"docs/fila/runs/243/attempt-{k}/{f}", ler(p))


if __name__ == "__main__":
    main()
