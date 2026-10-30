#!/usr/bin/env python3
"""Testes do C5 (retrabalho). Fixtures reais em fixtures/c5/ (procedencia em ORIGEM.tsv);
casos s_* sao sinteticos (nao ha saiu_de_done, revert nem ticket_conserto real na janela).
Uso: python3 -I test_c5.py -v"""
import json, os, sys, unittest
from datetime import datetime, timedelta, timezone
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import c5

FIX = os.path.join(os.path.dirname(os.path.abspath(__file__)), "fixtures", "c5")
TZL = timezone(timedelta(hours=-3))
CORTE = datetime(2026, 10, 23, 23, 59, 59, tzinfo=TZL)

def ler(caso, nome):
    with open(os.path.join(FIX, caso, nome)) as fh:
        return fh.read()

def ticket(caso):
    j = json.loads(ler(caso, "caso.json"))
    t = j["ticket"]
    return {"id": t["id"], "loop": t["loop"], "prim": t["prim"], "sha_aprovado": t["sha_aprovado"],
            "shas": {t["sha_aprovado"], t["merge"]},
            "done_em": datetime.strptime(t["done_em"], "%Y-%m-%d %H:%M").replace(tzinfo=TZL),
            "adicionadas": c5.linhas_diff(ler(caso, "ticket.patch"), "+")}, j

def commit(caso, j):
    c = j["commit"]
    return {"sha": c["sha"], "dt": datetime.fromisoformat(c["dt"]), "assunto": c["assunto"], "corpo": "",
            "arquivos": c["arquivos"], "removidas": c5.linhas_diff(ler(caso, "commit.patch"), "-"),
            "adicionadas": c5.linhas_diff(ler(caso, "commit.patch"), "+")}

def evid(linhas):
    return [(l["tipo"], l["forca"]) for l in linhas if l["tipo"] != "nenhum"]

REAIS = ["d_763", "d_741a", "d_953", "e_743", "f_982", "n_ritual_5135", "n_ritual_952a", "n_spec_5053"]

class Reais(unittest.TestCase):
    def test_cada_caso_real(self):
        for caso in REAIS:
            with self.subTest(caso=caso):
                t, j = ticket(caso)
                linhas, ritual = c5.avaliar([t], [commit(caso, j)], CORTE)
                esp = j["esperado"]
                if esp["forca"] in ("forte", "fraco"):
                    self.assertEqual(evid(linhas), [(esp["tipo"], esp["forca"])])
                    self.assertEqual(linhas[0]["evidencia_sha"], j["commit"]["sha"])
                    self.assertEqual(linhas[0]["sha_aprovado"], t["sha_aprovado"])
                elif esp["forca"] == "ritual":
                    self.assertEqual(evid(linhas), [("ritual", "ritual")])
                    self.assertEqual(ritual, {"pares": 1, "tickets": 1, "commits": 1})
                else:   # spec: commit fila(...) que conserta spec de outro ticket nao e fix de codigo
                    self.assertEqual(evid(linhas), [])
                    self.assertEqual([l["tipo"] for l in linhas], ["nenhum"])

    def test_arquivo_quente_derruba_so_o_fix_no_arquivo(self):
        t, j = ticket("f_982")
        arq = "src/app/dashboard/clientes/[id]/_components/tabela-campanhas.tsx"
        linhas, _ = c5.avaliar([t], [commit("f_982", j)], CORTE, quentes={arq})
        self.assertEqual(evid(linhas), [])
        t, j = ticket("d_953")   # sobreposicao de linha vale mesmo em arquivo quente
        linhas, _ = c5.avaliar([t], [commit("d_953", j)], CORTE, quentes={"src/lib/comercial/funil-cliente.ts"})
        self.assertEqual(evid(linhas), [("fix_na_linha", "forte")])

    def test_linha_readicionada_pelo_mesmo_commit_nao_conta(self):
        # 2c76b10f7 move abaDoHash do page.tsx do 997 para o portal-shell. Das 5 linhas do 997 que ele
        # apaga, so `return ABAS_PRONTAS.includes(h) ? h : "inicio";` volta igual; as outras 4 voltam
        # reescritas, entao o par segue forte, com 4 linhas.
        t, j = ticket("m_997_movido")
        linhas, _ = c5.avaliar([t], [commit("m_997_movido", j)], CORTE)
        self.assertEqual(evid(linhas), [("fix_na_linha", "forte")])
        self.assertEqual(linhas[0]["linhas"], j["esperado"]["linhas"])

    def test_citacao_de_lote_nao_e_ticket_conserto(self):
        t, j = ticket("n_cita_1043_1044")
        novo = {"id": "1044", "sha": j["novo"]["sha"], "dt": datetime.fromisoformat(j["novo"]["dt"]) + timedelta(hours=1),
                "texto": ler("n_cita_1043_1044", "novo.md"), "removidas": c5.linhas_diff(ler("n_cita_1043_1044", "novo.patch"), "-")}
        linhas, _ = c5.avaliar([t], [], CORTE, novos=[novo])
        self.assertEqual(evid(linhas), [])

