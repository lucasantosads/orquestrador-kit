import os,json,datetime as dt,collections,re,subprocess
R='/Users/lucasantos/Projetos/comarka-operacional'; S=os.path.dirname(__file__)
g=json.load(open(S+'/gab2.json'))
def p(s): return dt.datetime.fromisoformat(s.replace('Z','+00:00')).timestamp()
log=open(R+'/docs/fila/runs/local-loop.log',errors='ignore').read().split('\n')
c=collections.Counter()
for o in g:
    if not o.get('meio') : continue
    m=json.load(open(f"{R}/docs/fila/runs/{o['id']}/meta.json")); m=m if isinstance(m,list) else [m]
    t0=dt.datetime.strptime(o['data'],'%Y-%m-%d %H:%M').replace(tzinfo=dt.timezone(dt.timedelta(hours=-3))).timestamp()+60
    antes=[e for e in m if p(e['ts'])<=t0]; depois=[e for e in m if p(e['ts'])>t0]
    u=antes[-1]; n=depois[0] if depois else None
    # how did last series end? find last 'ticket ID:' outcome line before t0 roughly -> use resultado sequence
    seq=[e['resultado'] for e in antes][-4:]
    gap=(t0-p(u['ts']))/3600
    k=(o['tipo'], u['resultado'], 'prox_attempt=%s'%(n['attempt'] if n else '-'))
    c[k]+=1
    print(o['tipo'],o['id'],o['commit'],'ult',u['attempt'],u['resultado'],'seq',seq,'gap_h %.1f'%gap,'prox',(n['attempt'],n['resultado']) if n else None)
print(c)
