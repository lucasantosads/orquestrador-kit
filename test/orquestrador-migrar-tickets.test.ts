/**
 * Peça K8b-5 — o bloco JSON dos tickets `pendente`.
 *
 * A afirmação central é NEGATIVA: **a prosa não se move um byte**. Um ticket é
 * um documento que um humano escreveu para outro humano, com um bloco de JSON
 * dentro que a máquina lê. Migração que reformata a prosa de dezenas de tickets produz
 * um diff que ninguém revisa — e um diff que ninguém revisa é um diff que
 * aprova o que quiser.
 *
 * Roda contra as filas REAIS dos três repos, copiadas para `mkdtemp`. Eles são
 * SÓ LEITURA nesta sessão — e um caso afirma isso, byte a byte, depois de cada
 * `--aplicar`.
 */
import { describe, it, expect } from 'vitest';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  acharBloco,
  migrarFila,
  migrarTicket,
  RENOMES_TICKET,
  ticketsDe,
} from '../scripts/orquestrador/migrar-tickets.js';

const FILAS: Array<{ nome: string; caminho: string }> = [
  { nome: 'actus-saas', caminho: join(process.env.HOME ?? '', 'Projetos', 'actus-saas', 'docs', 'fila') },
  { nome: 'comarka-operacional', caminho: join(process.env.HOME ?? '', 'Projetos', 'comarka-operacional', 'docs', 'fila') },
  { nome: 'conteudos-infinitos', caminho: join(process.env.HOME ?? '', 'Projetos', 'conteudos-infinitos', 'docs', 'fila') },
];

/** Cópia da fila num tmp. Só os `[0-9]*.md` e o `_TEMPLATE.md`. */
function copiaFila(origem: string): string {
  const dir = mkdtempSync(join(tmpdir(), 'orq-tk-'));
  const fila = join(dir, 'fila');
  mkdirSync(fila);
  for (const n of readdirSync(origem)) {
    if (!/^[0-9].*\.md$/.test(n) && n !== '_TEMPLATE.md') continue;
    try {
      copyFileSync(join(origem, n), join(fila, n));
    } catch {
      /* diretório com nome numérico: ignora */
    }
  }
  return fila;
}

/**
 * Quantos tickets a migração DEVE mexer, contados na própria cópia.
 *
 * Antes isto era uma CONSTANTE, medida no PASSO 0 — e a constante quebrou DENTRO
 * desta sessão: o loop do comarka-operacional está VIVO e drenou a fila às 16:00
 * (três tickets para `done`, um para `em_execucao`), com o que o número de
 * pendentes caiu. Teste que afirma um número sobre a fila viva de OUTRO repo
 * mede o dia, não o código. O que é constante é a REGRA: mexe em todo pendente
 * que tenha um dos nomes antigos, e em mais nenhum.
 */
function esperados(fila: string): number {
  let n = 0;
  for (const f of ticketsDe(fila)) {
    const m = /```json\n([\s\S]*?)\n```/.exec(readFileSync(f, 'utf8'));
    if (!m) continue;
    let j: Record<string, unknown>;
    try {
      j = JSON.parse(m[1]!);
    } catch {
      continue;
    }
    if (j.status !== 'pendente') continue;
    if (RENOMES_TICKET.some((r) => r.de in j && !(r.para in j))) n += 1;
  }
  return n;
}

/** Um ticket sintético, para os casos que a fila real não tem. */
function ticket(json: unknown, prosa = 'Prosa **do humano**, com `crase` e — travessão.\n\nSegundo parágrafo.\n'): string {
  return `# Título do ticket\n\n${prosa}\n\`\`\`json\n${JSON.stringify(json, null, 2)}\n\`\`\`\n\nDepois do bloco: mais prosa, que também não pode se mover.\n`;
}

