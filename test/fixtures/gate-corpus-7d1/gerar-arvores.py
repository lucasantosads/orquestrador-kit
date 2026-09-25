"""Gera test/fixtures/gate-corpus-7d1/arvores.json e acentos.json (etapa 7d-1b,
peça 4): os fatos de árvore que as regras C9, C11 e C12 e o C4 leem, para cada
caso do corpus, tirados do git dos três repos, só leitura (GIT_OPTIONAL_LOCKS=0).

  arvores.json  {"<grupo>:<repo>:<id>": {"alvo": {caminho: "arquivo"|"diretorio"},
                                          "disco": [caminho...],
                                          "testes": {texto: [arquivo de teste...]}}}
     alvo   = a base do caso (a mesma da calibração: pai do merge em staging-auto,
              ou staging-auto antes de T), para os itens da allowlist e os pais;
     disco  = os itens da allowlist que existiam em main no instante E (C9), pela
              cadeia de primeiro pai (o estado da main naquele instante, não um
              commit do próprio ticket que o merge trouxe para o histórico);
     testes = para cada basename (>= 6) de item da allowlist, os arquivos de teste
              da base que o citam (git grep -l -F na base).
  acentos.json  {"<repo>": [palavra acentuada...]}: as palavras do código atual
              (**/src/**/*.ts e *.tsx) que casam algum `letra.letra` de grep do
              corpus — o dicionário do C4, com a lacuna 4 da calibração (árvore atual).

Uso: python3 gerar_arvores.py <dir-do-corpus>
"""
import json, os, re, subprocess, sys

CAL = '/private/tmp/claude-501/-Users-lucasantos-Projetos-orquestrador-kit/0b216d2f-2289-42ab-b28d-ee83350fd5b2/scratchpad/cal'
REPO = {k: os.path.expanduser(v) for k, v in {'CI': '~/Projetos/conteudos-infinitos', 'Actus': '~/Projetos/actus-saas', 'Comarka': '~/Projetos/comarka-operacional'}.items()}
ENV = dict(os.environ, GIT_OPTIONAL_LOCKS='0')
TESTES = [':(glob)**/test/**', ':(glob)**/tests/**', ':(glob)**/__tests__/**', ':(glob)**/*.test.*', ':(glob)**/*.spec.*']
RE_TESTE = re.compile(r'(^|/)(test|tests|__tests__)/|\.(test|spec)\.')

def git(repo, *a, inp=None):
    return subprocess.run(['git', '-C', REPO[repo], *a], capture_output=True, text=True, env=ENV, input=inp)

dirc = sys.argv[1]
corpus = json.load(open(os.path.join(dirc, 'casos.json')))
cal = {(c['grupo'], c['repo'], c['id']): c for c in json.load(open(f'{CAL}/casos.json'))}

def tipos(repo, rev, caminhos):
    if not rev or not caminhos: return {}
    inp = ''.join(f'{rev}:{p}\n' for p in caminhos)
    out = git(repo, 'cat-file', '--batch-check', inp=inp).stdout.splitlines()
    res = {}
    for p, l in zip(caminhos, out):
        if l.endswith('missing') or l.endswith('ambiguous'): continue
        t = l.split()[1] if len(l.split()) > 1 else ''
        if t == 'blob': res[p] = 'arquivo'
        elif t == 'tree': res[p] = 'diretorio'
    return res

arvores = {}
for n, x in enumerate(corpus):
    c = cal[(x['grupo'], x['repo'], x['id'])]
    repo = x['repo']; base = c.get('base')
    t = x['ticket']
    allow = [p for p in (t.get('pathspec_allowlist') or []) if isinstance(p, str)]
    itens = [p for p in allow if '*' not in p and not p.endswith('/')]
    pais = sorted({os.path.dirname(p) or '.' for p in itens})
    alvo = tipos(repo, base, sorted(set(itens) | set(pais)))
    main_e = git(repo, 'rev-list', '-1', '--first-parent', f"--before={c.get('E', c['T'])}", 'main').stdout.strip()
    disco = sorted(tipos(repo, main_e, itens).keys())
    cria = set(t.get('cria_novo') or [])
    testes = {}
    for src in sorted(p for p in itens if not RE_TESTE.search(p) and p not in cria):
        b = os.path.splitext(os.path.basename(src))[0]
        if len(b) < 6 or b in testes or not base: continue
        r = git(repo, 'grep', '-l', '-F', '-e', b, base, '--', *TESTES)
        testes[b] = sorted(l.split(':', 1)[1] for l in r.stdout.splitlines() if ':' in l)
    arvores[f"{x['grupo']}:{repo}:{x['id']}"] = {'alvo': alvo, 'disco': disco, 'testes': testes}
    if n % 100 == 0: print(n, len(corpus), file=sys.stderr)

# dicionário de acento: candidatos `letra.letra` dos grep do corpus
PONTO = re.compile(r"(?<![\\\w.])([A-Za-z]{2,})((?:(?<!\\)\.){1,2})([A-Za-z]+)")
cand = {r: [] for r in REPO}
for x in corpus:
    for cr in x['ticket'].get('criterios_aceite') or []:
        if not isinstance(cr, dict): continue
        for m in re.finditer(r"\bgrep\b((?:\s+-[A-Za-z]+)*)\s+(['\"])(.*?)\2", cr.get('cmd') or ''):
            for tt in PONTO.finditer(m.group(3)):
                if len(tt.group(2)) == 1:
                    cand[x['repo']].append(re.compile(re.escape(tt.group(1).lower()) + r"[^\x00-\x7f]{1,2}" + re.escape(tt.group(3).lower())))
acentos = {}
for repo in REPO:
    arqs = git(repo, 'ls-files', '--', ':(glob)**/src/**/*.ts', ':(glob)**/src/**/*.tsx').stdout.split()
    palavras = set()
    for f in arqs:
        try: txt = open(os.path.join(REPO[repo], f), encoding='utf-8').read()
        except (OSError, UnicodeDecodeError): continue
        palavras.update(w.lower() for w in re.findall(r'\w+', txt) if re.search(r'[^\x00-\x7f]', w))
    acentos[repo] = sorted(w for w in palavras if any(rx.search(w) for rx in cand[repo]))

with open(os.path.join(dirc, 'arvores.json'), 'w') as f:
    f.write('{\n' + ',\n'.join(f'{json.dumps(k)}: {json.dumps(v, ensure_ascii=False)}' for k, v in arvores.items()) + '\n}\n')
with open(os.path.join(dirc, 'acentos.json'), 'w') as f:
    json.dump(acentos, f, ensure_ascii=False, indent=1)
print('arvores', len(arvores), 'acentos', {k: len(v) for k, v in acentos.items()})
