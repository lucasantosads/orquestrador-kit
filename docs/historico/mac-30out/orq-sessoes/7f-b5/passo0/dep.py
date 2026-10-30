import os,re,json,subprocess,glob
R='/Users/lucasantos/Projetos/comarka-operacional'; env=dict(os.environ,GIT_OPTIONAL_LOCKS='0')
def git(*a):
    p=subprocess.run(['git','-C',R,*a],capture_output=True,text=True,env=env); return p.stdout if p.returncode==0 else None
def bloco(md):
    m=re.search(r'```json\s*\n(.*?)\n```',md or '',re.S)
    try: return json.loads(m.group(1)) if m else None
    except Exception: return None
casos=[("ded72e169","306b","500"),("ec421bcbe","522","522c"),("f6f2746cf","551","551a"),("b3c5ec64a","559","625"),("92bee2ca7","559","626"),("73a1a46cd","559","559a"),("718206da0","715","726"),("917d35bca","826","866")]
RX=re.compile(r"Cannot find module|Failed to resolve import|Module not found|has no exported member|is not exported|Could not resolve|ENOENT|does not provide an export|Cannot find name|TS2305|TS2307|TS2614|TS2724")
for c,tid,dep in casos:
    arv=git('ls-tree','--name-only',f'{c}^','docs/fila/') or ''
    f=[x for x in arv.split('\n') if x.startswith(f'docs/fila/{dep}-')]
    st=None; al=[]
    if f:
        j=bloco(git('show',f'{c}^:{f[0]}')); st=j.get('status'); al=j.get('pathspec_allowlist',[])
    ts=git('show','-s','--format=%cI',c).strip()
    # artifacts: grep for missing module signals in all attempt dirs of tid
    hits=set()
    for d in glob.glob(f'{R}/docs/fila/runs/{tid}/attempt-*'):
        for fn in glob.glob(d+'/*.txt')+glob.glob(d+'/*.json'):
            try: t=open(fn,errors='ignore').read()
            except Exception: continue
            for m in RX.finditer(t): hits.add((os.path.basename(d),m.group(0)))
    print(c,tid,'+'+dep,'commit',ts,'| dep existia antes:',bool(f),st,'| AL dep:',al[:4],'| sinais:',sorted(hits)[:6])
