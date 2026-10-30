import re,subprocess,os,sys,json
R=os.path.expanduser('~/Projetos/comarka-operacional')
names="""20260525_meta_insights_campaigns 20260525_cs_module_tables 20260601_create_perf_teses 20260601_perf_nichos 20260620_tkt-dossie_ac_backfill_e_sync 20260620_tkt-dossie_b_ponte_lead 20260620_tkt-dossie_t1_revinculo 20260620_tkt-dossie_t2_dossie_colunas 20260623_tkt-rbac_v2_ops_permissao_fundacao 20260626_ops_esta_na_subarvore 20260628_perf_reuniao 20260628_perf_health_snapshot 20260715000000_meta_ad_accounts_cliente_id 20260716000002_ops_acoes_recomendadas 20260818000001_vw_onboarding_atraso_ancora 20260819000000_employees_drop_senha_legado 20260903120000_revoke_anon_views_publicas 20260916_perf_crm_cliente 20260921120000_espelho_config_funil_campanha 20260929000002_employees_nivel_acesso""".split()
tsv=[l.split('\t') for l in open(os.path.expanduser('~/orq-sessoes/recon-migrations/arquivos-migrations.tsv'))][1:]
paths={}
for r in tsv:
    b=os.path.basename(r[0])[:-4]
    if b in names or b.startswith('20260922100'): paths[b]=(r[0],r[6].split(',')[0])
out={}
rx=[(r'create\s+(?:or\s+replace\s+)?(?:materialized\s+)?view\s+(?:if\s+not\s+exists\s+)?([\w."]+)','view'),
    (r'create\s+table\s+(?:if\s+not\s+exists\s+)?([\w."]+)','table'),
    (r'create\s+(?:or\s+replace\s+)?function\s+([\w."]+)','function'),
    (r'create\s+(?:unique\s+)?index\s+(?:concurrently\s+)?(?:if\s+not\s+exists\s+)?([\w."]+)','index'),
    (r'create\s+policy\s+"?([\w ]+?)"?\s+on','policy'),
    (r'create\s+(?:or\s+replace\s+)?trigger\s+([\w."]+)','trigger'),
    (r'alter\s+table\s+(?:if\s+exists\s+)?(?:only\s+)?([\w."]+)\s+add\s+column\s+(?:if\s+not\s+exists\s+)?(\w+)','column'),
    (r'alter\s+table\s+(?:if\s+exists\s+)?([\w."]+)\s+drop\s+column\s+(?:if\s+exists\s+)?(\w+)','dropcol'),
    (r'drop\s+(table|view|function|index|column)\s+(?:if\s+exists\s+)?([\w."]+)','drop'),
    (r'revoke\s+.*?\s+on\s+(?:table\s+)?([\w."]+)\s+from','revoke')]
for b,(p,br) in sorted(paths.items()):
    sql=subprocess.run(['git','-C',R,'show',f'{br}:{p}'],capture_output=True,text=True).stdout
    s=re.sub(r'--[^\n]*','',sql); s=re.sub(r'/\*.*?\*/','',s,flags=re.S)
    objs=[]
    for pat,k in rx:
        for m in re.finditer(pat,s,re.I|re.S):
            objs.append((k,)+tuple(g.replace('"','') for g in m.groups()))
    seen=[];[seen.append(o) for o in objs if o not in seen]
    out[b]={'path':p,'branch':br,'linhas':sql.count('\n'),'objs':seen[:25],'head':' '.join(sql.split('\n')[:3])[:200]}
json.dump(out,open(os.path.expanduser('~/orq-sessoes/recon-migrations/objetos.json'),'w'),ensure_ascii=False,indent=1)
print(len(out))
for b,v in out.items(): print(b, v['linhas'], v['objs'][:8])
