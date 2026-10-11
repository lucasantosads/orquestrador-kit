#!/usr/bin/env python3
"""montar.py — monta a fixture do triador 7f a partir do comarka-operacional.

SÓ LEITURA do comarka. Todo git roda com GIT_OPTIONAL_LOCKS=0 e só com `show`,
`log` e `rev-parse`; nenhum script do comarka roda; nada é escrito fora de
<saida> (padrão: o diretório deste arquivo).

    python3 test/fixtures/triador-7f/montar.py --comarka ~/Projetos/comarka-operacional

De onde sai cada caso (spec 7f-a §7.1):
  - os 37 bloqueios da medição de 09/10 (`medicao-bloqueios-out.md` §3, linhas
    102-138; classe da §5), com a linha `BLOQUEADO` do local-loop.log (`L`);
  - 20 tickets `done` do período, de controle (§7.3): os 10 com vermelho de
    vitest numa tentativa intermediária, resolvido no retry, e 10 com critério
    vermelho intermediário. Nenhum deles pode sair firme;
  - 5 de série cortada (`cortados/`, 7f-b1-7): controles cortados na última
    tentativa que reprovou. Saem de `controle/`, sem o comarka
    (`--so-cortados` refaz só eles). Nenhum deles pode sair firme;
  - os bloqueios do primeiro dia do resolvedor (`primeiro-dia/`, 7f-b3): o
    1006 de 11/10, com a classe do conserto humano (`--so-primeiro-dia` refaz
    só eles, lendo o comarka).

O que vai para cada caso é SÓ o que o triador lê, já recortado:
  caso.json, ticket.json, meta.json, config.json, log.txt, serie.json,
  attempt-K/ (com presenca.json e os mapas *.linhas.json dos recortes),
  fontes/<head>/<arquivo>.fonte, vizinhos.tsv, esperado.json.

O recorte do gate-vitest é o mesmo algoritmo de `triador/recorte.ts`
(`recortarVitest`): âncoras fortes sempre; depois âncoras fracas em ordem;
depois contexto de até 6 linhas, do mais perto para o mais longe, até 300
linhas. O teste da peça 2 confere que os dois dão o mesmo recorte.
"""
import argparse, glob, gzip, json, os, re, subprocess, sys
from datetime import datetime, timedelta, timezone

AQUI = os.path.dirname(os.path.abspath(__file__))
INICIO_PERIODO = "2026-09-25T03:00:00Z"
MEDICAO = "medicao-bloqueios-out.md"

