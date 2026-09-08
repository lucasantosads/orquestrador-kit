/**
 * Peça 1 — o gate de ticket (`scripts/orquestrador/gate-ticket.ts` + `orq validar`).
 *
 * Um caso BOM e um caso MAU por check, sobre fixtures em diretório temporário.
 * NUNCA sobre `docs/fila` real: o gate lê a fila inteira para os checks 7 e 8, e
 * um teste apontado para a fila de produção passaria a depender do estado dela —
 * verde hoje, vermelho amanhã, por trabalho de outra sessão.
 *
 * O que o gate NÃO faz, por decisão registrada (vira peça 1b): rodar `alvo`
 * contra HEAD, rodar `guarda` contra HEAD, executar `recon[]`.
 */
import { describe, it, expect } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import {
  CAMPOS_PENDENTE,
  STATUS_TERMINAIS,
  STATUS_VALIDOS,
  TIPOS_CRITERIO,
  blocoJson,
  carregarCfg,
  checarCmd,
  lerFila,
  mascararAspas,
  segmentarCmd,
  validarTicket,
} from '../scripts/orquestrador/gate-ticket.js';

const REPO_ROOT = join(import.meta.dirname, '..');
const GATE = join(REPO_ROOT, 'scripts', 'orquestrador', 'gate-ticket.ts');
const CFG_REAL = readFileSync(join(REPO_ROOT, 'docs', 'fila', '000-config.json'), 'utf8');

interface Ticket {
  id: string;
  slug?: string;
  [k: string]: unknown;
}

/**
 * Fila de fixture: `000-config.json` REAL (o gate lê `gate_ticket` dele; cópia
 * congelada faria o teste passar contra um config que não existe mais) + os
 * tickets pedidos, cada um no formato do repo: prosa + bloco ```json.
 */
function criarFila(tickets: Ticket[]): string {
  const dir = mkdtempSync(join(tmpdir(), 'orq-gate-'));
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, '000-config.json'), CFG_REAL);
  for (const t of tickets) escreverTicket(dir, t);
  return dir;
}

/** Ticket pendente COMPLETO: o caso bom de referência de todos os checks. */
function pendenteBom(over: Partial<Ticket> & { id: string }): Ticket {
  return {
    bloco: 'B2',
    frente: 'B2-F9',
    objetivo: 'faz a coisa certa no arquivo certo',
    pathspec_allowlist: ['src/a.ts'],
    dependencias: [],
    criterios_aceite: [{ tipo: 'alvo', descricao: 'existe', cmd: 'test -f src/a.ts && echo ok', espera: 'ok' }],
    status: 'pendente',
    risco: '',
    ...over,
  };
}

function escreverTicket(dir: string, t: Ticket, nomeArquivo?: string): string {
  const slug = String(t.slug ?? `fixture-${t.id}`);
  const caminho = join(dir, nomeArquivo ?? `${t.id}-${slug}.md`);
  writeFileSync(caminho, `# ${t.id}\n\nprosa.\n\n\`\`\`json\n${JSON.stringify({ slug, ...t }, null, 2)}\n\`\`\`\n`);
  return caminho;
}

/** Roda o gate em processo e devolve só as violações (isenções à parte). */
function violacoes(dir: string, id: string): string[] {
  const fila = lerFila(dir);
  const cfg = carregarCfg(dir);
  const alvo = fila.find((f) => f.arquivo.includes(`/${id}-`))!;
  return validarTicket(alvo, fila, cfg)
    .filter((v) => !v.isencao)
    .map((v) => `${v.campo} ${v.mensagem}`);
}

function isencoes(dir: string, id: string): string[] {
  const fila = lerFila(dir);
  const cfg = carregarCfg(dir);
  const alvo = fila.find((f) => f.arquivo.includes(`/${id}-`))!;
  return validarTicket(alvo, fila, cfg)
    .filter((v) => v.isencao)
    .map((v) => v.mensagem);
}

