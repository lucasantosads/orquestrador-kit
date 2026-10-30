import os,json,glob,datetime as dt,collections
R='/Users/lucasantos/Projetos/comarka-operacional'
S=os.path.dirname(__file__)
g=json.load(open(S+'/gab.json'))
def p(s): return dt.datetime.fromisoformat(s.replace('Z','+00:00')).timestamp()
def mt(d):
    fs=glob.glob(d+'/*'); return max(os.stat(x).st_mtime for x in fs) if fs else 0
res=collections.defaultdict(list)
for o in g:
    if not o['n_reprov']: res[(o['tipo'],'sem_reprova')].append(o); continue
    m=json.load(open(f"{R}/docs/fila/runs/{o['id']}/meta.json")); m=m if isinstance(m,list) else [m]
    # commit ts from data (local -03)
    t0=dt.datetime.strptime(o['data'],'%Y-%m-%d %H:%M').replace(tzinfo=dt.timezone(dt.timedelta(hours=-3))).timestamp()+60
    antes=[e for e in m if p(e['ts'])<=t0]
    u=antes[-1]
    cands=[d for d in glob.glob(f"{R}/docs/fila/runs/{o['id']}/attempt-{u['attempt']}*") if os.path.basename(d).split('.')[0]==f"attempt-{u['attempt']}"]
    ok=[d for d in cands if p(u['ts'])-(u.get('claude_dur_secs') or 0)-1800 <= mt(d) <= p(u['ts'])+180]
    meio = o['status_antes']!='bloqueado'
    o['art']=bool(ok); o['meio']=meio
    res[(o['tipo'],'meio' if meio else 'bloqueado', 'art' if ok else 'sem_art')].append(o)
for k in sorted(res): print(k,len(res[k]),' '.join(sorted({x['id'] for x in res[k]}))[:200])
json.dump(g,open(S+'/gab2.json','w'),indent=1)
