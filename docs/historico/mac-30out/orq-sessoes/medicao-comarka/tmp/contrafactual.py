import csv, json
from datetime import date, timedelta
def seq(ruins, ini, fim):
    best=cur=0; d=ini
    while d<=fim:
        cur = 0 if d in ruins else cur+1; best=max(best,cur); d+=timedelta(days=1)
    return best, cur
for w in ("14d","30d"):
    r=json.load(open("out/%s/resumo.json"%w)); ini=date.fromisoformat(r["janela"]["de"]); fim=date.fromisoformat(r["janela"]["ate"])
    rv={x["commit"]:x["resolvedor_teria_agido"] for x in csv.DictReader(open("out/%s/intervencoes.csv"%w))}
    mot=r["C1"]["motivos_por_dia"]
    def dias(excl):
        out=set()
        for d,ms in mot.items():
            keep=[m for m in ms if not excl(m.split(":",1)[0], rv.get((m.split(":",1)+[""])[1][:9],""))]
            if keep: out.add(date.fromisoformat(d))
        return out
    cen={"real":lambda t,v:False,
         "R1+R5 auto":lambda t,v:v in("sim R1","sim R5"),
         "R1+R5+R2 auto":lambda t,v:v in("sim R1","sim R5","so proposta R2"),
         "sem writeback":lambda t,v:t=="writeback",
         "sem gate_streak(+pausa)":lambda t,v:t in("gate_streak","pausa_gate_streak"),
         "sem motor/config":lambda t,v:t in("motor","config"),
         "R1+R5+R2 auto + writeback + gate_streak + motor":lambda t,v:v in("sim R1","sim R5","so proposta R2") or t in("writeback","gate_streak","pausa_gate_streak","motor","config"),
         "so ficam pausa_manual":lambda t,v:t!="pausa_manual"}
    for k,f in cen.items():
        ds=dias(f); print(w,"%-50s dias_com_interv=%2d maior_seq=%d atual=%d"%(k,len(ds),*seq(ds,ini,fim)))
    print(r["intervencoes"]["resolvedor_teria_agido"], r["esforco"], r["C2"])