# --- A tabela da medição (§3 + §5). Uma linha por bloqueio: id, L (linha do
# BLOQUEADO no local-loop.log), classe R1-R7 da §5, linha da tabela na medição,
# e a evidência que a medição cita, relativa a docs/fila/ (L: = runs/local-loop.log).
# `~"<trecho>"` = a medição cita o trecho sem linha: a linha é achada pelo trecho
# no gate-vitest da série (montar marca `origem: "trecho"`). `serie:<arquivo>` =
# a medição cita `attempt-*/<arquivo>`: vale o arquivo de cada tentativa da série.
CASOS = [
    ("559", 55054, "R3", 102, ["runs/559/attempt-2.prev2/gate-vitest.txt:980", "runs/559/attempt-2.prev2/gate-vitest.txt:1071", "runs/559/attempt-2.prev2/gate-vitest.txt:1366", "L:55043"]),
    ("559", 55209, "R4", 103, ["runs/559/attempt-2/gate-vitest.txt:979"]),
    ("627", 55356, "R2", 104, ["runs/627/attempt-2/gate-vitest.txt:936"]),
    ("600", 55898, "R4", 105, ["runs/600/attempt-3/gate-vitest.txt:983"]),
    ("627b", 56021, "R2", 106, ["runs/627b/attempt-3/criterios.txt:17", "L:55993"]),
    ("549c", 57053, "R2", 107, ["runs/549c/attempt-2/criterios.txt:17"]),
    ("627j", 57368, "R1", 108, ["runs/627j/attempt-3/gate-vitest.txt:949"]),
    ("635", 58105, "R3", 109, ["runs/635.pre-requeue-26set/attempt-2/gate-vitest.txt:2239", "runs/635.pre-requeue-26set/attempt-2/gate-vitest.txt:974"]),
    ("654", 59896, "R1", 110, ["runs/654.pre-requeue-26set/attempt-2/gate-vitest.txt:975"]),
    ("407a", 64280, "R2", 111, ["runs/407a/attempt-2.prev1/criterios.txt:113", "L:64265"]),
    ("689", 65280, "R1", 112, ["runs/689/attempt-2/gate-vitest.txt:1375"]),
    ("691", 65374, "R2", 113, ["runs/691/attempt-1.prev1/criterios.txt:65", "L:65362"]),
    ("346d", 66187, "R1", 114, ["runs/346d/attempt-2/enforcement.json", "L:66186"]),
    ("407a", 67585, "R2", 115, ["runs/407a/attempt-3/criterios.txt:222"]),
    ("722", 67970, "R1", 116, ["runs/722/attempt-1.prev1/gate-vitest.txt:1412"]),
    ("723", 68736, "R6", 117, ["L:68717", "serie:diff.stat"]),
    ("715", 68793, "R1", 118, ["runs/715/attempt-2/gate-vitest.txt:1443"]),
    ("737", 69920, "R2", 119, ["L:69906"]),
    ("739", 71699, "R3", 120, ["L:71698"]),
    ("801", 72121, "R5", 121, ["runs/801/attempt-2/gate-vitest.txt:1593"]),
    ("760", 72407, "R5", 122, ["runs/760/attempt-1.prev1/gate-vitest.txt:1553"]),
    ("762", 72665, "R1", 123, ["runs/762/attempt-1.prev1/gate-vitest.txt:1583"]),
    ("856", 73817, "R1", 124, ["runs/856.pre-requeue-06out/attempt-1/gate-vitest.txt:1640"]),
    ("867", 76790, "R3", 125, ["L:76748", "L:76769"]),
    ("711a", 78138, "R1", 126, ["runs/711a/attempt-1.prev1/gate-vitest.txt:1831"]),
    ("711b3", 78647, "R1", 127, ["runs/711b3/attempt-1.prev1/claude-output.txt"]),
    ("741", 79081, "R4", 128, ["runs/741/attempt-1.prev1/claude-output.txt"]),
    ("707", 79202, "R7", 129, ['~"Abrir grupo"']),
    ("826", 80362, "R3", 130, ["runs/826/attempt-3.prev1/verdict.json"]),
    ("900", 81564, "R2", 131, ["runs/900/attempt-1.prev1/criterios.txt:57"]),
    ("898", 82594, "R5", 132, ["~\"Cannot find module '@/hooks/useAcaoUnica'\""]),
    ("741a", 82726, "R5", 133, ["L:82725", "~\"Cannot find module '@/hooks/useAcaoUnica'\""]),
    ("707", 83026, "R4", 134, ["runs/707/attempt-3.prev1/claude-output.txt"]),
    ("898", 83625, "R2", 135, ["runs/898/attempt-1.prev2/criterios.txt:33"]),
    ("950", 85145, "R1", 136, ["runs/950/attempt-2/claude-output.txt", '~"etapa2-funil-motor.test.ts:92"']),
    ("940", 85222, "R5", 137, ["L:85202", "L:85203", "L:85217"]),
    ("932", 85272, "R5", 138, ["L:85252", "L:85267"]),
]
# Os 20 de controle: done no período, série final com >= 2 tentativas e
# vermelho intermediário resolvido no retry (vitest nos 10 primeiros, critério
# nos 10 seguintes). Escolha: os 10 únicos com vitest vermelho intermediário na
# série final (todos com o vermelho FORA da allowlist), e os 10 primeiros com
# critério intermediário, por ordem de id.
CONTROLE = ["633", "671d", "624", "694", "627e", "656", "808", "706", "367", "891",
            "907", "707a", "868", "860", "650", "712", "662b", "735", "648", "744"]
# Os 5 de série cortada (7f-b1-7): controles cortados na última tentativa que
# reprovou, como se o motor tivesse bloqueado ali. Com a D6 da spec, os 5 saíam
# R1 firme, e errado: o próprio agente resolveu o vermelho no retry.
CORTADOS = ["671d", "624", "627e", "808", "367"]

# Primeiro dia do resolvedor (11/10, 7f-b3): id, L (BLOQUEADO no local-loop.log),
# classe do conserto humano, a evidência (como em CASOS) e a fonte da verdade.
PRIMEIRO_DIA = [
    ("1006", 88744, "R1", ["runs/1006/attempt-1/gate-vitest.txt:2041", "runs/1006/attempt-2/enforcement.json"],
     "~/orq-sessoes/conserto-1006.md (R1: test/quem-cuida.test.ts na allowlist com guarda; a mudança do agente no teste era só um vi.mock)"),
]

# --- O recorte: o MESMO algoritmo de triador/recorte.ts -----------------------
ANSI = re.compile(r"\x1b\[[0-9;?]*[A-Za-z]")
FORTES = [re.compile(p) for p in (
    r"^\s*FAIL\s", r"❯\s+\S+:\d+:\d+", r"^\s*Test Files\s", r"^\s*Tests\s",
    r"\bTimeout\b", r"timed out", r"\bEMFILE\b", r"\bENOSPC\b", r"Cannot find module")]
FRACAS = [re.compile(p) for p in (r"AssertionError", r"\bExpected\b", r"\bReceived\b", r"\bError:")]
# Quadro de pilha (`    at f (arquivo:l:c)`) não é âncora nem contexto, salvo
# quando cita arquivo de teste: é ruído para quem lê, e enchia 60% do recorte.
PILHA = re.compile(r"^\s+at\s")
PILHA_DE_TESTE = re.compile(r"\.(?:test|spec)\.[cm]?[jt]sx?")
CONTEXTO, TETO = 6, 300