class Janela(unittest.TestCase):
    def setUp(self):
        self.t, j = ticket("d_953")
        self.c = commit("d_953", j)

    def test_fora_dos_14_dias_ou_depois_do_corte_nao_conta(self):
        for dt in (self.t["done_em"] - timedelta(hours=1), self.t["done_em"] + timedelta(days=14, minutes=1)):
            linhas, _ = c5.avaliar([self.t], [dict(self.c, dt=dt)], CORTE)
            self.assertEqual(evid(linhas), [], dt)
        corte = self.c["dt"] - timedelta(minutes=1)
        linhas, _ = c5.avaliar([self.t], [self.c], corte)
        self.assertEqual(evid(linhas), [])
        self.assertEqual(linhas[0]["dias_acompanhados"], 0)   # 11/10 16:21 -> 12/10 15:56

    def test_dias_acompanhados_tem_teto_14(self):
        linhas, _ = c5.avaliar([self.t], [], CORTE)
        self.assertEqual(linhas[0]["dias_acompanhados"], 12)
        linhas, _ = c5.avaliar([self.t], [], CORTE + timedelta(days=30))
        self.assertEqual(linhas[0]["dias_acompanhados"], 14)

class Sinteticos(unittest.TestCase):
    def setUp(self):
        self.t, j = ticket("d_763")

    def test_s_saiu_de_done(self):
        tr = {"id": "763", "dt": self.t["done_em"] + timedelta(days=2), "sha": "a" * 40, "para": "pendente"}
        linhas, _ = c5.avaliar([self.t], [], CORTE, transicoes=[tr])
        self.assertEqual(evid(linhas), [("saiu_de_done", "forte")])

    def test_s_revert_de_sha_do_ticket(self):
        rv = {"sha": "b" * 40, "dt": self.t["done_em"] + timedelta(days=1), "assunto": 'Revert "ghl backfill"',
              "corpo": "This reverts commit %s." % self.t["sha_aprovado"], "arquivos": [], "removidas": {}}
        linhas, _ = c5.avaliar([self.t], [rv], CORTE)
        self.assertEqual(evid(linhas), [("revert", "forte")])

    def test_s_ticket_conserto_com_linha_do_ticket(self):
        arq = "src/lib/perf/ghl-backfill.ts"
        linha = sorted(self.t["adicionadas"][arq])[0]
        novo = {"id": "1999", "sha": "c" * 40, "dt": self.t["done_em"] + timedelta(days=3),
                "texto": "## Objetivo\nConserta o 763: o checkpoint nao era gravado.", "removidas": {arq: {linha}}}
        linhas, _ = c5.avaliar([self.t], [], CORTE, novos=[novo])
        self.assertEqual(evid(linhas), [("ticket_conserto", "forte")])
        novo["removidas"] = {}
        linhas, _ = c5.avaliar([self.t], [], CORTE, novos=[novo])
        self.assertEqual(evid(linhas), [])

class Resumo(unittest.TestCase):
    def test_por_loop_e_c2_inflado(self):
        tks, cms = [], []
        for caso in ("d_763", "d_953", "e_743", "n_ritual_5135", "n_spec_5053"):
            t, j = ticket(caso); tks.append(t); cms.append(commit(caso, j))
        linhas, ritual = c5.avaliar(tks, cms, CORTE)
        r = c5.resumir(tks, linhas, ritual)
        self.assertEqual(r["total"]["universo"], 5)
        self.assertEqual(r["total"]["com_forte"], 2)
        self.assertEqual(r["total"]["pct"], 40.0)
        self.assertEqual(r["plataforma"], {"universo": 3, "com_forte": 2, "pct": 66.7})
        self.assertEqual(r["apolo"], {"universo": 2, "com_forte": 0, "pct": 0.0})
        self.assertEqual(r["fortes_por_tipo"], {"saiu_de_done": 0, "revert": 0, "ticket_conserto": 0, "fix_na_linha": 2})
        self.assertEqual(r["fracos_por_tipo"], {"linha_sem_fix": 1, "fix_no_arquivo": 0})
        self.assertEqual(r["aprovados_de_primeira_com_forte"], ["763"])   # 953 foi "nao"
        self.assertEqual(r["ritual"], {"pares": 1, "tickets": 1, "commits": 1})

if __name__ == "__main__":
    unittest.main()
