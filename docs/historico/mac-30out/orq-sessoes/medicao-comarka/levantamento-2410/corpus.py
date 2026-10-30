#!/usr/bin/env python3
"""Gera corpus-juiz-v0.tsv: linhas D da P4 com defeito visivel no diff aprovado. So git log/rev-parse/merge-base.
Padroes: 1 teto de 1000 linhas do servidor com .limit maior | 2 consulta em serie por item (N+1) |
3 id do notion x id do OS | 4 campo legado lido como fonte | 5 data sem o dia de SP | - fora dos 5."""
import os, subprocess
os.environ["GIT_OPTIONAL_LOCKS"] = "0"
REPO = os.path.expanduser("~/Projetos/comarka-operacional")
AQUI = os.path.dirname(os.path.abspath(__file__))
def git(*a):
    return subprocess.run(["git", "-C", REPO] + list(a), capture_output=True, text=True, check=True).stdout.strip()

LINHAS = [   # id, sha_aprovado, sha_conserto, padrao, defeito
    ("715", "020e33ef9", "80a212fdb", "1", "le mensagens com .limit(5000); o servidor devolve no maximo 1000 e as mais recentes somem"),
    ("734", "a8ea88e1a", "80a212fdb;a2cd69ec8", "1;2", "vacuo: mesmo teto de 1000 nas mensagens e contatos lidos cliente a cliente"),
    ("740", "6c6449993", "29afed53d", "1", "fecharPromessas le .limit(5000): a entrega recente nunca chega ao modelo"),
    ("741a", "e006c6b19", "80a212fdb", "1;2", "detectar promessas: teto de 1000 nas mensagens e contatos lidos cliente a cliente"),
    ("861", "a9114d6a8", "80a212fdb", "1", "detectar promessas: .order(asc).limit(5000) perde as mensagens mais recentes"),
    ("694", "03f0d77f0", "a2cd69ec8", "2", "Inicio lento: duas consultas em serie por cliente"),
    ("699", "419a92762", "a2cd69ec8", "2", "equipe do head: uma carga por gestor e mais uma em serie para o head"),
    ("705", "ad532d736", "a2cd69ec8", "2", "carregar-carteira: leituras independentes feitas em serie"),
    ("763", "652f46458", "da1f4f1ce", "2", "backfill grava e requalifica oportunidade por oportunidade em serie (~2 s por item)"),
    ("737", "e79eaf5ad", "85a69a377", "3", "page passa String(id) cru da URL (notion id) para ResponderAgora, que exige uuid"),
    ("924c", "788f92272", "5912a0dfd", "4", "status do grupo WhatsApp lido de whatsapp_group_url (legado): 25 clientes com grupo aparecem sem link"),
    ("953", "52f3ffc80", "10c88edb9", "5", "funil compara datas como texto sem o dia de Sao Paulo (d >= from && d < aposTo)"),
    ("761", "b548169e8", "da1f4f1ce", "-", "falha engolida no catch do backfill nao vira ultimo_erro na retomada"),
    ("762", "3179addba", "da1f4f1ce", "-", "conclusao e erro do backfill sem registro para a retomada"),
    ("974", "c4a7986cf", "10c88edb9", "-", "ritmo guarda estado em memoria do modulo numa funcao serverless"),
    ("1303", "354ab5945", "ac83a7777;2c76b10f7", "-", "troca de aba renderiza antes do fetch e a aba nova recebe o payload da anterior"),
]
merges = {}
for l in git("log", "--branches", "--merges", "--since=2026-09-15", "--format=%H %P%x1f%s").splitlines():
    hp, s = l.split("\x1f"); p = hp.split()
    if s.startswith("orquestrador: merge frente/") and len(p) >= 3:
        merges[p[2]] = (p[0], p[1])
with open(os.path.join(AQUI, "corpus-juiz-v0.tsv"), "w") as fh:
    fh.write("# corpus de regressao do juiz v0 (24/10/2026): linhas D da P4 com defeito visivel no diff aprovado. A CONFIRMAR PELO LUCAS. Nao rodado.\n")
    fh.write("# base = merge-base(staging no merge, frente) = o diff que o juiz julgou (git diff base...sha_aprovado). padrao '-' = fora dos 5.\n")
    fh.write("id\tsha_aprovado\tmerge\tbase\tsha_conserto\tpadrao\tdefeito\n")
    for tid, ap, cons, pad, txt in LINHAS:
        full = git("rev-parse", ap)
        mg, p1 = merges[full]
        base = git("merge-base", p1, full)
        cs = ";".join(git("rev-parse", c) for c in cons.split(";"))
        fh.write("\t".join([tid, full, mg, base, cs, pad, txt]) + "\n")
print("ok", len(LINHAS))
