import json,os,re,subprocess
R=os.path.expanduser('~/Projetos/comarka-operacional'); E=dict(os.environ,GIT_OPTIONAL_LOCKS='0')
def git(*a): return subprocess.run(['git','-C',R,*a],capture_output=True,text=True,env=E).stdout
obj=json.load(open(os.path.expanduser('~/orq-sessoes/recon-migrations/objetos.json')))
tsv=[l.rstrip('\n').split('\t') for l in open(os.path.expanduser('~/orq-sessoes/recon-migrations/arquivos-migrations.tsv'))][1:]
allsql={r[0]:r[6].split(',')[0] for r in tsv}
cont={p:git('show',f'{b}:{p}').lower() for p,b in allsql.items()}
lib=json.load(open(f'{R}/docs/fila/liberacoes.json'))['liberadas']
for stem,v in obj.items():
    alvo=[o for o in v['objs'] if o[0] in('table','view','function','column','trigger')][:4]
    outros=set()
    for o in alvo:
        nome=o[-1].split('.')[-1].lower()
        for p,c in cont.items():
            if p==v['path']: continue
            if o[0]=='column':
                if re.search(r'add\s+column\s+(if\s+not\s+exists\s+)?'+re.escape(nome)+r'\b',c) and o[1].split('.')[-1].lower() in c: outros.add(os.path.basename(p))
            elif re.search(r'create\s+(or\s+replace\s+)?(table|view|function|trigger|materialized view)\s+(if\s+not\s+exists\s+)?(public\.)?'+re.escape(nome)+r'\b',c): outros.add(os.path.basename(p))
    c1=git('log','--all','--format=%h %cs %s','--diff-filter=A','--',v['path']).strip().splitlines()
    notas=[l['token']+': '+(l.get('nota') or '')[:90] for l in lib if stem[:14] in (l.get('nota') or '') or stem.split('_',1)[1][:20] in (l.get('nota') or '')]
    print(f"## {stem}\n  add: {c1[-1] if c1 else '?'}\n  objetos: {alvo}\n  mesmo objeto em: {sorted(outros)[:6]}\n  liberacoes: {notas[:2]}")
