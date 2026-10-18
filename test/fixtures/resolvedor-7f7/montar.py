#!/usr/bin/env python3
"""montar.py — os resgates humanos de allowlist do Comarka depois de 11/10 (etapa 7f-b7).

SÓ LEITURA do comarka (git com GIT_OPTIONAL_LOCKS=0, só `show`, `log` e
`rev-parse`, pelo `Comarka` de ../triador-7f/montar.py) e de
~/.orq/diagnosticos (a nota do motor); nenhum script do comarka roda; nada é
escrito fora de <saida> (padrão: o diretório deste arquivo).

    python3 test/fixtures/resolvedor-7f7/montar.py --comarka ~/Projetos/comarka-operacional

As 13 linhas `allowlist` de ~/orq-sessoes/medicao-comarka/out/14d/intervencoes.csv
com data a partir de 11/10. Cada ticket cuja allowlist mudou no commit humano e
que estava bloqueado antes dele vira:

  casos/<nn>-<id>-L<linha>/  a evidência do bloqueio (o `monta_caso` de
                             ../triador-7f), L = a última linha `ticket <id>:
                             … BLOQUEADO` do local-loop.log antes do commit
  gabarito/<id>/antes.md     o pai do commit humano, com o status e a nota do
                             bloqueio quando o writeback ainda não estava commitado
  gabarito/<id>/depois.md    o ticket no commit humano
  gabarito/<id>/origem.json  de onde saiu cada um

As linhas sem ticket bloqueado (releases que só renomeiam a migration de um
ticket done; tickets da linha embutida sem allowlist nova) vão para
`linhas.json` com o motivo, sem caso.
"""
import argparse, importlib.util, json, os, re, subprocess

AQUI = os.path.dirname(os.path.abspath(__file__))
_spec = importlib.util.spec_from_file_location("montar_triador", os.path.join(AQUI, "..", "triador-7f", "montar.py"))
T = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(T)

# (data do csv, commit humano, tickets da linha, linha do bloqueio de cada um no local-loop.log)
LINHAS = [
    ("2026-10-11 00:42", "079d3f465", {"952a": None, "972": None}),
    ("2026-10-11 11:02", "cc8d3887b", {"932": None}),
    ("2026-10-11 12:27", "5525c7db6", {"1006": 88744}),
    ("2026-10-12 11:08", "4b5dd2eab", {"318c": 91371, "933": 90709, "934b": 90762, "935": 91112}),
    ("2026-10-12 11:28", "af768b088", {"966": 91808}),
    ("2026-10-12 11:29", "05d951e93", {"830": 90450}),
    ("2026-10-12 13:09", "ab4e95cb4", {"854": 90601}),
    ("2026-10-12 20:19", "638e00305", {"855": 94163}),
    ("2026-10-13 00:33", "c00ee4b15", {"924a": 95742}),
    ("2026-10-14 11:21", "b7a3eea2f", {"1053": 99695, "1053b": 99752, "1054": 100167, "1055b": 100707,
                                       "1056b": None, "1101": None, "924c": 99993}),
    ("2026-10-14 19:22", "cf2fe3a97", {"1059": 101480}),
    ("2026-10-15 11:58", "832436272", {"1058": 103224}),
    ("2026-10-17 05:34", "75db690c0", {"1195": 109677}),
]


def json_do(md):
    m = re.search(r"```json\n(.*?)\n```", md or "", re.S)
    return json.loads(m.group(1)) if m else {}


def com_bloqueio(md, nota):
    """O pai com o writeback do bloqueio (status e nota), quando ele ainda não estava commitado."""
    md2, n = re.subn(r'  "status": "[^"]*",\n  "notas_status": "(?:[^"\\]|\\.)*"\n',
                     '  "status": "bloqueado",\n  "notas_status": ' + json.dumps(nota, ensure_ascii=False) + "\n", md)
    assert n == 1, "esperava status e notas_status no fim do json do ticket"
    return md2


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--comarka", default=os.path.expanduser("~/Projetos/comarka-operacional"))
    ap.add_argument("--diag", default=os.path.expanduser("~/.orq/diagnosticos/comarka-operacional"))
    ap.add_argument("--saida", default=AQUI)
    a = ap.parse_args()
    cm = T.Comarka(os.path.abspath(a.comarka))
    for d in ("gabarito", "casos"):
        subprocess.run(["rm", "-rf", os.path.join(a.saida, d)], check=True)

    linhas, nn = [], 0
    for data, sha, tickets in LINHAS:
        sha_full = cm.git("rev-parse", sha).strip()
        for tid, L in tickets.items():
            arq = cm.arquivo_do_ticket(tid)
            pai, depois = cm.git("show", f"{sha}^:{arq}"), cm.git("show", f"{sha}:{arq}")
            mais = sorted(set(json_do(depois).get("pathspec_allowlist", [])) - set(json_do(pai).get("pathspec_allowlist", [])))
            item = {"data": data, "commit": sha_full, "id": tid, "arquivo": arq, "allowlist_mais": mais, "linha_bloqueio": L}
            if L is None or not mais:
                item["caso"] = None
                item["motivo"] = "sem bloqueio antes do commit (ticket done: release)" if L is None and mais else \
                    "sem bloqueio antes do commit e sem allowlist nova" if L is None else "allowlist não mudou neste ticket"
                linhas.append(item)
                continue
            nn += 1
            destino = T.monta_caso(cm, os.path.join(a.saida, "casos"), nn, tid, L, "R1", None, [])
            item["caso"] = os.path.relpath(destino, a.saida)
            origem = {"id": tid, "arquivo": arq, "commit_humano": sha_full, "depois": f"{sha}:{arq}"}
            if json_do(pai).get("status") == "bloqueado":
                antes = pai
                origem["antes"] = f"{sha}^:{arq}"
            else:
                dp = os.path.join(a.diag, f"{tid}.json")
                nota = json.load(open(dp))["bloqueio"]["nota_do_motor"] if os.path.exists(dp) else \
                    re.sub(r"^\[orq [0-9:]+\] ticket \S+: ", "", cm.log()[L - 1])
                antes = com_bloqueio(pai, nota)
                origem["antes"] = f"{sha}^:{arq} com status bloqueado e a nota do motor"
            dst = os.path.join(a.saida, "gabarito", tid)
            T.escreve(os.path.join(dst, "antes.md"), T.mascarar(antes))
            T.escreve(os.path.join(dst, "depois.md"), T.mascarar(depois))
            T.json_escreve(os.path.join(dst, "origem.json"), origem)
            linhas.append(item)
    T.json_escreve(os.path.join(a.saida, "linhas.json"), linhas)


if __name__ == "__main__":
    main()
