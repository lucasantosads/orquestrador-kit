import csv, json, os, re, subprocess, sys, datetime as dt
R='/Users/lucasantos/Projetos/comarka-operacional'
env=dict(os.environ, GIT_OPTIONAL_LOCKS='0')
def git(*a):
    p=subprocess.run(['git','-C',R,*a],capture_output=True,text=True,env=env); return p.stdout if p.returncode==0 else None
def bloco(md):
    if md is None: return None
    m=re.search(r'```json\s*\n(.*?)\n```',md,re.S)
    try: return json.loads(m.group(1)) if m else None
    except Exception: return None
rows=list(csv.DictReader(open(os.path.expanduser('~/orq-sessoes/medicao-comarka/out/30d/intervencoes.csv'))))
out=[]
for x in rows:
    if x['tipo'] not in ('dependencia','allowlist','criterio') or not x['classe'].startswith('intervencao'): continue
    c=x['commit']
    files=[f for f in x['arquivos'].split(';') if re.match(r'docs/fila/[0-9][0-9a-z]*-.*\.md$',f)]
    full=git('rev-parse',c) or c
    ts=git('show','-s','--format=%cI',c)
    for f in files:
        tid=f.split('/')[-1].split('-')[0]
        a=bloco(git('show',f'{c}^:{f}')); b=bloco(git('show',f'{c}:{f}'))
        if a is None or b is None: continue
        mud={k for k in set(a)|set(b) if a.get(k)!=b.get(k)} - {'status','notas_status'}
        rel={'dependencia':{'dependencias'},'allowlist':{'pathspec_allowlist'},'criterio':{'criterios_aceite'}}[x['tipo']]
        if not (mud & rel): continue
        meta=os.path.join(R,'docs/fila/runs',tid,'meta.json')
        m=[]
        try:
            m=json.load(open(meta)); m=m if isinstance(m,list) else [m]
        except Exception: pass
        t0=dt.datetime.fromisoformat(ts.strip().replace('Z','+00:00')) if ts else None
        antes=[e for e in m if t0 and dt.datetime.fromisoformat(e['ts'].replace('Z','+00:00'))<=t0]
        reprov=[e for e in antes if e.get('resultado') in ('reprovado','bloqueado')]
        dirs=os.listdir(os.path.join(R,'docs/fila/runs',tid)) if os.path.isdir(os.path.join(R,'docs/fila/runs',tid)) else []
        info=dict(tipo=x['tipo'],data=x['data'],commit=c[:9],id=tid,status_antes=a.get('status'),
          deps_antes=a.get('dependencias'),deps_depois=b.get('dependencias'),
          al_add=sorted(set(b.get('pathspec_allowlist') or [])-set(a.get('pathspec_allowlist') or [])),
          ultima_antes=(antes[-1]['resultado'] if antes else None),n_antes=len(antes),n_reprov=len(reprov),dirs=len(dirs),
          resolv=x['resolvedor_teria_agido'],mud=sorted(mud))
        out.append(info)
json.dump(out,open(sys.argv[1],'w'),indent=1,default=str)
import collections
for t in ('dependencia','allowlist','criterio'):
    L=[o for o in out if o['tipo']==t]
    print(t,'ticket-edicoes',len(L),'com tentativa antes',sum(1 for o in L if o['n_antes']),'com reprova antes',sum(1 for o in L if o['n_reprov']),'com dirs',sum(1 for o in L if o['n_reprov'] and o['dirs']))
