#!/usr/bin/env python3
"""
orq-painel.py — o painel único dos orquestradores (peça K12).

Um servidor local (127.0.0.1) que responde, para N repos instalados, as duas
perguntas de quem deixa a tela aberta o dia inteiro: TEM ALGO ESPERANDO POR
MIM, e ESTÁ ANDANDO OU PAROU.

REGRA DE DADO. Lê SÓ o contrato do motor (CONTRATO.md):
  docs/fila/runs/STATUS.md       §3   o snapshot
  docs/fila/runs/events.log      §4   a trilha
  docs/fila/runs/custo.json      §5.1 o ledger (caminho: cfg .orcamento.custo_file)
  docs/fila/liberacoes.json      §6   via pendentes_razoes (abaixo)
  docs/fila/<id>-*.md            §2   o PRIMEIRO bloco json de cada ticket
  docs/fila/000-config.json      §8   runs_dir, pausar_file, claude_timeout_secs, launchd
  docs/fila/PAUSAR               §7   (e o legado .orq-pause, só lido)
Nada de evidência de tentativa, log verboso ou formato livre. O que o contrato
não diz, a tela mostra como "sem dado" — nunca estimado.

"Por que cada pendente não roda" NÃO é recalculado aqui: o painel chama
`pendentes_razoes` do local-loop.sh (a mesma régua do evento OCIOSO e do
`deps_resolvidas`) com ORQ_EXEC_ROOT apontando para o repo. Duas
implementações da mesma pergunta divergem no primeiro ajuste.

A LISTA DE REPOS vem de um arquivo (ORQ_REPOS, padrão ~/.orq/repos.json), e
não há ramo por nome de repo em lugar nenhum: tudo o que difere entre repos
sai do config de cada um.

  {"$schema_versao": 1, "repos": [{"caminho": "/abs/repo", "nome": "opcional"}]}

Uso:
  python3 orq-painel.py                 # http://127.0.0.1:8787
  python3 orq-painel.py --porta 9000
  python3 orq-painel.py --estado        # o JSON de /api/estado, uma vez
  python3 orq-painel.py --html          # a página, uma vez
"""

import json
import os
import re
import subprocess
import sys
import threading
import time
from datetime import datetime
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

AQUI = Path(__file__).resolve().parent

HOST = "127.0.0.1"          # nunca 0.0.0.0: o painel age sobre repos locais
PORTA_PADRAO = 8787
TTL_CACHE_SEG = 3           # GET / e /api/estado no mesmo poll não varrem 2x
ATUALIZA_MS = 15000
LIMITE_CORPO = 4096

RUNS_PADRAO = "docs/fila/runs"
PAUSAR_PADRAO = "docs/fila/PAUSAR"
PAUSA_LEGADA = "docs/fila/.orq-pause"   # lida por compatibilidade, NUNCA escrita

# Desfechos de uma tentativa na trilha: o que fecha um INICIO.
DESFECHOS = ("APROVADO", "REPROVADO", "ADIADO", "BLOQUEADO", "REFATIAR",
             "EXECUTOR_MORREU")
# Campos que vão até o fim da linha (CONTRATO §4.1: `causa=`; `nota=` da ANOTACAO).
CAMPOS_ATE_O_FIM = ("causa", "nota")


def agora():
    """O relógio do painel. ORQ_PAINEL_AGORA existe para teste: sem ela, um
    teste rodado às 00:03 veria "hoje" sem nenhum evento que acabou de gravar."""
    v = os.environ.get("ORQ_PAINEL_AGORA")
    try:
        return float(v) if v else time.time()
    except ValueError:
        return time.time()


def meia_noite(t):
    d = datetime.fromtimestamp(t)
    return datetime(d.year, d.month, d.day).timestamp()


def dur(seg):
    """Duração para ler de relance: '6 min', '21h', '2h05', '3d4h'."""
    if seg is None:
        return "?"
    s = max(0, int(seg))
    if s < 60:
        return f"{s} s"
    if s < 3600:
        return f"{s // 60} min"
    if s < 86400:
        h, m = s // 3600, (s % 3600) // 60
        return f"{h}h" if m == 0 else f"{h}h{m:02d}"
    d, h = s // 86400, (s % 86400) // 3600
    return f"{d}d" if h == 0 else f"{d}d{h}h"


def hhmm(t):
    return datetime.fromtimestamp(t).strftime("%H:%M") if t else "?"


# ------------------------------------------------------------- lista de repos

def arquivo_repos():
    return Path(os.environ.get("ORQ_REPOS") or Path.home() / ".orq" / "repos.json")


def ler_repos():
    """([{nome, caminho}], erro). Arquivo ausente ou ilegível não derruba a
    tela: ela diz qual arquivo falta e em que formato."""
    arq = arquivo_repos()
    exemplo = '{"$schema_versao": 1, "repos": [{"caminho": "/abs/repo"}]}'
    try:
        dados = json.loads(arq.read_text(encoding="utf-8"))
    except FileNotFoundError:
        return [], f"sem {arq}: crie com {exemplo}"
    except (OSError, ValueError) as e:
        return [], f"{arq} ilegível ({e}); formato: {exemplo}"
    itens = dados.get("repos") if isinstance(dados, dict) else None
    if not isinstance(itens, list):
        return [], f"{arq} sem a lista \"repos\"; formato: {exemplo}"
    repos, vistos = [], set()
    for it in itens:
        cam = it if isinstance(it, str) else (it.get("caminho") if isinstance(it, dict) else None)
        if not isinstance(cam, str) or not cam.strip():
            continue
        cam = str(Path(cam).expanduser())
        nome = it.get("nome") if isinstance(it, dict) else None
        nome = nome if isinstance(nome, str) and nome.strip() else Path(cam).name
        base, n = nome, 2
        while nome in vistos:
            nome, n = f"{base}-{n}", n + 1
        vistos.add(nome)
        repos.append({"nome": nome, "caminho": cam})
    return repos, None