// ─── a afirmação central ────────────────────────────────────────────────────
describe('a prosa não se move UM BYTE', () => {
  it('tudo fora das linhas do bloco sai idêntico, byte a byte', () => {
    const antes = ticket({ id: '900', status: 'pendente', recon_esperado: [1] });
    const depois = migrarTicket(antes).depois!;
    const linhasA = antes.split('\n');
    const linhasD = depois.split('\n');
    const b = acharBloco(antes)!;
    // Antes do bloco: idêntico.
    expect(linhasD.slice(0, b.inicio)).toEqual(linhasA.slice(0, b.inicio));
    // Depois do bloco: idêntico (o bloco pode mudar de tamanho; aqui não muda).
    expect(linhasD.slice(b.fim)).toEqual(linhasA.slice(b.fim));
  });

  it('caractere não-ASCII, crase e travessão na prosa atravessam intactos', () => {
    const prosa = 'Ação, coração — “aspas curvas”, `código`, 100 % e ✅.\n';
    const antes = ticket({ id: '900', status: 'pendente', recon_esperado: [1] }, prosa);
    const depois = migrarTicket(antes).depois!;
    expect(depois).toContain(prosa);
    expect(Buffer.from(depois.split('```json')[0]!)).toEqual(Buffer.from(antes.split('```json')[0]!));
  });

  for (const { nome, caminho } of FILAS) {
    it(`${nome}: em TODO ticket migrado, só o bloco muda`, () => {
      if (!existsSync(caminho)) return void console.warn(`PULADO: ${caminho}`);
      const fila = copiaFila(caminho);
      let migrados = 0;
      for (const f of ticketsDe(fila)) {
        const antes = readFileSync(f, 'utf8');
        const r = migrarTicket(antes);
        if (!r.depois) continue;
        migrados += 1;
        const b = acharBloco(antes)!;
        const la = antes.split('\n');
        const ld = r.depois.split('\n');
        expect(ld.slice(0, b.inicio), `${f}: prosa ANTES do bloco mudou`).toEqual(la.slice(0, b.inicio));
        expect(ld.slice(b.fim), `${f}: prosa DEPOIS do bloco mudou`).toEqual(la.slice(b.fim));
      }
      console.info(`${nome}: ${migrados} ticket(s) migrados`);
    });

    it(`${nome}: a fila no disco do repo NÃO é tocada`, () => {
      if (!existsSync(caminho)) return void console.warn(`PULADO: ${caminho}`);
      const antes = ticketsDe(caminho).map((f) => readFileSync(f).toString('base64'));
      migrarFila(copiaFila(caminho), 'aplicar');
      const depois = ticketsDe(caminho).map((f) => readFileSync(f).toString('base64'));
      expect(depois).toEqual(antes);
    });
  }
});

// ─── os renomes, e só eles ──────────────────────────────────────────────────
describe('os dois renomes, na posição original da chave', () => {
  for (const r of RENOMES_TICKET) {
    it(`${r.de} → ${r.para}`, () => {
      const antes = ticket({ id: '900', slug: 'x', status: 'pendente', [r.de]: 3, notas_status: 'fim' });
      const o = JSON.parse(/```json\n([\s\S]*?)\n```/.exec(migrarTicket(antes).depois!)![1]!);
      expect(o[r.para]).toBe(3);
      expect(o).not.toHaveProperty(r.de);
      // POSIÇÃO: a chave nova ocupa o lugar da velha, não vai para o fim.
      expect(Object.keys(o)).toEqual(['id', 'slug', 'status', r.para, 'notas_status']);
    });
  }

  it('os dois nomes coexistindo: NÃO renomeia, e diz para decidir', () => {
    const antes = ticket({ id: '900', status: 'pendente', recon_esperado: [1], recon: [2] });
    const r = migrarTicket(antes);
    expect(r.depois).toBeNull();
    expect(r.notas.join('\n')).toMatch(/coexistem: NÃO renomeei/);
  });

  it('a fila real do Comarka: UMA linha muda por ticket, e é sempre a mesma', () => {
    const caminho = FILAS.find((f) => f.nome === 'comarka-operacional')!.caminho;
    if (!existsSync(caminho)) return void console.warn('PULADO');
    const fila = copiaFila(caminho);
    const n = esperados(fila);
    expect(n, 'a fila real deixou de ter pendente com nome antigo — o caso perdeu o objeto').toBeGreaterThan(0);
    const r = migrarFila(fila, 'dry-run');
    expect(r.migrados).toBe(n);
    const adicionadas = r.linhas.join('\n').split('\n').filter((l) => l.startsWith('+') && !l.startsWith('+++'));
    expect(adicionadas).toHaveLength(n);
    expect(new Set(adicionadas)).toEqual(new Set(['+  "recon": [']));
  });
});

