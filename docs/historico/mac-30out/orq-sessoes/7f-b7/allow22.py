import csv,re,subprocess,os,datetime as dt
os.environ['GIT_OPTIONAL_LOCKS']='0'
C='/Users/lucasantos/Projetos/comarka-operacional'
R=[r for r in csv.DictReader(open('/Users/lucasantos/orq-sessoes/medicao-comarka/out/14d/intervencoes.csv')) if r['classe'] in('intervencao','intervencao_embutida') and r['tipo']=='allowlist']
log=open(C+'/docs/fila/runs/local-loop.log',errors='replace').read().split('\n')
ev=[]  # (dt_local, line)
cur=None
for l in log:
    m=re.match(r'\[(\d{4}-\d\d-\d\d \d\d:\d\d:\d\d)-0300\] (.*)',l)
    if m: cur=dt.datetime.strptime(m.group(1),'%Y-%m-%d %H:%M:%S'); ev.append((cur,m.group(2))); continue
    m=re.match(r'\[orq (\d\d):(\d\d):(\d\d)\] (.*)',l)
    if m and cur:
        u=cur+dt.timedelta(hours=3)
        t=u.replace(hour=int(m.group(1)),minute=int(m.group(2)),second=int(m.group(3)))
        if t<u-dt.timedelta(hours=12): t+=dt.timedelta(days=1)
        ev.append((t-dt.timedelta(hours=3),m.group(4)))
def git(*a): return subprocess.run(['git','-C',C,*a],capture_output=True,text=True).stdout
for r in R:
    sha=r['commit']
    when=dt.datetime.strptime(git('show','-s','--format=%ad','--date=format:%Y-%m-%d %H:%M:%S',sha).strip(),'%Y-%m-%d %H:%M:%S')
    for t in r['ticket'].split(';'):
        pat=re.compile(r"^ticket %s: "%re.escape(t))
        last=[x for x in ev if x[0]<=when and pat.search(x[1]) ]
        lx=last[-1] if last else None
        f=[l for l in git('ls-tree','--name-only',sha+'^','docs/fila/').split('\n') if l.startswith('docs/fila/%s-'%t)]
        st=''
        if f:
            txt=git('show',sha+'^:'+f[0]); m=re.search(r'"status":\s*"([^"]+)"',txt); n=re.search(r'"notas_status":\s*"([^"]{0,70})',txt)
            st=(m.group(1) if m else '?')+' | '+(n.group(1) if n else '')
        print(r['data'],sha[:9],t,'teria='+r['resolvedor_teria_agido'],'| commit^:',st,'| loop:',(str(lx[0])+' '+lx[1][:110]) if lx else '-',sep=' ')