# ------------------------------------------------------------ leitores do contrato

def ler_json(p):
    try:
        return json.loads(Path(p).read_text(encoding="utf-8")), None
    except FileNotFoundError:
        return None, "ausente"
    except (OSError, ValueError) as e:
        return None, f"ilegível: {e}"


def cfg_str(cfg, chave, padrao):
    v = cfg.get(chave) if isinstance(cfg, dict) else None
    return v.strip() if isinstance(v, str) and v.strip() else padrao


def cfg_int(v):
    return v if isinstance(v, int) and not isinstance(v, bool) and v > 0 else None


def ler_status(caminho):
    """STATUS.md (§3) como dict: estado, ticket, desde, fase, ultimo, motivo."""
    try:
        linhas = Path(caminho).read_text(encoding="utf-8").splitlines()
    except OSError:
        return None
    chaves = {"ESTADO": "estado", "TICKET": "ticket", "DESDE": "desde",
              "FASE": "fase", "ÚLTIMO": "ultimo", "MOTIVO": "motivo"}
    st = {}
    for l in linhas:
        if l.startswith("ORQUESTRADOR"):
            st["gerado"] = l.split("·", 1)[-1].strip()
            continue
        partes = l.split(None, 1)
        if partes and partes[0] in chaves:
            st[chaves[partes[0]]] = partes[1].strip() if len(partes) > 1 else ""
    return st


def campos(resto):
    """`k=v k=v` de uma linha da trilha. Valor com espaço continua até o próximo
    `k=`; `causa=` e `nota=` vão até o fim da linha (CONTRATO §4.1)."""
    out, chave = {}, None
    for tok in resto.split(" ") if resto else []:
        if chave in CAMPOS_ATE_O_FIM:
            out[chave] += " " + tok
            continue
        m = re.match(r"^([A-Za-z_][A-Za-z0-9_]*|[0-9]{3}[a-z]?)=(.*)$", tok)
        if m:
            chave = m.group(1)
            out[chave] = m.group(2)
        elif chave:
            out[chave] += " " + tok
    return out


def linha_evento(l):
    partes = l.rstrip("\n").split(" ", 3)
    if len(partes) < 3:
        return None
    try:
        ts = datetime.strptime(partes[0], "%Y-%m-%dT%H:%M:%S%z").timestamp()
    except ValueError:
        return None
    return {"ts": ts, "id": partes[1], "ev": partes[2],
            "f": campos(partes[3] if len(partes) > 3 else "")}


_trilhas = {}
_trava = threading.Lock()


def ler_trilha(caminho):
    """events.log inteiro, lido INCREMENTALMENTE: a trilha é append-only (§4),
    então só o que cresceu desde a última leitura é parseado."""
    caminho = str(caminho)
    try:
        st = os.stat(caminho)
    except OSError:
        _trilhas.pop(caminho, None)
        return []
    with _trava:
        c = _trilhas.get(caminho)
        if not c or c["ino"] != st.st_ino or st.st_size < c["off"]:
            c = {"ino": st.st_ino, "off": 0, "eventos": []}
        if st.st_size > c["off"]:
            with open(caminho, "rb") as fh:
                fh.seek(c["off"])
                bruto = fh.read(st.st_size - c["off"])
            fim = bruto.rfind(b"\n")
            if fim >= 0:
                for l in bruto[:fim].decode("utf-8", "replace").split("\n"):
                    e = linha_evento(l)
                    if e:
                        c["eventos"].append(e)
                c["off"] += fim + 1
        _trilhas[caminho] = c
        return c["eventos"]


_tickets = {}


def bloco_json(texto):
    """O PRIMEIRO bloco ```json (§2, divergência 10): a cerca é comparada sem o
    espaço em volta, como nos três leitores do motor."""
    dentro, linhas = False, []
    for l in texto.splitlines():
        cerca = l.strip()
        if not dentro and cerca == "```json":
            dentro = True
            continue
        if dentro and cerca == "```":
            return "\n".join(linhas)
        if dentro:
            linhas.append(l)
    return None


