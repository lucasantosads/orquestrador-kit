import json,re,collections,datetime as dt,sys
L=[json.loads(l) for l in open('/Users/lucasantos/.orq/resolvedor/ledger.jsonl') if l.strip()]
P=[e for e in L if e.get('tipo')=='pausa']
log=open('/Users/lucasantos/Projetos/comarka-operacional/docs/fila/runs/local-loop.log',errors='replace').read().split('\n')
# map: pause text -> list of datetimes (UTC) seen in loop log
seen=collections.defaultdict(list)
last=None
for i,l in enumerate(log):
    m=re.match(r'\[(\d{4}-\d\d-\d\d \d\d:\d\d:\d\d)-0300\]',l)
    if m: last=dt.datetime.strptime(m.group(1),'%Y-%m-%d %H:%M:%S')+dt.timedelta(hours=3)
    m2=re.search(r'PAUSA ativa \((.*)\) — ',l)
    if m2 and last: seen[m2.group(1).strip()].append(last)
def dono(m):
    x=re.search(r'dono: ([^|]+?)\s*(\||$)',m); return x.group(1).strip() if x else None
rows=[]
for k,e in enumerate(P):
    ts=dt.datetime.strptime(e['ts'],'%Y-%m-%dT%H:%M:%SZ')
    # raw first line from ledger motivo lacks stamp; search log keys containing motivo
    cands=[t for key,v in seen.items() if key.endswith(e['motivo'].strip()) or e['motivo'].strip() in key for t in v]
    cands=[t for t in cands if abs((t-ts).total_seconds())<6*3600]
    prox=None
    for f in P[k+1:]:
        if f['repo']==e['repo']: prox=dt.datetime.strptime(f['ts'],'%Y-%m-%dT%H:%M:%SZ'); break
    ult=max([ts]+[t for t in cands if t>=ts]) if cands else ts
    dur_min=(ult-ts).total_seconds()/60
    rows.append((e['ts'],e['repo'][:8],dono(e['motivo']) or '-',round(dur_min),round((prox-ts).total_seconds()/60) if prox else None,e['motivo'][:60]))
for r in rows: print(*r,sep='\t')
print()
g=collections.defaultdict(list)
for r in rows: g[r[2] if r[2]!='-' else ('ritual-staging' if r[5].startswith('ritual') else 'sem dono')].append(r)
import statistics
for k,v in sorted(g.items(),key=lambda x:-len(x[1])):
    ds=[r[3] for r in v]; ps=[r[4] for r in v if r[4] is not None]
    print(k,len(v),'visto_no_loop_min mediana',statistics.median(ds),'max',max(ds),'| ate a proxima pausa: mediana',statistics.median(ps) if ps else None,'max',max(ps) if ps else None, '>30min ate a proxima:',sum(1 for p in ps if p>30))