def ruido(l):
    return bool(PILHA.match(l)) and not PILHA_DE_TESTE.search(l)


def recortar(texto):
    """[(linha_original_1based, texto)] do recorte, em ordem de linha."""
    linhas = ANSI.sub("", texto).split("\n")
    fortes = [i for i, l in enumerate(linhas) if not ruido(l) and any(r.search(l) for r in FORTES)]
    # Sem nenhum FAIL a suíte passou: o recorte é só das âncoras fortes (o
    # placar `Test Files`/`Tests` e algum sinal de máquina), sem fracas nem
    # contexto. O `Error:` de stderr de teste verde é ruído.
    if not any(FORTES[0].search(linhas[i]) for i in fortes):
        return [(i + 1, linhas[i]) for i in fortes]
    ja = set(fortes)
    fracas = [i for i, l in enumerate(linhas) if i not in ja and not ruido(l) and any(r.search(l) for r in FRACAS)]
    sel = set(fortes)
    for i in fracas:
        if len(sel) >= TETO:
            break
        sel.add(i)
    ancoras = sorted(sel)
    for d in range(1, CONTEXTO + 1):
        for a in ancoras:
            for i in (a - d, a + d):
                if len(sel) >= TETO:
                    break
                if 0 <= i < len(linhas) and i not in sel and not ruido(linhas[i]):
                    sel.add(i)
    return [(i + 1, linhas[i]) for i in sorted(sel)]


# --- Máscara de segredo: a MESMA de triador/mascara.ts ------------------------
MASCARA = "‹segredo›"
SEGREDOS = [
    re.compile(r"\bsk-[A-Za-z0-9_-]{8,}"),
    re.compile(r"\beyJ[A-Za-z0-9_-]{8,}(?:\.[A-Za-z0-9_-]+){0,2}"),
    re.compile(r"\bservice_role\b"),
    re.compile(r"\b(?:SUPABASE_[A-Z0-9_]*|[A-Z0-9_]*_KEY|[A-Z0-9_]*_TOKEN)=[^\s\"'`]+"),
    re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}"),
]


def mascarar(s):
    for r in SEGREDOS:
        s = r.sub(MASCARA, s)
    return s


# --- glob da allowlist: o MESMO de enforcement-core.ts:globToRegExp ----------
def glob_re(g):
    out, i = "^", 0
    while i < len(g):
        c = g[i]
        if c == "*":
            if i + 1 < len(g) and g[i + 1] == "*":
                i += 1
                if i + 1 < len(g) and g[i + 1] == "/":
                    i += 1
                    out += "(?:.*/)?"
                else:
                    out += ".*"
            else:
                out += "[^/]*"
        elif c == "?":
            out += "[^/]"
        elif c in ".+^${}()|[]\\/":
            out += "\\" + c
        else:
            out += c
        i += 1
    return re.compile(out + "$")


def cobre(al, f):
    return any(glob_re(g).match(f) for g in al)