// ─── o que ele NÃO faz ──────────────────────────────────────────────────────
describe('não inventa nada', () => {
  it('não inventa `tipo` em critério', () => {
    const antes = ticket({
      id: '900',
      status: 'pendente',
      recon_esperado: [1],
      criterios_aceite: [{ descricao: 'd', cmd: 'npx vitest run', espera: 'OK' }],
    });
    const o = JSON.parse(/```json\n([\s\S]*?)\n```/.exec(migrarTicket(antes).depois!)![1]!);
    expect(o.criterios_aceite[0]).not.toHaveProperty('tipo');
  });

  it('não inventa `risco` nem `bloco`', () => {
    const antes = ticket({ id: '900', status: 'pendente', recon_esperado: [1] });
    const o = JSON.parse(/```json\n([\s\S]*?)\n```/.exec(migrarTicket(antes).depois!)![1]!);
    expect(o).not.toHaveProperty('risco');
    expect(o).not.toHaveProperty('bloco');
  });

  it('não toca `perfil` nem `lane` (são do Comarka; a K11 decide)', () => {
    const antes = ticket({ id: '900', status: 'pendente', lane: 'A', perfil: 'sql-proposta', recon_esperado: [1] });
    const o = JSON.parse(/```json\n([\s\S]*?)\n```/.exec(migrarTicket(antes).depois!)![1]!);
    expect(o.lane).toBe('A');
    expect(o.perfil).toBe('sql-proposta');
  });

  it('não toca `objetivo` — nem o texto, nem a posição', () => {
    const obj = 'Fazer exatamente isto, e nada além.';
    const antes = ticket({ id: '900', objetivo: obj, status: 'pendente', recon_esperado: [1] });
    const o = JSON.parse(/```json\n([\s\S]*?)\n```/.exec(migrarTicket(antes).depois!)![1]!);
    expect(o.objetivo).toBe(obj);
    expect(Object.keys(o)[1]).toBe('objetivo');
  });

  for (const status of ['done', 'bloqueado', 'obsoleto', 'em_execucao', 'refatiar']) {
    it(`status ${status}: pulado, arquivo intacto`, () => {
      const antes = ticket({ id: '900', status, recon_esperado: [1] });
      const r = migrarTicket(antes);
      expect(r.depois).toBeNull();
      expect(r.pulado).toMatch(new RegExp(`status "${status}"`));
    });
  }

  it('ticket pendente SEM nada a renomear não é reescrito (nem para reindentar)', () => {
    const antes = ticket({ id: '900', status: 'pendente', recon: [1] });
    expect(migrarTicket(antes).depois).toBeNull();
  });
});

// ─── casos de borda que a fila real não tem, e por isso importam ────────────
describe('o que ele recusa a adivinhar', () => {
  it('DOIS blocos ```json: pulado, e a mensagem nomeia os três leitores que discordam', () => {
    const antes =
      '# t\n\n```json\n{"id":"900","status":"pendente","recon_esperado":[1]}\n```\n\nprosa\n\n```json\n{"outro":true}\n```\n';
    const r = migrarTicket(antes);
    expect(r.depois).toBeNull();
    expect(r.pulado).toMatch(/gate-ticket\.ts lê o primeiro/);
    expect(r.pulado).toMatch(/lib\.sh concatena todos/);
    expect(r.pulado).toMatch(/CONTRATO §2 diz o último/);
  });

  it('bloco que não parseia: pulado com o motivo, nunca "consertado"', () => {
    const r = migrarTicket('# t\n\n```json\n{ isso não é json\n```\n');
    expect(r.depois).toBeNull();
    expect(r.pulado).toMatch(/não parseia/);
  });

  it('arquivo sem bloco: pulado', () => {
    expect(migrarTicket('# só prosa\n').pulado).toBe('sem bloco ```json');
  });

  it('bloco que não é objeto (é lista): pulado', () => {
    expect(migrarTicket('# t\n\n```json\n[1,2]\n```\n').pulado).toMatch(/não parseia/);
  });
});

