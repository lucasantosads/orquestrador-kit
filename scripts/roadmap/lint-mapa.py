import json,re,subprocess,sys,fnmatch
m=json.load(open('docs/roadmap/mapa.json'))
cfg=json.load(open('docs/fila/000-config.json'))
md=open('docs/roadmap/MAPA.md').read()
falhas=[];oks=[];avisos=[]
def ok(t): oks.append(t)
def bad(t): falhas.append(t)
def warn(t): avisos.append(t)

blocos=m['blocos']
frentes=[(b,f) for b in blocos for f in b['frentes']]
ids_b={b['id'] for b in blocos}; ids_f={f['id'] for _,f in frentes}

# 1 faixas disjuntas — OPCIONAL desde 2026-09-04. IDs de ticket sao SEQUENCIAIS GLOBAIS (ordem de
# fila); `bloco` e `frente` no JSON do ticket carregam a pertenca. Faixa por bloco imporia prioridade
# por bloco, e os blocos progridem em paralelo (ver PLAYBOOK, 2026-09-04). `faixa_ids` sobrevive so
# onde e registro historico (B0, faixa 000-099 fechada) — e, SE existir, ainda tem de ser disjunta.
com_faixa=[b for b in blocos if b.get('faixa_ids')]
fx=sorted((tuple(b['faixa_ids']),b['id']) for b in com_faixa); confl=[]
for i in range(len(fx)-1):
    if fx[i][0][1]>=fx[i+1][0][0]: confl.append((fx[i][1],fx[i+1][1]))
ok(f"1. faixas de ID: {len(com_faixa)} bloco(s) declaram faixa (historico), disjuntas") if not confl else bad(f"1. faixas sobrepostas: {confl}")

# 2 dod nao vazio
v=[b['id'] for b in blocos if not b.get('dod')]
ok("2. todo bloco tem dod nao vazio") if not v else bad(f"2. bloco sem dod: {v}")

# 3 frente: allowlist, deps, status
STAT={'rascunho','pronta','em_andamento','concluida','bloqueada_humano'}
e=[]
for b,f in frentes:
    if not f.get('allowlist'): e.append(f"{f['id']}: allowlist vazia")
    if f['status'] not in STAT: e.append(f"{f['id']}: status invalido {f['status']}")
    for d in f['deps']:
        if d not in ids_f: e.append(f"{f['id']}: dep inexistente {d}")
    # O teto de 8 paths e gate_ticket.max_paths_allowlist: vale por TICKET. A allowlist de uma
    # frente e a UNIAO das allowlists dos seus tickets, entao naturalmente e maior — cobrar 8 aqui
    # e uma regra que a doutrina nao tem (corrigido 2026-09-03; ver PLAYBOOK). Acima de 16 vira
    # AVISO, nunca falha: a essa altura a frente provavelmente devia ser duas.
    if len(f['allowlist'])>16:
        warn(f"3. {f['id']}: allowlist da frente com {len(f['allowlist'])} paths (>16) — considere partir a frente")
    if f['tickets_estimados']>8: e.append(f"{f['id']}: tickets_estimados {f['tickets_estimados']} > 8")
ok("3. frentes: allowlist nao vazia, status valido, deps existentes, tickets_estimados <=8") if not e else bad("3. "+"; ".join(e))

# 4 allowlist x zona_proibida
zp=cfg['zona_proibida']['no_write_paths']+cfg['zona_proibida']['no_write_credenciais']['padroes']
def casa(glob_frente, glob_proibido):
    # match textual de prefixo de diretorio + fnmatch, nos dois sentidos
    a=glob_frente.replace('**','*'); b=glob_proibido.replace('**','*')
    return fnmatch.fnmatch(a.rstrip('*/'), b) or fnmatch.fnmatch(b.rstrip('*/'), a) or a.rstrip('*/').startswith(b.rstrip('*/').rstrip('*'))and b.rstrip('*/').rstrip('*')!=''
e=[]
for b_,f in frentes:
    for p in f['allowlist']:
        for q in zp:
            if casa(p,q): e.append(f"{f['id']}: {p} ~ zona_proibida {q}")
ok("4. allowlist ∩ zona_proibida = vazio") if not e else bad("4. "+"; ".join(e))

# 5 allowlist x paths_harness
e=[]
for b_,f in frentes:
    for p in f['allowlist']:
        for q in cfg['paths_harness']:
            if casa(p,q): e.append(f"{f['id']}: {p} ~ paths_harness {q}")
ok("5. allowlist ∩ paths_harness = vazio") if not e else bad("5. "+"; ".join(e))

# 6 todo glob de frente sem cria_novo casa >=1 arquivo
e=[];novos=[]
for b_,f in frentes:
    for p in f['allowlist']:
        n=len(subprocess.run(['git','ls-files','--',f':(glob){p}'],capture_output=True,text=True).stdout.split())
        if n==0:
            if f['cria_novo']: novos.append(f"{f['id']}:{p}")
            else: e.append(f"{f['id']}: glob sem match e sem cria_novo -> {p}")
ok(f"6. globs casam no disco (git ls-files); {len(novos)} paths novos, todos em frente cria_novo") if not e else bad("6. "+"; ".join(e))