def ler_tickets(fila):
    """Tickets na ordem em que o loop os considera (`ticket_files`: sort por nome)."""
    try:
        nomes = sorted(n for n in os.listdir(fila)
                       if n.endswith(".md") and n[:1].isdigit())
    except OSError:
        return []
    out = []
    for n in nomes:
        p = os.path.join(fila, n)
        try:
            st = os.stat(p)
        except OSError:
            continue
        chave = (st.st_mtime_ns, st.st_size)
        c = _tickets.get(p)
        if not c or c[0] != chave:
            try:
                bloco = bloco_json(Path(p).read_text(encoding="utf-8"))
                t = json.loads(bloco) if bloco is not None else None
            except (OSError, ValueError):
                t = None
            c = (chave, t if isinstance(t, dict) else None)
            _tickets[p] = c
        t = c[1]
        if t is None:
            out.append({"id": n.split("-", 1)[0], "arquivo": n, "status": "ilegível",
                        "slug": "", "objetivo": "", "allow": [], "deps": [],
                        "notas": "", "tentativas": None})
            continue
        allow = t.get("pathspec_allowlist")
        deps = t.get("dependencias")
        tent = t.get("tentativas")
        out.append({
            "id": str(t.get("id") or n.split("-", 1)[0]), "arquivo": n,
            "status": str(t.get("status") or "?"), "slug": str(t.get("slug") or ""),
            "objetivo": str(t.get("objetivo") or ""),
            "allow": [a for a in allow if isinstance(a, str)] if isinstance(allow, list) else [],
            "deps": [d for d in deps if isinstance(d, str)] if isinstance(deps, list) else [],
            "notas": str(t.get("notas_status") or ""),
            "tentativas": tent if isinstance(tent, int) and not isinstance(tent, bool) else None,
        })
    return out


# ------------------------------------------------ a régua do motor: pendentes_razoes

SCRIPT_RAZOES = r'''
LOCAL_LOOP_SOURCED=1
source "$1/local-loop.sh" || exit 3
set +e
r="$(pendentes_razoes "" "")"
printf '%s\n' "$r"
printf '%s\n' '#legivel'
ocioso_legivel "$(printf '%s\n' "$r" | awk '$2 != "pronto"')"
'''

_razoes = {}


