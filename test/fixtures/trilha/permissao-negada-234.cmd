cd /Users/lucasantos/Projetos/_worktrees/ci-234
F=supabase/migrations/0029_sugestoes_persona.sql
awk -F"'" '/values\(slug/,0' /dev/null 2>/dev/null
python3 - <<'PY'
import re
text = open('supabase/migrations/0029_sugestoes_persona.sql', encoding='utf-8').read()
rows = re.findall(r"\('(\w+)', '(dor|palavra_chave)', '([^']+)'\)", text)
print("total rows:", len(rows))
from collections import Counter
c = Counter(r[0] for r in rows)
print(c)
tipos = Counter((r[0], r[1]) for r in rows)
bad = [k for k,v in tipos.items() if v != 5]
print("mismatched counts:", bad)
textos = [r[2] for r in rows]
dupes = [t for t,n in Counter(textos).items() if n > 1]
print("dupe texts:", dupes)
banned = ['garant', 'sucesso', 'resultado', 'indeniza', 'r$', 'ganho de causa', 'capta']
for t in textos:
    for b in banned:
        if b in t.lower():
            print("BANNED:", b, t)
PY