/** Roda a CLI de verdade — é o contrato que `orq validar` repassa. */
function cli(dir: string, ...args: string[]) {
  const r = spawnSync('npx', ['tsx', GATE, '--fila', dir, ...args], {
    encoding: 'utf8',
    cwd: REPO_ROOT,
  });
  return { rc: r.status ?? 1, out: r.stdout ?? '', err: r.stderr ?? '' };
}

// ─── Check 1 · bloco ```json parseável ────────────────────────────────────

describe('check 1 · bloco ```json parseável', () => {
  it('BOM: bloco válido é lido como objeto', () => {
    const r = blocoJson('# t\n\n```json\n{"id":"901"}\n```\n');
    expect(r.ok).toBe(true);
    expect(r.ok && r.json.id).toBe('901');
  });

  it('MAU: arquivo sem bloco ```json', () => {
    const dir = criarFila([]);
    writeFileSync(join(dir, '901-sem-bloco.md'), '# 901\n\nsó prosa, nenhum JSON.\n');
    expect(violacoes(dir, '901')).toEqual(['json nenhum bloco ```json no arquivo']);
  });

  it('MAU: bloco presente mas com JSON quebrado — e o gate PARA aí', () => {
    const dir = criarFila([]);
    writeFileSync(join(dir, '902-quebrado.md'), '# 902\n\n```json\n{"id":"902",\n```\n');
    const v = violacoes(dir, '902');
    expect(v).toHaveLength(1); // fail-fast: sem JSON não há campo para checar
    expect(v[0]).toMatch(/^json bloco ```json não parseia/);
  });
});

// ─── Check 2 · campos obrigatórios do pendente ────────────────────────────

describe('check 2 · campos obrigatórios (só para pendente)', () => {
  it('BOM: pendente completo não acusa campo nenhum', () => {
    const dir = criarFila([pendenteBom({ id: '901' })]);
    expect(violacoes(dir, '901')).toEqual([]);
  });

  it('MAU: pendente sem objetivo e com allowlist vazia acusa os dois', () => {
    const dir = criarFila([pendenteBom({ id: '901', objetivo: '', pathspec_allowlist: [] })]);
    const v = violacoes(dir, '901');
    expect(v).toContain('objetivo campo obrigatório de ticket pendente ausente ou vazio');
    expect(v).toContain('pathspec_allowlist campo obrigatório de ticket pendente ausente ou vazio');
  });

  it('BOM: terminal sem campo nenhum passa — para done/obsoleto/bloqueado, basta parsear', () => {
    expect([...STATUS_TERMINAIS]).toEqual(['done', 'obsoleto', 'bloqueado']);
    for (const st of STATUS_TERMINAIS) {
      const dir = criarFila([{ id: '901', slug: 'ja-foi', status: st }]);
      expect(violacoes(dir, '901'), st).toEqual([]);
    }
  });

  it('`risco` basta EXISTIR: vazio passa (quem preenche é o passo 6), lixo não', () => {
    const vazio = criarFila([pendenteBom({ id: '901', risco: '' })]);
    expect(violacoes(vazio, '901')).toEqual([]);
    const ausente = criarFila([pendenteBom({ id: '902', risco: undefined })]);
    expect(violacoes(ausente, '902')).toContain('risco campo obrigatório de ticket pendente ausente');
    const lixo = criarFila([pendenteBom({ id: '903', risco: 'medio' })]);
    expect(violacoes(lixo, '903')[0]).toMatch(/^risco 'medio' não é classe de risco/);
  });

  it('a lista de campos obrigatórios é a do contrato, item a item', () => {
    expect([...CAMPOS_PENDENTE]).toEqual([
      'id',
      'slug',
      'bloco',
      'objetivo',
      'pathspec_allowlist',
      'dependencias',
      'criterios_aceite',
      'status',
      'risco',
    ]);
  });
});

// ─── Check 3 · id no formato e igual ao prefixo do arquivo ────────────────

describe('check 3 · id NNN[a], igual ao prefixo do nome do arquivo', () => {
  it('BOM: 901 em 901-slug.md; e o sufixo de letra é legítimo', () => {
    const dir = criarFila([
      pendenteBom({ id: '901', pathspec_allowlist: ['src/a.ts'] }),
      pendenteBom({ id: '901a', pathspec_allowlist: ['src/b.ts'] }),
    ]);
    expect(violacoes(dir, '901')).toEqual([]);
    expect(violacoes(dir, '901a')).toEqual([]);
  });

  it('MAU: id fora do formato', () => {
    const dir = criarFila([]);
    escreverTicket(dir, pendenteBom({ id: '9z1' }), '9z1-torto.md');
    const fila = lerFila(dir);
    const cfg = carregarCfg(dir);
    // O arquivo nem entra na varredura (o nome não casa NNN[a]-), então o gate é
    // chamado direto sobre ele: é assim que `orq validar <arquivo>` o alcança.
    const md = readFileSync(join(dir, '9z1-torto.md'), 'utf8');
    const r = blocoJson(md);
    const v = validarTicket({ arquivo: join(dir, '9z1-torto.md'), json: r.ok ? r.json : null }, fila, cfg);
    expect(v.map((x) => x.mensagem)).toContain("'9z1' fora do formato NNN[a] (três dígitos, letra opcional)");
  });

  it('MAU: id que não bate com o prefixo do arquivo', () => {
    const dir = criarFila([]);
    escreverTicket(dir, pendenteBom({ id: '901' }), '902-nome-errado.md');
    expect(violacoes(dir, '902')).toContain(
      "id '901' não bate com o prefixo do nome do arquivo ('902')",
    );
  });
});

// ─── Check 4 · status dentro do vocabulário ───────────────────────────────

describe('check 4 · status dentro do vocabulário da fila', () => {
  it('BOM: os seis status do contrato passam', () => {
    expect([...STATUS_VALIDOS]).toEqual([
      'pendente',
      'em_execucao',
      'done',
      'bloqueado',
      'obsoleto',
      'refatiar',
    ]);
    const dir = criarFila(STATUS_VALIDOS.map((s, i) => pendenteBom({ id: `90${i}`, status: s })));
    for (let i = 0; i < STATUS_VALIDOS.length; i++) expect(violacoes(dir, `90${i}`)).toEqual([]);
  });

  it('MAU: status inventado', () => {
    const dir = criarFila([pendenteBom({ id: '901', status: 'arquivado' })]);
    expect(violacoes(dir, '901')[0]).toMatch(/^status 'arquivado' não é status de fila/);
  });
});

// ─── Check 5 · critérios de ticket pendente ───────────────────────────────

describe('check 5 · tipo, cmd e espera de cada critério do pendente', () => {
  it('BOM: os três tipos do contrato passam, com cmd e espera preenchidos', () => {
    expect([...TIPOS_CRITERIO]).toEqual(['alvo', 'guarda', 'avaliador']);
    const dir = criarFila([
      pendenteBom({
        id: '901',
        criterios_aceite: TIPOS_CRITERIO.map((tipo) => ({ tipo, cmd: 'test -f src/a.ts && echo ok', espera: 'ok' })),
      }),
    ]);
    expect(violacoes(dir, '901')).toEqual([]);
  });

  it('MAU: tipo inválido, cmd vazio e espera vazia, cada um com sua linha', () => {
    const dir = criarFila([
      pendenteBom({
        id: '901',
        criterios_aceite: [
          { tipo: 'smoke', cmd: 'test -f src/a.ts && echo ok', espera: 'ok' },
          { tipo: 'alvo', cmd: '   ', espera: 'ok' },
          { tipo: 'alvo', cmd: 'test -f src/a.ts && echo ok', espera: '' },
        ],
      }),
    ]);
    const v = violacoes(dir, '901');
    expect(v).toContain("criterios_aceite[0] tipo 'smoke' inválido (alvo, guarda, avaliador)");
    expect(v).toContain('criterios_aceite[1] cmd vazio');
    expect(v).toContain('criterios_aceite[2] espera vazia');
  });

  it('critério de ticket done NÃO é cobrado: já rodou', () => {
    const dir = criarFila([
      { id: '901', slug: 'ja-foi', status: 'done', criterios_aceite: [{ tipo: 'xpto', cmd: 'rm -rf /', espera: '' }] },
    ]);
    expect(violacoes(dir, '901')).toEqual([]);
  });
});

// ─── Check 6 · padrões proibidos no cmd, com a precedência de 07/09 ───────

describe('check 6 · leitura do cmd: aspas, segmentos, redirecionamento', () => {
  it('aspas mascaradas: `grep -E \'a|b\'` é UM segmento, e o `rm ` citado não é comando', () => {
    expect(segmentarCmd("grep -E 'a|b' arq.ts")).toEqual(["grep -E 'a|b' arq.ts"]);
    // As próprias aspas viram espaço: o comprimento é preservado byte a byte,
    // para que um índice medido no texto visível ainda aponte o texto cru.
    expect(mascararAspas("grep 'rm ' arq.ts")).toBe('grep       arq.ts');
  });

  it('`&&` consome DOIS caracteres: o segmento seguinte não começa com `&`', () => {
    expect(segmentarCmd('test -f a && echo ok')).toEqual(['test -f a', 'echo ok']);
    expect(segmentarCmd('a | b ; c')).toEqual(['a', 'b', 'c']);
  });

  it('`|` dentro de `$(…)` não quebra segmento (mesma lição da peça 0e-b)', () => {
    expect(segmentarCmd("test $(grep -oE '(a|b)' f | wc -l) -ge 2")).toEqual([
      "test $(grep -oE '(a|b)' f | wc -l) -ge 2",
    ]);
  });
});

describe('check 6 · o veto, a isenção e o que a isenção NÃO alcança', () => {
  const cfg = carregarCfg(join(REPO_ROOT, 'docs', 'fila'));

  it('a chave lida é `proibido_no_cmd` (é o nome que está no disco)', () => {
    expect(cfg.proibido_no_cmd).toContain('$(');
    expect(cfg.proibido_no_cmd).toContain('sudo');
    expect(cfg.cmd_prefixos_permitidos).toContain('test $(');
  });

  it('BOM: cmd sem padrão proibido não acusa nada', () => {
    expect(checarCmd('test -f src/a.ts && echo ok', cfg)).toEqual([]);
  });

  it('MAU: `rm`, `sudo`, `eval` e crase reprovam em qualquer segmento', () => {
    for (const cmd of ['rm -rf src', 'test -f a && sudo ls', 'eval "ls"', 'echo `ls`']) {
      expect(checarCmd(cmd, cfg).filter((a) => !a.isencao).length).toBeGreaterThan(0);
    }
  });

  it('regra (a): `$(` no PRIMEIRO segmento sob prefixo permitido vira ISENÇÃO, com o prefixo', () => {
    const r = checarCmd("test $(grep -c 'it(' f.ts) -ge 8 && echo ok", cfg);
    expect(r.filter((a) => !a.isencao)).toEqual([]);
    expect(r.filter((a) => a.isencao)).toHaveLength(1);
    expect(r[0]!.mensagem).toContain("prefixo permitido 'test $('");
  });

  it('regra (a): o MESMO `$(` no segundo segmento REPROVA — o veto volta a valer', () => {
    const r = checarCmd("test -f f.ts && test $(grep -c 'it(' f.ts) -ge 8 && echo ok", cfg);
    const erros = r.filter((a) => !a.isencao);
    expect(erros).toHaveLength(1);
    expect(erros[0]!.mensagem).toMatch(/padrão proibido '\$\(' em segmento 2/);
  });

  it('regra (b): `2>&1`, `>/dev/null` e `2>/dev/null` passam', () => {
    expect(checarCmd('npx vitest run t.ts 2>&1 | grep -c passed', cfg).filter((a) => !a.isencao)).toEqual([]);
    expect(checarCmd('npm run build >/dev/null 2>&1', cfg).filter((a) => !a.isencao)).toEqual([]);
    expect(checarCmd('npm run lint 2>/dev/null', cfg).filter((a) => !a.isencao)).toEqual([]);
  });

  it('regra (b): `>` e `>>` para arquivo real reprovam SEMPRE, inclusive sob prefixo permitido', () => {
    const escreve = checarCmd('npm run build > saida.txt', cfg).filter((a) => !a.isencao);
    expect(escreve).toHaveLength(1);
    expect(escreve[0]!.mensagem).toMatch(/redirecionamento '>saida.txt' escreve arquivo/);
    const anexa = checarCmd("test $(grep -c 'x' f) -ge 1 >> log.txt", cfg).filter((a) => !a.isencao);
    expect(anexa.length).toBeGreaterThan(0);
  });

  it('regra (c): `sh -c` e `curl https` não são isentos nem com prefixo permitido antes', () => {
    expect(checarCmd("test -f a && sh -c 'ls'", cfg).filter((a) => !a.isencao).length).toBeGreaterThan(0);
    expect(checarCmd('curl https://exemplo.com', cfg).filter((a) => !a.isencao).length).toBeGreaterThan(0);
  });

  it('`rm ` não casa `form `: token de palavra, nunca substring', () => {
    expect(checarCmd("grep -c 'form ' src/a.ts", cfg).filter((a) => !a.isencao)).toEqual([]);
  });

  it('regra (d): a isenção chega ao ticket, nomeando o critério e o prefixo', () => {
    const dir = criarFila([
      pendenteBom({
        id: '901',
        criterios_aceite: [{ tipo: 'alvo', cmd: "test $(grep -c 'it(' f.ts) -ge 8 && echo ok", espera: 'ok' }],
      }),
    ]);
    expect(violacoes(dir, '901')).toEqual([]);
    const i = isencoes(dir, '901');
    expect(i).toHaveLength(1);
    expect(i[0]).toContain("prefixo permitido 'test $('");
  });
});

// ─── Check 7 · dependências ───────────────────────────────────────────────

describe('check 7 · dependência por id existente ou humano:<token>', () => {
  it('BOM: id que existe na fila e token humano', () => {
    const dir = criarFila([
      pendenteBom({ id: '900', status: 'done' }),
      pendenteBom({ id: '901', dependencias: ['900', 'humano:migration-0030'] }),
    ]);
    expect(violacoes(dir, '901')).toEqual([]);
  });

  it('MAU: id inexistente e `humano:` sem token', () => {
    const dir = criarFila([pendenteBom({ id: '901', dependencias: ['888', 'humano:'] })]);
    const v = violacoes(dir, '901');
    expect(v).toContain("dependencias[0] '888' não é id de ticket da fila nem 'humano:<token>'");
    expect(v).toContain("dependencias[1] 'humano:' sem token");
  });
});

// ─── Check 8 · allowlists sobrepostas entre pendentes ─────────────────────

describe('check 8 · sobreposição de allowlist entre dois pendentes', () => {
  it('BOM: allowlists disjuntas', () => {
    const dir = criarFila([
      pendenteBom({ id: '901', pathspec_allowlist: ['src/a.ts'] }),
      pendenteBom({ id: '902', pathspec_allowlist: ['src/b.ts'] }),
    ]);
    expect(violacoes(dir, '901')).toEqual([]);
    expect(violacoes(dir, '902')).toEqual([]);
  });

  it('BOM: sobrepostas COM dependência declarada — em qualquer das duas direções', () => {
    const dir = criarFila([
      pendenteBom({ id: '901', pathspec_allowlist: ['src/a.ts'] }),
      pendenteBom({ id: '902', pathspec_allowlist: ['src/a.ts'], dependencias: ['901'] }),
    ]);
    expect(violacoes(dir, '901')).toEqual([]);
    expect(violacoes(dir, '902')).toEqual([]);
  });

  it('MAU: sobrepostas SEM dependência — linha nos DOIS, nomeando o path comum', () => {
    const dir = criarFila([
      pendenteBom({ id: '901', pathspec_allowlist: ['src/a.ts', 'src/x.ts'] }),
      pendenteBom({ id: '902', pathspec_allowlist: ['src/a.ts'] }),
    ]);
    expect(violacoes(dir, '901')).toEqual([
      'pathspec_allowlist sobrepõe o 902 sem dependência declarada entre os dois: src/a.ts',
    ]);
    expect(violacoes(dir, '902')).toEqual([
      'pathspec_allowlist sobrepõe o 901 sem dependência declarada entre os dois: src/a.ts',
    ]);
  });

  it('ticket done que sobrepõe pendente NÃO é conflito: já entregou', () => {
    const dir = criarFila([
      pendenteBom({ id: '900', status: 'done', pathspec_allowlist: ['src/a.ts'] }),
      pendenteBom({ id: '901', pathspec_allowlist: ['src/a.ts'] }),
    ]);
    expect(violacoes(dir, '901')).toEqual([]);
  });
});

// ─── A CLI: rc, --pendentes, --relatorio ──────────────────────────────────

describe('a CLI é o contrato que `orq validar` repassa', () => {
  it('sem violação: rc 0 e nenhuma linha', () => {
    const dir = criarFila([pendenteBom({ id: '901' })]);
    const r = cli(dir, '--pendentes');
    expect(r.rc).toBe(0);
    expect(r.out.trim()).toBe('');
  });

  it('com violação: rc 1 e uma linha `<arquivo>:<campo> <mensagem>`', () => {
    const dir = criarFila([pendenteBom({ id: '901', objetivo: '' })]);
    const r = cli(dir, '--pendentes');
    expect(r.rc).toBe(1);
    expect(r.out).toContain('901-fixture-901.md:objetivo campo obrigatório');
  });

  it('--relatorio: imprime tudo, conta as isenções à parte e sai 0 mesmo com violação', () => {
    const dir = criarFila([pendenteBom({ id: '901', objetivo: '' })]);
    const r = cli(dir, '--pendentes', '--relatorio');
    expect(r.rc).toBe(0);
    expect(r.out).toMatch(/GATE DE TICKET · 1 ticket\(s\)/);
    expect(r.out).toMatch(/TOTAL: 1 violação\(ões\), 0 isenção\(ões\), em 1 ticket\(s\)/);
  });

  it('--pendentes pega SÓ os pendentes', () => {
    const dir = criarFila([
      pendenteBom({ id: '900', status: 'done' }),
      pendenteBom({ id: '901' }),
      pendenteBom({ id: '902', status: 'refatiar' }),
    ]);
    expect(cli(dir, '--pendentes', '--relatorio').out).toMatch(/GATE DE TICKET · 1 ticket\(s\)/);
  });

  it('por id e por caminho: os dois alcançam o mesmo ticket', () => {
    const dir = criarFila([pendenteBom({ id: '901', objetivo: '' })]);
    expect(cli(dir, '901').rc).toBe(1);
    expect(cli(dir, join(dir, '901-fixture-901.md')).rc).toBe(1);
  });

  it('id que não é da fila: rc 2, e a mensagem diz qual fila foi olhada', () => {
    const dir = criarFila([pendenteBom({ id: '901' })]);
    const r = cli(dir, '999');
    expect(r.rc).toBe(2);
    expect(r.err).toContain('não é ticket desta fila');
  });
});