// ─── quem entra na fila ─────────────────────────────────────────────────────
describe('a seleção de arquivos é a MESMA regra do motor', () => {
  it('`[0-9]*.md`, sem descer: _TEMPLATE.md e rascunhos/ ficam de fora', () => {
    const dir = mkdtempSync(join(tmpdir(), 'orq-tk-'));
    mkdirSync(join(dir, 'rascunhos'));
    writeFileSync(join(dir, '001-a.md'), ticket({ id: '001', status: 'pendente', recon_esperado: [1] }));
    writeFileSync(join(dir, '_TEMPLATE.md'), ticket({ id: '000', status: 'pendente', recon_esperado: [1] }));
    writeFileSync(join(dir, 'rascunhos', '002-b.md'), ticket({ id: '002', status: 'pendente', recon_esperado: [1] }));
    expect(ticketsDe(dir).map((p) => p.split('/').pop())).toEqual(['001-a.md']);
  });

  it('o _TEMPLATE.md do Actus tem `status: pendente` e NÃO é migrado', () => {
    // É um achado do PASSO 0: o template é um ticket pendente de mentira, com
    // `tentativas_consumidas: 0`. Migrá-lo mudaria o formulário que todo ticket
    // novo copia — o que não é errado, mas é decisão, e não desta peça.
    const caminho = join(FILAS[0]!.caminho, '_TEMPLATE.md');
    if (!existsSync(caminho)) return void console.warn('PULADO');
    const fila = copiaFila(FILAS[0]!.caminho);
    const antes = readFileSync(join(fila, '_TEMPLATE.md'), 'utf8');
    migrarFila(fila, 'aplicar');
    expect(readFileSync(join(fila, '_TEMPLATE.md'), 'utf8')).toBe(antes);
  });
});

// ─── --dry-run e --aplicar ──────────────────────────────────────────────────
describe('--dry-run e --aplicar', () => {
  it('--dry-run não escreve', () => {
    const caminho = FILAS.find((f) => f.nome === 'comarka-operacional')!.caminho;
    if (!existsSync(caminho)) return void console.warn('PULADO');
    const fila = copiaFila(caminho);
    const antes = ticketsDe(fila).map((f) => readFileSync(f, 'utf8'));
    migrarFila(fila, 'dry-run');
    expect(ticketsDe(fila).map((f) => readFileSync(f, 'utf8'))).toEqual(antes);
  });

  it('--aplicar grava e NÃO deixa .bak (o ticket é versionado; o git é o backup)', () => {
    const caminho = FILAS.find((f) => f.nome === 'comarka-operacional')!.caminho;
    if (!existsSync(caminho)) return void console.warn('PULADO');
    const fila = copiaFila(caminho);
    const n = esperados(fila);
    const r = migrarFila(fila, 'aplicar');
    expect(r.migrados).toBe(n);
    expect(readdirSync(fila).filter((x) => x.endsWith('.bak'))).toEqual([]);
    expect(r.linhas.join('\n')).toMatch(/Sem \.bak: o ticket é versionado/);
  });

  it('rodar de novo é no-op', () => {
    const caminho = FILAS.find((f) => f.nome === 'comarka-operacional')!.caminho;
    if (!existsSync(caminho)) return void console.warn('PULADO');
    const fila = copiaFila(caminho);
    migrarFila(fila, 'aplicar');
    const depoisDaPrimeira = ticketsDe(fila).map((f) => readFileSync(f, 'utf8'));
    const r = migrarFila(fila, 'aplicar');
    expect(r.migrados).toBe(0);
    expect(ticketsDe(fila).map((f) => readFileSync(f, 'utf8'))).toEqual(depoisDaPrimeira);
  });

  it('o migrado continua parseável pelo leitor do motor', () => {
    const caminho = FILAS.find((f) => f.nome === 'comarka-operacional')!.caminho;
    if (!existsSync(caminho)) return void console.warn('PULADO');
    const fila = copiaFila(caminho);
    migrarFila(fila, 'aplicar');
    for (const f of ticketsDe(fila)) {
      const m = /```json\n([\s\S]*?)\n```/.exec(readFileSync(f, 'utf8'));
      if (!m) continue;
      expect(() => JSON.parse(m[1]!), f).not.toThrow();
    }
  });
});