# --- Leitura do comarka (só leitura) ------------------------------------------
class Comarka:
    def __init__(self, raiz):
        self.raiz = raiz
        self.runs = os.path.join(raiz, "docs/fila/runs")
        self._log = None
        self._vermelhos = None

    def git(self, *args):
        assert args[0] in ("show", "log", "rev-parse"), args
        r = subprocess.run(["git", "-C", self.raiz, *args], capture_output=True, text=True,
                           env={**os.environ, "GIT_OPTIONAL_LOCKS": "0"})
        return r.stdout if r.returncode == 0 else None

    def log(self):
        if self._log is None:
            with open(os.path.join(self.runs, "local-loop.log"), encoding="utf-8", errors="replace") as f:
                self._log = f.read().split("\n")
        return self._log

    def hora_da_linha(self, n):
        """UTC da linha n (1-based): data da última linha de drenagem
        `[AAAA-MM-DD HH:MM:SS-0300]` antes dela + hora `[orq HH:MM:SS]` (UTC)."""
        log = self.log()
        m = re.match(r"\[orq (\d\d):(\d\d):(\d\d)\]", log[n - 1])
        for i in range(n - 1, -1, -1):
            d = re.match(r"\[(\d{4}-\d\d-\d\d \d\d:\d\d:\d\d)([+-]\d{4})\]", log[i])
            if d:
                base = datetime.strptime(d.group(1) + d.group(2), "%Y-%m-%d %H:%M:%S%z").astimezone(timezone.utc)
                if not m:
                    return base
                t = base.replace(hour=int(m.group(1)), minute=int(m.group(2)), second=int(m.group(3)))
                if t < base - timedelta(minutes=5):
                    t += timedelta(days=1)
                return t
        raise RuntimeError(f"linha {n} sem data de drenagem antes")

    def ticket(self, sha, arquivo):
        txt = self.git("show", f"{sha}:{arquivo}") or ""
        m = re.search(r"```json\n(.*?)\n```", txt, re.S)
        return json.loads(m.group(1)) if m else None

    def arquivo_do_ticket(self, tid):
        out = self.git("log", "--all", "--format=", "--name-only", "--", "docs/fila/") or ""
        for l in out.splitlines():
            m = re.match(r"docs/fila/(\d{3}[a-z0-9]*)-.*\.md$", l)
            if m and m.group(1) == tid:
                return l
        raise RuntimeError(f"sem arquivo para {tid}")

    def sha_antes(self, arquivo, quando):
        sha = (self.git("log", "--all", "-1", "--format=%H", f"--before={quando}", "--", arquivo) or "").strip()
        if sha:
            return sha, True
        sha = (self.git("log", "--all", "--reverse", "--format=%H", "--", arquivo) or "").split()[0]
        return sha, False

    def config_em(self, quando):
        sha = (self.git("log", "--all", "-1", "--format=%H", f"--before={quando}", "--", "docs/fila/000-config.json") or "").strip()
        c = json.loads(self.git("show", f"{sha}:docs/fila/000-config.json"))
        return {"diff_cap_linhas": c.get("diff_cap_linhas"), "claude_timeout_secs": c.get("claude_timeout_secs"),
                "max_retries": c.get("max_retries"), "fonte": f"docs/fila/000-config.json@{sha[:12]}"}

    def metas(self, tid):
        out = []
        for m in sorted(glob.glob(f"{self.runs}/{tid}/meta.json") + glob.glob(f"{self.runs}/{tid}.pre-requeue-*/meta.json")):
            arr = json.load(open(m))
            arr = arr if isinstance(arr, list) else [arr]
            out.append((os.path.basename(os.path.dirname(m)), arr))
        return out

    def vermelhos_de_todos(self):
        """[(ticket, dir_rel, arquivo, linha do 1º FAIL, mtime)] de todo FAIL de
        runs/*/attempt-*/gate-vitest.txt."""
        if self._vermelhos is None:
            self._vermelhos = []
            for gv in glob.glob(f"{self.runs}/*/attempt-*/gate-vitest.txt"):
                rel = os.path.relpath(os.path.dirname(gv), self.raiz)
                tid = rel.split("/")[3].split(".")[0]
                with open(gv, encoding="utf-8", errors="replace") as f:
                    t = ANSI.sub("", f.read())
                vistos = {}
                for n, l in enumerate(t.split("\n"), 1):
                    m = re.match(r"^\s*FAIL\s+(\S+\.(?:test|spec)\.[cm]?[jt]sx?)", l)
                    if m and m.group(1) not in vistos:
                        vistos[m.group(1)] = n
                for arq, n in sorted(vistos.items()):
                    self._vermelhos.append((tid, rel, arq, n, os.path.getmtime(gv)))
        return self._vermelhos


