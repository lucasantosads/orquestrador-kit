# `test/fixtures/config/` — o `000-config.json` VIVO do actus-saas

| Arquivo | Origem (só leitura) | Schema | cksum |
|---|---|---|---|
| `actus-000-config.json` | `~/Projetos/actus-saas/docs/fila/000-config.json` | v1 (`$schema_versao: 1`) | `4252049310 7679` |

Cópia **byte a byte** tirada em 2026-09-08, na peça K11a-4d. Nenhuma linha foi
editada, reindentada ou reduzida — o `cmp` contra o original faz parte da coleta,
e o cksum acima é a prova de que a cópia é a cópia.

## O que ele prova, e por quê está aqui

1. **As três regexes da regra F viajaram byte a byte.** A K11a-4b copiou
   `zona_proibida.padroes_proibidos_no_diff` para dentro de
   `test/orquestrador-enforcement-actus.test.ts` como literal TS. Um caso desta
   peça compara os dois caractere a caractere: reescrever uma regex na travessia
   é reescrever a proibição, e "compila igual" não é o mesmo que "é igual".
2. **O `--dry-run` do `instalar.sh` sobre o Actus tem um caso de teste.** A etapa
   6 rodou a migração contra este arquivo e achou o buraco que a K11a-4d fecha:
   o proposto ganhava `migrations.faixa` sem `migrations.dir`, e o `orq config`
   acusava — corretamente — que a regra B não valia para arquivo nenhum. O caso
   roda `propor()` sobre esta cópia e cobra o silêncio.

Por que uma cópia, e não ler o repo vizinho: teste que lê `~/Projetos/actus-saas`
passa nesta máquina e some em qualquer outra — e passaria a MUDAR de veredito
quando alguém editasse o config de lá, que é exatamente o arquivo que a migração
existe para tocar. A mesma decisão de `test/fixtures/liberacoes/` (peça K8b-1).
