import subprocess,re,json,os,sys
os.environ['GIT_OPTIONAL_LOCKS']='0'
C='/Users/lucasantos/Projetos/comarka-operacional'
g=lambda *a: subprocess.run(['git','-C',C,*a],capture_output=True,text=True).stdout
def al(ref,f):
    t=g('show',f'{ref}:{f}'); m=re.search(r'```json\n(.*?)\n```',t,re.S)
    return json.loads(m.group(1)).get('pathspec_allowlist',[]) if m else None
for sha,t in [('c00ee4b15','924a'),('b7a3eea2f','1054'),('b7a3eea2f','1055b'),('832436272','1058'),('b7a3eea2f','1053'),('b7a3eea2f','1053b'),('af768b088','966'),('638e00305','855'),('ab4e95cb4','854'),('cf2fe3a97','1059'),('75db690c0','1195'),('b7a3eea2f','924c')]:
    f=[x for x in g('ls-tree','--name-only',sha,'docs/fila/').split('\n') if x.startswith(f'docs/fila/{t}-')][0]
    a,b=al(sha+'^',f),al(sha,f)
    print(t,sha,'+',sorted(set(b)-set(a)),'-',sorted(set(a)-set(b)))