def iso(ts):
    return datetime.fromtimestamp(ts, timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def ts_de(s):
    return datetime.fromisoformat(s.replace("Z", "+00:00")).timestamp()


def mtime_dir(d):
    return max((os.path.getmtime(p) for p in glob.glob(d + "/*")), default=0)


def escolhe_dirs(cm, base, n, fim):
    """attempt-1..n da série: entre attempt-k e attempt-k.prevJ, o de mtime mais
    recente que não passe de fim + 180 s (spec §1)."""
    out = []
    for k in range(1, n + 1):
        cands = glob.glob(f"{cm.runs}/{base}/attempt-{k}") + glob.glob(f"{cm.runs}/{base}/attempt-{k}.prev*")
        best = None
        for c in cands:
            m = mtime_dir(c)
            if m <= fim + 180 and (best is None or m > best[0]):
                best = (m, c)
        if not best:
            raise RuntimeError(f"{base} attempt-{k}: nenhum diretório até fim+180")
        out.append(best[1])
    return out


COPIA = ["gate-tsc.txt", "criterios.txt", "claude-output.txt", "verdict.json", "avaliador-claude.txt",
         "diff.stat", "enforcement.json", "head.txt"]


def recortar_criterios(texto):
    """[(linha_original, texto)]: todo bloco `### criterio[i] -> X` com X != PASS
    inteiro; do PASS, só a linha do cabeçalho."""
    out, passa = [], False
    for n, l in enumerate(texto.split("\n"), 1):
        m = re.match(r"### \S+ -> (\S+)", l)
        if m:
            passa = m.group(1) == "PASS"
            out.append((n, l))
        elif not passa:
            out.append((n, l))
    return out


OBJETIVO_MAX = 1500


def ticket_da_fixture(tk):
    """O 1º bloco json, mascarado, com o `objetivo` no tamanho que o triador lê
    (spec §4: até 1500 caracteres)."""
    tk = json.loads(mascarar(json.dumps(tk, ensure_ascii=False)))
    obj = tk.get("objetivo")
    if isinstance(obj, str) and len(obj) > OBJETIVO_MAX:
        tk["objetivo"] = obj[:OBJETIVO_MAX]
        tk["_objetivo_cortado_na_fixture"] = len(obj)
    return tk


def stat_arquivos(texto):
    return [l.split("|")[0].strip() for l in (texto or "").splitlines() if "|" in l]


def no_diff(arq, diff_arqs):
    for d in diff_arqs:
        if d == arq or (d.startswith(".../") and arq.endswith(d[3:])):
            return True
    return False


def faixas(ns):
    """[3,4,5,9] -> [[3,5],[9,9]]: o mapa de linhas originais, compacto."""
    out = []
    for n in ns:
        if out and out[-1][1] == n - 1:
            out[-1][1] = n
        else:
            out.append([n, n])
    return out


def escreve(caminho, conteudo):
    os.makedirs(os.path.dirname(caminho), exist_ok=True)
    with open(caminho, "w", encoding="utf-8") as f:
        f.write(conteudo)


def json_escreve(caminho, obj):
    escreve(caminho, json.dumps(obj, ensure_ascii=False, indent=1) + "\n")


def monta_serie(cm, destino, tid, al, dirs, fim):
    """Copia as tentativas, o recorte, a presença e os fontes dos vermelhos."""
    serie, vermelhos = [], set()
    for k, d in enumerate(dirs, 1):
        rel = os.path.relpath(d, cm.raiz)
        serie.append({"k": k, "dir": rel})
        alvo = os.path.join(destino, f"attempt-{k}")
        os.makedirs(alvo, exist_ok=True)
        presentes = sorted(os.listdir(d))
        json_escreve(os.path.join(alvo, "presenca.json"), presentes)
        for f in COPIA:
            p = os.path.join(d, f)
            if not os.path.exists(p):
                continue
            with open(p, encoding="utf-8", errors="replace") as fh:
                txt = fh.read()
            if f == "criterios.txt":
                # Bloco PASS fica só com o cabeçalho; o FALHA vai inteiro. O
                # mapa de linhas originais vai ao lado, como no gate-vitest.
                sel = recortar_criterios(txt)
                escreve(os.path.join(alvo, f), "\n".join(mascarar(t) for _, t in sel))
                json_escreve(os.path.join(alvo, "criterios.linhas.json"),
                             {"total": len(txt.split("\n")), "faixas": faixas([n for n, _ in sel])})
            else:
                escreve(os.path.join(alvo, f), mascarar(txt))
        gv = os.path.join(d, "gate-vitest.txt")
        if os.path.exists(gv):
            with open(gv, encoding="utf-8", errors="replace") as fh:
                bruto = fh.read()
            rec = recortar(bruto)
            escreve(os.path.join(alvo, "gate-vitest.txt"), "\n".join(mascarar(t) for _, t in rec))
            json_escreve(os.path.join(alvo, "gate-vitest.linhas.json"), {"total": len(bruto.split("\n")), "faixas": faixas([n for n, _ in rec])})
            limpo = ANSI.sub("", bruto)
            fails = sorted(set(re.findall(r"^\s*FAIL\s+(\S+\.(?:test|spec)\.[cm]?[jt]sx?)", limpo, re.M)))
            head = open(os.path.join(d, "head.txt")).read().strip() if os.path.exists(os.path.join(d, "head.txt")) else ""
            diff_arqs = stat_arquivos(open(os.path.join(d, "diff.stat")).read() if os.path.exists(os.path.join(d, "diff.stat")) else "")
            for arq in fails:
                vermelhos.add(arq)
                if head and not cobre(al, arq) and not no_diff(arq, diff_arqs):
                    fonte = cm.git("show", f"{head}:{arq}")
                    if fonte is not None:
                        # `.fonte` no fim: um `.test.ts` aqui dentro seria
                        # coletado pelo vitest e pelo tsc do kit.
                        escreve(os.path.join(destino, "fontes", head, arq + ".fonte"), mascarar(fonte))
    json_escreve(os.path.join(destino, "serie.json"), serie)
    # vizinhos: o mesmo arquivo vermelho em QUALQUER tentativa de runs/ nas ±6 h
    linhas = ["ticket\tdir\tarquivo\tlinha\tts\tantes_do_bloqueio"]
    for t2, rel, arq, n, m in sorted(cm.vermelhos_de_todos(), key=lambda x: (x[4], x[1], x[2])):
        if arq in vermelhos and abs(m - fim) <= 6 * 3600:
            linhas.append(f"{t2}\t{rel}\t{arq}\t{n}\t{iso(m)}\t{1 if m <= fim + 180 else 0}")
    escreve(os.path.join(destino, "vizinhos.tsv"), "\n".join(linhas) + "\n")


def trecho_do_log(cm, ini, fim_linha):
    log = cm.log()
    return "".join(f"{n}\t{mascarar(log[n - 1])}\n" for n in range(ini, fim_linha + 1))


def inicio_da_serie(cm, tid, L):
    """Linha da última drenagem com data antes do cabeçalho `tentativa 1` da série."""
    log = cm.log()
    cab = re.compile(rf"=== ticket {re.escape(tid)} \(.*\) — tentativa (\d+) ")
    i, n = L - 1, 0
    while i >= 0:
        m = cab.search(log[i])
        if m:
            n += 1
            if m.group(1) == "1":
                break
        i -= 1
    if i < 0:
        raise RuntimeError(f"{tid}@{L}: sem cabeçalho de tentativa 1")
    j = i
    while j >= 0 and not re.match(r"\[\d{4}-\d\d-\d\d ", log[j]):
        j -= 1
    return j + 1, n


def acha_esperado(cm, destino, serie, citacoes):
    """As citações da medição viram {arquivo (relativo à raiz), linha|null, origem}."""
    out = []
    for c in citacoes:
        if c.startswith("L:"):
            n = int(c[2:])
            out.append({"arquivo": "docs/fila/runs/local-loop.log", "linha": n, "origem": "medicao"})
        elif c.startswith("serie:"):
            # `runs/<id>/attempt-*/<arquivo>` da medição: o arquivo em cada tentativa da série.
            for s in serie:
                out.append({"arquivo": f"{s['dir']}/{c[6:]}", "linha": None, "origem": "medicao"})
        elif c.startswith("~"):
            trecho = json.loads(c[1:])
            for s in serie:
                p = os.path.join(cm.raiz, s["dir"], "gate-vitest.txt")
                if not os.path.exists(p):
                    continue
                with open(p, encoding="utf-8", errors="replace") as fh:
                    for n, l in enumerate(ANSI.sub("", fh.read()).split("\n"), 1):
                        if trecho in l:
                            out.append({"arquivo": f"{s['dir']}/gate-vitest.txt", "linha": n, "origem": "trecho", "trecho": trecho})
                            break
        else:
            arq, _, lin = c.partition(":")
            out.append({"arquivo": "docs/fila/" + arq, "linha": int(lin) if lin else None, "origem": "medicao"})
    return out


REQUEUE = {"R1": "nao", "R2": "nao", "R3": "nao", "R4": "nao", "R7": "nao", "R6": "sim_apos:conserto_motor"}


def requeue_de(classe, caso_id):
    if classe != "R5":
        return REQUEUE[classe]
    if caso_id in ("940", "932"):
        return "sim_apos:arvore_alvo_limpa"
    if caso_id == "801":
        return "sim_apos:maquina_ok"
    return "sim_apos:base_verde"


def monta_caso(cm, saida, nn, tid, L, classe, linha_med, citacoes):
    ini, n = inicio_da_serie(cm, tid, L)
    hora_L = cm.hora_da_linha(L).timestamp()
    melhor = None
    for base, arr in cm.metas(tid):
        for a in arr:
            if a.get("ts", "") >= INICIO_PERIODO and a.get("attempt") == n:
                d = abs(ts_de(a["ts"]) - hora_L)
                if melhor is None or d < melhor[0]:
                    melhor = (d, base, a)
    if melhor is None or melhor[0] > 300:
        raise RuntimeError(f"{tid}@{L}: sem meta da tentativa {n} perto de {iso(hora_L)}")
    _, base, ultima = melhor
    fim = ts_de(ultima["ts"])
    destino = os.path.join(saida, f"{nn:02d}-{tid}-L{L}")
    arquivo = cm.arquivo_do_ticket(tid)
    sha, antes = cm.sha_antes(arquivo, iso(fim))
    tk = cm.ticket(sha, arquivo)
    al = (tk or {}).get("pathspec_allowlist", [])
    dirs = escolhe_dirs(cm, base, n, fim)
    os.makedirs(destino, exist_ok=True)
    json_escreve(os.path.join(destino, "ticket.json"), ticket_da_fixture(tk))
    arr = next(a for b, a in cm.metas(tid) if b == base)
    json_escreve(os.path.join(destino, "meta.json"), [a for a in arr if a.get("ts", "") <= iso(fim + 180)])
    json_escreve(os.path.join(destino, "config.json"), cm.config_em(iso(fim)))
    escreve(os.path.join(destino, "log.txt"), trecho_do_log(cm, ini, L))
    monta_serie(cm, destino, tid, al, dirs, fim)
    serie = json.load(open(os.path.join(destino, "serie.json")))
    json_escreve(os.path.join(destino, "caso.json"), {
        "id": tid, "repo": "comarka-operacional", "arquivo_ticket": arquivo, "ticket_sha": sha, "ticket_antes": antes,
        "linha_bloqueio": L, "log_inicio": ini, "fim": iso(fim), "tentativas": n, "meta_dir": f"docs/fila/runs/{base}"})
    json_escreve(os.path.join(destino, "esperado.json"), {
        "classe": classe, "evidencia": acha_esperado(cm, destino, serie, citacoes),
        "requeue": requeue_de(classe, tid), "fonte_da_verdade": f"{MEDICAO}:{linha_med}"})
    return destino


def monta_controle(cm, saida, nn, tid):
    arr = next(a for b, a in cm.metas(tid) if b == tid)
    arr = [a for a in arr if a.get("ts", "") >= INICIO_PERIODO]
    ultima = arr[-1]
    assert ultima["resultado"] == "done", tid
    n, fim = ultima["attempt"], ts_de(ultima["ts"])
    log = cm.log()
    aprov = re.compile(rf"ticket {re.escape(tid)}: APROVADO e mergeado")
    cands = [i + 1 for i, l in enumerate(log) if aprov.search(l)]
    L = min(cands, key=lambda c: abs(cm.hora_da_linha(c).timestamp() - fim))
    ini, n_log = inicio_da_serie(cm, tid, L)
    assert n_log == n, (tid, n_log, n)
    destino = os.path.join(saida, "controle", f"{nn:02d}-{tid}-L{L}")
    arquivo = cm.arquivo_do_ticket(tid)
    primeira = ts_de(arr[-n]["ts"]) - 3600
    sha, antes = cm.sha_antes(arquivo, iso(primeira))
    tk = cm.ticket(sha, arquivo)
    al = (tk or {}).get("pathspec_allowlist", [])
    dirs = escolhe_dirs(cm, tid, n, fim)
    os.makedirs(destino, exist_ok=True)
    json_escreve(os.path.join(destino, "ticket.json"), ticket_da_fixture(tk))
    json_escreve(os.path.join(destino, "meta.json"), [a for a in arr if a.get("ts", "") <= iso(fim + 180)])
    json_escreve(os.path.join(destino, "config.json"), cm.config_em(iso(fim)))
    escreve(os.path.join(destino, "log.txt"), trecho_do_log(cm, ini, L))
    monta_serie(cm, destino, tid, al, dirs, fim)
    json_escreve(os.path.join(destino, "caso.json"), {
        "id": tid, "repo": "comarka-operacional", "arquivo_ticket": arquivo, "ticket_sha": sha, "ticket_antes": antes,
        "linha_bloqueio": None, "linha_fim": L, "log_inicio": ini, "fim": iso(fim), "tentativas": n,
        "meta_dir": f"docs/fila/runs/{tid}"})
    json_escreve(os.path.join(destino, "esperado.json"), {
        "classe": None, "controle": True, "firme_proibido": True,
        "fonte_da_verdade": f"{MEDICAO}:179 (controle: done do período sem bloqueio)"})
    return destino


def monta_cortado(saida, nn, tid):
    """Um controle já montado, cortado na última tentativa que reprovou. Só lê
    `controle/`: não precisa do comarka. Os vizinhos ficam os do controle que
    caem nas ±6 h do novo fim (o controle só guardou os das ±6 h do fim dele)."""
    origem = next(d for d in sorted(glob.glob(os.path.join(saida, "controle", "[0-9][0-9]-*")))
                  if os.path.basename(d).split("-")[1] == tid)
    ler = lambda f: open(os.path.join(origem, f), encoding="utf-8").read()
    caso = json.loads(ler("caso.json"))
    meta = json.loads(ler("meta.json"))
    final = meta[-caso["tentativas"]:]
    k = max(m["attempt"] for m in final if m["resultado"] != "done")
    i_k = meta.index(next(m for m in final if m["attempt"] == k))
    fim = ts_de(meta[i_k]["ts"])
    cab = re.compile(rf"=== ticket {re.escape(tid)} \(.*\) — tentativa {k + 1} ")
    log = ler("log.txt").splitlines(keepends=True)
    corte = next(i for i, l in enumerate(log) if cab.search(l))
    log = log[:corte]
    L = int(log[-1].split("\t")[0])
    destino = os.path.join(saida, "cortados", f"{nn:02d}-{tid}-L{L}")
    os.makedirs(destino, exist_ok=True)
    for f in ("ticket.json", "config.json"):
        escreve(os.path.join(destino, f), ler(f))
    escreve(os.path.join(destino, "log.txt"), "".join(log))
    json_escreve(os.path.join(destino, "meta.json"), meta[:i_k + 1])
    serie = json.loads(ler("serie.json"))[:k]
    json_escreve(os.path.join(destino, "serie.json"), serie)
    heads = set()
    for s in serie:
        a = f"attempt-{s['k']}"
        subprocess.run(["cp", "-R", os.path.join(origem, a), os.path.join(destino, a)], check=True)
        h = os.path.join(origem, a, "head.txt")
        if os.path.exists(h):
            heads.add(open(h).read().strip())
    for h in sorted(heads):
        if os.path.isdir(os.path.join(origem, "fontes", h)):
            os.makedirs(os.path.join(destino, "fontes"), exist_ok=True)
            subprocess.run(["cp", "-R", os.path.join(origem, "fontes", h), os.path.join(destino, "fontes", h)], check=True)
    cab_v, *linhas = ler("vizinhos.tsv").splitlines()
    viz = [cab_v]
    for l in linhas:
        c = l.split("\t")
        m = ts_de(c[4])
        if abs(m - fim) <= 6 * 3600:
            viz.append("\t".join(c[:5] + ["1" if m <= fim + 180 else "0"]))
    escreve(os.path.join(destino, "vizinhos.tsv"), "\n".join(viz) + "\n")
    json_escreve(os.path.join(destino, "caso.json"), {
        **caso, "linha_bloqueio": None, "linha_fim": L, "fim": iso(fim), "tentativas": k,
        "cortado_de": f"controle/{os.path.basename(origem)}", "cortado_em": k})
    json_escreve(os.path.join(destino, "esperado.json"), {
        "classe": None, "cortado": True, "firme_proibido": True,
        "fonte_da_verdade": f"controle/{os.path.basename(origem)} cortado na tentativa {k}, a última que reprovou "
                            "(o agente resolveu o vermelho no retry: R1 firme seria errado)"})
    return destino


def monta_primeiro_dia(cm, saida):
    """Os casos de `PRIMEIRO_DIA`, montados como os 37 (monta_caso), em
    `primeiro-dia/`; o esperado aponta o conserto humano, não a medição."""
    destino = os.path.join(saida, "primeiro-dia")
    subprocess.run(["rm", "-rf", destino], check=True)
    for nn, (tid, L, classe, cit, fonte) in enumerate(PRIMEIRO_DIA, 1):
        print("primeiro-dia", nn, tid, L, file=sys.stderr)
        d = monta_caso(cm, destino, nn, tid, L, classe, None, cit)
        esp = json.load(open(os.path.join(d, "esperado.json")))
        json_escreve(os.path.join(d, "esperado.json"), {**esp, "fonte_da_verdade": fonte})


INTEIROS = [("627j", "docs/fila/runs/627j/attempt-3/gate-vitest.txt"),
            ("627b", "docs/fila/runs/627b/attempt-1.prev1/gate-vitest.txt"),
            ("600", "docs/fila/runs/600/attempt-3/gate-vitest.txt")]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--comarka", default=os.path.expanduser("~/Projetos/comarka-operacional"))
    ap.add_argument("--saida", default=AQUI)
    ap.add_argument("--so-cortados", action="store_true", help="refaz só cortados/, a partir de controle/ (sem o comarka)")
    ap.add_argument("--so-primeiro-dia", action="store_true", help="refaz só primeiro-dia/ (lê o comarka)")
    a = ap.parse_args()
    if a.so_primeiro_dia:
        monta_primeiro_dia(Comarka(os.path.abspath(a.comarka)), a.saida)
        return
    subprocess.run(["rm", "-rf", os.path.join(a.saida, "cortados")], check=True)
    if a.so_cortados:
        for nn, tid in enumerate(CORTADOS, 1):
            monta_cortado(a.saida, nn, tid)
        return
    cm = Comarka(os.path.abspath(a.comarka))
    for d in (glob.glob(os.path.join(a.saida, "[0-9][0-9]-*")) + glob.glob(os.path.join(a.saida, "controle", "[0-9][0-9]-*"))
              + [os.path.join(a.saida, "vitest-inteiros")]):
        subprocess.run(["rm", "-rf", d], check=True)
    for nn, (tid, L, classe, lm, cit) in enumerate(CASOS, 1):
        print("caso", nn, tid, L, file=sys.stderr)
        monta_caso(cm, a.saida, nn, tid, L, classe, lm, cit)
    for nn, tid in enumerate(CONTROLE, 1):
        print("controle", nn, tid, file=sys.stderr)
        monta_controle(cm, a.saida, nn, tid)
    for nn, tid in enumerate(CORTADOS, 1):
        print("cortado", nn, tid, file=sys.stderr)
        monta_cortado(a.saida, nn, tid)
    # Três gate-vitest INTEIROS (sem recorte, só com a máscara), para o teste da
    # peça 2 provar que o recorte guarda todo FAIL e todo ❯.
    for tid, rel in INTEIROS:
        with open(os.path.join(cm.raiz, rel), encoding="utf-8", errors="replace") as fh:
            inteiro = mascarar(fh.read())
        os.makedirs(os.path.join(a.saida, "vitest-inteiros"), exist_ok=True)
        # gzip com mtime 0: o mesmo conteúdo dá os mesmos bytes (montagem reproduzível).
        with open(os.path.join(a.saida, "vitest-inteiros", f"{tid}.txt.gz"), "wb") as fh:
            fh.write(gzip.compress(inteiro.encode("utf-8"), mtime=0))
        json_escreve(os.path.join(a.saida, "vitest-inteiros", f"{tid}.recorte.json"), faixas([n for n, _ in recortar(inteiro)]))
    json_escreve(os.path.join(a.saida, "vitest-inteiros", "origem.json"), dict(INTEIROS))


if __name__ == "__main__":
    main()
