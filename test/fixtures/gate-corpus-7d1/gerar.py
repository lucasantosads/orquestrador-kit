"""Gera test/fixtures/gate-corpus-7d1/casos.json a partir dos dados da calibração
de 25/09 (casos.json + inventario.json) e do git dos três repos, só leitura.

Uso: python3 gerar_corpus.py <saida.json>
"""
import json, os, re, subprocess, sys
from collections import Counter

CAL = '/private/tmp/claude-501/-Users-lucasantos-Projetos-orquestrador-kit/0b216d2f-2289-42ab-b28d-ee83350fd5b2/scratchpad/cal'
REPO = {'CI': '~/Projetos/conteudos-infinitos', 'Actus': '~/Projetos/actus-saas', 'Comarka': '~/Projetos/comarka-operacional'}
REPO = {k: os.path.expanduser(v) for k, v in REPO.items()}
ENV = dict(os.environ, GIT_OPTIONAL_LOCKS='0')
RMAP = {'conteudos-infinitos': 'CI', 'actus-saas': 'Actus', 'comarka-operacional': 'Comarka'}

def git(repo, *a):
    return subprocess.run(['git', '-C', REPO[repo], *a], capture_output=True, text=True, env=ENV)

def bloco(t):
    m = re.search(r"```json\n(.*?)\n```", t or '', re.S)
    if not m: return None
    try: return json.loads(m.group(1))
    except Exception: return None

inv = json.load(open(f'{CAL}/inventario.json'))
casos = json.load(open(f'{CAL}/casos.json'))

# causa anotada dos 57, da tabela do levantamento de bloqueios
causa = {}
for l in open(os.path.expanduser('~/orq-sessoes/levantamento-bloqueios.md')):
    c = [x.strip().replace('\\|', '|') for x in re.split(r'(?<!\\)\|', l)]
    if len(c) > 6 and c[1] in RMAP and c[5] in ('spec_criterio', 'spec_allowlist'):
        causa[(RMAP[c[1]], c[2])] = c[6]

CAMPOS = ['id', 'slug', 'bloco', 'objetivo', 'pathspec_allowlist', 'dependencias', 'criterios_aceite',
          'status', 'risco', 'contexto_juiz', 'cria_novo']
CAMPOS_CRIT = ['tipo', 'descricao', 'cmd', 'espera', 'exemplos_regex']

def reduz(j):
    t = {k: j[k] for k in CAMPOS if k in j}
    if isinstance(t.get('criterios_aceite'), list):
        t['criterios_aceite'] = [
            {k: c[k] for k in CAMPOS_CRIT if k in c} if isinstance(c, dict) else c for c in t['criterios_aceite']
        ]
    return t

# versões parseadas por repo/arquivo
vers = {r: {a: [(x['t'], bloco(x['txt'])) for x in v['hist']] for a, v in inv[r].items()} for r in inv}

def fila_em(repo, T):
    out = {}
    for a, vs in vers[repo].items():
        j = None; ok = False
        for t, jj in vs:
            if t < T: j = jj; ok = True
            else: break
        if ok and j and isinstance(j.get('id'), str): out[j['id']] = j
    return out

def deps_de(j):
    return [d for d in (j.get('dependencias') or []) if isinstance(d, str) and not d.startswith('humano:')]

ls_cache = {}
def fila_git(repo, sha):
    """ids -> json da fila no commit (para dependência cujo arquivo não existe mais hoje)."""
    if (repo, sha) not in ls_cache:
        nomes = git(repo, 'ls-tree', '--name-only', sha, 'docs/fila/').stdout.split()
        ls_cache[(repo, sha)] = nomes
    return ls_cache[(repo, sha)]

resgatados = []
saida = []
sel = [c for c in casos if c['grupo'] == 'b' or c.get('tem_runs')]
for c in sel:
    j = bloco(c['txt'])
    repo = c['repo']
    fila = fila_em(repo, c['T'])
    tid = j.get('id')
    # dependência que o snapshot de hoje não tem: lida do git no commit do evento
    for d in deps_de(j):
        if d in fila: continue
        for nome in fila_git(repo, c['sha_ev']):
            b = os.path.basename(nome)
            if re.match(rf'^{re.escape(d)}-.*\.md$', b):
                jj = bloco(git(repo, 'show', f"{c['sha_ev']}:{nome}").stdout)
                if jj and jj.get('id') == d:
                    fila[d] = jj; resgatados.append((repo, tid, d))
                break
    # contexto mínimo: dependências (fecho), pendentes com allowlist em comum e o fecho deles
    minhas = set(map(str, j.get('pathspec_allowlist') or []))
    incluir = set()
    for oid, o in fila.items():
        if oid == tid or o.get('status') != 'pendente': continue
        if minhas & set(map(str, o.get('pathspec_allowlist') or [])): incluir.add(oid)
    pilha = deps_de(j) + [d for o in list(incluir) for d in deps_de(fila[o])]
    while pilha:
        d = pilha.pop()
        if d in incluir or d == tid: continue
        if d in fila:
            incluir.add(d); pilha.extend(deps_de(fila[d]))
    ctx = []
    for oid in sorted(incluir):
        o = fila[oid]
        ctx.append({'id': oid, 'status': o.get('status'), 'pathspec_allowlist': o.get('pathspec_allowlist') or [],
                    'dependencias': o.get('dependencias') or []})
    caso = {'grupo': c['grupo'], 'repo': repo, 'id': c['id'], 'arquivo': c['arq']}
    if c['grupo'] == 'b':
        caso['classe'] = c['classe']; caso['causa'] = causa.get((repo, c['id']), '')
    caso['ticket'] = reduz(j)
    caso['fila'] = ctx
    saida.append(caso)

ordem = {'b': 0, 'a': 1}; orep = {'CI': 0, 'Actus': 1, 'Comarka': 2}
saida.sort(key=lambda x: (ordem[x['grupo']], orep[x['repo']], x['id']))
with open(sys.argv[1], 'w') as f:
    f.write('[\n' + ',\n'.join(json.dumps(x, ensure_ascii=False) for x in saida) + '\n]\n')
print(Counter((x['grupo'], x['repo']) for x in saida))
print('dependências resgatadas do git:', len(resgatados), resgatados)
print('sem causa:', [(x['repo'], x['id']) for x in saida if x['grupo'] == 'b' and not x.get('causa')])
