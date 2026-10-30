"""c5.py — C5: retrabalho em ate 14 dias depois do done. PURO: sem git, sem disco.
O medir.sh monta as entradas (tickets, commits fora do loop, transicoes, tickets novos)
e grava a saida. Testes: test_c5.py, fixtures reais em fixtures/c5/.

Forte: saiu_de_done | revert de sha do ticket | ticket_conserto (texto "conserta o <id>"
  e o diff dele altera linha do ticket) | fix_na_linha (commit fora do loop com fix/corrige/
  bug na mensagem que apaga linha nao trivial adicionada pelo ticket).
Fraco (listado, fora da conta): linha_sem_fix | fix_no_arquivo (sem linha comum, fora dos quentes).
Linha que o mesmo commit apaga e readiciona igual, em qualquer arquivo, nao conta (codigo movido).
Fora: ritual de release/migration (contado a parte) e commit de spec (fila(...) ou so docs/)."""
import re
from datetime import timedelta, timezone

JANELA = timedelta(days=14)
TZL = timezone(timedelta(hours=-3))
FIX = re.compile(r"\b(fix|corrig|conserta|conserto|bug|hotfix)", re.I)
RITUAL = re.compile(r"^(release\(|migrations\(|chore\(migrations\))")
RITUAL_SHAS = ("caef86f60",)          # fix(test): aponta auditoria para migrations renomeadas
SPEC = re.compile(r"^fila[(:]")
CONSERTO = re.compile(r"(?:conserta|conserto d[eoa]s?|corrige)\s+(?:[oa]\s+)?(?:ticket\s+)?#?(\d{3,4}[a-z0-9]*)(?![\w/.])", re.I)
REVERTE = re.compile(r"This reverts commit ([0-9a-f]{7,40})")
FORTES = ("saiu_de_done", "revert", "ticket_conserto", "fix_na_linha")
FRACOS = ("linha_sem_fix", "fix_no_arquivo")


def linhas_diff(texto, sinal):
    """{arquivo: set(linhas normalizadas)} das linhas '+' ou '-' de um patch unificado.
    Ignora linha curta ou sem palavra (fecha-chave, import de uma letra): nao prova autoria."""
    out, cur = {}, None
    for l in texto.split("\n"):
        if l.startswith("diff --git"):
            cur = None
        elif l.startswith("+++ ") or l.startswith("--- "):
            if l[0] == sinal:
                cur = l[6:] if l[4:6] in ("a/", "b/") else None
        elif cur and l.startswith(sinal):
            s = " ".join(l[1:].split())
            if len(s) >= 12 and re.search(r"[A-Za-z]{3}", s):
                out.setdefault(cur, set()).add(s)
    return out


def ids_citados(texto):
    return set(CONSERTO.findall(texto or ""))


def eh_ritual(c):
    return bool(RITUAL.match(c["assunto"])) or c["sha"].startswith(RITUAL_SHAS)


def eh_spec(c):
    fs = c.get("arquivos") or []
    return bool(SPEC.match(c["assunto"])) or (bool(fs) and all(f.startswith("docs/") for f in fs))


def _comum(removidas, adicionadas, readicionadas=frozenset()):
    return {f: v for f, v in ((f, (removidas[f] & adicionadas[f]) - readicionadas) for f in removidas if f in adicionadas) if v}


def avaliar(tickets, commits, corte, transicoes=(), novos=(), quentes=frozenset()):
    """-> (linhas, ritual). Uma linha por evidencia; ticket sem evidencia sai com tipo 'nenhum'.
    So conta o que cai em (done_em, min(done_em + 14d, corte)]."""
    linhas, rit = [], set()
    for t in tickets:
        fim = min(t["done_em"] + JANELA, corte)
        dentro = lambda dt: t["done_em"] < dt <= fim
        arqs_t = set(t.get("arquivos") or t["adicionadas"])
        ev = [("saiu_de_done", tr["sha"], {}) for tr in transicoes if tr["id"] == t["id"] and dentro(tr["dt"])]
        for c in commits:
            if not dentro(c["dt"]):
                continue
            if any(s.startswith(h) for h in REVERTE.findall(c.get("corpo") or "") for s in t["shas"]):
                ev.append(("revert", c["sha"], {}))
                continue
            comum = _comum(c["removidas"], t["adicionadas"], set().union(*(c.get("adicionadas") or {}).values()))
            if eh_ritual(c):
                if comum:
                    rit.add((t["id"], c["sha"]))
                    ev.append(("ritual", c["sha"], comum))
                continue
            if eh_spec(c):
                continue
            fix = bool(FIX.search(c["assunto"]))
            if comum:
                ev.append(("fix_na_linha" if fix else "linha_sem_fix", c["sha"], comum))
            elif fix:
                fs = {f for f in c["arquivos"] if f in arqs_t and not f.startswith("docs/fila/") and f not in quentes}
                if fs:
                    ev.append(("fix_no_arquivo", c["sha"], dict.fromkeys(fs, set())))
        for n in novos:
            if n["id"] != t["id"] and dentro(n["dt"]) and t["id"] in ids_citados(n["texto"]):
                comum = _comum(n["removidas"], t["adicionadas"])
                if comum:
                    ev.append(("ticket_conserto", n["sha"], comum))
        base = {"id": t["id"], "loop": t["loop"], "done_em": t["done_em"].astimezone(TZL).strftime("%Y-%m-%d %H:%M"),
                "dias_acompanhados": max(0, min(14, int((corte - t["done_em"]).total_seconds() // 86400))),
                "sha_aprovado": t["sha_aprovado"], "aprovado_de_primeira": t["prim"]}
        for tipo, sha, fs in ev or [("nenhum", "", {})]:
            forca = "forte" if tipo in FORTES else "fraco" if tipo in FRACOS else "ritual" if tipo == "ritual" else "-"
            linhas.append(dict(base, tipo=tipo, forca=forca, evidencia_sha=sha, arquivos=";".join(sorted(fs)),
                               linhas=sum(len(v) for v in fs.values())))
    ritual = {"pares": len(rit), "tickets": len({a for a, _ in rit}), "commits": len({b for _, b in rit})}
    return linhas, ritual


def _ordem(tid):
    m = re.match(r"(\d+)(.*)", tid)
    return (int(m.group(1)), m.group(2)) if m else (0, tid)


def resumir(tickets, linhas, ritual):
    forte = {l["id"] for l in linhas if l["forca"] == "forte"}

    def bloco(ts):
        u, f = len(ts), sum(1 for t in ts if t["id"] in forte)
        return {"universo": u, "com_forte": f, "pct": round(100.0 * f / u, 1) if u else None}

    por_tipo = lambda tipos: {k: len({l["id"] for l in linhas if l["tipo"] == k}) for k in tipos}
    return {"total": bloco(tickets),
            "plataforma": bloco([t for t in tickets if t["loop"] == "plataforma"]),
            "apolo": bloco([t for t in tickets if t["loop"] == "apolo"]),
            "fortes_por_tipo": por_tipo(FORTES), "fracos_por_tipo": por_tipo(FRACOS),
            "tickets_com_fraco_sem_forte": len({l["id"] for l in linhas if l["forca"] == "fraco"} - forte),
            "aprovados_de_primeira_com_forte": sorted({t["id"] for t in tickets if t["id"] in forte and t["prim"] == "sim"}, key=_ordem),
            "ritual": ritual}