# 7 <=2 pronta por bloco
e=[b['id'] for b in blocos if sum(1 for f in b['frentes'] if f['status']=='pronta')>2]
ok("7. <=2 frentes pronta por bloco") if not e else bad(f"7. blocos com >2 pronta: {e}")

# 8 pronta so com deps concluida
st={f['id']:f['status'] for _,f in frentes}
e=[f"{f['id']} dep {d} esta {st[d]}" for _,f in frentes if f['status']=='pronta' for d in f['deps'] if st.get(d)!='concluida']
ok("8. frente pronta so com deps concluida") if not e else bad("8. "+"; ".join(e))

# 9 IDs MAPA.md == mapa.json
md_b=set(re.findall(r'^## (B\d+) ·',md,re.M)); md_f=set(re.findall(r'^\| (B\d+-F\d+) \|',md,re.M))
e=[]
if md_b!=ids_b: e.append(f"blocos md={sorted(md_b)} json={sorted(ids_b)}")
if md_f!=ids_f: e.append(f"frentes md-json={sorted(md_f-ids_f)} json-md={sorted(ids_f-md_f)}")
ok(f"9. IDs de MAPA.md == mapa.json ({len(ids_b)} blocos, {len(ids_f)} frentes)") if not e else bad("9. "+"; ".join(e))

# 10 todo gate humano que um ticket ABERTO exige esta declarado por algum bloco.
# gates_humanos = o que o bloco EXIGE; liberacoes.json = o que ja foi SATISFEITO. Um token estar
# nos dois e o caso NORMAL de gate cumprido, nao erro (semantica corrigida em 2026-09-03; a versao
# anterior tratava isso como vazamento — regra que a doutrina nao tem; ver PLAYBOOK).
import glob as _glob
lib=json.load(open('docs/fila/liberacoes.json'))
# As MESMAS formas que scripts/orquestrador/lib.sh:liberacao_ok resolve (peca K8b-1), pela mesma
# regra: uniao das duas listas, entrada string OU objeto com .token, prefixo 'humano:' normalizado
# nos dois lados. Divergir daqui faria o lint dizer "satisfeito" sobre token que o loop nao resolve
# — ou o contrario, que e pior: o lint verde escondendo a fila travada.
#
# Os marcadores abaixo NAO sao decoracao: test/orquestrador-liberacoes-formatos.test.ts extrai
# exatamente este bloco e o EXECUTA contra os arquivos reais dos tres repos, para que o teste
# rode a regra do lint em vez de reimplementa-la.
# <sat>
def _token_de(x):
    if isinstance(x, str): return x
    if isinstance(x, dict): return x.get('token') or ''
    return ''
def _humano(t):
    t = str(t)
    return t if t.startswith('humano:') else f'humano:{t}'
sat={_humano(_token_de(x)) for x in ((lib.get('tokens') or []) + (lib.get('liberadas') or []))
     if _token_de(x)}
# </sat>
# O WARN nao e mais sobre o ARQUIVO estar no formato novo (ele esta), e sim sobre o HARNESS ler
# esse formato: quem resolve dependencia humana e lib.sh:liberacao_ok. Enquanto ela nao consultar
# '.tokens', todo token de liberacoes.json e decorativo — foi exatamente o bug de 2026-09-03.
_libsh=open('scripts/orquestrador/lib.sh').read()
_fn=re.search(r'^liberacao_ok\(\)\s*\{(.*?)^\}', _libsh, re.S|re.M)
if not _fn:
    warn("10. nao achei liberacao_ok() em scripts/orquestrador/lib.sh — quem resolve humano:<token>?")
elif '.tokens' not in _fn.group(1):
    warn("10. lib.sh:liberacao_ok NAO le '.tokens' de liberacoes.json — nenhum token liberado "
         "resolve dependencia humana no loop")
elif lib.get('liberadas'):
    warn("10. liberacoes.json ainda tem a chave legada 'liberadas' — liberacao_ok a aceita por UMA "
         "versao, com aviso no log; migre para {\"tokens\": [\"humano:<token>\"]}")
toks={g for b in blocos for g in b['gates_humanos']}
exigidos=set()
for _f in sorted(_glob.glob('docs/fila/*.md')):
    _mm=re.search(r'```json\n(.*?)\n```', open(_f).read(), re.S)
    if not _mm: continue
    try: _t=json.loads(_mm.group(1))
    except Exception: continue
    # ticket done ja resolveu seu gate; cobrar declaracao retroativa quebraria o legado B0.
    if _t.get('status')=='done': continue
    exigidos|={str(d) for d in _t.get('dependencias',[]) if str(d).startswith('humano:')}
e=[f"{t} (exigido por ticket aberto, nenhum bloco declara)" for t in sorted(exigidos-toks)]
satisfeitos=sorted(toks&sat)
ok(f"10. gates humanos: {len(toks)} declarados, {len(exigidos)} exigidos por ticket aberto, "
   f"{len(satisfeitos)} satisfeitos em liberacoes.json {satisfeitos}") if not e else bad("10. "+"; ".join(e))

print("LINT MANUAL DO MAPA — docs/roadmap/{MAPA.md,mapa.json}\n")
for t in oks: print("  PASS  "+t)
for t in falhas: print("  FAIL  "+t)
for t in avisos: print("  WARN  "+t)
print(f"\n{len(oks)} passaram, {len(falhas)} falharam, {len(avisos)} aviso(s)")
sys.exit(1 if falhas else 0)
