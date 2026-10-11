#!/usr/bin/env python3
"""montar.py — monta o gabarito do resolvedor 7f-b2 a partir do comarka-operacional.

SÓ LEITURA do comarka (git com GIT_OPTIONAL_LOCKS=0, só `show`, `log` e
`rev-parse`, pelo `Comarka` de ../triador-7f/montar.py); nenhum script do comarka
roda; nada é escrito fora de <saida> (padrão: o diretório deste arquivo).

    python3 test/fixtures/resolvedor-7f/montar.py --comarka ~/Projetos/comarka-operacional

O que sai (o primeiro caso real, feito à mão em 10/10, é o gabarito):

  gabarito/<id>/antes.md    o ticket como o loop deixou: bloqueado, com a nota do motor
  gabarito/<id>/depois.md   o ticket no commit humano
  gabarito/<id>/origem.json de onde saiu cada um

    840  R1  7787af3  teste na allowlist com guarda; cmd do critério da allowlist
    929  R2  7787af3  cmd do criterio[12] trocado (o resolvedor só PROPÕE)
    940  R5  819c49a  árvore suja: reaberto
    932  R5  819c49a  árvore suja: reaberto

  No 7787af3 o `antes` (o pai) já está `pendente`: o `bloqueado` era writeback do
  loop ainda não commitado (~/orq-sessoes/conserto-840-929.md, "Status"). O antes
  daqui é o pai com status e nota do bloqueio, a nota tirada do diagnóstico real
  (~/.orq/diagnosticos/comarka-operacional/<id>.json, `bloqueio.nota_do_motor`).

  casos/<nn>-<id>-L<linha>/ a evidência do bloqueio do 840 e do 929, no formato
  dos casos de ../triador-7f (o `monta_caso` de lá); 940 e 932 já estão lá (36 e 37).

  arvores/929/{alvo,head}/  os arquivos que o criterio[12] lê, na staging-auto da
  hora do bloqueio (o estado em que o trabalho não foi feito) e no head da
  tentativa 2 (sufixo `.fonte`: um .tsx aqui seria coletado pelo tsc do kit).
"""
import argparse, importlib.util, json, os, subprocess

AQUI = os.path.dirname(os.path.abspath(__file__))
_spec = importlib.util.spec_from_file_location("montar_triador", os.path.join(AQUI, "..", "triador-7f", "montar.py"))
T = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(T)

GABARITO = [
    # id, arquivo, commit humano, classe
    ("840", "docs/fila/840-sai-resolver-chave-api-e.md", "7787af3", "R1"),
    ("929", "docs/fila/929-nichos-teses-aba.md", "7787af3", "R2"),
    ("940", "docs/fila/940-nicho-tese-agregado-lib.md", "819c49a", "R5"),
    ("932", "docs/fila/932-ranking-foto-mensal-ddl.md", "819c49a", "R5"),
]
# os bloqueios de 10/10 no local-loop.log (`ticket <id>: BLOQUEADO`)
CASOS = [("840", 86356, "R1"), ("929", 85996, "R2")]
ARVORE_929 = {
    "alvo": ("staging-auto", "2026-10-10T19:21:17Z", ["src/app/dashboard/performance/page.tsx"]),
    "head": ("head.txt da última tentativa da série", None, ["src/app/dashboard/performance/page.tsx",
                                                     "src/app/dashboard/performance/nichos-teses/nichos-teses-aba.tsx"]),
}


def com_bloqueio(md, nota):
    """O pai do commit humano com o writeback do bloqueio: status e nota."""
    velho = '  "status": "pendente",\n  "notas_status": ""\n'
    assert md.count(velho) == 1, "esperava status pendente e nota vazia no pai"
    return md.replace(velho, '  "status": "bloqueado",\n  "notas_status": ' + json.dumps(nota, ensure_ascii=False) + "\n")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--comarka", default=os.path.expanduser("~/Projetos/comarka-operacional"))
    ap.add_argument("--diag", default=os.path.expanduser("~/.orq/diagnosticos/comarka-operacional"))
    ap.add_argument("--saida", default=AQUI)
    a = ap.parse_args()
    cm = T.Comarka(os.path.abspath(a.comarka))
    for d in ("gabarito", "casos", "arvores"):
        subprocess.run(["rm", "-rf", os.path.join(a.saida, d)], check=True)

    for tid, arq, sha, classe in GABARITO:
        depois = cm.git("show", f"{sha}:{arq}")
        pai = cm.git("show", f"{sha}^:{arq}")
        assert depois is not None and pai is not None, (tid, sha)
        origem = {"id": tid, "arquivo": arq, "classe": classe, "commit_humano": cm.git("rev-parse", sha).strip()}
        if '"status": "bloqueado"' in pai:
            antes = pai
            origem["antes"] = f"{sha}^:{arq}"
        else:
            nota = json.load(open(os.path.join(a.diag, f"{tid}.json")))["bloqueio"]["nota_do_motor"]
            antes = com_bloqueio(pai, nota)
            origem["antes"] = f"{sha}^:{arq} com status bloqueado e a nota_do_motor do diagnóstico real"
        origem["depois"] = f"{sha}:{arq}"
        dst = os.path.join(a.saida, "gabarito", tid)
        T.escreve(os.path.join(dst, "antes.md"), T.mascarar(antes))
        T.escreve(os.path.join(dst, "depois.md"), T.mascarar(depois))
        T.json_escreve(os.path.join(dst, "origem.json"), origem)

    for nn, (tid, L, classe) in enumerate(CASOS, 1):
        T.monta_caso(cm, os.path.join(a.saida, "casos"), nn, tid, L, classe, None, [])

    for nome, (ref, antes_de, arqs) in ARVORE_929.items():
        if ref.startswith("head.txt"):
            serie = json.load(open(os.path.join(a.saida, "casos", "02-929-L85996", "serie.json")))
            sha = open(os.path.join(cm.raiz, serie[-1]["dir"], "head.txt")).read().strip()
        else:
            sha = cm.git("log", "-1", "--format=%H", f"--before={antes_de}", ref).strip()
        for f in arqs:
            txt = cm.git("show", f"{sha}:{f}")
            assert txt is not None, (nome, sha, f)
            T.escreve(os.path.join(a.saida, "arvores", "929", nome, f + ".fonte"), T.mascarar(txt))
        T.json_escreve(os.path.join(a.saida, "arvores", "929", f"{nome}.json"), {"ref": ref, "sha": sha, "arquivos": arqs})


if __name__ == "__main__":
    main()
