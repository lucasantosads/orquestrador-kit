import os,re,json,subprocess,glob,time
R='/Users/lucasantos/Projetos/comarka-operacional'; env=dict(os.environ,GIT_OPTIONAL_LOCKS='0')
def git(*a):
    p=subprocess.run(['git','-C',R,*a],capture_output=True,text=True,env=env); return p.stdout if p.returncode==0 else None
def bloco(md):
    m=re.search(r'```json\s*\n(.*?)\n```',md or '',re.S)
    try: return json.loads(m.group(1)) if m else None
    except Exception: return None
def tk(c,i):
    arv=git('ls-tree','--name-only',c,'docs/fila/') or ''
    f=[x for x in arv.split('\n') if x.startswith(f'docs/fila/{i}-')]
    return bloco(git('show',f'{c}:{f[0]}')) if f else None
for c,tid,dep in [("ded72e169","306b","500"),("ec421bcbe","522","522c"),("917d35bca","826","866")]:
    a=tk(c+'^',tid); d=tk(c+'^',dep)
    print('==',tid,'+',dep, 'overlap AL:',sorted(set(a['pathspec_allowlist'])&set(d['pathspec_allowlist'])))
    print('  nota:',(a.get('notas_status') or '')[:300])
    print('  msg:',git('show','-s','--format=%B',c)[:400].replace('\n',' / '))
    for dd in sorted(glob.glob(f'{R}/docs/fila/runs/{tid}/attempt-*')):
        print('  ',os.path.basename(dd),time.strftime('%m-%d %H:%M',time.gmtime(max(os.stat(x).st_mtime for x in glob.glob(dd+'/*') or [dd]))),sorted(os.listdir(dd)))