def assinatura_fila(caminho, cfg):
    """O que muda a resposta de pendentes_razoes: tickets, liberações, cooldown
    e o relógio (adiado_ate e cooldown vencem sozinhos) — por minuto."""
    fila = Path(caminho) / "docs" / "fila"
    base = [int(agora() // 60)]
    alvos = [Path(caminho) / cfg_str(cfg, "liberacoes_file", "docs/fila/liberacoes.json"),
             Path(caminho) / cfg_str(cfg, "runs_dir", RUNS_PADRAO) / ".cooldown-until"]
    try:
        alvos += [fila / n for n in os.listdir(fila) if n.endswith(".md")]
    except OSError:
        pass
    for p in sorted(alvos):
        try:
            s = os.stat(p)
            base.append((str(p), s.st_mtime_ns, s.st_size))
        except OSError:
            base.append((str(p), None))
    return tuple(base)


def razoes_pendentes(caminho, cfg):
    """({id: razão}, legível, erro). `pronto` = roda agora."""
    chave = assinatura_fila(caminho, cfg)
    c = _razoes.get(caminho)
    if c and c[0] == chave:
        return c[1]
    env = dict(os.environ, ORQ_EXEC_ROOT=str(caminho))
    try:
        r = subprocess.run(["bash", "-c", SCRIPT_RAZOES, "orq-painel", str(AQUI)],
                           cwd=str(caminho), env=env, capture_output=True,
                           text=True, timeout=60)
    except (OSError, subprocess.TimeoutExpired) as e:
        res = ({}, "", f"pendentes_razoes não rodou: {e}")
        _razoes[caminho] = (chave, res)
        return res
    if r.returncode != 0 or "#legivel" not in r.stdout:
        ult = (r.stderr.strip().splitlines() or ["sem saída"])[-1]
        res = ({}, "", f"pendentes_razoes rc {r.returncode}: {ult}")
    else:
        corpo, legivel = r.stdout.split("#legivel", 1)
        raz = {}
        for l in corpo.splitlines():
            p = l.split(" ", 1)
            if len(p) == 2:
                raz[p[0]] = p[1].strip()
        res = (raz, legivel.strip(), None)
    _razoes[caminho] = (chave, res)
    return res


def cadeia(tid, raz):
    """[tid, dep, dep-da-dep, ...] seguindo `dependencia:<id>:pendente` até a
    raiz; o último elemento é a razão final: ('token', t), ('bloqueado', id),
    ('pronto', id) ou ('outro', razão)."""
    vistos, ids = set(), []
    atual = tid
    while atual in raz and atual not in vistos:
        vistos.add(atual)
        ids.append(atual)
        r = raz[atual]
        if r == "pronto":
            return ids, ("pronto", atual)
        if r.startswith("liberacao:"):
            return ids, ("token", r[len("liberacao:"):])
        if r.startswith("dependencia:"):
            p = r.split(":")
            dep, stt = p[1], p[-1]
            if stt == "pendente" and dep in raz:
                atual = dep
                continue
            if stt == "bloqueado":
                return ids, ("bloqueado", dep)
        return ids, ("outro", r)
    return ids, ("outro", "ciclo")


# ---------------------------------------------------------------- bloqueados

def mapa_sub(sub):
    if sub == "gate_testes":
        return "teste"
    if sub and sub.startswith("gate_"):
        return "gate"
    return {"criterio": "spec", "juiz": "juiz", "exit": "exit"}.get(sub or "", None)


def categoria_bloqueio(tid, eventos):
    """(categoria, token, BLOQUEADO) de `motivo=` e `sub=` na trilha — nunca da
    prosa do notas_status. Bloqueado SEM `BLOQUEADO` na trilha (ou reaberto
    depois dele) foi posto à mão: é decisão de humano."""
    bloq, sub_rep = None, None
    for e in reversed(eventos):
        if e["id"] != tid:
            continue
        if bloq is None:
            if e["ev"] == "RECUPERADO":
                return "decisão sua", "sem BLOQUEADO na trilha", None
            if e["ev"] == "BLOQUEADO":
                bloq = e
            continue
        if e["ev"] == "REPROVADO":
            sub_rep = e["f"].get("sub")
            break
    if bloq is None:
        return "decisão sua", "sem BLOQUEADO na trilha", None
    m = bloq["f"].get("motivo", "")
    sub = bloq["f"].get("sub") or sub_rep
    token = m + (f" · {sub}" if sub else "")
    if m == "enforcement":
        return "enforcement", token, bloq
    if m == "diff_cap":
        return "tamanho", token, bloq
    if m in ("sem_progresso", "adiamentos"):
        return "ambiente", token, bloq
    if m == "merge_falhou":
        return "merge", token, bloq
    return mapa_sub(sub) or "outro", token, bloq


# -------------------------------------------------------------------- coleta

def ultimo(eventos, pred):
    for e in reversed(eventos):
        if pred(e):
            return e
    return None


def pausa_do_repo(caminho, cfg):
    """O sentinela (§7): o `pausar_file` do config e, por compatibilidade, o
    legado. Conteúdo `<AAAA-MM-DD HH:MM> | <motivo>`."""
    rel = cfg_str(cfg, "pausar_file", PAUSAR_PADRAO)
    for arq, legado in ((rel, False), (PAUSA_LEGADA, True)):
        p = Path(caminho) / arq
        if not p.is_file():
            continue
        try:
            texto = p.read_text(encoding="utf-8").strip()
        except OSError:
            texto = ""
        m = re.match(r"^(\d{4}-\d{2}-\d{2} \d{2}:\d{2})\s*\|\s*(.*)$", texto.splitlines()[0] if texto else "")
        ts = None
        if m:
            try:
                ts = datetime.strptime(m.group(1), "%Y-%m-%d %H:%M").timestamp()
            except ValueError:
                ts = None
        return {"ativa": True, "arquivo": arq, "legado": legado, "ts": ts,
                "motivo": (m.group(2) if m else texto).strip() or "sem motivo escrito"}
    return {"ativa": False, "arquivo": rel, "legado": False, "ts": None, "motivo": ""}


def coletar_repo(r, t):
    caminho = r["caminho"]
    cfg, cfg_erro = ler_json(Path(caminho) / "docs" / "fila" / "000-config.json")
    cfg = cfg if isinstance(cfg, dict) else {}
    runs = Path(caminho) / cfg_str(cfg, "runs_dir", RUNS_PADRAO)
    st = ler_status(runs / "STATUS.md")
    eventos = ler_trilha(runs / "events.log")
    tickets = ler_tickets(Path(caminho) / "docs" / "fila")
    raz, legivel, raz_erro = razoes_pendentes(caminho, cfg) if not cfg_erro else ({}, "", None)
    pausa = pausa_do_repo(caminho, cfg)
    hoje = meia_noite(t)
    ev_hoje = [e for e in eventos if e["ts"] >= hoje]

    por_id = {x["id"]: x for x in tickets}
    pendentes = [x for x in tickets if x["status"] == "pendente"]
    prontos = [x for x in pendentes if raz.get(x["id"]) == "pronto"]
    bloqueados_t = [x for x in tickets if x["status"] == "bloqueado"]

    rep = {
        "nome": r["nome"], "caminho": caminho,
        "erro": f"000-config.json {cfg_erro}" if cfg_erro else raz_erro,
        "status_md": st is not None,
        "pausa": pausa,
        "contagem": {"prontos": len(prontos), "pendentes": len(pendentes),
                     "bloqueados": len(bloqueados_t)},
        "dia": {"aprovados": sum(1 for e in ev_hoje if e["ev"] == "APROVADO"),
                "reprovas": sum(1 for e in ev_hoje if e["ev"] == "REPROVADO")},
        "proximos": [{"ordem": i + 1, "id": x["id"], "titulo": x["slug"]}
                     for i, x in enumerate(prontos[:3])],
        "proximos_resto": max(0, len(prontos) - 3),
    }

    # bloqueados, com a categoria da trilha
    bl = []
    for x in bloqueados_t:
        cat, token, ev = categoria_bloqueio(x["id"], eventos)
        linhas = x["notas"].splitlines() or [""]
        tent = x["tentativas"]
        if tent is None and ev and str(ev["f"].get("attempt", "")).isdigit():
            tent = int(ev["f"]["attempt"])
        bl.append({"repo": r["nome"], "id": x["id"], "titulo": x["slug"],
                   "categoria": cat, "motivo_token": token,
                   "motivo": linhas[0].strip() or "sem notas_status no ticket",
                   "motivo_resto": "\n".join(linhas[1:]).strip(),
                   "allow": x["allow"], "tentativas": tent,
                   "parado_desde": ev["ts"] if ev else None,
                   "parado_seg": int(t - ev["ts"]) if ev else None})
    rep["bloqueados"] = bl

    # o que cada token humano destrava (cadeia de razões)
    precisa = {}
    for x in pendentes:
        _, raiz = cadeia(x["id"], raz)
        if raiz[0] == "token":
            precisa.setdefault(raiz[1], []).append(x["id"])
    rep["precisa"] = [{"repo": r["nome"], "token": k, "destrava": len(v), "tickets": v}
                      for k, v in precisa.items()]

    rep["estado"] = estado_do_repo(st, pausa, eventos, raz, legivel, rep, t)
    rep["_interno"] = {"cfg": cfg, "eventos": eventos, "tickets": tickets, "raz": raz,
                       "por_id": por_id, "st": st}
    return rep


def inicio_do_ticket(eventos, tid):
    e = ultimo(eventos, lambda e: e["id"] == tid and e["ev"] == "INICIO")
    return e["ts"] if e else None


def estado_do_repo(st, pausa, eventos, raz, legivel, rep, t):
    """tipo (rodando · pausado · travado · ocioso · sem_dado), rótulo em TEXTO,
    e a frase de relance com tempo."""
    def saida(tipo, titulo, detalhe=""):
        rot = {"rodando": "rodando", "pausado": "pausado", "travado": "travado",
               "ocioso": "ocioso", "sem_dado": "sem dado"}[tipo]
        return {"tipo": tipo, "rotulo": rot, "titulo": titulo, "detalhe": detalhe}

    pausa_txt = ""
    if pausa["ativa"]:
        pausa_txt = ("pausado por você há " + dur(t - pausa["ts"])) if pausa["ts"] \
            else "pausado por você (PAUSAR sem data legível)"
    if st is None:
        if pausa["ativa"]:
            return saida("pausado", pausa_txt, f"motivo: {pausa['motivo']}")
        return saida("sem_dado", "sem STATUS.md", "o repo ainda não publicou snapshot (§3)")

    ultimo_txt = st.get("ultimo") or "—"
    if st.get("estado") == "executando":
        tk = (st.get("ticket") or "").split()
        tid = tk[0] if tk else "?"
        tent = (st.get("ticket") or "").split("·", 1)
        tent = tent[1].strip() if len(tent) > 1 else ""
        ini = inicio_do_ticket(eventos, tid)
        idade = dur(t - ini) if ini else "?"
        det = " · ".join(x for x in (tent, f"último: {ultimo_txt}") if x)
        if pausa["ativa"]:
            return saida("pausado", pausa_txt,
                         f"o {tid} (há {idade}) termina antes de parar · motivo: {pausa['motivo']}")
        return saida("rodando", f"rodando {tid} há {idade}", det)

    if pausa["ativa"]:
        return saida("pausado", pausa_txt, f"motivo: {pausa['motivo']}")

    c = rep["contagem"]
    if c["pendentes"] and not c["prontos"]:
        ult_tk = ultimo(eventos, lambda e: e["id"] not in ("---", "—"))
        desde = None
        for e in eventos:
            if e["ev"] == "OCIOSO" and (ult_tk is None or e["ts"] >= ult_tk["ts"]):
                desde = e["ts"]
                break
        titulo = "sem ticket para pegar" + (f" há {dur(t - desde)}" if desde else "")
        return saida("travado", titulo, legivel or "nenhum pendente processável")
    if not c["pendentes"]:
        return saida("ocioso", "sem pendente na fila", f"último: {ultimo_txt}")
    return saida("ocioso", f"{c['prontos']} pronto(s), esperando o próximo disparo",
                 f"último: {ultimo_txt}")


def coletar_tudo():
    t = agora()
    repos, erro = ler_repos()
    saida = []
    for r in repos:
        try:
            saida.append(coletar_repo(r, t))
        except Exception as e:  # um repo quebrado não derruba a tela dos outros
            saida.append({"nome": r["nome"], "caminho": r["caminho"],
                          "erro": f"{type(e).__name__}: {e}",
                          "estado": {"tipo": "sem_dado", "rotulo": "sem dado",
                                     "titulo": "erro ao ler o repo", "detalhe": str(e)},
                          "contagem": {"prontos": 0, "pendentes": 0, "bloqueados": 0},
                          "dia": {"aprovados": 0, "reprovas": 0}, "proximos": [],
                          "proximos_resto": 0, "bloqueados": [], "precisa": [],
                          "pausa": {"ativa": False}})
    precisa = sorted((p for r in saida for p in r.get("precisa", [])),
                     key=lambda p: (-p["destrava"], p["repo"], p["token"]))
    bloqueados = [b for r in saida for b in r.get("bloqueados", [])]
    for r in saida:
        r.pop("_interno", None)
    return {"gerado_em": datetime.fromtimestamp(t).strftime("%d/%m %H:%M:%S"),
            "agora": t, "repos_arquivo": str(arquivo_repos()), "repos_erro": erro,
            "precisa": precisa, "bloqueados": bloqueados, "repos": saida}


_cache = {"t": 0.0, "v": None}


def estado_atual(forcar=False):
    with _trava_cache:
        if forcar or _cache["v"] is None or time.time() - _cache["t"] > TTL_CACHE_SEG:
            _cache["v"] = coletar_tudo()
            _cache["t"] = time.time()
        return _cache["v"]


_trava_cache = threading.Lock()


# ------------------------------------------------------------------- página

CSS = r"""
:root{--fundo:#0a0a0a;--cartao:#141414;--cartao2:#1a1a1a;--borda:#262626;--linha:#1f1f1f;
--texto:#ffffff;--mut:#a3a3a3;--sb:#7a7a7a;--link:#5cc0ff;
--ok-f:#0f2a1a;--ok:#4ade80;--ok-b:#1f5c38;--warn-f:#2b2110;--warn:#fbbf24;--warn-b:#5c4514;
--bad-f:#2d1212;--bad:#f87171;--bad-b:#6b2020;--info-f:#0b2233;--info:#5cc0ff;--info-b:#134a70;
--neutro:#525252}
*{box-sizing:border-box}
body{margin:0;font-family:"Open Sans",system-ui,sans-serif;background:var(--fundo);color:var(--texto);font-size:14px}
main{max-width:1280px;margin:0 auto;padding:20px 16px 48px}
a{color:var(--link);text-decoration:none} a:hover{text-decoration:underline}
button{font:inherit;font-size:13px;font-weight:600;padding:7px 14px;border-radius:999px;border:1px solid #333;background:#1c1c1c;color:var(--texto);cursor:pointer}
button:disabled{opacity:.45;cursor:not-allowed}
button.prim{background:#fff;color:#0a0a0a;border-color:#fff}
input{font:inherit;background:#101010;border:1px solid #333;color:var(--texto);border-radius:8px;padding:6px 10px;min-width:220px}
.mono{font-family:"JetBrains Mono",ui-monospace,monospace}
.mut{color:var(--mut)} .sb{color:var(--sb)} .num{font-variant-numeric:tabular-nums}
.card{background:var(--cartao);border:1px solid var(--borda);border-radius:12px;padding:16px 18px}
.lbl{font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:var(--mut);font-weight:700}
.pill{display:inline-flex;gap:6px;align-items:center;font-size:12px;font-weight:600;padding:2px 10px;border-radius:999px;background:#1c1c1c;color:#d4d4d4;border:1px solid #333;white-space:nowrap}
.ok{background:var(--ok-f);color:var(--ok);border-color:var(--ok-b)}
.warn{background:var(--warn-f);color:var(--warn);border-color:var(--warn-b)}
.bad{background:var(--bad-f);color:var(--bad);border-color:var(--bad-b)}
.info{background:var(--info-f);color:var(--info);border-color:var(--info-b)}
header{display:flex;justify-content:space-between;align-items:baseline;gap:12px;flex-wrap:wrap;margin-bottom:16px}
h1{font-size:22px;margin:0} h2{font-size:15px;margin:0}
.grade{display:grid;grid-template-columns:repeat(auto-fill,minmax(340px,1fr));gap:14px;margin:14px 0}
.linha{display:grid;grid-template-columns:auto 1fr auto;gap:12px;align-items:start;padding:9px 0;border-bottom:1px solid var(--linha)}
.linha:last-child{border-bottom:0}
.barra{height:8px;border-radius:999px;background:var(--linha);overflow:hidden;display:flex;gap:2px;margin:6px 0 4px}
.barra .a{background:var(--ok)} .barra .r{background:var(--bad)}
.estado{font-size:16px;font-weight:600;margin:10px 0 2px}
.cont{display:flex;gap:14px;flex-wrap:wrap;margin:10px 0}
.cont b{font-size:18px}
table{width:100%;border-collapse:collapse;font-size:13px}
th{font-size:10.5px;color:var(--mut);font-weight:700;text-align:left;padding:8px;border-bottom:1px solid var(--borda);text-transform:uppercase;letter-spacing:.05em}
td{padding:9px 8px;border-bottom:1px solid var(--linha);vertical-align:top}
details summary{cursor:pointer;color:var(--link)}
.filtros{display:flex;gap:6px;flex-wrap:wrap;margin:10px 0}
.filtros button{padding:3px 12px}
.filtros button[aria-pressed=true]{background:#fff;color:#0a0a0a}
.aviso{border-left:3px solid var(--bad);padding:6px 10px;margin:6px 0;background:var(--bad-f)}
.arq{font-size:11.5px;color:#8a8a8a;font-family:"JetBrains Mono",monospace}
pre{white-space:pre-wrap;margin:6px 0 0;font-size:12px;color:#d4d4d4}
@media (max-width:640px){.grade{grid-template-columns:1fr} .linha{grid-template-columns:1fr}}
"""

JS = r"""
const TOM = {rodando:'ok', pausado:'warn', travado:'bad', ocioso:'info', sem_dado:''};
const ICONE = {rodando:'▶', pausado:'❚❚', travado:'■', ocioso:'○', sem_dado:'?'};
let EST = null, FILTRO = 'todos', MOSTRA_UM = false;
const memo = {};

function esc(s){return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function dur(s){ if (s == null) return '?'; s = Math.max(0, Math.floor(s));
  if (s < 60) return s + ' s'; if (s < 3600) return Math.floor(s/60) + ' min';
  if (s < 86400){const h = Math.floor(s/3600), m = Math.floor(s%3600/60); return m ? h + 'h' + String(m).padStart(2,'0') : h + 'h';}
  const d = Math.floor(s/86400), h = Math.floor(s%86400/3600); return h ? d + 'd' + h + 'h' : d + 'd'; }
function pill(tipo, rotulo){ return `<span class="pill ${TOM[tipo]||''}"><span aria-hidden="true">${ICONE[tipo]||''}</span>${esc(rotulo)}</span>`; }

// Só muda o que mudou: cada seção guarda o HTML que renderizou, e o DOM só é
// tocado quando ele difere. Ao trocar, os <details> abertos e o texto dos
// campos continuam como o operador os deixou.
function secao(el, html){
  if (!el || memo[el.id] === html) return;
  const abertos = new Set([...el.querySelectorAll('details[open][data-k]')].map(d => d.dataset.k));
  const valores = {}; el.querySelectorAll('input[data-k]').forEach(i => valores[i.dataset.k] = i.value);
  el.innerHTML = html; memo[el.id] = html;
  el.querySelectorAll('details[data-k]').forEach(d => { if (abertos.has(d.dataset.k)) d.open = true; });
  el.querySelectorAll('input[data-k]').forEach(i => { if (i.dataset.k in valores) i.value = valores[i.dataset.k]; });
}
function slot(pai, id){ let el = document.getElementById(id); if (!el){ el = document.createElement('div'); el.id = id; pai.appendChild(el);} return el; }

function htmlPrecisa(){
  const it = EST.precisa;
  if (!it.length) return `<div class="card"><h2>Precisa de você</h2><p class="mut">Nenhum token humano segura pendente.</p></div>`;
  const linha = p => `<div class="linha"><span class="pill warn">destrava ${p.destrava}</span>
    <div><span class="mono">${esc(p.token)}</span><div class="sb">${esc(p.repo)} · ${p.tickets.map(esc).join(', ')}</div></div>
    <span class="sb mono">orq liberar ${esc(p.token)}</span></div>`;
  const grandes = it.filter(p => p.destrava > 1), um = it.filter(p => p.destrava <= 1);
  let h = `<div class="card"><h2>Precisa de você <span class="mut">${it.length} ${it.length == 1 ? 'item' : 'itens'}</span></h2>
    <div class="sb">ordenado por quantos pendentes cada token destrava</div>${grandes.map(linha).join('')}`;
  if (um.length) h += `<details data-k="precisa-um"${grandes.length ? '' : ' open'}><summary>Mais ${um.length} ${um.length == 1 ? 'item' : 'itens'} de 1 ticket cada · mostrar</summary>${um.map(linha).join('')}</details>`;
  return h + '</div>';
}

function htmlCard(r){
  const e = r.estado, c = r.contagem, d = r.dia, tot = d.aprovados + d.reprovas;
  const pa = tot ? d.aprovados / tot * 100 : 0;
  let h = `<div class="card" aria-label="${esc(r.nome)}: ${esc(e.rotulo)}">
    <div style="display:flex;justify-content:space-between;gap:8px;align-items:center">
      <h2><a href="#repo/${encodeURIComponent(r.nome)}">${esc(r.nome)}</a></h2>${pill(e.tipo, e.rotulo)}</div>
    <div class="estado">${esc(e.titulo)}</div><div class="mut">${esc(e.detalhe)}</div>`;
  if (r.erro) h += `<div class="aviso">${esc(r.erro)}</div>`;
  h += `<div style="margin-top:10px"><span class="lbl">hoje</span> <span class="num">${d.aprovados} aprovados · ${d.reprovas} reprovas</span>
    <div class="barra" role="img" aria-label="${d.aprovados} aprovados contra ${d.reprovas} reprovas hoje">${tot ? `<div class="a" style="width:${pa}%"></div><div class="r" style="width:${100-pa}%"></div>` : ''}</div></div>
    <div class="cont"><span><b class="num">${c.prontos}</b> prontos</span><span><b class="num">${c.pendentes}</b> pendentes</span><span><b class="num">${c.bloqueados}</b> bloqueados</span></div>`;
  if (r.proximos.length){
    h += `<div class="lbl">Próximos</div>` + r.proximos.map(p => `<div class="linha" style="grid-template-columns:34px 56px 1fr"><span class="sb num">${p.ordem}º</span><span class="mono">${esc(p.id)}</span><span>${esc(p.titulo)}</span></div>`).join('');
    if (r.proximos_resto) h += `<div class="sb">e mais ${r.proximos_resto}</div>`;
  }
  return h + '</div>';
}

function htmlBloqueados(lista, comRepo){
  const cats = ['todos', ...new Set(lista.map(b => b.categoria))];
  const vis = lista.filter(b => FILTRO == 'todos' || b.categoria == FILTRO);
  let h = `<div class="card"><h2>Bloqueados <span class="mut">${lista.length}${comRepo ? ' nos ' + EST.repos.length + ' repos' : ''}</span></h2>
    <div class="filtros" role="group" aria-label="filtrar por categoria">${cats.map(c => `<button data-filtro="${esc(c)}" aria-pressed="${c == FILTRO}">${esc(c)}</button>`).join('')}</div>
    <table><thead><tr><th>Ticket</th><th>Categoria</th><th>Motivo (primeira linha)</th>${comRepo ? '<th>Repo</th>' : '<th>Onde mexe</th><th>Parado há</th>'}<th class="num">Tent.</th></tr></thead><tbody>`;
  for (const b of vis){
    const k = `bl-${b.repo}-${b.id}`;
    const mot = b.motivo_resto
      ? `<details data-k="${esc(k)}"><summary style="color:inherit">${esc(b.motivo)}</summary><pre>${esc(b.motivo_resto)}</pre><div class="sb mono">${esc(b.motivo_token)}</div></details>`
      : `${esc(b.motivo)}<div class="sb mono">${esc(b.motivo_token)}</div>`;
    h += `<tr><td><span class="mono">${esc(b.id)}</span><div class="sb">${esc(b.titulo)}</div></td><td><span class="pill">${esc(b.categoria)}</span></td><td>${mot}</td>`;
    h += comRepo ? `<td>${esc(b.repo)}</td>` : `<td class="arq">${b.allow.map(esc).join('<br>')}</td><td class="num">${b.parado_seg == null ? '<span class="sb">sem dado</span>' : dur(b.parado_seg)}</td>`;
    h += `<td class="num">${b.tentativas == null ? '<span class="sb">sem dado</span>' : b.tentativas}</td></tr>`;
  }
  if (!vis.length) h += `<tr><td colspan="6" class="mut">nenhum bloqueado${FILTRO != 'todos' ? ' nesta categoria' : ''}</td></tr>`;
  return h + '</tbody></table></div>';
}

function visaoGeral(raiz){
  secao(slot(raiz, 's-cab'), `<header><div><h1>Orquestradores</h1><span class="mut">${EST.repos.length} repositórios · atualiza sozinho a cada 15 s</span></div><span class="mut num">${esc(EST.gerado_em)}</span></header>`
    + (EST.repos_erro ? `<div class="aviso">${esc(EST.repos_erro)}</div>` : ''));
  secao(slot(raiz, 's-precisa'), htmlPrecisa());
  const g = slot(raiz, 's-cards'); g.className = 'grade';
  if (g.childElementCount != EST.repos.length){ g.innerHTML = ''; EST.repos.forEach((_, i) => delete memo['c-' + i]); }
  EST.repos.forEach((r, i) => secao(slot(g, 'c-' + i), htmlCard(r)));
  secao(slot(raiz, 's-bloq'), htmlBloqueados(EST.bloqueados, true));
}

function render(){
  if (!EST) return;
  const raiz = document.getElementById('app');
  const alvo = location.hash.startsWith('#repo/') ? 'detalhe' : 'visao';
  if (raiz.dataset.vista != alvo){ raiz.innerHTML = ''; for (const k in memo) delete memo[k]; raiz.dataset.vista = alvo; }
  if (alvo == 'detalhe' && typeof detalhe == 'function') detalhe(raiz, decodeURIComponent(location.hash.slice(6)));
  else visaoGeral(raiz);
}

async function carregar(){
  try { const r = await fetch('/api/estado', {cache: 'no-store'}); EST = await r.json(); render(); }
  catch (e) { const a = document.getElementById('falha'); a.textContent = 'sem resposta do servidor: ' + e; a.hidden = false; return; }
  document.getElementById('falha').hidden = true;
}
document.addEventListener('click', ev => {
  const f = ev.target.closest('[data-filtro]'); if (f){ FILTRO = f.dataset.filtro; for (const k in memo) if (k.endsWith('bloq')) delete memo[k]; render(); }
});
window.addEventListener('hashchange', render);
carregar(); setInterval(carregar, __ATUALIZA_MS__);
"""


def pagina():
    return ("<!doctype html><html lang=\"pt-BR\"><head><meta charset=\"utf-8\">"
            "<meta name=\"viewport\" content=\"width=device-width,initial-scale=1\">"
            "<title>Painel dos orquestradores</title><style>" + CSS + "</style></head>"
            "<body><main><div id=\"falha\" class=\"aviso\" hidden></div>"
            "<div id=\"app\"><p class=\"mut\">carregando /api/estado…</p></div>"
            "<noscript>O painel precisa de JavaScript: os dados vêm de /api/estado.</noscript>"
            "<!-- seções: Precisa de você · cartões por repo · Bloqueados -->"
            "</main><script>" + JS.replace("__ATUALIZA_MS__", str(ATUALIZA_MS))
            + "</script></body></html>")


# -------------------------------------------------------------------- http

class Handler(BaseHTTPRequestHandler):
    server_version = "orq-painel"

    def log_message(self, fmt, *args):
        sys.stderr.write("%s  %s\n" % (datetime.now().strftime("%H:%M:%S"), fmt % args))

    def _host_ok(self):
        """Host fixo: fecha rebinding de DNS."""
        host = (self.headers.get("Host") or "").strip()
        porta = self.server.server_address[1]
        return host in (f"127.0.0.1:{porta}", f"localhost:{porta}")

    def _responder(self, status, corpo, tipo="application/json; charset=utf-8"):
        dados = corpo.encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", tipo)
        self.send_header("Content-Length", str(len(dados)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.end_headers()
        self.wfile.write(dados)

    def _json(self, status, obj):
        self._responder(status, json.dumps(obj, ensure_ascii=False))

    def do_GET(self):
        if not self._host_ok():
            return self._json(403, {"erro": "Host não permitido"})
        rota = self.path.split("?")[0].rstrip("/") or "/"
        if rota == "/":
            return self._responder(200, pagina(), "text/html; charset=utf-8")
        if rota == "/api/estado":
            return self._json(200, estado_atual())
        self._json(404, {"erro": f"rota inexistente: {rota}"})


def main(argv):
    if "--estado" in argv:
        print(json.dumps(coletar_tudo(), ensure_ascii=False, indent=1))
        return 0
    if "--html" in argv:
        print(pagina())
        return 0
    porta = PORTA_PADRAO
    if "--porta" in argv:
        porta = int(argv[argv.index("--porta") + 1])
    srv = ThreadingHTTPServer((HOST, porta), Handler)
    print(f"orq-painel em http://{HOST}:{srv.server_address[1]}  (repos: {arquivo_repos()})", flush=True)
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        srv.server_close()
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
